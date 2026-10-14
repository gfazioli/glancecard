// From fetched data to what the repository card draws. Pure: the same data,
// `now` and time zone always give the same model.

import { addDays, cadence, clock, daysBetween, DAYS, weekday } from "../time.js";

/** The Monday 52 weeks before the week of `today`: the calendar's first day. */
export const calendarStart = (today) => addDays(addDays(today, -weekday(today)), -52 * 7);

const ESSENTIALS = [
  ["README", (p) => /^(\.github\/|docs\/)?readme(\.|$)/i.test(p)],
  ["License", (p, r) => /^(licen[cs]e|copying)(\.|$)/i.test(p) || Boolean(r.licenseInfo)],
  [".gitignore", (p) => p === ".gitignore"],
  ["Contributing", (p) => /^(\.github\/|docs\/)?contributing(\.|$)/i.test(p)],
  ["Security policy", (p, r) => /^(\.github\/|docs\/)?security(\.|$)/i.test(p) || r.isSecurityPolicyEnabled],
  ["CI", (p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)],
];

/** Days in a row with a commit, ending today or, if today has none yet, yesterday. */
export function currentStreak(perDay, today) {
  let streak = 0;
  for (let d = perDay.get(today) ? today : addDays(today, -1); perDay.get(d); d = addDays(d, -1)) streak += 1;
  return streak;
}

export function longestStreak(perDay, from, to) {
  let longest = 0;
  let run = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    run = perDay.get(d) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

/** The 25th, 50th and 75th percentile of the busy days' counts: the calendar's shade steps. */
export function quartiles(counts) {
  const sorted = [...counts].sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  return [q(0.25), q(0.5), q(0.75)];
}

export function repoModel(data, { now = new Date(data.fetchedAt), timeZone = "UTC" } = {}) {
  const clk = clock(timeZone);
  const { repo, history, releases, contributors, tree } = data;
  const today = clk.day(now);
  const firstWeek = calendarStart(today);

  const perDay = new Map();
  const punch = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const iso of history.dates) {
    const day = clk.day(iso);
    if (day < firstWeek || day > today) continue;
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    punch[weekday(day)][clk.hour(iso)] += 1;
  }

  const grid = [];
  for (let wi = 0; wi < 53; wi++) {
    grid.push(
      Array.from({ length: 7 }, (_, di) => {
        const day = addDays(firstWeek, wi * 7 + di);
        return day > today ? null : { day, count: perDay.get(day) ?? 0 };
      }),
    );
  }

  const dayTotals = punch.map((row) => row.reduce((a, b) => a + b, 0));
  const hourTotals = punch[0].map((_, hr) => punch.reduce((a, row) => a + row[hr], 0));
  const yearCommits = dayTotals.reduce((a, b) => a + b, 0);

  const total = repo.languages.totalSize || 1;
  const langs = repo.languages.edges.map((e) => ({ name: e.node.name, color: e.node.color ?? "#6e7681", share: e.size / total }));
  const languages = langs.slice(0, 5);
  const rest = langs.slice(5).reduce((a, l) => a + l.share, 0);
  if (rest > 0) languages.push({ name: "Other", color: "#6e7681", share: rest });

  const latest = repo.defaultBranchRef.target.history;

  return {
    repo,
    today,
    now: new Date(now).toISOString(),
    idleDays: daysBetween(clk.day(repo.pushedAt), today),
    latestTag: repo.tags.nodes[0]?.name ?? null,
    grid,
    quartiles: quartiles([...perDay.values()]),
    yearCommits,
    capped: history.capped,
    streak: currentStreak(perDay, today),
    longest: longestStreak(perDay, firstWeek, today),
    activeDays: perDay.size,
    punch,
    busiestDay: DAYS[dayTotals.indexOf(Math.max(...dayTotals))],
    peakHour: hourTotals.indexOf(Math.max(...hourTotals)),
    weekly: grid.slice(-26).map((week) => week.reduce((a, d) => a + (d?.count ?? 0), 0)),
    last30: [...perDay].filter(([d]) => daysBetween(d, today) < 30).reduce((a, [, n]) => a + n, 0),
    languages,
    files: tree.files,
    essentials: ESSENTIALS.map(([label, test]) => ({ label, ok: tree.paths.some((p) => test(p, repo)) })),
    commits: latest.nodes.map((c) => ({ ...c, day: clk.day(c.authoredDate) })),
    totalCommits: latest.totalCount,
    releases: repo.releases.nodes.map((r) => ({ ...r, day: clk.day(r.publishedAt) })),
    releaseCount: repo.releases.totalCount,
    cadence: cadence(releases.map((r) => r.publishedAt).filter(Boolean)),
    downloads: releases.reduce((a, r) => a + r.downloads, 0),
    contributors: contributors.list,
    contributorCount: contributors.total,
    bots: contributors.bots,
  };
}
