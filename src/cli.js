#!/usr/bin/env node
// glancecard on a terminal: render cards into a folder, to preview them or to
// commit them from any CI.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "./github.js";
import { parseCalendar, parseCount, parseSections, parseThemes, renderCards } from "./run.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const HELP = `glancecard ${version} — your GitHub profile and repositories, at a glance

Usage:
  glancecard repo <owner/name>... [options]   a card per repository
  glancecard profile <login> [options]        a profile card

Options:
  --out <dir>          where the cards go (default: glancecard)
  --theme <list>       both (dark and light), or looks, comma-separated (default: both):
                       dark, light, midnight, aurora, daylight, upside-down,
                       hyperspace, bridge, nebula, halloween, christmas
  --all-seasons        wear Halloween and Christmas out of their season
  --time-zone <zone>   IANA zone for commit days and hours (default: this machine's)
  --sections <list>    repository card sections, comma-separated (default: all):
                       hero, tiles, activity, stars, rhythm, code, commits, releases, contributors
  --calendar <style>   how a year of contributions or commits is drawn (default: chart):
                       chart, a line of daily counts; grid, GitHub's calendar
  --max-commits <n>    commits read for the last year, at most (default: 5000)
  --allow-private      render private repositories too (the card publishes their data)
  -h, --help           this help
  -v, --version        the version

The token is read from GITHUB_TOKEN, then GH_TOKEN, then \`gh auth token\`.`;

const VALUED = new Set(["--out", "--theme", "--time-zone", "--sections", "--calendar", "--max-commits"]);

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith("--") ? arg.split(/=(.*)/s) : [arg];
    if (VALUED.has(flag)) {
      const value = inline ?? argv[++i];
      if (value === undefined) throw new Error(`${flag} needs a value`);
      options[flag.slice(2)] = value;
    } else if (flag === "--allow-private") options["allow-private"] = true;
    else if (flag === "--all-seasons") options["all-seasons"] = true;
    else if (flag === "-h" || flag === "--help") options.help = true;
    else if (flag === "-v" || flag === "--version") options.version = true;
    else if (arg.startsWith("-")) throw new Error(`unknown option ${arg}`);
    else positional.push(arg);
  }
  return { options, positional };
}

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

async function main() {
  const { options, positional } = parseArgs(process.argv.slice(2));
  if (options.version) return console.log(version);
  const [command, ...targets] = positional;
  if (options.help || !command) return console.log(HELP);
  if (command !== "repo" && command !== "profile") throw new Error(`unknown command "${command}" (repo or profile)`);
  if (!targets.length) throw new Error(command === "repo" ? "name at least one owner/name" : "name a login");
  if (command === "profile" && targets.length > 1) throw new Error("one login at a time");

  const { files, failures } = await renderCards({
    client: createClient({ token: token(), userAgent: `glancecard/${version}` }),
    repos: command === "repo" ? targets : [],
    profile: command === "profile" ? targets[0] : null,
    outDir: options.out ?? "glancecard",
    themes: parseThemes(options.theme),
    timeZone: options["time-zone"] ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
    sections: parseSections(options.sections),
    calendar: parseCalendar(options.calendar),
    maxCommits: parseCount(options["max-commits"], "--max-commits", 5000),
    allowPrivate: Boolean(options["allow-private"]),
    allSeasons: Boolean(options["all-seasons"]),
    log: (line) => console.log(line),
  });
  for (const file of files) console.log(`  ${file}`);
  for (const f of failures) console.error(`${f.target}: ${f.error.message}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`glancecard: ${err.message}`);
  process.exitCode = 1;
});
