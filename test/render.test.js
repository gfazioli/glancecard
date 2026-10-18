import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { profileModel } from "../src/profile/model.js";
import { renderProfile } from "../src/profile/render.js";
import { repoModel } from "../src/repo/model.js";
import { REPO_SECTIONS, renderRepo } from "../src/repo/render.js";
import { ticks } from "../src/svg.js";
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
  assert.doesNotMatch(svg, /class="title[^"]*" fill=/);
  assert.match(svg, /class="title disp" style="fill: #/);
});

test("a section left out is not drawn, and its partner takes the full width", () => {
  const m = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  const all = renderRepo(m, { theme: THEMES.dark });
  const some = renderRepo(m, { theme: THEMES.dark, sections: ["code"] });
  for (const title of ["Activity", "Stars", "Rhythm", "Latest commits", "Releases", "Contributors"]) {
    assert.match(all, new RegExp(`>${title}<`));
    assert.doesNotMatch(some, new RegExp(`>${title}<`));
  }
  assert.match(some, /<rect x="24" y="\d+" width="832" height="\d+" rx="14" class="panel"\/>/, "Code alone spans the card");
  assert.ok(Number(some.match(/height="(\d+)"/)[1]) < Number(all.match(/height="(\d+)"/)[1]));
  assert.deepEqual(REPO_SECTIONS.length, 9);
});

test("a capped history says so instead of undercounting in silence", () => {
  const data = fixture("octoscope");
  const m = repoModel({ ...data, history: { ...data.history, capped: true } }, { timeZone: "Europe/Rome" });
  const svg = renderRepo(m, { theme: THEMES.dark });
  // The panel's caption, not the <desc>, which says it too.
  assert.match(svg, new RegExp(`class="caption" text-anchor="end">${m.yearCommits.toLocaleString("en-US")}\\+ commits in the last year<`));
  assert.match(svg, /Only the latest .* commits are drawn/);
});

test("the value axis steps by 1, 2 or 5 times a power of ten, never under 1", () => {
  assert.deepEqual(ticks(316), { step: 100, top: 400 });
  assert.deepEqual(ticks(38), { step: 10, top: 40 });
  assert.deepEqual(ticks(7), { step: 2, top: 8 });
  assert.deepEqual(ticks(1), { step: 1, top: 1 });
  assert.deepEqual(ticks(0), { step: 1, top: 1 });
});

// The grid's squares are 11 px rects; the chart has none, and a line instead.
const squares = (svg) => (svg.match(/<rect [^>]*width="11" height="11" rx="2.5"/g) ?? []).length;

test("a year is a chart by default, and GitHub's calendar when asked", () => {
  const profile = profileModel(fixture("profile-gfazioli"), { timeZone: "Europe/Rome" });
  const repo = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  for (const [chart, grid, days] of [
    [renderProfile(profile, { theme: THEMES.dark }), renderProfile(profile, { theme: THEMES.dark, calendar: "grid" }), profile.days.length],
    [renderRepo(repo, { theme: THEMES.dark }), renderRepo(repo, { theme: THEMES.dark, calendar: "grid" }), repo.days.length],
  ]) {
    const line = chart.match(/<path d="([^"]+)" class="chart-line"/);
    assert.ok(line, "the chart draws its line");
    assert.equal(line[1].match(/ C/g).length, days - 1, "one curve between each day and the next");
    assert.equal(squares(chart), 0);
    assert.doesNotMatch(grid, /class="chart-line"/);
    assert.equal(squares(grid), days + 5, "a square per day, and five in the legend");
  }
  const axis = [...renderProfile(profile, { theme: THEMES.dark }).matchAll(/class="axis" text-anchor="end">(\d+)</g)].map((m) => m[1]);
  assert.deepEqual(axis, ["0", "100", "200", "300", "400"]);
});

test("an avatar is embedded when given and a placeholder drawn when not", () => {
  const m = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  const url = m.contributors[0].avatarUrl;
  const withImage = renderRepo(m, { theme: THEMES.dark, images: { [url]: "data:image/png;base64,AAAA" } });
  assert.match(withImage, /<image href="data:image\/png;base64,AAAA"/);
  assert.doesNotMatch(renderRepo(m, { theme: THEMES.dark }), /<image /);
});

// The stars line sampled along each of its curves: its y every 1/20 of the way.
const starLine = (svg) => {
  const d = svg.match(/<path d="([^"]+)" class="growth-line"/)?.[1];
  assert.ok(d, "the stars line is drawn");
  const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((p) => Number(p[2]));
  const samples = [ys[0]];
  for (let i = 1; i + 2 < ys.length; i += 3) {
    const [y0, y1, y2, y3] = [ys[i - 1], ys[i], ys[i + 1], ys[i + 2]];
    for (let k = 1; k <= 20; k++) {
      const t = k / 20;
      samples.push((1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * y3);
    }
  }
  return samples;
};

test("the stars line only rises or holds, even across a jump", () => {
  for (const name of ["octoscope", "react-switch-button"]) {
    const svg = renderRepo(repoModel(fixture(name), { timeZone: "Europe/Rome" }), { theme: THEMES.dark });
    const ys = starLine(svg);
    // Higher on the card is a smaller y; the path's coordinates are rounded to 0.1 px.
    assert.ok(ys.every((y, i) => i === 0 || y <= ys[i - 1] + 0.05), `${name}: the line turns back down`);
  }
});

test("the stars panel names its counts, and a history under a year has no last year", () => {
  const old = renderRepo(repoModel(fixture("react-switch-button"), { timeZone: "Europe/Rome" }), { theme: THEMES.dark });
  assert.match(old, /class="caption" text-anchor="end">86 stars since Feb 2015</);
  assert.match(old, /class="pill-k">Last year<tspan dx="5" class="pill-v">\+1</);
  assert.match(old, /class="pill-k">Best week<tspan dx="5" class="pill-v">\+5 · Jan 2017</);
  assert.match(old, />2016</);
  const young = renderRepo(repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" }), { theme: THEMES.dark });
  assert.match(young, /class="pill-k">Last 30 days<tspan dx="5" class="pill-v">\+7</);
  assert.doesNotMatch(young, /class="pill-k">Last year</);
  assert.match(young, />May</);
});

test("a repository without stars, or without a history, says so in place of the chart", () => {
  const data = fixture("octoscope");
  const none = renderRepo(repoModel({ ...data, stars: [] }, { timeZone: "Europe/Rome" }), { theme: THEMES.dark });
  assert.match(none, /class="excerpt">No stars yet\.</);
  assert.doesNotMatch(none, /growth-line|stars-fill/);
  const missing = renderRepo(repoModel({ ...data, stars: null }, { timeZone: "Europe/Rome" }), { theme: THEMES.dark });
  assert.match(missing, /class="excerpt">GitHub returned no star history\.</);
  const off = renderRepo(repoModel(data, { timeZone: "Europe/Rome" }), { theme: THEMES.dark, sections: ["hero"] });
  assert.doesNotMatch(off, />Stars<|stars-fill/);
});
