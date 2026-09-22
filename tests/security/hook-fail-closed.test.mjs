import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

function runHook(path) {
  return spawnSync(process.execPath, [path], {
    cwd: repositoryRoot,
    encoding: "utf8",
    input: "{invalid-json",
  });
}

test("Cursor hooks deny malformed payloads", () => {
  for (const path of [
    ".cursor/hooks/guard-shell.mjs",
    ".cursor/hooks/guard-read-secrets.mjs",
  ]) {
    const result = runHook(path);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).permission, "deny");
  }
});

test("Claude hook blocks malformed payloads", () => {
  const result = runHook(".claude/hooks/guard-sensitive-paths.mjs");
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /could not be parsed/iu);
});

test("CODEOWNERS covers every sensitive adapter directory", () => {
  const owners = readFileSync(
    join(repositoryRoot, ".github/CODEOWNERS"),
    "utf8",
  );

  for (const pattern of [
    "/.cursor/**",
    "/.claude/**",
    "/.codex/**",
    "/.husky/**",
    "**/.mcp.json",
  ]) {
    assert.match(
      owners,
      new RegExp(`^${escapeRegExp(pattern)}\\s+@drferdii$`, "mu"),
    );
  }
});

test("CODEOWNERS covers the task ownership verification control", () => {
  const owners = readFileSync(
    join(repositoryRoot, ".github/CODEOWNERS"),
    "utf8",
  );

  assert.match(
    owners,
    /^\/tests\/governance\/test_task_ownership\.py\s+@drferdii$/mu,
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
