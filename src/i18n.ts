// Übersetzungen. Die Sprache folgt Obsidian: Deutsch bei "de…", sonst Englisch.
// Ohne Obsidian-Abhängigkeit, damit testbar.

const en = {
  // Ziele
  "type.cell": "Cell",
  "type.row": "Row",
  "type.col": "Column",

  // Kontextmenü
  "menu.cell": "Color cell",
  "menu.cell.many": "Color {n} cells",
  "menu.row": "Color row",
  "menu.row.many": "Color {n} rows",
  "menu.col": "Color column",
  "menu.col.many": "Color {n} columns",
  "menu.custom": "Custom color…",
  "menu.remove": "Remove color",
  "menu.clearTable": "Remove table colors",

  // Befehle
  "cmd.pick": "{type}: Choose color…",
  "cmd.custom": "{type}: Custom color…",
  "cmd.none": "{type}: Remove color",
  "cmd.color": "{type}: {color}",
  "cmd.clearTable": "Remove all colors from this table",

  // Farbauswahl & eigene Farbe
  "picker.placeholder": "{type} – choose a color",
  "picker.none": "No color",
  "custom.title": "Custom color",
  "custom.name": "Name",
  "custom.namePlaceholder": "e.g. Done",
  "custom.defaultName": "Custom color",
  "custom.color": "Color",
  "custom.colorLight": "Color (light)",
  "custom.colorDark": "Color (dark)",
  "custom.separateDark": "Separate color for dark mode",
  "custom.cancel": "Cancel",
  "custom.save": "Save",
  "custom.apply": "Apply",

  // Hinweise
  "notice.tableNotFound": "Table not found",
  "notice.fileChanged": "The file has changed – please try again",

  // Standardfarben
  "color.red": "Red",
  "color.orange": "Orange",
  "color.yellow": "Yellow",
  "color.green": "Green",
  "color.cyan": "Cyan",
  "color.blue": "Blue",
  "color.purple": "Purple",
  "color.pink": "Pink",
  "color.gray": "Gray",

  // Paletten
  "palette.theme": "Theme (default)",
  "palette.pastel": "Pastel",
  "palette.vivid": "Vivid",
  "palette.okabe-ito": "Colorblind-friendly (Okabe-Ito)",

  // Abstand über Tabellen
  "gap.blank-line": "One blank line",
  "gap.none": "No gap",
  "gap.handle": "Like below (room for drag handles)",
  "gap.custom": "Custom",

  // Einstellungen
  "settings.appearance": "Appearance",
  "settings.alphaLight": "Opacity in light mode",
  "settings.alphaLight.desc": "How strong the colors appear in light mode.",
  "settings.alphaDark": "Opacity in dark mode",
  "settings.alphaDark.desc": "How strong the colors appear in dark mode.",
  "settings.maxCols": "Maximum number of columns",
  "settings.maxCols.desc": "Column colors apply up to this column.",
  "settings.gap": "Gap above tables",
  "settings.gap.desc":
    "Applies to Live Preview. Obsidian needs a blank line above every table and inserts it automatically while you type; it always stays in the Markdown.",
  "settings.gap.desc.blank-line":
    "One blank line: blank line visible, without extra room for the drag handles. The column handles sit at the top edge of the header row.",
  "settings.gap.desc.none":
    "No gap: the table starts right below the text, like a callout. The column handles sit at the top edge of the header row.",
  "settings.gap.desc.handle":
    "Like below: blank line hidden, with as much room above the table as below it (for the drag handles).",
  "settings.gap.desc.custom": "Custom: blank line hidden, you set the gap in pixels.",
  "settings.gapCustom": "Gap in pixels",
  "settings.gapCustom.desc": "Space between the line above the table and the table.",
  "settings.palette": "Palette",
  "settings.applyPalette": "Apply palette",
  "settings.applyPalette.desc":
    "Replaces the default colors (red, blue, …) and the opacity with the preset. Existing tables are recolored, your own colors are kept.",
  "settings.apply": "Apply",
  "settings.colors": "Colors",
  "settings.colors.desc": "Left: color for light mode, right: color for dark mode.",
  "settings.addColor": "Add color",
  "settings.marker": "Marker: {markers}",
  "settings.followsTheme": " · follows the theme until you change the color",
  "settings.moveUp": "Move up",
  "settings.moveDown": "Move down",
  "settings.delete": "Delete – tables using this marker lose their color",
  "settings.light": "Light",
  "settings.dark": "Dark",
};

export type I18nKey = keyof typeof en;

const de: Record<I18nKey, string> = {
  "type.cell": "Zelle",
  "type.row": "Zeile",
  "type.col": "Spalte",

  "menu.cell": "Zelle färben",
  "menu.cell.many": "{n} Zellen färben",
  "menu.row": "Zeile färben",
  "menu.row.many": "{n} Zeilen färben",
  "menu.col": "Spalte färben",
  "menu.col.many": "{n} Spalten färben",
  "menu.custom": "Eigene Farbe…",
  "menu.remove": "Farbe entfernen",
  "menu.clearTable": "Tabellenfarben entfernen",

  "cmd.pick": "{type} färben…",
  "cmd.custom": "{type}: Eigene Farbe…",
  "cmd.none": "{type}: Farbe entfernen",
  "cmd.color": "{type}: {color}",
  "cmd.clearTable": "Alle Farben dieser Tabelle entfernen",

  "picker.placeholder": "{type} färben – Farbe wählen",
  "picker.none": "Keine Farbe",
  "custom.title": "Eigene Farbe",
  "custom.name": "Name",
  "custom.namePlaceholder": "z. B. Erledigt",
  "custom.defaultName": "Eigene Farbe",
  "custom.color": "Farbe",
  "custom.colorLight": "Farbe (hell)",
  "custom.colorDark": "Farbe (dunkel)",
  "custom.separateDark": "Eigene Farbe für den Dark Mode",
  "custom.cancel": "Abbrechen",
  "custom.save": "Speichern",
  "custom.apply": "Anwenden",

  "notice.tableNotFound": "Tabelle nicht gefunden",
  "notice.fileChanged": "Datei hat sich geändert – bitte erneut versuchen",

  "color.red": "Rot",
  "color.orange": "Orange",
  "color.yellow": "Gelb",
  "color.green": "Grün",
  "color.cyan": "Cyan",
  "color.blue": "Blau",
  "color.purple": "Lila",
  "color.pink": "Pink",
  "color.gray": "Grau",

  "palette.theme": "Theme (Standard)",
  "palette.pastel": "Pastell",
  "palette.vivid": "Kräftig",
  "palette.okabe-ito": "Farbenblind-freundlich (Okabe-Ito)",

  "gap.blank-line": "Eine Leerzeile",
  "gap.none": "Kein Abstand",
  "gap.handle": "Wie unten (Platz für Ziehgriffe)",
  "gap.custom": "Custom",

  "settings.appearance": "Darstellung",
  "settings.alphaLight": "Deckkraft im hellen Modus",
  "settings.alphaLight.desc": "Wie kräftig die Farben im Light Mode erscheinen.",
  "settings.alphaDark": "Deckkraft im dunklen Modus",
  "settings.alphaDark.desc": "Wie kräftig die Farben im Dark Mode erscheinen.",
  "settings.maxCols": "Maximale Spaltenanzahl",
  "settings.maxCols.desc": "Spaltenfarben wirken bis zu dieser Spalte.",
  "settings.gap": "Abstand über Tabellen",
  "settings.gap.desc":
    "Gilt in Live Preview. Obsidian braucht über jeder Tabelle eine Leerzeile und fügt sie beim Schreiben selbst ein; sie bleibt im Markdown immer erhalten.",
  "settings.gap.desc.blank-line":
    "Eine Leerzeile: Leerzeile sichtbar, ohne zusätzlichen Platz für die Ziehgriffe. Die Spalten-Griffe liegen an der Oberkante der Kopfzeile.",
  "settings.gap.desc.none":
    "Kein Abstand: Tabelle beginnt direkt unter dem Text, wie ein Callout. Die Spalten-Griffe liegen an der Oberkante der Kopfzeile.",
  "settings.gap.desc.handle":
    "Wie unten: Leerzeile ausgeblendet, darüber bleibt so viel Platz wie unter der Tabelle (für die Ziehgriffe).",
  "settings.gap.desc.custom": "Custom: Leerzeile ausgeblendet, den Abstand stellst du selbst in Pixeln ein.",
  "settings.gapCustom": "Abstand in Pixeln",
  "settings.gapCustom.desc": "Platz zwischen der Zeile über der Tabelle und der Tabelle.",
  "settings.palette": "Palette",
  "settings.applyPalette": "Palette anwenden",
  "settings.applyPalette.desc":
    "Ersetzt die Standardfarben (Rot, Blau, …) und die Deckkraft durch die Vorlage. Bestehende Tabellen werden umgefärbt, eigene Farben bleiben erhalten.",
  "settings.apply": "Anwenden",
  "settings.colors": "Farben",
  "settings.colors.desc": "Links die Farbe für den hellen, rechts für den dunklen Modus.",
  "settings.addColor": "Farbe hinzufügen",
  "settings.marker": "Marker: {markers}",
  "settings.followsTheme": " · folgt dem Theme, bis du die Farbe änderst",
  "settings.moveUp": "Nach oben",
  "settings.moveDown": "Nach unten",
  "settings.delete": "Löschen – Tabellen mit diesem Marker verlieren ihre Farbe",
  "settings.light": "Hell",
  "settings.dark": "Dunkel",
};

const DICTS = { en, de } as const;
type Lang = keyof typeof DICTS;
let lang: Lang = "en";

/** Sprache aus dem Obsidian-Sprachcode setzen (z. B. "de", "en", "en-GB"). */
export function setLanguage(code: string | null | undefined): void {
  lang = code?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function getLanguage(): Lang {
  return lang;
}

export function t(key: I18nKey, vars: Record<string, string | number> = {}): string {
  const text = DICTS[lang][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Prüft, ob es für einen dynamischen Schlüssel (z. B. "color.red") eine Übersetzung gibt. */
export function hasKey(key: string): key is I18nKey {
  return key in en;
}

/** Anzeigename einer Farbe: eigener Name, sonst Übersetzung der Standardfarbe, sonst die ID. */
export function colorLabel(color: { id: string; label: string }): string {
  if (color.label) return color.label;
  const key = `color.${color.id}`;
  return hasKey(key) ? t(key) : color.id;
}

/** Name der Standardfarbe in allen Sprachen – um alte, fest gespeicherte Namen zu erkennen. */
export function defaultColorLabels(id: string): string[] {
  const key = `color.${id}`;
  return hasKey(key) ? Object.values(DICTS).map((d) => d[key]) : [];
}
