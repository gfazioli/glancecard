// From fetched data to what the profile card draws. Pure.

import { starHistory } from "../repo/model.js";
import { clock } from "../time.js";

export function profileModel(data, { now = new Date(data.fetchedAt), timeZone = "UTC" } = {}) {
  const { user, counts, repos } = data;
  const byLanguage = new Map();
  for (const r of repos) {
    if (!r.primaryLanguage) continue;
    const l = byLanguage.get(r.primaryLanguage.name) ?? { ...r.primaryLanguage, count: 0 };
    l.count += 1;
    byLanguage.set(l.name, l);
  }
  const ranked = [...byLanguage.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const languages = ranked.slice(0, 5).map((l) => ({ ...l, color: l.color ?? "#6e7681" }));
  const rest = ranked.slice(5).reduce((s, l) => s + l.count, 0);
  if (rest > 0) languages.push({ name: "Other", color: "#6e7681", count: rest });

  const joined = new Date(user.createdAt);
  const today = clock(timeZone).day(now);
  return {
    user,
    counts,
    today,
    repoCount: repos.length,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    forks: repos.reduce((s, r) => s + r.forkCount, 0),
    topRepos: [...repos].sort((a, b) => b.stargazerCount - a.stargazerCount || a.name.localeCompare(b.name)).slice(0, 6),
    languages,
    years: Math.floor((new Date(now) - joined) / (365.25 * 24 * 3600 * 1000)),
    joinedYear: joined.getUTCFullYear(),
    calendar: user.contributionsCollection.contributionCalendar,
    days: user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays.map((d) => ({ day: d.date, count: d.contributionCount }))),
    commits: user.contributionsCollection.totalCommitContributions,
    contributedRepos: user.contributionsCollection.totalRepositoriesWithContributedCommits,
    starHistory: starHistory(data.stars, null, today),
  };
}
