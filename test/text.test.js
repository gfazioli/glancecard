import assert from "node:assert/strict";
import { test } from "node:test";
import { compact, esc, excerpt, fit, plural, size, textWidth, wrap } from "../src/text.js";

test("esc escapes the XML specials", () => {
  assert.equal(esc(`a & b < c > d "e"`), "a &amp; b &lt; c &gt; d &quot;e&quot;");
  assert.equal(esc(null), "");
});

test("compact, size and plural format numbers the way the tiles show them", () => {
  assert.deepEqual([compact(999), compact(1000), compact(1250), compact(123456)], ["999", "1k", "1.3k", "123k"]);
  assert.deepEqual(size(512), ["512", "KB"]);
  assert.deepEqual(size(57757), ["56.4", "MB"]);
  assert.deepEqual(size(3 * 1024 * 1024), ["3.0", "GB"]);
  assert.equal(plural(1, "day"), "1 day");
  assert.equal(plural(1200, "commit"), "1,200 commits");
});

test("fit leaves text that fits alone and clips the rest within the width", () => {
  assert.equal(fit("short", 200, 13, 600), "short");
  const long = "chore(release): refresh landing hero screenshot for v0.39.0";
  for (const max of [60, 120, 240]) {
    const out = fit(long, max, 13, 600);
    assert.ok(out.endsWith("…"), out);
    assert.ok(textWidth(out, 13, 600) <= max, `${out} is wider than ${max}`);
  }
});

test("fit never ends inside a surrogate pair", () => {
  const s = "feat: 🎉 party 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀";
  for (let max = 30; max < 220; max++) {
    assert.doesNotMatch(fit(s, max, 13, 600), /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  }
});

test("wrap breaks at words, keeps to the line count and clips the last line", () => {
  const lines = wrap("Terminal dashboard for GitHub — followers, stars, PRs and issues at a glance, auto-refreshed", 300, 15, 700, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => textWidth(l, 15, 700) <= 300));
  assert.ok(lines[1].endsWith("…"));
  assert.deepEqual(wrap("one two", 300, 15, 700, 2), ["one two"]);
});

test("excerpt takes the first prose line of a release note, Markdown removed", () => {
  assert.equal(excerpt("## What's new\n\n**It opens fast.** See [the docs](https://x.y)."), "It opens fast. See the docs.");
  assert.equal(excerpt("- `--scan` runs everywhere"), "--scan runs everywhere");
  assert.equal(excerpt(""), "");
});
