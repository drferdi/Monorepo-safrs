import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "guard-sensitive-paths.mjs",
);
const repoRoot = path.resolve(path.dirname(hookPath), "..", "..");

function runHook(payload) {
  const result = spawnSync("node", [hookPath], {
    input: JSON.stringify(payload),
    cwd: repoRoot,
    encoding: "utf8",
  });
  return { exitCode: result.status, stderr: result.stderr ?? "" };
}

test("write outside the repository is denied", () => {
  const result = runHook({
    tool_name: "Write",
    tool_input: {
      file_path: "C:/Users/nobody/outside-the-repo/file.txt",
      content: "x",
    },
  });
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /outside the repository/);
});

test("write to an existing git worktree of this repo is allowed regardless of drive-letter case", () => {
  // Regression test for the bug where a hook process with cwd cased one way
  // (e.g. `d:\DEV\Monorepo`) compared against a worktree target path cased
  // the other way (e.g. `D:\DEV\Monorepo.worktrees\...`) fell back to the
  // wrong repository root and denied the write as "outside the repository",
  // even though the target was a legitimate in-worktree path. This uses a
  // throwaway worktree created and torn down within the test so it does not
  // depend on any worktree left over from other work.
  const worktreeDir = execFileSync(
    "git",
    ["worktree", "add", "--detach", ".test-worktrees/guard-hook-regression"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  void worktreeDir;
  const worktreeAbsolute = path.resolve(
    repoRoot,
    ".test-worktrees/guard-hook-regression",
  );
  // Deliberately invert the drive-letter case from what repoRoot/cwd uses,
  // to reproduce the exact mismatch that caused the original bug.
  const invertedCaseTarget =
    (worktreeAbsolute[0] === worktreeAbsolute[0].toUpperCase()
      ? worktreeAbsolute[0].toLowerCase()
      : worktreeAbsolute[0].toUpperCase()) +
    worktreeAbsolute.slice(1).replace(/\\/g, "/") +
    "/README.md";

  try {
    const result = runHook({
      tool_name: "Write",
      tool_input: { file_path: invertedCaseTarget, content: "x" },
    });
    assert.equal(
      result.exitCode,
      0,
      `expected allow, got exit ${result.exitCode}: ${result.stderr}`,
    );
  } finally {
    execFileSync(
      "git",
      [
        "worktree",
        "remove",
        "--force",
        ".test-worktrees/guard-hook-regression",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
  }
});

test("write to a verification-control path stays allowed but carries an R2 notice", () => {
  const result = runHook({
    tool_name: "Write",
    tool_input: {
      file_path: path.join(repoRoot, "AGENTS.md"),
      content: "x",
    },
  });
  assert.equal(result.exitCode, 0);
  assert.match(result.stderr, /R2/);
});
