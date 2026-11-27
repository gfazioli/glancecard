// glancecard as a library: what the Action and the CLI do, one step at a time, for a program
// that shows the cards itself (the Raycast extension does). Read a card's data from GitHub,
// turn it into what the card draws, draw it in a look:
//
//   const client = createClient({ token });
//   const data = await fetchRepo(client, "owner/name", { timeZone });
//   const svg = renderRepo(repoModel(data, { timeZone }), { theme: theme("nebula") });
//
// The setup the website's editor writes (the workflow, the README embed, the one-paste
// prompt) is `glancecard/setup`.

export { createClient, loadImages } from "./github.js";
export { fetchProfile } from "./profile/fetch.js";
export { profileModel } from "./profile/model.js";
export { renderProfile } from "./profile/render.js";
export { fetchRepo } from "./repo/fetch.js";
export { repoModel } from "./repo/model.js";
export { REPO_SECTIONS, renderRepo } from "./repo/render.js";
export { fetchStars, mergeStars, starStore } from "./stars.js";
export { CALENDARS, STARS_CHARTS } from "./svg.js";
export { LOOK_NAMES, THEME_NAMES, inSeason, lightOf, resolveLook, theme } from "./theme.js";
export { fileBases, fileNames, renderCards } from "./run.js";
export { clock } from "./time.js";
