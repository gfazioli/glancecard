#!/usr/bin/env node
// Rewrites test/golden/*.svg from the fixtures. Run it after a deliberate
// change to how a card looks, then look at the diff (and `npm run preview`)
// before committing: the golden files are what the tests hold the cards to.

import { writeFileSync } from "node:fs";
import { CASES, goldenPath, renderCase } from "../test/support/cases.js";

for (const c of CASES) {
  writeFileSync(goldenPath(c), renderCase(c));
  console.log(`test/golden/${c.name}.svg`);
}
