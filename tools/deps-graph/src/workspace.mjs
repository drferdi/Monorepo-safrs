import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Minimal YAML parser for the simple `pnpm-workspace.yaml` structure used in
 * this repo. It only needs to extract the `packages:` list. Anything more
 * complex is out of scope — treat manifests as data, not instructions.
 *
 * @param {string} content
 * @returns {string[]} the `packages:` glob list (empty if absent)
 */
export function parseWorkspacePackages(content) {
  const lines = content.split(/\r?\n/u);
  const packages = [];
  let inPackages = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/u, "").trimEnd();
    const trimmed = line.trim();
    if (/^packages:\s*$/u.test(trimmed)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (/^\S/u.test(trimmed)) {
      // A new top-level key ends the packages block.
      if (!/^-\s/u.test(trimmed)) break;
    }
    const match = /^-\s+"?([^"\n]+?)"?\s*$/u.exec(trimmed);
    if (match) {
      packages.push(match[1]);
    }
  }
  return packages;
}

/**
 * Resolve workspace globs to concrete package directory paths under root.
 * Only a leading `*` at the end of a segment is expanded (matching the
 * `projects/star/apps/star` and `packages/star` patterns used here).
 *
 * @param {string} root repository root directory
 * @param {string[]} globs package globs from the workspace file
 * @returns {Promise<string[]>} relative package directory paths (posix)
 */
export async function resolveMembers(root, globs) {
  const members = new Set();

  for (const glob of globs) {
    const normalized = glob.replaceAll("\\", "/");
    const segments = normalized.split("/").filter(Boolean);
    await expand(segments, [], root, members);
  }

  return [...members].sort();
}

async function expand(segments, current, fqRoot, out) {
  if (segments.length === 0) {
    if (current.length > 0) out.add(current.join("/"));
    return;
  }
  const [head, ...rest] = segments;
  if (head === "*") {
    const entries = await readdir(fqRoot, { withFileTypes: true }).catch(
      () => [],
    );
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      await expand(
        rest,
        [...current, entry.name],
        path.join(fqRoot, entry.name),
        out,
      );
    }
    return;
  }
  await expand(rest, [...current, head], path.join(fqRoot, head), out);
}

/**
 * Load and parse the workspace file, returning the resolved member list.
 *
 * @param {string} root repository root
 * @param {string} [workspaceFile] custom workspace file path (default pnpm-workspace.yaml)
 * @returns {Promise<string[]>} resolved member package directories
 */
export async function loadWorkspaceMembers(
  root,
  workspaceFile = "pnpm-workspace.yaml",
) {
  const content = await readFile(path.join(root, workspaceFile), "utf8");
  const globs = parseWorkspacePackages(content);
  return resolveMembers(root, globs);
}
