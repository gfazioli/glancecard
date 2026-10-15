// The profile card: who, ten stat tiles, a year of contributions (a chart of
// daily counts, or GitHub's calendar), the most starred repositories and
// their languages.

import { HALF, IW, kit, PAD, SECTION } from "../svg.js";
import { THEMES } from "../theme.js";
import { compact, esc, fit, full, plural } from "../text.js";
import { formatDay, MONTHS } from "../time.js";

const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

export function renderProfile(m, { theme = THEMES.dark, images = {}, calendar = "chart" } = {}) {
  const k = kit(theme);
  const A = theme.accent;
  const u = m.user;

  // The name in the look's ink, with its glow where it has one.
  const ink = `${theme.nameInk ? ` style="fill: ${theme.nameInk}"` : ""}${theme.nameGlow ? ` filter="url(#name-glow)"` : ""}`;

  function header(y) {
    const h = 104;
    const cx = PAD + 20 + 36;
    const cy = y + h / 2;
    const tx = cx + 56;
    const textW = PAD + IW - 16 - tx;
    const meta = [u.company, u.location, u.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "")].filter(Boolean).join("  ·  ");
    return {
      h,
      svg: `
  <rect x="${PAD}" y="${y}" width="${IW}" height="${h}" rx="14" fill="url(#hero)" stroke="${theme.headerOutline}"/>
  ${k.avatar("avatar", images[u.avatarUrl], cx, cy, 36, "url(#ring)", 3)}
  <text x="${tx}" y="${y + 38}"><tspan class="name disp"${ink}>${esc(k.disp(u.name || u.login))}</tspan><tspan dx="8" class="login">@${esc(u.login)}</tspan></text>
  <text x="${tx}" y="${y + 60}" class="bio">${esc(fit((u.bio || "").trim(), textW, 13))}</text>
  <text x="${tx}" y="${y + 84}" class="h-meta">${esc(fit(meta, textW, 11.5))}</text>
  <text x="${PAD + IW - 16}" y="${y + 28}" class="updated" text-anchor="end">Updated ${formatDay(m.today)}</text>`,
    };
  }

  const tileItems = [
    { icon: "people", color: A.blue, value: compact(u.followers.totalCount), label: "Followers", sub: "on GitHub" },
    { icon: "person", color: A.cyan, value: compact(u.following.totalCount), label: "Following", sub: "developers" },
    { icon: "star", color: A.yellow, value: compact(m.stars), label: "Stars", sub: "across public repos" },
    { icon: "repo", color: A.indigo, value: compact(m.repoCount), label: "Public repos", sub: "owned, non-fork" },
    { icon: "repo-forked", color: A.teal, value: compact(m.forks), label: "Forks", sub: "of my repos" },
    { icon: "git-pull-request", color: A.purple, value: compact(m.counts.prs), label: "Pull requests", sub: `${compact(m.counts.merged)} merged` },
    { icon: "issue-opened", color: A.green, value: compact(m.counts.issues), label: "Issues", sub: "opened" },
    { icon: "git-commit", color: A.orange, value: compact(m.commits), label: "Commits", sub: "last year" },
    { icon: "graph", color: A.rose, value: compact(m.contributedRepos), label: "Contributed", sub: "repos, last year" },
    { icon: "calendar", color: A.slate, value: String(m.years), label: "Years on GitHub", sub: `since ${m.joinedYear}` },
  ];

  function contributions(y) {
    const h = 214;
    const head = `
  ${k.panel(PAD, y, IW, h)}
  ${k.panelTitle(PAD, y, "flame", A.contributions, "Contributions")}
  <text x="${PAD + 18}" y="${y + 52}" class="headline">${full(m.calendar.totalContributions)} contributions in the last year</text>`;
    if (calendar === "chart") return { h, svg: `${head}${k.yearChart(m.days, PAD + 18, y + 76, IW - 36, h - 76 - 38, A.contributions)}` };

    const step = 14;
    const cell = 11;
    const weeks = m.calendar.weeks;
    const gridW = weeks.length * step - (step - cell);
    const labelW = 30;
    const gx = PAD + (IW - gridW - labelW) / 2 + labelW;
    const gy = y + 82;
    const levels = theme.levels;
    const fillOf = (level) => levels[Math.max(0, LEVELS.indexOf(level))];
    const cells = weeks
      .flatMap((week, wi) =>
        week.contributionDays.map(
          (d) => `<rect x="${gx + wi * step}" y="${gy + d.weekday * step}" width="${cell}" height="${cell}" rx="2.5" fill="${fillOf(d.contributionLevel)}"/>`,
        ),
      )
      .join("");

    // A month label sits over the first week that starts in that month; labels
    // closer than three weeks apart would overlap, so the earlier one is dropped.
    const marks = [];
    weeks.forEach((week, wi) => {
      const mo = Number(week.contributionDays[0].date.slice(5, 7)) - 1;
      const prev = wi > 0 ? Number(weeks[wi - 1].contributionDays[0].date.slice(5, 7)) - 1 : -1;
      if (mo !== prev) marks.push({ wi, mo });
    });
    const months = marks
      .filter((mk, i) => !(marks[i + 1] && marks[i + 1].wi - mk.wi < 3))
      .map((mk) => `<text x="${gx + mk.wi * step}" y="${gy - 8}" class="axis">${MONTHS[mk.mo]}</text>`)
      .join("");
    const days = [
      [1, "Mon"],
      [3, "Wed"],
      [5, "Fri"],
    ]
      .map(([row, n]) => `<text x="${gx - 8}" y="${gy + row * step + 9}" class="axis" text-anchor="end">${n}</text>`)
      .join("");
    const lx = gx + gridW - levels.length * step - 30;
    const legend = `
  <text x="${lx - 8}" y="${y + h - 18}" class="axis" text-anchor="end">Less</text>
  ${levels.map((f, i) => `<rect x="${lx + i * step}" y="${y + h - 27}" width="${cell}" height="${cell}" rx="2.5" fill="${f}"/>`).join("")}
  <text x="${lx + levels.length * step + 5}" y="${y + h - 18}" class="axis">More</text>`;

    return { h, svg: `${head}
  ${months}${days}${cells}${legend}` };
  }

  function topRepos(x, y, w, h) {
    const rows = m.topRepos
      .map((r, i) => {
        const ry = y + 80 + i * 21;
        return `
    <circle cx="${x + 23}" cy="${ry - 4}" r="4.5" fill="${r.primaryLanguage?.color ?? "#6e7681"}"/>
    <text x="${x + 36}" y="${ry}" class="row">${esc(fit(r.name, w - 110, 12.5, 500))}</text>
    ${k.icon("star", x + w - 66, ry - 11, A.yellow, 13)}
    <text x="${x + w - 18}" y="${ry}" class="count" text-anchor="end">${full(r.stargazerCount)}</text>`;
      })
      .join("");
    return `
  ${k.panel(x, y, w, h)}
  ${k.panelTitle(x, y, "star", A.yellow, "Top repositories")}
  <text x="${x + 18}" y="${y + 52}" class="headline">Most starred of ${plural(m.repoCount, "public repository", "public repositories")}</text>
  ${rows}`;
  }

  function languages(x, y, w, h) {
    const total = m.languages.reduce((s, l) => s + l.count, 0) || 1;
    const barX = x + 18;
    const barW = w - 36;
    const barY = y + 46;
    let cursor = barX;
    const segments = m.languages
      .map((l) => {
        const sw = (l.count / total) * barW;
        const seg = `<rect x="${cursor.toFixed(2)}" y="${barY}" width="${sw.toFixed(2)}" height="8" fill="${l.color}"/>`;
        cursor += sw;
        return seg;
      })
      .join("");
    const rows = m.languages
      .map((l, i) => {
        const ry = y + 80 + i * 21;
        return `
    <circle cx="${x + 23}" cy="${ry - 4}" r="4.5" fill="${l.color}"/>
    <text x="${x + 36}" y="${ry}" class="row">${esc(fit(l.name, w - 130, 12.5, 500))}</text>
    <text x="${x + w - 54}" y="${ry}" class="pct" text-anchor="end">${Math.round((l.count / total) * 100)}%</text>
    <text x="${x + w - 18}" y="${ry}" class="count" text-anchor="end">${l.count}</text>`;
      })
      .join("");
    return `
  ${k.panel(x, y, w, h)}
  ${k.panelTitle(x, y, "code", A.languages, "Languages")}
  <clipPath id="langbar"><rect x="${barX}" y="${barY}" width="${barW}" height="8" rx="4"/></clipPath>
  <g clip-path="url(#langbar)"><rect x="${barX}" y="${barY}" width="${barW}" height="8" fill="${theme.track}"/>${segments}</g>
  ${rows}`;
  }

  const contentTop = PAD + theme.topBand;
  let y = contentTop;
  const parts = [];
  const top = header(y);
  parts.push(top.svg);
  y += top.h + SECTION;
  const grid = k.tiles(tileItems, y, 5);
  parts.push(grid.svg);
  y += grid.h + SECTION;
  const cal = contributions(y);
  parts.push(cal.svg);
  y += cal.h + SECTION;
  const bottomH = 80 + (Math.max(m.topRepos.length, m.languages.length, 1) - 1) * 21 + 17;
  parts.push(topRepos(PAD, y, HALF, bottomH));
  parts.push(languages(PAD + HALF + SECTION, y, HALF, bottomH));
  y += bottomH + PAD + theme.bottomBand;

  const name = u.name || u.login;
  const desc =
    `${full(m.calendar.totalContributions)} contributions in the last year, ` +
    `${full(m.stars)} stars across ${plural(m.repoCount, "public repository", "public repositories")}, ` +
    `${full(m.counts.prs)} pull requests, ${full(u.followers.totalCount)} followers.`;
  const defs = `
  <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${theme.header[0]}"/>
    <stop offset="1" stop-color="${theme.header[1]}"/>
  </linearGradient>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${theme.avatarRing[0]}"/>
    <stop offset="1" stop-color="${theme.avatarRing[1]}"/>
  </linearGradient>
  <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${A.contributions}" stop-opacity="${theme.spark}"/>
    <stop offset="1" stop-color="${A.contributions}" stop-opacity="0"/>
  </linearGradient>${k.tileGradients(tileItems.map((t) => t.color))}`;

  return k.frame({ height: y, title: `${name}'s GitHub activity`, desc, defs, body: parts.join("\n"), contentTop, ledge: contentTop });
}
