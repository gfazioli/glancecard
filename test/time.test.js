import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, age, ago, cadence, clock, daysBetween, formatDay, weekday } from "../src/time.js";

test("clock reads the day and hour in the time zone it is given", () => {
  const rome = clock("Europe/Rome");
  assert.equal(rome.day("2026-10-13T23:30:00Z"), "2026-10-14");
  assert.equal(rome.hour("2026-10-13T23:30:00Z"), 1);
  const utc = clock("UTC");
  assert.equal(utc.day("2026-10-13T23:30:00Z"), "2026-10-13");
  assert.equal(utc.hour("2026-10-13T00:05:00Z"), 0);
});

test("clock refuses a zone that does not exist", () => {
  assert.throws(() => clock("Mars/Olympus"), /Unknown time zone/);
});

test("day arithmetic", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(daysBetween("2026-10-01", "2026-10-14"), 13);
  assert.equal(weekday("2026-10-12"), 0); // a Monday
  assert.equal(weekday("2026-10-18"), 6); // a Sunday
  assert.equal(formatDay("2026-10-14"), "Oct 14, 2026");
});

test("ago counts whole local days", () => {
  const today = "2026-10-14";
  const cases = [
    ["2026-10-14", "today"],
    ["2026-10-13", "yesterday"],
    ["2026-10-09", "5 days ago"],
    ["2026-10-04", "last week"],
    ["2026-09-23", "3 weeks ago"],
    ["2026-08-20", "last month"],
    ["2026-04-01", "6 months ago"],
    ["2025-09-01", "last year"],
    ["2017-01-01", "9 years ago"],
  ];
  for (const [day, want] of cases) assert.equal(ago(day, today), want, day);
});

test("age is in months, then years", () => {
  assert.equal(age("2026-10-01T00:00:00Z", "2026-10-14T00:00:00Z"), "new");
  assert.equal(age("2026-04-21T00:00:00Z", "2026-10-14T00:00:00Z"), "5 months");
  assert.equal(age("2015-02-01T00:00:00Z", "2026-10-14T00:00:00Z"), "11 years");
});

test("cadence averages the gaps between the last ten releases", () => {
  const every = (days, n) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 9, 14) - i * days * 86400000).toISOString());
  assert.equal(cadence([]), null);
  assert.equal(cadence(every(1, 1)), null);
  assert.equal(cadence(every(1, 5)), "One a day");
  assert.equal(cadence(every(3, 12)), "One every 3 days");
  assert.equal(cadence(every(7, 4)), "One a week");
  assert.equal(cadence(every(21, 4)), "One every 3 weeks");
  assert.equal(cadence(every(60, 4)), "One every 2 months");
});
