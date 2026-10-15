import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileNames as runFileNames, parseThemes as runParseThemes } from "../src/run.js";
import { LOOK_NAMES, theme, THEME_NAMES } from "../src/theme.js";
import {
  DARK_LOOKS,
  DEFAULT,
  DEFAULT_REFRESH,
  embed,
  fileNames,
  hours,
  LIGHT,
  LOOKS,
  parseThemes,
  plan,
  prompt,
  refreshNote,
  refreshPlan,
  seasonHint,
  THEME_ORDER,
  workflow,
} from "../site/editor.js";

// The setup editor, on the README's own blocks: what the page starts from.
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const PROMPT = readme.split("## Set it up in one paste")[1].match(/```text\n([\s\S]*?)\n```/)[1];
const byHand = readme.split("## Set it up by hand")[1].split("## Staying up to date")[0];
const YAML = byHand.match(/```yaml\n([\s\S]*?)\n```/)[1];
const EMBED = byHand.match(/```html\n([\s\S]*?)\n```/)[1];
const RAW = "https://raw.githubusercontent.com/<login>/<login>/<default branch>/glancecard/";
const STEP4 = (inner) => `4. Add my profile card to my profile README where it fits best (ask me if unsure), then commit and push:\n\n${inner}\n\n5.`;

test("the editor knows the looks, and reads themes and names files as the action does", () => {
  assert.deepEqual(THEME_ORDER, THEME_NAMES);
  assert.deepEqual(LOOKS, LOOK_NAMES);
  assert.deepEqual(
    LOOKS.filter((l) => !theme(l).isDark),
    [LIGHT],
    "Daylight is the only light look",
  );
  assert.deepEqual(DARK_LOOKS, LOOK_NAMES.filter((l) => theme(l).isDark));
  for (const look of [...DARK_LOOKS, ...LOOKS]) {
    for (const p of [plan({ mode: "follow", dark: DARK_LOOKS.includes(look) ? look : "midnight" }), plan({ mode: "one", look })]) {
      assert.deepEqual(p.themes, runParseThemes(p.theme ?? "both"), look);
      assert.deepEqual(fileNames("profile", p.themes), runFileNames("profile", p.themes), look);
    }
  }
  assert.deepEqual(parseThemes("both, halloween"), runParseThemes("both, halloween"));
});

test("the default choice gives the README's blocks back, byte for byte", () => {
  const p = plan(DEFAULT);
  assert.equal(p.theme, null);
  assert.equal(p.calendar, null);
  assert.deepEqual(plan(), p);
  assert.equal(prompt(PROMPT, p), PROMPT);
  assert.equal(workflow(YAML, p), YAML);
  assert.equal(embed(EMBED, p), EMBED);
});

test("follows the reader's theme, Nebula in the dark", () => {
  const p = plan({ mode: "follow", dark: "nebula" });
  assert.equal(p.theme, "nebula, light");
  assert.equal(p.season, null);
  const out = prompt(PROMPT, p);
  assert.ok(out.includes("             time-zone: <zone>\n             theme: nebula, light\n\n   Then make sure"));
  assert.ok(out.includes("check that glancecard/profile-nebula.svg is now on the default branch"));
  assert.ok(
    out.includes(
      STEP4(`   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="glancecard/profile-nebula.svg">
     <img src="glancecard/profile-light.svg" width="880" alt="<login>'s GitHub activity">
   </picture>`),
    ),
  );
  assert.ok(out.includes(`with the same <picture> pointing at ${RAW}<name>-nebula.svg and -light.svg. Don't merge them`));
  assert.equal(workflow(YAML, p), YAML.replace("another-repo", "another-repo\n          theme: nebula, light"));
  assert.equal(
    embed(EMBED, p),
    `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="glancecard/your-repo-nebula.svg">
  <img src="glancecard/your-repo-light.svg" width="880" alt="your-repo at a glance">
</picture>`,
  );
});

test("follows the reader's theme, Halloween in the dark, and says it is seasonal", () => {
  const p = plan({ mode: "follow", dark: "halloween" });
  assert.equal(p.theme, "halloween, light");
  assert.equal(p.season, "halloween");
  assert.equal(seasonHint(p.season), "Halloween is worn from 1 October to 2 November only; out of season the card wears Midnight.");
  const out = prompt(PROMPT, p);
  assert.ok(out.includes("             theme: halloween, light\n"));
  assert.ok(out.includes("check that glancecard/profile-halloween.svg is now"));
  assert.ok(out.includes(`srcset="glancecard/profile-halloween.svg"`) && out.includes(`src="glancecard/profile-light.svg"`));
  assert.ok(out.includes(`${RAW}<name>-halloween.svg and -light.svg.`));
  assert.ok(embed(EMBED, p).includes(`srcset="glancecard/your-repo-halloween.svg"`));
});

test("always one look, Daylight: one file and a plain <img>", () => {
  const p = plan({ mode: "one", look: "daylight" });
  assert.equal(p.theme, "daylight");
  assert.equal(p.calendar, null);
  const out = prompt(PROMPT, p);
  assert.ok(out.includes("             time-zone: <zone>\n             theme: daylight\n\n"));
  assert.ok(out.includes("check that glancecard/profile.svg is now on the default branch"));
  assert.ok(out.includes(STEP4(`   <img src="glancecard/profile.svg" width="880" alt="<login>'s GitHub activity">`)));
  assert.doesNotMatch(out, /^ *<picture>$|profile-dark|profile-light/m);
  assert.ok(out.includes(`with the same <img> pointing at ${RAW}<name>.svg. Don't merge them`));
  assert.equal(workflow(YAML, p), YAML.replace("another-repo", "another-repo\n          theme: daylight"));
  assert.equal(embed(EMBED, p), `<img src="glancecard/your-repo.svg" width="880" alt="your-repo at a glance">`);
});

test("always one look, Hyperspace, its year as a grid", () => {
  const p = plan({ mode: "one", look: "hyperspace", calendar: "grid" });
  assert.equal(p.theme, "hyperspace");
  assert.equal(p.calendar, "grid");
  const out = prompt(PROMPT, p);
  assert.ok(out.includes("             time-zone: <zone>\n             theme: hyperspace\n             calendar: grid\n\n"));
  assert.ok(out.includes(STEP4(`   <img src="glancecard/profile.svg" width="880" alt="<login>'s GitHub activity">`)));
  assert.equal(workflow(YAML, p), YAML.replace("another-repo", "another-repo\n          theme: hyperspace\n          calendar: grid"));
  assert.equal(embed(EMBED, p), `<img src="glancecard/your-repo.svg" width="880" alt="your-repo at a glance">`);
});

test("only real choices: a light look on the dark side, or no look, is refused", () => {
  assert.throws(() => plan({ mode: "follow", dark: "daylight" }), /no dark look "daylight"/);
  assert.throws(() => plan({ mode: "one", look: "dark" }), /no look "dark"/);
  assert.equal(seasonHint("nebula"), "");
});

test("a template that drifted fails loudly instead of passing through", () => {
  const p = plan({ mode: "one", look: "nebula" });
  assert.throws(() => prompt(PROMPT.replace("time-zone: <zone>", "time-zone: UTC"), p), /expected exactly one/);
  assert.throws(() => workflow(YAML.replace("another-repo", "other"), p), /expected exactly one/);
  assert.throws(() => prompt(PROMPT.replace("profile-dark.svg is now", "profile.svg is now"), p), /expected exactly one/);
});

// ─── The refresh ───

const OCT = new Date("2026-10-15T12:00:00Z");
const JAN = new Date("2027-01-15T12:00:00Z");
/** The UTC hour offered under a local time, and its day shift. */
const at = (zone, label, date) => hours(zone, date).find((h) => h.label === label);
const MONDAY = "Once a week";

test("the refresh, untouched, is the README's schedule and writes no zone", () => {
  assert.deepEqual(plan().refresh, refreshPlan(DEFAULT_REFRESH));
  assert.deepEqual(plan().refresh, { cron: "30 5 * * *", comment: "every day", zone: null, promptZone: null });
  assert.equal(workflow(YAML, plan()), YAML);
  assert.equal(prompt(PROMPT, plan()), PROMPT);
});

test("hours: 24 starts at minute 30 UTC, offered under their local time, in order", () => {
  for (const zone of ["UTC", "Europe/Rome", "Pacific/Auckland", "America/Los_Angeles", "Asia/Kolkata"]) {
    const list = hours(zone, OCT);
    assert.equal(list.length, 24, zone);
    assert.deepEqual([...new Set(list.map((h) => h.utcHour))].sort((a, b) => a - b), [...Array(24).keys()], zone);
    assert.ok(list.every((h, i) => i === 0 || h.minutes > list[i - 1].minutes), `${zone} in local order`);
  }
  assert.equal(at("UTC", "05:30", OCT).utcHour, 5);
  assert.equal(hours("Asia/Kolkata", OCT).find((h) => h.utcHour === 5).label, "11:00", "a half-hour zone keeps the cron at minute 30");
});

test("Europe/Rome: 09:30 is 07:30 UTC in summer time, 08:30 UTC in winter", () => {
  const oct = at("Europe/Rome", "09:30", OCT);
  const jan = at("Europe/Rome", "09:30", JAN);
  assert.deepEqual([oct.utcHour, oct.shift, jan.utcHour, jan.shift], [7, 0, 8, 0]);
  assert.equal(at("Europe/Rome", "07:30", OCT).utcHour, 5, "the README's 05:30 UTC is 07:30 in Rome in October");
  const p = plan({ refresh: { often: "day", utcHour: oct.utcHour, zone: "Europe/Rome", date: OCT } });
  assert.equal(
    workflow(YAML, p),
    YAML.replace(`- cron: "30 5 * * *" # every day`, `- cron: "30 7 * * *" # every day`).replace("another-repo", "another-repo\n          time-zone: Europe/Rome"),
  );
  assert.equal(refreshNote({ often: "day", utcHour: 7, zone: "Europe/Rome", date: OCT }), "Every day at 09:30 in Europe/Rome, 07:30 UTC.");
  const q = plan({ refresh: { often: "day", utcHour: jan.utcHour, zone: "Europe/Rome", date: JAN } });
  assert.equal(q.refresh.cron, "30 8 * * *");
});

test("a Monday morning east of UTC is a Sunday in UTC: the weekday moves", () => {
  const h = at("Pacific/Auckland", "08:30", OCT);
  assert.deepEqual([h.utcHour, h.shift], [19, -1]);
  const p = plan({ refresh: { often: "week", utcHour: h.utcHour, zone: "Pacific/Auckland", date: OCT } });
  assert.deepEqual(p.refresh, { cron: "30 19 * * 0", comment: "every Monday", zone: "Pacific/Auckland", promptZone: null });
  assert.ok(workflow(YAML, p).includes(`    - cron: "30 19 * * 0" # every Monday\n`));
  assert.equal(refreshNote({ often: "week", utcHour: 19, zone: "Pacific/Auckland", date: OCT }), "Every Monday at 08:30 in Pacific/Auckland, Sunday 19:30 UTC.");
});

test("America/Los_Angeles: a morning, and a Monday night that is Tuesday in UTC", () => {
  const morning = at("America/Los_Angeles", "06:30", OCT);
  assert.equal(plan({ refresh: { often: "day", utcHour: morning.utcHour, zone: "America/Los_Angeles", date: OCT } }).refresh.cron, "30 13 * * *");
  const night = at("America/Los_Angeles", "22:30", OCT);
  assert.deepEqual([night.utcHour, night.shift], [5, 1]);
  assert.equal(plan({ refresh: { often: "week", utcHour: night.utcHour, zone: "America/Los_Angeles", date: OCT } }).refresh.cron, "30 5 * * 2");
});

test("UTC: the hours are themselves, and Monday is Monday", () => {
  const p = plan({ refresh: { often: "week", utcHour: 5, zone: "UTC", date: OCT } });
  assert.equal(p.refresh.cron, "30 5 * * 1");
  assert.ok(workflow(YAML, p).includes(`    - cron: "30 5 * * 1" # every Monday`) && workflow(YAML, p).includes("\n          time-zone: UTC"));
});

test("the prompt names a zone only when it was picked, and keeps the README's otherwise", () => {
  const touched = plan({ refresh: { often: "day", utcHour: 7, zone: "Europe/Rome", date: OCT } });
  const keep = prompt(PROMPT, touched);
  assert.ok(keep.includes(`       - cron: "30 7 * * *"\n`));
  assert.ok(keep.includes("             time-zone: <zone>\n"));
  assert.ok(keep.includes("and this machine's IANA time zone:"));
  const picked = prompt(PROMPT, plan({ mode: "one", look: "nebula", refresh: { often: "day", utcHour: 7, zone: "Europe/Rome", explicit: true, date: OCT } }));
  assert.ok(picked.includes("             time-zone: Europe/Rome\n             theme: nebula\n"));
  assert.ok(picked.includes("filling in my login and the repositories (one per line):"));
  assert.doesNotMatch(picked, /<zone>|this machine's IANA time zone/);
});
