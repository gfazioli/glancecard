#!/usr/bin/env node
// Renders every golden case into preview/ and screenshots each with headless
// Chrome, so a change can be looked at, on this machine's fonts, before it
// ships. CI runs it on Linux and Windows and uploads the folder.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CASES, renderCase } from "../test/support/cases.js";
import { findChrome, screenshot } from "./screenshot.js";

const dir = path.resolve(process.argv[2] || "preview");
mkdirSync(dir, { recursive: true });
const chrome = findChrome();
if (!chrome) console.warn("Chrome not found (set CHROME_PATH): writing the SVGs only");
for (const c of CASES) {
  const svg = path.join(dir, `${c.name}.svg`);
  writeFileSync(svg, renderCase(c));
  console.log(chrome ? screenshot(chrome, svg) : svg);
}
