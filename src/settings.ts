import { App, PluginSettingTab, Setting } from "obsidian";
import type TableColorsPlugin from "./main";
import { PALETTES, TableColor, applyPalette } from "./palettes";
import { CustomColorModal, toHex } from "./modals";
import { CUSTOM_GAP_DEFAULT, CUSTOM_GAP_MAX, CUSTOM_GAP_MIN, TABLE_GAPS, TableGap } from "./tableGap";
import { I18nKey, colorLabel, defaultColorLabels, t } from "./i18n";

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
    new Setting(containerEl).setName(t("settings.appearance")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.alphaLight"))
      .setDesc(t("settings.alphaLight.desc"))
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
      .setName(t("settings.alphaDark"))
      .setDesc(t("settings.alphaDark.desc"))
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
      .setName(t("settings.maxCols"))
      .setDesc(t("settings.maxCols.desc"))
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
      .setName(t("settings.gap"))
      .setDesc(
        createFragment((f) => {
          f.appendText(t("settings.gap.desc"));
          const ul = f.createEl("ul");
          for (const gap of TABLE_GAPS) ul.createEl("li", { text: t(`settings.gap.desc.${gap}` as I18nKey) });
        }),
      )
      .addDropdown((dd) => {
        for (const gap of TABLE_GAPS) dd.addOption(gap, t(`gap.${gap}` as I18nKey));
        dd.setValue(s.tableGap).onChange(async (v) => {
          s.tableGap = v as TableGap;
          await this.plugin.saveSettings();
          this.display(); // Regler für „Custom“ ein-/ausblenden
        });
      });

    if (s.tableGap === "custom") {
      new Setting(containerEl)
        .setName(t("settings.gapCustom"))
        .setDesc(t("settings.gapCustom.desc"))
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
    new Setting(containerEl).setName(t("settings.palette")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.applyPalette"))
      .setDesc(t("settings.applyPalette.desc"))
      .addDropdown((dd) => {
        for (const p of PALETTES) dd.addOption(p.id, t(`palette.${p.id}` as I18nKey));
        dd.setValue(this.paletteId).onChange((v) => (this.paletteId = v));
      })
      .addButton((b) =>
        b.setButtonText(t("settings.apply")).onClick(async () => {
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
      .setName(t("settings.colors"))
      .setDesc(t("settings.colors.desc"))
      .setHeading()
      .addButton((b) =>
        b
          .setButtonText(t("settings.addColor"))
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
        .setDesc(t("settings.marker", { markers: `cell-${color.id} · row-${color.id} · col-${color.id}` }))
        .addText((txt) =>
          txt.setValue(colorLabel(color)).onChange(async (v) => {
            // Leer oder Standardname -> übersetzten Standardnamen verwenden
            const name = v.trim();
            color.label = !name || defaultColorLabels(color.id).includes(name) ? "" : name;
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
            .setTooltip(t("settings.moveUp"))
            .setDisabled(i === 0)
            .onClick(() => this.move(i, -1)),
        )
        .addExtraButton((b) =>
          b
            .setIcon("arrow-down")
            .setTooltip(t("settings.moveDown"))
            .setDisabled(i === s.colors.length - 1)
            .onClick(() => this.move(i, 1)),
        )
        .addExtraButton((b) =>
          b
            .setIcon("trash-2")
            .setTooltip(t("settings.delete"))
            .onClick(async () => {
              s.colors.splice(i, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
      row.settingEl.addClass("tc-color-setting");
      // Halbtransparente Farbe auf typischem hellem bzw. dunklem Untergrund zeigen
      const sl = row.nameEl.createSpan({ cls: "tc-swatch", attr: { "aria-label": t("settings.light") } });
      const sd = row.nameEl.createSpan({ cls: "tc-swatch", attr: { "aria-label": t("settings.dark") } });
      paint = () => {
        const light = this.plugin.preview(color, "light");
        const dark = this.plugin.preview(color, "dark");
        sl.style.background = `linear-gradient(${light}, ${light}), #ffffff`;
        sd.style.background = `linear-gradient(${dark}, ${dark}), #1e1e1e`;
      };
      paint();
      this.painters.push(paint);
      if (color.light.startsWith("theme:")) row.descEl.appendText(t("settings.followsTheme"));
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
