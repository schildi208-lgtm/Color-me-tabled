import { App, FuzzyMatch, FuzzySuggestModal, Modal, Setting } from "obsidian";
import type TableColorsPlugin from "./main";
import { colorLabel, t } from "./i18n";
import type { TableColor } from "./palettes";
import { hexToRgb, themeVar } from "./styles";

/** Farbwert als Hex für den Color Picker; Theme-Farben werden aus dem aktuellen Theme gelesen. */
export function toHex(value: string): string {
  const v = themeVar(value);
  if (!v) return hexToRgb(value) ? value : "#888888";
  const raw = getComputedStyle(document.body).getPropertyValue(v).trim(); // "233, 49, 71"
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return "#888888";
  return "#" + parts.slice(0, 3).map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function swatchTitle(label: string, background: string | null): DocumentFragment {
  const frag = document.createDocumentFragment();
  const sw = frag.createSpan({ cls: "tc-swatch" });
  if (background) sw.style.background = background;
  else sw.addClass("tc-swatch-none");
  frag.appendText(label);
  return frag;
}

// ---------- Farbauswahl (Befehle) ----------

export type Choice = { kind: "color"; color: TableColor } | { kind: "custom" } | { kind: "none" };

export class ColorSuggestModal extends FuzzySuggestModal<Choice> {
  constructor(
    app: App,
    private plugin: TableColorsPlugin,
    typeLabel: string,
    private onChoose: (choice: Choice) => void,
  ) {
    super(app);
    this.setPlaceholder(t("picker.placeholder", { type: typeLabel }));
  }

  getItems(): Choice[] {
    return [
      ...this.plugin.settings.colors.map((color): Choice => ({ kind: "color", color })),
      { kind: "custom" },
      { kind: "none" },
    ];
  }

  getItemText(c: Choice): string {
    return c.kind === "color" ? colorLabel(c.color) : c.kind === "custom" ? t("menu.custom") : t("picker.none");
  }

  renderSuggestion(match: FuzzyMatch<Choice>, el: HTMLElement): void {
    const c = match.item;
    if (c.kind === "custom") {
      el.appendChild(swatchTitle(t("menu.custom"), "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)"));
    } else {
      el.appendChild(swatchTitle(this.getItemText(c), c.kind === "color" ? `var(--tc-${c.color.id})` : null));
    }
  }

  onChooseItem(c: Choice): void {
    this.onChoose(c);
  }
}

// ---------- Eigene Farbe anlegen ----------

export class CustomColorModal extends Modal {
  private label = "";
  private light = "#4dabf7";
  private dark = "#4dabf7";
  private separateDark = false;

  constructor(
    app: App,
    private plugin: TableColorsPlugin,
    private onCreated: (color: TableColor) => void | Promise<void>,
    private submitText = t("custom.save"),
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(t("custom.title"));
    this.render();
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    new Setting(contentEl).setName(t("custom.name")).addText((txt) =>
      txt
        .setPlaceholder(t("custom.namePlaceholder"))
        .setValue(this.label)
        .onChange((v) => (this.label = v)),
    );

    new Setting(contentEl)
      .setName(this.separateDark ? t("custom.colorLight") : t("custom.color"))
      .addColorPicker((cp) =>
        cp.setValue(this.light).onChange((v) => {
          this.light = v;
          if (!this.separateDark) this.dark = v;
        }),
      );

    new Setting(contentEl)
      .setName(t("custom.separateDark"))
      .addToggle((tg) =>
        tg.setValue(this.separateDark).onChange((v) => {
          this.separateDark = v;
          if (!v) this.dark = this.light;
          this.render();
        }),
      );

    if (this.separateDark) {
      new Setting(contentEl)
        .setName(t("custom.colorDark"))
        .addColorPicker((cp) => cp.setValue(this.dark).onChange((v) => (this.dark = v)));
    }

    new Setting(contentEl)
      .addButton((b) => b.setButtonText(t("custom.cancel")).onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(this.submitText)
          .setCta()
          .onClick(async () => {
            const color = await this.plugin.addColor(this.label.trim() || t("custom.defaultName"), this.light, this.dark);
            this.close();
            await this.onCreated(color);
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

