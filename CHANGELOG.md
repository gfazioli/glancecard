# Changelog

## 0.5.0 — 2026-10-18

**Three ways to draw the stars, and a card you can try before you copy.**

- `stars-chart` (CLI: `--stars-chart`) picks how both cards draw the stars: `steps`, the default and what 0.4.0 drew, the running total exactly; `smooth`, a soft line through it that still never turns back down; or `bars`, the new stars of each month (each week, under half a year), on their own axis.
- The website's Looks section and its setup editor are one, Make it yours: the choices, the card they make, drawn in the page by glancecard's own renderer from the author's data, and the workflow and the embed to copy under it. It writes `stars-chart` too.

## 0.4.0 — 2026-10-18

**Every star.**

- The repository card gains a Stars section under its year of commits: the running total of stars since the repository was created, with the last 30 days, the last year and the best week. It is part of `sections: all`, the default.
- The profile card draws the same panel for the stars of all its public repositories, since the first one.
- The data is GitHub's star history, public since August 2026; the stargazer list the old star-history charts read is now for admins and collaborators only.
- `.stars.json` beside the cards keeps the histories read, committed with them: the first run takes up to a request for every 30 weeks of each repository's life, every run after one per repository.
- `sections` without `stars` leaves out both panels and their requests.

## 0.3.0 — 2026-10-15

**A year as a chart.**

- The profile card's contributions and the repository card's year of commits are drawn as a line of daily counts, over a value axis with a rule at every step and each month named under its days. It is the new default on both cards.
- `calendar: grid` (CLI: `--calendar grid`) brings back GitHub's calendar of squares, unchanged.
- The profile card reads each day's contribution count from GitHub, not only its shade.

## 0.2.0 — 2026-10-14

**Nine looks, and a website.**

- `theme` takes looks, after the nine of FinderGit's Profile Card: `midnight`, `aurora`, `daylight`, `upside-down`, `hyperspace`, `bridge`, `nebula`, `halloween` and `christmas`, each with its palette, lettering and decorations, on both cards. Several can be asked for at once, comma-separated. `halloween` and `christmas` are worn in their season only and are Midnight otherwise; the CLI's `--all-seasons` lifts that for a preview.
- `dark` and `light` are now Midnight and Daylight: the default cards change colour slightly. Their file names do not.
- A website, https://gfazioli.github.io/glancecard/, with every look to switch between and the one-paste setup.

## 0.1.0 — 2026-10-14

First release.

- A repository card: hero, twelve stat tiles, a year of commits with streaks, the weekly rhythm, languages and essentials, latest commits and releases with their cadence, contributors. Sections can be left out.
- A profile card: who, ten stat tiles, the contribution calendar, the most starred repositories and their languages.
- Dark and light themes, one file each, for a `<picture>` that follows the reader's GitHub theme.
- A GitHub Action that renders the cards and commits them, and a CLI (`npx github:gfazioli/glancecard`) to preview them.
- Private repositories are refused unless `allow-private` is set; a history longer than `max-commits` is said so on the card.
