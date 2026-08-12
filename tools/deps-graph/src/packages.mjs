import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * @typedef {Object} PackageNode
 * @property {string} name scoped package name, e.g. "@safrs/api"
 * @property {string} dir relative package directory (posix)
 */

/**
 * Read the name and workspace dependencies from a package manifest.
 *
 * @param {string} root repository root
 * @param {string} relDir relative package directory (posix)
 * @returns {Promise<{name: string|null, deps: string[]}>}
 */
export async function readPackageMetadata(root, relDir) {
  const file = path.join(root, relDir, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return { name: null, deps: [] };
  }
  const name = typeof manifest.name === "string" ? manifest.name : null;
  const deps = new Set();
  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const table = manifest[section];
    if (table && typeof table === "object") {
      for (const key of Object.keys(table)) deps.add(key);
    }
  }
  return { name, deps: [...deps] };
}

/**
 * Build the list of workspace package nodes and their edges.
 *
 * @param {string} root repository root
 * @param {string[]} members resolved member directories
 * @returns {Promise<{nodes: PackageNode[], edges: Map<string, Set<string>>}>}
 *   edges maps a package name -> set of dependency package names (workspace-only).
 */
export async function buildPackageGraph(root, members) {
  const nodes = [];
  const nameToDir = new Map();
  for (const dir of members) {
    const { name } = await readPackageMetadata(root, dir);
    if (name) {
      nodes.push({ name, dir });
      nameToDir.set(name, dir);
    }
  }

  const edges = new Map();
  for (const node of nodes) {
    const { deps } = await readPackageMetadata(root, node.dir);
    const workspaceDeps = deps.filter((d) => nameToDir.has(d));
    edges.set(node.name, new Set(workspaceDeps));
  }

  return { nodes, edges };
}
