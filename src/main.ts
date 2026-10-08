import { Editor, MarkdownFileInfo, MarkdownView, Menu, MenuItem, Notice, Plugin } from "obsidian";
import { Choice, ColorSuggestModal, CustomColorModal, swatchTitle } from "./modals";
import { TableColor, makeId } from "./palettes";
import { DEFAULT_SETTINGS, TableColorsSettingTab, TableColorsSettings } from "./settings";
import { TABLE_GAP_OPTIONS, TableGap, migrateTableGap } from "./tableGap";
import { buildCss, cssColor } from "./styles";
import { Action, MarkerType, TableLoc, cellRanges, computeChanges, findTable, isRow } from "./table";

interface ViewLoc extends TableLoc {
  view: MarkdownView;
}

const TYPES: Record<MarkerType, { label: string; icon: string }> = {
  cell: { label: "Zelle", icon: "square" },
  row: { label: "Zeile", icon: "rows-3" },
  col: { label: "Spalte", icon: "columns-3" },
};
const TYPE_ENTRIES = Object.entries(TYPES) as [MarkerType, (typeof TYPES)[MarkerType]][];

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

export default class TableColorsPlugin extends Plugin {
  settings: TableColorsSettings = DEFAULT_SETTINGS;
  private lastFocus: Element | null = null;
  private lastCtx: ContextInfo | null = null;
  private filledMenus = new WeakSet<Menu>();
  private styleEls: HTMLStyleElement[] = [];
  private colorCommands = new Set<string>();

  async onload() {
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
      if (info) tables.forEach((t) => (t.dataset.tcLine = String(info.lineStart)));
    });

    // Zuletzt fokussierte Stelle merken (Befehlspalette/Modals ignorieren)
    this.registerDomEvent(document, "focusin", (evt) => {
      const t = evt.target as Element | null;
      if (t && !t.closest?.(".modal-container, .menu")) this.lastFocus = t;
    });

    // Rechtsklick: Ziel merken. Live Preview/Source öffnen Obsidians Editor-Menü (asynchron,
    // daher nicht auf Timing verlassen) – dort hängen wir uns ein. Nur die Leseansicht hat
    // kein Editor-Menü und bekommt ein eigenes.
    this.registerDomEvent(
      document,
      "contextmenu",
      (evt) => {
        this.lastCtx = { target: evt.target, time: Date.now() };
        const loc = this.locateFromDom(evt.target);
        if (!loc || loc.view.getMode() !== "preview") return;
        evt.preventDefault();
        const menu = new Menu();
        this.addMenuItems(menu, loc);
        menu.showAtMouseEvent(evt);
      },
      { capture: true },
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, _editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
        const ctx = this.lastCtx;
        if (!ctx || Date.now() - ctx.time > 2000) return;
        let loc = this.locateFromDom(ctx.target);
        if (!loc && info instanceof MarkdownView) loc = this.locateFromEditor(info);
        if (!loc || this.filledMenus.has(menu)) return;
        this.filledMenus.add(menu);
        this.addMenuItems(menu, loc);
      }),
    );

    // Befehle (Shortcuts unter Einstellungen → Tastenkürzel vergeben)
    for (const [type, t] of TYPE_ENTRIES) {
      this.addCommand({
        id: `pick-${type}`,
        name: `${t.label} färben…`,
        icon: "palette",
        checkCallback: (checking) => this.withActive(checking, (loc) => this.openPicker(loc, type)),
      });
      this.addCommand({
        id: `custom-${type}`,
        name: `${t.label}: Eigene Farbe…`,
        icon: "pipette",
        checkCallback: (checking) => this.withActive(checking, (loc) => this.openCustom(loc, type)),
      });
      this.addCommand({
        id: `${type}-none`,
        name: `${t.label}: Farbe entfernen`,
        checkCallback: (checking) => this.withActive(checking, (loc) => this.apply(loc, type, null)),
      });
    }
    this.addCommand({
      id: "clear-table",
      name: "Alle Farben dieser Tabelle entfernen",
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
      colors: (data.colors ?? DEFAULT_SETTINGS.colors).map((c) => ({ ...c })),
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
    for (const gap of Object.keys(TABLE_GAP_OPTIONS) as TableGap[]) {
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
      for (const [type] of TYPE_ENTRIES) wanted.set(`${type}-${color.id}`, { type, color });
    }
    for (const [id, { type, color }] of wanted) {
      if (this.colorCommands.has(id)) continue;
      this.addCommand({
        id,
        name: `${TYPES[type].label}: ${color.label}`,
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
    new ColorSuggestModal(this.app, this, TYPES[type].label, (c: Choice) => {
      if (c.kind === "custom") this.openCustom(loc, type);
      else this.apply(loc, type, c.kind === "color" ? c.color.id : null);
    }).open();
  }

  private openCustom(loc: ViewLoc, type: MarkerType) {
    new CustomColorModal(this.app, this, (color) => this.apply(loc, type, color.id), "Anwenden").open();
  }

  private addMenuItems(menu: Menu, loc: ViewLoc) {
    for (const [type, t] of TYPE_ENTRIES) {
      menu.addItem((item) => {
        item.setTitle(`${t.label} färben`).setIcon(t.icon).setSection("table-colors");
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
            i.setTitle(swatchTitle(c.label, `var(--tc-${c.id})`)).onClick(() => this.apply(loc, type, c.id)),
          );
        }
        submenu.addSeparator();
        submenu.addItem((i) =>
          i.setTitle("Eigene Farbe…").setIcon("pipette").onClick(() => this.openCustom(loc, type)),
        );
        submenu.addItem((i) =>
          i.setTitle("Farbe entfernen").setIcon("eraser").onClick(() => this.apply(loc, type, null)),
        );
      });
    }
    menu.addItem((item) =>
      item
        .setTitle("Tabellenfarben entfernen")
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

  private locateFromDom(target: EventTarget | null): ViewLoc | null {
    if (!(target instanceof Element)) return null;
    const cell = target.closest("td, th");
    const table = cell?.closest("table");
    if (!cell || !table || table.closest(".markdown-embed")) return null;
    const view = this.viewFor(table);
    if (!view) return null;

    const tr = cell.closest("tr");
    if (!tr) return null;
    const rows = Array.from(table.querySelectorAll("tr")).filter((r) => r.closest("table") === table);
    const r = rows.indexOf(tr);
    const c = Array.from(tr.children).filter((x) => x.matches("td, th")).indexOf(cell);
    if (r < 0 || c < 0) return null;

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
    const rel = r === 0 ? 0 : r + 1; // Trennzeile überspringen
    if (tbl.start + rel > tbl.end) return null;
    return { view, approx: tbl.start, rel, col: c };
  }

  /** Nur im Source-Modus: Tabelle steht als Text da, Cursor bestimmt die Zelle. */
  private locateFromEditor(view: MarkdownView): ViewLoc | null {
    if (view.getMode() !== "source" || view.getState().source !== true) return null;
    const editor = view.editor;
    const cur = editor.getCursor();
    const lines = editor.getValue().split("\n");
    if (!isRow(lines[cur.line])) return null;
    const tbl = findTable(lines, cur.line);
    if (!tbl || cur.line < tbl.start || cur.line > tbl.end) return null;
    const rel = cur.line - tbl.start;
    if (rel === 1) return null;
    const ranges = cellRanges(lines[cur.line]);
    let col = ranges.findIndex(([s, e]) => cur.ch >= s && cur.ch <= e);
    if (col < 0) col = cur.ch < ranges[0][0] ? 0 : ranges.length - 1;
    return { view, approx: tbl.start, rel, col };
  }

  private locateActive(): ViewLoc | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return null;
    const f = this.lastFocus;
    if (f?.isConnected && view.containerEl.contains(f) && f.closest("td, th")) {
      const loc = this.locateFromDom(f);
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
      new Notice("Tabelle nicht gefunden");
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
            new Notice("Datei hat sich geändert – bitte erneut versuchen");
            return data;
          }
          ls[n] = text;
        }
        return ls.join("\n");
      });
    }
  }
}
