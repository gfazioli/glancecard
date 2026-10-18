// The repository card: header, hero, twelve stat tiles, a year of commits (a
// chart of daily counts, or GitHub's calendar), the stars over the
// repository's life, the weekly rhythm, languages and essentials, latest
// commits and releases, contributors. Every section
// but the header can be left out; when one of a side-by-side pair is, the
// other takes the full width.

import { HALF, IW, kit, PAD, SECTION, W } from "../svg.js";
import { THEMES } from "../theme.js";
import { compact, esc, excerpt, fit, full, plural, size, SLACK, textWidth, wrap } from "../text.js";
import { age, ago, formatDay, MONTHS } from "../time.js";

export const REPO_SECTIONS = ["hero", "tiles", "activity", "stars", "rhythm", "code", "commits", "releases", "contributors"];

export function renderRepo(m, { theme = THEMES.dark, sections = REPO_SECTIONS, images = {}, calendar = "chart", starsChart = "steps" } = {}) {
  const k = kit(theme);
  const A = theme.accent;
  const r = m.repo;
  const on = new Set(sections);

  // ─── Header ───

  // The name in the look's ink, with its glow where it has one.
  const ink = `${theme.nameInk ? ` style="fill: ${theme.nameInk}"` : ""}${theme.nameGlow ? ` filter="url(#name-glow)"` : ""}`;
  const header = (y) => `
  <text x="${PAD + 2}" y="${y + 24}" class="h-name disp"${ink}>${esc(k.disp(r.name))}</text>
  <text x="${PAD + 2}" y="${y + 46}" class="h-sub">${esc(`${r.nameWithOwner} · ${r.defaultBranchRef.name}`)}</text>
  <text x="${W - PAD - 2}" y="${y + 22}" class="updated" text-anchor="end">Updated ${formatDay(m.today)}</text>`;

  // ─── Hero ───

  function hero(y) {
    const x = PAD;
    const rightW = 250;
    const leftW = IW - 36 - rightW - 28;
    const lx = x + 18;
    const parts = [];

    const status = r.isArchived
      ? { label: "Archived", color: A.slate }
      : m.idleDays <= 30
        ? { label: "Active", color: A.green }
        : m.idleDays <= 180
          ? { label: "Quiet", color: A.yellow }
          : { label: "Dormant", color: A.slate };
    const since = new Date(r.createdAt);
    const badges = [
      { label: status.label, icon: "pulse", color: status.color, tint: status.color },
      { label: `Since ${MONTHS[since.getUTCMonth()]} ${since.getUTCFullYear()} · ${age(r.createdAt, m.now)}`, icon: "calendar", color: A.blue, tint: A.blue },
    ];
    if (m.latestTag) badges.push({ label: m.latestTag, icon: "tag", color: A.cyan, tint: A.cyan });
    let cy = y + 18;
    const badgeRow = k.flow(lx, cy, leftW, badges, 1);
    parts.push(badgeRow.svg);
    cy += badgeRow.h + 14;

    if (r.description) {
      const lines = wrap(r.description, leftW, 15, 700, 2);
      lines.forEach((line, i) => parts.push(`<text x="${lx}" y="${cy + 14 + i * 21}" class="desc">${esc(line)}</text>`));
      cy += 14 + (lines.length - 1) * 21 + 14;
    }

    const topics = r.repositoryTopics.nodes.map((n) => ({ label: n.topic.name }));
    if (topics.length) {
      const row = k.flow(lx, cy, leftW, topics, 2, 28);
      parts.push(row.svg);
      cy += row.h + 10;
    }

    const links = [{ label: `github.com/${r.nameWithOwner}`, icon: "mark-github" }];
    if (r.homepageUrl) links.push({ label: r.homepageUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""), icon: "link" });
    const linkRow = k.flow(lx, cy, leftW, links.map((l) => ({ ...l, color: theme.link.icon, fill: theme.link.fill })), 1);
    parts.push(linkRow.svg);
    cy += linkRow.h + 18;

    const h = Math.max(cy - y, 168);
    const rx = x + IW - 18 - rightW;
    const big = full(m.last30);
    const bigW = textWidth(big, 34, 700) / SLACK;
    return {
      h,
      svg: `
  <rect x="${x}" y="${y}" width="${IW}" height="${h}" rx="16" fill="url(#hero)" stroke="${theme.repoHero.stroke}"/>
  ${parts.join("")}
  <text x="${rx}" y="${y + 50}" class="big disp">${big}</text>
  <text x="${(rx + bigW + 8).toFixed(1)}" y="${y + 50}" class="big-cap">commits in 30 days</text>
  ${k.sparkline(m.weekly, rx, y + 66, rightW, h - 66 - 38, A.contributions)}
  <text x="${rx}" y="${y + h - 16}" class="axis">${m.weekly.length} weeks ago</text>
  <text x="${rx + rightW}" y="${y + h - 16}" class="axis" text-anchor="end">This week</text>`,
    };
  }

  // ─── Tiles ───

  const [kb, unit] = size(r.diskUsage ?? 0);
  const license = r.licenseInfo?.spdxId && r.licenseInfo.spdxId !== "NOASSERTION" ? r.licenseInfo.spdxId : "—";
  const tileItems = [
    { icon: "git-commit", color: A.indigo, value: compact(m.totalCommits), label: "Commits", sub: m.commits[0] ? `last ${ago(m.commits[0].day, m.today)}` : "none yet" },
    { icon: "people", color: A.teal, value: compact(m.contributorCount), label: "Contributors", sub: m.bots ? `incl. ${plural(m.bots, "bot")}` : "all-time" },
    { icon: "git-branch", color: A.green, value: compact(r.branches.totalCount), label: "Branches", sub: `default ${r.defaultBranchRef.name}` },
    { icon: "tag", color: A.cyan, value: compact(r.tags.totalCount), label: "Tags", sub: m.latestTag ? `latest ${m.latestTag}` : "none yet" },
    { icon: "package", color: A.blue, value: compact(m.releaseCount), label: "Releases", sub: m.releases[0] ? `latest ${ago(m.releases[0].day, m.today)}` : "none yet" },
    m.downloads > 0
      ? { icon: "download", color: A.purple, value: compact(m.downloads), label: "Downloads", sub: "release assets" }
      : { icon: "law", color: A.purple, value: license, label: "License", sub: "SPDX" },
    { icon: "star", color: A.yellow, value: compact(r.stargazerCount), label: "Stars", sub: "stargazers" },
    { icon: "repo-forked", color: A.teal, value: compact(r.forkCount), label: "Forks", sub: "of this repo" },
    { icon: "eye", color: A.slate, value: compact(r.watchers.totalCount), label: "Watchers", sub: "subscribed" },
    { icon: "issue-opened", color: A.orange, value: compact(r.openIssues.totalCount), label: "Open issues", sub: `${compact(r.closedIssues.totalCount)} closed` },
    { icon: "git-pull-request", color: A.purple, value: compact(r.openPRs.totalCount), label: "Pull requests", sub: `open · ${compact(r.mergedPRs.totalCount)} merged` },
    { icon: "database", color: A.rose, value: kb, unit, label: "Size", sub: plural(m.files, "file") },
  ];

  // ─── Activity ───

  function activity(y) {
    const x = PAD;
    const chips = k.flow(x + 18, y + 44, IW - 36, [
      { label: "Current streak", value: plural(m.streak, "day"), icon: "flame", color: A.orange },
      { label: "Longest streak", value: plural(m.longest, "day"), icon: "trophy", color: A.yellow },
      { label: "Active days", value: full(m.activeDays), icon: "calendar", color: A.contributions },
    ]);
    const count = m.capped ? `${full(m.yearCommits)}+ commits` : plural(m.yearCommits, "commit");
    const head = (h) => `
  ${k.panel(x, y, IW, h)}
  ${k.panelTitle(x, y, "apps", A.contributions, "Activity", { x: x + IW - 18, text: `${count} in the last year` })}
  ${chips.svg}`;
    const capped = (cx, h) => (m.capped ? `<text x="${cx}" y="${y + h - 16}" class="foot">Only the latest ${full(m.yearCommits)} commits are drawn</text>` : "");

    if (calendar === "chart") {
      // The month names sit where the grid's legend does, so a capped
      // history takes a line of its own below them.
      const h = 232 + (m.capped ? 20 : 0);
      return { h, svg: `${head(h)}${k.yearChart(m.days, x + 18, y + 92, IW - 36, 102, A.contributions)}${capped(x + 18, h)}` };
    }

    const step = 14;
    const cell = 11;
    const weeks = m.grid;
    const gridW = weeks.length * step - (step - cell);
    const labelW = 30;
    const gx = x + (IW - gridW - labelW) / 2 + labelW;
    const gy = y + 100;
    const h = 100 + 7 * step + 34;
    const levels = theme.levels;
    const [q1, q2, q3] = m.quartiles;
    const level = (n) => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);

    const cells = weeks
      .flatMap((week, wi) =>
        week.map((d, di) => {
          if (!d) return "";
          const today = d.day === m.today ? ` stroke="${A.contributions}" stroke-width="1.5"` : "";
          return `<rect x="${gx + wi * step}" y="${gy + di * step}" width="${cell}" height="${cell}" rx="2.5" fill="${levels[level(d.count)]}"${today}/>`;
        }),
      )
      .join("");

    // A month label sits over the first week that starts in that month; labels
    // closer than three weeks apart would overlap, so the earlier one is dropped.
    const marks = [];
    weeks.forEach((week, wi) => {
      const mo = Number(week[0].day.slice(5, 7)) - 1;
      const prev = wi > 0 ? Number(weeks[wi - 1][0].day.slice(5, 7)) - 1 : -1;
      if (mo !== prev) marks.push({ wi, mo });
    });
    const months = marks
      .filter((mk, i) => !(marks[i + 1] && marks[i + 1].wi - mk.wi < 3))
      .map((mk) => `<text x="${gx + mk.wi * step}" y="${gy - 8}" class="axis">${MONTHS[mk.mo]}</text>`)
      .join("");
    const days = [
      [0, "Mon"],
      [2, "Wed"],
      [4, "Fri"],
    ]
      .map(([row, n]) => `<text x="${gx - 8}" y="${gy + row * step + 9}" class="axis" text-anchor="end">${n}</text>`)
      .join("");

    const lx = gx + gridW - levels.length * step - 30;
    const legend = `
  <text x="${lx - 8}" y="${y + h - 16}" class="axis" text-anchor="end">Less</text>
  ${levels.map((f, i) => `<rect x="${lx + i * step}" y="${y + h - 25}" width="${cell}" height="${cell}" rx="2.5" fill="${f}"/>`).join("")}
  <text x="${lx + levels.length * step + 5}" y="${y + h - 16}" class="axis">More</text>`;
    return { h, svg: `${head(h)}
  ${months}${days}${cells}${legend}${capped(gx - labelW, h)}` };
  }

  // ─── Side-by-side panels: each returns the height it needs and a draw(h) ───

  function rhythm(x, y, w) {
    const labelW = 22;
    const gx = x + 18 + labelW;
    const step = (w - 36 - labelW) / 24;
    const rowStep = 21;
    const gy = y + 96;
    const max = Math.max(1, ...m.punch.flat());
    const draw = (h) => {
      const dots = m.punch
        .flatMap((row, d) =>
          row.map((n, hr) => {
            const cx = (gx + hr * step + step / 2).toFixed(1);
            const cy = gy + d * rowStep;
            if (n === 0) return `<circle cx="${cx}" cy="${cy}" r="1.2" fill="${theme.dot}"/>`;
            const q = n / max;
            return `<circle cx="${cx}" cy="${cy}" r="${(2 + Math.sqrt(q) * 5.2).toFixed(2)}" fill="${A.rose}" fill-opacity="${(0.5 + 0.5 * q).toFixed(2)}"/>`;
          }),
        )
        .join("");
      const rows = ["M", "T", "W", "T", "F", "S", "S"]
        .map((l, d) => `<text x="${x + 22}" y="${gy + d * rowStep + 3.5}" class="axis">${l}</text>`)
        .join("");
      const hours = [0, 6, 12, 18]
        .map((hr) => `<text x="${(gx + hr * step + step / 2).toFixed(1)}" y="${gy + 6 * rowStep + 24}" class="axis" text-anchor="middle">${hr}</text>`)
        .join("");
      const chips = k.flow(
        x + 18,
        y + 44,
        w - 36,
        m.yearCommits
          ? [
              { label: "Busiest day", value: m.busiestDay, icon: "sun", color: A.yellow },
              { label: "Peak hour", value: String(m.peakHour), icon: "zap", color: A.rose },
            ]
          : [{ label: "No commits in the last year", icon: "sun", color: A.slate }],
      );
      return `
  ${k.panel(x, y, w, h)}
  ${k.panelTitle(x, y, "clock", A.rose, "Rhythm")}
  ${chips.svg}
  ${rows}${dots}${hours}`;
    };
    return { need: 96 + 6 * rowStep + 44, draw };
  }

  function code(x, y, w) {
    const barX = x + 18;
    const barW = w - 36;
    const barY = y + 46;
    const cols = w > 500 ? 3 : 2;
    const colW = (barW - 24 * (cols - 1)) / cols;
    const legendBottom = y + 86 + Math.ceil(m.languages.length / cols) * 22 - 8;
    const essentials = k.flow(
      barX,
      legendBottom + 40,
      barW,
      m.essentials.map((e) =>
        e.ok
          ? { label: e.label, icon: "check-circle-fill", color: A.green, tint: A.green }
          : { label: e.label, icon: "x-circle", color: theme.off.icon, labelClass: "pill-off", fill: theme.off.fill },
      ),
    );
    const draw = (h) => {
      let cursor = barX;
      const segments = m.languages
        .map((l) => {
          const sw = l.share * barW;
          const seg = `<rect x="${cursor.toFixed(2)}" y="${barY}" width="${Math.max(0, sw - 1).toFixed(2)}" height="10" fill="${l.color}"/>`;
          cursor += sw;
          return seg;
        })
        .join("");
      const rows = m.languages
        .map((l, i) => {
          const lx = barX + (i % cols) * (colW + 24);
          const ly = y + 86 + Math.floor(i / cols) * 22;
          return `
    <circle cx="${lx + 5}" cy="${ly - 4}" r="4.5" fill="${l.color}"/>
    <text x="${lx + 17}" y="${ly}" class="row">${esc(fit(l.name, colW - 70, 12.5, 500))}</text>
    <text x="${lx + colW}" y="${ly}" class="pct" text-anchor="end">${(l.share * 100).toFixed(1)}%</text>`;
        })
        .join("");
      const none = m.languages.length ? "" : `<text x="${barX}" y="${y + 86}" class="excerpt">No languages detected.</text>`;
      return `
  ${k.panel(x, y, w, h)}
  ${k.panelTitle(x, y, "code", A.languages, "Code", { x: x + w - 18, text: plural(m.files, "file") })}
  <clipPath id="langbar"><rect x="${barX}" y="${barY}" width="${barW}" height="10" rx="5"/></clipPath>
  <g clip-path="url(#langbar)"><rect x="${barX}" y="${barY}" width="${barW}" height="10" fill="${theme.track}"/>${segments}</g>
  ${rows}${none}
  <line x1="${barX}" y1="${legendBottom + 4}" x2="${barX + barW}" y2="${legendBottom + 4}" stroke="${theme.track}"/>
  <text x="${barX}" y="${legendBottom + 28}" class="section">Essentials</text>
  ${essentials.svg}`;
    };
    return { need: legendBottom - y + 40 + essentials.h + 22, draw };
  }

  function commits(x, y, w) {
    const draw = (h) => {
      const rows = m.commits
        .map((c, i) => {
          const ry = y + 66 + i * 46;
          const who = c.author?.user?.login ?? c.author?.name ?? "unknown";
          return `
    <circle cx="${x + 25}" cy="${ry - 5}" r="5.5" fill="none" stroke="${A.indigo}" stroke-width="2.2"/>
    <text x="${x + 42}" y="${ry}" class="commit">${esc(fit(c.messageHeadline, w - 60, 13, 600))}</text>
    <text x="${x + 42}" y="${ry + 17}" class="meta"><tspan class="mono">${esc(c.abbreviatedOid)}</tspan> · ${esc(fit(who, 150, 11))} · ${ago(c.day, m.today)}</text>`;
        })
        .join("");
      return `
  ${k.panel(x, y, w, h)}
  ${k.panelTitle(x, y, "history", A.indigo, "Latest commits", { x: x + w - 18, text: `${plural(m.totalCommits, "commit")} on ${r.defaultBranchRef.name}` })}
  ${rows}`;
    };
    // Rows sit 46 px apart and the last one needs 36 px below its baseline.
    return { need: 66 + (Math.max(1, m.commits.length) - 1) * 46 + 36, draw };
  }

  function releases(x, y, w) {
    const top = y + (m.cadence ? 98 : 66);
    const list = m.releases;
    const draw = (h) => {
      const rows = list
        .map((rel, i) => {
          const ry = top + i * 46;
          const when = ago(rel.day, m.today);
          return `
    <circle cx="${x + 27}" cy="${ry - 5}" r="9" fill="${theme.canvas[1]}" stroke="${A.sky}" stroke-width="1.2"/>
    ${k.icon("tag", x + 21, ry - 11, A.sky, 12)}
    <text x="${x + 46}" y="${ry}" class="tagname">${esc(fit(rel.tagName, w - 80 - textWidth(when, 11), 13, 700, true))}</text>
    <text x="${x + w - 18}" y="${ry}" class="meta" text-anchor="end">${when}</text>
    <text x="${x + 46}" y="${ry + 17}" class="excerpt">${esc(fit(excerpt(rel.description), w - 64, 11.5))}</text>`;
        })
        .join("");
      const line =
        list.length > 1
          ? `<line x1="${x + 27}" y1="${top - 5}" x2="${x + 27}" y2="${top - 5 + (list.length - 1) * 46}" stroke="${A.sky}" stroke-opacity="0.35" stroke-width="2"/>`
          : "";
      const empty = list.length ? "" : `<text x="${x + 18}" y="${y + 70}" class="excerpt">No releases yet.</text>`;
      const chip = m.cadence ? k.flow(x + 18, y + 44, w - 36, [{ label: "Cadence", value: m.cadence, icon: "stopwatch", color: A.sky }]).svg : "";
      return `
  ${k.panel(x, y, w, h)}
  ${k.panelTitle(x, y, "package", A.sky, "Releases", { x: x + w - 18, text: plural(m.releaseCount, "release") })}
  ${chip}${line}${rows}${empty}`;
    };
    return { need: top - y + (Math.max(1, list.length) - 1) * 46 + 36, draw };
  }

  // ─── Contributors ───

  function contributors(y) {
    const x = PAD;
    const shown = m.contributors.slice(0, 6);
    const rowH = 46;
    const h = 58 + Math.max(1, shown.length) * rowH + 22;
    const max = Math.max(1, ...shown.map((c) => c.contributions));
    const trackX = x + 62;
    const trackW = IW - 18 - (trackX - x);
    const rows = shown
      .map((c, i) => {
        const ry = y + 58 + i * rowH;
        return `
    ${k.avatar(`av-${i}`, images[c.avatarUrl], x + 32, ry + 10, 14, theme.ring)}
    <text x="${trackX}" y="${ry + 6}" class="who">${esc(fit(c.login, trackW - 60, 13, 600))}</text>
    <text x="${x + IW - 18}" y="${ry + 6}" class="count" text-anchor="end">${full(c.contributions)}</text>
    <rect x="${trackX}" y="${ry + 15}" width="${trackW}" height="4" rx="2" fill="${theme.track}"/>
    <rect x="${trackX}" y="${ry + 15}" width="${Math.max(4, (c.contributions / max) * trackW).toFixed(1)}" height="4" rx="2" fill="${A.orange}"/>`;
      })
      .join("");
    const empty = shown.length ? "" : `<text x="${x + 18}" y="${y + 70}" class="excerpt">No contributors listed.</text>`;
    const more = m.contributorCount > shown.length ? ` · ${m.contributorCount - shown.length} more not shown` : "";
    return {
      h,
      svg: `
  ${k.panel(x, y, IW, h)}
  ${k.panelTitle(x, y, "people", A.orange, "Contributors", { x: x + IW - 18, text: plural(m.contributorCount, "contributor") })}
  ${rows}${empty}
  <text x="${x + 18}" y="${y + h - 14}" class="foot">Commits on ${esc(r.defaultBranchRef.name)}, according to GitHub${more}</text>`,
    };
  }

  // ─── Assembly ───

  const contentTop = PAD + theme.topBand;
  let y = contentTop;
  const parts = [header(y)];
  y += 68;
  const add = (block) => {
    parts.push(block.svg);
    y += block.h + SECTION;
  };
  const pair = (left, right) => {
    const shown = [left, right].filter((p) => on.has(p.name));
    if (!shown.length) return;
    const w = shown.length === 2 ? HALF : IW;
    const built = shown.map((p, i) => p.make(PAD + i * (HALF + SECTION), y, w));
    const h = Math.max(...built.map((b) => b.need));
    add({ svg: built.map((b) => b.draw(h)).join(""), h });
  };

  if (on.has("hero")) add(hero(y));
  if (on.has("tiles")) add(k.tiles(tileItems, y, 6));
  if (on.has("activity")) add(activity(y));
  if (on.has("stars")) add(k.starsPanel(m.stars, r.stargazerCount, y, m.today, starsChart));
  pair({ name: "rhythm", make: rhythm }, { name: "code", make: code });
  pair({ name: "commits", make: commits }, { name: "releases", make: releases });
  if (on.has("contributors")) add(contributors(y));
  const height = y - SECTION + PAD + theme.bottomBand;

  const desc =
    `${r.description ? `${r.description}. ` : ""}` +
    `${plural(m.totalCommits, "commit")}, ${m.capped ? `${full(m.yearCommits)}+ commits` : plural(m.yearCommits, "commit")} in the last year, ` +
    `${plural(r.stargazerCount, "star")}, ${plural(m.releaseCount, "release")}` +
    `${m.latestTag ? ` (latest ${m.latestTag})` : ""}, ${plural(m.contributorCount, "contributor")}.`;

  const defs = `
  <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${theme.repoHero.from[0]}" stop-opacity="${theme.repoHero.from[1]}"/>
    <stop offset="1" stop-color="${theme.repoHero.to[0]}" stop-opacity="${theme.repoHero.to[1]}"/>
  </linearGradient>
  <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${A.contributions}" stop-opacity="${theme.spark}"/>
    <stop offset="1" stop-color="${A.contributions}" stop-opacity="0"/>
  </linearGradient>${on.has("stars") ? k.starsFill(m.stars, starsChart) : ""}${k.tileGradients(tileItems.map((t) => t.color))}`;

  return k.frame({ height, title: `${r.nameWithOwner} at a glance`, desc, defs, body: parts.join("\n"), contentTop, ledge: contentTop + 68 });
}
