import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { build, resolveRequest } from "../scripts/site.js";
import { springsCSS } from "../scripts/springs.js";

// The website in site/, held to what a crawler and a phone need, and to the
// motion rules of the sibling sites.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const BASE = "https://gfazioli.github.io/glancecard/";
const PAGES = { "index.html": BASE, "legal.html": `${BASE}legal.html`, "privacy.html": `${BASE}privacy.html` };
const index = read("site/index.html");
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

for (const [file, url] of Object.entries(PAGES)) {
  test(`${file}: what a crawler reads`, () => {
    const page = read(`site/${file}`);
    assert.equal(page.match(/<main\b/g)?.length, 1, "one <main>");
    assert.equal(page.match(/<h1\b/g)?.length, 1, "one <h1>");
    const title = page.match(/<title>([^<]*)<\/title>/)[1];
    assert.ok(title.length >= 10 && title.length <= 60, `title of ${title.length} characters`);
    const description = page.match(/<meta name="description" content="([^"]*)"/)[1];
    assert.ok(description.length >= 50 && description.length <= 160, `description of ${description.length} characters`);
    assert.equal(page.match(/<link rel="canonical" href="([^"]*)"/)[1], url, "the canonical names the page itself");
    assert.equal(page.match(/<meta property="og:url" content="([^"]*)"/)[1], url, "so does og:url");
    assert.match(page.match(/<meta property="og:image" content="([^"]*)"/)[1], /^https:\/\//);
    assert.match(page, /<html lang="en">/);
  });
}

test("the sitemap lists every page, and robots.txt points at it", () => {
  const sitemap = read("site/sitemap.xml");
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(listed.sort(), Object.values(PAGES).sort());
  assert.match(read("site/robots.txt"), new RegExp(`Sitemap: ${BASE}sitemap.xml`));
});

test("the structured data parses", () => {
  const data = JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data["@type"], "SoftwareApplication");
  assert.equal(data.url, BASE);
});

test("nothing is loaded from another site", () => {
  for (const file of Object.keys(PAGES)) {
    const page = read(`site/${file}`);
    assert.doesNotMatch(page, /<(script|link|img)[^>]+(src|href)="(https?:)?\/\/(?!gfazioli\.github\.io)[^"]*"[^>]*>/i, `${file} loads something from elsewhere`);
    assert.doesNotMatch(page, /fonts\.(googleapis|gstatic)\.com/);
  }
  assert.doesNotMatch(index, /<link rel="stylesheet"/, "the stylesheet is inline");
});

test("every image says how big it is, so the page never jumps", () => {
  for (const img of index.match(/<img\b[^>]*>/g)) {
    assert.match(img, /\bwidth="\d+"/, img);
    assert.match(img, /\bheight="\d+"/, img);
    assert.match(img, /\balt="[^"]+"/, img);
  }
});

test("the springs are the generated ones", () => {
  const begin = "/* springs:begin */\n";
  const block = index.slice(index.indexOf(begin) + begin.length, index.indexOf("        /* springs:end */"));
  assert.equal(block, `${springsCSS("        ")}\n`, `paste this between the markers:\n${springsCSS("        ")}`);
});

test("every pose that hides or moves an item waits for data-armed", () => {
  const style = index.match(/<style>([\s\S]*?)<\/style>/)[1];
  const motion = style.slice(style.indexOf("prefers-reduced-motion: no-preference")).replace(/\/\*[\s\S]*?\*\//g, "");
  let poses = 0;
  for (const [, selector, body] of motion.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.includes("[data-reveal")) continue;
    if (!/(^|\s)(opacity: 0|translate:|scale:)/m.test(body)) continue;
    poses += 1;
    for (const part of selector.split(",")) assert.match(part, /\[data-armed\]/, `"${part.trim()}" hides an item without data-armed`);
  }
  assert.ok(poses >= 4, `found ${poses} poses`);
  assert.doesNotMatch(motion, /filter:\s*blur/, "a blur is not composited");
  assert.doesNotMatch(index, /<[^>]+\sdata-(armed|revealed)\b/, "a reveal state in the served markup");
});

test("the one-paste prompt is the README's, word for word", () => {
  const readme = read("README.md").split("## Set it up in one paste")[1].match(/```text\n([\s\S]*?)\n```/)[1];
  const site = index.match(/<!-- prompt:begin -->([\s\S]*?)<!-- prompt:end -->/)[1];
  assert.equal(unescape(site), readme);
});

test("the editor's workflow and embed are the README's, word for word", () => {
  const byHand = read("README.md").split("## Set it up by hand")[1].split("## Staying up to date")[0];
  const workflow = index.match(/<!-- workflow:begin -->([\s\S]*?)<!-- workflow:end -->/)[1];
  const embed = index.match(/<!-- embed:begin -->([\s\S]*?)<!-- embed:end -->/)[1];
  assert.equal(unescape(workflow), byHand.match(/```yaml\n([\s\S]*?)\n```/)[1]);
  assert.equal(unescape(embed), byHand.match(/```html\n([\s\S]*?)\n```/)[1]);
});

test("the editor is shown by its script, and only by it", () => {
  const panel = index.match(/<div class="editor"[^>]*>/)[0];
  assert.match(panel, /\bhidden\b/, "without JavaScript the page reads as before");
  assert.match(index, /<script type="module" src="editor.js"><\/script>[\s\S]*<script src="site.js" defer>/, "editor.js runs before site.js arms the reveals");
});

test("the editor's choices are radio groups, each with one choice made", async () => {
  const { LOOK_NAMES, theme } = await import("../src/theme.js");
  const values = (name) => [...index.matchAll(new RegExp(`<input type="radio" name="${name}" value="([a-z-]+)"`, "g"))].map((m) => m[1]);
  const checked = (name) => [...index.matchAll(new RegExp(`<input type="radio" name="${name}" value="([a-z-]+)" checked`, "g"))].map((m) => m[1]);
  assert.deepEqual(values("editor-mode"), ["follow", "one"]);
  assert.deepEqual(values("editor-dark"), LOOK_NAMES.filter((l) => theme(l).isDark));
  assert.deepEqual(values("editor-look").sort(), [...LOOK_NAMES].sort(), "every look, in a dark row and a light row");
  assert.deepEqual(values("editor-light"), ["own", "daylight"]);
  assert.deepEqual(values("editor-calendar"), ["chart", "grid"]);
  assert.deepEqual(values("editor-stars"), ["steps", "smooth", "bars"]);
  assert.deepEqual(values("editor-often"), ["day", "week"]);
  assert.deepEqual(values("preview-card"), ["profile", "repo"]);
  assert.deepEqual(values("preview-side"), ["dark", "light"]);
  for (const [name, choice] of [["editor-mode", "follow"], ["editor-dark", "midnight"], ["editor-light", "own"], ["editor-look", "midnight"], ["editor-calendar", "chart"], ["editor-stars", "steps"], ["editor-often", "day"], ["preview-card", "profile"], ["preview-side", "dark"]]) {
    assert.deepEqual(checked(name), [choice], `${name} starts on ${choice}`);
  }
  assert.match(index, /<fieldset data-editor-when="one" hidden>/, "the one-look group waits for its mode");
});

test("a light look's chip wears the swatch the editor gives it", async () => {
  const { LIGHT_SWATCHES } = await import("../site/editor.js");
  for (const [look, swatch] of Object.entries(LIGHT_SWATCHES)) {
    const chip = index.match(new RegExp(`name="editor-look" value="${look}"[^>]*/><span class="chip"><i style="background: ([^"]+)"></i>`));
    assert.equal(chip?.[1], swatch, look);
  }
});

test("the sections are checkboxes, every one of the action's, all checked", async () => {
  const { REPO_SECTIONS } = await import("../src/repo/render.js");
  const boxes = [...index.matchAll(/<input type="checkbox" name="editor-sections" value="([a-z]+)"( checked)? \/>/g)];
  assert.deepEqual(
    boxes.map((m) => m[1]),
    REPO_SECTIONS,
  );
  assert.ok(boxes.every((m) => m[2]), "the default is all of them");
});

test("the footer carries the publisher line and its two pages", () => {
  assert.match(index, /P\.IVA&nbsp;12343751009/);
  assert.match(index, /<a href="legal\.html">Legal<\/a>/);
  assert.match(index, /<a href="privacy\.html">Privacy<\/a>/);
});

// The build, from the fixtures: every card the page shows exists, and each
// image carries its card's own size.
const out = mkdtempSync(path.join(tmpdir(), "glancecard-site-"));
after(() => rmSync(out, { recursive: true, force: true }));

test("the build makes every card the page shows, at its real size", async () => {
  const { cards } = await build(out, { fixtures: true });
  assert.equal(cards.length, 33);
  const built = readFileSync(path.join(out, "index.html"), "utf8");
  for (const [, tag, name] of built.matchAll(/(<img\b[^>]*\bdata-card="([^"]+)"[^>]*>)/g)) {
    const svg = readFileSync(path.join(out, "cards", `${name}.svg`), "utf8");
    const [, w, h] = svg.match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
    assert.match(tag, new RegExp(`width="${w}" height="${h}"`), name);
  }
  for (const file of ["og.png", "apple-touch-icon.png", "favicon.svg", "site.js", "editor.js", "legal.html", "privacy.html"]) {
    assert.ok(readFileSync(path.join(out, file)).length > 0, file);
  }
});

test("the built page names each script by its content, so a deploy never pairs a new page with an old script", () => {
  const built = readFileSync(path.join(out, "index.html"), "utf8");
  const srcs = [...built.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    srcs.map((s) => s.replace(/\?v=[0-9a-f]{10}$/, "")),
    ["editor.js", "site.js"],
  );
  for (const src of srcs) {
    const [file, hash] = src.split("?v=");
    assert.equal(hash, createHash("sha256").update(readFileSync(path.join(out, file))).digest("hex").slice(0, 10), file);
  }
  assert.match(built, /<script type="application\/ld\+json">/, "inline scripts keep no src");
});

test("the editor's card is glancecard's own renderer: the same data draws the same card, byte for byte", async () => {
  const { profileModel } = await import("../src/profile/model.js");
  const { renderProfile } = await import("../src/profile/render.js");
  const { repoModel } = await import("../src/repo/model.js");
  const { renderRepo } = await import("../src/repo/render.js");
  const { theme } = await import("../src/theme.js");
  const { fixture } = await import("./support/cases.js");
  const preview = readFileSync(path.join(out, "preview.js"), "utf8");
  assert.doesNotMatch(preview, /^import\b/m, "one module, importing nothing");
  const m = await import(pathToFileURL(path.join(out, "preview.js")).href);
  const tz = m.DATA.timeZone;
  const profile = [m.profileModel(m.DATA.profile, { timeZone: tz }), profileModel(fixture("profile-gfazioli"), { timeZone: tz })];
  const repo = [m.repoModel(m.DATA.repo, { timeZone: tz }), repoModel(fixture("octoscope"), { timeZone: tz })];
  for (const [look, calendar, starsChart] of [["midnight", "chart", "steps"], ["nebula", "grid", "bars"], ["daylight", "chart", "smooth"]]) {
    const o = (t) => ({ theme: t(look), calendar, starsChart, images: {} });
    assert.equal(m.renderProfile(profile[0], o(m.theme)), renderProfile(profile[1], o(theme)), `profile ${look} ${calendar} ${starsChart}`);
    assert.equal(m.renderRepo(repo[0], o(m.theme)), renderRepo(repo[1], o(theme)), `repository ${look} ${calendar} ${starsChart}`);
  }
  // The card the page starts on is the default choice, drawn from the same data.
  assert.equal(readFileSync(path.join(out, "cards", "profile-midnight.svg"), "utf8"), m.renderProfile(profile[0], { theme: m.theme("midnight"), images: m.DATA.images }));
  const editor = readFileSync(path.join(out, "editor.js"), "utf8");
  const [, hash] = editor.match(/const PREVIEW = "\.\/preview\.js\?v=([0-9a-f]{10})";/);
  assert.equal(hash, createHash("sha256").update(preview).digest("hex").slice(0, 10), "editor.js names preview.js by its content");
});

test("the preview server serves nothing outside the build", () => {
  const base = path.resolve("/srv/_site");
  assert.equal(resolveRequest(base, "/index.html"), path.join(base, "index.html"));
  assert.equal(resolveRequest(base, "/cards/profile-midnight.svg"), path.join(base, "cards", "profile-midnight.svg"));
  // The URL parser resolves /../ and even /%2e%2e/ before anything sees
  // them. An encoded slash it leaves alone, and decoding it afterwards is the
  // way out: into a sibling whose name starts with the base's.
  assert.equal(resolveRequest(base, "/../etc/passwd"), path.join(base, "etc", "passwd"));
  assert.equal(resolveRequest(base, "/%2e%2e/%2e%2e/etc/passwd"), path.join(base, "etc", "passwd"));
  for (const url of ["/%2e%2e%2f_site-other/secret.txt", "/%2e%2e%2f%2e%2e%2fetc/passwd", "/%E0%A4%A"]) {
    assert.equal(resolveRequest(base, url), null, url);
  }
});
