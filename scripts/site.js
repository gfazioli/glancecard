#!/usr/bin/env node
// Builds the website from site/ and serves it locally.
//
//   node scripts/site.js build [out]              # live data: GITHUB_TOKEN, GH_TOKEN or gh
//   node scripts/site.js build [out] --fixtures   # the test fixtures, offline and repeatable
//   node scripts/site.js serve [out] [--port 4173]
//
// The build copies site/ and renders the cards the page shows: the author's
// profile card in every look, its year as a chart and as a grid, and
// glancecard's own repository card. Each
// <img data-card="…"> then gets its card's real width and height, so the page
// reserves the right room before the image arrives. `out` defaults to _site.

import { execFileSync } from "node:child_process";
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
import { LOOK_NAMES, theme } from "../src/theme.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGIN = "gfazioli";
const REPO = "gfazioli/glancecard";
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

/** The cards the page shows, by the name its <img data-card> carries. */
export async function renderSiteCards({ fixtures = false, now = new Date() } = {}) {
  let profileData;
  let repoData;
  let images = {};
  if (fixtures) {
    profileData = fixture("profile-gfazioli");
    repoData = fixture("glancecard");
  } else {
    const client = createClient({ token: token(), userAgent: "glancecard-site" });
    [profileData, repoData] = await Promise.all([fetchProfile(client, LOGIN, { now }), fetchRepo(client, REPO, { now, timeZone: TZ })]);
    images = {
      ...(await loadImages(client, [profileData.user.avatarUrl], 160)),
      ...(await loadImages(client, repoData.contributors.list.map((c) => c.avatarUrl), 56)),
    };
  }
  const profile = profileModel(profileData, { timeZone: TZ });
  const repo = repoModel(repoData, { timeZone: TZ });
  const cards = {};
  // Every look, the seasonal ones included whatever the month: the page
  // shows what each looks like, its year as a chart and as a grid.
  for (const look of LOOK_NAMES) {
    cards[`profile-${look}`] = renderProfile(profile, { theme: theme(look), images });
    cards[`profile-${look}-grid`] = renderProfile(profile, { theme: theme(look), images, calendar: "grid" });
  }
  cards["repo-midnight"] = renderRepo(repo, { theme: theme("midnight"), images });
  return cards;
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

export async function build(out, options = {}) {
  const target = path.resolve(out);
  if (target === ROOT || target === path.parse(target).root) throw new Error(`refusing to build into ${target}`);
  rmSync(target, { recursive: true, force: true });
  cpSync(path.join(ROOT, "site"), target, { recursive: true });
  const cards = await renderSiteCards(options);
  mkdirSync(path.join(target, "cards"), { recursive: true });
  for (const [name, svg] of Object.entries(cards)) writeFileSync(path.join(target, "cards", `${name}.svg`), svg);
  const index = path.join(target, "index.html");
  writeFileSync(index, sizeImages(readFileSync(index, "utf8"), cards));
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
