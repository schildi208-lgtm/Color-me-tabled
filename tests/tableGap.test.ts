import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateTableGap } from "../src/tableGap.ts";

test("neue Einstellung bleibt, ungültige wird ignoriert", () => {
  assert.equal(migrateTableGap({ tableGap: "handle" }), "handle");
  assert.equal(migrateTableGap({ tableGap: "quatsch" }), undefined);
  assert.equal(migrateTableGap({}), undefined);
});

test("0.2.0: Kompakte Tabellen an/aus", () => {
  assert.equal(migrateTableGap({ compactTables: true }), "none");
  assert.equal(migrateTableGap({ compactTables: false }), "blank-line");
});

test("Zwischenstand mit beiden Schaltern", () => {
  assert.equal(migrateTableGap({ compactTables: true, hideTableGap: true }), "none");
  assert.equal(migrateTableGap({ compactTables: false, hideTableGap: true }), "handle");
  assert.equal(migrateTableGap({ compactTables: true, hideTableGap: false }), "blank-line");
});

test("Custom wird als gültige Einstellung übernommen", () => {
  assert.equal(migrateTableGap({ tableGap: "custom" }), "custom");
});
