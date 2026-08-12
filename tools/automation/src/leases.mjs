import { randomUUID } from "node:crypto";

import { canonicalize, digestCanonical } from "./canonical-json.mjs";
import { normalizeScope } from "./scopes.mjs";

/**
 * Lease event chains (LeaseEventV1). Pure decision logic for the serialized
 * remote authority plus verification/replay/reconciliation used locally.
 * The GitHub workflow is a thin shell around nextEvent(); everything here is
 * unit-testable with fixture chains and fails closed.
 *
 * Fencing rule: the token increments only on successful CLAIM or RECLAIM.
 * A writer holding an older token must stop before mutating or pushing.
 */

const TERMINAL_STATES = new Set([
  "MERGED",
  "CLOSED",
  "FAILED",
  "ABORTED",
  "SUPERSEDED",
]);

export function scopeDigest(prefixes) {
  const normalized = [...prefixes]
    .map((prefix) => normalizeScope(prefix).toLowerCase())
    .sort();
  return digestCanonical(normalized);
}

export function buildLeaseEvent(fields) {
  const { event_digest, ...withoutDigest } = fields;
  return { ...withoutDigest, event_digest: digestCanonical(withoutDigest) };
}

export function verifyEventChain(events) {
  const errors = [];
  let token = 0;
  events.forEach((event, index) => {
    const { event_digest, ...withoutDigest } = event;
    if (event_digest !== digestCanonical(withoutDigest)) {
      errors.push(`event[${index}]: digest mismatch`);
    }
    if (event.sequence !== index + 1) {
      errors.push(`event[${index}]: sequence gap (got ${event.sequence})`);
    }
    const bumps =
      event.event_type === "CLAIM" || event.event_type === "RECLAIM";
    const expected = bumps ? token + 1 : token;
    if (event.fencing_token !== expected) {
      errors.push(
        `event[${index}]: fencing token ${event.fencing_token}, expected ${expected}`,
      );
    }
    token = expected;
  });
  return { valid: errors.length === 0, errors };
}

export function replayState(events) {
  if (events.length === 0) {
    return null;
  }
  const last = events[events.length - 1];
  const lastClaim = [...events]
    .reverse()
    .find(
      (event) => event.event_type === "CLAIM" || event.event_type === "RECLAIM",
    );
  return {
    task_id: last.task_id,
    lease_id: lastClaim?.lease_id ?? last.lease_id,
    actor: lastClaim?.actor ?? last.actor,
    worktree_id: lastClaim?.worktree_id ?? last.worktree_id,
    fencing_token: last.fencing_token,
    scope_digest: lastClaim?.scope_digest ?? last.scope_digest,
    scope_prefixes: lastClaim?.scope_prefixes ?? last.scope_prefixes,
    expires_at: last.expires_at ?? lastClaim?.expires_at ?? null,
    next_state: last.next_state,
    sequence: last.sequence,
    terminal:
      TERMINAL_STATES.has(last.next_state) ||
      last.event_type === "RELEASE" ||
      last.event_type === "EXPIRE",
  };
}

function isExpired(state, nowIso) {
  return (
    state.expires_at !== null &&
    Date.parse(nowIso) > Date.parse(state.expires_at)
  );
}

function deny(reason) {
  return { denied: reason };
}

/**
 * The single authority decision function. Runs only inside the serialized
 * remote workflow (or a test). Returns {event} on grant, {denied} otherwise.
 */
export function nextEvent(chain, request, context) {
  const verdict = verifyEventChain(chain);
  if (!verdict.valid) {
    return deny(`chain invalid: ${verdict.errors[0]}`);
  }
  const state = replayState(chain);
  const action = request.action;
  const base = {
    schema_version: 1,
    event_id: context.event_id ?? randomUUID(),
    sequence: chain.length + 1,
    event_type: action,
    task_id: request.task_id,
    lease_id: request.lease_id,
    actor: request.actor,
    worktree_id: request.worktree_id,
    scope_prefixes: request.scope_prefixes ?? state?.scope_prefixes ?? [],
    occurred_at: context.occurred_at,
    authority_run_url: context.authority_run_url ?? null,
  };
  base.scope_digest = scopeDigest(base.scope_prefixes);

  if (action === "CLAIM") {
    if (state && !state.terminal && !isExpired(state, context.occurred_at)) {
      return deny(
        `lease is active for ${state.actor} until ${state.expires_at}`,
      );
    }
    return {
      event: buildLeaseEvent({
        ...base,
        fencing_token: (state?.fencing_token ?? 0) + 1,
        previous_state: state?.next_state ?? null,
        next_state: "CLAIMED",
        expires_at: request.expires_at,
      }),
    };
  }

  if (action === "RECLAIM") {
    if (!state) {
      return deny("nothing to reclaim: no chain");
    }
    if (!state.terminal && !isExpired(state, context.occurred_at)) {
      return deny("reclaim requires expiry or a terminal lease");
    }
    return {
      event: buildLeaseEvent({
        ...base,
        fencing_token: state.fencing_token + 1,
        previous_state: state.next_state,
        next_state: "CLAIMED",
        expires_at: request.expires_at,
      }),
    };
  }

  // RENEW / TRANSITION / RELEASE / EXPIRE act on the current lease.
  if (!state || state.terminal) {
    return deny(`no active lease for ${action}`);
  }
  if (action !== "EXPIRE") {
    if (request.fencing_token !== state.fencing_token) {
      return deny(
        `fencing token mismatch: held ${request.fencing_token}, current ${state.fencing_token}`,
      );
    }
    if (
      request.actor !== state.actor ||
      request.worktree_id !== state.worktree_id
    ) {
      return deny("owner mismatch: lease belongs to another actor/worktree");
    }
    if (isExpired(state, context.occurred_at)) {
      return deny("lease expired; a fresh CLAIM or RECLAIM is required");
    }
  } else if (!isExpired(state, context.occurred_at)) {
    return deny("EXPIRE before expiry timestamp");
  }

  const nextState =
    action === "RENEW"
      ? state.next_state
      : action === "EXPIRE"
        ? "ABORTED"
        : request.next_state;
  return {
    event: buildLeaseEvent({
      ...base,
      fencing_token: state.fencing_token,
      previous_state: state.next_state,
      next_state: nextState,
      expires_at:
        action === "RENEW" ? request.expires_at : (state.expires_at ?? null),
    }),
  };
}

/**
 * Local gate before push or autonomous mutation. The remote chain is the
 * authority; absence of confirmation is a stop, never an assumption —
 * a cancelled workflow dispatch must read as deny.
 */
export function reconcileLease(local, remoteEvents, nowIso) {
  const stop = (reason) => ({ decision: "stop", reason });
  if (!remoteEvents || remoteEvents.length === 0) {
    return stop("no remote lease chain: claim dispatch may have been lost");
  }
  const verdict = verifyEventChain(remoteEvents);
  if (!verdict.valid) {
    return stop(`remote chain invalid: ${verdict.errors[0]}`);
  }
  const state = replayState(remoteEvents);
  if (state.task_id !== local.task_id) {
    return stop("remote chain belongs to a different task");
  }
  if (state.terminal) {
    return stop(`remote lease is terminal (${state.next_state})`);
  }
  if (isExpired(state, nowIso)) {
    return stop("remote lease expired");
  }
  if (state.fencing_token !== local.fencing_token) {
    return stop(
      `stale fencing token: local ${local.fencing_token}, remote ${state.fencing_token}`,
    );
  }
  if (state.actor !== local.actor || state.worktree_id !== local.worktree_id) {
    return stop("remote lease is owned by another actor/worktree");
  }
  if (state.scope_digest !== scopeDigest(local.scope_prefixes)) {
    return stop("scope drift: local scopes do not match the granted lease");
  }
  return { decision: "allow", reason: "remote lease confirms local claim" };
}

export function parseLedgerComment(body) {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === "object" &&
      parsed !== null &&
      parsed.schema_version === 1 &&
      typeof parsed.event_type === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function canonicalEventBody(event) {
  return canonicalize(event);
}
