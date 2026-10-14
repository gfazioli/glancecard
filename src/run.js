// What the CLI and the Action share: reading options, rendering every card,
// writing the files.

import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadImages } from "./github.js";
import { fetchProfile } from "./profile/fetch.js";
import { profileModel } from "./profile/model.js";
import { renderProfile } from "./profile/render.js";
import { fetchRepo } from "./repo/fetch.js";
import { repoModel } from "./repo/model.js";
import { REPO_SECTIONS, renderRepo } from "./repo/render.js";
import { THEME_NAMES, THEMES } from "./theme.js";
import { clock } from "./time.js";

/** Items separated by commas, spaces or newlines. */
export const parseList = (value) =>
  String(value ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

export function parseThemes(value) {
  const v = String(value || "both").trim();
  if (v === "both") return [...THEME_NAMES];
  if (THEME_NAMES.includes(v)) return [v];
  throw new Error(`theme must be dark, light or both, not "${v}"`);
}

export function parseSections(value) {
  const list = parseList(value);
  if (!list.length || (list.length === 1 && list[0] === "all")) return [...REPO_SECTIONS];
  const unknown = list.filter((s) => !REPO_SECTIONS.includes(s));
  if (unknown.length) throw new Error(`unknown section ${unknown.join(", ")} (choose from ${REPO_SECTIONS.join(", ")})`);
  return list;
}

export function parseCount(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 100) throw new Error(`${name} must be a whole number of at least 100, not "${value}"`);
  return n;
}

/**
 * The file name of each repository's card: its name, or owner-name for every
 * repository whose name another one in the list shares.
 */
export function fileBases(repos) {
  const names = repos.map((full) => full.split("/")[1]);
  return new Map(repos.map((full, i) => [full, names.filter((n) => n === names[i]).length > 1 ? full.replace("/", "-") : names[i]]));
}

/** `base.svg` for one theme, `base-dark.svg` and `base-light.svg` for both. */
export const fileNames = (base, themes) => (themes.length > 1 ? themes.map((t) => [t, `${base}-${t}.svg`]) : [[themes[0], `${base}.svg`]]);

/**
 * Renders a card per repository, plus the profile card when `profile` is set.
 * A target that fails is reported in `failures` and the others still render.
 */
export async function renderCards({
  client,
  repos = [],
  profile = null,
  outDir = "glancecard",
  themes = [...THEME_NAMES],
  timeZone = "UTC",
  sections = REPO_SECTIONS,
  maxCommits = 5000,
  allowPrivate = false,
  now = new Date(),
  log = () => {},
}) {
  clock(timeZone); // an unknown zone fails here, before any request
  const files = [];
  const failures = [];
  await mkdir(outDir, { recursive: true });

  // Written beside the target and renamed over it, so a failure halfway never
  // leaves a truncated card behind.
  const write = async (name, svg) => {
    const file = path.join(outDir, name);
    const tmp = `${file}.tmp-${process.pid}`;
    await writeFile(tmp, svg);
    await rename(tmp, file);
    files.push(file);
  };

  const bases = fileBases(repos);
  for (const full of repos) {
    try {
      const data = await fetchRepo(client, full, { now, timeZone, maxCommits, allowPrivate });
      const model = repoModel(data, { now, timeZone });
      const images = await loadImages(client, model.contributors.map((c) => c.avatarUrl), 56);
      for (const [theme, name] of fileNames(bases.get(full), themes)) {
        await write(name, renderRepo(model, { theme: THEMES[theme], sections, images }));
      }
      log(`${full}: ${model.totalCommits} commits, ${model.yearCommits} in the last year, ${model.repo.stargazerCount} stars`);
    } catch (error) {
      failures.push({ target: full, error });
    }
  }

  if (profile) {
    try {
      const data = await fetchProfile(client, profile, { now });
      const model = profileModel(data, { now, timeZone });
      const images = await loadImages(client, [model.user.avatarUrl], 160);
      for (const [theme, name] of fileNames("profile", themes)) {
        await write(name, renderProfile(model, { theme: THEMES[theme], images }));
      }
      log(`@${profile}: ${model.calendar.totalContributions} contributions in the last year, ${model.stars} stars`);
    } catch (error) {
      failures.push({ target: `@${profile}`, error });
    }
  }
  return { files, failures };
}
