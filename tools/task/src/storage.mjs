import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";

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
 *
 * This entry point takes the same lock as a lifecycle commit and refuses to
 * append while a transfer journal is pending. Lifecycle commands themselves
 * append inside that lock after recovery; they do not call this function.
 */
export function appendLeaseEvent(paths, canonicalLine) {
  return withControlPlaneLock(paths, () => {
    if (existsSync(transferJournalPath(paths))) {
      throw new Error(
        "transfer journal is pending; refusing to append before recovery",
      );
    }
    appendRawLines(paths.leaseEventsPath, [canonicalLine]);
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

/**
 * Replace targetPath by renaming a temporary file in the same directory.
 * Node's rename uses MoveFileEx(MOVEFILE_REPLACE_EXISTING) on Windows, so an
 * existing destination is replaced without an unlink-first gap. On failure
 * only the temporary file is removed. The destination is never deleted.
 */
export function atomicReplaceFile(targetPath, contents, options = {}) {
  const directory = dirname(targetPath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = join(
    directory,
    `.${basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  writeFileSync(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
  try {
    if (options.failStage === "before") {
      throw new Error("injected failure before replacement");
    }
    if (options.observe) {
      options.observe(targetPath, temporaryPath);
    }
    if (options.failStage === "during") {
      throw new Error("injected failure during replacement");
    }
    const replace = options.replace ?? renameSync;
    replace(temporaryPath, targetPath);
    if (options.failStage === "after") {
      throw new Error("injected failure after replacement");
    }
  } catch (error) {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
    throw error;
  }
}

export function transferJournalPath(paths) {
  return `${paths.registryPath}.transfer-journal`;
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function completeLedgerLines(text) {
  if (text === "") {
    return [];
  }
  if (!text.endsWith("\n")) {
    return null;
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) {
    throw new Error("lease ledger contains a blank line; refusing to mutate");
  }
  return lines;
}

function orderedMissing(presentLines, expectedLines) {
  const present = new Set(presentLines);
  let matched = 0;
  while (
    matched < expectedLines.length &&
    present.has(expectedLines[matched])
  ) {
    matched += 1;
  }
  for (let index = matched; index < expectedLines.length; index += 1) {
    if (present.has(expectedLines[index])) {
      throw new Error(
        "transfer journal lines are present out of order; refusing to rewrite the ledger",
      );
    }
  }
  return expectedLines.slice(matched);
}

function appendRawLines(ledgerPath, lines) {
  if (lines.length === 0) {
    return;
  }
  const current = readText(ledgerPath);
  if (current !== "" && !current.endsWith("\n")) {
    throw new Error(
      "lease ledger has a torn trailing line; refusing to append",
    );
  }
  writeFileSync(ledgerPath, `${lines.join("\n")}\n`, {
    encoding: "utf8",
    flag: "a",
  });
}

/**
 * Crash limits that this journal does not remove:
 * - A lock file is never stolen. If its owner is killed, every mutation stays
 *   rejected until a person deletes that lock. PID reuse makes automatic
 *   lock breaking unsafe while the owner may still be active.
 * - A torn trailing ledger line is left in place. Recovery throws and keeps
 *   the journal rather than trimming or replacing history.
 * - Recovery completes a version 2 journal forward. It never writes an older
 *   ledger snapshot over the current ledger.
 * - A journal whose version is not 2, or whose registry text matches neither
 *   the recorded before nor after image, is left untouched.
 */
export function recoverJournalUnlocked(paths) {
  const journalPath = transferJournalPath(paths);
  if (!existsSync(journalPath)) {
    return false;
  }
  let record;
  try {
    record = JSON.parse(readFileSync(journalPath, "utf8"));
  } catch (error) {
    throw new Error(
      `transfer journal is unreadable; refusing to overwrite registry or ledger: ${error.message}`,
    );
  }
  if (
    record?.version !== 2 ||
    typeof record.beforeRegistry !== "string" ||
    typeof record.afterRegistry !== "string" ||
    !Array.isArray(record.appendedLines) ||
    record.appendedLines.some(
      (line) =>
        typeof line !== "string" || line.length === 0 || line.includes("\n"),
    )
  ) {
    throw new Error(
      "transfer journal is not a version 2 record; refusing to overwrite registry or ledger",
    );
  }
  const registryText = readText(paths.registryPath);
  const ledgerText = readText(paths.leaseEventsPath);
  if (completeLedgerLines(ledgerText) === null) {
    throw new Error(
      "lease ledger has a torn trailing line; refusing to recover over it",
    );
  }
  const registryIsAfter = registryText === record.afterRegistry;
  const registryIsBefore = registryText === record.beforeRegistry;
  if (!registryIsAfter && !registryIsBefore) {
    throw new Error(
      "transfer journal does not match the current registry; refusing to discard newer registry contents",
    );
  }
  const presentLines = completeLedgerLines(ledgerText);
  const missing = orderedMissing(presentLines, record.appendedLines);
  if (registryIsBefore && missing.length === record.appendedLines.length) {
    unlinkSync(journalPath);
    return true;
  }
  if (registryIsBefore) {
    atomicReplaceFile(paths.registryPath, record.afterRegistry);
  }
  appendRawLines(paths.leaseEventsPath, missing);
  unlinkSync(journalPath);
  return true;
}

function writePreparedUnlocked(paths, prepared) {
  const journalPath = transferJournalPath(paths);
  const beforeRegistry = readText(paths.registryPath);
  const ledgerText = readText(paths.leaseEventsPath);
  if (completeLedgerLines(ledgerText) === null) {
    throw new Error(
      "lease ledger has a torn trailing line; refusing to mutate",
    );
  }
  const appendedLines = prepared.appendedLines ?? [];
  const journal = {
    version: 2,
    beforeRegistry,
    afterRegistry: prepared.registryText,
    appendedLines,
  };
  atomicReplaceFile(journalPath, `${JSON.stringify(journal)}\n`);
  if (prepared.abandonAfterJournal) {
    return { abandoned: "journal", ...(prepared.result ?? {}) };
  }
  try {
    atomicReplaceFile(
      paths.registryPath,
      prepared.registryText,
      prepared.registryReplaceOptions,
    );
    if (prepared.abandonAfterRegistry) {
      return { abandoned: true, ...(prepared.result ?? {}) };
    }
    if (prepared.afterRegistry) {
      prepared.afterRegistry();
    }
    appendRawLines(paths.leaseEventsPath, appendedLines);
    if (prepared.abandonAfterLedger) {
      return { abandoned: "ledger", ...(prepared.result ?? {}) };
    }
    unlinkSync(journalPath);
    return prepared.result;
  } catch (error) {
    const currentLedger = readText(paths.leaseEventsPath);
    const landed =
      completeLedgerLines(currentLedger) === null
        ? appendedLines
        : appendedLines.filter((line) =>
            completeLedgerLines(currentLedger).includes(line),
          );
    if (landed.length === 0 && completeLedgerLines(currentLedger) !== null) {
      if (readText(paths.registryPath) !== beforeRegistry) {
        atomicReplaceFile(paths.registryPath, beforeRegistry);
      }
      if (existsSync(journalPath)) {
        unlinkSync(journalPath);
      }
    }
    throw error;
  }
}

/**
 * The lock is exclusive and is removed only by the process that created it.
 * A lock that already exists is rejected. This function does not decide that
 * the other owner has died.
 */
export function withControlPlaneLock(paths, fn) {
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
    return fn();
  } finally {
    closeSync(lockHandle);
    if (existsSync(paths.lockPath)) {
      unlinkSync(paths.lockPath);
    }
  }
}

export function recoverTransferJournal(paths) {
  return withControlPlaneLock(paths, () => recoverJournalUnlocked(paths));
}

export function withRecoveredLock(paths, fn) {
  return withControlPlaneLock(paths, () => {
    recoverJournalUnlocked(paths);
    return fn((prepared) => writePreparedUnlocked(paths, prepared));
  });
}

export function mutateSharedRegistry(paths, transform, validate) {
  return withRecoveredLock(paths, (commit) => {
    const current = readSharedRegistry(paths);
    const next = transform(current);
    validate(next);
    return commit({
      registryText: `${JSON.stringify(next, null, 2)}\n`,
      appendedLines: [],
      result: next,
    });
  });
}
