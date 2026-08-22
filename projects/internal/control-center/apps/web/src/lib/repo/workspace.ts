import { readdir } from "node:fs/promises";

import { readRepoFile, readRepoJson, repoPath } from "./root.ts";

/**
 * The workspace map: what this repository is made of, and what depends on what.
 *
 * This is the question only a monorepo has — change one shared package and
 * several deployment units move with it. The blast radius computed here is the
 * transitive set of workspace members that would be affected by a change, which
 * is the number an operator needs before approving anything.
 */

export type WorkspaceMember = {
  /** Package name from its manifest, e.g. `@safrs/api`. */
  name: string;
  /** Repository-relative directory. */
  path: string;
  /** Which workspace glob matched it: projects, packages, or tools. */
  group: string;
  version: string;
  private: boolean;
  /** Workspace members this one imports. */
  dependsOn: string[];
  /** Workspace members that import this one (direct). */
  usedBy: string[];
  /** Every member reached transitively through `usedBy`. */
  blastRadius: string[];
  /** Scripts the manifest declares, for orientation only. */
  scripts: string[];
};

export type WorkspaceMap = {
  members: WorkspaceMember[];
  groups: { group: string; count: number }[];
  /** Members nothing else depends on — the edges of the graph. */
  leaves: string[];
  /** Members with the widest blast radius first. */
  mostConnected: WorkspaceMember[];
  problems: string[];
};

type Manifest = {
  name?: string;
  version?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * Read the workspace globs from `pnpm-workspace.yaml`.
 *
 * Deliberately a line reader rather than a YAML parser: the file's `packages:`
 * block is a flat list of strings, and adding a YAML dependency to read five
 * lines would be a change to the shared lockfile — an R2 act for no benefit.
 */
async function readGlobs(): Promise<string[]> {
  const raw = await readRepoFile("pnpm-workspace.yaml");
  if (raw === null) {
    return [];
  }

  const globs: string[] = [];
  let inPackages = false;

  for (const line of raw.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const match = line.match(/^\s+-\s+["']?([^"'\s]+)["']?\s*$/);
      if (match?.[1]) {
        globs.push(match[1]);
        continue;
      }
      // Any non-list line ends the block.
      if (line.trim().length > 0) {
        inPackages = false;
      }
    }
  }

  return globs;
}

/** Expand a glob of the shapes this workspace uses: `a/*` and `a/*​/b/*`. */
async function expandGlob(glob: string): Promise<string[]> {
  const segments = glob.split("/");
  let candidates = [""];

  for (const segment of segments) {
    const next: string[] = [];
    for (const base of candidates) {
      if (segment === "*") {
        try {
          const entries = await readdir(await repoPath(base || "."), {
            withFileTypes: true,
          });
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              next.push(base ? `${base}/${entry.name}` : entry.name);
            }
          }
        } catch {
          // A missing directory simply contributes nothing.
        }
      } else {
        next.push(base ? `${base}/${segment}` : segment);
      }
    }
    candidates = next;
  }

  return candidates;
}

/** Collect every transitive dependent of `name`, excluding itself. */
function reachTransitively(
  name: string,
  directUsers: Map<string, Set<string>>,
): string[] {
  const seen = new Set<string>();
  const queue = [...(directUsers.get(name) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current === name || seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const user of directUsers.get(current) ?? []) {
      if (!seen.has(user) && user !== name) {
        queue.push(user);
      }
    }
  }

  return [...seen].sort();
}

export async function readWorkspace(): Promise<WorkspaceMap> {
  const problems: string[] = [];
  const globs = await readGlobs();

  if (globs.length === 0) {
    problems.push(
      "pnpm-workspace.yaml tidak terbaca, sehingga peta repository tidak dapat disusun.",
    );
    return {
      members: [],
      groups: [],
      leaves: [],
      mostConnected: [],
      problems,
    };
  }

  const found: { path: string; group: string; manifest: Manifest }[] = [];

  for (const glob of globs) {
    const group = glob.split("/")[0] ?? glob;
    for (const directory of await expandGlob(glob)) {
      const manifest = await readRepoJson<Manifest>(
        `${directory}/package.json`,
      );
      if (manifest?.name) {
        found.push({ path: directory, group, manifest });
      }
    }
  }

  const names = new Set(found.map((entry) => entry.manifest.name as string));

  // Only workspace-internal edges matter here; third-party packages are not
  // part of the blast radius this view is about.
  const dependsOn = new Map<string, string[]>();
  for (const entry of found) {
    const manifest = entry.manifest;
    const all = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    };
    dependsOn.set(
      manifest.name as string,
      Object.keys(all)
        .filter((dependency) => names.has(dependency))
        .sort(),
    );
  }

  const directUsers = new Map<string, Set<string>>();
  for (const [name, dependencies] of dependsOn) {
    for (const dependency of dependencies) {
      const set = directUsers.get(dependency) ?? new Set<string>();
      set.add(name);
      directUsers.set(dependency, set);
    }
  }

  const members: WorkspaceMember[] = found
    .map((entry) => {
      const name = entry.manifest.name as string;
      return {
        name,
        path: entry.path,
        group: entry.group,
        version: entry.manifest.version ?? "0.0.0",
        private: entry.manifest.private === true,
        dependsOn: dependsOn.get(name) ?? [],
        usedBy: [...(directUsers.get(name) ?? [])].sort(),
        blastRadius: reachTransitively(name, directUsers),
        scripts: Object.keys(entry.manifest.scripts ?? {}).sort(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const groupCounts = new Map<string, number>();
  for (const member of members) {
    groupCounts.set(member.group, (groupCounts.get(member.group) ?? 0) + 1);
  }

  return {
    members,
    groups: [...groupCounts.entries()]
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count),
    leaves: members
      .filter((member) => member.usedBy.length === 0)
      .map((member) => member.name),
    mostConnected: [...members]
      .filter((member) => member.blastRadius.length > 0)
      .sort((a, b) => b.blastRadius.length - a.blastRadius.length),
    problems,
  };
}
