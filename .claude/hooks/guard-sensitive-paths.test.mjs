import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, rmdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "guard-sensitive-paths.mjs",
);
const repoRoot = path.resolve(path.dirname(hookPath), "..", "..");

function runHook(payload, spawnOptions = {}) {
  const result = spawnSync("node", [hookPath], {
    input: JSON.stringify(payload),
    cwd: repoRoot,
    encoding: "utf8",
    ...spawnOptions,
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

test("write to a sibling worktree of this repo is allowed even when the hook's own cwd is lowercase-drive", {
  skip: process.platform !== "win32" && process.platform !== "darwin",
}, () => {
  // Regression test for the actual mechanism (confirmed by running the
  // two `git` invocations directly against this repo, git 2.55.0.windows.3,
  // core.ignorecase=true — the Windows default):
  //
  //   git -C <repoRoot>  rev-parse --git-common-dir   ->  ".git"                 (RELATIVE)
  //   git -C <worktree>  rev-parse --git-common-dir   ->  "D:/.../Monorepo/.git" (ABSOLUTE, canonical case)
  //
  // `commonGitDirectory()` does `path.resolve(directory, raw)`. When `raw`
  // is relative (the main-tree case above), `path.resolve` stamps
  // whatever casing the CALLER'S `directory` argument happens to have
  // onto the result — so a hook process invoked with a lowercase-drive
  // cwd (`d:\DEV\Monorepo`) produces `ours = "d:\DEV\Monorepo\.git"`.
  // When `raw` is already absolute (the worktree case above),
  // `path.resolve` ignores `directory` entirely and returns git's own
  // canonically-cased output untouched — `"D:\DEV\Monorepo\.git"`. Those
  // two strings denote the identical physical directory but differ by
  // drive-letter case, so a plain `===` never matched, the walk in
  // `repositoryRootFor()` fell through every parent, and it silently fell
  // back to returning the hook's own `process.cwd()` (the MAIN tree) as
  // the resolved root — even though the actual target lived in a
  // legitimate sibling worktree. That wrong root then made the worktree
  // target look like it escaped outside the repository.
  //
  // To reproduce this for real, the test must: (a) force the hook's own
  // spawn `cwd` to the repo's TOPLEVEL with a lowercase drive letter
  // (worktree cwds always get git's absolute/canonical form and can
  // never trigger the mismatch), and (b) target a file in a genuine
  // SIBLING worktree — `../Monorepo.worktrees/<name>`, matching how real
  // worktrees are laid out in this repo — not one nested inside
  // `repoRoot`, since a nested target stays "inside" even the wrong
  // fallback root and never exercises the outside-repository check at
  // all.
  const commonDirFromRoot = execFileSync(
    "git",
    ["-C", repoRoot, "rev-parse", "--git-common-dir"],
    { encoding: "utf8" },
  ).trim();
  assert.ok(
    !path.isAbsolute(commonDirFromRoot),
    `precondition failed: this test's repro depends on 'git rev-parse --git-common-dir' ` +
      `returning a RELATIVE path from the repo toplevel, but got an absolute path ` +
      `("${commonDirFromRoot}") — this git version/config no longer exhibits the ` +
      "asymmetry this fix addresses; the mechanism (and this test) needs re-deriving.",
  );

  const worktreesParent = path.resolve(repoRoot, "..");
  const worktreeName = "guard-hook-regression-test-worktree";
  const worktreeAbsolute = path.join(worktreesParent, worktreeName);
  const worktreeArg = path.relative(repoRoot, worktreeAbsolute);

  // Pre-clean: a worktree left registered by a previously crashed run
  // would otherwise wedge every subsequent run at `git worktree add`.
  execFileSync("git", ["worktree", "prune"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (existsSync(worktreeAbsolute)) {
    execFileSync("git", ["worktree", "remove", "--force", worktreeArg], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  }

  execFileSync("git", ["worktree", "add", "--detach", worktreeArg], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  try {
    const lowercaseRepoRoot = repoRoot[0].toLowerCase() + repoRoot.slice(1);
    const targetInSiblingWorktree = `${worktreeAbsolute.replace(/\\/g, "/")}/README.md`;

    const result = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: targetInSiblingWorktree, content: "x" },
      },
      { cwd: lowercaseRepoRoot },
    );
    assert.equal(
      result.exitCode,
      0,
      `expected allow, got exit ${result.exitCode}: ${result.stderr}`,
    );
  } finally {
    execFileSync("git", ["worktree", "remove", "--force", worktreeArg], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    execFileSync("git", ["worktree", "prune"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    // `git worktree remove` doesn't always clean up an emptied parent dir
    // it created along the way; it's untracked (git ignores empty dirs)
    // so `git status` won't show it, but it's real disk debris otherwise.
    if (existsSync(worktreeAbsolute)) {
      rmdirSync(worktreeAbsolute, { recursive: true });
    }
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
