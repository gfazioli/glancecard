// The golden cards: each fixture rendered as a release would, at the instant
// it was recorded, in Europe/Rome, without avatars.

import { readFileSync } from "node:fs";
import { profileModel } from "../../src/profile/model.js";
import { renderProfile } from "../../src/profile/render.js";
import { repoModel } from "../../src/repo/model.js";
import { renderRepo } from "../../src/repo/render.js";
import { THEMES } from "../../src/theme.js";

const TZ = "Europe/Rome";

export const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));

export const CASES = [
  { name: "octoscope-dark", fixture: "octoscope", theme: "dark" },
  { name: "octoscope-light", fixture: "octoscope", theme: "light" },
  { name: "react-switch-button-dark", fixture: "react-switch-button", theme: "dark" },
  { name: "octoscope-sections-light", fixture: "octoscope", theme: "light", sections: ["hero", "code", "releases"] },
  { name: "profile-gfazioli-dark", fixture: "profile-gfazioli", theme: "dark" },
  { name: "profile-gfazioli-light", fixture: "profile-gfazioli", theme: "light" },
];

export function renderCase(c) {
  const data = fixture(c.fixture);
  const theme = THEMES[c.theme];
  if (data.kind === "profile") return renderProfile(profileModel(data, { timeZone: TZ }), { theme });
  return renderRepo(repoModel(data, { timeZone: TZ }), { theme, ...(c.sections && { sections: c.sections }) });
}

export const goldenPath = (c) => new URL(`../golden/${c.name}.svg`, import.meta.url);
