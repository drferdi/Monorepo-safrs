import assert from "node:assert/strict";
import { test } from "node:test";

import { repoPath, repoPathExists, repoRoot } from "./root.ts";

test("repoRoot menemukan root repository dari cwd", async () => {
  const root = await repoRoot();
  assert.ok(root.length > 0);
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
