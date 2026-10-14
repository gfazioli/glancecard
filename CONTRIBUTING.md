# Contributing to glancecard

Thanks for your interest in glancecard! It is a small, focused project: a
GitHub Action and a CLI that render SVG cards of a GitHub profile and of
repositories, for READMEs, in plain Node with no dependencies.
Contributions are welcome; this page covers how to work with the codebase.

## Before you start

- **Bugs**: open an [issue](https://github.com/gfazioli/glancecard/issues/new).
  The version in your workflow's `uses:` line, the inputs you set and the
  log of the failing run help a lot. For a card that looks wrong, attach a
  screenshot and name the repository it was drawn from.
- **Features and ideas**: feel free to suggest one in an issue, but please
  **open a pull request only after a quick discussion**, so effort isn't
  wasted on something out of scope. glancecard is intentionally
  dependency-free, reads public data by default, and draws cards that
  need nothing at view time (no web fonts, no scripts, no external
  images); proposals that change that need a strong rationale.
- **Security**: do not open a public issue — see [SECURITY.md](SECURITY.md).

## Development setup

Requirements: **Node 20 or later** and, to look at the cards, Google
Chrome. There is nothing to install.

```bash
git clone https://github.com/gfazioli/glancecard
cd glancecard
npm test                                         # unit tests and the golden cards
node src/cli.js repo owner/name --out preview    # a live card (token: GITHUB_TOKEN, GH_TOKEN or gh)
node src/cli.js profile login --out preview
```

The other scripts:

```bash
npm run preview     # render the golden cases into preview/ and screenshot them with Chrome
npm run golden      # rewrite test/golden/ after a deliberate change to how a card looks
node scripts/record-fixture.js owner/name test/fixtures/name.json   # record a new fixture
node scripts/site.js build && node scripts/site.js serve              # the website, locally
```

## How the code is laid out

Each card is three steps in `src/repo/` or `src/profile/`: `fetch.js`
(the API to plain JSON), `model.js` (pure: data, an instant and a time
zone to what is drawn) and `render.js` (the model and a palette to SVG).
Drawing primitives live in `src/svg.js`, the palettes and the stylesheet
in `src/theme.js`, text widths in `src/text.js`. `src/action.js` and
`src/cli.js` share `src/run.js`.

## Conventions

- **Language**: code, comments, commit messages and documentation are in
  **English**.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `test:`.
- **No dependencies**, development ones included. The runner protocol is
  a few environment variables and files; the tests run on `node:test`.
- **A card is held to its golden file byte for byte.** A change to how a
  card looks updates `test/golden/` with `npm run golden`, after a look
  at `npm run preview`. CI uploads the golden cards screenshotted with
  Linux and Windows fonts: look at those too, since text widths are
  estimated from tables measured on macOS.
- **Tests**: pure functions get direct tests; network code is tested
  against a local server, and the commit path against a real bare
  remote. Anchor an assertion on the element it is about, not on the
  whole SVG: the `<desc>` repeats the headline numbers. Before trusting a
  new assertion, break what it protects and watch it fail.

## Pull requests

1. Branch off `main`.
2. Keep the pull request focused; `npm test` must pass.
3. Open it: CI runs the tests on Linux and Windows with Node 20 and 24,
   renders the preview cards, and runs the Action itself on live data.
   Automated reviewers may comment. Address feedback, then it is rebased
   and merged.

By contributing you agree that your work is licensed under the project's
[MIT License](LICENSE).
