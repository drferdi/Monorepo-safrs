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
import { dirname, join } from "node:path";

/**
 * Atomic task-wide budget ledger. Counters are shared across attempts and
 * child agents (children inherit the remaining parent budget and can never
 * reset counters). Exhaustion or an explicit breaker trips the task into a
 * stopped state that only recovery may clear.
 *
 * Pure core (applyConsume/applyBreaker) + file-backed wrapper with the same
 * wx-lock pattern the task registry uses.
 */

export function emptyLedger() {
  return { version: 1, tasks: {} };
}

export function initTaskBudget(ledger, taskId, limits) {
  if (ledger.tasks[taskId]) {
    return ledger;
  }
  return {
    ...ledger,
    tasks: {
      ...ledger.tasks,
      [taskId]: { counters: {}, limits, stopped: false, reason: null },
    },
  };
}

export function applyConsume(ledger, taskId, dimension, amount = 1) {
  const task = ledger.tasks[taskId];
  if (!task) {
    return {
      allowed: false,
      stopped: false,
      reason: `no budget initialized for ${taskId}`,
      ledger,
    };
  }
  if (task.stopped) {
    return {
      allowed: false,
      stopped: true,
      reason: task.reason ?? "budget breaker tripped",
      ledger,
    };
  }
  const limit = task.limits[dimension];
  if (limit === undefined) {
    return {
      allowed: false,
      stopped: false,
      reason: `no enforceable limit for dimension ${dimension}`,
      ledger,
    };
  }
  const used = (task.counters[dimension] ?? 0) + amount;
  const unlimited = limit === "unmetered";
  if (!unlimited && used > limit) {
    const tripped = {
      ...task,
      counters: { ...task.counters, [dimension]: used },
      stopped: true,
      reason: `budget ${dimension} exhausted (${used}/${limit})`,
    };
    return {
      allowed: false,
      stopped: true,
      reason: tripped.reason,
      ledger: { ...ledger, tasks: { ...ledger.tasks, [taskId]: tripped } },
    };
  }
  const updated = {
    ...task,
    counters: { ...task.counters, [dimension]: used },
  };
  return {
    allowed: true,
    stopped: false,
    remaining: unlimited ? "unmetered" : limit - used,
    ledger: { ...ledger, tasks: { ...ledger.tasks, [taskId]: updated } },
  };
}

export function applyBreaker(ledger, taskId, reason) {
  const task = ledger.tasks[taskId] ?? {
    counters: {},
    limits: {},
    stopped: false,
    reason: null,
  };
  return {
    ...ledger,
    tasks: {
      ...ledger.tasks,
      [taskId]: { ...task, stopped: true, reason },
    },
  };
}

export function budgetSnapshot(ledger, taskId) {
  const task = ledger.tasks[taskId];
  if (!task) {
    return null;
  }
  const remaining = {};
  for (const [dimension, limit] of Object.entries(task.limits)) {
    remaining[dimension] =
      limit === "unmetered"
        ? "unmetered"
        : limit - (task.counters[dimension] ?? 0);
  }
  return {
    stopped: task.stopped,
    reason: task.reason,
    counters: { ...task.counters },
    remaining,
  };
}

/* ------------------------- file-backed wrapper ------------------------- */

export function ledgerPaths(controlDirectory) {
  return {
    ledgerPath: join(controlDirectory, "budget-ledger.json"),
    lockPath: join(controlDirectory, "budget-ledger.lock"),
  };
}

export function readLedger(paths) {
  if (!existsSync(paths.ledgerPath)) {
    return emptyLedger();
  }
  return JSON.parse(readFileSync(paths.ledgerPath, "utf8"));
}

export function mutateLedger(paths, transform) {
  mkdirSync(dirname(paths.ledgerPath), { recursive: true });
  let lockHandle;
  try {
    lockHandle = openSync(paths.lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error("budget ledger is locked by another writer; retry");
    }
    throw error;
  }
  try {
    const current = readLedger(paths);
    const { result, ledger } = transform(current);
    const temporary = `${paths.ledgerPath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    renameSync(temporary, paths.ledgerPath);
    return result;
  } finally {
    closeSync(lockHandle);
    if (existsSync(paths.lockPath)) {
      unlinkSync(paths.lockPath);
    }
  }
}

export function consume(paths, taskId, dimension, amount = 1) {
  return mutateLedger(paths, (ledger) => {
    const outcome = applyConsume(ledger, taskId, dimension, amount);
    return { result: outcome, ledger: outcome.ledger };
  });
}
