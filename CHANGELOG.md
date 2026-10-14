# Changelog

## 0.1.0 — unreleased

First release.

- A repository card: hero, twelve stat tiles, a year of commits with streaks, the weekly rhythm, languages and essentials, latest commits and releases with their cadence, contributors. Sections can be left out.
- A profile card: who, ten stat tiles, the contribution calendar, the most starred repositories and their languages.
- Dark and light themes, one file each, for a `<picture>` that follows the reader's GitHub theme.
- A GitHub Action that renders the cards and commits them, and a CLI (`npx github:gfazioli/glancecard`) to preview them.
- Private repositories are refused unless `allow-private` is set; a history longer than `max-commits` is said so on the card.
