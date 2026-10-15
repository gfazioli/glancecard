import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarStart, currentStreak, longestStreak, quartiles, repoModel } from "../src/repo/model.js";
import { profileModel } from "../src/profile/model.js";
import { fixture } from "./support/cases.js";

const days = (...list) => new Map(list.map((d) => [d, 1]));

test("the calendar starts on the Monday 52 weeks before this week's", () => {
  assert.equal(calendarStart("2026-10-14"), "2025-10-13");
  assert.equal(calendarStart("2026-10-12"), "2025-10-13");
});

test("the current streak survives a today without commits, not a yesterday", () => {
  const perDay = days("2026-10-11", "2026-10-12", "2026-10-13");
  assert.equal(currentStreak(perDay, "2026-10-13"), 3);
  assert.equal(currentStreak(perDay, "2026-10-14"), 3);
  assert.equal(currentStreak(perDay, "2026-10-15"), 0);
});

test("the longest streak is the longest run inside the range", () => {
  const perDay = days("2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07");
  assert.equal(longestStreak(perDay, "2025-12-01", "2026-02-01"), 3);
  assert.equal(longestStreak(new Map(), "2025-12-01", "2026-02-01"), 0);
});

test("quartiles of busy days set the shade steps", () => {
  assert.deepEqual(quartiles([]), [0, 0, 0]);
  assert.deepEqual(quartiles([1, 2, 3, 4, 5, 6, 7, 8]), [3, 5, 7]);
});

test("the repository model adds up", () => {
  const m = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  assert.equal(m.grid.length, 53);
  assert.ok(m.grid.every((week) => week.length === 7));
  assert.equal(m.weekly.length, 26);
  const inGrid = m.grid.flat().reduce((a, d) => a + (d?.count ?? 0), 0);
  assert.equal(inGrid, m.yearCommits, "every counted commit sits on the calendar");
  assert.equal(m.punch.flat().reduce((a, b) => a + b, 0), m.yearCommits, "and in the rhythm");
  assert.equal(m.weekly.reduce((a, b) => a + b, 0) <= m.yearCommits, true);
  assert.ok(m.last30 <= m.yearCommits);
  assert.equal(m.grid.flat().filter(Boolean).at(-1).day, m.today, "the calendar ends today");
  const share = m.languages.reduce((a, l) => a + l.share, 0);
  assert.ok(Math.abs(share - 1) < 1e-9, `language shares sum to ${share}`);
  assert.deepEqual(
    m.essentials.map((e) => e.ok),
    [true, true, true, true, true, true],
  );
  assert.equal(m.capped, false);
});

test("a dormant repository models as quiet, not as broken", () => {
  const m = repoModel(fixture("react-switch-button"), { timeZone: "Europe/Rome" });
  assert.equal(m.yearCommits, 0);
  assert.equal(m.streak, 0);
  assert.equal(m.last30, 0);
  assert.ok(m.idleDays > 180);
  assert.equal(m.downloads, 0);
  assert.ok(m.contributorCount > m.contributors.length);
});

test("the profile model ranks repositories and languages", () => {
  const m = profileModel(fixture("profile-gfazioli"), { timeZone: "Europe/Rome" });
  assert.equal(m.topRepos.length, 6);
  for (let i = 1; i < m.topRepos.length; i++) assert.ok(m.topRepos[i - 1].stargazerCount >= m.topRepos[i].stargazerCount);
  assert.equal(m.languages.reduce((a, l) => a + l.count, 0), fixture("profile-gfazioli").repos.filter((r) => r.primaryLanguage).length);
  assert.ok(m.languages.length <= 6);
});

test("a year of days adds up to the number over it", () => {
  const profile = profileModel(fixture("profile-gfazioli"), { timeZone: "Europe/Rome" });
  assert.equal(profile.days.reduce((a, d) => a + d.count, 0), profile.calendar.totalContributions);
  assert.ok(profile.days.every((d, i) => i === 0 || d.day > profile.days[i - 1].day), "oldest first");
  const repo = repoModel(fixture("octoscope"), { timeZone: "Europe/Rome" });
  assert.equal(repo.days.reduce((a, d) => a + d.count, 0), repo.yearCommits);
  assert.equal(repo.days.at(-1).day, repo.today);
});
