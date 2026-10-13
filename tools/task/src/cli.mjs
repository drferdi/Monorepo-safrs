#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalize } from "../../automation/src/canonical-json.mjs";
import { nextEvent } from "../../automation/src/leases.mjs";
import {
  canTransition,
  closeTargetState,
  findOverlapConflicts,
  MUTATION_ACTIVE,
  normalizePrefix,
  nowIso,
  publicTask,
  RISKS,
  redactText,
  validateRegistry,
  validateTaskShape,
} from "./ownership.mjs";
import {
  readLeaseEvents,
  readSharedRegistry,
  resolveControlPlanePaths,
  resolveWorktreeId,
  transferJournalPath,
  withRecoveredLock,
} from "./storage.mjs";
import { executeScopeTransfer, recoverTransferJournal } from "./transfer.mjs";

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const liveContext = {
  repositoryRoot,
  paths: resolveControlPlanePaths(repositoryRoot),
  worktreeId: resolveWorktreeId(repositoryRoot),
};
let activeContext = liveContext;

function validate(registry, options = {}) {
  return validateRegistry(registry, {
    repositoryRoot: activeContext.repositoryRoot,
    ...options,
  });
}

function usage() {
  return `Usage:
  pnpm task claim --id ID --title TITLE --owner-id ID --owner-label LABEL --risk R0|R1|R2|R3 --scope PATH [--scope PATH...] [--state CLAIMED|PLANNED|EXECUTING] [--yes]
  pnpm task state --id ID --to STATE [--yes]
  pnpm task close --id ID [--yes]
  pnpm task list [--json] [--active]
  pnpm task transfer --operation TRANSFER-ID --destination TASK --actor ACTOR --reason TEXT --move SOURCE=PATH [--move SOURCE=PATH...] [--yes]
  pnpm task recover`;
}

function parseArgs(argv) {
  const args = {
    command: argv[0],
    flags: {},
    lists: { scope: [], tools: [], move: [] },
  };
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--yes") {
      args.flags.yes = true;
      continue;
    }
    if (token === "--json") {
      args.flags.json = true;
      continue;
    }
    if (token === "--active") {
      args.flags.active = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) {
      throw new Error(`missing value for --${key}`);
    }
    i += 1;
    if (key === "scope" || key === "tools" || key === "move") {
      args.lists[key].push(value);
    } else {
      args.flags[key] = value;
    }
  }
  return args;
}

function loadRegistry({ enforceOperational = true } = {}) {
  return validate(readSharedRegistry(activeContext.paths), {
    enforceOperational,
  });
}

function journalIsPending() {
  return existsSync(transferJournalPath(activeContext.paths));
}

function reportPendingJournal() {
  console.error(
    redactText(
      "transfer journal is pending; preview did not recover or write. Run `pnpm task recover` or retry the mutation with --yes.",
    ),
  );
  return 1;
}

function buildLeaseLine(action, task, extras = {}) {
  const chain = readLeaseEvents(activeContext.paths, task.id);
  const outcome = nextEvent(
    chain,
    {
      action,
      task_id: task.id,
      lease_id: `LEASE-${task.id}`,
      actor: task.owner_id,
      worktree_id: task.worktree_id,
      scope_prefixes: task.scope_prefixes,
      expires_at: task.expires_at ?? null,
      fencing_token:
        chain.length > 0 ? chain[chain.length - 1].fencing_token : undefined,
      ...extras,
    },
    { occurred_at: nowIso(), authority_run_url: null },
  );
  if (outcome.denied) {
    console.error(
      redactText(
        `WARNING: local lease event ${action} for ${task.id} denied: ${outcome.denied}`,
      ),
    );
    return null;
  }
  return canonicalize(outcome.event);
}

function preview(message, registry) {
  console.log(redactText(message));
  console.log(
    JSON.stringify(
      { version: registry.version, tasks: registry.tasks.map(publicTask) },
      null,
      2,
    ),
  );
}

function requireFlag(flags, name) {
  if (!flags[name]) {
    throw new Error(`missing required --${name}`);
  }
  return flags[name];
}

function buildClaim(registry, args) {
  const id = requireFlag(args.flags, "id");
  if (registry.tasks.some((task) => task.id === id)) {
    throw new Error(`task id already exists: ${id}`);
  }
  const state = args.flags.state ?? "CLAIMED";
  if (!["CLAIMED", "PLANNED", "EXECUTING"].includes(state)) {
    throw new Error("--state for claim must be CLAIMED, PLANNED, or EXECUTING");
  }
  const risk = requireFlag(args.flags, "risk");
  if (!RISKS.has(risk)) {
    throw new Error(`invalid --risk ${risk}`);
  }
  if (args.lists.scope.length === 0) {
    throw new Error("at least one --scope is required");
  }
  const timestamp = nowIso();
  const task = validateTaskShape(
    {
      id,
      title: requireFlag(args.flags, "title"),
      state,
      risk,
      scope_prefixes: args.lists.scope.map((scope) =>
        normalizePrefix(scope, "scope", activeContext.repositoryRoot),
      ),
      allowed_tools: args.lists.tools,
      owner_id: requireFlag(args.flags, "owner-id"),
      owner_label: requireFlag(args.flags, "owner-label"),
      worktree_id: activeContext.worktreeId,
      claimed_at: timestamp,
      updated_at: timestamp,
      expires_at: args.flags["expires-at"] ?? null,
      notes: args.flags.notes,
    },
    { repositoryRoot: activeContext.repositoryRoot },
  );
  const next = {
    version: 1,
    tasks: [...registry.tasks, task],
  };
  const conflicts = findOverlapConflicts(next.tasks);
  if (conflicts.length > 0) {
    const first = conflicts[0];
    throw new Error(
      `refusing claim: overlap with ${first.right_id === id ? first.left_id : first.right_id} (${first.left_scope} vs ${first.right_scope})`,
    );
  }
  validate(next);
  return { id, next };
}

function claim(args) {
  if (!args.flags.yes) {
    if (journalIsPending()) {
      return reportPendingJournal();
    }
    const { id, next } = buildClaim(loadRegistry(), args);
    preview(`Preview claim ${id} (pass --yes to write):`, next);
    return 0;
  }
  const id = requireFlag(args.flags, "id");
  const written = withRecoveredLock(activeContext.paths, (commit) => {
    const built = buildClaim(
      validate(readSharedRegistry(activeContext.paths)),
      args,
    );
    const task = built.next.tasks.find((entry) => entry.id === built.id);
    const line = buildLeaseLine("CLAIM", task);
    return commit({
      registryText: `${JSON.stringify(built.next, null, 2)}\n`,
      appendedLines: line ? [line] : [],
      result: built.next,
    });
  });
  console.log(redactText(`Wrote shared claim ${id}`));
  if (!written.tasks.some((entry) => entry.id === id)) {
    throw new Error(`shared claim ${id} was not recorded`);
  }
  return 0;
}

function buildState(registry, id, to) {
  validate(registry, { enforceOperational: false });
  const index = registry.tasks.findIndex((task) => task.id === id);
  if (index < 0) {
    throw new Error(`unknown task id: ${id}`);
  }
  const current = registry.tasks[index];
  if (current.worktree_id !== activeContext.worktreeId) {
    throw new Error(
      `task ${id} belongs to worktree ${current.worktree_id}; current worktree is ${activeContext.worktreeId}`,
    );
  }
  if (!canTransition(current.state, to)) {
    throw new Error(`illegal transition ${current.state} → ${to}`);
  }
  const updated = { ...current, state: to, updated_at: nowIso() };
  validateTaskShape(updated, {
    repositoryRoot: activeContext.repositoryRoot,
  });
  const next = {
    version: 1,
    tasks: registry.tasks.map((task, taskIndex) =>
      taskIndex === index ? updated : task,
    ),
  };
  validate(next);
  return { current, next };
}

function stateCommand(args) {
  const id = requireFlag(args.flags, "id");
  const to = requireFlag(args.flags, "to");
  if (!args.flags.yes) {
    if (journalIsPending()) {
      return reportPendingJournal();
    }
    const { current, next } = buildState(
      loadRegistry({ enforceOperational: false }),
      id,
      to,
    );
    preview(
      `Preview state ${id}: ${current.state} → ${to} (pass --yes to write):`,
      next,
    );
    return 0;
  }
  withRecoveredLock(activeContext.paths, (commit) => {
    const built = buildState(
      validate(readSharedRegistry(activeContext.paths), {
        enforceOperational: false,
      }),
      id,
      to,
    );
    const task = built.next.tasks.find((entry) => entry.id === id);
    const line = buildLeaseLine("TRANSITION", task, { next_state: to });
    return commit({
      registryText: `${JSON.stringify(built.next, null, 2)}\n`,
      appendedLines: line ? [line] : [],
      result: built.next,
    });
  });
  console.log(redactText(`Updated ${id} to ${to}`));
  return 0;
}

function buildClose(registry, id) {
  validate(registry, { enforceOperational: false });
  const index = registry.tasks.findIndex((task) => task.id === id);
  if (index < 0) {
    throw new Error(`unknown task id: ${id}`);
  }
  const current = registry.tasks[index];
  if (current.worktree_id !== activeContext.worktreeId) {
    throw new Error(
      `task ${id} belongs to worktree ${current.worktree_id}; current worktree is ${activeContext.worktreeId}`,
    );
  }
  const to = closeTargetState(current.state);
  if (
    !canTransition(current.state, to) &&
    !(current.state === "PROPOSED" && to === "ABORTED")
  ) {
    // PROPOSED → ABORTED is allowed by table; closeTargetState returns ABORTED
  }
  if (!canTransition(current.state, to)) {
    throw new Error(`illegal close transition ${current.state} → ${to}`);
  }
  const updated = {
    ...current,
    state: to,
    updated_at: nowIso(),
  };
  const next = {
    version: 1,
    tasks: registry.tasks.map((task, taskIndex) =>
      taskIndex === index ? updated : task,
    ),
  };
  validate(next);
  return { current, next, to };
}

function closeCommand(args) {
  const id = requireFlag(args.flags, "id");
  if (!args.flags.yes) {
    if (journalIsPending()) {
      return reportPendingJournal();
    }
    const { current, next, to } = buildClose(
      loadRegistry({ enforceOperational: false }),
      id,
    );
    preview(
      `Preview close ${id}: ${current.state} → ${to} (pass --yes to write):`,
      next,
    );
    return 0;
  }
  let closedAs = "";
  withRecoveredLock(activeContext.paths, (commit) => {
    const built = buildClose(
      validate(readSharedRegistry(activeContext.paths), {
        enforceOperational: false,
      }),
      id,
    );
    closedAs = built.to;
    const task = built.next.tasks.find((entry) => entry.id === id);
    const line = buildLeaseLine("RELEASE", task, { next_state: built.to });
    return commit({
      registryText: `${JSON.stringify(built.next, null, 2)}\n`,
      appendedLines: line ? [line] : [],
      result: built.next,
    });
  });
  console.log(redactText(`Closed ${id} as ${closedAs}`));
  return 0;
}

function listCommand(args) {
  const registry = loadRegistry();
  let tasks = registry.tasks.map(publicTask);
  if (args.flags.active) {
    tasks = tasks.filter((task) => MUTATION_ACTIVE.has(task.state));
  }
  if (args.flags.json) {
    console.log(JSON.stringify({ version: registry.version, tasks }, null, 2));
  } else {
    for (const task of tasks) {
      console.log(
        redactText(
          `${task.id} | ${task.owner_label} | ${task.state} | ${task.risk} | ${task.scope_prefixes.join(", ")}`,
        ),
      );
    }
    if (tasks.length === 0) {
      console.log("(no tasks)");
    }
  }
  return 0;
}

function transferCommand(args) {
  const moves = (args.lists.move ?? []).map((item) => {
    const separator = item.indexOf("=");
    if (separator <= 0) {
      throw new Error(`--move must be TASK=path (${item})`);
    }
    return {
      sourceId: item.slice(0, separator),
      path: item.slice(separator + 1),
    };
  });
  const request = {
    operationId: requireFlag(args.flags, "operation"),
    destinationId: requireFlag(args.flags, "destination"),
    actor: requireFlag(args.flags, "actor"),
    reason: requireFlag(args.flags, "reason"),
    worktreeId: activeContext.worktreeId,
    moves,
    dryRun: !args.flags.yes,
  };
  const result = executeScopeTransfer(activeContext.paths, request);
  console.log(redactText(JSON.stringify(result)));
  if (result.recoveryPending) {
    console.error(
      redactText(
        "transfer journal is pending; dry-run did not recover or write. Run `pnpm task recover` or retry with --yes.",
      ),
    );
    return 1;
  }
  return 0;
}

function recoverCommand() {
  const recovered = recoverTransferJournal(activeContext.paths);
  console.log(redactText(JSON.stringify({ recovered })));
  return 0;
}

function execute(argv) {
  try {
    if (!argv[0] || argv[0] === "--help" || argv[0] === "-h") {
      console.log(usage());
      return 0;
    }
    const args = parseArgs(argv);
    switch (args.command) {
      case "claim":
        return claim(args);
      case "state":
        return stateCommand(args);
      case "close":
        return closeCommand(args);
      case "list":
        return listCommand(args);
      case "transfer":
        return transferCommand(args);
      case "recover":
        return recoverCommand();
      default:
        throw new Error(`unknown command ${args.command}\n${usage()}`);
    }
  } catch (error) {
    console.error(
      redactText(error instanceof Error ? error.message : String(error)),
    );
    return 1;
  }
}

export function runTaskCommand(argv, context) {
  const previous = activeContext;
  if (context) {
    activeContext = context;
  }
  try {
    return execute(argv);
  } finally {
    activeContext = previous;
  }
}

function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (invokedAsCli()) {
  process.exitCode = runTaskCommand(process.argv.slice(2));
}
