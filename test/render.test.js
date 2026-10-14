import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { repoModel } from "../src/repo/model.js";
import { REPO_SECTIONS, renderRepo } from "../src/repo/render.js";
import { THEMES } from "../src/theme.js";
import { CASES, fixture, goldenPath, renderCase } from "./support/cases.js";

// A card is the golden file byte for byte. After a deliberate change, run
// `npm run golden` and look at the result (`npm run preview`) before committing.
for (const c of CASES) {
  test(`golden: ${c.name}`, () => {
    assert.equal(renderCase(c), readFileSync(goldenPath(c), "utf8"));
  });
}

for (const c of CASES) {
  test(`well formed: ${c.name}`, () => {
    const svg = renderCase(c);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="880" height="\d+" viewBox="0 0 880 \d+"/);
    assert.doesNotMatch(svg, /&(?!amp;|lt;|gt;|quot;|#)/, "an unescaped ampersand");
    assert.doesNotMatch(svg, /undefined|NaN/);
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, "ids are unique");
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `url(#${ref}) points nowhere`);
    assert.ok(svg.endsWith("</svg>\n"));
  });
}

test("titles are coloured through style, which the stylesheet cannot override", () => {
  const svg = renderCase(CASES[0]);
  assert.doesNotMatch(svg, /class="title" fill=/);
  assert.match(svg, /class="title" style="fill: #/);
});

test("a section left out is not drawn, and its partner takes the full width", () => {
  const m = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  const all = renderRepo(m, { theme: THEMES.dark });
  const some = renderRepo(m, { theme: THEMES.dark, sections: ["code"] });
  for (const title of ["Activity", "Rhythm", "Latest commits", "Releases", "Contributors"]) {
    assert.match(all, new RegExp(`>${title}<`));
    assert.doesNotMatch(some, new RegExp(`>${title}<`));
  }
  assert.match(some, /<rect x="24" y="\d+" width="832" height="\d+" rx="14" class="panel"\/>/, "Code alone spans the card");
  assert.ok(Number(some.match(/height="(\d+)"/)[1]) < Number(all.match(/height="(\d+)"/)[1]));
  assert.deepEqual(REPO_SECTIONS.length, 8);
});

test("a capped history says so instead of undercounting in silence", () => {
  const data = fixture("octoscope");
  const m = repoModel({ ...data, history: { ...data.history, capped: true } }, { timeZone: "Europe/Rome" });
  const svg = renderRepo(m, { theme: THEMES.dark });
  // The panel's caption, not the <desc>, which says it too.
  assert.match(svg, new RegExp(`class="caption" text-anchor="end">${m.yearCommits.toLocaleString("en-US")}\\+ commits in the last year<`));
  assert.match(svg, /Only the latest .* commits are drawn/);
});

test("an avatar is embedded when given and a placeholder drawn when not", () => {
  const m = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  const url = m.contributors[0].avatarUrl;
  const withImage = renderRepo(m, { theme: THEMES.dark, images: { [url]: "data:image/png;base64,AAAA" } });
  assert.match(withImage, /<image href="data:image\/png;base64,AAAA"/);
  assert.doesNotMatch(renderRepo(m, { theme: THEMES.dark }), /<image /);
});
