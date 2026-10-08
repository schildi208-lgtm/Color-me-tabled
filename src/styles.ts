// Erzeugt das Farb-CSS aus den Einstellungen. Wird zur Laufzeit in den <head> geschrieben.
import type { ColorValue, TableColor } from "./palettes.ts";

export interface StyleOptions {
  colors: TableColor[];
  alphaLight: number;
  alphaDark: number;
  maxCols: number;
}

// Gilt für Leseansicht und Live Preview
const SCOPE = ":is(.markdown-rendered, .markdown-source-view)";
const CELL = ":is(td, th)";
// Alle Regeln setzen denselben Wert -> Spezifität egal, Priorität kommt aus der Kette
const APPLY = "background-color: var(--tc-cell, var(--tc-row, var(--tc-col)));";

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** CSS-Variable mit den RGB-Kanälen einer Theme-Farbe, z. B. theme:red -> --color-red-rgb. */
export function themeVar(value: ColorValue): string | null {
  if (!value.startsWith("theme:")) return null;
  const name = value.slice("theme:".length);
  return name === "mono" ? "--mono-rgb-100" : `--color-${name}-rgb`;
}

export function cssColor(value: ColorValue, alpha: number): string {
  const v = themeVar(value);
  if (v) return `rgba(var(${v}), ${alpha})`;
  const rgb = hexToRgb(value);
  return rgb ? `rgba(${rgb.join(", ")}, ${alpha})` : "transparent";
}

export function buildCss({ colors, alphaLight, alphaDark, maxCols }: StyleOptions): string {
  const out = [
    "/* Table Prettifier – dynamisch erzeugt */",
    "body.theme-light {",
    ...colors.map((c) => `  --tc-${c.id}: ${cssColor(c.light, alphaLight)};`),
    "}",
    "body.theme-dark {",
    ...colors.map((c) => `  --tc-${c.id}: ${cssColor(c.dark, alphaDark)};`),
    "}",
  ];

  for (let n = 1; n <= maxCols; n++) {
    const nth = `tr > :nth-child(${n} of td, th)`;
    for (const c of colors) {
      out.push(`${SCOPE} table:has(${nth} .col-${c.id}) ${nth} { --tc-col: var(--tc-${c.id}); ${APPLY} }`);
    }
  }
  for (const c of colors) {
    out.push(`${SCOPE} tr:has(.row-${c.id}) > ${CELL} { --tc-row: var(--tc-${c.id}); ${APPLY} }`);
  }
  for (const c of colors) {
    out.push(`${SCOPE} ${CELL}:has(.cell-${c.id}) { --tc-cell: var(--tc-${c.id}); ${APPLY} }`);
  }
  return out.join("\n") + "\n";
}
