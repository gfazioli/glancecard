// The springs the site's scroll reveals land on, sampled into CSS linear()
// stops: the same closed form, sampler and tempo as the sibling sites'
// (findergit.app, lancetta.app, octoscope's landing), so a card lands the
// same way on all of them. The block in site/index.html between
// springs:begin and springs:end is this output; test/site.test.js fails,
// printing it, when the two differ.

export const SPRINGS = [
  { name: "--gc-spring", f: 1.4, zeta: 0.5, note: "a card landing: overshoots and settles" },
  { name: "--gc-spring-soft", f: 1.8, zeta: 0.75, note: "a heading rising: barely overshoots" },
];

/** 0 at rest, 1 once settled, past 1 on the overshoot; exactly 1 once the envelope is under 2e-5. */
export function springAt(t, f, zeta) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f;
  const a = zeta * w;
  const env = Math.exp(-a * t);
  if (env < 2e-5) return 1;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - env * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t));
}

/** Seconds until the envelope is under 0.4% (underdamped springs only). */
export const springSettle = (f, zeta) => Math.log(250) / (zeta * 2 * Math.PI * f);

/** `v` to at most `digits` decimals, trailing zeros cut. */
function trim(v, digits) {
  let s = v.toFixed(digits);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s === "-0" ? "0" : s;
}

export function springsCSS(indent = "      ") {
  const points = 48;
  const lines = [];
  for (const sp of SPRINGS) {
    const d = springSettle(sp.f, sp.zeta);
    let peak = 0;
    const stops = [];
    for (let i = 0; i <= points; i++) {
      const v = springAt((i / points) * d, sp.f, sp.zeta);
      peak = Math.max(peak, v);
      stops.push(i === 0 ? "0" : i === points ? "1" : `${trim(v, 4)} ${trim((i / points) * 100, 2)}%`);
    }
    const ms = Math.round(d * 1000);
    lines.push(
      `${indent}/* f=${trim(sp.f, 2)} Hz, zeta=${sp.zeta}: overshoot ${trim(Math.max(0, (peak - 1) * 100), 1)}%, ${ms} ms -- ${sp.note} */`,
      `${indent}${sp.name}-duration: ${ms}ms;`,
      `${indent}${sp.name}: linear(`,
      ...stops.map((s, i) => `${indent}  ${s}${i === stops.length - 1 ? "" : ","}`),
      `${indent});`,
    );
  }
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) console.log(springsCSS());
