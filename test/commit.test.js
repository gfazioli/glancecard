import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { commit, kept } from "../src/action.js";

// The action's commit path against a real bare remote, with no git identity
// configured anywhere, as on a fresh runner.
const root = mkdtempSync(path.join(tmpdir(), "glancecard-"));
const remote = path.join(root, "remote.git");
const work = path.join(root, "work");
const other = path.join(root, "other");
const saved = {};
const ISOLATE = { GIT_CONFIG_GLOBAL: path.join(root, "empty.gitconfig"), GIT_CONFIG_NOSYSTEM: "1" };

const git = (cwd, ...args) => {
  const res = spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...ISOLATE, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
  assert.equal(res.status, 0, `git ${args.join(" ")}: ${res.stderr}`);
  return res.stdout.trim();
};

before(() => {
  writeFileSync(ISOLATE.GIT_CONFIG_GLOBAL, "");
  for (const [k, v] of Object.entries(ISOLATE)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  git(root, "init", "--quiet", "--bare", remote);
  git(root, "clone", "--quiet", remote, work);
  writeFileSync(path.join(work, "README.md"), "hi\n");
  git(work, "add", "README.md");
  git(work, "commit", "--quiet", "-m", "init");
  git(work, "push", "--quiet", "-u", "origin", "HEAD");
  git(root, "clone", "--quiet", remote, other);
});

after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(root, { recursive: true, force: true });
});

test("commits only the cards, as the bot, and pushes", () => {
  mkdirSync(path.join(work, "glancecard"));
  writeFileSync(path.join(work, "glancecard", "a-dark.svg"), "<svg/>");
  writeFileSync(path.join(work, "unrelated.txt"), "not mine");
  assert.equal(commit(work, ["glancecard/a-dark.svg"], "chore: refresh glancecard"), true);
  assert.equal(git(remote, "log", "-1", "--format=%an <%ae>|%s"), "github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>|chore: refresh glancecard");
  assert.equal(git(remote, "show", "--name-only", "--format=", "HEAD"), "glancecard/a-dark.svg");
  assert.match(git(work, "status", "--porcelain"), /\?\? unrelated\.txt/);
});

test("an unchanged card makes no commit", () => {
  const head = git(remote, "rev-parse", "HEAD");
  assert.equal(commit(work, ["glancecard/a-dark.svg"], "chore: refresh glancecard"), false);
  assert.equal(git(remote, "rev-parse", "HEAD"), head);
});

test("a push that lands first is rebased onto, not lost", () => {
  writeFileSync(path.join(other, "NOTES.md"), "someone else\n");
  git(other, "add", "NOTES.md");
  git(other, "commit", "--quiet", "-m", "meanwhile");
  git(other, "pull", "--quiet", "--rebase");
  git(other, "push", "--quiet");
  writeFileSync(path.join(work, "glancecard", "a-dark.svg"), "<svg>new</svg>");
  assert.equal(commit(work, ["glancecard/a-dark.svg"], "chore: refresh glancecard"), true);
  assert.deepEqual(git(remote, "log", "-2", "--format=%s").split("\n"), ["chore: refresh glancecard", "meanwhile"]);
});

test("the star histories are committed with the cards, unless git ignores them", () => {
  const stars = path.join(work, "glancecard", ".stars.json");
  writeFileSync(stars, "{}\n");
  // In the platform's separators, as the cards' own paths are.
  assert.deepEqual(kept(work, [stars]), [path.join("glancecard", ".stars.json")]);
  writeFileSync(path.join(work, ".gitignore"), "glancecard/.stars.json\n");
  assert.deepEqual(kept(work, [stars]), []);
});
