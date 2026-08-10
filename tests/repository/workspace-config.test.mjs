import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

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
    "capability:add",
  ]) {
    assert.equal(typeof pkg.scripts[command], "string", command);
  }
  assert.match(pkg.packageManager, /^pnpm@11\./);
});

test("root follows canonical SAFRS topology and excludes protected paths from Biome", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const webPackage = JSON.parse(
    fs.readFileSync("projects/golden-path/apps/web/package.json", "utf8"),
  );
  const workspace = fs.readFileSync("pnpm-workspace.yaml", "utf8");
  const biome = JSON.parse(fs.readFileSync("biome.jsonc", "utf8"));

  assert.match(workspace, /- projects\/\*\/apps\/\*/);
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
    pkg.scripts["capability:add"],
    "node tools/capabilities/src/cli.mjs",
  );
  assert.ok(biome.files.includes.includes("!!**/.safrs"));
  assert.ok(biome.files.includes.includes("!!**/.turbo"));
  assert.ok(biome.files.includes.includes("!!**/.next"));
  assert.ok(biome.files.includes.includes("!!**/next-env.d.ts"));
  assert.equal(webPackage.scripts.dev, "next dev");
  assert.equal(webPackage.scripts.start, "next start");
});
