import { test } from "node:test";
import assert from "node:assert/strict";
import { computeChanges, cellRanges, findTable } from "../src/table.ts";
import type { Action, TableLoc } from "../src/table.ts";

const DOC = `Text
| Name | Wert | Status |
| ---- | ---- | ------ |
| Alpha | 1 | ok |
| Beta <span class="row-red"></span> | 2 | x \\| y |
Ende`;

function run(text: string, loc: TableLoc, action: Action, color: string | null): string {
  const lines = text.split("\n");
  const changes = computeChanges(lines, loc, action, color);
  assert.ok(changes, "Tabelle gefunden");
  for (const [n, t] of changes) lines[n] = t;
  return lines.join("\n");
}

test("findTable findet Tabelle auch von der Zeile davor", () => {
  const lines = DOC.split("\n");
  assert.deepEqual(findTable(lines, 0), { start: 1, end: 4 });
  assert.deepEqual(findTable(lines, 3), { start: 1, end: 4 });
  assert.equal(findTable(["kein", "tisch"], 0), null);
});

test("cellRanges ignoriert escapte Pipes und optionale Rand-Pipes", () => {
  assert.equal(cellRanges("| a | b \\| c |").length, 2);
  assert.equal(cellRanges("a | b").length, 2);
});

test("Zelle färben und entfernen", () => {
  let t = run(DOC, { approx: 1, rel: 2, col: 1 }, "cell", "green");
  assert.match(t.split("\n")[3], /\| 1 <span class="cell-green"><\/span> \|/);
  t = run(t, { approx: 1, rel: 2, col: 1 }, "cell", "blue");
  assert.doesNotMatch(t, /cell-green/);
  t = run(t, { approx: 1, rel: 2, col: 1 }, "cell", null);
  assert.doesNotMatch(t, /cell-/);
});

test("Zeile färben ersetzt vorhandene Zeilenfarbe", () => {
  const t = run(DOC, { approx: 1, rel: 3, col: 2 }, "row", "blue");
  const line = t.split("\n")[4];
  assert.match(line, /^\| Beta <span class="row-blue"><\/span> \|/);
  assert.doesNotMatch(line, /row-red/);
  assert.match(line, /x \\\| y/);
});

test("Spalte färben setzt Marker in den Kopf, auch von einer Body-Zelle aus", () => {
  const t = run(DOC, { approx: 1, rel: 3, col: 2 }, "col", "purple");
  assert.match(t.split("\n")[1], /Status <span class="col-purple"><\/span>/);
  assert.equal(run(t, { approx: 1, rel: 0, col: 2 }, "col", null), DOC);
});

test("Alle Farben entfernen", () => {
  let t = run(DOC, { approx: 1, rel: 2, col: 0 }, "cell", "red");
  t = run(t, { approx: 1, rel: 0, col: 1 }, "col", "gray");
  t = run(t, { approx: 1, rel: 0, col: 0 }, "all", null);
  assert.doesNotMatch(t, /<span/);
});
