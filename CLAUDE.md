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
`scripts/site.js build` renders the cards it shows. Five blocks in
`site/index.html` are copies that a test holds to their source: the springs
(`scripts/springs.js`, the sibling sites' sampler), the one-paste prompt, the
by-hand workflow and the README embed (the README's), and the publisher line
(octoscope's). A release bumps the version in all of them. The setup editor
(`site/editor.js`) rewrites the prompt, the workflow and the embed at runtime
from the looks picked,
by exact-string swaps that must find their anchor once: change the README's
wording there and `test/editor.test.js` says which anchor moved.
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

## Conventions

English everywhere in the repository. Conventional commits. No AI
attribution trailers in commits or PRs.
