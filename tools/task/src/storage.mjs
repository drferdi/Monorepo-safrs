import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { emptyRegistry } from "./ownership.mjs";

export function resolveControlPlanePaths(repositoryRoot) {
  const result = spawnSync("git", ["rev-parse", "--git-common-dir"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `cannot resolve Git common directory: ${(result.stderr ?? "").trim()}`,
    );
  }
  const raw = result.stdout.trim();
  const commonDirectory = isAbsolute(raw) ? raw : resolve(repositoryRoot, raw);
  const controlDirectory = join(commonDirectory, "safrs-control-plane");
  return {
    commonDirectory,
    controlDirectory,
    registryPath: join(controlDirectory, "active-tasks.json"),
    lockPath: join(controlDirectory, "active-tasks.lock"),
    leaseEventsPath: join(controlDirectory, "lease-events.ndjson"),
  };
}

/**
 * Append-only local lease ledger (LeaseEventV1, one canonical JSON per
 * line). Events are never rewritten; the remote authority chain remains
 * the source of truth and reconciliation happens before any push.
 */
export function appendLeaseEvent(paths, canonicalLine) {
  mkdirSync(paths.controlDirectory, { recursive: true });
  writeFileSync(paths.leaseEventsPath, `${canonicalLine}\n`, {
    encoding: "utf8",
    flag: "a",
  });
}

export function readLeaseEvents(paths, taskId) {
  if (!existsSync(paths.leaseEventsPath)) {
    return [];
  }
  const events = readFileSync(paths.leaseEventsPath, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  return taskId ? events.filter((event) => event.task_id === taskId) : events;
}

export function resolveWorktreeId(repositoryRoot) {
  const commonDirectory =
    resolveControlPlanePaths(repositoryRoot).commonDirectory;
  const result = spawnSync("git", ["rev-parse", "--git-dir"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `cannot resolve Git worktree id: ${(result.stderr ?? "").trim()}`,
    );
  }
  const raw = result.stdout.trim();
  const gitDirectory = isAbsolute(raw) ? raw : resolve(repositoryRoot, raw);
  const identifier = relative(commonDirectory, gitDirectory).replaceAll(
    "\\",
    "/",
  );
  if (!identifier || identifier === ".") {
    return "main";
  }
  if (identifier === ".." || identifier.startsWith("../")) {
    throw new Error(
      "Git worktree directory is outside the common Git directory",
    );
  }
  return identifier;
}

export function readSharedRegistry(paths) {
  if (!existsSync(paths.registryPath)) {
    return emptyRegistry();
  }
  try {
    return JSON.parse(readFileSync(paths.registryPath, "utf8"));
  } catch (error) {
    throw new Error(`invalid shared task registry: ${error.message}`);
  }
}

function atomicWriteRegistry(paths, registry) {
  mkdirSync(dirname(paths.registryPath), { recursive: true });
  const temporaryPath = `${paths.registryPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    renameSync(temporaryPath, paths.registryPath);
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

export function mutateSharedRegistry(paths, transform, validate) {
  mkdirSync(paths.controlDirectory, { recursive: true });
  let lockHandle;
  try {
    lockHandle = openSync(paths.lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(
        "task registry is locked by another writer; retry after it finishes",
      );
    }
    throw error;
  }

  try {
    const current = readSharedRegistry(paths);
    const next = transform(current);
    validate(next);
    atomicWriteRegistry(paths, next);
    return next;
  } finally {
    closeSync(lockHandle);
    if (existsSync(paths.lockPath)) {
      unlinkSync(paths.lockPath);
    }
  }
}
