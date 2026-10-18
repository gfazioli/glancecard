import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarStart, currentStreak, longestStreak, quartiles, repoModel, starHistory } from "../src/repo/model.js";
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

test("the star history is a running total that holds flat between starred days", () => {
  const weeks = [
    { week: "2026-01-04", days: [0, 2, 1, 0, 0, 0, 0] },
    { week: "2026-03-01", days: [0, 0, 5, 0, 0, 0, 0] },
    { week: "2026-03-08", days: [1, 0, 0, 0, 0, 0, 0] },
    { week: "2026-03-15", days: [0, 0, 0, 0, 4, 0, 0] },
  ];
  const s = starHistory(weeks, "2026-01-02", "2026-03-18");
  assert.deepEqual(s.points, [
    { day: "2026-01-02", total: 0 },
    { day: "2026-01-04", total: 0 },
    { day: "2026-01-05", total: 2 },
    { day: "2026-01-06", total: 3 },
    { day: "2026-03-02", total: 3 },
    { day: "2026-03-03", total: 8 },
    { day: "2026-03-07", total: 8 },
    { day: "2026-03-08", total: 9 },
    { day: "2026-03-18", total: 9 },
  ]);
  assert.equal(s.total, 9, "the stars after today are not counted");
  assert.equal(s.first, "2026-01-05");
  assert.deepEqual(s.best, { day: "2026-03-03", count: 5 });
  assert.equal(s.last30, 6);
  assert.equal(s.lastYear, 9);
});

test("a first star on or before the repository's day starts the line the day before it", () => {
  for (const start of ["2026-01-06", "2026-01-08"]) {
    const s = starHistory([{ week: "2026-01-04", days: [0, 0, 1, 0, 0, 0, 0] }], start, "2026-01-20");
    assert.deepEqual(s.points, [
      { day: "2026-01-05", total: 0 },
      { day: "2026-01-06", total: 1 },
      { day: "2026-01-20", total: 1 },
    ], start);
  }
});

test("the best week is the earliest of the busiest, named by its first starred day", () => {
  const s = starHistory(
    [
      { week: "2026-01-04", days: [0, 0, 0, 0, 2, 1, 0] },
      { week: "2026-02-01", days: [3, 0, 0, 0, 0, 0, 0] },
    ],
    "2026-01-01",
    "2026-03-01",
  );
  assert.deepEqual(s.best, { day: "2026-01-08", count: 3 });
});

test("no history is null, and a history without stars a total of 0", () => {
  assert.equal(starHistory(null, "2026-01-01", "2026-02-01"), null);
  const none = starHistory([], "2026-01-01", "2026-02-01");
  assert.equal(none.total, 0);
  assert.equal(none.best, null);
  assert.equal(none.first, null);
});

test("the repository model's star history ends at the stars the repository has", () => {
  for (const name of ["octoscope", "react-switch-button"]) {
    const m = repoModel(fixture(name), { timeZone: "Europe/Rome" });
    assert.equal(m.stars.total, m.repo.stargazerCount, name);
    assert.equal(m.stars.points.at(-1).day, m.today, name);
    assert.ok(m.stars.points.every((p, i, all) => i === 0 || (p.day >= all[i - 1].day && p.total >= all[i - 1].total)), name);
  }
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
