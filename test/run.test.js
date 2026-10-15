import assert from "node:assert/strict";
import { test } from "node:test";
import { input, parseBool } from "../src/action.js";
import { fileBases, fileNames, parseCalendar, parseCount, parseList, parseSections, parseThemes } from "../src/run.js";

test("lists split on commas, spaces and newlines", () => {
  assert.deepEqual(parseList("a/b, c/d\n  e/f\n"), ["a/b", "c/d", "e/f"]);
  assert.deepEqual(parseList(""), []);
  assert.deepEqual(parseList(undefined), []);
});

test("themes: both, dark, light and the looks, in any mix", () => {
  assert.deepEqual(parseThemes("both"), ["dark", "light"]);
  assert.deepEqual(parseThemes(""), ["dark", "light"]);
  assert.deepEqual(parseThemes("light"), ["light"]);
  assert.deepEqual(parseThemes("both, Nebula\nhalloween"), ["dark", "light", "nebula", "halloween"]);
  assert.deepEqual(parseThemes("dark, both"), ["dark", "light"]);
  assert.throws(() => parseThemes("blue"), /unknown theme blue \(choose from both, dark, light, midnight/);
});

test("sections", () => {
  assert.equal(parseSections("all").length, 8);
  assert.equal(parseSections("").length, 8);
  assert.deepEqual(parseSections("hero, code"), ["hero", "code"]);
  assert.throws(() => parseSections("hero, stars"), /unknown section stars/);
});

test("calendar: a chart unless told grid", () => {
  assert.equal(parseCalendar(""), "chart");
  assert.equal(parseCalendar(undefined), "chart");
  assert.equal(parseCalendar(" Grid "), "grid");
  assert.equal(parseCalendar("chart"), "chart");
  assert.throws(() => parseCalendar("bars"), /unknown calendar bars \(choose from chart, grid\)/);
});

test("counts", () => {
  assert.equal(parseCount("", "max-commits", 5000), 5000);
  assert.equal(parseCount("2000", "max-commits", 5000), 2000);
  assert.throws(() => parseCount("12", "max-commits", 5000), /at least 100/);
  assert.throws(() => parseCount("lots", "max-commits", 5000), /whole number/);
});

test("file names: the repository name, owner-name only where two names collide", () => {
  const bases = fileBases(["gfazioli/octoscope", "a/tools", "b/tools"]);
  assert.equal(bases.get("gfazioli/octoscope"), "octoscope");
  assert.equal(bases.get("a/tools"), "a-tools");
  assert.equal(bases.get("b/tools"), "b-tools");
  assert.deepEqual(fileNames("octoscope", ["dark", "light"]), [
    ["dark", "octoscope-dark.svg"],
    ["light", "octoscope-light.svg"],
  ]);
  assert.deepEqual(fileNames("octoscope", ["light"]), [["light", "octoscope.svg"]]);
});

test("action inputs read the runner's INPUT_ variables", () => {
  const env = { "INPUT_OUT-DIR": " cards ", INPUT_REPOS: "a/b\nc/d", "INPUT_TIME-ZONE": "" };
  assert.equal(input("out-dir", env), "cards");
  assert.equal(input("repos", env), "a/b\nc/d");
  assert.equal(input("time-zone", env), "");
  assert.equal(input("missing", env), "");
  assert.equal(parseBool("TRUE", "commit"), true);
  assert.equal(parseBool("false", "commit"), false);
  assert.throws(() => parseBool("yes", "commit"), /true or false/);
});
