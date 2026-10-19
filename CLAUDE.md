# glancecard

GitHub Action and CLI that render SVG cards of a GitHub profile and of
repositories, for READMEs. Node ≥ 20, ES modules, **no dependencies** — not
even `@actions/core`: the runner protocol is `INPUT_*` variables,
`$GITHUB_OUTPUT` and `::error::` lines (`src/action.js`).

## Layout

- `src/repo/` and `src/profile/` — each card is `fetch.js` (API → plain
  JSON), `model.js` (pure: data + now + time zone → what is drawn),
  `render.js` (model + theme → SVG).
- `src/svg.js` — drawing primitives bound to a palette; `src/theme.js` — the
  dark and light palettes and the shared stylesheet; `src/text.js` — glyph
  widths, `fit`, `wrap`; `src/time.js` — days and hours in a time zone.
- `src/stars.js` — GitHub's star history for both cards, and the store that
  keeps it in `<out-dir>/.stars.json` between runs, so a daily run reads the
  newest page of each repository only.
- `src/run.js` — what the CLI (`src/cli.js`) and the Action share.
- `test/fixtures/` — recorded API data; `test/golden/` — the cards they must
  render to, byte for byte.

## Rules that were learned the hard way

- **A colour on `<text>` goes in `style=`, not `fill=`.** The stylesheet's
  `text { fill: … }` outranks a presentation attribute, so `fill=` silently
  paints every title grey. A test guards it.
- **Glyph widths are measured at the size they are used.** The system font
  widens its letters below ~20 px: a table measured at 100 px clipped 13 px
  text ~10% too late. `GLYPHS.text` is measured at 12.5 px, `GLYPHS.display`
  at 34 px. Re-measure in Chrome with SVG text if the font stack changes.
- **Assert on the element, not on the document.** The `<desc>` repeats the
  headline numbers, so a regex over the whole SVG can pass on the summary
  while the panel is wrong. Anchor on the class (`class="caption" …>`), and
  validate an assertion by breaking what it protects.
- **Dates are local days.** GitHub returns UTC and drops the author's offset;
  every day and hour goes through `clock(timeZone)`.
- **The star history counts its days in Pacific time.**
  `/repos/{owner}/{repo}/stargazers/history` names each week by its Sunday at
  00:00 UTC, but `days[i]` is that Sunday plus `i` in America/Los_Angeles:
  against the exact timestamps, 0 of 35 days differ in Pacific time and 23 in
  UTC. It cannot be moved to the card's zone, so a star may sit a day off.
  It answers 30 weeks a page whatever `per_page` asks, empty weeks included,
  and counts only the stars still given, and not always all of them:
  next-app-nextra-template's history adds up to 36 of its 37, for good. The
  store (`src/stars.js`) trusts a kept history while it misses by what it
  missed by before; held to the exact count, it would read that repository
  in full every day. The stargazer list behind the old
  star-history charts is for admins and collaborators only since July 2026,
  so it is no substitute: the workflow token cannot read it for another
  repository.

## The looks

`src/theme.js` holds the nine, ported from FinderGit's `ProfileCardTheme.swift`
(palettes) and `ProfileCardDecor.swift` (`src/decor.js`): keep them in step
with the app. A look's decorations sit behind the content or in its margins
and top and bottom bands, never over a figure; `test/theme.test.js` holds the
content below the top band. The seasonal looks resolve to Midnight out of
season (`resolveLook`), in the card's time zone.

## The website

`site/` is hand-authored HTML, CSS, one deferred script (`site.js`) and one
module (`editor.js`), published by `.github/workflows/pages.yml` after
`scripts/site.js build` renders the cards it shows. The editor's card is
drawn in the page by `preview.js`, which the build writes: the renderer's
modules from `src/`, each in its own scope, in `PREVIEW_MODULES` order, and
the author's data, loaded when the editor comes near the screen. A test
holds it to `src/` byte for byte. It can bundle only what the modules do
today, `import { … } from "./x.js";` on one line and `export function` or
`export const`: anything else stops the build. The page keeps no other card
of its own, but the build still writes every look's, because the README's
Looks table and old release notes show them from there. Five blocks in
`site/index.html` are copies that a test holds to their source: the springs
(`scripts/springs.js`, the sibling sites' sampler), the one-paste prompt, the
by-hand workflow and the README embed (the README's), and the publisher line
(octoscope's). A release bumps the version in all of them. The setup editor
(`site/editor.js`) rewrites the prompt, the workflow and the embed at runtime
from exclusive choices (a card that follows the reader's theme, one dark look
beside Daylight, the only light one; or one look always; and the refresh,
whose hour is a UTC hour offered under its local time, so an untouched editor
keeps the README's `30 5 * * *`; and the repository card's sections,
checkboxes written only when some are left out, never none, since the action
reads an empty list as all) by exact-string swaps
that must find their anchor once: change the README's wording there and
`test/editor.test.js` says which anchor moved. A choice the card on show
would not draw turns the preview to the card that draws it (a dark look to
the dark side, a section to the repository card): on the light side every
dark look drew Daylight, and a click that changes nothing on screen read as
a bug (2026-10-19).
Reveals move only `translate`, `scale` and `opacity`, every hiding rule
requires `data-armed`, and the page loads nothing from another host. Buttons
are flat pills with no border: a gradient under a transparent border repeats
beneath it and draws its far colour as a seam along the edges, and an outline
is an inset ring. Each `.btn` variant sets `--btn-bg`, `--btn-hover`,
`--btn-active` and `--btn-ink`, at 4.5:1 or more in every state. A
significant change is measured before and after with the site-audit
instrument (Lighthouse, the crawler check, the cost at rest and of a scroll).

## Changing how a card looks

1. Change the drawing.
2. `npm run golden`, then `npm run preview` and look at the PNGs.
3. Commit the golden files with the change. CI uploads previews rendered on
   Linux and Windows fonts; look at them too.

## Releases

Pinned tags only (`v0.1.0`, `v0.2.0`, …), no moving `v0` tag: users pin a version or a
SHA and Dependabot moves them. `package.json` `version` and `CHANGELOG.md`
change in the release PR.

CI's action job and the Pages build both read the author's profile, whose
star histories take ~430 requests from a cold `.stars.json`, and the
workflow token allows 1,000 an hour for the whole repository. Both cache the
file (`actions/cache`), but a pull request's cache never reaches `main`, and
an unused one is evicted after 7 days. On 2026-10-18 the 0.4.0 PR was merged
an hour after its first cold PR run, so the push's CI and Pages builds
(~860 together) had the hour to themselves.

## Conventions

English everywhere in the repository. Conventional commits. No AI
attribution trailers in commits or PRs.
