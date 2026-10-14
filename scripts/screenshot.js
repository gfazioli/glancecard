#!/usr/bin/env node
// Screenshots SVG cards to PNG with headless Chrome, at 2x, beside each SVG:
// the eye for "does the text fit with this machine's fonts".
//
//   node scripts/screenshot.js card.svg [more.svg ...]
//
// Chrome is found through CHROME_PATH or the usual install locations.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = {
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"],
    win32: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"],
  }[process.platform];
  if (candidates) return candidates.find((p) => existsSync(p)) ?? null;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [name], { encoding: "utf8" });
    if (found.status === 0) return found.stdout.trim();
  }
  return null;
}

export function screenshot(chrome, svgPath, pngPath = svgPath.replace(/\.svg$/, ".png")) {
  const height = Number(readFileSync(svgPath, "utf8").match(/<svg[^>]* height="(\d+)"/)?.[1] ?? 1200);
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    `--window-size=880,${height}`,
    `--screenshot=${pngPath}`,
    pathToFileURL(svgPath).href,
  ];
  // Ubuntu runners refuse Chrome's sandbox to an unprivileged user.
  if (process.platform === "linux") args.unshift("--no-sandbox");
  execFileSync(chrome, args, { stdio: "ignore" });
  return pngPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const chrome = findChrome();
  if (!chrome) {
    console.error("Chrome not found: set CHROME_PATH");
    process.exit(1);
  }
  for (const svg of process.argv.slice(2)) console.log(screenshot(chrome, svg));
}
