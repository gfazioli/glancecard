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
export function plan({ mode = DEFAULT.mode, dark = DEFAULT.dark, look = DEFAULT.look, calendar = DEFAULT.calendar } = {}) {
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
  return swap(yaml, last, last + inputs(p, "          "));
}

/** The README's "Show a card" embed, for the choice. */
export function embed(snippet, p) {
  return embedOf(snippet, "your-repo", p);
}

/** The README's one-paste prompt, for the choice. */
export function prompt(text, p) {
  const zone = "             time-zone: <zone>";
  let out = swap(text, zone, zone + inputs(p, "             "));

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

function wire(doc) {
  const panel = doc.querySelector("[data-editor]");
  const promptEl = doc.getElementById("prompt-text");
  const yamlEl = doc.getElementById("editor-yaml");
  const embedEl = doc.getElementById("editor-embed");
  if (!panel || !promptEl || !yamlEl || !embedEl) return;
  const hint = doc.getElementById("editor-hint");
  const base = { prompt: promptEl.textContent, yaml: yamlEl.textContent, embed: embedEl.textContent };
  // Native radios, one group per choice: one tab stop each, arrows move.
  const value = (name) => panel.querySelector(`input[name="${name}"]:checked`)?.value;

  function render() {
    const mode = value("editor-mode") === "one" ? "one" : "follow";
    panel.querySelectorAll("[data-editor-when]").forEach((group) => {
      group.hidden = group.getAttribute("data-editor-when") !== mode;
    });
    const p = plan({ mode, dark: value("editor-dark"), look: value("editor-look"), calendar: value("editor-calendar") });
    promptEl.textContent = prompt(base.prompt, p);
    yamlEl.textContent = workflow(base.yaml, p);
    embedEl.textContent = embed(base.embed, p);
    if (hint) {
      hint.hidden = !p.season;
      hint.textContent = seasonHint(p.season);
    }
  }

  panel.addEventListener("change", render);
  // A browser may bring back the radios it had on a reload; draw what they say.
  render();
  panel.hidden = false;
}

if (typeof document !== "undefined") wire(document);
