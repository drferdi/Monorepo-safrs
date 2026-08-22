import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/**
 * Repository root resolution and path containment.
 *
 * Every filesystem read performed by the Control Center goes through
 * `repoPath()`. It is the single choke point that keeps a caller from walking
 * out of the repository with `../` or an absolute path, so a future feature
 * that takes a path from the URL cannot turn into a file-disclosure bug.
 */

let cachedRoot: string | null = null;

/** Marker files that only exist at the repository root. */
const ROOT_MARKERS = ["pnpm-workspace.yaml", "SAFRS_SPEC.md"] as const;

async function exists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function isRepositoryRoot(candidate: string): Promise<boolean> {
  for (const marker of ROOT_MARKERS) {
    if (!(await exists(join(candidate, marker)))) {
      return false;
    }
  }
  return true;
}

/**
 * Walk up from the process working directory until the repository root is
 * found. `SENTRA_REPO_ROOT` overrides the search, which is how the dashboard
 * can be pointed at a different checkout (a worktree, for instance) without
 * being started from inside it.
 */
export async function repoRoot(): Promise<string> {
  if (cachedRoot) {
    return cachedRoot;
  }

  const override = process.env.SENTRA_REPO_ROOT;
  if (override) {
    const resolved = resolve(override);
    if (!(await isRepositoryRoot(resolved))) {
      throw new Error(
        `SENTRA_REPO_ROOT does not point at a SAFRS repository: ${resolved}`,
      );
    }
    cachedRoot = resolved;
    return cachedRoot;
  }

  let current = resolve(process.cwd());
  for (;;) {
    if (await isRepositoryRoot(current)) {
      cachedRoot = current;
      return cachedRoot;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        "Repository root not found. Start the Control Center from inside the repository, or set SENTRA_REPO_ROOT.",
      );
    }
    current = parent;
  }
}

/**
 * Resolve a repository-relative path and prove it stays inside the repository.
 * Throws on absolute input, on traversal, and on anything that resolves outside
 * the root.
 */
export async function repoPath(relativePath: string): Promise<string> {
  if (isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not accepted: ${relativePath}`);
  }

  const root = await repoRoot();
  const resolved = resolve(root, relativePath);
  const offset = relative(root, resolved);

  if (offset.startsWith("..") || isAbsolute(offset)) {
    throw new Error(`Path escapes the repository: ${relativePath}`);
  }

  return resolved;
}

/** Read a repository file as UTF-8, or return null when it does not exist. */
export async function readRepoFile(
  relativePath: string,
): Promise<string | null> {
  const target = await repoPath(relativePath);
  try {
    return await readFile(target, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/** Read and parse a repository JSON file, or return null when absent. */
export async function readRepoJson<T>(relativePath: string): Promise<T | null> {
  const raw = await readRepoFile(relativePath);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as T;
}

/** True when a repository-relative path exists on disk. */
export async function repoPathExists(relativePath: string): Promise<boolean> {
  return exists(await repoPath(relativePath));
}

/** Present a repository path with forward slashes, whatever the platform. */
export function displayPath(relativePath: string): string {
  return relativePath.split(sep).join("/");
}
