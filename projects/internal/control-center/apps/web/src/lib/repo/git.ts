import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { repoRoot } from "./root.ts";
import type { GitSnapshot, UnmergedBranch } from "./types.ts";

const run = promisify(execFile);

/**
 * Read-only git inspection.
 *
 * `execFile` is used deliberately: arguments are passed as an array and never
 * interpolated into a shell string, so no repository content can become a
 * command. Nothing here mutates the repository.
 */
async function git(args: string[]): Promise<string> {
  const cwd = await repoRoot();
  const { stdout } = await run("git", args, {
    cwd,
    // A repository read should never take this long; a hang must not wedge a page render.
    timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

/** Branches that are not merge targets and carry no unique work worth surfacing. */
const BRANCH_DENYLIST = new Set(["main", "HEAD"]);

export async function readGit(): Promise<GitSnapshot> {
  try {
    const [branch, head, status, branchList] = await Promise.all([
      git(["rev-parse", "--abbrev-ref", "HEAD"]),
      git(["rev-parse", "--short", "HEAD"]),
      git(["status", "--porcelain=v1"]),
      git(["for-each-ref", "--format=%(refname:short)", "refs/heads"]),
    ]);

    const dirtyPaths = status
      .split("\n")
      .filter((line) => line.trim().length > 0).length;

    const candidates = branchList
      .split("\n")
      .map((line) => line.trim())
      .filter((name) => name.length > 0 && !BRANCH_DENYLIST.has(name));

    const unmergedBranches: UnmergedBranch[] = [];
    for (const name of candidates) {
      try {
        const count = await git(["rev-list", "--count", `main..${name}`]);
        const commitsAhead = Number.parseInt(count, 10);
        if (Number.isFinite(commitsAhead) && commitsAhead > 0) {
          unmergedBranches.push({ name, commitsAhead });
        }
      } catch {
        // A branch that cannot be compared is skipped rather than failing the read.
      }
    }

    unmergedBranches.sort((a, b) => b.commitsAhead - a.commitsAhead);

    return { branch, head, dirtyPaths, unmergedBranches, available: true };
  } catch {
    return {
      branch: "unknown",
      head: "unknown",
      dirtyPaths: 0,
      unmergedBranches: [],
      available: false,
    };
  }
}

/**
 * True when `branchName` exists locally. Used to tell "the feature lives on a
 * branch" apart from "the feature does not exist at all".
 */
export async function branchExists(branchName: string): Promise<boolean> {
  try {
    await git(["rev-parse", "--verify", `refs/heads/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

/** List the files a branch adds or changes relative to `main`. */
export async function branchFiles(branchName: string): Promise<string[]> {
  try {
    const output = await git(["diff", "--name-only", `main...${branchName}`]);
    return output.split("\n").filter((line) => line.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Change flow: what has been happening in this repository lately.
 *
 * A board that only shows current state reads as a photograph. Movement — what
 * landed, what is growing on a branch, who has been touching it — is what makes
 * the repository legible as something alive.
 */
export type Commit = {
  hash: string;
  subject: string;
  author: string;
  /** Human phrasing straight from git, e.g. "2 days ago". */
  relative: string;
  isoDate: string;
  isMerge: boolean;
};

export type Contributor = {
  name: string;
  commits: number;
};

export type ActivitySnapshot = {
  recent: Commit[];
  /** Commits landed on the current branch in the last 30 days. */
  lastMonth: number;
  contributors: Contributor[];
  /** Files changed most often in the last 30 days — where the work is. */
  hotPaths: { path: string; changes: number }[];
  available: boolean;
};

/** Unit and record separators keep subjects containing any character safe. */
const UNIT = "";
const RECORD = "";

function parseCommits(raw: string): Commit[] {
  return raw
    .split(RECORD)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const [hash, subject, author, relative, isoDate, parents] =
        record.split(UNIT);
      return {
        hash: hash ?? "",
        subject: subject ?? "",
        author: author ?? "",
        relative: relative ?? "",
        isoDate: isoDate ?? "",
        // More than one parent means a merge.
        isMerge: (parents ?? "").trim().split(/\s+/).length > 1,
      };
    });
}

export async function readActivity(limit = 12): Promise<ActivitySnapshot> {
  try {
    const format = ["%h", "%s", "%an", "%cr", "%cI", "%p"].join(UNIT) + RECORD;

    const [recentRaw, monthAuthors, hotRaw] = await Promise.all([
      git(["log", `-n${limit}`, `--format=${format}`]),
      git(["log", "--since=30.days", "--format=%an"]),
      git(["log", "--since=30.days", "--name-only", "--format="]),
    ]);

    const authorCounts = new Map<string, number>();
    for (const line of monthAuthors.split("\n")) {
      const name = line.trim();
      if (name.length > 0) {
        authorCounts.set(name, (authorCounts.get(name) ?? 0) + 1);
      }
    }

    const pathCounts = new Map<string, number>();
    for (const line of hotRaw.split("\n")) {
      const path = line.trim();
      if (path.length > 0) {
        pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
      }
    }

    return {
      recent: parseCommits(recentRaw),
      lastMonth: [...authorCounts.values()].reduce(
        (total, count) => total + count,
        0,
      ),
      contributors: [...authorCounts.entries()]
        .map(([name, commits]) => ({ name, commits }))
        .sort((a, b) => b.commits - a.commits),
      hotPaths: [...pathCounts.entries()]
        .map(([path, changes]) => ({ path, changes }))
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 10),
      available: true,
    };
  } catch {
    return {
      recent: [],
      lastMonth: 0,
      contributors: [],
      hotPaths: [],
      available: false,
    };
  }
}
