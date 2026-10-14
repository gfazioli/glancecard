// Drawing primitives shared by both cards, bound to a palette: the frame,
// panels and their titles, pills that flow and wrap, icons, the sparkline.

import { OCTICONS } from "./icons.js";
import { alpha, styles } from "./theme.js";
import { esc, fit, textWidth } from "./text.js";

export const W = 880;
export const PAD = 24;
export const IW = W - PAD * 2;
export const GAP = 12;
export const SECTION = 16;
export const HALF = (IW - SECTION) / 2;

export function kit(t) {
  const icon = (name, x, y, fill, size = 16) => {
    const paths = OCTICONS[name].map((d) => `<path d="${d}"/>`).join("");
    return `<g transform="translate(${x} ${y}) scale(${size / 16})" fill="${fill}">${paths}</g>`;
  };

  const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" class="panel"/>`;

  // The title's colour goes in style=, not fill=: the stylesheet's `text`
  // rule outranks a presentation attribute and would paint every title grey.
  const panelTitle = (x, y, name, color, title, right) => `
  ${icon(name, x + 18, y + 16, color)}
  <text x="${x + 42}" y="${y + 29}" class="title" style="fill: ${color}">${esc(title)}</text>${
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
    const clamp = (v) => Math.min(y + h, Math.max(y, v));
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return `
  <path d="${d} L${x + w} ${y + h} L${x} ${y + h} Z" fill="url(#spark)"/>
  <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /** A round avatar, or a disc when the image could not be fetched. */
  function avatar(id, data, cx, cy, r, ring, ringWidth = 1) {
    const face = data
      ? `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image href="${data}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.placeholder}"/>`;
    return `${face}
    <circle cx="${cx}" cy="${cy}" r="${r + ringWidth / 2}" fill="none" stroke="${ring}" stroke-width="${ringWidth}"/>`;
  }

  /** The whole document: background, glows, frame, then `body`. */
  function frame({ height, title, desc, defs = "", body }) {
    const [g1, g2] = t.glows;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>${styles(t)}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${t.bg[0]}"/>
    <stop offset="1" stop-color="${t.bg[1]}"/>
  </linearGradient>
  <radialGradient id="glow-a" cx="0.12" cy="0.06" r="0.5">
    <stop offset="0" stop-color="${g1[0]}" stop-opacity="${g1[1]}"/>
    <stop offset="1" stop-color="${g1[0]}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow-b" cx="0.9" cy="0.94" r="0.5">
    <stop offset="0" stop-color="${g2[0]}" stop-opacity="${g2[1]}"/>
    <stop offset="1" stop-color="${g2[0]}" stop-opacity="0"/>
  </radialGradient>${defs}
</defs>
<rect width="${W}" height="${height}" rx="18" fill="url(#bg)"/>
<rect width="${W}" height="${height}" rx="18" fill="url(#glow-a)"/>
<rect width="${W}" height="${height}" rx="18" fill="url(#glow-b)"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${height - 1}" rx="17.5" fill="none" stroke="${t.frame}"/>
${body}
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
    <rect x="${x}" y="${ty}" width="${w.toFixed(1)}" height="${h}" rx="14" fill="url(#tile-${i})" stroke="${t.tile.stroke}"/>
    ${icon(item.icon, Number(tx), ty + 14, item.color)}
    <text x="${tx}" y="${ty + 60}" class="value">${esc(item.value)}${item.unit ? `<tspan dx="4" class="unit">${item.unit}</tspan>` : ""}</text>
    <text x="${tx}" y="${ty + 78}" class="label">${esc(fit(item.label, w - 28, 12, 600))}</text>
    <text x="${tx}" y="${ty + 91}" class="sub">${esc(fit(item.sub, w - 28, 10.5))}</text>
  </g>`;
      })
      .join("");
    return { svg, h: Math.ceil(items.length / cols) * (h + GAP) - GAP };
  }

  return { t, icon, panel, panelTitle, pill, flow, sparkline, avatar, frame, tileGradients, tiles };
}
