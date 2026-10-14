// Text helpers: escaping, number formats, and width estimates for the system
// font. An SVG inside an <img> cannot measure its own text, so pills are sized
// and long lines clipped from glyph tables measured once in a browser.

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const full = (n) => n.toLocaleString("en-US");

export function compact(n) {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k < 100 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
}

/** A size in KB as [value, unit]. */
export function size(kb) {
  if (kb < 1024) return [String(kb), "KB"];
  const mb = kb / 1024;
  if (mb < 1024) return [mb < 100 ? mb.toFixed(1) : String(Math.round(mb)), "MB"];
  return [(mb / 1024).toFixed(1), "GB"];
}

export const plural = (n, one, many = `${one}s`) => `${full(n)} ${n === 1 ? one : many}`;

// Advance widths of ASCII 32–126 per 100 px, measured in Chrome on macOS for
// the card's font stack. The system font widens its letters at small sizes,
// so body text (under 20 px) reads the 12.5 px table and the big numbers the
// 34 px one. Segoe UI and Noto Sans run narrower or within a few percent,
// which SLACK covers.
const GLYPHS = {
  text: {
    400: [28,31,48,63,63,92,71,29,38,38,47,62,29,47,29,30,63,46,60,62,64,62,63,58,64,63,29,29,62,62,62,51,92,67,65,71,72,59,57,74,74,26,54,66,56,87,74,77,63,77,65,63,62,73,67,96,68,65,66,38,30,38,63,54,50,55,61,56,61,57,36,60,58,24,24,54,25,87,58,58,61,60,39,51,36,58,54,77,52,54,54,38,26,38,63],
    600: [26,34,54,66,66,100,73,33,41,41,48,65,33,48,33,32,66,49,63,65,67,64,66,61,67,66,33,33,65,65,65,54,92,71,68,73,74,61,59,75,77,30,58,69,58,89,76,78,66,78,68,66,64,75,70,99,71,68,67,41,32,41,66,57,50,57,64,57,64,58,39,63,62,27,27,58,28,91,61,60,63,63,42,54,40,61,57,82,56,58,55,41,28,41,66],
    700: [25,35,57,67,67,103,74,34,43,43,48,67,34,48,34,33,68,51,64,67,68,66,68,62,69,68,34,34,67,66,67,55,92,73,69,74,74,62,60,76,78,32,60,71,59,90,76,78,67,78,69,67,65,76,72,100,73,70,67,43,33,43,67,59,50,59,65,58,65,60,41,64,63,28,28,60,29,93,62,61,64,64,44,55,41,62,58,84,58,59,56,43,30,43,67],
  },
  display: {
    400: [22,28,42,62,62,82,68,26,33,33,41,61,23,44,23,29,62,46,58,60,62,60,63,56,61,63,23,23,61,61,61,50,89,65,62,70,69,56,54,72,71,24,51,61,54,84,71,74,59,74,61,60,58,71,64,94,65,62,63,33,29,33,62,52,51,51,56,51,56,52,32,56,55,22,22,50,22,82,54,54,56,56,32,48,31,54,49,73,48,50,48,33,23,33,62],
    600: [21,31,45,64,64,87,70,28,37,37,45,64,24,45,24,31,65,48,60,63,64,62,65,57,64,65,24,24,64,64,64,53,90,68,64,71,70,58,55,73,73,26,55,65,55,86,72,76,62,76,64,63,60,72,67,96,68,66,64,37,31,37,65,56,51,54,59,54,59,55,35,59,58,24,24,53,24,86,57,57,59,59,36,51,35,57,53,78,52,54,50,37,24,37,64],
    700: [21,33,47,65,66,90,71,29,39,39,48,66,25,45,25,31,67,49,61,64,66,64,66,58,66,66,25,25,66,66,66,54,90,70,65,72,71,58,56,74,74,28,57,66,55,87,73,76,63,76,65,64,61,72,69,98,70,67,64,39,31,39,67,57,51,56,61,56,61,57,37,60,60,25,25,55,25,88,59,58,60,60,38,53,37,59,55,80,54,56,52,39,25,39,66],
  },
};
// The few non-ASCII characters the cards write themselves.
const EXTRA = { "·": 33, "—": 90, "…": 90, "’": 33 };
export const SLACK = 1.02;

export function textWidth(s, size, weight = 400, mono = false) {
  const table = GLYPHS[size < 20 ? "text" : "display"][weight >= 650 ? 700 : weight >= 500 ? 600 : 400];
  let units = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (mono) units += c < 0x2e80 ? 60 : 100;
    else units += c >= 32 && c < 127 ? table[c - 32] : (EXTRA[ch] ?? (c < 0x2e80 ? 66 : 100));
  }
  return (units * size * SLACK) / 100;
}

/** `s` clipped with an ellipsis to fit `max` px, never inside a surrogate pair. */
export function fit(s, max, size, weight = 400, mono = false) {
  const t = String(s);
  if (textWidth(t, size, weight, mono) <= max) return t;
  const chars = Array.from(t);
  while (chars.length > 1 && textWidth(`${chars.join("")}…`, size, weight, mono) > max) chars.pop();
  return `${chars.join("").trimEnd()}…`;
}

/** `s` broken into at most `lines` lines of `max` px, the last one clipped. */
export function wrap(s, max, size, weight, lines) {
  const out = [];
  let line = "";
  const words = String(s).split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (textWidth(next, size, weight) <= max || !line) {
      line = next;
      continue;
    }
    if (out.length === lines - 1) return [...out, fit([line, ...words.slice(i)].join(" "), max, size, weight)];
    out.push(line);
    line = words[i];
  }
  if (line) out.push(fit(line, max, size, weight));
  return out;
}

/** The first line of a release note that reads as prose, Markdown removed. */
export function excerpt(body) {
  for (const raw of String(body ?? "").split(/\r?\n/)) {
    const line = raw
      .replace(/<[^>]+>/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]+/g, "")
      .replace(/^\s*(?:[-+>]|\d+\.)\s+/, "")
      .trim();
    if (line && !/^#/.test(raw.trim())) return line;
  }
  return "";
}
