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
import { starStore } from "./stars.js";
import { CALENDARS } from "./svg.js";
import { resolveLook, theme as lookTheme, THEME_NAMES } from "./theme.js";
import { clock } from "./time.js";

/** The file in the cards' folder the star histories are kept in. */
export const STARS_FILE = ".stars.json";

/** Items separated by commas, spaces or newlines. */
export const parseList = (value) =>
  String(value ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

/** Theme names: `both` is `dark` and `light`; any look by its name. */
export function parseThemes(value) {
  const names = parseList(String(value || "both").toLowerCase()).flatMap((v) => (v === "both" ? ["dark", "light"] : [v]));
  const unknown = names.filter((n) => !THEME_NAMES.includes(n));
  if (unknown.length) throw new Error(`unknown theme ${unknown.join(", ")} (choose from both, ${THEME_NAMES.join(", ")})`);
  return [...new Set(names)];
}

export function parseSections(value) {
  const list = parseList(value);
  if (!list.length || (list.length === 1 && list[0] === "all")) return [...REPO_SECTIONS];
  const unknown = list.filter((s) => !REPO_SECTIONS.includes(s));
  if (unknown.length) throw new Error(`unknown section ${unknown.join(", ")} (choose from ${REPO_SECTIONS.join(", ")})`);
  return list;
}

/** How a year of days is drawn: `chart` unless told `grid`. */
export function parseCalendar(value) {
  const v = String(value || "chart").trim().toLowerCase();
  if (!CALENDARS.includes(v)) throw new Error(`unknown calendar ${v} (choose from ${CALENDARS.join(", ")})`);
  return v;
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
 * `state` lists the files kept for the next run (the star histories), to be
 * committed with the cards.
 */
export async function renderCards({
  client,
  repos = [],
  profile = null,
  outDir = "glancecard",
  themes = ["dark", "light"],
  timeZone = "UTC",
  sections = REPO_SECTIONS,
  calendar = "chart",
  maxCommits = 5000,
  allowPrivate = false,
  allSeasons = false,
  now = new Date(),
  log = () => {},
}) {
  clock(timeZone); // an unknown zone fails here, before any request
  calendar = parseCalendar(calendar); // and so does an unknown calendar

  // The look each theme name wears today: a seasonal one out of its season
  // is Midnight, and the log says so.
  const looks = new Map(
    themes.map((name) => {
      const look = resolveLook(name, { now, timeZone, allSeasons });
      const base = { dark: "midnight", light: "daylight" }[name] ?? name;
      if (look !== base) log(`${name} is out of season: wearing ${look}`);
      return [name, lookTheme(look)];
    }),
  );
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

  // The star histories, kept beside the cards between runs: a daily run asks
  // for the newest page of each repository only.
  const stars = sections.includes("stars") && starStore({ file: path.join(outDir, STARS_FILE), now });
  if (stars) await stars.load();

  const bases = fileBases(repos);
  for (const full of repos) {
    try {
      const data = await fetchRepo(client, full, { now, timeZone, maxCommits, allowPrivate, stars });
      const model = repoModel(data, { now, timeZone });
      const images = await loadImages(client, model.contributors.map((c) => c.avatarUrl), 56);
      for (const [theme, name] of fileNames(bases.get(full), themes)) {
        await write(name, renderRepo(model, { theme: looks.get(theme), sections, calendar, images }));
      }
      log(`${full}: ${model.totalCommits} commits, ${model.yearCommits} in the last year, ${model.repo.stargazerCount} stars`);
    } catch (error) {
      failures.push({ target: full, error });
    }
  }

  if (profile) {
    try {
      const data = await fetchProfile(client, profile, { now, stars });
      const model = profileModel(data, { now, timeZone });
      const images = await loadImages(client, [model.user.avatarUrl], 160);
      for (const [theme, name] of fileNames("profile", themes)) {
        await write(name, renderProfile(model, { theme: looks.get(theme), calendar, images, stars: Boolean(stars) }));
      }
      log(`@${profile}: ${model.calendar.totalContributions} contributions in the last year, ${model.stars} stars`);
    } catch (error) {
      failures.push({ target: `@${profile}`, error });
    }
  }
  const state = stars ? [await stars.save()] : [];
  return { files, failures, state };
}
