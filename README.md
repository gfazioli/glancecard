<div align="center">

# glancecard

**Your GitHub profile and repositories, at a glance.**<br/>
Daily SVG cards for your READMEs, rendered by GitHub Actions in your own repository: no server, no third-party service, no dependencies.

[![CI](https://github.com/gfazioli/glancecard/actions/workflows/ci.yml/badge.svg)](https://github.com/gfazioli/glancecard/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-green)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-glancecard-2088FF?logo=github)](https://github.com/marketplace/actions/glancecard)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)

**[Website](https://gfazioli.github.io/glancecard/)** · [GitHub Marketplace](https://github.com/marketplace/actions/glancecard)

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gfazioli/gfazioli/master/glancecard/glancecard-dark.svg">
  <img src="https://raw.githubusercontent.com/gfazioli/gfazioli/master/glancecard/glancecard-light.svg" width="880" alt="glancecard's own repository card, refreshed daily: commits in the last 30 days, twelve stat tiles, a year of commit activity, the weekly rhythm, languages and essentials, latest commits and releases, contributors">
</picture>

<sub>This repository's own card, rendered every day by <a href="https://github.com/gfazioli/gfazioli/blob/master/.github/workflows/glancecard.yml">the author's profile repository</a> with glancecard itself. It follows your GitHub theme.</sub>

</div>

## What you get

- **A repository card** for any public repository: status, age and latest tag, description and topics, commits in the last 30 days with a 26-week sparkline, twelve stat tiles, a year of commits with streaks (a chart of daily counts, or GitHub's calendar), the stars over the repository's whole life with the last 30 days, the last year and the best week, the weekly rhythm (day × hour), languages and essentials (README, license, contributing guide, security policy, CI), the latest commits and releases with their cadence, contributors.
- **A profile card** for any user: followers, stars, repositories, pull requests, issues, commits, a year of contributions as a chart or as GitHub's calendar, the stars of all their public repositories since the first one, the most starred repositories and their languages.
- **Nine looks**, after the ones of [FinderGit](https://findergit.app)'s Profile Card, for both cards: Midnight, Aurora and Daylight; Upside Down, Hyperspace, Bridge and Nebula; Halloween and Christmas in their season. `dark` and `light` are Midnight and Daylight, a pair of files for a `<picture>` that shows the one matching the reader's GitHub theme.
- **Refreshed by your own workflow**, on your schedule, with the token GitHub Actions already gives every run. The cards are plain files committed to your repository.

## Set it up in one paste

Paste this into [Claude Code](https://claude.com/claude-code), [Codex](https://github.com/openai/codex) or any coding agent that can run a shell. Fill in the first line, or leave it. The agent needs the GitHub CLI (`gh`) signed in; it does the steps under *Set it up by hand* for you, and shows you every change before it pushes.

```text
Set up glancecard for me (https://github.com/gfazioli/glancecard): it renders SVG cards of my GitHub profile and of my repositories once a day, with a GitHub Action, for my READMEs.

Repositories that get a card: <owner/name, owner/name — or leave this line as it is, and pick my 3 most-starred public repositories that are not forks>

Use the gh CLI; if it is missing or not signed in, stop and tell me how to fix it. Show me every diff and wait for my OK before each push.

1. Find my login with `gh api user --jq .login`. The cards will live in my profile repository, <login>/<login>: clone it into a temporary folder and note its default branch. If it does not exist, stop and ask me before creating it.

2. Add .github/workflows/glancecard.yml with exactly this content, filling in my login, the repositories (one per line) and this machine's IANA time zone:

   name: glancecard
   on:
     schedule:
       - cron: "30 5 * * *"
     workflow_dispatch:
   permissions:
     contents: write
   jobs:
     cards:
       runs-on: ubuntu-latest
       timeout-minutes: 10
       steps:
         - uses: actions/checkout@v7
         - uses: gfazioli/glancecard@v0.4.0
           with:
             profile: <login>
             repos: |
               <owner/name>
             time-zone: <zone>

   Then make sure .github/dependabot.yml keeps the action up to date: if the file is missing, create it with exactly this; if it exists, add the github-actions entry to its updates:

   version: 2
   updates:
     - package-ecosystem: github-actions
       directory: /
       schedule:
         interval: weekly

   Commit both as "ci: render glancecard cards" and push.

3. Run it once with `gh workflow run glancecard.yml -R <login>/<login>`, follow it with `gh run watch`, and check that glancecard/profile-dark.svg is now on the default branch. If the run fails, show me its log and stop.

4. Add my profile card to my profile README where it fits best (ask me if unsure), then commit and push:

   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="glancecard/profile-dark.svg">
     <img src="glancecard/profile-light.svg" width="880" alt="<login>'s GitHub activity">
   </picture>

5. For each repository above, open a pull request that adds its card right under the README's title, with the same <picture> pointing at https://raw.githubusercontent.com/<login>/<login>/<default branch>/glancecard/<name>-dark.svg and -light.svg. Don't merge them: give me their links.

Change nothing else, and add no tokens or secrets: the workflow uses the token GitHub Actions already provides.
```

## Set it up by hand

**1. Add a workflow** to the repository that will hold the cards — your profile repository (`<you>/<you>`) is a good home, since its README is the first one people see:

```yaml
# .github/workflows/glancecard.yml
name: glancecard

on:
  schedule:
    - cron: "30 5 * * *" # every day
  workflow_dispatch:

permissions:
  contents: write

jobs:
  cards:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: gfazioli/glancecard@v0.4.0
        with:
          profile: your-login
          repos: |
            your-login/your-repo
            your-login/another-repo
```

**2. Run it once** from the Actions tab (*Run workflow*). It commits `glancecard/profile-dark.svg`, `glancecard/profile-light.svg` and a pair per repository.

**3. Show a card** in a README. In the same repository:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="glancecard/your-repo-dark.svg">
  <img src="glancecard/your-repo-light.svg" width="880" alt="your-repo at a glance">
</picture>
```

From another repository, point at the raw file instead: `https://raw.githubusercontent.com/<you>/<you>/main/glancecard/your-repo-dark.svg`. That way a project's own history gets no bot commits; the cards live, and refresh, in one place.

## Staying up to date

Your workflow runs the version its `uses:` line names, and keeps running it: the cards refresh every day, but the code that draws them changes only when you change that line. glancecard has no moving `v0` tag on purpose, so a new release never changes your cards behind your back.

Let [Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions) move it for you. With this file in the repository that runs the workflow, a new glancecard release becomes a pull request that bumps the `uses:` line; read the release notes in it, merge, and the next run draws with the new version:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

Dependabot also follows a line pinned to a commit SHA with the version as a comment (`gfazioli/glancecard@<sha> # v0.4.0`), the safest way to pin an action that runs with a write token. To be told about releases without Dependabot, watch the repository for releases (*Watch → Custom → Releases*). The README embeds in your other repositories need nothing: they point at the files, not at a version.

## Inputs

| Input | Default | |
|---|---|---|
| `repos` | | Repositories, as `owner/name`, separated by newlines, commas or spaces. |
| `profile` | | A login to render a profile card for. |
| `out-dir` | `glancecard` | Folder the cards are written to, relative to the workspace. |
| `theme` | `both` | `both` (`dark` and `light`), or looks, comma-separated: `dark`, `light`, `midnight`, `aurora`, `daylight`, `upside-down`, `hyperspace`, `bridge`, `nebula`, `halloween`, `christmas`. With one theme the file is `<name>.svg`, with several `<name>-<theme>.svg`. See [Looks](#looks). |
| `time-zone` | `UTC` | IANA zone, such as `Europe/Rome`, for the commit calendar and rhythm. |
| `sections` | `all` | Repository card sections to draw: `hero`, `tiles`, `activity`, `stars`, `rhythm`, `code`, `commits`, `releases`, `contributors`. When one of a side-by-side pair is left out, the other takes the full width. `stars` also draws the profile card's Stars, and leaving it out leaves out both, and the star history they read. |
| `calendar` | `chart` | How a year is drawn, on both cards: `chart`, a line of daily contributions (profile) or commits (repository) over a value axis, or `grid`, GitHub's calendar of squares. |
| `max-commits` | `5000` | Commits read for the last year, at most. A busier repository says so on its card. |
| `allow-private` | `false` | Render private repositories too. Read the note on privacy first. |
| `commit` | `true` | Commit and push the cards. On a pull request they are only rendered. |
| `commit-message` | `chore: refresh glancecard` | |
| `token` | `${{ github.token }}` | Token the API is read with. |

**Outputs:** `files`, the cards written (one path per line), and `committed`, `true` when a commit was pushed.

Repository cards are named after the repository (`octoscope-dark.svg`); two repositories with the same name from different owners become `owner-name`. The profile card is `profile-dark.svg` and `profile-light.svg`. Beside them, `.stars.json` keeps the star histories read, committed with the cards, so the next run asks GitHub for the newest weeks only; delete it and the next run reads them all again.

## Looks

Nine looks, after the ones of [FinderGit](https://findergit.app)'s Profile Card: each sets every colour a card draws, and most past the classics a lettering and decorations of their own. They work on both cards. See them all, and switch between them, on the [website](https://gfazioli.github.io/glancecard/#looks).

| | | |
|:-:|:-:|:-:|
| <img src="https://gfazioli.github.io/glancecard/cards/profile-midnight.svg" width="280" alt="Midnight"><br>`midnight` (`dark`) | <img src="https://gfazioli.github.io/glancecard/cards/profile-aurora.svg" width="280" alt="Aurora"><br>`aurora` | <img src="https://gfazioli.github.io/glancecard/cards/profile-daylight.svg" width="280" alt="Daylight"><br>`daylight` (`light`) |
| <img src="https://gfazioli.github.io/glancecard/cards/profile-upside-down.svg" width="280" alt="Upside Down"><br>`upside-down` | <img src="https://gfazioli.github.io/glancecard/cards/profile-hyperspace.svg" width="280" alt="Hyperspace"><br>`hyperspace` | <img src="https://gfazioli.github.io/glancecard/cards/profile-bridge.svg" width="280" alt="Bridge"><br>`bridge` |
| <img src="https://gfazioli.github.io/glancecard/cards/profile-nebula.svg" width="280" alt="Nebula"><br>`nebula` | <img src="https://gfazioli.github.io/glancecard/cards/profile-halloween.svg" width="280" alt="Halloween"><br>`halloween` | <img src="https://gfazioli.github.io/glancecard/cards/profile-christmas.svg" width="280" alt="Christmas"><br>`christmas` |

`halloween` and `christmas` are worn in their season only, from 1 October to 2 November and from 1 December to 6 January in the card's `time-zone`; the rest of the year they are Midnight, and they come back on their own next season. The CLI's `--all-seasons` wears them any day, for a preview.

## Preview from a terminal

```sh
npx github:gfazioli/glancecard repo your-login/your-repo --out cards
npx github:gfazioli/glancecard profile your-login --out cards
```

The token is read from `GITHUB_TOKEN`, then `GH_TOKEN`, then `gh auth token`. `--help` lists the options; they mirror the inputs above, and the time zone defaults to your machine's.

## Questions

**Why does it commit to my repository?** A README image has to be a file somewhere. Committing it keeps everything inside GitHub, with no service to trust or keep alive. Commits pushed with the workflow token start no other workflow, and they keep the repository active, which is what stops GitHub from disabling the schedule of a public repository after 60 quiet days.

**How fresh is a card?** As fresh as your schedule. GitHub caches a raw file for about five minutes, and scheduled runs often start late.

**Privacy.** With the default token a card shows what anyone can see. A personal token can see private repositories, so glancecard refuses them unless you set `allow-private: true`: their card would publish their activity wherever it is committed. The profile card counts public repositories only; its year of contributions is the one GitHub computes for the token's viewer.

**Rate limits.** A repository card costs a handful of requests, plus one per hundred commits of the last year and one per hundred releases. The workflow token allows 1,000 REST requests and 1,000 GraphQL points an hour per repository: dozens of cards per run. The stars cost the most on the first run, up to a request for every 30 weeks of each repository's life (the author's profile, 69 repositories back to 2011, took 427), and one request per repository on every run after, thanks to `.stars.json`. A first run near the limit can leave `stars` out of `sections` once, or render the profile and the repositories an hour apart.

**Time zone.** GitHub returns commit times in UTC and drops the author's offset, so the calendar and the rhythm are read in the zone you give.

**Fonts.** An SVG shown as an image can't load fonts or measure its text, so the cards use the system font and estimate its widths from tables measured in a browser. On macOS, Windows and Linux the text fits; CI screenshots the cards on Linux and Windows to keep it that way.

## Development

Node 20 or later, no dependencies. The website lives in `site/` and is published to GitHub Pages by `.github/workflows/pages.yml`.

```sh
npm test            # unit tests and the golden cards
npm run golden      # rewrite test/golden/ after a deliberate change to a card
npm run preview     # render the golden cases into preview/ and screenshot them with Chrome
node scripts/record-fixture.js owner/name test/fixtures/name.json   # record a new fixture
node scripts/site.js build && node scripts/site.js serve              # the website, at http://127.0.0.1:4173/
```

The golden cards are rendered from recorded API data at the instant it was recorded, so they only change when the drawing does. Look at `npm run preview` before committing new ones.

## Sponsor

<div align="center">

[<kbd> <br/> ❤️ If this tool has been useful to you or your team, please consider becoming a sponsor <br/> </kbd>](https://github.com/sponsors/gfazioli?o=esc)

</div>

Your support helps me:

- Keep the project actively maintained with timely bug fixes and security updates
- Add new features, improve performance, and refine the developer experience
- Expand test coverage and documentation for smoother adoption
- Ensure long-term sustainability without relying on ad hoc free time
- Prioritize community requests and roadmap items that matter most

Open source thrives when those who benefit can give back—even a small monthly contribution makes a real difference. Sponsorships help cover maintenance time, infrastructure, and the countless invisible tasks that keep a project healthy.

Your help truly matters.

💚 [Become a sponsor](https://github.com/sponsors/gfazioli?o=esc) today and help me keep this project reliable, up-to-date, and growing for everyone.

## Credits

The repository card's layout follows the repository view of [FinderGit](https://findergit.app), a Git-aware file browser for macOS, and the looks are its Profile Card's. Icons are [Octicons](https://github.com/primer/octicons) (MIT).

## License

[MIT](LICENSE) © Giovambattista Fazioli
