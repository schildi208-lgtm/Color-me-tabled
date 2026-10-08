// Farbpaletten. Alle Vorlagen nutzen dieselben IDs, damit ein Palettenwechsel
// bestehende Tabellen umfärbt, ohne den Markdown-Text zu ändern.

/** Farbwert: "#rrggbb" oder "theme:<name>" (Obsidian-Theme-Farbe, z. B. theme:red, theme:mono). */
export type ColorValue = string;

export interface TableColor {
  /** Teil des Markers, z. B. "red" -> <span class="cell-red"></span>. Unveränderlich. */
  id: string;
  /** Eigener Name; leer = übersetzter Name der Standardfarbe (siehe i18n.colorLabel). */
  label: string;
  light: ColorValue;
  dark: ColorValue;
}

export interface Palette {
  /** Name kommt aus der Übersetzung "palette.<id>". */
  id: string;
  /** Empfohlene Deckkraft – wird beim Anwenden übernommen. */
  alphaLight: number;
  alphaDark: number;
  colors: TableColor[];
}

/** Hilfsfunktion: { id: [hell, dunkel] } -> TableColor[] */
function colors(values: Record<string, [ColorValue, ColorValue]>): TableColor[] {
  return Object.entries(values).map(([id, [light, dark]]) => ({ id, label: "", light, dark }));
}

export const PALETTES: Palette[] = [
  {
    id: "theme",
    alphaLight: 0.25,
    alphaDark: 0.25,
    colors: colors({
      red: ["theme:red", "theme:red"],
      orange: ["theme:orange", "theme:orange"],
      yellow: ["theme:yellow", "theme:yellow"],
      green: ["theme:green", "theme:green"],
      cyan: ["theme:cyan", "theme:cyan"],
      blue: ["theme:blue", "theme:blue"],
      purple: ["theme:purple", "theme:purple"],
      pink: ["theme:pink", "theme:pink"],
      gray: ["theme:mono", "theme:mono"],
    }),
  },
  {
    id: "pastel",
    alphaLight: 0.8,
    alphaDark: 0.3,
    colors: colors({
      red: ["#ffadad", "#ff8787"],
      orange: ["#ffd6a5", "#ffc078"],
      yellow: ["#fdffb6", "#ffe066"],
      green: ["#caffbf", "#8ce99a"],
      cyan: ["#9bf6ff", "#66d9e8"],
      blue: ["#a0c4ff", "#74c0fc"],
      purple: ["#bdb2ff", "#b197fc"],
      pink: ["#ffc6ff", "#f783ac"],
      gray: ["#dee2e6", "#adb5bd"],
    }),
  },
  {
    id: "vivid",
    alphaLight: 0.3,
    alphaDark: 0.35,
    colors: colors({
      red: ["#fa5252", "#ff6b6b"],
      orange: ["#fd7e14", "#ff922b"],
      yellow: ["#fab005", "#fcc419"],
      green: ["#40c057", "#51cf66"],
      cyan: ["#15aabf", "#22b8cf"],
      blue: ["#228be6", "#339af0"],
      purple: ["#7950f2", "#845ef7"],
      pink: ["#e64980", "#f06595"],
      gray: ["#868e96", "#adb5bd"],
    }),
  },
  {
    id: "okabe-ito",
    alphaLight: 0.35,
    alphaDark: 0.4,
    colors: colors({
      red: ["#d55e00", "#d55e00"],
      orange: ["#e69f00", "#e69f00"],
      yellow: ["#f0e442", "#f0e442"],
      green: ["#009e73", "#009e73"],
      cyan: ["#56b4e9", "#56b4e9"],
      blue: ["#0072b2", "#3d9ad6"],
      purple: ["#cc79a7", "#cc79a7"],
      pink: ["#f5a3c7", "#f5a3c7"],
      gray: ["#999999", "#999999"],
    }),
  },
];

/**
 * Palette auf die eigene Farbliste anwenden: Werte gleicher IDs ersetzen,
 * fehlende Palettenfarben ergänzen, zusätzliche eigene Farben behalten.
 */
export function applyPalette(current: TableColor[], palette: Palette): TableColor[] {
  const byId = new Map(palette.colors.map((c) => [c.id, c]));
  const result = current.map((c) => {
    const p = byId.get(c.id);
    return p ? { ...c, light: p.light, dark: p.dark } : c;
  });
  for (const p of palette.colors) {
    if (!result.some((c) => c.id === p.id)) result.push({ ...p });
  }
  return result;
}

const RESERVED = new Set(["none"]);

/** Stabile, CSS-taugliche ID aus einem Namen ableiten (eindeutig gegenüber `taken`). */
export function makeId(label: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base =
    label
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "farbe";
  let id = base;
  for (let n = 2; used.has(id) || RESERVED.has(id); n++) id = `${base}-${n}`;
  return id;
}
