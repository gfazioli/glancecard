import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fetchStars, mergeStars, starStore } from "../src/stars.js";

const sunday = (iso) => Date.parse(`${iso}T00:00:00Z`) / 1000;
const week = (iso, total, days = [total, 0, 0, 0, 0, 0, 0]) => ({ week: sunday(iso), total, days });
const empty = (iso) => week(iso, 0);

// A stand-in client for the star history: `pages` as GitHub answers them,
// newest first, a Link to the next page on all but the last.
const client = (pages, fail) => ({
  calls: [],
  async rest(url) {
    this.calls.push(url);
    if (fail) throw new Error(`GET ${url}: HTTP ${fail}`);
    const n = Number(url.match(/[?&]page=(\d+)/)?.[1] ?? 1);
    const link = n < pages.length ? `<https://api.github.com/repositories/1/stargazers/history?page=${n + 1}>; rel="next"` : "";
    return { data: pages[n - 1] ?? [], link };
  },
});

const PAGES = [
  [empty("2026-10-11"), week("2026-10-04", 2, [0, 1, 0, 0, 1, 0, 0])],
  [empty("2026-03-08"), week("2026-03-01", 3)],
  [week("2025-08-03", 1), empty("2025-07-27")],
];

test("the history keeps the starred weeks, oldest first, and stops once they add up to the stars", async () => {
  const c = client(PAGES);
  assert.deepEqual(await fetchStars(c, "o/r", 5), [
    { week: "2026-03-01", days: [3, 0, 0, 0, 0, 0, 0] },
    { week: "2026-10-04", days: [0, 1, 0, 0, 1, 0, 0] },
  ]);
  assert.deepEqual(c.calls, ["/repos/o/r/stargazers/history", "/repos/o/r/stargazers/history?page=2"]);
  const all = client(PAGES);
  assert.equal((await fetchStars(all, "o/r", 6)).length, 3);
  assert.equal(all.calls.length, 3, "a count it never reaches reads every page");
});

test("a GitHub without the star history gives none, and any other failure fails the card", async () => {
  assert.equal(await fetchStars(client([], 404), "o/r", 1), null);
  await assert.rejects(fetchStars(client([], 500), "o/r", 1), /HTTP 500/);
});

const dir = mkdtempSync(path.join(tmpdir(), "glancecard-stars-"));
after(() => rmSync(dir, { recursive: true, force: true }));

test("a stored history read within the hour costs no request", async () => {
  const file = path.join(dir, "fresh.json");
  const first = starStore({ file, now: new Date("2026-10-18T05:30:00Z") });
  await first.history(client(PAGES), "o/r", 6);
  await first.save();
  const again = starStore({ file, now: new Date("2026-10-18T05:50:00Z") });
  await again.load();
  const c = client(PAGES);
  assert.equal((await again.history(c, "o/r", 6)).length, 3);
  assert.equal(c.calls.length, 0);
});

test("a day later the newest page is read, and the stored weeks before it kept while they add up", async () => {
  const file = path.join(dir, "daily.json");
  const yesterday = starStore({ file, now: new Date("2026-10-17T05:30:00Z") });
  await yesterday.history(client(PAGES), "o/r", 6);
  await yesterday.save();

  // A new star this week: the newest page says so, and the rest still adds up.
  const today = [[week("2026-10-11", 1, [0, 1, 0, 0, 0, 0, 0]), week("2026-10-04", 2, [0, 1, 0, 0, 1, 0, 0])], ...PAGES.slice(1)];
  const store = starStore({ file, now: new Date("2026-10-18T05:30:00Z") });
  await store.load();
  const c = client(today);
  const weeks = await store.history(c, "o/r", 7);
  assert.equal(c.calls.length, 1);
  assert.deepEqual(weeks.map((w) => w.week), ["2025-08-03", "2026-03-01", "2026-10-04", "2026-10-11"]);

  // A star taken back from an old week: the sums disagree, so it all is read again.
  const unstarred = [today[0], [empty("2026-03-08"), week("2026-03-01", 2)], PAGES[2]];
  const later = starStore({ file, now: new Date("2026-10-19T05:30:00Z") });
  await later.load();
  const c2 = client(unstarred);
  const reread = await later.history(c2, "o/r", 6);
  assert.equal(c2.calls.length, 3);
  assert.deepEqual(reread.find((w) => w.week === "2026-03-01").days, [2, 0, 0, 0, 0, 0, 0]);
});

test("a history GitHub counts short of the repository's stars is kept while it stays as short", async () => {
  const file = path.join(dir, "short.json");
  // Six stars in the history, seven on the repository.
  const yesterday = starStore({ file, now: new Date("2026-10-17T05:30:00Z") });
  await yesterday.history(client(PAGES), "o/r", 7);
  await yesterday.save();
  const store = starStore({ file, now: new Date("2026-10-18T05:30:00Z") });
  await store.load();
  const c = client(PAGES);
  assert.equal((await store.history(c, "o/r", 7)).length, 3);
  assert.equal(c.calls.length, 1);
});

test("the store is one repository a line, forgets what no run read for 30 days, and survives a broken file", async () => {
  const file = path.join(dir, "lines.json");
  const old = starStore({ file, now: new Date("2026-09-01T00:00:00Z") });
  await old.history(client([[week("2026-08-30", 1)]]), "o/gone", 1);
  await old.save();
  const store = starStore({ file, now: new Date("2026-10-18T00:00:00Z") });
  await store.load();
  await store.history(client([[week("2026-10-11", 1)]]), "o/b", 1);
  await store.history(client([[week("2026-10-11", 2)]]), "o/a", 2);
  await store.save();
  const lines = readFileSync(file, "utf8").split("\n");
  assert.deepEqual(lines.filter((l) => l.startsWith('  "')).map((l) => l.slice(3, 6)), ["o/a", "o/b"]);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(file, "utf8")).repos), ["o/a", "o/b"]);

  writeFileSync(file, "{ not json");
  const broken = starStore({ file });
  await broken.load();
  const c = client([[week("2026-10-11", 1)]]);
  assert.equal((await broken.history(c, "o/a", 1)).length, 1);
  assert.equal(c.calls.length, 1);
});

test("histories merge week by week, and any missing one makes the whole missing", () => {
  const a = [{ week: "2026-01-04", days: [1, 0, 0, 0, 0, 0, 0] }];
  const b = [
    { week: "2025-12-28", days: [0, 2, 0, 0, 0, 0, 0] },
    { week: "2026-01-04", days: [0, 0, 3, 0, 0, 0, 0] },
  ];
  assert.deepEqual(mergeStars([a, b]), [
    { week: "2025-12-28", days: [0, 2, 0, 0, 0, 0, 0] },
    { week: "2026-01-04", days: [1, 0, 3, 0, 0, 0, 0] },
  ]);
  assert.deepEqual(mergeStars([]), []);
  assert.equal(mergeStars([a, null]), null);
});
