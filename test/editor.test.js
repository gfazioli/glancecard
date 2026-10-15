import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileNames as runFileNames, parseThemes as runParseThemes } from "../src/run.js";
import { THEME_NAMES } from "../src/theme.js";
import { DEFAULT, embed, fileNames, parseThemes, plan, prompt, THEME_ORDER, workflow } from "../site/editor.js";

// The setup editor, on the README's own blocks: what the page starts from.
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const PROMPT = readme.split("## Set it up in one paste")[1].match(/```text\n([\s\S]*?)\n```/)[1];
const byHand = readme.split("## Set it up by hand")[1].split("## Staying up to date")[0];
const YAML = byHand.match(/```yaml\n([\s\S]*?)\n```/)[1];
const EMBED = byHand.match(/```html\n([\s\S]*?)\n```/)[1];
const RAW = "https://raw.githubusercontent.com/<login>/<login>/<default branch>/glancecard/";

test("the editor reads themes and names files as the action does", () => {
  assert.deepEqual(THEME_ORDER, THEME_NAMES);
  for (const value of ["both", "", "dark", "light, dark", "both, halloween", "midnight, daylight", "both, dark, nebula", "Halloween"]) {
    assert.deepEqual(parseThemes(value), runParseThemes(value), value);
    const themes = runParseThemes(value);
    assert.deepEqual(fileNames("profile", themes), runFileNames("profile", themes), value);
  }
});

test("the default choice gives the README's blocks back, byte for byte", () => {
  const p = plan(DEFAULT);
  assert.equal(p.theme, null);
  assert.equal(p.calendar, null);
  assert.equal(prompt(PROMPT, p), PROMPT);
  assert.equal(workflow(YAML, p), YAML);
  assert.equal(embed(EMBED, p), EMBED);
  assert.deepEqual(plan({ looks: [] }), p, "no look at all is the default");
});

test("one look: its theme line, and files without a suffix", () => {
  const p = plan({ looks: ["halloween"] });
  assert.deepEqual(p.seasonal, ["halloween"]);
  const out = prompt(PROMPT, p);
  assert.ok(out.includes("             time-zone: <zone>\n             theme: halloween\n\n"), "theme under time-zone");
  assert.ok(out.includes("check that glancecard/profile.svg is now on the default branch"));
  assert.ok(out.includes(`\n   <img src="glancecard/profile.svg" width="880" alt="<login>'s GitHub activity">\n\n5.`), "a plain <img>, at the <picture>'s indent");
  assert.doesNotMatch(out, /<picture>\n|profile-dark|profile-light/);
  assert.ok(out.includes(`with the same <img> pointing at ${RAW}<name>.svg. Don't merge them`));
  assert.equal(workflow(YAML, p), YAML.replace("another-repo", "another-repo\n          theme: halloween"));
  assert.equal(embed(EMBED, p), `<img src="glancecard/your-repo.svg" width="880" alt="your-repo at a glance">`);
});

test("dark and light with more: both, the <picture> kept, and the grid", () => {
  const p = plan({ looks: ["halloween", "light", "dark"], calendar: "grid" });
  assert.equal(p.theme, "both, halloween");
  assert.deepEqual(p.themes, ["dark", "light", "halloween"]);
  const out = prompt(PROMPT, p);
  assert.ok(out.includes("             time-zone: <zone>\n             theme: both, halloween\n             calendar: grid\n"));
  assert.ok(out.includes("check that glancecard/profile-dark.svg is now"));
  assert.ok(out.includes(`srcset="glancecard/profile-dark.svg"`) && out.includes(`src="glancecard/profile-light.svg"`));
  assert.ok(out.includes(`with the same <picture> pointing at ${RAW}<name>-dark.svg and -light.svg.`));
  assert.equal(embed(EMBED, p), EMBED);
  assert.equal(workflow(YAML, p), YAML.replace("another-repo", "another-repo\n          theme: both, halloween\n          calendar: grid"));
});

test("Midnight and Daylight make a <picture> too, of their own files", () => {
  const p = plan({ looks: ["daylight", "midnight", "nebula"] });
  assert.equal(p.theme, "midnight, daylight, nebula");
  const out = prompt(PROMPT, p);
  assert.ok(out.includes(`srcset="glancecard/profile-midnight.svg"`) && out.includes(`src="glancecard/profile-daylight.svg"`));
  assert.ok(out.includes("check that glancecard/profile-midnight.svg is now"));
  assert.ok(out.includes(`${RAW}<name>-midnight.svg and -daylight.svg.`));
  assert.ok(embed(EMBED, p).includes(`srcset="glancecard/your-repo-midnight.svg"`));
});

test("several looks with no pair: the first one picked, in the action's order", () => {
  const p = plan({ looks: ["nebula", "aurora"] });
  assert.equal(p.theme, "aurora, nebula");
  assert.equal(embed(EMBED, p), `<img src="glancecard/your-repo-aurora.svg" width="880" alt="your-repo at a glance">`);
  assert.ok(prompt(PROMPT, p).includes(`with the same <img> pointing at ${RAW}<name>-aurora.svg.`));
  assert.equal(plan({ looks: ["dark"] }).embed.look, "dark");
  assert.ok(prompt(PROMPT, plan({ looks: ["dark"] })).includes("check that glancecard/profile.svg is now"));
});

test("a template that drifted fails loudly instead of passing through", () => {
  const p = plan({ looks: ["nebula"] });
  assert.throws(() => prompt(PROMPT.replace("time-zone: <zone>", "time-zone: UTC"), p), /expected exactly one/);
  assert.throws(() => workflow(YAML.replace("another-repo", "other"), p), /expected exactly one/);
  assert.throws(() => prompt(PROMPT.replace("profile-dark.svg is now", "profile.svg is now"), p), /expected exactly one/);
});
