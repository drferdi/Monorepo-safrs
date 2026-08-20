#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard — thin translator into the shared SAFRS
 * guard (tools/automation/src/guard.mjs). Exit 2 blocks; stderr carries the
 * reason or an R2 notice. Writes outside the repository are now denied
 * (previously warn-only) to match the canonical verdict set.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

let payload = null;
try {
  const raw = readFileSync(0, "utf8").trim();
  payload = raw ? JSON.parse(raw) : null;
} catch (error) {
  console.error(
    `SAFRS guard: hook payload could not be parsed (${error.message}); path classification was skipped.`,
  );
  process.exit(0);
}

/**
 * Git worktrees of one repository share a common git directory, and
 * AGENTS.md rule 8 *requires* mutation work to happen in a sibling worktree.
 * Resolving targets only against process.cwd() therefore denied legitimate
 * writes as "outside the repository". A target is in-repository when its
 * enclosing worktree shares our common git directory.
 */
function commonGitDirectory(directory) {
  try {
    const raw = execFileSync(
      "git",
      ["-C", directory, "rev-parse", "--git-common-dir"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    return path.resolve(directory, raw);
  } catch {
    return null;
  }
}

/**
 * `git rev-parse --git-common-dir` is asymmetric: from a repository's own
 * toplevel it prints a RELATIVE path (`.git`), but from a linked worktree
 * it prints the ABSOLUTE, canonically-cased path (e.g. `D:/DEV/Monorepo/.git`).
 * `commonGitDirectory()` runs `path.resolve(directory, raw)` — when `raw` is
 * relative, `path.resolve` stamps whatever drive-letter CASE the caller's
 * own `directory` argument happens to have onto the result; when `raw` is
 * already absolute, `path.resolve` ignores `directory` entirely and returns
 * git's own canonical casing untouched. So a hook process invoked with a
 * lowercase-drive cwd at the repo toplevel (`d:\DEV\Monorepo`) computes
 * `ours = "d:\DEV\Monorepo\.git"`, while probing a linked worktree returns
 * git's canonical `"D:\DEV\Monorepo\.git"` — identical physical directory,
 * different string. A plain `===` never matched, so the walk in
 * `repositoryRootFor()` fell through every parent and silently fell back to
 * the hook's own `process.cwd()` (the MAIN tree) as the resolved root, which
 * then made a legitimate worktree target look like it escaped outside the
 * repository. Compare case-insensitively on win32/darwin (their default
 * filesystems, NTFS/APFS, are case-insensitive); POSIX stays case-sensitive
 * since ext4 etc. genuinely are. Null/undefined never match, including
 * against themselves — an unresolved directory is never "the same" as
 * anything.
 */
function sameDirectory(a, b) {
  if (a == null || b == null) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (process.platform === "win32" || process.platform === "darwin") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

function repositoryRootFor(target) {
  const directory = path.dirname(path.resolve(process.cwd(), target));
  const ours = commonGitDirectory(process.cwd());
  if (!ours) {
    return process.cwd();
  }
  let probe = directory;
  while (true) {
    if (sameDirectory(commonGitDirectory(probe), ours)) {
      try {
        return execFileSync(
          "git",
          ["-C", probe, "rev-parse", "--show-toplevel"],
          {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          },
        ).trim();
      } catch {
        return process.cwd();
      }
    }
    const parent = path.dirname(probe);
    if (parent === probe) {
      return process.cwd();
    }
    probe = parent;
  }
}

const target =
  payload?.tool_input?.file_path ??
  payload?.tool_input?.notebook_path ??
  payload?.tool_input?.path ??
  null;
const root = target ? repositoryRootFor(String(target)) : process.cwd();
const [{ authorize }, claude] = await Promise.all([
  import(pathToFileURL(path.join(root, "tools/automation/src/guard.mjs")).href),
  import(
    pathToFileURL(path.join(root, "tools/automation/src/adapters/claude.mjs"))
      .href
  ),
]);

let sensitivePaths;
try {
  sensitivePaths = JSON.parse(
    readFileSync(path.join(root, ".safrs/sensitive-paths.json"), "utf8"),
  );
} catch {
  sensitivePaths = { patterns: [], verification_control_patterns: [] };
}

for (const event of claude.translate(payload, root)) {
  const rendered = claude.render(authorize(event, { sensitivePaths }));
  if (rendered.stderr) {
    console.error(rendered.stderr);
  }
  if (rendered.exitCode !== 0) {
    process.exit(rendered.exitCode);
  }
}
process.exit(0);
