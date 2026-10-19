/*
 * editor.js — the setup editor: how the card wears its look, how the year
 * and the stars a visitor picks are drawn and which sections the repository
 * card shows, turned into the workflow, the one-paste prompt and the README
 * embed, and into the card itself, drawn beside them by glancecard's own
 * renderer. The choices are exclusive: a card that follows the reader's
 * theme has one dark look, and on the light side that look's own light side
 * or Daylight; a card that doesn't wears one look.
 *
 * The page's own default text is the input (each block is held to the
 * README by test/site.test.js), and every change is an exact string put in
 * the place of another that must be there once, so the default choice gives
 * the text back byte for byte and a drifted template fails loudly. A module,
 * deferred like site.js and before it: it shows its panel before site.js
 * decides what to arm. Without it the page reads as it always did.
 */

/** The light sides of the dark looks but Midnight, whose light side is Daylight (src/theme.js LIGHT_SIDES). */
const SIDES = ["aurora-light", "upside-down-light", "hyperspace-light", "bridge-light", "nebula-light", "halloween-light", "christmas-light"];
/** The theme names, in the order the action lists them (src/theme.js THEME_NAMES). */
export const THEME_ORDER = ["dark", "light", "midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas", ...SIDES];
/** The looks by name (src/theme.js LOOK_NAMES): FinderGit's nine, then the light sides. */
export const LOOKS = ["midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas", ...SIDES];
export const LIGHT = "daylight";
export const LIGHT_LOOKS = [LIGHT, ...SIDES];
export const DARK_LOOKS = LOOKS.filter((l) => !LIGHT_LOOKS.includes(l));
/** A dark look's light side (src/theme.js lightOf), a light look itself. */
export const lightOf = (look) => (LIGHT_LOOKS.includes(look) ? look : look === "midnight" ? LIGHT : `${look}-light`);
/** The light sides' chips, from each one's paper, header and accent (held to src/theme.js by a test). */
export const LIGHT_SWATCHES = {
  daylight: "linear-gradient(135deg, #f7f9fd, #dce8ff 55%, #fcc2d7)",
  "aurora-light": "linear-gradient(135deg, #eef8f5, #e6fbf5 55%, #158260)",
  "upside-down-light": "linear-gradient(135deg, #f8f1ea, #ffe0e0 55%, #e80000)",
  "hyperspace-light": "linear-gradient(135deg, #f4f7fd, #e0f1fd 55%, #0a76c4)",
  "bridge-light": "linear-gradient(135deg, #f7f4ef, #ffefe7 55%, #cc4400)",
  "nebula-light": "linear-gradient(135deg, #f9f2fb, #f3eeff 55%, #7d52fa)",
  "halloween-light": "linear-gradient(135deg, #fbf4e6, #ffe2c0 55%, #bc5404)",
  "christmas-light": "linear-gradient(135deg, #eef5f1, #e3f3ec 55%, #347e5c)",
};
/** When a seasonal look is worn, its light side with it (src/theme.js inSeason); out of it, Midnight, or Daylight for a light side. */
export const SEASONS = { halloween: "from 1 October to 2 November", christmas: "from 1 December to 6 January" };
const seasonOf = (look) => look.replace(/-light$/, "");
/** How the stars are drawn (src/svg.js STARS_CHARTS); steps is the action's default. */
export const STARS = ["steps", "smooth", "bars"];
/** The repository card's sections, in the card's order (src/repo/render.js REPO_SECTIONS); all of them is the action's default. */
export const SECTIONS = ["hero", "tiles", "activity", "stars", "rhythm", "code", "commits", "releases", "contributors"];
export const DEFAULT = { mode: "follow", dark: "midnight", light: "own", look: "midnight", calendar: "chart", stars: "steps", sections: SECTIONS };

// ─── The refresh: how often, at what hour, in which zone ───
//
// The cron runs in UTC at minute 30 (the README's choice, off the top of
// the hour, when GitHub's scheduler is busiest). A choice of hour is a UTC
// hour, offered under the local time it falls on today in the zone, so the
// untouched editor writes "30 5 * * *" whatever the zone. A weekly run is on
// the zone's Monday: where that Monday is another day in UTC, the cron's
// weekday moves with it. Intl only, so Node can test it with any zone.

export const MINUTE = 30;
export const DEFAULT_REFRESH = { often: "day", utcHour: 5, zone: null, explicit: false };

/** Minutes the zone's clock is ahead of UTC at the instant `at`. */
export function offsetMinutes(zone, at) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const n = Object.fromEntries(parts.map((x) => [x.type, Number(x.value)]));
  const wall = Date.UTC(n.year, n.month - 1, n.day, n.hour % 24, n.minute);
  return Math.round((wall - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * The 24 UTC hours a run can start at on `date`'s UTC day, each with the
 * local time it falls on in `zone` ("07:30") and `shift`, the UTC day minus
 * the local day (-1, 0 or 1), sorted by local time.
 */
export function hours(zone, date = new Date()) {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Array.from({ length: 24 }, (_, utcHour) => {
    const at = new Date(day + (utcHour * 60 + MINUTE) * 60000);
    const local = utcHour * 60 + MINUTE + offsetMinutes(zone, at);
    const minutes = ((local % 1440) + 1440) % 1440;
    const pad = (v) => String(v).padStart(2, "0");
    return { utcHour, minutes, label: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`, shift: 0 - Math.floor(local / 1440) };
  }).sort((a, b) => a.minutes - b.minutes);
}

/**
 * The cron and its comment for a refresh: once a day, or once a week on the
 * zone's Monday. `zone` null means untouched: no `time-zone` line, and the
 * README's own schedule.
 */
export function refreshPlan({ often = "day", utcHour = 5, zone = null, explicit = false, date = new Date() } = {}) {
  const shift = zone ? hours(zone, date).find((h) => h.utcHour === utcHour).shift : 0;
  const weekly = often === "week";
  return {
    cron: `${MINUTE} ${utcHour} * * ${weekly ? (1 + shift + 7) % 7 : "*"}`,
    comment: weekly ? "every Monday" : "every day",
    zone,
    promptZone: explicit ? zone : null,
  };
}

/** The theme input as the action reads it (src/run.js parseThemes): `both` is dark and light, in order, once each. */
export function parseThemes(value) {
  const names = String(value || "both")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
    .flatMap((v) => (v === "both" ? ["dark", "light"] : [v]));
  const unknown = names.filter((n) => !THEME_ORDER.includes(n));
  if (unknown.length) throw new Error(`unknown theme ${unknown.join(", ")}`);
  return [...new Set(names)];
}

/** The file each theme writes (src/run.js fileNames): `base.svg` for one, `base-<theme>.svg` for several. */
export const fileNames = (base, themes) => (themes.length > 1 ? themes.map((t) => [t, `${base}-${t}.svg`]) : [[themes[0], `${base}.svg`]]);

/**
 * What a choice writes: the `theme`, `sections`, `calendar` and
 * `stars-chart` lines (null where the default needs none), the themes the
 * action will render, and the embed.
 *
 * - `follow` with Midnight is the default, `both`: `dark` and `light`.
 * - `follow` with another dark look is that look and its light side, a
 *   <picture> of `-<look>.svg` and `-<look>-light.svg`; or, with `light`
 *   set to `daylight`, that look and `light`, `-<look>.svg` and `-light.svg`.
 * - `one` is one look and one file, `<name>.svg`, in a plain <img>.
 * - `sections` are listed in the card's order, and only when some are left
 *   out: the action reads an empty list as all of them, so one must stay.
 */
export function plan({ mode = DEFAULT.mode, dark = DEFAULT.dark, light = DEFAULT.light, look = DEFAULT.look, calendar = DEFAULT.calendar, stars = DEFAULT.stars, sections = DEFAULT.sections, refresh = DEFAULT_REFRESH } = {}) {
  if (!STARS.includes(stars)) throw new Error(`editor: no stars chart "${stars}"`);
  const unknown = sections.filter((s) => !SECTIONS.includes(s));
  if (unknown.length) throw new Error(`editor: no section "${unknown.join(", ")}"`);
  if (!sections.length) throw new Error("editor: one section at least");
  const shown = SECTIONS.filter((s) => sections.includes(s));
  let value;
  let embed;
  let worn;
  let paired = false;
  if (mode === "one") {
    if (!LOOKS.includes(look)) throw new Error(`editor: no look "${look}"`);
    value = look;
    embed = { picture: false, look };
    worn = look;
  } else {
    if (!DARK_LOOKS.includes(dark)) throw new Error(`editor: no dark look "${dark}"`);
    if (light !== "own" && light !== LIGHT) throw new Error(`editor: no light side "${light}"`);
    const side = light === "own" ? lightOf(dark) : LIGHT;
    value = side === LIGHT ? (dark === "midnight" ? "both" : `${dark}, light`) : `${dark}, ${side}`;
    embed = { picture: true, dark: dark === "midnight" ? "dark" : dark, light: side === LIGHT ? "light" : side };
    worn = dark;
    paired = side !== LIGHT;
  }
  return {
    theme: value === "both" ? null : value,
    sections: shown.length === SECTIONS.length ? null : shown.join(", "),
    calendar: calendar === "grid" ? "grid" : null,
    stars: stars === "steps" ? null : stars,
    themes: parseThemes(value),
    embed,
    season: SEASONS[seasonOf(worn)] ? worn : null,
    seasonPaired: Boolean(SEASONS[seasonOf(worn)]) && paired,
    refresh: refreshPlan(refresh),
  };
}

/** `text` with the one `from` in it replaced by `to`; a missing or doubled `from` is an error, not a silent no-op. */
function swap(text, from, to) {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`editor: expected exactly one ${JSON.stringify(from.slice(0, 60))}`);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

/** The file `base`'s card is written to for `look`. */
const fileOf = (p, base, look) => fileNames(base, p.themes).find(([t]) => t === look)[1];

/** The workflow's extra inputs, each on its own line at `indent`. */
const inputs = (p, indent) =>
  [p.theme && `theme: ${p.theme}`, p.sections && `sections: ${p.sections}`, p.calendar && `calendar: ${p.calendar}`, p.stars && `stars-chart: ${p.stars}`]
    .filter(Boolean)
    .map((l) => `\n${indent}${l}`)
    .join("");

/**
 * A <picture> embed of `base`'s card, as the README writes it, for the
 * choice: the same <picture> with the files that exist, or its <img> alone,
 * at the <picture>'s indent.
 */
function embedOf(snippet, base, p) {
  const darkSrc = `srcset="glancecard/${base}-dark.svg"`;
  const lightSrc = `src="glancecard/${base}-light.svg"`;
  if (p.embed.picture) {
    const out = swap(snippet, darkSrc, `srcset="glancecard/${fileOf(p, base, p.embed.dark)}"`);
    return swap(out, lightSrc, `src="glancecard/${fileOf(p, base, p.embed.light)}"`);
  }
  const indent = snippet.match(/^( *)<picture>/m)[1];
  const img = snippet.match(/^ *(<img [^\n]*>)$/m)[1];
  return `${indent}${swap(img, lightSrc, `src="glancecard/${fileOf(p, base, p.embed.look)}"`)}`;
}

/** The README's "Set it up by hand" workflow, for the choice. */
export function workflow(yaml, p) {
  const last = "            your-login/another-repo";
  const zone = p.refresh.zone ? `\n          time-zone: ${p.refresh.zone}` : "";
  const out = swap(yaml, last, last + zone + inputs(p, "          "));
  return swap(out, `    - cron: "30 5 * * *" # every day`, `    - cron: "${p.refresh.cron}" # ${p.refresh.comment}`);
}

/** The README's "Show a card" embed, for the choice. */
export function embed(snippet, p) {
  return embedOf(snippet, "your-repo", p);
}

/** The README's one-paste prompt, for the choice. */
export function prompt(text, p) {
  const zone = "             time-zone: <zone>";
  const picked = p.refresh.promptZone;
  let out = swap(text, zone, (picked ? `             time-zone: ${picked}` : zone) + inputs(p, "             "));
  out = swap(out, `       - cron: "30 5 * * *"`, `       - cron: "${p.refresh.cron}"`);
  // A zone picked on the page is written in; otherwise the agent reads the machine's.
  if (picked) out = swap(out, "filling in my login, the repositories (one per line) and this machine's IANA time zone:", "filling in my login and the repositories (one per line):");

  const check = p.embed.picture ? fileOf(p, "profile", p.embed.dark) : fileOf(p, "profile", p.embed.look);
  out = swap(out, "check that glancecard/profile-dark.svg is now", `check that glancecard/${check} is now`);

  const picture = out.match(/^ *<picture>\n[\s\S]*?glancecard\/profile-dark\.svg[\s\S]*?<\/picture>$/m)?.[0];
  if (!picture) throw new Error("editor: the profile card's <picture> is not in the prompt");
  out = swap(out, picture, embedOf(picture, "profile", p));

  const raw = "https://raw.githubusercontent.com/<login>/<login>/<default branch>/glancecard/";
  const pair = `with the same <picture> pointing at ${raw}<name>-dark.svg and -light.svg.`;
  const name = (look) => fileOf(p, "<name>", look);
  return swap(
    out,
    pair,
    p.embed.picture
      ? `with the same <picture> pointing at ${raw}${name(p.embed.dark)} and ${name(p.embed.light).slice("<name>".length)}.`
      : `with the same <img> pointing at ${raw}${name(p.embed.look)}.`,
  );
}

// ─── The card beside the choices ───
//
// Drawn in the page by glancecard's renderer, from the author's data, both
// in preview.js, which the build writes (scripts/site.js) and names by its
// content: the first draw waits for it, and the card until then is
// Midnight's, drawn at build time from the same data.

/** The module that draws the card; the build appends its content's hash. */
const PREVIEW = "./preview.js";

/** The look the card wears for a choice: its one look, or the dark one, or on the light side its light side or Daylight. */
export function previewLook({ mode, dark, light = "own", look }, side) {
  if (mode === "one") return look;
  if (side !== "light") return dark;
  return light === LIGHT ? LIGHT : lightOf(dark);
}

/** The file the shown card is written to: the profile's, or `your-repo`'s, for the reader's side or the one look. */
export function previewFile(p, card, side) {
  const theme = p.embed.picture ? (side === "light" ? p.embed.light : p.embed.dark) : p.embed.look;
  return fileOf(p, card === "repo" ? "your-repo" : "profile", theme);
}

const named = (look) => look.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** The sections a plan's line names, or all of them. */
export const sectionsOf = (line) => (line ? line.split(", ") : SECTIONS);

/** A list read aloud: "a", "a and b", "a, b and c". */
const spoken = (list) => (list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`);

/** What the card's alt says. */
export function previewAlt({ card, look, calendar, stars, sections = SECTIONS }) {
  const what = card === "repo" ? "octoscope's repository card" : "The profile card";
  const drawn = sections.includes("stars") ? `its year as a ${calendar} and its stars as ${stars}` : `its year as a ${calendar}, without its stars`;
  const only = card === "repo" && sections.length < SECTIONS.length ? `, showing ${spoken(sections)} only` : "";
  return `${what} in the ${named(look)} look, ${drawn}${only}`;
}

// ─── The page ───

/** The line under the choices when a seasonal look is worn, `paired` with its light side or not. */
export function seasonHint(look, paired = false) {
  const season = look && SEASONS[seasonOf(look)];
  if (!season) return "";
  const instead = look.endsWith("-light") ? "Daylight" : "Midnight";
  return `${named(look)} is worn ${season} only; out of season the card wears ${instead}${paired ? ", and Daylight on the light side" : ""}.`;
}

/** The day a weekly run starts on, in UTC, for the zone's Monday. */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The line under the refresh choices: what the cron means in UTC. */
export function refreshNote({ often, utcHour, zone, date = new Date() }) {
  const h = hours(zone, date).find((x) => x.utcHour === utcHour);
  const utc = `${String(utcHour).padStart(2, "0")}:${MINUTE}`;
  if (often !== "week") return `Every day at ${h.label} in ${zone}, ${utc} UTC.`;
  return `Every Monday at ${h.label} in ${zone}, ${WEEKDAYS[(1 + h.shift + 7) % 7]} ${utc} UTC.`;
}

/**
 * The card beside the choices: drawn once preview.js is in, which it starts
 * fetching when the card comes near the screen or a choice changes. Each
 * draw is decoded before it is shown, so a switch never flashes empty.
 */
function wirePreview(doc) {
  const stage = doc.querySelector("[data-preview]");
  const img = stage?.querySelector("img");
  if (!img) return () => {};
  const bar = doc.querySelector("[data-preview-bar]");
  const side = doc.querySelector("[data-preview-side]");
  const note = doc.querySelector("[data-preview-note]");
  const initial = { mode: "follow", dark: "midnight", side: "dark", card: "profile", calendar: "chart", stars: "steps", sections: null };
  let draw = null;
  let wanted = null;
  let drawn = false;
  let shown = null;
  let started = false;

  function load() {
    if (started) return;
    started = true;
    import(PREVIEW).then(
      (m) => {
        const tz = m.DATA.timeZone;
        const models = { profile: m.profileModel(m.DATA.profile, { timeZone: tz }), repo: m.repoModel(m.DATA.repo, { timeZone: tz }) };
        draw = (c) => {
          const sections = sectionsOf(c.sections);
          const options = { theme: m.theme(c.look), calendar: c.calendar, starsChart: c.stars, images: m.DATA.images };
          const svg =
            c.card === "repo"
              ? m.renderRepo(models.repo, { ...options, sections })
              : m.renderProfile(models.profile, { ...options, stars: sections.includes("stars") });
          const [, w, h] = svg.match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
          const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          const next = new Image();
          next.src = url;
          const swap = () => {
            if (wanted !== c) return URL.revokeObjectURL(url);
            img.width = Number(w);
            img.height = Number(h);
            img.src = url;
            img.alt = previewAlt({ ...c, sections });
            if (shown) URL.revokeObjectURL(shown);
            shown = url;
          };
          (next.decode ? next.decode() : Promise.resolve()).then(swap, swap);
          drawn = true;
        };
        if (bar) bar.hidden = false;
        if (wanted) show(wanted);
      },
      () => {
        // Without the module the card stays Midnight's, and the choices still write the code.
      },
    );
  }

  function show(c) {
    wanted = c;
    if (side) side.hidden = c.mode === "one";
    if (note) {
      note.hidden = false;
      const who = c.card === "repo" ? "octoscope's card, as an example" : "the author's card";
      const reader = c.mode === "one" ? "every reader sees" : `readers on GitHub's ${c.side} theme see`;
      note.textContent = `${c.file}: what ${reader}, drawn here from ${who}.`;
    }
    if (!draw) return;
    const same = Object.keys(initial).every((k) => c[k] === initial[k]);
    if (!drawn && same) return;
    draw(c);
  }

  if (typeof IntersectionObserver === "function") {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(stage);
  } else {
    load();
  }
  return (c, changed) => {
    if (changed) load();
    show(c);
  };
}

function wire(doc) {
  const panel = doc.querySelector("[data-editor]");
  const promptEl = doc.getElementById("prompt-text");
  const yamlEl = doc.getElementById("editor-yaml");
  const embedEl = doc.getElementById("editor-embed");
  if (!panel || !promptEl || !yamlEl || !embedEl) return;
  const hint = doc.getElementById("editor-hint");
  const hourEl = doc.getElementById("editor-hour");
  let zoneEl = doc.getElementById("editor-zone");
  const zoneNote = doc.getElementById("editor-zone-note");
  const base = { prompt: promptEl.textContent, yaml: yamlEl.textContent, embed: embedEl.textContent };
  // Native radios, one group per choice: one tab stop each, arrows move.
  const value = (name) => panel.querySelector(`input[name="${name}"]:checked`)?.value;

  // The refresh starts as the README's: 05:30 UTC, no time-zone line. The
  // first change to any of its controls writes the zone in; a zone picked
  // by hand goes into the prompt too, where the agent would otherwise read
  // the machine's.
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const refresh = { utcHour: 5, zone: detected, touched: false, explicit: false, hourPicked: false };
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : null;
  if (zones && zoneEl) {
    for (const z of zones.includes(detected) ? zones : [detected, ...zones]) zoneEl.add(new Option(z, z, false, z === detected));
  } else if (zoneEl) {
    // No list to offer: a text field, read as a zone only if Intl knows it.
    const input = doc.createElement("input");
    input.type = "text";
    input.id = zoneEl.id;
    input.value = detected;
    input.spellcheck = false;
    input.autocomplete = "off";
    zoneEl.replaceWith(input);
    zoneEl = input;
  }

  function fillHours() {
    const list = hours(refresh.zone);
    hourEl.textContent = "";
    for (const h of list) hourEl.add(new Option(h.label, String(h.utcHour), false, h.utcHour === refresh.utcHour));
  }

  const preview = wirePreview(doc);
  const pickedIn = (name) => doc.querySelector(`input[name="${name}"]:checked`)?.value;
  const pick = (name, v) => {
    const input = doc.querySelector(`input[name="${name}"][value="${v}"]`);
    if (input) input.checked = true;
  };
  const sectionBoxes = () => [...panel.querySelectorAll('input[name="editor-sections"]')];
  const ownName = panel.querySelector("[data-light-name]");
  const ownSwatch = panel.querySelector("[data-light-swatch]");
  const daylightPick = panel.querySelector("[data-light-daylight]");

  function render(changed = false) {
    const mode = value("editor-mode") === "one" ? "one" : "follow";
    // The light row offers the dark look's own light side, or Daylight;
    // Midnight's own is Daylight, so it offers one.
    const darkLook = value("editor-dark") ?? DEFAULT.dark;
    if (ownName) ownName.textContent = lightOf(darkLook);
    if (ownSwatch) ownSwatch.style.background = LIGHT_SWATCHES[lightOf(darkLook)];
    if (daylightPick) daylightPick.hidden = darkLook === "midnight";
    if (darkLook === "midnight") pick("editor-light", "own");
    panel.querySelectorAll("[data-editor-when]").forEach((group) => {
      group.hidden = group.getAttribute("data-editor-when") !== mode;
    });
    const often = value("editor-often") === "week" ? "week" : "day";
    if (often === "week") refresh.touched = true;
    const p = plan({
      mode,
      dark: value("editor-dark"),
      light: value("editor-light") ?? DEFAULT.light,
      look: value("editor-look"),
      calendar: value("editor-calendar"),
      stars: value("editor-stars") ?? DEFAULT.stars,
      sections: sectionBoxes().length ? sectionBoxes().filter((b) => b.checked).map((b) => b.value) : SECTIONS,
      refresh: refresh.touched ? { often, utcHour: refresh.utcHour, zone: refresh.zone, explicit: refresh.explicit } : DEFAULT_REFRESH,
    });
    promptEl.textContent = prompt(base.prompt, p);
    yamlEl.textContent = workflow(base.yaml, p);
    embedEl.textContent = embed(base.embed, p);
    if (hint) {
      hint.hidden = !p.season;
      hint.textContent = seasonHint(p.season, p.seasonPaired);
    }
    if (zoneNote) {
      zoneNote.textContent = refresh.touched
        ? refreshNote({ often, utcHour: refresh.utcHour, zone: refresh.zone })
        : `Detected ${detected}. Change any of these and the workflow also says time-zone: ${detected}.`;
    }
    const card = pickedIn("preview-card") === "repo" ? "repo" : "profile";
    const sideOf = pickedIn("preview-side") === "light" ? "light" : "dark";
    // The looks' two rows: the one the card shows is marked.
    panel.dataset.side = sideOf;
    const choice = { mode, dark: value("editor-dark"), light: value("editor-light") ?? DEFAULT.light, look: value("editor-look") };
    const look = previewLook(choice, sideOf);
    preview(
      {
        mode,
        dark: choice.dark,
        side: sideOf,
        card,
        look,
        calendar: value("editor-calendar") === "grid" ? "grid" : "chart",
        stars: value("editor-stars") ?? DEFAULT.stars,
        sections: p.sections,
        file: previewFile(p, card, sideOf),
      },
      changed,
    );
  }

  panel.addEventListener("change", (event) => {
    const t = event.target;
    // A choice the card on show would not draw turns it to the card that
    // does: a dark look to the dark side, a light one to the light side, a
    // section to the repository card (the profile card has the stars only).
    if (t.name === "editor-dark") pick("preview-side", "dark");
    if (t.name === "editor-light") pick("preview-side", "light");
    if (t.name === "editor-sections") {
      // The action reads no sections as all of them: the last one stays.
      if (!sectionBoxes().some((b) => b.checked)) t.checked = true;
      if (t.value !== "stars") pick("preview-card", "repo");
    }
    if (t === hourEl) {
      refresh.utcHour = Number(hourEl.value);
      refresh.touched = refresh.hourPicked = true;
    } else if (t === zoneEl) {
      let zone = zoneEl.value.trim();
      try {
        offsetMinutes(zone, new Date());
        zoneEl.removeAttribute("aria-invalid");
      } catch {
        zoneEl.setAttribute("aria-invalid", "true");
        return;
      }
      // An hour picked by hand keeps its local time in the new zone; the
      // README's 05:30 UTC stays as it is.
      if (refresh.hourPicked) {
        const was = hours(refresh.zone).find((h) => h.utcHour === refresh.utcHour).minutes;
        const near = hours(zone).reduce((a, b) => (Math.abs(b.minutes - was) < Math.abs(a.minutes - was) ? b : a));
        refresh.utcHour = near.utcHour;
      }
      refresh.zone = zone;
      refresh.touched = refresh.explicit = true;
      fillHours();
    } else if (t.name === "editor-often") {
      refresh.touched = true;
    }
    render(true);
  });
  // A look already picked sends no change when it is clicked again, but the
  // click still asks to see its side.
  panel.addEventListener("click", (event) => {
    const t = event.target;
    const side = { "editor-dark": "dark", "editor-light": "light" }[t.name];
    if (!side || pickedIn("preview-side") === side) return;
    pick("preview-side", side);
    render(true);
  });
  doc.querySelector("[data-preview-bar]")?.addEventListener("change", () => render(true));
  if (hourEl) fillHours();
  // A browser may bring back the radios it had on a reload; draw what they say.
  render();
  panel.hidden = false;
}

if (typeof document !== "undefined") wire(document);
