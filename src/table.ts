// Markdown-Tabellen parsen und Farb-Marker setzen. Ohne Obsidian-Abhängigkeit, damit testbar.

export type MarkerType = "cell" | "row" | "col";
export type Action = MarkerType | "all";

/** Position einer Zelle relativ zu ihrer Tabelle. */
export interface CellPos {
  /** Zeilenoffset innerhalb der Tabelle (0 = Kopf, 1 = Trennzeile, 2.. = Body). */
  rel: number;
  col: number;
}

/** Eine oder mehrere Zellen (Auswahl) einer Tabelle. */
export interface TableLoc {
  /** Ungefähre Startzeile der Tabelle (darf knapp davor liegen). */
  approx: number;
  cells: CellPos[];
}

export interface TableRange {
  start: number;
  end: number;
}

export const isRow = (line: string | undefined): line is string =>
  line !== undefined && line.trim() !== "" && line.includes("|");

export const isSeparator = (line: string): boolean =>
  /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

/** Tabelle ab Zeile `approx` suchen (die Zeile darf in oder knapp vor der Tabelle liegen). */
export function findTable(lines: string[], approx: number): TableRange | null {
  let s = approx;
  if (!isRow(lines[s])) {
    let i = s;
    while (i < lines.length && i < approx + 5 && !isRow(lines[i])) i++;
    if (!isRow(lines[i])) return null;
    s = i;
  }
  while (s > 0 && isRow(lines[s - 1])) s--;
  if (!isSeparator(lines[s + 1] ?? "")) return null;
  let e = s + 1;
  while (e + 1 < lines.length && isRow(lines[e + 1])) e++;
  return { start: s, end: e };
}

/** Zellbereiche [start, end) einer Tabellenzeile; `\|` gilt nicht als Trenner. */
export function cellRanges(line: string): [number, number][] {
  const pipes: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "|" && line[i - 1] !== "\\") pipes.push(i);
  }
  const lead = line.trimStart().startsWith("|");
  const trail = line.trimEnd().endsWith("|") && pipes.length > (lead ? 1 : 0);
  const ranges: [number, number][] = [];
  let segStart = lead ? pipes[0] + 1 : 0;
  for (let p = lead ? 1 : 0; p < pipes.length; p++) {
    ranges.push([segStart, pipes[p]]);
    segStart = pipes[p] + 1;
  }
  if (!trail) ranges.push([segStart, line.length]);
  return ranges;
}

const markerRe = (type: MarkerType) =>
  new RegExp(`\\s*<span class=["']${type}-[\\w-]+["']\\s*>\\s*</span>`, "g");

function setMarker(text: string, type: MarkerType, color: string | null): string {
  text = text.replace(markerRe(type), "");
  if (color) text = text.replace(/\s*$/, "") + ` <span class="${type}-${color}"></span> `;
  return text;
}

/** Zelle `col` in `line` umschreiben. */
function editCell(line: string, col: number, fn: (text: string) => string): string {
  const r = cellRanges(line)[col];
  if (!r) return line;
  return line.slice(0, r[0]) + fn(line.slice(r[0], r[1])) + line.slice(r[1]);
}

function editAllCells(line: string, fn: (text: string) => string): string {
  const ranges = cellRanges(line);
  for (let i = ranges.length - 1; i >= 0; i--) line = editCell(line, i, fn);
  return line;
}

/**
 * Berechnet die geänderten Zeilen (Zeilennummer -> neuer Text) für alle Zellen in `loc.cells`.
 * Zeilen-/Spaltenaktionen wirken auf jede betroffene Zeile bzw. Spalte genau einmal.
 * `color === null` entfernt die Farbe; Aktion "all" entfernt alle Marker der Tabelle.
 * Gibt null zurück, wenn die Tabelle nicht gefunden wurde.
 */
export function computeChanges(
  lines: string[],
  loc: TableLoc,
  action: Action,
  color: string | null,
): Map<number, string> | null {
  const tbl = findTable(lines, loc.approx);
  if (!tbl) return null;
  const sep = tbl.start + 1;
  const changes = new Map<number, string>();
  const get = (n: number) => changes.get(n) ?? lines[n];
  const edit = (n: number, fn: (line: string) => string) => changes.set(n, fn(get(n)));
  const cells = loc.cells.filter((c) => c.rel !== 1 && tbl.start + c.rel <= tbl.end);

  if (action === "cell") {
    for (const c of cells) edit(tbl.start + c.rel, (l) => editCell(l, c.col, (t) => setMarker(t, "cell", color)));
  } else if (action === "row") {
    for (const rel of new Set(cells.map((c) => c.rel))) {
      edit(tbl.start + rel, (l) => {
        l = editAllCells(l, (t) => setMarker(t, "row", null));
        return color ? editCell(l, 0, (t) => setMarker(t, "row", color)) : l;
      });
    }
  } else if (action === "col") {
    for (const col of new Set(cells.map((c) => c.col))) {
      for (let n = tbl.start; n <= tbl.end; n++) {
        if (n !== sep) edit(n, (l) => editCell(l, col, (t) => setMarker(t, "col", null)));
      }
      if (color) edit(tbl.start, (l) => editCell(l, col, (t) => setMarker(t, "col", color)));
    }
  } else {
    const types: MarkerType[] = ["cell", "row", "col"];
    for (let n = tbl.start; n <= tbl.end; n++) {
      if (n !== sep) edit(n, (l) => editAllCells(l, (t) => types.reduce((x, k) => setMarker(x, k, null), t)));
    }
  }

  for (const [n, text] of changes) if (text === lines[n]) changes.delete(n);
  return changes;
}
