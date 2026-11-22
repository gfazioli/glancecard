import assert from "node:assert/strict";
import { test } from "node:test";
import { profileModel } from "../src/profile/model.js";
import { renderProfile } from "../src/profile/render.js";
import { repoModel } from "../src/repo/model.js";
import { renderRepo } from "../src/repo/render.js";
import { contrast, display, inSeason, lightOf, LOOK_NAMES, resolveLook, theme, THEME_NAMES } from "../src/theme.js";
import { kit } from "../src/svg.js";
import { textWidth } from "../src/text.js";
import { fixture } from "./support/cases.js";

const at = (iso) => ({ now: new Date(iso), timeZone: "Europe/Rome" });

const LIGHT_SIDES = ["aurora-light", "upside-down-light", "hyperspace-light", "bridge-light", "nebula-light", "halloween-light", "christmas-light"];
const TUBES = ["phosphor-green", "phosphor-amber", "phosphor-white", "phosphor-color"];
const PRINTOUTS = ["printout-green", "printout-yellow", "printout-white", "printout-color"];

test("the nine looks, dark and light as Midnight and Daylight, every other dark look's light side, and the terminal's eight", () => {
  assert.deepEqual(LOOK_NAMES, ["midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas", ...LIGHT_SIDES, ...TUBES, ...PRINTOUTS]);
  assert.deepEqual(
    LOOK_NAMES.filter((l) => !theme(l).isDark),
    ["daylight", ...LIGHT_SIDES, ...PRINTOUTS],
  );
  // A tube is the same on a light page: its own light side.
  for (const tube of TUBES) assert.equal(lightOf(tube), tube);
  for (const paper of PRINTOUTS) assert.equal(lightOf(paper), paper);
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
    // The profile's name sits on the header, the repository's on the paper.
    for (const g of [panel, ...t.header, t.canvas[0]]) if (t.nameInk) assert.ok(contrast(t.nameInk, g) >= 4.5, `name ${t.nameInk} on ${g} at ${contrast(t.nameInk, g).toFixed(2)}:1`);
    for (const level of t.levels.slice(1)) assert.ok(contrast(level, t.levels[0]) >= 1.05, `level ${level} on ${t.levels[0]}`);
    assert.ok(contrast(t.levels[1], t.levels[0]) <= 2, `the first level ${t.levels[1]} stays light`);
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

// ─── The terminal looks ───

const profileOf = () => profileModel(fixture("profile-gfazioli"), { timeZone: "Europe/Rome" });
const repoOf = () => repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });

for (const look of PRINTOUTS) {
  test(`${look} reads on its paper, its bars and its header`, () => {
    const t = theme(look);
    const grounds = [t.canvas[1], ...(t.paper.bar ? [t.paper.bar] : []), ...t.header];
    for (const g of grounds) {
      assert.ok(contrast(t.text.base, g) >= 7, `ink on ${g}`);
      for (const [role, colour] of Object.entries(t.accent)) assert.ok(contrast(colour, g) >= 4.5, `${role} ${colour} on ${g} at ${contrast(colour, g).toFixed(2)}:1`);
    }
    for (const level of t.levels.slice(1)) assert.ok(contrast(level, t.levels[0]) >= 1.05, `level ${level}`);
  });
}

test("the terminal looks set every letter monospaced, and measure it so", () => {
  for (const look of [...TUBES, ...PRINTOUTS]) {
    const t = theme(look);
    assert.ok(t.mono, look);
    assert.match(renderProfile(profileOf(), { theme: t }), /text \{ font-family: ui-monospace/, look);
  }
  assert.ok(!theme("midnight").mono);
  // Pills, tiles and axes are sized with the look's own measure.
  assert.equal(kit(theme("printout-white")).textWidth("Followers", 12, 600), textWidth("Followers", 12, 600, true));
  assert.equal(kit(theme("midnight")).textWidth("Followers", 12, 600), textWidth("Followers", 12, 600));
  assert.match(renderProfile(profileOf(), { theme: theme("midnight") }), /text \{ font-family: -apple-system/);
  // A bio as wide as the system font allows is clipped sooner in a monospaced one.
  const long = { ...fixture("profile-gfazioli") };
  long.user = { ...long.user, bio: "Building tools for developers who live in the terminal, one release at a time, with care and coffee" };
  const m = profileModel(long, { timeZone: "Europe/Rome" });
  const bio = (look) => renderProfile(m, { theme: theme(look) }).match(/class="bio">([^<]*)</)[1];
  assert.ok(bio("phosphor-green").length < bio("midnight").length, `${bio("phosphor-green")} | ${bio("midnight")}`);
});

test("a tube glows behind scanlines, writes its prompt and blinks its cursor, still for a reader who asks", () => {
  const svg = renderProfile(profileOf(), { theme: theme("phosphor-green") });
  assert.match(svg, /<g filter="url\(#bloom\)">/);
  assert.match(svg, /<rect [^>]*fill="url\(#scan\)"\/>/);
  assert.match(svg, /<rect [^>]*fill="url\(#vignette\)"\/>/);
  assert.match(svg, /class="prompt"><tspan[^>]*>gfazioli@github<\/tspan>:~\$ glancecard profile gfazioli<\/text>/);
  assert.match(svg, /<rect class="cursor" /);
  assert.match(svg, /@media \(prefers-reduced-motion: reduce\) \{ \.roll, \.cursor \{ animation: none; \} \}/);
  assert.doesNotMatch(svg, /<feOffset in="red"/, "a one-colour tube has one gun");
  const colour = renderRepo(repoOf(), { theme: theme("phosphor-color") });
  assert.match(colour, /<feOffset in="red" dx="0.6"/, "a colour tube's guns never quite meet");
  assert.match(colour, /class="prompt">[^\n]*glancecard repo gfazioli\/octoscope<\/text>/);
});

test("a printout is struck in dots on paper with its tractor holes cut through", () => {
  const svg = renderRepo(repoOf(), { theme: theme("printout-green") });
  assert.match(svg, /<g clip-path="url\(#card\)" mask="url\(#holes\)">/);
  assert.match(svg, /<g filter="url\(#ink\)">/);
  assert.match(svg, /\*\*\* GLANCECARD REPO GFAZIOLI\/OCTOSCOPE \*\*\*/);
  assert.match(svg, /\*\*\* END OF LISTING \*\*\*/);
  assert.doesNotMatch(svg, /filter="url\(#bloom\)"|class="cursor"/, "paper does not glow, nor blink");
  assert.doesNotMatch(renderProfile(profileOf(), { theme: theme("printout-white") }), /pattern id="bars"/, "plain white paper has no bars");
});

test("a terminal look draws a photograph in its own ink, and GitHub's colours in its steps", () => {
  const m = profileOf();
  const images = { [m.user.avatarUrl]: "data:image/png;base64,iVBORw0KGgo=" };
  assert.match(renderProfile(m, { theme: theme("phosphor-amber"), images }), /<g filter="url\(#photo\)"><clipPath id="avatar">/);
  assert.doesNotMatch(renderProfile(m, { theme: theme("midnight"), images }), /url\(#photo\)/);
  const t = theme("phosphor-green");
  assert.equal(t.hue("#3178c6", 0), "#33FF66", "TypeScript's blue is the phosphor");
  assert.notEqual(t.hue("#3178c6", 1), t.hue("#3178c6", 0), "the next language a step dimmer");
  assert.equal(theme("phosphor-color").hue("#3178c6", 0), "#3178c6", "a colour tube keeps GitHub's colours");
});

test("a terminal's long names stay on the card: the heading set smaller, the prompts cut", () => {
  const data = fixture("octoscope");
  const long = { ...data, repo: { ...data.repo, name: "initialization-and-migration-scripts-and-utilities", nameWithOwner: "a-rather-long-owner/initialization-and-migration-scripts-and-utilities" } };
  const m = repoModel(long, { timeZone: "Europe/Rome" });
  const tube = renderRepo(m, { theme: theme("phosphor-green") });
  assert.match(tube, /class="h-name disp" style="fill: #8CFFAA; font-size: \d+(\.5)?px">/, "the name is set smaller beside the date");
  assert.match(tube, /class="prompt">[^\n]*glancecard repo a-rather-long-owner\/[^<]*…<\/text>/, "the command is cut at the glass");
  const paper = renderRepo(m, { theme: theme("printout-white") });
  assert.match(paper, /class="prompt">\*\*\* GLANCECARD REPO [^<]*… \*\*\*<\/text>/, "the heading leaves the date its room");
  assert.doesNotMatch(renderRepo(repoOf(), { theme: theme("phosphor-green") }), /class="h-name disp" style="[^"]*font-size/, "a name that fits keeps its size");
});

test("on a one-colour terminal a repository's dot wears its language's shade", () => {
  const m = profileOf();
  const svg = renderProfile(m, { theme: theme("phosphor-green") });
  const t = theme("phosphor-green");
  const ts = m.languages.findIndex((l) => l.name === "TypeScript");
  const shadeTS = t.hue("#3178c6", ts);
  const dots = [...svg.matchAll(/<circle cx="\d+" cy="[\d.]+" r="4.5" fill="(#[0-9A-F]{6})"\/>\s*<text[^>]*class="row">([^<]+)</g)];
  const tsRepos = m.topRepos.filter((r) => r.primaryLanguage?.name === "TypeScript").map((r) => r.name);
  assert.ok(tsRepos.length > 1, "the fixture has TypeScript repositories");
  for (const [, fill, name] of dots) if (tsRepos.includes(name)) assert.equal(fill, shadeTS, name);
  assert.equal(new Set([0, 1, 2, 3, 4, 5].map((n) => t.hue("#000000", n))).size, 6, "five languages and Other, six shades");
});
