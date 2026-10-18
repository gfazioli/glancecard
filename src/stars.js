// GitHub's star history, for both cards: the weeks each repository was
// starred in, read newest first until they add up to its stars, and kept
// between runs in a file beside the cards, so a daily run asks for the newest
// page of each repository only.
//
// GitHub answers 30 weeks a page whatever `per_page` asks, empty ones
// included, back to the repository's creation, and counts only the stars
// still given. A week is named by its Sunday at 00:00 UTC, but its `days` are
// counted in Pacific time.

import { readFile, rename, writeFile } from "node:fs/promises";

const HOUR = 3600 * 1000;
const KEPT_DAYS = 30;

const sum = (weeks) => weeks.reduce((a, w) => a + w.days.reduce((x, n) => x + n, 0), 0);
const sunday = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);
const oldestFirst = (weeks) => [...weeks].sort((a, b) => (a.week < b.week ? -1 : 1));

/** One page of a repository's history: its starred weeks, the Sunday of its oldest week, and whether more follow. */
async function page(client, full, n) {
  const path = `/repos/${full}/stargazers/history${n > 1 ? `?page=${n}` : ""}`;
  const { data, link } = await client.rest(path);
  return {
    weeks: data.filter((w) => w.total > 0).map((w) => ({ week: sunday(w.week), days: w.days })),
    oldest: data.length ? sunday(Math.min(...data.map((w) => w.week))) : null,
    next: /rel="next"/.test(link),
  };
}

/**
 * The star histories of a run, read from `file` and written back to it by
 * `save`: one entry per repository, its starred weeks oldest first, the
 * stars they add up to, and when they were read. Without a file it only
 * fetches.
 */
export function starStore({ file = null, now = new Date() } = {}) {
  let entries = {};
  const at = new Date(now);

  return {
    async load() {
      if (!file) return;
      try {
        entries = JSON.parse(await readFile(file, "utf8")).repos ?? {};
      } catch {
        entries = {};
      }
    },

    /**
     * The repository's starred weeks, oldest first, for its `count` stars.
     * An entry read within the hour is used as it is; an older one is kept
     * for the weeks before the newest page, when with it they still add up
     * to `count`, or miss it by what they missed it by before (GitHub's
     * history can count a star or two fewer than the repository, for good);
     * anything else reads the pages again, newest first, until `count` stars
     * are found. A star given between the two counts can stop the reading
     * one page early, until the next run. Null where the endpoint does not
     * exist (an older GitHub Enterprise Server).
     */
    async history(client, full, count) {
      const cached = entries[full];
      if (cached && cached.count === count && at - Date.parse(cached.at) < HOUR) return cached.weeks;

      let first;
      try {
        first = await page(client, full, 1);
      } catch (error) {
        if (/: HTTP 404$/.test(error.message)) return null;
        throw error;
      }
      let weeks = null;
      if (!first.next) weeks = first.weeks;
      else if (cached) {
        const kept = [...cached.weeks.filter((w) => w.week < first.oldest), ...first.weeks];
        if (sum(kept) - count === sum(cached.weeks) - cached.count) weeks = kept;
      }
      if (!weeks) {
        weeks = [...first.weeks];
        let seen = sum(weeks);
        let more = first.next;
        for (let n = 2; more && seen < count; n++) {
          const next = await page(client, full, n);
          weeks.push(...next.weeks);
          seen += sum(next.weeks);
          more = next.next;
        }
      }
      weeks = oldestFirst(weeks);
      entries[full] = { at: at.toISOString(), count, weeks };
      return weeks;
    },

    /** Writes the file, one repository a line, without entries unread for 30 days; returns its path. */
    async save() {
      if (!file) return null;
      const lines = Object.keys(entries)
        .filter((full) => at - Date.parse(entries[full].at) < KEPT_DAYS * 24 * HOUR)
        .sort()
        .map((full) => `  ${JSON.stringify(full)}: ${JSON.stringify(entries[full])}`);
      const tmp = `${file}.tmp-${process.pid}`;
      await writeFile(tmp, `{\n "repos": {\n${lines.join(",\n")}\n }\n}\n`);
      await rename(tmp, file);
      return file;
    },
  };
}

/** A repository's starred weeks, oldest first, read without a store. */
export const fetchStars = (client, full, count = Infinity) => starStore().history(client, full, count);

/** Several histories as one, week by week; null when any is. */
export function mergeStars(histories) {
  if (histories.some((h) => h === null)) return null;
  const byWeek = new Map();
  for (const h of histories) {
    for (const { week, days } of h) {
      const total = byWeek.get(week) ?? [0, 0, 0, 0, 0, 0, 0];
      days.forEach((n, i) => (total[i] += n));
      byWeek.set(week, total);
    }
  }
  return oldestFirst([...byWeek].map(([week, days]) => ({ week, days })));
}
