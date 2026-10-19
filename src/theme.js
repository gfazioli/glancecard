// The looks, after the nine of FinderGit's Profile Card
// (https://findergit.app): a look sets every colour a card draws, and most
// past the classics a typeface and decorations (src/decor.js). `dark` and
// `light` are Midnight and Daylight under the names a <picture> pair uses.
// Every other dark look has a light side of its own, `<look>-light`.
// Accents are 6-digit hex so a tint can append an alpha.

import { clock } from "./time.js";

const white = (a) => `rgba(255,255,255,${a})`;

// Each look as FinderGit draws it. Glows are [colour, opacity, x, y, radius]
// with x and y as a share of the card; tiles are the ten profile figures'
// colours in the card's order (followers, following, stars, repositories,
// forks, pull requests, issues, commits, contributed, years), null for the
// classic set.
const LOOKS = {
  midnight: {
    family: "classic",
    canvas: ["#1A2140", "#221F44", "#2C2150"],
    glows: [
      ["#3B5BDB", 0.42, 0.08, 0.04, 420],
      ["#7048E8", 0.36, 0.96, 0.96, 480],
      ["#1C7ED6", 0.18, 0.92, 0.28, 320],
    ],
    header: ["#2E5199", "#243F7A"],
    avatarRing: ["#74C0FC", white(0.85)],
    heat: [white(0.08), "#0E4429", "#006D32", "#26A641", "#39D353"],
  },
  aurora: {
    family: "classic",
    canvas: ["#0A2A30", "#13233F", "#2A1846"],
    glows: [
      ["#12B886", 0.34, 0.06, 0.08, 420],
      ["#E64980", 0.28, 0.94, 0.94, 480],
      ["#15AABF", 0.22, 0.88, 0.18, 320],
    ],
    header: ["#0F5F66", "#3A2A7C"],
    avatarRing: ["#63E6BE", "#F783AC"],
    heat: [white(0.08), "#0B4F4A", "#0E7C6B", "#20C997", "#63E6BE"],
  },
  daylight: {
    family: "classic",
    isDark: false,
    canvas: ["#F7F9FD", "#EFF2FB", "#F3EEFC"],
    glows: [
      ["#74C0FC", 0.34, 0.06, 0.04, 420],
      ["#B197FC", 0.3, 0.96, 0.96, 480],
      ["#63E6BE", 0.16, 0.9, 0.26, 320],
    ],
    header: ["#DCE8FF", "#E8E1FF"],
    avatarRing: ["#4C6EF5", "#B197FC"],
    heat: ["#EBEDF0", "#9BE9A8", "#40C463", "#30A14E", "#216E39"],
  },
  "upside-down": {
    family: "cosmic",
    canvas: ["#07040A", "#12060B", "#1E0508"],
    glows: [
      ["#FF1E1E", 0.32, 0.5, 1.08, 560],
      ["#8B0000", 0.4, 0.08, 0.12, 380],
      ["#2B6CB0", 0.12, 0.95, 0.3, 300],
    ],
    header: ["#2A0A0E", "#14070A"],
    headerOutline: "rgba(255,42,42,0.35)",
    avatarRing: ["#FF2A2A", "#8B0000"],
    heat: [white(0.06), "#3B0A0D", "#7A1015", "#C4161C", "#FF3B3B"],
    tiles: ["#FF3B3B", "#FF9F0A", "#FFD60A", "#E5484D", "#0A84FF", "#C4161C", "#30D158", "#FF7A45", "#BF5AF2", "#9A8C98"],
    accent: "#FF3B3B",
    secondAccent: "#FFD60A",
    type: { design: "serif" },
    nameInk: "#FF2A2A",
    nameGlow: "#FF0000",
    topBand: 34,
    surface: "rgba(10,4,6,0.62)",
  },
  hyperspace: {
    family: "cosmic",
    canvas: ["#02030A", "#050816", "#0A0F24"],
    glows: [
      ["#FFE81F", 0.12, 0.08, 0.04, 380],
      ["#3FA9F5", 0.22, 0.92, 0.92, 460],
      ["#FFFFFF", 0.06, 0.5, 0.45, 600],
    ],
    header: ["#0B1026", "#14193A"],
    headerOutline: "rgba(255,232,31,0.35)",
    avatarRing: ["#FFE81F", "#3FA9F5"],
    heat: [white(0.06), "#0B2545", "#1565C0", "#3FA9F5", "#CFEFFF"],
    tiles: ["#FFE81F", "#3FA9F5", "#FFE81F", "#4CFF7A", "#B57BFF", "#FF3B30", "#5CE1E6", "#FF9F1C", "#3FA9F5", "#A0A8C0"],
    accent: "#3FA9F5",
    secondAccent: "#FFE81F",
    type: { uppercase: true, tracking: 1.5 },
    nameInk: "#FFE81F",
    surface: "rgba(4,6,15,0.72)",
  },
  bridge: {
    family: "cosmic",
    canvas: ["#000000", "#05050A", "#0A0A14"],
    glows: [
      ["#FF9966", 0.1, 0.1, 0.08, 360],
      ["#9999FF", 0.12, 0.92, 0.92, 420],
    ],
    header: ["#16110C", "#0E0B16"],
    headerOutline: "rgba(255,153,102,0.5)",
    avatarRing: ["#FF9966", "#CC99CC"],
    heat: [white(0.06), "#4D3319", "#996633", "#FF9966", "#FFCC99"],
    tiles: ["#FF9966", "#FFCC99", "#CC99CC", "#9999FF", "#FF9900", "#CC6666", "#99CCFF", "#FFCC66", "#CC99FF", "#9999CC"],
    accent: "#FF9966",
    secondAccent: "#9999FF",
    type: { width: "compressed", uppercase: true, tracking: 1 },
    nameInk: "#FF9966",
    surface: "rgba(8,8,14,0.92)",
  },
  nebula: {
    family: "cosmic",
    canvas: ["#0B0620", "#160A35", "#0A1530"],
    glows: [
      ["#E64980", 0.32, 0.12, 0.18, 420],
      ["#7048E8", 0.38, 0.88, 0.36, 480],
      ["#15AABF", 0.26, 0.28, 0.86, 420],
      ["#F783AC", 0.18, 0.92, 0.96, 360],
    ],
    header: ["#2A1650", "#1A2A5A"],
    avatarRing: ["#F783AC", "#74C0FC"],
    heat: [white(0.07), "#2B1D5C", "#5F3DC4", "#B197FC", "#F8F0FC"],
    tiles: ["#B197FC", "#74C0FC", "#F783AC", "#9775FA", "#63E6BE", "#DA77F2", "#66D9E8", "#FFA8A8", "#E599F7", "#A5B4CB"],
    accent: "#B197FC",
    secondAccent: "#63E6BE",
    nameGlow: "#B197FC",
    surface: "rgba(14,7,38,0.55)",
  },
  halloween: {
    family: "seasonal",
    canvas: ["#0D0612", "#1A0B24", "#140A0A"],
    glows: [
      ["#FF8C1A", 0.3, 0.9, 0.02, 360],
      ["#7B2CBF", 0.32, 0.08, 0.6, 420],
      ["#2D6A4F", 0.16, 0.5, 1.02, 400],
    ],
    header: ["#2A1236", "#1E0F1A"],
    headerOutline: "rgba(255,140,26,0.4)",
    avatarRing: ["#FF8C1A", "#9D4EDD"],
    // GitHub's own Halloween calendar.
    heat: [white(0.07), "#631C03", "#BD561D", "#FA7A18", "#FDDF68"],
    tiles: ["#FF8C1A", "#9D4EDD", "#FFB627", "#52B788", "#C77DFF", "#FF6D00", "#80ED99", "#FF9E00", "#E0AAFF", "#B8B8B8"],
    accent: "#FA7A18",
    secondAccent: "#9D4EDD",
    type: { design: "serif" },
    nameInk: "#FF8C1A",
    nameGlow: "#FF6D00",
    topBand: 34,
    bottomBand: 40,
    surface: "rgba(18,8,24,0.6)",
  },
  christmas: {
    family: "seasonal",
    canvas: ["#06281D", "#0B1F33", "#081426"],
    glows: [
      ["#FFD166", 0.22, 0.86, 0.04, 360],
      ["#E63946", 0.22, 0.08, 0.9, 420],
      ["#2D6A4F", 0.32, 0.1, 0.14, 420],
    ],
    header: ["#1B4332", "#14213D"],
    headerOutline: white(0.22),
    avatarRing: ["#E63946", "#FFD166"],
    heat: [white(0.07), "#1B4332", "#2D6A4F", "#52B788", "#FFD166"],
    tiles: ["#E63946", "#52B788", "#FFD166", "#74C0FC", "#E63946", "#52B788", "#FFD166", "#FF8FA3", "#95D5B2", "#D4D4D4"],
    accent: "#52B788",
    secondAccent: "#FFD166",
    type: { design: "rounded" },
    topBand: 30,
    bottomBand: 40,
    surface: "rgba(8,35,25,0.55)",
  },
};

// ─── The light sides ───
//
// Every dark look but Midnight, whose light side is Daylight, has one of its
// own, `<look>-light`, for readers on GitHub's light theme. They are
// glancecard's: FinderGit draws its looks on one ground. A rule derives each
// from its dark look, so the eight stay one family: the look's glows at 60%,
// its calendar turned around (on paper the darkest is the most), its
// lettering, and every accent darkened until it reads at 4.5:1 on a panel.
// A dark calendar's brightest level is near white, lost on an empty day:
// a level that does not stand off the empty one by 1.15:1 takes the middle
// of the next level and the empty one.
// What a rule cannot know is set by hand below: the paper, and for Halloween
// the header and GitHub's own light Halloween calendar. Their decorations
// are drawn in an ink that shows on paper (src/decor.js).

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (c) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
/** `a` moved toward `b` by `t`. */
const mix = (a, b, t) => hexOf(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
/** An rgba() fill laid over the opaque `under`. */
function over(fill, under) {
  const [r, g, b, a] = fill.match(/[\d.]+/g).map(Number);
  return hexOf(rgb(under).map((v, i) => v + ([r, g, b][i] - v) * a));
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG's contrast ratio of two opaque colours. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
function hsl(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l];
}
function fromHsl([h, s, l]) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return hexOf([0, 8, 4].map((n) => (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255));
}
/**
 * `hex` darkened a step at a time, its hue and saturation kept, until it
 * reads at `target` on `ground`. A yellow turns to gold on the way, as it
 * does in print: darkened as it is, it would be olive.
 */
function deepen(hex, ground, target) {
  const [h, s, l] = hsl(hex);
  const hue = h >= 45 && h <= 70 ? 40 : h;
  let c = hex;
  for (let v = l; contrast(c, ground) < target && v > 0; v -= 0.01) c = fromHsl([hue, s, v]);
  return c;
}

const LIGHT_SIDES = {
  aurora: { canvas: ["#EEF8F5", "#EEF2FA", "#F5EFFA"] },
  "upside-down": { canvas: ["#F8F1EA", "#F3E9E1", "#EFE2DB"] },
  hyperspace: { canvas: ["#F4F7FD", "#EBF0FA", "#E5ECF8"] },
  bridge: { canvas: ["#F7F4EF", "#F2EFEA", "#EFECF3"] },
  nebula: { canvas: ["#F9F2FB", "#F3EFFB", "#FBEFF4"] },
  halloween: {
    // Parchment, warmer at the bottom where the pumpkins sit.
    canvas: ["#FBF4E6", "#F7EBD8", "#F3E3D3"],
    header: ["#FFE2C0", "#EADCF4"],
    heat: ["#ECE3D2", "#FFEE4A", "#FFC501", "#FE9600", "#03001C"],
    surface: "rgba(255,251,244,0.8)",
  },
  christmas: { canvas: ["#EEF5F1", "#EAF1F6", "#F0F4F8"] },
};

/** A dark look's calendar levels on paper: the empty day, then the four turned around. */
function calendar(heat) {
  const empty = LOOKS.daylight.heat[0];
  const levels = heat.slice(1).reverse();
  return [empty, ...levels.map((c, i) => (contrast(c, empty) < 1.15 && levels[i + 1] ? mix(levels[i + 1], empty, 0.45) : c))];
}

/** The light side of the dark look `look`: by rule, but for what `hand` sets. */
function lightSide(look, hand) {
  const L = LOOKS[look];
  const surface = hand.surface ?? white(0.74);
  const panel = over(surface, hand.canvas[1]);
  const deep = (c, target = 4.5) => deepen(c, panel, target);
  const accent = L.accent ?? L.heat[4];
  const second = L.secondAccent ?? "#38D9A9";
  return {
    family: L.family,
    isDark: false,
    canvas: hand.canvas,
    glows: L.glows.map(([c, o, x, y, r]) => [c, Math.round(o * 600) / 1000, x, y, r]),
    header: hand.header ?? [mix(accent, "#FFFFFF", 0.84), mix(second, "#FFFFFF", 0.84)],
    headerOutline: `rgba(${rgb(accent).join(",")},0.3)`,
    avatarRing: L.avatarRing.map((c) => (c.startsWith("#") ? deep(c, 3) : c)),
    heat: hand.heat ?? calendar(L.heat),
    tiles: L.tiles?.map((c) => deep(c)),
    accent: deep(accent),
    secondAccent: deep(second),
    type: L.type,
    nameInk: L.nameInk && deep(L.nameInk),
    topBand: L.topBand,
    bottomBand: L.bottomBand,
    surface,
  };
}

for (const [look, hand] of Object.entries(LIGHT_SIDES)) LOOKS[`${look}-light`] = lightSide(look, hand);

/** Every look's name: FinderGit's nine in its order, then the light sides. */
export const LOOK_NAMES = Object.keys(LOOKS);

/** The light side of a dark look, the look itself for a light one. */
export const lightOf = (look) => (LOOKS[look].isDark === false ? look : look === "midnight" ? "daylight" : `${look}-light`);

/** What a theme input may name: the looks, and `dark` and `light`. */
export const ALIASES = { dark: "midnight", light: "daylight" };
export const THEME_NAMES = ["dark", "light", ...LOOK_NAMES];

// The accents the classic looks give the cards' figures and panels, bright
// on a dark ground and deeper on paper, where a bright yellow all but
// disappears.
const CLASSIC = {
  dark: { blue: "#60a5fa", cyan: "#22d3ee", yellow: "#facc15", indigo: "#818cf8", teal: "#2dd4bf", purple: "#c084fc", green: "#4ade80", orange: "#fb923c", rose: "#fb7185", slate: "#94a3b8", sky: "#38bdf8" },
  light: { blue: "#0969da", cyan: "#0e7490", yellow: "#9a6700", indigo: "#4f46e5", teal: "#0f766e", purple: "#8250df", green: "#1a7f37", orange: "#bc4c00", rose: "#cf2255", slate: "#59636e", sky: "#0969da" },
};
// The order of a look's ten tiles, as named accents.
const TILE_ROLES = ["blue", "cyan", "yellow", "indigo", "teal", "purple", "green", "orange", "rose", "slate"];

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
const FACES = {
  default: FONT,
  serif: `"New York", ui-serif, "Iowan Old Style", Georgia, "Times New Roman", serif`,
  rounded: `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", Quicksand, ${FONT}`,
};

/** `hex` with an alpha channel, for tints of an accent. */
export const alpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/**
 * Whether a look is worn on `day` (YYYY-MM-DD): always, but Halloween only
 * from 1 October to 2 November and Christmas from 1 December to 6 January,
 * their light sides with them.
 */
export function inSeason(name, day) {
  const look = name.replace(/-light$/, "");
  const [, m, d] = day.split("-").map(Number);
  if (look === "halloween") return m === 10 || (m === 11 && d <= 2);
  if (look === "christmas") return m === 12 || (m === 1 && d <= 6);
  return true;
}

/**
 * The look a theme name wears at `now` in `timeZone`: its alias resolved,
 * and Midnight for a seasonal look out of its season, Daylight for its light
 * side, so a Halloween card is Midnight in November and Halloween again next
 * October.
 */
export function resolveLook(name, { now = new Date(), timeZone = "UTC", allSeasons = false } = {}) {
  const look = ALIASES[name] ?? name;
  if (!LOOKS[look]) throw new Error(`unknown theme "${name}" (choose from ${THEME_NAMES.join(", ")})`);
  if (allSeasons || inSeason(look, clock(timeZone).day(now))) return look;
  return LOOKS[look].isDark === false ? "daylight" : "midnight";
}

/** Everything the renderers draw with, for one look. */
export function theme(look) {
  const L = LOOKS[look];
  if (!L) throw new Error(`unknown look "${look}"`);
  const dark = L.isDark !== false;
  const ink = dark ? "#e6edf3" : "#111827";
  const shade = (a) => (dark ? `rgba(230,237,243,${a})` : `rgba(17,24,39,${a})`);
  const named = L.tiles ? Object.fromEntries(TILE_ROLES.map((role, i) => [role, L.tiles[i]])) : { ...CLASSIC[dark ? "dark" : "light"] };
  if (L.tiles) named.sky = L.tiles[1];
  const accent = {
    ...named,
    // The calendar's own colour, and the languages'.
    contributions: L.accent ?? L.heat[dark ? 4 : 3],
    languages: L.secondAccent ?? (dark ? "#38D9A9" : "#0CA678"),
  };
  const type = { design: "default", width: "standard", uppercase: false, tracking: 0, ...L.type };
  return {
    name: look,
    family: L.family,
    isDark: dark,
    canvas: L.canvas,
    glows: L.glows,
    frame: dark ? white(0.1) : "rgba(0,0,0,0.08)",
    panel: { fill: L.surface ?? (dark ? white(0.045) : white(0.74)), stroke: dark ? white(0.09) : "rgba(0,0,0,0.08)" },
    tile: { from: dark ? 0.3 : 0.17, to: dark ? 0.11 : 0.05, stroke: dark ? 0.3 : 0.26 },
    chip: { fill: dark ? white(0.06) : "rgba(0,0,0,0.045)", stroke: dark ? white(0.08) : "rgba(0,0,0,0.08)", tint: dark ? 0.15 : 0.1, tintStroke: dark ? 0.2 : 0.24 },
    link: { fill: dark ? white(0.05) : white(0.7), icon: shade(0.7) },
    off: { fill: dark ? white(0.03) : "rgba(0,0,0,0.02)", icon: shade(0.4) },
    track: dark ? white(0.08) : "rgba(0,0,0,0.08)",
    dot: dark ? white(0.16) : "rgba(0,0,0,0.18)",
    ring: dark ? white(0.18) : "rgba(0,0,0,0.14)",
    placeholder: dark ? "#3b4256" : "#d0d7de",
    levels: L.heat,
    header: L.header,
    headerOutline: L.headerOutline ?? (dark ? white(0.16) : "rgba(0,0,0,0.06)"),
    avatarRing: L.avatarRing,
    repoHero: { from: [accent.contributions, dark ? 0.26 : 0.1], to: [accent.languages, dark ? 0.08 : 0.04], stroke: alpha(accent.contributions, dark ? 0.25 : 0.3) },
    spark: dark ? 0.32 : 0.22,
    text: {
      base: ink,
      strong: dark ? "#ffffff" : ink,
      high: dark ? shade(0.95) : ink,
      body: shade(0.88),
      soft: shade(0.75),
      muted: shade(dark ? 0.6 : 0.66),
      meta: shade(dark ? 0.55 : 0.6),
      faint: shade(dark ? 0.5 : 0.48),
      off: shade(0.45),
      ghost: shade(dark ? 0.42 : 0.45),
    },
    accent,
    type,
    face: type.width === "compressed" ? FONT : FACES[type.design],
    nameInk: L.nameInk ?? null,
    nameGlow: L.nameGlow ?? null,
    topBand: L.topBand ?? 0,
    bottomBand: L.bottomBand ?? 0,
  };
}

/** The look's own lettering for display text: capitals where it sets them. */
export const display = (t, s) => (t.type.uppercase ? String(s).toUpperCase() : String(s));

/** The stylesheet both cards share, filled from a look. */
export function styles(t) {
  const x = t.text;
  const disp = [
    `font-family: ${t.face};`,
    t.type.width === "compressed" ? "font-stretch: condensed;" : "",
    t.type.tracking ? `letter-spacing: ${t.type.tracking}px;` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `
  text { font-family: ${FONT}; fill: ${x.base}; }
  .mono, .tagname { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
  .disp { ${disp} }
  .h-name { font-size: 26px; font-weight: 700; fill: ${x.strong}; }
  .h-sub { font-size: 12.5px; fill: ${x.muted}; }
  .name { font-size: 20px; font-weight: 700; fill: ${x.strong}; }
  .login { font-size: 13px; fill: ${x.muted}; }
  .bio { font-size: 13px; fill: ${x.body}; }
  .h-meta { font-size: 11.5px; fill: ${x.muted}; }
  .updated { font-size: 11px; fill: ${x.faint}; }
  .desc { font-size: 15px; font-weight: 700; fill: ${x.strong}; }
  .pill { font-size: 11.5px; font-weight: 600; fill: ${x.body}; }
  .pill-off { font-size: 11.5px; font-weight: 600; fill: ${x.off}; }
  .pill-k { font-size: 11.5px; fill: ${x.soft}; }
  .pill-v { font-size: 11.5px; font-weight: 700; fill: ${x.strong}; }
  .big { font-size: 34px; font-weight: 700; fill: ${x.strong}; }
  .big-cap { font-size: 12px; font-weight: 600; fill: ${x.soft}; }
  .value { font-size: 26px; font-weight: 700; fill: ${x.strong}; }
  .unit { font-size: 14px; font-weight: 600; fill: ${x.soft}; }
  .label { font-size: 12px; font-weight: 600; fill: ${x.high}; }
  .sub { font-size: 10.5px; fill: ${x.meta}; }
  .title { font-size: 14px; font-weight: 700; }
  .caption { font-size: 12px; font-weight: 600; fill: ${x.muted}; }
  .headline { font-size: 12.5px; font-weight: 600; fill: ${x.body}; }
  .section { font-size: 11.5px; font-weight: 600; fill: ${x.muted}; }
  .axis { font-size: 10px; fill: ${x.faint}; }
  .row { font-size: 12.5px; font-weight: 500; fill: ${x.high}; }
  .pct { font-size: 11.5px; fill: ${x.muted}; }
  .commit { font-size: 13px; font-weight: 600; fill: ${x.high}; }
  .meta { font-size: 11px; fill: ${x.meta}; }
  .tagname { font-size: 13px; font-weight: 700; fill: ${x.strong}; }
  .excerpt { font-size: 11.5px; fill: ${x.muted}; }
  .who { font-size: 13px; font-weight: 600; fill: ${x.high}; }
  .count { font-size: 12px; font-weight: 700; fill: ${x.base}; }
  .foot { font-size: 11px; fill: ${x.ghost}; }
  .panel { fill: ${t.panel.fill}; stroke: ${t.panel.stroke}; }`;
}

// The two the cards render by default, kept by name for the tests and the
// fixtures' golden files.
export const THEMES = { dark: theme("midnight"), light: theme("daylight") };
