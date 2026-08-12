#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
  appendLeaseEvent,
  mutateSharedRegistry,
  readLeaseEvents,
  readSharedRegistry,
  resolveControlPlanePaths,
  resolveWorktreeId,
} from "./storage.mjs";

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const controlPlanePaths = resolveControlPlanePaths(repositoryRoot);
const currentWorktreeId = resolveWorktreeId(repositoryRoot);

function validate(registry, options = {}) {
  return validateRegistry(registry, { repositoryRoot, ...options });
}

function usage() {
  return `Usage:
  pnpm task claim --id ID --title TITLE --owner-id ID --owner-label LABEL --risk R0|R1|R2|R3 --scope PATH [--scope PATH...] [--state CLAIMED|PLANNED|EXECUTING] [--yes]
  pnpm task state --id ID --to STATE [--yes]
  pnpm task close --id ID [--yes]
  pnpm task list [--json] [--active]`;
}

function parseArgs(argv) {
  const args = {
    command: argv[0],
    flags: {},
    lists: { scope: [], tools: [] },
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
    if (key === "scope") {
      args.lists.scope.push(value);
    } else if (key === "tools") {
      args.lists.tools.push(value);
    } else {
      args.flags[key] = value;
    }
  }
  return args;
}

function loadRegistry({ enforceOperational = true } = {}) {
  return validate(readSharedRegistry(controlPlanePaths), {
    enforceOperational,
  });
}

/**
 * Record a local lease event mirroring a registry mutation. Local events
 * carry authority_run_url null; remote reconciliation is required before
 * push. A failure here is loud but does not roll back the registry —
 * check_lifecycle flags registry/ledger drift.
 */
function recordLeaseEvent(action, task, extras = {}) {
  const chain = readLeaseEvents(controlPlanePaths, task.id);
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
    return;
  }
  appendLeaseEvent(controlPlanePaths, canonicalize(outcome.event));
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
        normalizePrefix(scope, "scope", repositoryRoot),
      ),
      allowed_tools: args.lists.tools,
      owner_id: requireFlag(args.flags, "owner-id"),
      owner_label: requireFlag(args.flags, "owner-label"),
      worktree_id: currentWorktreeId,
      claimed_at: timestamp,
      updated_at: timestamp,
      expires_at: args.flags["expires-at"] ?? null,
      notes: args.flags.notes,
    },
    { repositoryRoot },
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
  const { id, next } = buildClaim(loadRegistry(), args);
  preview(`Preview claim ${id} (pass --yes to write):`, next);
  if (!args.flags.yes) {
    return 0;
  }
  const written = mutateSharedRegistry(
    controlPlanePaths,
    (registry) => buildClaim(validate(registry), args).next,
    validate,
  );
  const task = written.tasks.find((entry) => entry.id === id);
  recordLeaseEvent("CLAIM", task);
  console.log(redactText(`Wrote shared claim ${id}`));
  return 0;
}

function buildState(registry, id, to) {
  validate(registry, { enforceOperational: false });
  const index = registry.tasks.findIndex((task) => task.id === id);
  if (index < 0) {
    throw new Error(`unknown task id: ${id}`);
  }
  const current = registry.tasks[index];
  if (current.worktree_id !== currentWorktreeId) {
    throw new Error(
      `task ${id} belongs to worktree ${current.worktree_id}; current worktree is ${currentWorktreeId}`,
    );
  }
  if (!canTransition(current.state, to)) {
    throw new Error(`illegal transition ${current.state} → ${to}`);
  }
  const updated = { ...current, state: to, updated_at: nowIso() };
  validateTaskShape(updated, { repositoryRoot });
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
  const { current, next } = buildState(
    loadRegistry({ enforceOperational: false }),
    id,
    to,
  );
  preview(
    `Preview state ${id}: ${current.state} → ${to} (pass --yes to write):`,
    next,
  );
  if (!args.flags.yes) {
    return 0;
  }
  const written = mutateSharedRegistry(
    controlPlanePaths,
    (registry) => buildState(registry, id, to).next,
    validate,
  );
  recordLeaseEvent(
    "TRANSITION",
    written.tasks.find((entry) => entry.id === id),
    { next_state: to },
  );
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
  if (current.worktree_id !== currentWorktreeId) {
    throw new Error(
      `task ${id} belongs to worktree ${current.worktree_id}; current worktree is ${currentWorktreeId}`,
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
  const { current, next, to } = buildClose(
    loadRegistry({ enforceOperational: false }),
    id,
  );
  preview(
    `Preview close ${id}: ${current.state} → ${to} (pass --yes to write):`,
    next,
  );
  if (!args.flags.yes) {
    return 0;
  }
  const written = mutateSharedRegistry(
    controlPlanePaths,
    (registry) => buildClose(registry, id).next,
    validate,
  );
  recordLeaseEvent(
    "RELEASE",
    written.tasks.find((entry) => entry.id === id),
    { next_state: to },
  );
  console.log(redactText(`Closed ${id} as ${to}`));
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

function main(argv) {
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

process.exitCode = main(process.argv.slice(2));
