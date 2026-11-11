import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { repoPath, repoPathExists, repoRoot } from "./root.ts";

// A disposable repository with both root markers, so these tests run the same
// inside the monorepo and in an extracted copy of the capsule.
const fixture = realpathSync(
  mkdtempSync(join(tmpdir(), "control-center-root-")),
);
writeFileSync(join(fixture, "pnpm-workspace.yaml"), "packages: []\n");
writeFileSync(join(fixture, "SAFRS_SPEC.md"), "# fixture\n");
writeFileSync(join(fixture, "package.json"), "{}\n");
process.env.SENTRA_REPO_ROOT = fixture;

test("repoRoot memakai SENTRA_REPO_ROOT yang menunjuk repository", async () => {
  assert.equal(await repoRoot(), fixture);
});

test("repoPath menolak path absolut", async () => {
  // process.cwd() is absolute on every platform.
  await assert.rejects(() => repoPath(process.cwd()), /Absolute paths/);
});

test("repoPath menolak traversal keluar repository", async () => {
  await assert.rejects(
    () => repoPath("../outside.txt"),
    /escapes the repository/,
  );
  await assert.rejects(() => repoPath(".."), /escapes the repository/);
});

test("repoPath menerima path relatif yang tetap di dalam", async () => {
  const resolved = await repoPath("package.json");
  assert.ok(resolved.endsWith("package.json"));
});

test("repoPathExists false untuk path yang tidak ada", async () => {
  assert.equal(await repoPathExists("tidak-ada/berkas-xyz.txt"), false);
});
