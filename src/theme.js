// The two palettes. Accents are 6-digit hex so a tint can append an alpha;
// the dark one keeps the look of the original cards, the light one follows
// GitHub's light theme so a card sits in a light README without a frame.

export const THEMES = {
  dark: {
    name: "dark",
    bg: ["#1a2238", "#232338"],
    glows: [
      ["#2f6fe0", 0.28],
      ["#7c3aed", 0.2],
    ],
    frame: "rgba(255,255,255,0.10)",
    panel: { fill: "rgba(255,255,255,0.045)", stroke: "rgba(255,255,255,0.09)" },
    tile: { stroke: "rgba(255,255,255,0.10)", from: 0.34, to: 0.08 },
    chip: { fill: "rgba(255,255,255,0.06)", stroke: "rgba(255,255,255,0.08)", tint: 0.15, tintStroke: 0.2 },
    link: { fill: "rgba(255,255,255,0.05)", icon: "rgba(230,237,243,0.7)" },
    off: { fill: "rgba(255,255,255,0.03)", icon: "rgba(230,237,243,0.4)" },
    track: "rgba(255,255,255,0.08)",
    dot: "rgba(255,255,255,0.16)",
    ring: "rgba(255,255,255,0.18)",
    heroRing: "rgba(255,255,255,0.28)",
    placeholder: "#3b4256",
    tagDisc: "#0e3a52",
    levels: ["rgba(255,255,255,0.07)", "#0e4429", "#006d32", "#26a641", "#39d353"],
    repoHero: { from: ["#16a34a", 0.26], to: ["#0f766e", 0.08], stroke: 0.25 },
    profileHero: { from: ["#2d63c4", 0.55], to: ["#2d63c4", 0.16], stroke: "rgba(255,255,255,0.10)" },
    spark: 0.32,
    text: {
      base: "#e6edf3",
      strong: "#ffffff",
      high: "rgba(230,237,243,0.95)",
      body: "rgba(230,237,243,0.88)",
      soft: "rgba(230,237,243,0.75)",
      muted: "rgba(230,237,243,0.6)",
      meta: "rgba(230,237,243,0.55)",
      faint: "rgba(230,237,243,0.5)",
      off: "rgba(230,237,243,0.45)",
      ghost: "rgba(230,237,243,0.42)",
    },
    accent: {
      green: "#4ade80",
      teal: "#2dd4bf",
      cyan: "#22d3ee",
      sky: "#38bdf8",
      blue: "#60a5fa",
      indigo: "#818cf8",
      purple: "#c084fc",
      rose: "#fb7185",
      orange: "#fb923c",
      yellow: "#facc15",
      slate: "#94a3b8",
      contributions: "#39d353",
    },
  },
  light: {
    name: "light",
    bg: ["#f6f8fa", "#eef1f6"],
    glows: [
      ["#0969da", 0.07],
      ["#8250df", 0.06],
    ],
    frame: "rgba(31,35,40,0.12)",
    panel: { fill: "#ffffff", stroke: "rgba(31,35,40,0.10)" },
    tile: { stroke: "rgba(31,35,40,0.10)", from: 0.16, to: 0.04 },
    chip: { fill: "rgba(31,35,40,0.04)", stroke: "rgba(31,35,40,0.10)", tint: 0.1, tintStroke: 0.24 },
    link: { fill: "rgba(255,255,255,0.7)", icon: "#59636e" },
    off: { fill: "rgba(31,35,40,0.02)", icon: "rgba(31,35,40,0.35)" },
    track: "rgba(31,35,40,0.08)",
    dot: "rgba(31,35,40,0.18)",
    ring: "rgba(31,35,40,0.14)",
    heroRing: "rgba(255,255,255,0.9)",
    placeholder: "#d0d7de",
    tagDisc: "#ddf4ff",
    levels: ["#eff2f5", "#aceebb", "#4ac26b", "#2da44e", "#116329"],
    repoHero: { from: ["#1a7f37", 0.1], to: ["#0f766e", 0.03], stroke: 0.3 },
    profileHero: { from: ["#0969da", 0.14], to: ["#0969da", 0.04], stroke: "rgba(9,105,218,0.2)" },
    spark: 0.22,
    text: {
      base: "#1f2328",
      strong: "#1f2328",
      high: "#1f2328",
      body: "rgba(31,35,40,0.86)",
      soft: "rgba(31,35,40,0.72)",
      muted: "#59636e",
      meta: "rgba(31,35,40,0.6)",
      faint: "rgba(31,35,40,0.55)",
      off: "rgba(31,35,40,0.45)",
      ghost: "rgba(31,35,40,0.45)",
    },
    accent: {
      green: "#1a7f37",
      teal: "#0f766e",
      cyan: "#0e7490",
      sky: "#0969da",
      blue: "#0969da",
      indigo: "#4f46e5",
      purple: "#8250df",
      rose: "#cf2255",
      orange: "#bc4c00",
      yellow: "#9a6700",
      slate: "#59636e",
      contributions: "#1a7f37",
    },
  },
};

export const THEME_NAMES = Object.keys(THEMES);

/** `hex` with an alpha channel, for tints of an accent. */
export const alpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/** The stylesheet both cards share, filled from a palette. */
export function styles(t) {
  const x = t.text;
  return `
  text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif; fill: ${x.base}; }
  .mono, .tagname { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
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
