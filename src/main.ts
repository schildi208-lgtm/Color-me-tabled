import * as obsidian from "obsidian";
import { Editor, MarkdownFileInfo, MarkdownView, Menu, MenuItem, Notice, Plugin } from "obsidian";
import { I18nKey, colorLabel, defaultColorLabels, setLanguage, t } from "./i18n";
import { Choice, ColorSuggestModal, CustomColorModal, swatchTitle } from "./modals";
import { TableColor, makeId } from "./palettes";
import { DEFAULT_SETTINGS, TableColorsSettingTab, TableColorsSettings } from "./settings";
import { TABLE_GAPS, migrateTableGap } from "./tableGap";
import { buildCss, cssColor } from "./styles";
import { Action, CellPos, MarkerType, TableLoc, cellRanges, computeChanges, findTable, isRow } from "./table";

interface ViewLoc extends TableLoc {
  view: MarkdownView;
}

const TYPES: Record<MarkerType, { icon: string }> = {
  cell: { icon: "square" },
  row: { icon: "rows-3" },
  col: { icon: "columns-3" },
};
const TYPE_LIST = Object.keys(TYPES) as MarkerType[];
const typeLabel = (type: MarkerType) => t(`type.${type}` as I18nKey);

// Undokumentiert: CodeMirror-EditorView hinter dem Obsidian-Editor
interface CmView {
  state: { doc: { lineAt(pos: number): { number: number } } };
  posAtDOM(node: Node, offset?: number): number;
}

// Undokumentiert: Befehlsregister, um Befehle gelöschter Farben zu entfernen
interface CommandRegistry {
  removeCommand?(id: string): void;
}

interface ContextInfo {
  target: EventTarget | null;
  time: number;
}

/** Zellauswahl, die beim Drücken der rechten Maustaste markiert war. */
interface SelectionSnapshot {
  table: Element;
  cells: Element[];
  time: number;
}

/** Sprache der Obsidian-Oberfläche (getLanguage gibt es erst ab Obsidian 1.8). */
function obsidianLanguage(): string | null {
  const get = (obsidian as { getLanguage?: () => string }).getLanguage;
  if (typeof get === "function") return get();
  return window.localStorage.getItem("language");
}

export default class TableColorsPlugin extends Plugin {
  settings: TableColorsSettings = DEFAULT_SETTINGS;
  private lastFocus: Element | null = null;
  private lastCtx: ContextInfo | null = null;
  private rightDownSelection: SelectionSnapshot | null = null;
  private filledMenus = new WeakSet<Menu>();
  private styleEls: HTMLStyleElement[] = [];
  private colorCommands = new Set<string>();

  async onload() {
    setLanguage(obsidianLanguage());
    await this.loadSettings();
    this.addSettingTab(new TableColorsSettingTab(this.app, this));

    // Farb-CSS in jedes Fenster schreiben (Hauptfenster + Popouts)
    this.injectStyles(document);
    this.registerEvent(this.app.workspace.on("window-open", (win) => this.injectStyles(win.doc)));
    this.register(() =>
      this.styleEls.forEach((el) => {
        this.applyBodyClasses(el.ownerDocument, false);
        el.remove();
      }),
    );

    // Leseansicht: Startzeile jeder Tabelle merken, um sie im Quelltext wiederzufinden
    this.registerMarkdownPostProcessor((el, ctx) => {
      const tables = el.querySelectorAll<HTMLElement>("table");
      if (!tables.length) return;
      const info = ctx.getSectionInfo(el);
      if (info) tables.forEach((tbl) => (tbl.dataset.tcLine = String(info.lineStart)));
    });

    // Zuletzt fokussierte Stelle merken (Befehlspalette/Modals ignorieren)
    this.registerDomEvent(document, "focusin", (evt) => {
      const el = evt.target as Element | null;
      if (el && !el.closest?.(".modal-container, .menu")) this.lastFocus = el;
    });

    // Markierte Zellen sichern, bevor ein Rechtsklick sie eventuell aufhebt
    this.registerDomEvent(
      document,
      "mousedown",
      (evt) => {
        if (evt.button !== 2 || !(evt.target instanceof Element)) return;
        const table = evt.target.closest("td, th")?.closest("table");
        this.rightDownSelection = table ? { table, cells: selectedCells(table), time: Date.now() } : null;
      },
      { capture: true },
    );

    // Rechtsklick: Ziel merken. Live Preview/Source öffnen Obsidians Editor-Menü (asynchron,
    // daher nicht auf Timing verlassen) – dort hängen wir uns ein. Nur die Leseansicht hat
    // kein Editor-Menü und bekommt ein eigenes.
    this.registerDomEvent(
      document,
      "contextmenu",
      (evt) => {
        this.lastCtx = { target: evt.target, time: Date.now() };
        const loc = this.locateFromDom(evt.target, "click");
        if (!loc || loc.view.getMode() !== "preview") return;
        evt.preventDefault();
        const menu = new Menu();
        this.addMenuItems(menu, loc);
        menu.showAtMouseEvent(evt);
      },
      { capture: true },
    );

    // Live Preview, Tabellen-Menü: Bei markierten Zellen (oder Rechtsklick auf eine nicht aktive
    // Zelle) zeigt Obsidian kein Editor-Menü, sondern ein eigenes über Menu.forEvent() – synchron
    // im Handler der Zelle, angezeigt erst per Timeout. forEvent liefert für dasselbe Ereignis
    // dasselbe Menü; in der Bubble-Phase (nach Obsidians Handler) ergänzen wir es.
    this.registerDomEvent(document, "contextmenu", (evt) => {
      if (!evt.defaultPrevented || typeof Menu.forEvent !== "function") return;
      if (!(evt.target instanceof Element) || !evt.target.closest(".cm-table-widget")) return;
      const loc = this.locateFromDom(evt.target, "click");
      if (!loc || loc.view.getMode() !== "source") return;
      const menu = Menu.forEvent(evt);
      if (this.filledMenus.has(menu)) return;
      this.filledMenus.add(menu);
      this.addMenuItems(menu, loc);
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, _editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
        const ctx = this.lastCtx;
        if (!ctx || Date.now() - ctx.time > 2000) return;
        let loc = this.locateFromDom(ctx.target, "click");
        if (!loc && info instanceof MarkdownView) loc = this.locateFromEditor(info);
        if (!loc || this.filledMenus.has(menu)) return;
        this.filledMenus.add(menu);
        this.addMenuItems(menu, loc);
      }),
    );

    // Befehle (Shortcuts unter Einstellungen → Tastenkürzel vergeben)
    for (const type of TYPE_LIST) {
      this.addCommand({
        id: `pick-${type}`,
        name: t("cmd.pick", { type: typeLabel(type) }),
        icon: "palette",
        checkCallback: (checking) => this.withActive(checking, (loc) => this.openPicker(loc, type)),
      });
      this.addCommand({
        id: `custom-${type}`,
        name: t("cmd.custom", { type: typeLabel(type) }),
        icon: "pipette",
        checkCallback: (checking) => this.withActive(checking, (loc) => this.openCustom(loc, type)),
      });
      this.addCommand({
        id: `${type}-none`,
        name: t("cmd.none", { type: typeLabel(type) }),
        checkCallback: (checking) => this.withActive(checking, (loc) => this.apply(loc, type, null)),
      });
    }
    this.addCommand({
      id: "clear-table",
      name: t("cmd.clearTable"),
      icon: "eraser",
      checkCallback: (checking) => this.withActive(checking, (loc) => this.apply(loc, "all", null)),
    });
    this.syncColorCommands();
  }

  // ---------- Einstellungen & CSS ----------

  async loadSettings() {
    const data = ((await this.loadData()) ?? {}) as Partial<TableColorsSettings> & Record<string, unknown>;
    const tableGap = migrateTableGap(data) ?? DEFAULT_SETTINGS.tableGap;
    delete data.compactTables;
    delete data.hideTableGap;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data,
      tableGap,
      // Bis 0.3.1 waren die Namen der Standardfarben fest auf Deutsch gespeichert ("Rot"):
      // solche Namen leeren, damit die Übersetzung greift. Selbst vergebene Namen bleiben.
      colors: (data.colors ?? DEFAULT_SETTINGS.colors).map((c) => ({
        ...c,
        label: defaultColorLabels(c.id).includes(c.label) ? "" : c.label,
      })),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshStyles();
    this.syncColorCommands();
  }

  private injectStyles(doc: Document) {
    const el = doc.head.createEl("style", { attr: { id: "table-colors-dynamic" } });
    el.textContent = buildCss(this.settings);
    this.applyBodyClasses(doc);
    this.styleEls.push(el);
  }

  private refreshStyles() {
    const css = buildCss(this.settings);
    this.styleEls = this.styleEls.filter((el) => el.isConnected);
    for (const el of this.styleEls) {
      el.textContent = css;
      this.applyBodyClasses(el.ownerDocument);
    }
  }

  /** Schalter aus den Einstellungen als Klassen am <body>, damit styles.css sie nutzen kann. */
  private applyBodyClasses(doc: Document, enabled = true) {
    for (const gap of TABLE_GAPS) {
      doc.body.toggleClass(`tc-gap-${gap}`, enabled && this.settings.tableGap === gap);
    }
    if (enabled) doc.body.style.setProperty("--tc-table-gap-custom", `${this.settings.tableGapCustom}px`);
    else doc.body.style.removeProperty("--tc-table-gap-custom");
  }

  /** Hintergrund einer Farbe für einen bestimmten Modus (für Vorschauen). */
  preview(color: TableColor, mode: "light" | "dark"): string {
    return mode === "light"
      ? cssColor(color.light, this.settings.alphaLight)
      : cssColor(color.dark, this.settings.alphaDark);
  }

  async addColor(label: string, light: string, dark: string): Promise<TableColor> {
    const color: TableColor = {
      id: makeId(label, this.settings.colors.map((c) => c.id)),
      label,
      light,
      dark,
    };
    this.settings.colors.push(color);
    await this.saveSettings();
    return color;
  }

  /** Direktbefehle („Zeile: Rot“) für alle Farben anlegen bzw. für gelöschte entfernen. */
  private syncColorCommands() {
    const wanted = new Map<string, { type: MarkerType; color: TableColor }>();
    for (const color of this.settings.colors) {
      for (const type of TYPE_LIST) wanted.set(`${type}-${color.id}`, { type, color });
    }
    for (const [id, { type, color }] of wanted) {
      if (this.colorCommands.has(id)) continue;
      this.addCommand({
        id,
        name: t("cmd.color", { type: typeLabel(type), color: colorLabel(color) }),
        checkCallback: (checking) => this.withActive(checking, (loc) => this.apply(loc, type, color.id)),
      });
      this.colorCommands.add(id);
    }
    const registry = (this.app as unknown as { commands?: CommandRegistry }).commands;
    for (const id of [...this.colorCommands]) {
      if (wanted.has(id)) continue;
      registry?.removeCommand?.(`${this.manifest.id}:${id}`);
      this.colorCommands.delete(id);
    }
  }

  // ---------- Menü & Auswahl ----------

  private withActive(checking: boolean, run: (loc: ViewLoc) => void): boolean {
    const loc = this.locateActive();
    if (!loc) return false;
    if (!checking) run(loc);
    return true;
  }

  private openPicker(loc: ViewLoc, type: MarkerType) {
    new ColorSuggestModal(this.app, this, typeLabel(type), (c: Choice) => {
      if (c.kind === "custom") this.openCustom(loc, type);
      else this.apply(loc, type, c.kind === "color" ? c.color.id : null);
    }).open();
  }

  private openCustom(loc: ViewLoc, type: MarkerType) {
    new CustomColorModal(this.app, this, (color) => this.apply(loc, type, color.id), t("custom.apply")).open();
  }

  /** Menütitel, bei Auswahl mit Anzahl: „4 Zellen färben“, „2 Zeilen färben“. */
  private menuTitle(loc: ViewLoc, type: MarkerType): string {
    const n =
      type === "cell"
        ? loc.cells.length
        : new Set(loc.cells.map((c) => (type === "row" ? c.rel : c.col))).size;
    return n > 1 ? t(`menu.${type}.many` as I18nKey, { n }) : t(`menu.${type}` as I18nKey);
  }

  private addMenuItems(menu: Menu, loc: ViewLoc) {
    for (const type of TYPE_LIST) {
      menu.addItem((item) => {
        item.setTitle(this.menuTitle(loc, type)).setIcon(TYPES[type].icon).setSection("table-colors");
        // setSubmenu ist (noch) nicht in der öffentlichen API typisiert
        const setSubmenu = (item as MenuItem & { setSubmenu?: () => Menu }).setSubmenu;
        if (typeof setSubmenu !== "function") {
          // Fallback ohne Untermenüs (z. B. Mobile): Farbauswahl öffnen
          item.onClick(() => this.openPicker(loc, type));
          return;
        }
        const submenu: Menu = setSubmenu.call(item);
        for (const c of this.settings.colors) {
          submenu.addItem((i) =>
            i.setTitle(swatchTitle(colorLabel(c), `var(--tc-${c.id})`)).onClick(() => this.apply(loc, type, c.id)),
          );
        }
        submenu.addSeparator();
        submenu.addItem((i) =>
          i.setTitle(t("menu.custom")).setIcon("pipette").onClick(() => this.openCustom(loc, type)),
        );
        submenu.addItem((i) =>
          i.setTitle(t("menu.remove")).setIcon("eraser").onClick(() => this.apply(loc, type, null)),
        );
      });
    }
    menu.addItem((item) =>
      item
        .setTitle(t("menu.clearTable"))
        .setIcon("eraser")
        .setSection("table-colors")
        .onClick(() => this.apply(loc, "all", null)),
    );
  }

  // ---------- Position bestimmen ----------

  private viewFor(el: Element): MarkdownView | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.containerEl.contains(el)) return leaf.view;
    }
    return null;
  }

  /**
   * Zellen aus dem DOM bestimmen.
   * - "click" (Rechtsklick): liegt die Zelle in Obsidians Zellauswahl, gilt die ganze Auswahl,
   *   sonst nur die angeklickte Zelle.
   * - "focus" (Befehl/Shortcut): gibt es in der Tabelle eine Auswahl, gilt sie, sonst die Zelle mit Cursor.
   */
  private locateFromDom(target: EventTarget | null, mode: "click" | "focus"): ViewLoc | null {
    if (!(target instanceof Element)) return null;
    const cell = target.closest("td, th");
    const table = cell?.closest("table");
    if (!cell || !table || table.closest(".markdown-embed")) return null;
    const view = this.viewFor(table);
    if (!view) return null;

    let selection = selectedCells(table);
    const snap = this.rightDownSelection;
    if (mode === "click" && snap?.table === table && Date.now() - snap.time < 2000 && snap.cells.length) {
      selection = snap.cells; // Auswahl vor dem Rechtsklick
    }
    const useSelection = mode === "click" ? selection.includes(cell) : selection.length > 0;
    const cells = (useSelection ? selection : [cell]).map((el) => cellPos(table, el)).filter(isCellPos);
    if (!cells.length) return null;

    let approx: number;
    if (view.getMode() === "source") {
      const cm = (view.editor as Editor & { cm?: CmView }).cm;
      let w: Element = table;
      while (w.parentElement && !w.parentElement.classList.contains("cm-content")) w = w.parentElement;
      if (!cm || !w.parentElement) return null;
      approx = cm.state.doc.lineAt(cm.posAtDOM(w, 0)).number - 1;
    } else {
      approx = Number((table as HTMLElement).dataset.tcLine);
      if (Number.isNaN(approx)) return null;
    }

    const tbl = findTable(view.getViewData().split("\n"), approx);
    if (!tbl) return null;
    const valid = cells.filter((c) => tbl.start + c.rel <= tbl.end);
    if (!valid.length) return null;
    return { view, approx: tbl.start, cells: valid };
  }

  /** Nur im Source-Modus: Tabelle steht als Text da; Cursor bzw. markiertes Rechteck bestimmt die Zellen. */
  private locateFromEditor(view: MarkdownView): ViewLoc | null {
    if (view.getMode() !== "source" || view.getState().source !== true) return null;
    const editor = view.editor;
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const lines = editor.getValue().split("\n");
    if (!isRow(lines[from.line])) return null;
    const tbl = findTable(lines, from.line);
    if (!tbl || from.line < tbl.start || from.line > tbl.end) return null;

    const colAt = (line: number, ch: number) => {
      const ranges = cellRanges(lines[line]);
      const col = ranges.findIndex(([s, e]) => ch >= s && ch <= e);
      return col >= 0 ? col : ch < (ranges[0]?.[0] ?? 0) ? 0 : ranges.length - 1;
    };
    const lastLine = Math.min(to.line, tbl.end);
    const c1 = colAt(from.line, from.ch);
    const c2 = to.line <= tbl.end ? colAt(to.line, to.ch) : c1;
    const cells: CellPos[] = [];
    for (let n = from.line; n <= lastLine; n++) {
      const rel = n - tbl.start;
      if (rel === 1) continue; // Trennzeile
      for (let col = Math.min(c1, c2); col <= Math.max(c1, c2); col++) cells.push({ rel, col });
    }
    if (!cells.length) return null;
    return { view, approx: tbl.start, cells };
  }

  private locateActive(): ViewLoc | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return null;
    const f = this.lastFocus;
    if (f?.isConnected && view.containerEl.contains(f) && f.closest("td, th")) {
      const loc = this.locateFromDom(f, "focus");
      if (loc) return loc;
    }
    return this.locateFromEditor(view);
  }

  // ---------- Ändern ----------

  private async apply(loc: ViewLoc, action: Action, color: string | null) {
    const { view } = loc;
    const lines = view.getViewData().split("\n");
    const changes = computeChanges(lines, loc, action, color);
    if (!changes) {
      new Notice(t("notice.tableNotFound"));
      return;
    }
    if (!changes.size) return;

    if (view.getMode() === "source") {
      view.editor.transaction({
        changes: [...changes].map(([n, text]) => ({
          from: { line: n, ch: 0 },
          to: { line: n, ch: lines[n].length },
          text,
        })),
      });
    } else if (view.file) {
      await this.app.vault.process(view.file, (data) => {
        const ls = data.split("\n");
        for (const [n, text] of changes) {
          if (ls[n] !== lines[n]) {
            new Notice(t("notice.fileChanged"));
            return data;
          }
          ls[n] = text;
        }
        return ls.join("\n");
      });
    }
  }
}

// ---------- DOM-Helfer ----------

/** Von Obsidian markierte Zellen (Live-Preview-Tabelleneditor) dieser Tabelle. */
function selectedCells(table: Element): Element[] {
  return Array.from(table.querySelectorAll("td.is-selected, th.is-selected")).filter(
    (c) => c.closest("table") === table,
  );
}

/** Position einer Zelle im Markdown (Trennzeile wird übersprungen). */
function cellPos(table: Element, cell: Element): CellPos | null {
  const tr = cell.closest("tr");
  if (!tr) return null;
  const rows = Array.from(table.querySelectorAll("tr")).filter((r) => r.closest("table") === table);
  const r = rows.indexOf(tr);
  const col = Array.from(tr.children).filter((x) => x.matches("td, th")).indexOf(cell);
  if (r < 0 || col < 0) return null;
  return { rel: r === 0 ? 0 : r + 1, col };
}

const isCellPos = (c: CellPos | null): c is CellPos => c !== null;
