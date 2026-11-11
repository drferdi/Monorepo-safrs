import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "session-context.mjs",
);
const repoRoot = path.resolve(path.dirname(hookPath), "..", "..");

function runHook(input, cwd = repoRoot) {
  return spawnSync("node", [hookPath], { input, cwd, encoding: "utf8" });
}

test("compact prints branch, git status, and the HANDOFF head", () => {
  const result = runHook(JSON.stringify({ source: "compact", cwd: repoRoot }));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SAFRS session context \(compact\)/);
  assert.match(result.stdout, /^Branch: /m);
  assert.match(result.stdout, /git status --short:/);
  assert.match(result.stdout, /\.agents\/HANDOFF\.md \(first 40 lines\):/);
});

test("outside a git repository it prints nothing and never blocks", () => {
  const outside = mkdtempSync(path.join(os.tmpdir(), "session-context-"));
  try {
    const result = runHook(
      JSON.stringify({ source: "startup", cwd: outside }),
      outside,
    );
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("a malformed payload still exits 0", () => {
  const result = runHook("not-json");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /SAFRS session context \(startup\)/);
});
