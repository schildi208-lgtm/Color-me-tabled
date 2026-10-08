import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCss, cssColor, hexToRgb } from "../src/styles.ts";
import { PALETTES, applyPalette, makeId } from "../src/palettes.ts";
import type { TableColor } from "../src/palettes.ts";

test("hexToRgb versteht kurze und lange Hex-Werte", () => {
  assert.deepEqual(hexToRgb("#ff8000"), [255, 128, 0]);
  assert.deepEqual(hexToRgb("#f80"), [255, 136, 0]);
  assert.equal(hexToRgb("rot"), null);
});

test("cssColor: Theme-Farben über RGB-Variablen, Hex mit Deckkraft", () => {
  assert.equal(cssColor("theme:red", 0.25), "rgba(var(--color-red-rgb), 0.25)");
  assert.equal(cssColor("theme:mono", 0.2), "rgba(var(--mono-rgb-100), 0.2)");
  assert.equal(cssColor("#000000", 0.5), "rgba(0, 0, 0, 0.5)");
});

test("buildCss trennt Light und Dark Mode", () => {
  const colors: TableColor[] = [{ id: "done", label: "Erledigt", light: "#00ff00", dark: "#008800" }];
  const css = buildCss({ colors, alphaLight: 0.3, alphaDark: 0.6, maxCols: 3 });
  assert.match(css, /body\.theme-light \{\n {2}--tc-done: rgba\(0, 255, 0, 0\.3\);/);
  assert.match(css, /body\.theme-dark \{\n {2}--tc-done: rgba\(0, 136, 0, 0\.6\);/);
  assert.match(css, /:has\(\.cell-done\)/);
  assert.match(css, /tr:has\(\.row-done\)/);
  assert.match(css, /:nth-child\(3 of td, th\) \.col-done/);
  assert.doesNotMatch(css, /:nth-child\(4 of td, th\)/);
});

test("Alle Paletten haben dieselben IDs", () => {
  const ids = PALETTES[0].colors.map((c) => c.id).join();
  for (const p of PALETTES) assert.equal(p.colors.map((c) => c.id).join(), ids, p.id);
});

test("applyPalette ersetzt Standardfarben und behält eigene", () => {
  const own: TableColor = { id: "done", label: "Erledigt", light: "#00ff00", dark: "#00ff00" };
  const vivid = PALETTES.find((p) => p.id === "vivid")!;
  const result = applyPalette([...PALETTES[0].colors, own], vivid);
  assert.equal(result.find((c) => c.id === "red")!.light, "#fa5252");
  assert.deepEqual(result.find((c) => c.id === "done"), own);
  assert.equal(result.length, PALETTES[0].colors.length + 1);
});

test("makeId erzeugt eindeutige, CSS-taugliche IDs", () => {
  assert.equal(makeId("Grün hell!", []), "gruen-hell");
  assert.equal(makeId("Rot", ["rot"]), "rot-2");
  assert.equal(makeId("none", []), "none-2");
  assert.equal(makeId("???", []), "farbe");
});
