// The golden cards: each fixture rendered as a release would, at the instant
// it was recorded, in Europe/Rome, without avatars. The fixtures were
// recorded in October, so Christmas is asked for with allSeasons.

import { readFileSync } from "node:fs";
import { profileModel } from "../../src/profile/model.js";
import { renderProfile } from "../../src/profile/render.js";
import { repoModel } from "../../src/repo/model.js";
import { renderRepo } from "../../src/repo/render.js";
import { resolveLook, theme as lookTheme } from "../../src/theme.js";

const TZ = "Europe/Rome";

export const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));

export const CASES = [
  { name: "octoscope-dark", fixture: "octoscope", theme: "dark" },
  { name: "octoscope-light", fixture: "octoscope", theme: "light" },
  { name: "react-switch-button-dark", fixture: "react-switch-button", theme: "dark" },
  { name: "octoscope-sections-light", fixture: "octoscope", theme: "light", sections: ["hero", "code", "releases"] },
  { name: "profile-gfazioli-dark", fixture: "profile-gfazioli", theme: "dark" },
  { name: "profile-gfazioli-light", fixture: "profile-gfazioli", theme: "light" },
  { name: "profile-gfazioli-aurora", fixture: "profile-gfazioli", theme: "aurora" },
  { name: "profile-gfazioli-hyperspace", fixture: "profile-gfazioli", theme: "hyperspace" },
  { name: "profile-gfazioli-bridge", fixture: "profile-gfazioli", theme: "bridge" },
  { name: "profile-gfazioli-halloween", fixture: "profile-gfazioli", theme: "halloween" },
  { name: "octoscope-upside-down", fixture: "octoscope", theme: "upside-down" },
  { name: "octoscope-nebula", fixture: "octoscope", theme: "nebula" },
  { name: "octoscope-christmas", fixture: "octoscope", theme: "christmas", allSeasons: true },
];

export function renderCase(c) {
  const data = fixture(c.fixture);
  const theme = lookTheme(resolveLook(c.theme, { now: new Date(data.fetchedAt), timeZone: TZ, allSeasons: c.allSeasons }));
  if (data.kind === "profile") return renderProfile(profileModel(data, { timeZone: TZ }), { theme });
  return renderRepo(repoModel(data, { timeZone: TZ }), { theme, ...(c.sections && { sections: c.sections }) });
}

export const goldenPath = (c) => new URL(`../golden/${c.name}.svg`, import.meta.url);
