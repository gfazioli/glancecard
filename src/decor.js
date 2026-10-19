// The looks' decorations, after FinderGit's ProfileCardDecor.swift. Behind
// the content: what shows between and through the panels (stars, streaks,
// spores, snow). In front: only in the card's margins and its top and bottom
// bands, never over a figure. Drawn from fixed seeds, so a card is the same
// picture every day its data is. A light side draws its dark look's, in an
// ink that shows on paper where the dark look draws in white.

const f = (n) => Number(n.toFixed(1));

/** A small deterministic generator (mulberry32): the same decoration every time. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, lo, hi) => lo + r() * (hi - lo);

const disc = (x, y, r, fill, opacity = 1) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity.toFixed(2)}"` : ""}/>`;

/** A soft light: a disc filled with a radial fade of `color`. */
function glow(defs, x, y, radius, color, opacity) {
  const id = `fade-${color.replace("#", "")}`;
  defs.add(`<radialGradient id="${id}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
  return disc(x, y, radius, `url(#${id})`, opacity);
}

/** A four-pointed glint. */
const sparkle = (x, y, s, fill) =>
  `<path d="M${f(x)} ${f(y - s)}Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)}Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}Z" fill="${fill}"/>`;

function stars(r, w, h, count, size, alpha, colour = "#fff") {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = between(r, 0, w);
    const y = between(r, 0, h);
    out += disc(x, y, between(r, ...size), colour, between(r, ...alpha));
  }
  return out;
}

// ─── Behind ──────────────────────────────────────────────────────────────────

function starCloud(w, h, defs, { star = "#fff", glint = "#FFFFFF", sparkleInk = "rgba(255,255,255,0.9)", wisp = 0.22, alpha = [0.25, 0.85] } = {}) {
  const r = seeded(0x4e45);
  defs.add(`<filter id="wisp" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>`);
  const wisps = ["#F783AC", "#9775FA", "#66D9E8", "#E599F7"]
    .map((c, i) => {
      const cx = w * [0.2, 0.75, 0.35, 0.85][i];
      const cy = h * [0.3, 0.2, 0.7, 0.75][i];
      return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="220" ry="70" fill="${c}" opacity="${wisp}"/>`;
    })
    .join("");
  let glints = "";
  const field = stars(r, w, h, 190, [0.35, 1.2], alpha, star);
  for (let i = 0; i < 12; i++) {
    const x = between(r, 0, w);
    const y = between(r, 0, h);
    const reach = between(r, 3, 7);
    glints += glow(defs, x, y, reach * 2.2, glint, 0.25) + sparkle(x, y, reach, sparkleInk);
  }
  return `<g filter="url(#wisp)">${wisps}</g>${field}${glints}`;
}

function jumpStreaks(w, h, defs, { star = "#fff", tints = ["#CFEFFF", "#FFFFFF"], strength = 1, alpha = [0.3, 0.85] } = {}) {
  const r = seeded(0x4859);
  const field = stars(r, w, h, 160, [0.3, 1.1], alpha, star);
  const cx = w * 0.5;
  const cy = h * 0.4;
  let streaks = "";
  for (let i = 0; i < 130; i++) {
    const angle = between(r, 0, 2 * Math.PI);
    const start = between(r, 50, 320);
    const length = between(r, 30, 280);
    const [x1, y1] = [cx + Math.cos(angle) * start, cy + Math.sin(angle) * start];
    const [x2, y2] = [cx + Math.cos(angle) * (start + length), cy + Math.sin(angle) * (start + length)];
    const tint = r() < 0.5 ? tints[0] : tints[1];
    const opacity = between(r, 0.25, 0.55) * strength;
    const width = between(r, 0.5, 1.5);
    defs.add(
      `<linearGradient id="streak-${i}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"><stop offset="0" stop-color="${tint}" stop-opacity="0"/><stop offset="1" stop-color="${tint}" stop-opacity="${opacity.toFixed(2)}"/></linearGradient>`,
    );
    streaks += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="url(#streak-${i})" stroke-width="${f(width)}"/>`;
  }
  return field + streaks;
}

function spores(w, h, defs, ash = ["#FFFFFF", "#FFB4A8"]) {
  const r = seeded(0x5157);
  defs.add(`<filter id="spore" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter>`);
  let out = "";
  for (let i = 0; i < 80; i++) {
    const x = between(r, 0, w);
    const y = between(r, 0, h);
    const colour = r() < 0.5 ? ash[0] : ash[1];
    out += disc(x, y, between(r, 0.8, 2.6), colour, between(r, 0.12, 0.42));
  }
  return `<g filter="url(#spore)">${out}</g>`;
}

/** A six-armed snowflake, centred on x, y. */
function snowflake(x, y, side) {
  const arm = side / 2;
  const twig = arm * 0.38;
  let d = "";
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    const [dx, dy] = [Math.cos(a) * arm, Math.sin(a) * arm];
    d += `M${f(x - dx)} ${f(y - dy)}L${f(x + dx)} ${f(y + dy)}`;
  }
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const [bx, by] = [x + Math.cos(a) * arm * 0.6, y + Math.sin(a) * arm * 0.6];
    for (const s of [-1, 1]) {
      const b = a + s * 0.75;
      d += `M${f(bx)} ${f(by)}L${f(bx + Math.cos(b) * twig)} ${f(by + Math.sin(b) * twig)}`;
    }
  }
  return d;
}

function snowfall(w, h, ink = "#fff") {
  const r = seeded(0x534e);
  let flakes = "";
  for (let i = 0; i < 56; i++) {
    const side = between(r, 5, 16);
    const x = between(r, 0, w);
    const y = between(r, 0, h);
    flakes += `<path d="${snowflake(x + side / 2, y + side / 2, side)}" stroke="${ink}" stroke-width="${f(Math.max(0.6, side / 14))}" stroke-linecap="round" opacity="${between(r, 0.12, 0.42).toFixed(2)}"/>`;
  }
  return `<g fill="none">${flakes}</g>${stars(r, w, h, 90, [0.7, 1.9], [0.2, 0.6], ink)}`;
}

// ─── In front ────────────────────────────────────────────────────────────────

/** A string of fairy lights sagging along the top band, every bulb lit. */
function fairyLights(w, defs) {
  const colours = ["#FF3B30", "#FFD60A", "#0A84FF", "#30D158", "#FF9F0A", "#BF5AF2"];
  const bulbs = 21;
  const top = 5;
  const sag = 32;
  const anchors = [0, w / 3, (w * 2) / 3, w];
  let wire = `M${anchors[0]} ${top}`;
  for (let i = 1; i < anchors.length; i++) wire += `Q${f((anchors[i - 1] + anchors[i]) / 2)} ${top + sag} ${f(anchors[i])} ${top}`;
  let out = `<path d="${wire}" fill="none" stroke="#2A2A2A" stroke-width="1.4"/>`;
  for (let i = 0; i < bulbs; i++) {
    const along = (i + 0.5) / bulbs;
    const segment = Math.min(2, Math.floor(along * 3));
    const local = along * 3 - segment;
    // The control sits midway, so x runs evenly along each curve and y is
    // the curve's own height there.
    const y = top + sag * 2 * local * (1 - local);
    const x = w * along;
    const colour = colours[i % colours.length];
    out +=
      glow(defs, x, y + 9, 15, colour, 0.6) +
      `<rect x="${f(x - 2)}" y="${f(y)}" width="4" height="4" rx="1" fill="#3A3A3A"/>` +
      `<ellipse cx="${f(x)}" cy="${f(y + 7.75)}" rx="3.3" ry="4.75" fill="${colour}"/>` +
      `<ellipse cx="${f(x - 0.8)}" cy="${f(y + 6.2)}" rx="0.9" ry="1.6" fill="#fff" opacity="0.75"/>`;
  }
  return out;
}

/** Rounded colour rails in the margins, after a starship's console. */
function consoleRails(w, h) {
  const colours = ["#FF9966", "#FFCC99", "#CC99CC", "#9999FF", "#FF9900", "#CC6666", "#99CCFF"];
  const lengths = [140, 46, 220, 70, 30, 180, 90];
  const near = 7;
  const far = 17;
  const reach = 92;
  let out = "";
  for (const top of [true, false]) {
    const y = (v) => (top ? v : h - v);
    const elbow =
      `M${near} ${f(y(reach - 8))}L${near} ${f(y(32))}Q${near} ${f(y(near))} 32 ${f(y(near))}` +
      `L${reach} ${f(y(near))}L${reach} ${f(y(far))}L36 ${f(y(far))}Q${far} ${f(y(far))} ${far} ${f(y(36))}L${far} ${f(y(reach - 8))}Z`;
    out += `<path d="${elbow}" fill="${colours[top ? 0 : 2]}"/>`;
    // The bar along the edge, in segments of the console's colours.
    let x = reach + 4;
    let i = top ? 0 : 3;
    while (x < w - 24) {
      const length = Math.min(lengths[i % lengths.length], w - 24 - x);
      const last = x + length >= w - 24 - 0.5;
      const ry = top ? near : h - far;
      out += `<rect x="${f(x)}" y="${f(ry)}" width="${f(length)}" height="${far - near}"${last ? ` rx="${(far - near) / 2}"` : ""} fill="${colours[i % colours.length]}"/>`;
      x += length + 4;
      i += 1;
    }
  }
  // The rail down the left edge, between the two elbows.
  let y = reach - 4;
  let i = 2;
  while (y < h - reach + 4) {
    const length = Math.min(lengths[(i + 2) % lengths.length], h - reach + 4 - y);
    out += `<rect x="${near}" y="${f(y)}" width="${far - near}" height="${f(length)}" fill="${colours[i % colours.length]}"/>`;
    y += length + 4;
    i += 1;
  }
  return out;
}

function bat(x, y, span) {
  const half = span / 2;
  let d = `M${f(x)} ${f(y - span * 0.14)}a${f(span * 0.09)} ${f(span * 0.15)} 0 1 0 0.01 0Z`;
  for (const side of [-1, 1]) {
    d +=
      `M${f(x)} ${f(y - span * 0.05)}` +
      `Q${f(x + side * half * 0.5)} ${f(y - span * 0.32)} ${f(x + side * half)} ${f(y - span * 0.22)}` +
      `Q${f(x + side * half * 0.92)} ${f(y + span * 0.02)} ${f(x + side * half * 0.66)} ${f(y + span * 0.06)}` +
      `Q${f(x + side * half * 0.5)} ${f(y - span * 0.04)} ${f(x + side * half * 0.34)} ${f(y + span * 0.06)}` +
      `Q${f(x + side * half * 0.16)} ${f(y - span * 0.02)} ${f(x)} ${f(y + span * 0.1)}Z`;
  }
  return `<path d="${d}" fill="#0B0610"/>`;
}

function pumpkin(x, y, size, face, defs) {
  const width = size * 1.3;
  defs.add(`<linearGradient id="pumpkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFA43A"/><stop offset="1" stop-color="#D9480F"/></linearGradient>`);
  let out = face ? glow(defs, x, y, size * 1.4, "#FF8C1A", 0.45) : "";
  const lobe = (cx, rx) => `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(size * 0.42)}"/>`;
  out += `<g fill="url(#pumpkin)">${lobe(x - width / 2 + width * 0.29, width * 0.29)}${lobe(x - width * 0.08 + width * 0.29, width * 0.29)}<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(width * 0.3)}" ry="${f(size / 2)}"/></g>`;
  const ribs = [-0.2, 0.2]
    .map((o) => `M${f(x + width * o * 0.5)} ${f(y - size * 0.44)}Q${f(x + width * o * 1.2)} ${f(y)} ${f(x + width * o * 0.5)} ${f(y + size * 0.44)}`)
    .join("");
  out += `<path d="${ribs}" fill="none" stroke="#B33A00" stroke-opacity="0.6" stroke-width="0.8"/>`;
  out += `<rect x="${f(x - size * 0.06)}" y="${f(y - size * 0.62)}" width="${f(size * 0.13)}" height="${f(size * 0.2)}" rx="1.5" fill="#2D6A4F"/>`;
  if (!face) return out;
  let eyes = "";
  for (const side of [-1, 1]) {
    const [ex, ey] = [x + side * size * 0.2, y - size * 0.1];
    eyes += `M${f(ex - size * 0.09)} ${f(ey + size * 0.07)}L${f(ex)} ${f(ey - size * 0.09)}L${f(ex + size * 0.09)} ${f(ey + size * 0.07)}Z`;
  }
  const left = x - size * 0.32;
  const right = x + size * 0.32;
  const top = y + size * 0.1;
  let mouth = `M${f(left)} ${f(top)}`;
  for (let step = 1; step <= 6; step++) {
    const sx = left + ((right - left) * step) / 6;
    mouth += `L${f(sx - (right - left) / 12)} ${f(top + (step % 2 === 0 ? 0 : size * 0.07))}L${f(sx)} ${f(top)}`;
  }
  mouth += `Q${f(x)} ${f(top + size * 0.38)} ${f(left)} ${f(top)}Z`;
  return `${out}<path d="${eyes}${mouth}" fill="#FFE066"/>`;
}

function halloweenNight(w, h, contentTop, defs, { web: webInk = "#fff", webOpacity = 0.26 } = {}) {
  // A web in the top left corner, in the margin and the top band.
  const reach = 52;
  const spokes = [0, 1, 2, 3, 4, 5].map((k) => (k * (Math.PI / 2)) / 5);
  let web = spokes.map((a) => `M0 0L${f(Math.cos(a) * reach)} ${f(Math.sin(a) * reach)}`).join("");
  for (const ring of [11, 22, 33, 44]) {
    for (let k = 0; k < spokes.length - 1; k++) {
      const [a, b] = [spokes[k], spokes[k + 1]];
      const mid = (a + b) / 2;
      web += `M${f(Math.cos(a) * ring)} ${f(Math.sin(a) * ring)}Q${f(Math.cos(mid) * ring * 0.86)} ${f(Math.sin(mid) * ring * 0.86)} ${f(Math.cos(b) * ring)} ${f(Math.sin(b) * ring)}`;
    }
  }
  let out = `<path d="${web}" fill="none" stroke="${webInk}" stroke-opacity="${webOpacity}" stroke-width="0.7"/>`;
  // The moon in the top band, and bats crossing it.
  const [mx, my] = [w - 74, contentTop / 2];
  defs.add(`<radialGradient id="moon" cx="0.35" cy="0.35" r="0.65"><stop offset="0" stop-color="#FFF3C4"/><stop offset="1" stop-color="#FFC857"/></radialGradient>`);
  out += glow(defs, mx, my, 54, "#FF8C1A", 0.4) + disc(mx, my, 17, "url(#moon)");
  for (const [dx, dy, r] of [[-6, -4, 3], [5, 5, 2.2], [6, -6, 1.6]]) out += disc(mx + dx, my + dy, r, "#E0A040", 0.35);
  for (const [x, y, span] of [[w - 136, 20, 32], [w - 106, 46, 20], [w - 176, 42, 16], [w - 30, 48, 14], [120, 30, 18], [176, 18, 12]]) {
    out += bat(x, y, span);
  }
  // Pumpkins in the bottom band, the big one lit.
  const ground = h - 30;
  out += pumpkin(w / 2 - 34, ground, 20, false, defs) + pumpkin(w / 2 + 34, ground + 1, 17, false, defs) + pumpkin(w / 2, ground - 3, 28, true, defs);
  return out;
}

function christmasTop(w, h, ledge, defs, { threadInk = "#fff", shade = null } = {}) {
  const r = seeded(0x584d);
  const baubles = ["#E63946", "#FFD166", "#52B788", "#D8DEE9", "#74C0FC"];
  let out = "";
  // Baubles on threads, hung from the snow.
  const count = 9;
  for (let i = 0; i < count; i++) {
    const x = 70 + ((w - 140) * i) / (count - 1);
    const thread = between(r, 8, 22);
    const radius = between(r, 5, 7.5);
    const cy = 6 + thread + radius;
    const colour = baubles[i % baubles.length];
    const id = `bauble-${colour.replace("#", "")}`;
    defs.add(`<radialGradient id="${id}" cx="0.32" cy="0.32" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.45" stop-color="${colour}"/><stop offset="1" stop-color="${colour}" stop-opacity="0.8"/></radialGradient>`);
    out +=
      `<line x1="${f(x)}" y1="4" x2="${f(x)}" y2="${f(cy - radius)}" stroke="${threadInk}" stroke-opacity="0.5" stroke-width="0.6"/>` +
      glow(defs, x, cy, radius * 2.4, colour, 0.35) +
      disc(x, cy, radius, `url(#${id})`) +
      `<rect x="${f(x - 1.8)}" y="${f(cy - radius - 2)}" width="3.6" height="2.6" fill="#D4A017"/>`;
  }
  // Snow lying along the card's top edge and on the first panel.
  const drift = (from, to, y, lo, hi) => {
    let x = from;
    let lumps = "";
    while (x < to) {
      const radius = between(r, lo, hi);
      lumps += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(radius)}" ry="${f(radius * 0.7)}"/>`;
      x += radius * 1.3;
    }
    // On paper, white snow needs its shadow to be seen.
    const under = shade ? `<g fill="${shade}" transform="translate(0 1.6)">${lumps}</g>` : "";
    return `${under}<g fill="#fff" fill-opacity="0.92">${lumps}</g>`;
  };
  out += drift(0, w, 4, 7, 12) + drift(38, w - 38, ledge, 4, 8);
  // A tree and two presents in the bottom band.
  const ground = h - 16;
  const cx = w / 2;
  out += glow(defs, cx, ground - 16, 40, "#FFD166", 0.22);
  [[15, 21, 3], [12, 29, 12], [8.5, 36, 20]].forEach(([half, top, bottom], tier) => {
    out += `<path d="M${f(cx)} ${f(ground - top)}L${f(cx + half)} ${f(ground - bottom)}L${f(cx - half)} ${f(ground - bottom)}Z" fill="${["#1B7A4B", "#22915A", "#2DAA6A"][tier]}"/>`;
  });
  out += `<rect x="${f(cx - 2)}" y="${f(ground - 4)}" width="4" height="4" fill="#7A4E2D"/>`;
  for (const [dx, dy, colour] of [[-7, -7, "#E63946"], [6, -10, "#FFD166"], [-4, -17, "#74C0FC"], [4, -24, "#D8DEE9"]]) out += disc(cx + dx, ground + dy, 1.6, colour);
  out += glow(defs, cx, ground - 37, 9, "#FFD166", 0.8) + sparkle(cx, ground - 37, 4.5, "#FFE89A");
  for (const [dx, bw, bh, box, ribbon] of [[-30, 14, 11, "#E63946", "#FFD166"], [24, 12, 9, "#2D6A4F", "#F1FAEE"]]) {
    const [x0, y0] = [cx + dx - bw / 2, ground - bh];
    out +=
      `<rect x="${f(x0)}" y="${f(y0)}" width="${bw}" height="${bh}" rx="1.5" fill="${box}"/>` +
      `<rect x="${f(x0 + bw / 2 - 1)}" y="${f(y0)}" width="2" height="${bh}" fill="${ribbon}"/>` +
      `<rect x="${f(x0)}" y="${f(y0 + bh / 2 - 1)}" width="${bw}" height="2" fill="${ribbon}"/>`;
  }
  return out;
}

/**
 * A look's decorations for a card `width` × `height` whose content starts at
 * `contentTop` and whose first panel's top edge is at `ledge`. Returns the
 * layers' markup and the definitions they use.
 */
export function decorate(look, { width, height, contentTop, ledge }) {
  const defs = new Set();
  const layers = { behind: "", front: "" };
  switch (look) {
    case "upside-down":
      layers.behind = spores(width, height, defs);
      layers.front = fairyLights(width, defs);
      break;
    case "hyperspace":
      layers.behind = jumpStreaks(width, height, defs);
      break;
    case "bridge":
      layers.front = consoleRails(width, height);
      break;
    case "nebula":
      layers.behind = starCloud(width, height, defs);
      break;
    case "halloween":
      layers.behind = stars(seeded(0x4841), width, height, 50, [0.4, 1.3], [0.2, 0.55]);
      layers.front = halloweenNight(width, height, contentTop, defs);
      break;
    case "christmas":
      layers.behind = snowfall(width, height);
      layers.front = christmasTop(width, height, ledge, defs);
      break;
    // The light sides: the dark look's decorations, inked for paper.
    case "upside-down-light":
      layers.behind = spores(width, height, defs, ["#7A1F1F", "#C4161C"]);
      layers.front = fairyLights(width, defs);
      break;
    case "hyperspace-light":
      layers.behind = jumpStreaks(width, height, defs, { star: "#1C2E6E", tints: ["#3A6FB0", "#1C2E6E"], strength: 0.55, alpha: [0.15, 0.45] });
      break;
    case "bridge-light":
      layers.front = consoleRails(width, height);
      break;
    case "nebula-light":
      layers.behind = starCloud(width, height, defs, { star: "#5F3DC4", glint: "#7048E8", sparkleInk: "rgba(95,61,196,0.75)", wisp: 0.16, alpha: [0.15, 0.5] });
      break;
    case "halloween-light":
      layers.behind = stars(seeded(0x4841), width, height, 50, [0.5, 1.4], [0.18, 0.4], "#7A4A22");
      layers.front = halloweenNight(width, height, contentTop, defs, { web: "#3B2340", webOpacity: 0.42 });
      break;
    case "christmas-light":
      layers.behind = snowfall(width, height, "#5B8DB8");
      layers.front = christmasTop(width, height, ledge, defs, { threadInk: "#7A8B99", shade: "#C3D3E2" });
      break;
    default:
      break;
  }
  return { ...layers, defs: [...defs].join("") };
}
