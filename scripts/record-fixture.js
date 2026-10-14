#!/usr/bin/env node
// Records what the API answers for a repository or a profile into a test
// fixture, so the model and the renderer can be tested without a network.
//
//   node scripts/record-fixture.js gfazioli/octoscope test/fixtures/octoscope.json
//   node scripts/record-fixture.js @gfazioli test/fixtures/profile-gfazioli.json
//
// Avatars are not recorded: the golden cards draw their placeholder.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createClient } from "../src/github.js";
import { fetchProfile } from "../src/profile/fetch.js";
import { fetchRepo } from "../src/repo/fetch.js";

const [target, out] = process.argv.slice(2);
if (!target || !out) {
  console.error("usage: record-fixture.js <owner/name | @login> <out.json>");
  process.exit(1);
}
const token = process.env.GITHUB_TOKEN || execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
const client = createClient({ token, userAgent: "glancecard-fixtures" });
const data = target.startsWith("@")
  ? await fetchProfile(client, target.slice(1))
  : await fetchRepo(client, target, { timeZone: "Europe/Rome" });
writeFileSync(out, `${JSON.stringify(data, null, 1)}\n`);
console.log(`${out}: ${(JSON.stringify(data).length / 1024).toFixed(1)} KB`);
