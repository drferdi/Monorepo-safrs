import { existsSync } from "node:fs";

import { canonicalize } from "../../automation/src/canonical-json.mjs";
import {
  nextEvent,
  replayState,
  scopeDigest,
  verifyEventChain,
} from "../../automation/src/leases.mjs";
import { normalizeScope } from "../../automation/src/scopes.mjs";
import {
  findOverlapConflicts,
  MUTATION_ACTIVE,
  nowIso,
  prefixesOverlap,
  validateRegistry,
} from "./ownership.mjs";
import {
  readLeaseEvents,
  readSharedRegistry,
  recoverTransferJournal,
  transferJournalPath,
  withRecoveredLock,
} from "./storage.mjs";

export { recoverTransferJournal };

function samePath(left, right) {
  return (
    normalizeScope(left).toLowerCase() === normalizeScope(right).toLowerCase()
  );
}

function withoutPaths(scopes, paths) {
  return scopes.filter((scope) => !paths.some((path) => samePath(scope, path)));
}

// Same rule as `task state` and `task close`: a session mutates only the
// tasks bound to its own worktree, so a transfer cannot take another
// session's claim.
function assertSameWorktree(task, worktreeId) {
  if (task.worktree_id !== worktreeId) {
    throw new Error(
      `task ${task.id} belongs to worktree ${task.worktree_id}; current worktree is ${worktreeId}`,
    );
  }
}

function leaseFor(paths, task) {
  const chain = readLeaseEvents(paths, task.id);
  if (chain.length === 0) {
    throw new Error(`task ${task.id}: active lease chain is required`);
  }
  const verdict = verifyEventChain(chain);
  if (!verdict.valid) {
    throw new Error(`task ${task.id}: ${verdict.errors[0]}`);
  }
  const state = replayState(chain);
  if (!state || state.terminal) {
    throw new Error(`task ${task.id}: lease is not active`);
  }
  if (state.scope_digest !== scopeDigest(task.scope_prefixes)) {
    throw new Error(
      `task ${task.id}: registry scope diverges from the lease before transfer`,
    );
  }
  return { chain, state };
}

export function planScopeTransfer(registry, paths, request) {
  if (
    !request?.operationId ||
    !request.destinationId ||
    !request.actor ||
    !request.worktreeId
  ) {
    throw new Error(
      "transfer requires operationId, destinationId, actor, and worktreeId",
    );
  }
  if (typeof request.reason !== "string" || !request.reason.trim()) {
    throw new Error("transfer requires a reason");
  }
  const moves = request.moves ?? [];
  if (moves.length === 0) {
    throw new Error("transfer requires at least one path");
  }
  const tasks = new Map(registry.tasks.map((task) => [task.id, task]));
  const destination = tasks.get(request.destinationId);
  if (!destination) {
    throw new Error(`unknown destination task ${request.destinationId}`);
  }
  if (!MUTATION_ACTIVE.has(destination.state)) {
    throw new Error(`destination ${destination.id} is not mutation-active`);
  }
  assertSameWorktree(destination, request.worktreeId);
  const seen = new Set();
  const bySource = new Map();
  for (const move of moves) {
    const key = normalizeScope(move.path).toLowerCase();
    if (seen.has(key)) {
      throw new Error(`duplicate transfer path ${move.path}`);
    }
    seen.add(key);
    const source = tasks.get(move.sourceId);
    if (!source) {
      throw new Error(`unknown source task ${move.sourceId}`);
    }
    if (source.id === destination.id) {
      throw new Error(`path ${move.path} cannot transfer onto its source task`);
    }
    if (!MUTATION_ACTIVE.has(source.state)) {
      throw new Error(`source ${source.id} is not mutation-active`);
    }
    assertSameWorktree(source, request.worktreeId);
    const owned = source.scope_prefixes.filter((scope) =>
      samePath(scope, move.path),
    );
    if (owned.length !== 1) {
      throw new Error(`source ${source.id} does not exactly own ${move.path}`);
    }
    if (
      destination.scope_prefixes.some((scope) =>
        prefixesOverlap(scope, owned[0]),
      )
    ) {
      throw new Error(
        `destination ${destination.id} already overlaps ${move.path}`,
      );
    }
    const bucket = bySource.get(source.id) ?? [];
    bucket.push(owned[0]);
    bySource.set(source.id, bucket);
  }

  const nextTasks = registry.tasks.map((task) => ({
    ...task,
    scope_prefixes: [...task.scope_prefixes],
  }));
  const nextById = new Map(nextTasks.map((task) => [task.id, task]));
  for (const [sourceId, removed] of bySource) {
    const source = nextById.get(sourceId);
    source.scope_prefixes = withoutPaths(source.scope_prefixes, removed);
    if (source.scope_prefixes.length === 0) {
      throw new Error(`transfer would empty the scope of ${sourceId}`);
    }
  }
  const destinationNext = nextById.get(destination.id);
  destinationNext.scope_prefixes = [
    ...destinationNext.scope_prefixes,
    ...moves.map((move) => normalizeScope(move.path)),
  ];
  const stamped = nowIso();
  for (const task of nextTasks) {
    if (task.id === destination.id || bySource.has(task.id)) {
      task.updated_at = stamped;
    }
  }
  const overlap = findOverlapConflicts(nextTasks);
  if (overlap.length > 0) {
    const first = overlap[0];
    throw new Error(
      `mutation-active overlap between ${first.left_id} (${first.left_scope}) and ${first.right_id} (${first.right_scope})`,
    );
  }
  validateRegistry(
    { version: 1, tasks: nextTasks },
    { enforceOperational: true },
  );

  const amendments = [];
  for (const task of [
    destination,
    ...[...bySource.keys()].map((id) => tasks.get(id)),
  ]) {
    const lease = leaseFor(paths, task);
    const updated = nextById.get(task.id).scope_prefixes;
    const outcome = nextEvent(
      lease.chain,
      {
        action: "SCOPE_AMEND",
        task_id: task.id,
        lease_id: lease.state.lease_id,
        fencing_token: lease.state.fencing_token,
        transfer_operation_id: request.operationId,
        transfer_reason: request.reason,
        authorized_actor: request.actor,
        previous_scope_prefixes: task.scope_prefixes,
        updated_scope_prefixes: updated,
        previous_scope_digest: scopeDigest(task.scope_prefixes),
        updated_scope_digest: scopeDigest(updated),
      },
      { occurred_at: stamped, authority_run_url: null },
    );
    if (outcome.denied) {
      throw new Error(`task ${task.id}: ${outcome.denied}`);
    }
    amendments.push(outcome.event);
  }

  return {
    registry: { version: 1, tasks: nextTasks },
    amendments,
    touched: [destination.id, ...bySource.keys()],
  };
}

function previewScopeTransfer(paths, request) {
  if (existsSync(transferJournalPath(paths))) {
    return { dryRun: true, recoveryPending: true, touched: [] };
  }
  const plan = planScopeTransfer(readSharedRegistry(paths), paths, request);
  return { dryRun: true, recoveryPending: false, touched: plan.touched };
}

export function executeScopeTransfer(paths, request, hooks = {}) {
  if (request.dryRun) {
    return previewScopeTransfer(paths, request);
  }
  return withRecoveredLock(paths, (commit) => {
    const plan = planScopeTransfer(readSharedRegistry(paths), paths, request);
    const lines = plan.amendments.map((event) => canonicalize(event));
    return commit({
      registryText: `${JSON.stringify(plan.registry, null, 2)}\n`,
      appendedLines: lines,
      abandonAfterJournal: hooks.abandonAfterJournal,
      abandonAfterRegistry: hooks.abandonAfterRegistry,
      abandonAfterLedger: hooks.abandonAfterLedger,
      afterRegistry: hooks.afterRegistry,
      registryReplaceOptions: hooks.registryReplaceOptions,
      result: {
        dryRun: false,
        touched: plan.touched,
        events: lines.length,
      },
    });
  });
}
