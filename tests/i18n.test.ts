import { test } from "node:test";
import assert from "node:assert/strict";
import { colorLabel, defaultColorLabels, setLanguage, t } from "../src/i18n.ts";

test("Sprache folgt dem Obsidian-Sprachcode, Standard ist Englisch", () => {
  setLanguage("de");
  assert.equal(t("menu.cell"), "Zelle färben");
  setLanguage("en-GB");
  assert.equal(t("menu.cell"), "Color cell");
  setLanguage("fr");
  assert.equal(t("menu.cell"), "Color cell");
  setLanguage(null);
  assert.equal(t("menu.cell"), "Color cell");
});

test("Platzhalter werden ersetzt", () => {
  setLanguage("de");
  assert.equal(t("menu.cell.many", { n: 4 }), "4 Zellen färben");
  setLanguage("en");
  assert.equal(t("cmd.color", { type: t("type.row"), color: "Red" }), "Row: Red");
});

test("Standardfarben ohne eigenen Namen werden übersetzt, eigene Namen bleiben", () => {
  setLanguage("en");
  assert.equal(colorLabel({ id: "red", label: "" }), "Red");
  assert.equal(colorLabel({ id: "red", label: "Wichtig" }), "Wichtig");
  assert.equal(colorLabel({ id: "erledigt", label: "" }), "erledigt");
  setLanguage("de");
  assert.equal(colorLabel({ id: "red", label: "" }), "Rot");
});

test("alte deutsche Standardnamen werden erkannt", () => {
  assert.ok(defaultColorLabels("red").includes("Rot"));
  assert.ok(defaultColorLabels("red").includes("Red"));
  assert.deepEqual(defaultColorLabels("erledigt"), []);
});
