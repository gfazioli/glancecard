# Changelog

## 0.2.0 — unreleased

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
