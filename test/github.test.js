import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createClient } from "../src/github.js";
import { fetchStars } from "../src/repo/fetch.js";

// A local stand-in for GitHub: each path answers the way a test needs.
let server;
let base;
const hits = {};
const handlers = {
  "/stall": () => {}, // never answers
  "/avatar": (req, res) => res.writeHead(200, { "content-type": "image/png" }).end(Buffer.from([1, 2, 3])),
  "/graphql": (req, res) => {
    hits.graphql = (hits.graphql ?? 0) + 1;
    if (hits.graphql === 1) return res.writeHead(502).end("bad gateway");
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data: { ok: true } }));
  },
  "/limited/graphql": (req, res) =>
    res.writeHead(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1800000000" }).end("{}"),
  "/stalled-api/graphql": () => {},
};

before(async () => {
  server = createServer((req, res) => (handlers[req.url.split("?")[0]] ?? ((q, r) => r.writeHead(404).end()))(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

const client = (apiUrl = base) => createClient({ token: "t", apiUrl, timeoutMs: 300, imageTimeoutMs: 300, retryDelayMs: 10 });

// A regression here would hang, so these tests fail on a deadline instead.
test("a stalled avatar falls back to no image instead of hanging", { timeout: 5000 }, async () => {
  const started = Date.now();
  assert.equal(await client().image(`${base}/stall`), null);
  assert.ok(Date.now() - started < 2000);
});

test("an avatar comes back as a data URI", async () => {
  assert.equal(await client().image(`${base}/avatar`), "data:image/png;base64,AQID");
});

test("a 5xx is retried", async () => {
  assert.deepEqual(await client().graphql("{ ok }"), { ok: true });
  assert.equal(hits.graphql, 2);
});

test("a spent rate limit says when it resets", async () => {
  await assert.rejects(client(`${base}/limited`).graphql("{ ok }"), /rate limit reached; it resets at 2027-01-15T08:00:00\.000Z/);
});

test("a stalled API fails after its retries instead of hanging", { timeout: 5000 }, async () => {
  const started = Date.now();
  await assert.rejects(client(`${base}/stalled-api`).graphql("{ ok }"), /did not answer within 0\.3 s/);
  assert.ok(Date.now() - started < 5000);
});

test("no token, no client", () => {
  assert.throws(() => createClient({}), /token is required/);
});

// A stand-in client for the star history: pages as GitHub answers them, 30
// weeks each, newest first, with the last page named in the Link header.
const starPages = (pages, fail) => ({
  calls: [],
  async rest(path) {
    this.calls.push(path);
    if (fail) throw new Error(`GET ${path}: HTTP ${fail}`);
    const page = Number(path.match(/[?&]page=(\d+)/)?.[1] ?? 1);
    const link = pages.length > 1 ? `<https://api.github.com/repositories/1/stargazers/history?page=${pages.length}>; rel="last"` : "";
    return { data: pages[page - 1], link };
  },
});

test("the star history reads every page, keeps the starred weeks and puts them oldest first", async () => {
  const sunday = (iso) => Date.parse(`${iso}T00:00:00Z`) / 1000;
  const client = starPages([
    [
      { week: sunday("2026-10-11"), total: 0, days: [0, 0, 0, 0, 0, 0, 0] },
      { week: sunday("2026-10-04"), total: 2, days: [0, 1, 0, 0, 1, 0, 0] },
    ],
    [{ week: sunday("2025-03-02"), total: 1, days: [0, 0, 0, 1, 0, 0, 0] }],
  ]);
  assert.deepEqual(await fetchStars(client, "o/r"), [
    { week: "2025-03-02", days: [0, 0, 0, 1, 0, 0, 0] },
    { week: "2026-10-04", days: [0, 1, 0, 0, 1, 0, 0] },
  ]);
  assert.deepEqual(client.calls, ["/repos/o/r/stargazers/history", "/repos/o/r/stargazers/history?page=2"]);
});

test("a GitHub without the star history gives none, and any other failure fails the card", async () => {
  assert.equal(await fetchStars(starPages([], 404), "o/r"), null);
  await assert.rejects(fetchStars(starPages([], 500), "o/r"), /HTTP 500/);
});
