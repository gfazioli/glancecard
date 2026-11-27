import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The library entries, imported by the package's own name as a program that installs it does,
// and held to their types: a name exported at runtime and missing from the .d.ts would reach a
// TypeScript caller as an error, one in the .d.ts and missing at runtime as a crash.
const declared = (file) =>
  new Set(
    [...readFileSync(new URL(`../types/${file}`, import.meta.url), "utf8").matchAll(/^export (?:function|const) (\w+)/gm)].map(
      (m) => m[1],
    ),
  );

for (const [entry, types] of [
  ["glancecard", "index.d.ts"],
  ["glancecard/setup", "setup.d.ts"],
]) {
  test(`${entry}: every name declared in types/${types} is exported`, async () => {
    const module = await import(entry);
    const names = declared(types);
    assert.ok(names.size > 5, `types/${types} declares its names`);
    for (const name of names) assert.ok(name in module, `${entry} exports ${name}`);
  });
}

for (const [entry, types] of [
  ["glancecard", "index.d.ts"],
  ["glancecard/setup", "setup.d.ts"],
]) {
  test(`${entry}: every name it exports is declared in types/${types}`, async () => {
    const names = declared(types);
    for (const name of Object.keys(await import(entry))) assert.ok(names.has(name), `types/${types} declares ${name}`);
  });
}

test("the library draws a card from a recorded fixture, as its header says", async () => {
  const { repoModel, renderRepo, theme } = await import("glancecard");
  const data = JSON.parse(readFileSync(new URL("./fixtures/octoscope.json", import.meta.url), "utf8"));
  const svg = renderRepo(repoModel(data, { timeZone: "Europe/Rome" }), { theme: theme("nebula") });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 880 \d+"/);
});

test("the setup entry writes a workflow from the README's block", async () => {
  const { plan, workflow } = await import("glancecard/setup");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const yaml = readme.match(/```yaml\n(# \.github\/workflows\/glancecard\.yml[\s\S]*?)```/)[1];
  const out = workflow(yaml, plan({ mode: "one", look: "workbench" }));
  assert.match(out, /\n {10}theme: workbench\n/);
});

test("the package publishes the library's files", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const targets = [".", "./setup"].flatMap((entry) => ["import", "require"].flatMap((c) => Object.values(pkg.exports[entry][c])));
  assert.equal(targets.length, 8);
  for (const target of targets) {
    const file = target.replace(/^\.\//, "");
    assert.ok(pkg.files.some((f) => file === f || file.startsWith(`${f}/`)), `${file} is in files`);
  }
});

// A CommonJS TypeScript project (a Raycast extension is one) resolves the `require` condition,
// and TypeScript refuses an ES module's .d.ts there (TS1479): the .d.cts are the same
// declarations in a file it accepts. They are copies, and must stay copies.
test("the CommonJS declarations are the ES ones, byte for byte", () => {
  for (const name of ["index", "setup"]) {
    const read = (ext) => readFileSync(new URL(`../types/${name}.${ext}`, import.meta.url), "utf8");
    assert.equal(read("d.cts"), read("d.ts"), `types/${name}.d.cts is a copy of types/${name}.d.ts`);
  }
});
