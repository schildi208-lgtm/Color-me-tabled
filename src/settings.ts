import { App, PluginSettingTab, Setting } from "obsidian";
import type TableColorsPlugin from "./main";
import { PALETTES, TableColor, applyPalette } from "./palettes";
import { CustomColorModal, toHex } from "./modals";
import { CUSTOM_GAP_DEFAULT, CUSTOM_GAP_MAX, CUSTOM_GAP_MIN, TABLE_GAP_OPTIONS, TableGap } from "./tableGap";

export interface TableColorsSettings {
  colors: TableColor[];
  alphaLight: number;
  alphaDark: number;
  maxCols: number;
  tableGap: TableGap;
  /** Abstand in Pixeln für tableGap = "custom". */
  tableGapCustom: number;
}

export const DEFAULT_SETTINGS: TableColorsSettings = {
  colors: PALETTES[0].colors.map((c) => ({ ...c })),
  alphaLight: PALETTES[0].alphaLight,
  alphaDark: PALETTES[0].alphaDark,
  maxCols: 20,
  tableGap: "none",
  tableGapCustom: CUSTOM_GAP_DEFAULT,
};

export class TableColorsSettingTab extends PluginSettingTab {
  private paletteId = PALETTES[0].id;
  private painters: (() => void)[] = [];

  constructor(app: App, private plugin: TableColorsPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    this.painters = [];

    // ---------- Darstellung ----------
    new Setting(containerEl).setName("Darstellung").setHeading();

    new Setting(containerEl)
      .setName("Deckkraft im hellen Modus")
      .setDesc("Wie kräftig die Farben im Light Mode erscheinen.")
      .addSlider((sl) =>
        sl
          .setLimits(0.05, 1, 0.05)
          .setValue(s.alphaLight)
          .setDynamicTooltip()
          .onChange(async (v) => {
            s.alphaLight = v;
            this.painters.forEach((fn) => fn());
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Deckkraft im dunklen Modus")
      .setDesc("Wie kräftig die Farben im Dark Mode erscheinen.")
      .addSlider((sl) =>
        sl
          .setLimits(0.05, 1, 0.05)
          .setValue(s.alphaDark)
          .setDynamicTooltip()
          .onChange(async (v) => {
            s.alphaDark = v;
            this.painters.forEach((fn) => fn());
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Maximale Spaltenanzahl")
      .setDesc("Spaltenfarben wirken bis zu dieser Spalte.")
      .addSlider((sl) =>
        sl
          .setLimits(5, 50, 1)
          .setValue(s.maxCols)
          .setDynamicTooltip()
          .onChange(async (v) => {
            s.maxCols = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Abstand über Tabellen")
      .setDesc(
        createFragment((f) => {
          f.appendText("Gilt in Live Preview. Obsidian braucht über jeder Tabelle eine Leerzeile und fügt sie beim Schreiben selbst ein; sie bleibt im Markdown immer erhalten.");
          const ul = f.createEl("ul");
          ul.createEl("li", { text: "Eine Leerzeile: Leerzeile sichtbar, ohne zusätzlichen Platz für die Ziehgriffe. Die Spalten-Griffe liegen an der Oberkante der Kopfzeile." });
          ul.createEl("li", { text: "Kein Abstand: Tabelle beginnt direkt unter dem Text, wie ein Callout. Die Spalten-Griffe liegen an der Oberkante der Kopfzeile." });
          ul.createEl("li", { text: "Wie unten: Leerzeile ausgeblendet, darüber bleibt so viel Platz wie unter der Tabelle (für die Ziehgriffe)." });
          ul.createEl("li", { text: "Custom: Leerzeile ausgeblendet, den Abstand stellst du selbst in Pixeln ein." });
        }),
      )
      .addDropdown((dd) => {
        for (const [value, label] of Object.entries(TABLE_GAP_OPTIONS)) dd.addOption(value, label);
        dd.setValue(s.tableGap).onChange(async (v) => {
          s.tableGap = v as TableGap;
          await this.plugin.saveSettings();
          this.display(); // Regler für „Custom“ ein-/ausblenden
        });
      });

    if (s.tableGap === "custom") {
      new Setting(containerEl)
        .setName("Abstand in Pixeln")
        .setDesc("Platz zwischen der Zeile über der Tabelle und der Tabelle.")
        .addSlider((sl) => {
          sl.setLimits(CUSTOM_GAP_MIN, CUSTOM_GAP_MAX, 1)
            .setValue(s.tableGapCustom)
            .setDynamicTooltip()
            .onChange(async (v) => {
              s.tableGapCustom = v;
              await this.plugin.saveSettings();
            });
          // Live beim Ziehen aktualisieren (setInstant gibt es erst in neueren Obsidian-Versionen)
          if (typeof sl.setInstant === "function") sl.setInstant(true);
        });
    }

    // ---------- Palette ----------
    new Setting(containerEl).setName("Palette").setHeading();

    new Setting(containerEl)
      .setName("Palette anwenden")
      .setDesc(
        "Ersetzt die Standardfarben (Rot, Blau, …) und die Deckkraft durch die Vorlage. " +
          "Bestehende Tabellen werden umgefärbt, eigene Farben bleiben erhalten.",
      )
      .addDropdown((dd) => {
        for (const p of PALETTES) dd.addOption(p.id, p.name);
        dd.setValue(this.paletteId).onChange((v) => (this.paletteId = v));
      })
      .addButton((b) =>
        b.setButtonText("Anwenden").onClick(async () => {
          const p = PALETTES.find((x) => x.id === this.paletteId);
          if (!p) return;
          s.colors = applyPalette(s.colors, p);
          s.alphaLight = p.alphaLight;
          s.alphaDark = p.alphaDark;
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    // ---------- Farben ----------
    new Setting(containerEl)
      .setName("Farben")
      .setDesc("Links die Farbe für den hellen, rechts für den dunklen Modus.")
      .setHeading()
      .addButton((b) =>
        b
          .setButtonText("Farbe hinzufügen")
          .setCta()
          .onClick(() =>
            new CustomColorModal(this.app, this.plugin, async () => {
              this.display();
            }).open(),
          ),
      );

    s.colors.forEach((color, i) => {
      let paint = () => {};
      const row = new Setting(containerEl)
        .setDesc(`Marker: cell-${color.id} · row-${color.id} · col-${color.id}`)
        .addText((t) =>
          t.setValue(color.label).onChange(async (v) => {
            color.label = v.trim() || color.id;
            await this.plugin.saveSettings();
          }),
        )
        .addColorPicker((cp) =>
          cp.setValue(toHex(color.light)).onChange(async (v) => {
            color.light = v;
            paint();
            await this.plugin.saveSettings();
          }),
        )
        .addColorPicker((cp) =>
          cp.setValue(toHex(color.dark)).onChange(async (v) => {
            color.dark = v;
            paint();
            await this.plugin.saveSettings();
          }),
        )
        .addExtraButton((b) =>
          b
            .setIcon("arrow-up")
            .setTooltip("Nach oben")
            .setDisabled(i === 0)
            .onClick(() => this.move(i, -1)),
        )
        .addExtraButton((b) =>
          b
            .setIcon("arrow-down")
            .setTooltip("Nach unten")
            .setDisabled(i === s.colors.length - 1)
            .onClick(() => this.move(i, 1)),
        )
        .addExtraButton((b) =>
          b
            .setIcon("trash-2")
            .setTooltip("Löschen – Tabellen mit diesem Marker verlieren ihre Farbe")
            .onClick(async () => {
              s.colors.splice(i, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
      row.settingEl.addClass("tc-color-setting");
      // Halbtransparente Farbe auf typischem hellem bzw. dunklem Untergrund zeigen
      const sl = row.nameEl.createSpan({ cls: "tc-swatch", attr: { "aria-label": "Hell" } });
      const sd = row.nameEl.createSpan({ cls: "tc-swatch", attr: { "aria-label": "Dunkel" } });
      paint = () => {
        const light = this.plugin.preview(color, "light");
        const dark = this.plugin.preview(color, "dark");
        sl.style.background = `linear-gradient(${light}, ${light}), #ffffff`;
        sd.style.background = `linear-gradient(${dark}, ${dark}), #1e1e1e`;
      };
      paint();
      this.painters.push(paint);
      if (color.light.startsWith("theme:")) row.descEl.appendText(" · folgt dem Theme, bis du die Farbe änderst");
    });
  }

  private async move(i: number, delta: number) {
    const list = this.plugin.settings.colors;
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await this.plugin.saveSettings();
    this.display();
  }
}
