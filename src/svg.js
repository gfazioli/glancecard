// Drawing primitives shared by both cards, bound to a look: the frame and
// its decorations, panels and their titles, pills that flow and wrap, icons,
// the sparkline and the year chart.

import { decorate } from "./decor.js";
import { OCTICONS } from "./icons.js";
import { alpha, display, styles } from "./theme.js";
import { compact, esc, fit, textWidth } from "./text.js";
import { daysBetween, MONTHS } from "./time.js";

export const W = 880;
export const PAD = 24;
export const IW = W - PAD * 2;
export const GAP = 12;
export const SECTION = 16;
export const HALF = (IW - SECTION) / 2;

/** How a year of days is drawn: a line of daily counts, or GitHub's calendar of squares. */
export const CALENDARS = ["chart", "grid"];

/**
 * A value axis for counts up to `max`: a round step (1, 2 or 5 times a power
 * of ten, never under 1) and the first multiple of it at or above `max`.
 */
export function ticks(max, count = 4) {
  if (max <= 0) return { step: 1, top: 1 };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw));
  return { step, top: Math.ceil(max / step) * step };
}

/** A smooth path through `pts`, its control points held between `top` and `bottom`. */
function smooth(pts, top, bottom) {
  const clamp = (v) => Math.min(bottom, Math.max(top, v));
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * A path through `pts` (x increasing) that never turns back on itself: a
 * running total drawn with it rises or holds, where a smooth curve would dip
 * before a jump and overshoot after it (Steffen's monotone cubic).
 */
function monotone(pts) {
  const n = pts.length;
  const slope = (i) => (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1);
  const tangents = pts.map((p, i) => {
    if (i === 0 || i === n - 1) return null;
    const h0 = p[0] - pts[i - 1][0];
    const h1 = pts[i + 1][0] - p[0];
    const s0 = slope(i - 1);
    const s1 = slope(i);
    const mid = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
    return (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(mid)) || 0;
  });
  // The ends lean as far as the curve next to them allows.
  if (n > 2) {
    tangents[0] = (3 * slope(0) - tangents[1]) / 2;
    tangents[n - 1] = (3 * slope(n - 2) - tangents[n - 2]) / 2;
  } else {
    tangents[0] = tangents[n - 1] = slope(0);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = (pts[i + 1][0] - pts[i][0]) / 3;
    d += ` C${(pts[i][0] + dx).toFixed(1)} ${(pts[i][1] + dx * tangents[i]).toFixed(1)} ${(pts[i + 1][0] - dx).toFixed(1)} ${(pts[i + 1][1] - dx * tangents[i + 1]).toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

export function kit(t) {
  const icon = (name, x, y, fill, size = 16) => {
    const paths = OCTICONS[name].map((d) => `<path d="${d}"/>`).join("");
    return `<g transform="translate(${x} ${y}) scale(${size / 16})" fill="${fill}">${paths}</g>`;
  };

  const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" class="panel"/>`;

  /** Display text in the look's lettering, clipped to `max` px. */
  const disp = (s, max, size, weight) => {
    const text = display(t, s);
    return max ? fit(text, max - t.type.tracking * text.length, size, weight) : text;
  };

  // The title's colour goes in style=, not fill=: the stylesheet's `text`
  // rule outranks a presentation attribute and would paint every title grey.
  const panelTitle = (x, y, name, color, title, right) => `
  ${icon(name, x + 18, y + 16, color)}
  <text x="${x + 42}" y="${y + 29}" class="title disp" style="fill: ${color}">${esc(disp(title))}</text>${
    right ? `\n  <text x="${right.x}" y="${y + 29}" class="caption" text-anchor="end">${esc(right.text)}</text>` : ""
  }`;

  /** A pill tinted with `tint` (an accent), or neutral. */
  function pill(x, y, { label, value, icon: name, color = t.text.faint, tint, fill, stroke, labelClass = "pill" }) {
    const h = 22;
    const padX = 9;
    const iconW = name ? 18 : 0;
    const labelW = textWidth(label, 11.5, value ? 400 : 600);
    const valueW = value ? 5 + textWidth(value, 11.5, 700) : 0;
    const w = padX * 2 + iconW + labelW + valueW;
    const bg = fill ?? (tint ? alpha(tint, t.chip.tint) : t.chip.fill);
    const line = stroke ?? (tint ? alpha(tint, t.chip.tintStroke) : t.chip.stroke);
    const svg = `
  <rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${bg}" stroke="${line}"/>
  ${name ? icon(name, x + padX - 1, y + 4, color, 14) : ""}
  <text x="${(x + padX + iconW).toFixed(1)}" y="${y + 15}" class="${value ? "pill-k" : labelClass}">${esc(label)}${
    value ? `<tspan dx="5" class="pill-v">${esc(value)}</tspan>` : ""
  }</text>`;
    return { svg, w };
  }

  /** Pills flowed left to right, wrapping within `maxW`, at most `rows` rows. */
  function flow(x, y, maxW, items, rows = Infinity, rowStep = 30) {
    let cx = x;
    let row = 0;
    const out = [];
    for (const item of items) {
      const { w } = pill(0, 0, item);
      if (cx > x && cx + w > x + maxW) {
        if (row + 1 >= rows) break;
        row += 1;
        cx = x;
      }
      out.push(pill(cx, y + row * rowStep, item).svg);
      cx += w + 8;
    }
    return { svg: out.join(""), h: (row + 1) * rowStep - (rowStep - 22) };
  }

  /** A smooth line over `values`, filled down to its baseline. */
  function sparkline(values, x, y, w, h, color) {
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => [x + (i * w) / (values.length - 1), y + h - (v / max) * (h - 4)]);
    const d = smooth(pts, y, y + h);
    return `
  <path d="${d} L${x + w} ${y + h} L${x} ${y + h} Z" fill="url(#spark)"/>
  <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /**
   * A year of `days` ({ day, count }, oldest first) as a smooth line over its
   * area: the counts on a left axis with a rule at every step, and each month
   * named over its days, from a dashed rule at its first. The plot fills
   * x…x+w and y…y+h; the month names hang 18 px below it.
   */
  function yearChart(days, x, y, w, h, color) {
    const { step, top } = ticks(Math.max(0, ...days.map((d) => d.count)));
    const values = Array.from({ length: top / step + 1 }, (_, i) => i * step);
    const labelW = Math.max(...values.map((v) => textWidth(compact(v), 10))) + 8;
    const px = x + labelW;
    const pw = w - labelW;
    const at = (i) => px + (i * pw) / Math.max(1, days.length - 1);
    const level = (v) => y + h - (v / top) * h;

    const rules = values
      .map((v) => {
        const ry = level(v).toFixed(1);
        return `<line x1="${px}" y1="${ry}" x2="${x + w}" y2="${ry}" stroke="${t.track}"/><text x="${px - 8}" y="${(level(v) + 3.5).toFixed(1)}" class="axis" text-anchor="end">${compact(v)}</text>`;
      })
      .join("");

    // A month is named in the middle of its days, when they leave room for
    // its name: the first, partial month of the year usually does not.
    const firsts = days.flatMap((d, i) => (d.day.endsWith("-01") ? [i] : []));
    const months = firsts
      .map((i, n) => {
        const from = at(i);
        const to = at(firsts[n + 1] ?? days.length - 1);
        const name = MONTHS[Number(days[i].day.slice(5, 7)) - 1];
        const rule = i > 0 ? `<line x1="${from.toFixed(1)}" y1="${y}" x2="${from.toFixed(1)}" y2="${y + h}" stroke="${t.track}" stroke-dasharray="2 3"/>` : "";
        const label = to - from >= textWidth(name, 10) + 4 ? `<text x="${((from + to) / 2).toFixed(1)}" y="${y + h + 18}" class="axis" text-anchor="middle">${name}</text>` : "";
        return rule + label;
      })
      .join("");

    const d = smooth(
      days.map((day, i) => [at(i), level(day.count)]),
      y,
      y + h,
    );
    return `
  ${rules}${months}
  <path d="${d} L${at(days.length - 1).toFixed(1)} ${y + h} L${px} ${y + h} Z" fill="url(#spark)"/>
  <path d="${d}" class="chart-line" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /**
   * A running total over time (`points` of { day, total }, oldest first) as a
   * rising line over its area, filled with `fill`: the totals on a left axis,
   * and the years named over their days (the months, under two years), from
   * a dashed rule at their first day. At most one point per 4 px is drawn.
   * The plot fills x…x+w and y…y+h; the names hang 18 px below it.
   */
  function growthChart(points, x, y, w, h, color, fill) {
    const { step, top } = ticks(points.at(-1).total);
    const values = Array.from({ length: top / step + 1 }, (_, i) => i * step);
    const labelW = Math.max(...values.map((v) => textWidth(compact(v), 10))) + 8;
    const px = x + labelW;
    const pw = w - labelW;
    const start = points[0].day;
    const span = Math.max(1, daysBetween(start, points.at(-1).day));
    const at = (day) => px + (daysBetween(start, day) / span) * pw;
    const level = (v) => y + h - (v / top) * h;

    const rules = values
      .map((v) => {
        const ry = level(v).toFixed(1);
        return `<line x1="${px}" y1="${ry}" x2="${x + w}" y2="${ry}" stroke="${t.track}"/><text x="${px - 8}" y="${(level(v) + 3.5).toFixed(1)}" class="axis" text-anchor="end">${compact(v)}</text>`;
      })
      .join("");

    // Each period is named in the middle of its days, when they leave room
    // for its name.
    const years = span >= 730;
    const firsts = [];
    for (let d = start; d <= points.at(-1).day; ) {
      const [yr, mo] = d.split("-").map(Number);
      const next = years ? `${yr + 1}-01-01` : `${mo === 12 ? yr + 1 : yr}-${String((mo % 12) + 1).padStart(2, "0")}-01`;
      firsts.push({ day: d, name: years ? String(yr) : MONTHS[mo - 1] });
      d = next;
    }
    const end = px + pw;
    const periods = firsts
      .map((f, n) => {
        const from = at(f.day);
        const to = n + 1 < firsts.length ? at(firsts[n + 1].day) : end;
        const rule = n > 0 ? `<line x1="${from.toFixed(1)}" y1="${y}" x2="${from.toFixed(1)}" y2="${y + h}" stroke="${t.track}" stroke-dasharray="2 3"/>` : "";
        const label = to - from >= textWidth(f.name, 10) + 4 ? `<text x="${((from + to) / 2).toFixed(1)}" y="${y + h + 18}" class="axis" text-anchor="middle">${f.name}</text>` : "";
        return rule + label;
      })
      .join("");

    // Weeks beyond one per 4 px are folded into the last of their group,
    // the running total at its end.
    const group = Math.max(1, Math.ceil(points.length / Math.floor(pw / 4)));
    const kept = points.filter((_, i) => i === 0 || i === points.length - 1 || i % group === 0);
    const d = monotone(kept.map((p) => [at(p.day), level(p.total)]));
    return `
  ${rules}${periods}
  <path d="${d} L${end.toFixed(1)} ${y + h} L${px} ${y + h} Z" fill="url(#${fill})"/>
  <path d="${d}" class="growth-line" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /** A round avatar, or a disc when the image could not be fetched. */
  function avatar(id, data, cx, cy, r, ring, ringWidth = 1) {
    const face = data
      ? `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image href="${data}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.placeholder}"/>`;
    return `${face}
    <circle cx="${cx}" cy="${cy}" r="${r + ringWidth / 2}" fill="none" stroke="${ring}" stroke-width="${ringWidth}"/>`;
  }

  /**
   * The whole document: the look's ground and glows, the decorations behind,
   * the frame, `body`, then the decorations in front. `contentTop` is where
   * the content starts, `ledge` the first panel's top edge.
   */
  function frame({ height, title, desc, defs = "", body, contentTop = PAD, ledge = PAD }) {
    const decor = decorate(t.name, { width: W, height, contentTop, ledge });
    const glows = t.glows
      .map(
        ([color, opacity, x, y, r], i) => `
  <radialGradient id="glow-${i}" gradientUnits="userSpaceOnUse" cx="${(x * W).toFixed(1)}" cy="${(y * height).toFixed(1)}" r="${r}">
    <stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>
    <stop offset="1" stop-color="${color}" stop-opacity="0"/>
  </radialGradient>`,
      )
      .join("");
    const lit = t.glows.map((_, i) => `<rect width="${W}" height="${height}" rx="18" fill="url(#glow-${i})"/>`).join("\n");
    const nameGlow = t.nameGlow
      ? `
  <filter id="name-glow" x="-20%" y="-60%" width="140%" height="220%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/>
    <feFlood flood-color="${t.nameGlow}" flood-opacity="0.85"/>
    <feComposite in2="blur" operator="in"/>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`
      : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>${styles(t)}
</style>
<defs>
  <clipPath id="card"><rect width="${W}" height="${height}" rx="18"/></clipPath>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${t.canvas[0]}"/>
    <stop offset="0.5" stop-color="${t.canvas[1]}"/>
    <stop offset="1" stop-color="${t.canvas[2]}"/>
  </linearGradient>${glows}${nameGlow}${decor.defs ? `\n  ${decor.defs}` : ""}${defs}
</defs>
<g clip-path="url(#card)">
<rect width="${W}" height="${height}" fill="url(#bg)"/>
${lit}${decor.behind ? `\n<g aria-hidden="true">${decor.behind}</g>` : ""}
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${height - 1}" rx="17.5" fill="none" stroke="${t.frame}"/>
${body}${decor.front ? `\n<g clip-path="url(#card)" aria-hidden="true">${decor.front}</g>` : ""}
</svg>
`;
  }

  /** Diagonal gradients for stat tiles, one per accent. */
  const tileGradients = (colors) =>
    colors
      .map(
        (c, i) => `
  <linearGradient id="tile-${i}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c}" stop-opacity="${t.tile.from}"/>
    <stop offset="1" stop-color="${c}" stop-opacity="${t.tile.to}"/>
  </linearGradient>`,
      )
      .join("");

  /** Stat tiles in rows of `cols`: icon, big value (with an optional unit), label, sub-line. */
  function tiles(items, y, cols) {
    const w = (IW - GAP * (cols - 1)) / cols;
    const h = 98;
    const svg = items
      .map((item, i) => {
        const x = (PAD + (i % cols) * (w + GAP)).toFixed(1);
        const ty = y + Math.floor(i / cols) * (h + GAP);
        const tx = (Number(x) + 14).toFixed(1);
        return `
  <g>
    <rect x="${x}" y="${ty}" width="${w.toFixed(1)}" height="${h}" rx="14" fill="url(#tile-${i})" stroke="${alpha(item.color, t.tile.stroke)}"/>
    ${icon(item.icon, Number(tx), ty + 14, item.color)}
    <text x="${tx}" y="${ty + 60}" class="value disp">${esc(item.value)}${item.unit ? `<tspan dx="4" class="unit">${item.unit}</tspan>` : ""}</text>
    <text x="${tx}" y="${ty + 78}" class="label disp">${esc(disp(item.label, w - 28, 12, 600))}</text>
    <text x="${tx}" y="${ty + 91}" class="sub">${esc(fit(item.sub, w - 28, 10.5))}</text>
  </g>`;
      })
      .join("");
    return { svg, h: Math.ceil(items.length / cols) * (h + GAP) - GAP };
  }

  return { t, icon, panel, panelTitle, disp, pill, flow, sparkline, yearChart, growthChart, avatar, frame, tileGradients, tiles };
}
