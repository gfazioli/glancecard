// glancecard as a GitHub Action: inputs come from INPUT_* variables, the cards
// are written into the checked-out repository and, unless told otherwise,
// committed and pushed back. No @actions/* packages: the runner's protocol is
// a handful of environment variables and files.

import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "./github.js";
import { parseCalendar, parseCount, parseList, parseSections, parseStarsChart, parseThemes, renderCards } from "./run.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const BOT = ["github-actions[bot]", "41898282+github-actions[bot]@users.noreply.github.com"];

export const input = (name, env = process.env) => (env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? "").trim();

export function parseBool(value, name) {
  const v = String(value).toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  throw new Error(`${name} must be true or false, not "${value}"`);
}

// Workflow commands carry their message on one line.
const escapeData = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delimiter = `glancecard_${Date.now()}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

// The bot's identity for every git call, the rebase included: a runner has
// no git identity of its own, and a rebase writes commits too.
const IDENTITY = { GIT_AUTHOR_NAME: BOT[0], GIT_AUTHOR_EMAIL: BOT[1], GIT_COMMITTER_NAME: BOT[0], GIT_COMMITTER_EMAIL: BOT[1] };

function git(workspace, args) {
  const res = spawnSync("git", args, { cwd: workspace, encoding: "utf8", env: { ...process.env, ...IDENTITY } });
  if (res.error) throw res.error;
  return res;
}

function mustGit(workspace, args) {
  const res = git(workspace, args);
  if (res.status !== 0) throw new Error(`git ${args[0]} failed: ${(res.stderr || res.stdout).trim()}`);
  return res.stdout;
}

/** The `state` files (absolute) to commit, relative to `workspace`: those git does not ignore. */
export function kept(workspace, state) {
  return state.map((f) => path.relative(workspace, f)).filter((f) => git(workspace, ["check-ignore", "-q", "--", f]).status !== 0);
}

/** Commits `files` (paths relative to `workspace`) and pushes; false when nothing changed. */
export function commit(workspace, files, message) {
  if (git(workspace, ["rev-parse", "--is-inside-work-tree"]).status !== 0) {
    throw new Error("the workspace is not a git checkout: add actions/checkout before glancecard, or set commit: false");
  }
  mustGit(workspace, ["add", "--", ...files]);
  if (git(workspace, ["diff", "--cached", "--quiet"]).status === 0) return false;
  mustGit(workspace, ["commit", "-m", message]);
  // Another push may have landed while the cards rendered: rebase once on it.
  if (git(workspace, ["push"]).status !== 0) {
    mustGit(workspace, ["pull", "--rebase"]);
    mustGit(workspace, ["push"]);
  }
  return true;
}

async function main() {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const outDir = path.resolve(workspace, input("out-dir") || "glancecard");
  const repos = parseList(input("repos"));
  const profile = input("profile") || null;
  if (!repos.length && !profile) throw new Error("set repos, profile, or both");

  const { files, failures, state } = await renderCards({
    client: createClient({ token: input("token"), userAgent: `glancecard/${version}` }),
    repos,
    profile,
    outDir,
    themes: parseThemes(input("theme")),
    timeZone: input("time-zone") || "UTC",
    sections: parseSections(input("sections")),
    calendar: parseCalendar(input("calendar")),
    starsChart: parseStarsChart(input("stars-chart")),
    maxCommits: parseCount(input("max-commits"), "max-commits", 5000),
    allowPrivate: parseBool(input("allow-private") || "false", "allow-private"),
    log: (line) => console.log(line),
  });

  const relative = files.map((f) => path.relative(workspace, f));
  for (const f of relative) console.log(`  ${f}`);
  setOutput("files", relative.join("\n"));

  let committed = false;
  const event = process.env.GITHUB_EVENT_NAME ?? "";
  if (parseBool(input("commit") || "true", "commit") && relative.length) {
    if (event.startsWith("pull_request")) console.log("::notice title=glancecard::Not committing on a pull request; the cards are only rendered.");
    else committed = commit(workspace, [...relative, ...kept(workspace, state)], input("commit-message") || "chore: refresh glancecard");
  }
  setOutput("committed", String(committed));
  console.log(committed ? "Committed the cards." : "No commit.");

  for (const f of failures) console.log(`::error title=glancecard::${escapeData(`${f.target}: ${f.error.message}`)}`);
  if (failures.length) process.exitCode = 1;
}

// Imported by the tests for its helpers; run only as the action's entry point.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.log(`::error title=glancecard::${escapeData(err.message)}`);
    process.exitCode = 1;
  });
}
