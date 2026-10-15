/*
 * editor.js — the setup editor: how the card wears its look and the year a
 * visitor picks, turned into the workflow, the one-paste prompt and the
 * README embed. The choices are exclusive: a card that follows the reader's
 * theme has one dark look beside Daylight, the only light one; a card that
 * doesn't wears one look.
 *
 * The page's own default text is the input (each block is held to the
 * README by test/site.test.js), and every change is an exact string put in
 * the place of another that must be there once, so the default choice gives
 * the text back byte for byte and a drifted template fails loudly. A module,
 * deferred like site.js and before it: it shows its panel before site.js
 * decides what to arm. Without it the page reads as it always did.
 */

/** The theme names, in the order the action lists them (src/theme.js THEME_NAMES). */
export const THEME_ORDER = ["dark", "light", "midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas"];
/** The nine looks by name (src/theme.js LOOK_NAMES); Daylight is the only light one. */
export const LOOKS = ["midnight", "aurora", "daylight", "upside-down", "hyperspace", "bridge", "nebula", "halloween", "christmas"];
export const LIGHT = "daylight";
export const DARK_LOOKS = LOOKS.filter((l) => l !== LIGHT);
/** When a seasonal look is worn (src/theme.js inSeason); out of it, Midnight. */
export const SEASONS = { halloween: "from 1 October to 2 November", christmas: "from 1 December to 6 January" };
export const DEFAULT = { mode: "follow", dark: "midnight", look: "midnight", calendar: "chart" };

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
 * What a choice writes: the `theme` and `calendar` lines (null where the
 * default needs none), the themes the action will render, and the embed.
 *
 * - `follow` with Midnight is the default, `both`: `dark` and `light`.
 * - `follow` with another dark look is that look and `light`, a <picture>
 *   of `-<look>.svg` and `-light.svg`.
 * - `one` is one look and one file, `<name>.svg`, in a plain <img>.
 */
export function plan({ mode = DEFAULT.mode, dark = DEFAULT.dark, look = DEFAULT.look, calendar = DEFAULT.calendar, refresh = DEFAULT_REFRESH } = {}) {
  let value;
  let embed;
  let worn;
  if (mode === "one") {
    if (!LOOKS.includes(look)) throw new Error(`editor: no look "${look}"`);
    value = look;
    embed = { picture: false, look };
    worn = look;
  } else {
    if (!DARK_LOOKS.includes(dark)) throw new Error(`editor: no dark look "${dark}"`);
    value = dark === "midnight" ? "both" : `${dark}, light`;
    embed = { picture: true, dark: dark === "midnight" ? "dark" : dark, light: "light" };
    worn = dark;
  }
  return {
    theme: value === "both" ? null : value,
    calendar: calendar === "grid" ? "grid" : null,
    themes: parseThemes(value),
    embed,
    season: SEASONS[worn] ? worn : null,
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
const inputs = (p, indent) => [p.theme && `theme: ${p.theme}`, p.calendar && `calendar: ${p.calendar}`].filter(Boolean).map((l) => `\n${indent}${l}`).join("");

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

// ─── The page ───

/** The line under the choices when a seasonal look is worn. */
export function seasonHint(look) {
  return SEASONS[look] ? `${look[0].toUpperCase()}${look.slice(1)} is worn ${SEASONS[look]} only; out of season the card wears Midnight.` : "";
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

  function render() {
    const mode = value("editor-mode") === "one" ? "one" : "follow";
    panel.querySelectorAll("[data-editor-when]").forEach((group) => {
      group.hidden = group.getAttribute("data-editor-when") !== mode;
    });
    const often = value("editor-often") === "week" ? "week" : "day";
    if (often === "week") refresh.touched = true;
    const p = plan({
      mode,
      dark: value("editor-dark"),
      look: value("editor-look"),
      calendar: value("editor-calendar"),
      refresh: refresh.touched ? { often, utcHour: refresh.utcHour, zone: refresh.zone, explicit: refresh.explicit } : DEFAULT_REFRESH,
    });
    promptEl.textContent = prompt(base.prompt, p);
    yamlEl.textContent = workflow(base.yaml, p);
    embedEl.textContent = embed(base.embed, p);
    if (hint) {
      hint.hidden = !p.season;
      hint.textContent = seasonHint(p.season);
    }
    if (zoneNote) {
      zoneNote.textContent = refresh.touched
        ? refreshNote({ often, utcHour: refresh.utcHour, zone: refresh.zone })
        : `Detected ${detected}. Change any of these and the workflow also says time-zone: ${detected}.`;
    }
  }

  panel.addEventListener("change", (event) => {
    const t = event.target;
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
    render();
  });
  if (hourEl) fillHours();
  // A browser may bring back the radios it had on a reload; draw what they say.
  render();
  panel.hidden = false;
}

if (typeof document !== "undefined") wire(document);
