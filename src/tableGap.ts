// Einstellung „Abstand über Tabellen“. Ohne Obsidian-Abhängigkeit, damit testbar.

/** Abstand über Tabellen in Live Preview. */
export type TableGap = "blank-line" | "none" | "handle" | "custom";

/** Reihenfolge im Dropdown; Beschriftung kommt aus der Übersetzung "gap.<option>". */
export const TABLE_GAPS: TableGap[] = ["blank-line", "none", "handle", "custom"];

/** Grenzen des Reglers für „Custom“ (Pixel). */
export const CUSTOM_GAP_MIN = 0;
export const CUSTOM_GAP_MAX = 64;
export const CUSTOM_GAP_DEFAULT = 8;

/**
 * Ältere Schalter auf das Dropdown übertragen:
 * - 0.2.0 kannte nur `compactTables`; „aus“ war Obsidians Standard.
 * - Zwischenstand vor 0.3.0 hatte zusätzlich `hideTableGap`.
 */
export function migrateTableGap(data: Record<string, unknown>): TableGap | undefined {
  if (TABLE_GAPS.includes(data.tableGap as TableGap)) return data.tableGap as TableGap;
  if ("hideTableGap" in data) {
    if (data.hideTableGap === false) return "blank-line";
    return data.compactTables === false ? "handle" : "none";
  }
  if ("compactTables" in data) return data.compactTables === false ? "blank-line" : "none";
  return undefined;
}
