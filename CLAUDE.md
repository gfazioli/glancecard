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

## Changing how a card looks

1. Change the drawing.
2. `npm run golden`, then `npm run preview` and look at the PNGs.
3. Commit the golden files with the change. CI uploads previews rendered on
   Linux and Windows fonts; look at them too.

## Releases

Pinned tags only (`v0.1.0`, …), no moving `v0` tag: users pin a version or a
SHA and Dependabot moves them. `package.json` `version` and `CHANGELOG.md`
change in the release PR.

## Conventions

English everywhere in the repository. Conventional commits. No AI
attribution trailers in commits or PRs.
