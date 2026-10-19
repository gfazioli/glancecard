import assert from "node:assert/strict";
import { test } from "node:test";
import { profileModel } from "../src/profile/model.js";
import { renderProfile } from "../src/profile/render.js";
import { repoModel } from "../src/repo/model.js";
import { renderRepo } from "../src/repo/render.js";
import { contrast, display, inSeason, lightOf, LOOK_NAMES, resolveLook, theme, THEME_NAMES } from "../src/theme.js";
import { fixture } from "./support/cases.js";

const at = (iso) => ({ now: new Date(iso), timeZone: "Europe/Rome" });

const LIGHT_SIDES = ["aurora-light", "upside-down-light", "hyperspace-light", "bridge-light", "nebula-light", "halloween-light", "christmas-light"];

test("the nine looks, dark and light as Midnight and Daylight, and every other dark look's light side", () => {
  assert.deepEqual(LOOK_NAMES, ["midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas", ...LIGHT_SIDES]);
  assert.deepEqual(
    LOOK_NAMES.filter((l) => !theme(l).isDark),
    ["daylight", ...LIGHT_SIDES],
  );
  assert.equal(lightOf("midnight"), "daylight");
  assert.equal(lightOf("nebula"), "nebula-light");
  assert.equal(lightOf("daylight"), "daylight");
  assert.equal(lightOf("halloween-light"), "halloween-light");
  for (const look of LOOK_NAMES.filter((l) => theme(l).isDark)) assert.ok(LOOK_NAMES.includes(lightOf(look)), look);
  assert.deepEqual(THEME_NAMES.slice(0, 2), ["dark", "light"]);
  assert.equal(resolveLook("dark"), "midnight");
  assert.equal(resolveLook("light"), "daylight");
  assert.throws(() => resolveLook("sepia"), /unknown theme "sepia"/);
});

test("the seasonal looks are worn only in their season, Midnight otherwise", () => {
  assert.equal(resolveLook("halloween", at("2026-10-01T08:00:00Z")), "halloween");
  assert.equal(resolveLook("halloween", at("2026-11-02T20:00:00Z")), "halloween");
  assert.equal(resolveLook("halloween", at("2026-11-02T23:30:00Z")), "midnight", "already 3 November in Rome");
  assert.equal(resolveLook("halloween", at("2026-09-30T21:59:00Z")), "midnight");
  assert.equal(resolveLook("christmas", at("2026-12-01T00:00:00Z")), "christmas");
  assert.equal(resolveLook("christmas", at("2027-01-06T12:00:00Z")), "christmas");
  assert.equal(resolveLook("christmas", at("2027-01-07T12:00:00Z")), "midnight");
  assert.equal(resolveLook("christmas", { ...at("2026-07-01T12:00:00Z"), allSeasons: true }), "christmas");
  assert.equal(inSeason("nebula", "2026-07-01"), true);
});

test("a seasonal light side keeps its look's season, and is Daylight out of it", () => {
  assert.equal(resolveLook("halloween-light", at("2026-10-31T12:00:00Z")), "halloween-light");
  assert.equal(resolveLook("halloween-light", at("2026-11-02T23:30:00Z")), "daylight");
  assert.equal(resolveLook("christmas-light", at("2027-01-07T12:00:00Z")), "daylight");
  assert.equal(resolveLook("christmas-light", { ...at("2026-07-01T12:00:00Z"), allSeasons: true }), "christmas-light");
});

// What the rule promises: on the light sides every accent, the colour of a
// panel's title and of the figures' icons, reads at 4.5:1 on a panel, the
// avatar's ring at 3:1, and every level of the calendar stands off an
// empty day.
const ground = (t) => {
  const [r, g, b, a] = t.panel.fill.match(/[\d.]+/g).map(Number);
  const under = [1, 3, 5].map((i) => parseInt(t.canvas[1].slice(i, i + 2), 16));
  return `#${under.map((v, i) => Math.round(v + ([r, g, b][i] - v) * a).toString(16).padStart(2, "0")).join("")}`;
};
for (const look of LIGHT_SIDES) {
  test(`${look} reads on its own paper`, () => {
    const t = theme(look);
    const panel = ground(t);
    for (const [role, colour] of Object.entries(t.accent)) assert.ok(contrast(colour, panel) >= 4.5, `${role} ${colour} at ${contrast(colour, panel).toFixed(2)}:1`);
    for (const ring of t.avatarRing.filter((c) => c.startsWith("#"))) assert.ok(contrast(ring, panel) >= 3, `ring ${ring}`);
    if (t.nameInk) assert.ok(contrast(t.nameInk, panel) >= 4.5, `name ${t.nameInk}`);
    for (const level of t.levels.slice(1)) assert.ok(contrast(level, t.levels[0]) >= 1.05, `level ${level} on ${t.levels[0]}`);
    // A bulb's highlight sits on its bulb; a star or a strand of web in white would sit on paper.
    assert.doesNotMatch(renderProfile(profile, { theme: t }), /stroke="#fff"|<circle[^>]*fill="#fff"/, "nothing drawn in white on the paper");
  });
}

test("a look sets its own lettering", () => {
  assert.equal(display(theme("hyperspace"), "Followers"), "FOLLOWERS");
  assert.equal(display(theme("midnight"), "Followers"), "Followers");
  const svg = renderProfile(profileModel(fixture("profile-gfazioli")), { theme: theme("hyperspace") });
  assert.match(svg, /class="label disp">FOLLOWERS</);
  assert.match(svg, /\.disp \{[^}]*letter-spacing: 1\.5px/);
});

test("a name glows only where its look gives it a glow", () => {
  const m = profileModel(fixture("profile-gfazioli"));
  const glowing = renderProfile(m, { theme: theme("upside-down") });
  assert.match(glowing, /<filter id="name-glow"/);
  assert.match(glowing, /class="name disp" style="fill: #FF2A2A" filter="url\(#name-glow\)"/);
  assert.doesNotMatch(renderProfile(m, { theme: theme("midnight") }), /name-glow/);
});

// Every look on both cards: well formed, every reference resolved, nothing
// undefined, and the decorations kept out of the content's way.
const repo = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
const profile = profileModel(fixture("profile-gfazioli"), { timeZone: "Europe/Rome" });
for (const look of LOOK_NAMES) {
  for (const [card, svg] of [
    ["repository", renderRepo(repo, { theme: theme(look) })],
    ["profile", renderProfile(profile, { theme: theme(look) })],
  ]) {
    test(`${look} draws a sound ${card} card`, () => {
      assert.doesNotMatch(svg, /undefined|NaN|null/);
      assert.doesNotMatch(svg, /&(?!amp;|lt;|gt;|quot;|#)/);
      const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length, "ids are unique");
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `url(#${ref}) points nowhere`);
      const height = Number(svg.match(/<svg[^>]* height="(\d+)"/)[1]);
      const t = theme(look);
      // The content starts below the top band, so a hanging decoration never
      // crosses it: the repository's name, or the profile's header panel.
      const top = card === "repository"
        ? Number(svg.match(/<text x="26" y="(\d+)" class="h-name/)[1]) - 24
        : Number(svg.match(/<rect x="24" y="(\d+)"[^>]*fill="url\(#hero\)"/)[1]);
      assert.equal(top, 24 + t.topBand);
      assert.ok(height > 0);
    });
  }
}
