import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseJsonc } from "./jsonc.mjs";

test("root exposes the solo-developer command contract", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  for (const command of [
    "setup",
    "doctor",
    "dev",
    "build",
    "lint",
    "format",
    "fix",
    "typecheck",
    "test",
    "test:e2e",
    "check",
    "db:start",
    "db:stop",
    "db:studio",
    "db:generate",
    "db:migrate",
    "db:seed",
    "db:reset",
    "project:new",
    "project:status",
    "project:verify",
    "capability:add",
  ]) {
    assert.equal(typeof pkg.scripts[command], "string", command);
  }
  assert.match(pkg.packageManager, /^pnpm@11\./);
});

test("root follows canonical SAFRS topology and excludes protected paths from Biome", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const workspace = fs.readFileSync("pnpm-workspace.yaml", "utf8");
  // biome.jsonc carries // comments, so it needs the JSONC parser, not JSON.parse.
  const biome = parseJsonc(fs.readFileSync("biome.jsonc", "utf8"));

  assert.match(workspace, /- projects\/\*\/\*\/apps\/\*/);
  assert.match(workspace, /- packages\/\*/);
  assert.match(workspace, /- tools\/\*/);
  assert.doesNotMatch(workspace, /- apps\/\*/);
  assert.doesNotMatch(workspace, /- tooling\/\*/);
  assert.equal(pkg.scripts.doctor, "node tools/doctor/src/cli.mjs");
  assert.equal(
    pkg.scripts["project:new"],
    "node tools/project-wizard/src/cli.mjs",
  );
  assert.equal(
    pkg.scripts["project:status"],
    "node tools/project-standalone/src/cli.mjs status",
  );
  assert.equal(
    pkg.scripts["project:verify"],
    "node tools/project-standalone/src/cli.mjs verify",
  );
  assert.equal(
    pkg.scripts["capability:add"],
    "node tools/capabilities/src/cli.mjs",
  );
  assert.ok(biome.files.includes.includes("!!**/.safrs"));
  assert.ok(biome.files.includes.includes("!!**/.turbo"));
  assert.ok(biome.files.includes.includes("!!**/.next"));
  assert.ok(biome.files.includes.includes("!!**/next-env.d.ts"));
  // Root has no demonstrator (Chief, 2026-09-25): golden-path stays out of the root workspace.
  assert.match(workspace, /- '!projects\/internal\/golden-path\/\*\*'/);
});

// Capsules the root workspace excludes ('!<path>/**' lines in pnpm-workspace.yaml).
function excludedCapsules() {
  const workspace = fs.readFileSync("pnpm-workspace.yaml", "utf8");
  return [...workspace.matchAll(/^\s*- '!(.+)\/\*\*'\s*$/gmu)].map(
    (match) => `${match[1]}/`,
  );
}

test("the lockfile keeps no importer for a capsule the workspace excludes", () => {
  // pnpm 11 keeps a stale importer after an exclusion and still passes --frozen-lockfile.
  const lockfile = fs.readFileSync("pnpm-lock.yaml", "utf8");
  const importers = lockfile
    .slice(
      lockfile.indexOf("\nimporters:\n"),
      lockfile.indexOf("\npackages:\n"),
    )
    .split("\n")
    .flatMap((line) => line.match(/^ {2}([^\s'][^:]*):/u)?.[1] ?? []);
  assert.ok(importers.includes("."));
  const excluded = excludedCapsules();
  assert.ok(excluded.length > 0);
  assert.deepEqual(
    importers.filter((importer) =>
      excluded.some((capsule) => `${importer}/`.startsWith(capsule)),
    ),
    [],
  );
});

test("the root token gate never scans a capsule the workspace excludes", () => {
  // Chief, 2026-09-25: a standalone capsule owns its own token gate.
  const scope = fs
    .readFileSync("packages/token/scope.txt", "utf8")
    .split("\n")
    .map((line) => line.replace(/#.*$/u, "").trim())
    .filter(Boolean);
  assert.ok(scope.includes("packages/token"));
  const excluded = excludedCapsules();
  assert.deepEqual(
    scope.filter((entry) =>
      excluded.some((capsule) => `${entry}/`.startsWith(capsule)),
    ),
    [],
  );
});
