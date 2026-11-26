import assert from "node:assert/strict";
import { test } from "node:test";
import { profileModel } from "../src/profile/model.js";
import { renderProfile } from "../src/profile/render.js";
import { repoModel } from "../src/repo/model.js";
import { renderRepo } from "../src/repo/render.js";
import { contrast, display, inSeason, lightOf, LOOK_NAMES, over, resolveLook, theme, THEME_NAMES } from "../src/theme.js";
import { kit } from "../src/svg.js";
import { textWidth, wrap } from "../src/text.js";
import { fixture } from "./support/cases.js";

const at = (iso) => ({ now: new Date(iso), timeZone: "Europe/Rome" });

const LIGHT_SIDES = ["aurora-light", "upside-down-light", "hyperspace-light", "bridge-light", "nebula-light", "halloween-light", "christmas-light"];
const TUBES = ["phosphor-green", "phosphor-amber", "phosphor-white", "phosphor-color"];
const PRINTOUTS = ["printout-green", "printout-yellow", "printout-white", "printout-color"];

test("the nine looks, dark and light as Midnight and Daylight, every other dark look's light side, the terminal's eight and the Workbench", () => {
  assert.deepEqual(LOOK_NAMES, ["midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas", ...LIGHT_SIDES, ...TUBES, ...PRINTOUTS, "workbench"]);
  assert.deepEqual(
    LOOK_NAMES.filter((l) => !theme(l).isDark),
    ["daylight", ...LIGHT_SIDES, ...PRINTOUTS],
  );
  // A tube is the same on a light page: its own light side.
  for (const tube of TUBES) assert.equal(lightOf(tube), tube);
  for (const paper of PRINTOUTS) assert.equal(lightOf(paper), paper);
  // So is a Workbench screen.
  assert.equal(lightOf("workbench"), "workbench");
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
      // As struck: 89% of the ink laid on the paper.
      const struck = (c) => `#${[1, 3, 5].map((i) => Math.round(parseInt(g.slice(i, i + 2), 16) + (parseInt(c.slice(i, i + 2), 16) - parseInt(g.slice(i, i + 2), 16)) * 0.89).toString(16).padStart(2, "0")).join("")}`;
      for (const [role, colour] of Object.entries(t.accent)) assert.ok(contrast(struck(colour), g) >= 4.5, `${role} ${colour} struck on ${g} at ${contrast(struck(colour), g).toFixed(2)}:1`);
    }
    for (const level of t.levels.slice(1)) assert.ok(contrast(level, t.levels[0]) >= 1.05, `level ${level}`);
    // Every label, the faintest too, laid over the paper and over a bar,
    // where the struck dots leave 89% of the ink.
    const laid = (rgba, under) => {
      const [r, gr, b, a0] = rgba.match(/[\d.]+/g).map(Number);
      const a = a0 * 0.89;
      const u = [1, 3, 5].map((i) => parseInt(under.slice(i, i + 2), 16));
      return `#${u.map((v, i) => Math.round(v + ([r, gr, b][i] - v) * a).toString(16).padStart(2, "0")).join("")}`;
    };
    for (const [role, ink] of Object.entries(t.text).filter(([, c]) => c.startsWith("rgba"))) {
      for (const g of [t.canvas[1], ...(t.paper.bar ? [t.paper.bar] : [])]) assert.ok(contrast(laid(ink, g), g) >= 4.5, `${role} on ${g}`);
    }
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
  // A symbol the monospaced font lacks falls back to an emoji a full em wide.
  assert.equal(textWidth("\u2705", 10, 400, true), textWidth("\u4e00", 10, 400, true));
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
  assert.match(renderProfile(m, { theme: theme("workbench"), images }), /<g filter="url\(#photo\)"><clipPath id="avatar">/);
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
  const dots = new Map([...svg.matchAll(/<circle cx="\d+" cy="[\d.]+" r="4.5" fill="(#[0-9A-Fa-f]{6})"\/>\s*<text[^>]*class="row">([^<]+)</g)].map(([, fill, name]) => [name, fill]));
  const tsRepos = m.topRepos.filter((r) => r.primaryLanguage?.name === "TypeScript").map((r) => r.name);
  assert.ok(tsRepos.length > 1, "the fixture has TypeScript repositories");
  for (const name of tsRepos) assert.equal(dots.get(name), shadeTS, name);
  assert.equal(new Set([0, 1, 2, 3, 4, 5].map((n) => t.hue("#000000", n))).size, 6, "five languages and Other, six shades");
});

test("a long profile name stays clear of the date, and a long word of the next line", () => {
  const data = fixture("profile-gfazioli");
  const long = { ...data, user: { ...data.user, name: "International Institute for Applied Systems Analysis", login: "iiasa" } };
  const svg = renderProfile(profileModel(long, { timeZone: "Europe/Rome" }), { theme: theme("phosphor-green") });
  assert.match(svg, /<tspan class="name disp" style="fill: #8CFFAA; font-size: \d+(\.5)?px">/);
  const words = ["https://example.com/docs/initialization-integration-installation/cli", "tools"];
  const [first] = wrap(words.join(" "), 300, 15, 700, 2, true);
  assert.ok(textWidth(first, 15, 700, true) <= 300, first);
});

test("a terminal's panel captions and the repository's subtitle keep to their room", () => {
  const data = fixture("octoscope");
  const branch = "release/stable-linux-and-macos-and-windows-builds-from-the-long-lived-branch-that-nobody-renamed-yet";
  const long = { ...data, repo: { ...data.repo, defaultBranchRef: { ...data.repo.defaultBranchRef, name: branch } } };
  const svg = renderRepo(repoModel(long, { timeZone: "Europe/Rome" }), { theme: theme("phosphor-green") });
  const caption = svg.match(/>LATEST COMMITS<\/text>\s*<text x="(\d+)"[^>]*class="caption"[^>]*>([^<]*)</);
  assert.ok(caption, "the Latest commits caption is drawn");
  assert.match(caption[2], /…$/, "a caption too long for its room is clipped");
  const sub = svg.match(/class="h-sub">([^<]*)</)[1];
  assert.match(sub, /…$/);
  assert.ok(textWidth(sub, 12.5, 400, true) <= 880 - 48, sub);
});

test("a terminal's long URL pill keeps to its column, and a five-digit count to its star", () => {
  const data = fixture("octoscope");
  const nameWithOwner = `an-organization-with-a-long-name/${"initialization-integration-installation-".repeat(2)}cli`;
  const repo = renderRepo(repoModel({ ...data, repo: { ...data.repo, nameWithOwner } }, { timeZone: "Europe/Rome" }), { theme: theme("phosphor-green") });
  // The GitHub link's pill, in the hero's left column (the sparkline starts at x=560).
  const link = repo.match(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="22"[^>]*\/>\s*<g transform="[^"]*"[^>]*>(?:<path[^>]*\/>)+<\/g>\s*<text[^>]*>github\.com\//);
  assert.ok(link, "the GitHub link's pill is drawn");
  assert.ok(Number(link[1]) + Number(link[2]) <= 560, `the link's pill ends at ${Number(link[1]) + Number(link[2])}`);
  const p = fixture("profile-gfazioli");
  const m = profileModel(p, { timeZone: "Europe/Rome" });
  m.topRepos[0] = { ...m.topRepos[0], stargazerCount: 11111 };
  const svg = renderProfile(m, { theme: theme("phosphor-green") });
  const row = svg.match(/<g transform="translate\(([\d.]+) [\d.]+\) scale\(0\.8125\)" fill="#33FF66">[\s\S]*?<text x="(\d+)"[^>]*class="count" text-anchor="end">11,111</);
  assert.ok(row, "the star and its count are drawn");
  assert.ok(Number(row[1]) + 13 <= Number(row[2]) - textWidth("11,111", 12, 700, true), `star at ${row[1]}`);
});

test("a tube moves for under five seconds, once, and a ribbon's pale language reads on its paper", () => {
  const svg = renderProfile(profileOf(), { theme: theme("phosphor-amber") });
  assert.match(svg, /\.roll \{ animation: roll 4\.5s linear 1; \}/);
  assert.match(svg, /\.cursor \{ animation: blink 1\.06s steps\(1\) 4; \}/);
  assert.doesNotMatch(svg, /infinite/);
  const t = theme("printout-color");
  for (const g of [t.canvas[1], t.paper.bar]) assert.ok(contrast(t.hue("#f1e05a", 1), g) >= 3.4, `JavaScript's yellow on ${g}`);
  assert.equal(theme("midnight").hue("#f1e05a", 1), "#f1e05a", "a classic look keeps GitHub's colour");
});

test("a terminal's hero wraps rather than drop a badge or a link, and its faintest mark still reads", () => {
  const m = repoOf();
  m.latestTag = "v1.2.3-beta.1+build.123456";
  m.repo = { ...m.repo, homepageUrl: "https://gfazioli.github.io/octoscope/guide" };
  const midnight = renderRepo(m, { theme: theme("midnight") });
  const tube = renderRepo(m, { theme: theme("phosphor-green") });
  for (const text of [m.latestTag, "gfazioli.github.io/octoscope/guide"]) {
    assert.ok(midnight.includes(`class="pill">${text}<`), `Midnight's hero shows ${text}`);
    assert.ok(tube.includes(`class="pill">${text}<`), `Phosphor's hero shows ${text}`);
  }
  for (const look of [...TUBES, ...PRINTOUTS]) {
    const t = theme(look);
    if (!t.monochrome) continue;
    const grounds = [t.canvas[1], ...(t.paper?.bar ? [t.paper.bar] : [])];
    for (const g of grounds) assert.ok(contrast(t.hue("#000000", 5), g) >= 3, `${look}'s Other on ${g}`);
  }
});

test("every look's stylesheet is plain CSS: no markup an XML parser would read as a tag", () => {
  for (const look of LOOK_NAMES) {
    for (const svg of [renderProfile(profileOf(), { theme: theme(look) }), renderRepo(repoOf(), { theme: theme(look) })]) {
      const css = svg.match(/<style>([\s\S]*?)<\/style>/)[1];
      assert.doesNotMatch(css, /[<>&]/, look);
    }
  }
});

// ─── The Workbench ───

test("the Workbench reads on its blue, and its title bars on their orange", () => {
  const t = theme("workbench");
  const { blue, white, black, orange } = t.bench;
  assert.equal(t.canvas[1], blue);
  assert.ok(t.mono, "every letter monospaced");
  for (const [role, ink] of Object.entries(t.text)) {
    const c = ink.startsWith("rgba") ? over(ink, blue) : ink;
    assert.ok(contrast(c, blue) >= 4.5, `${role} at ${contrast(c, blue).toFixed(2)}:1`);
  }
  // Icons, lines and the chart's marks: 3:1 on the blue.
  for (const [role, colour] of Object.entries(t.accent)) assert.ok(contrast(colour, blue) >= 3, `${role} ${colour}`);
  // A window's title and caption are black on its orange bar.
  assert.ok(contrast(black, orange) >= 4.5);
  assert.ok(contrast(white, blue) >= 7);
  // The languages: six, each its own, every one but black a mark at 3:1 (black is the frames' colour).
  const hues = [0, 1, 2, 3, 4, 5].map((n) => t.hue("#3178c6", n));
  assert.equal(new Set(hues).size, 6);
  for (const h of hues.filter((h) => h !== black)) assert.ok(contrast(h, blue) >= 3, `language ${h}`);
  for (const level of t.levels.slice(1)) assert.ok(contrast(level, t.levels[0]) >= 1.05, `level ${level}`);
});

test("a Workbench screen draws its bar, its windows and its copper bars, and holds still", () => {
  const repo = renderRepo(repoOf(), { theme: theme("workbench") });
  // The screen bar, white, with the program's title in the screen's blue.
  assert.match(repo, /<rect width="880" height="22" fill="#FFFFFF"\/>/);
  assert.match(repo, /\.prompt \{ font-size: 12\.5px; fill: #0055AA; \}/);
  assert.match(repo, /class="prompt">glancecard repo gfazioli\/octoscope<\/text>/);
  // Every panel a window: its shadow, its orange title bar, the title in black between the close gadget and the drag bar.
  assert.match(repo, /\.bar \{ fill: #000022; \}/);
  const titles = [...repo.matchAll(/class="title disp bar">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(titles, ["Activity", "Stars", "Rhythm", "Code", "Latest commits", "Releases", "Contributors"]);
  assert.equal([...repo.matchAll(/height="23" fill="#FF8800"\/>/g)].length, titles.length, "a title bar for every window");
  for (const gadget of ["close", "depth"]) {
    assert.equal([...repo.matchAll(new RegExp(`<use href="#gadget-${gadget}" `, "g"))].length, titles.length, `a ${gadget} gadget on every title bar`);
    assert.match(repo, new RegExp(`<g id="gadget-${gadget}"`), `the ${gadget} gadget is drawn once`);
  }
  assert.match(repo, />Latest commits<\/text>\s*<path class="lo" d="(M[\d.]+ \d+H[\d.]+){4}"\/>/, "the drag bar's four pinstripes");
  assert.match(repo, /class="caption bar" text-anchor="end">633 commits on main</);
  // Raised tiles and pills, no gradient behind them, nothing that moves.
  assert.doesNotMatch(repo, /url\(#tile-\d+\)|<linearGradient id="tile-/);
  assert.match(repo, /<linearGradient id="copper-3"/);
  assert.doesNotMatch(repo, /animation|filter="url\(#bloom\)"/);
  assert.doesNotMatch(repo, /class="panel"/, "a window draws its own body");
  // A missing essential is pressed in: black on top, white under.
  const m = repoOf();
  m.essentials = m.essentials.map((e) => (e.label === "Contributing" ? { ...e, ok: false } : e));
  assert.match(renderRepo(m, { theme: theme("workbench") }), /<path class="lo" d="[^"]*"\/><path class="hi" d="[^"]*"\/>\s*<g transform="[^"]*"[^>]*>(<path[^>]*\/>)+<\/g>\s*<text[^>]*class="pill-off">Contributing</);
  assert.match(repo, /<path class="hi" d="[^"]*"\/><path class="lo" d="[^"]*"\/>\s*<g transform="[^"]*"[^>]*>(<path[^>]*\/>)+<\/g>\s*<text[^>]*class="pill">README</, "a present one is raised");
});

test("a window's long caption keeps to its title bar, and leaves the drag bar its stripes", () => {
  const data = fixture("octoscope");
  const branch = "release/stable-linux-and-macos-and-windows-builds-from-the-long-lived-branch";
  const long = { ...data, repo: { ...data.repo, defaultBranchRef: { ...data.repo.defaultBranchRef, name: branch } } };
  const svg = renderRepo(repoModel(long, { timeZone: "Europe/Rome" }), { theme: theme("workbench") });
  const bar = svg.match(/>Latest commits<\/text>\s*<path class="lo" d="M([\d.]+) \d+H([\d.]+)[^"]*"\/>\s*<text x="(\d+)"[^>]*class="caption bar"[^>]*>([^<]*)</);
  assert.ok(bar, "the Latest commits bar is drawn");
  const [, x0, x1, capX, caption] = bar;
  assert.match(caption, /…$/, "the caption is clipped");
  assert.ok(Number(x1) - Number(x0) >= 24, `the drag bar keeps ${Number(x1) - Number(x0)} px`);
  assert.ok(Number(x1) + 8 <= Number(capX) - textWidth(caption, 12, 600, true) + 0.5, "the stripes end before the caption");
});
