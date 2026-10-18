#!/usr/bin/env node
// Builds the website from site/ and serves it locally.
//
//   node scripts/site.js build [out]              # live data: GITHUB_TOKEN, GH_TOKEN or gh
//   node scripts/site.js build [out] --fixtures   # the test fixtures, offline and repeatable
//   node scripts/site.js serve [out] [--port 4173]
//
// The build copies site/ and renders the cards: the author's profile card in
// every look, its year as a chart and as a grid (the README's Looks table
// shows them from here), and glancecard's own repository card. Each
// <img data-card="…"> on the page then gets its card's real width and height,
// so the page reserves the right room before the image arrives. It also
// writes preview.js, the editor's card: glancecard's renderer and the data
// it draws, the author's profile and octoscope's repository, in one module.
// `out` defaults to _site. A live build keeps the star histories it read in
// .stars.json (the Pages workflow caches it between builds), so a rebuild
// reads the newest weeks only.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createClient, loadImages } from "../src/github.js";
import { fetchProfile } from "../src/profile/fetch.js";
import { profileModel } from "../src/profile/model.js";
import { renderProfile } from "../src/profile/render.js";
import { fetchRepo } from "../src/repo/fetch.js";
import { repoModel } from "../src/repo/model.js";
import { renderRepo } from "../src/repo/render.js";
import { starStore } from "../src/stars.js";
import { LOOK_NAMES, theme } from "../src/theme.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGIN = "gfazioli";
const REPO = "gfazioli/glancecard";
// The repository the editor's card shows: one with a story of stars to draw.
const SHOWCASE = "gfazioli/octoscope";
const TZ = "Europe/Rome";

const fixture = (name) => JSON.parse(readFileSync(path.join(ROOT, "test/fixtures", `${name}.json`), "utf8"));

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/**
 * What the site draws from: the author's profile, glancecard's repository,
 * octoscope's for the editor's card, and their avatars as data URIs; or the
 * test fixtures, without avatars.
 */
export async function loadSiteData({ fixtures = false, now = new Date() } = {}) {
  if (fixtures) return { profileData: fixture("profile-gfazioli"), repoData: fixture("glancecard"), showcaseData: fixture("octoscope"), images: {} };
  const client = createClient({ token: token(), userAgent: "glancecard-site" });
  const stars = starStore({ file: path.join(ROOT, ".stars.json"), now });
  await stars.load();
  // The profile first: it reads every repository's stars, the cards after it find them kept.
  const profileData = await fetchProfile(client, LOGIN, { now, stars });
  const [repoData, showcaseData] = await Promise.all([
    fetchRepo(client, REPO, { now, timeZone: TZ, stars }),
    fetchRepo(client, SHOWCASE, { now, timeZone: TZ, stars }),
  ]);
  await stars.save();
  const images = {
    ...(await loadImages(client, [profileData.user.avatarUrl], 160)),
    ...(await loadImages(client, [...repoData.contributors.list, ...showcaseData.contributors.list].map((c) => c.avatarUrl), 56)),
  };
  return { profileData, repoData, showcaseData, images };
}

/** The cards the build writes, by the name an <img data-card> carries. */
export function renderSiteCards({ profileData, repoData, images }) {
  const profile = profileModel(profileData, { timeZone: TZ });
  const repo = repoModel(repoData, { timeZone: TZ });
  const cards = {};
  // Every look, the seasonal ones included whatever the month: the README
  // shows each from here, its year as a chart and as a grid.
  for (const look of LOOK_NAMES) {
    cards[`profile-${look}`] = renderProfile(profile, { theme: theme(look), images });
    cards[`profile-${look}-grid`] = renderProfile(profile, { theme: theme(look), images, calendar: "grid" });
  }
  cards["repo-midnight"] = renderRepo(repo, { theme: theme("midnight"), images });
  return cards;
}

/** The renderer's modules, each after the ones it imports. */
export const PREVIEW_MODULES = [
  "src/time.js",
  "src/text.js",
  "src/theme.js",
  "src/icons.js",
  "src/decor.js",
  "src/svg.js",
  "src/repo/model.js",
  "src/profile/model.js",
  "src/profile/render.js",
  "src/repo/render.js",
];

/**
 * preview.js: the renderer's modules as one, each in its own scope, its
 * imports read from the ones before it, and the data the editor's card is
 * drawn from. The modules import one way (`import { a, b as c } from
 * "./x.js";`, on a line) and export one way (`export function` or `export
 * const`, at the start of a line): anything else stops the build, rather
 * than ship a card that draws wrong.
 */
export function previewModule({ profileData, showcaseData, images }) {
  const parts = ["// Written by scripts/site.js: glancecard's renderer and the data the editor's card is drawn from.", "const modules = {};"];
  for (const file of PREVIEW_MODULES) {
    const names = [];
    const body = readFileSync(path.join(ROOT, file), "utf8")
      .split("\n")
      .map((line) => {
        const from = line.match(/^import \{([^}]+)\} from "([^"]+)";$/);
        if (from) {
          const target = path.posix.join(path.posix.dirname(file), from[2]);
          if (!PREVIEW_MODULES.slice(0, PREVIEW_MODULES.indexOf(file)).includes(target)) throw new Error(`${file} imports ${target}, which the preview does not have before it`);
          return `const {${from[1].replace(/\s+as\s+/g, ": ")}} = modules[${JSON.stringify(target)}];`;
        }
        const exported = line.match(/^export (?:async function|function|const) (\w+)/);
        if (exported) {
          names.push(exported[1]);
          return line.slice("export ".length);
        }
        if (/^(import|export)\b/.test(line)) throw new Error(`${file}: the preview cannot bundle "${line}"`);
        return line;
      })
      .join("\n");
    parts.push(`modules[${JSON.stringify(file)}] = (() => {\n${body}\nreturn { ${names.join(", ")} };\n})();`);
  }
  parts.push(
    'export const { profileModel } = modules["src/profile/model.js"];',
    'export const { renderProfile } = modules["src/profile/render.js"];',
    'export const { repoModel } = modules["src/repo/model.js"];',
    'export const { renderRepo } = modules["src/repo/render.js"];',
    'export const { theme, LOOK_NAMES } = modules["src/theme.js"];',
    `export const DATA = ${JSON.stringify({ timeZone: TZ, profile: profileData, repo: showcaseData, images })};`,
  );
  return `${parts.join("\n")}\n`;
}

/** The page with every data-card image's width and height set from its card. */
export function sizeImages(html, cards) {
  return html.replace(/<img\b[^>]*\bdata-card="([^"]+)"[^>]*>/g, (tag, name) => {
    const svg = cards[name];
    if (!svg) throw new Error(`the page shows a card the build does not make: ${name}`);
    const [, w, h] = svg.match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
    return tag.replace(/\bwidth="\d+"/, `width="${w}"`).replace(/\bheight="\d+"/, `height="${h}"`);
  });
}

/**
 * The page's own scripts, named with a hash of what they hold. Pages serves
 * every file with max-age=600, and a reload fetches the page again but reuses
 * a script still fresh in the cache: after a deploy that changes both, the
 * new page ran with the old editor.js for up to ten minutes, and its new
 * controls did nothing.
 */
export function versionScripts(html, dir) {
  return html.replace(/(<script\b[^>]*\bsrc=")([\w-]+\.js)(")/g, (_, before, file, after) => {
    const hash = createHash("sha256").update(readFileSync(path.join(dir, file))).digest("hex").slice(0, 10);
    return `${before}${file}?v=${hash}${after}`;
  });
}

/** editor.js with its import of preview.js named by preview.js's content, for the same reason. */
export function versionPreview(editor, dir) {
  const hash = createHash("sha256").update(readFileSync(path.join(dir, "preview.js"))).digest("hex").slice(0, 10);
  const from = 'const PREVIEW = "./preview.js";';
  if (editor.split(from).length !== 2) throw new Error("editor.js names preview.js other than once");
  return editor.replace(from, `const PREVIEW = "./preview.js?v=${hash}";`);
}

export async function build(out, options = {}) {
  const target = path.resolve(out);
  if (target === ROOT || target === path.parse(target).root) throw new Error(`refusing to build into ${target}`);
  rmSync(target, { recursive: true, force: true });
  cpSync(path.join(ROOT, "site"), target, { recursive: true });
  const data = await loadSiteData(options);
  const cards = renderSiteCards(data);
  mkdirSync(path.join(target, "cards"), { recursive: true });
  for (const [name, svg] of Object.entries(cards)) writeFileSync(path.join(target, "cards", `${name}.svg`), svg);
  writeFileSync(path.join(target, "preview.js"), previewModule(data));
  const editor = path.join(target, "editor.js");
  writeFileSync(editor, versionPreview(readFileSync(editor, "utf8"), target));
  const index = path.join(target, "index.html");
  writeFileSync(index, versionScripts(sizeImages(readFileSync(index, "utf8"), cards), target));
  return { target, cards: Object.keys(cards) };
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * The file a request names inside `base`, or null when it lands outside:
 * compared as a relative path, since a sibling folder whose name starts with
 * the base's (`_site-other`) passes a prefix check.
 */
export function resolveRequest(base, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, "http://x").pathname);
  } catch {
    return null;
  }
  const file = path.join(base, pathname);
  const rel = path.relative(base, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return file;
}

/** A static server for the built site, gzipping text the way Pages does. */
function serve(dir, port) {
  const base = path.resolve(dir);
  createServer((req, res) => {
    let file = resolveRequest(base, req.url);
    if (!file) return res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) return res.writeHead(404).end("not found");
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    let body = readFileSync(file);
    const headers = { "Content-Type": type, "Cache-Control": "max-age=600" };
    if (!type.startsWith("image/png") && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      body = gzipSync(body);
      headers["Content-Encoding"] = "gzip";
    }
    res.writeHead(200, headers).end(body);
  }).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command = "build", ...rest] = process.argv.slice(2);
  const out = rest.find((a) => !a.startsWith("--")) ?? "_site";
  if (command === "build") {
    const { target, cards } = await build(out, { fixtures: rest.includes("--fixtures") });
    console.log(`${target}: ${cards.length} cards`);
  } else if (command === "serve") {
    const i = rest.indexOf("--port");
    serve(out, i >= 0 ? Number(rest[i + 1]) : 4173);
  } else {
    console.error("usage: site.js build|serve [out] [--fixtures] [--port n]");
    process.exit(1);
  }
}
