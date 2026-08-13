import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLeaseEvent,
  nextEvent,
  reconcileLease,
  replayState,
  scopeDigest,
  verifyEventChain,
} from "../src/leases.mjs";

const TASK = "TASK-20260813-DEMO-R1";
const SCOPES = ["projects/golden-path/"];
const T0 = "2026-08-13T00:00:00Z";
const T1 = "2026-08-13T01:00:00Z";
const EXPIRY = "2026-08-13T12:00:00Z";
const RUN_URL = "https://github.com/drferdii/Monorepo-safrs/actions/runs/1";

function claimRequest(overrides = {}) {
  return {
    task_id: TASK,
    lease_id: "LEASE-DEMO-1",
    actor: "agent:claude:fable",
    worktree_id: "worktrees/demo",
    scope_prefixes: SCOPES,
    expires_at: EXPIRY,
    ...overrides,
  };
}

function freshChain() {
  const claimed = nextEvent(
    [],
    { action: "CLAIM", ...claimRequest() },
    {
      occurred_at: T0,
      authority_run_url: RUN_URL,
    },
  );
  assert.equal(claimed.denied, undefined);
  return [claimed.event];
}

test("scope digest is order-insensitive and casefolded", () => {
  assert.equal(scopeDigest(["b/", "A.txt"]), scopeDigest(["a.txt", "B/"]));
});

test("CLAIM on an empty chain issues fencing token 1 and a valid digest", () => {
  const chain = freshChain();
  const verdict = verifyEventChain(chain);
  assert.deepEqual(verdict.errors, []);
  const state = replayState(chain);
  assert.equal(state.fencing_token, 1);
  assert.equal(state.next_state, "CLAIMED");
});

test("CLAIM while an unexpired lease is active is denied", () => {
  const chain = freshChain();
  const second = nextEvent(
    chain,
    { action: "CLAIM", ...claimRequest({ actor: "someone-else" }) },
    { occurred_at: T1, authority_run_url: RUN_URL },
  );
  assert.match(second.denied, /active/iu);
});

test("RENEW and TRANSITION require the current fencing token and owner", () => {
  const chain = freshChain();
  const renewOk = nextEvent(
    chain,
    {
      action: "RENEW",
      ...claimRequest(),
      fencing_token: 1,
      expires_at: EXPIRY,
    },
    { occurred_at: T1, authority_run_url: RUN_URL },
  );
  assert.equal(renewOk.denied, undefined);

  const staleToken = nextEvent(
    chain,
    { action: "RENEW", ...claimRequest(), fencing_token: 99 },
    { occurred_at: T1, authority_run_url: RUN_URL },
  );
  assert.match(staleToken.denied, /fencing/iu);

  const wrongOwner = nextEvent(
    chain,
    {
      action: "TRANSITION",
      ...claimRequest({ actor: "impostor" }),
      fencing_token: 1,
      next_state: "EXECUTING",
    },
    { occurred_at: T1, authority_run_url: RUN_URL },
  );
  assert.match(wrongOwner.denied, /owner/iu);
});

test("RECLAIM is denied before expiry and bumps the token after expiry", () => {
  const chain = freshChain();
  const early = nextEvent(
    chain,
    { action: "RECLAIM", ...claimRequest({ actor: "recovery" }) },
    { occurred_at: T1, authority_run_url: RUN_URL },
  );
  assert.match(early.denied, /expir/iu);

  const late = nextEvent(
    chain,
    { action: "RECLAIM", ...claimRequest({ actor: "recovery" }) },
    { occurred_at: "2026-08-14T00:00:00Z", authority_run_url: RUN_URL },
  );
  assert.equal(late.denied, undefined);
  assert.equal(late.event.fencing_token, 2);
});

test("chain verification rejects gaps, digest tampering, and token jumps", () => {
  const chain = freshChain();
  const renew = nextEvent(
    chain,
    {
      action: "RENEW",
      ...claimRequest(),
      fencing_token: 1,
      expires_at: EXPIRY,
    },
    { occurred_at: T1, authority_run_url: RUN_URL },
  ).event;

  const gap = [chain[0], { ...renew, sequence: 5 }];
  assert.equal(verifyEventChain(gap).errors.length > 0, true);

  const tampered = [{ ...chain[0], expires_at: "2027-01-01T00:00:00Z" }];
  assert.equal(
    verifyEventChain(tampered).errors.some((e) => /digest/iu.test(e)),
    true,
  );

  const jump = [
    chain[0],
    buildLeaseEvent({
      ...renew,
      event_id: "forged",
      fencing_token: 7,
      sequence: 2,
    }),
  ];
  assert.equal(
    verifyEventChain(jump).errors.some((e) => /fencing/iu.test(e)),
    true,
  );
});

test("reconcile: matching local claim against remote chain allows the push", () => {
  const chain = freshChain();
  const verdict = reconcileLease(
    {
      task_id: TASK,
      lease_id: "LEASE-DEMO-1",
      actor: "agent:claude:fable",
      worktree_id: "worktrees/demo",
      fencing_token: 1,
      scope_prefixes: SCOPES,
    },
    chain,
    T1,
  );
  assert.equal(verdict.decision, "allow");
});

test("reconcile fails closed: lost dispatch, stale token, foreign owner, expiry, scope drift", () => {
  const chain = freshChain();
  const local = {
    task_id: TASK,
    lease_id: "LEASE-DEMO-1",
    actor: "agent:claude:fable",
    worktree_id: "worktrees/demo",
    fencing_token: 1,
    scope_prefixes: SCOPES,
  };

  // Dispatch lost: no remote chain at all — never assume the claim landed.
  assert.equal(reconcileLease(local, [], T1).decision, "stop");
  assert.equal(
    reconcileLease({ ...local, fencing_token: 2 }, chain, T1).decision,
    "stop",
  );
  assert.equal(
    reconcileLease({ ...local, actor: "impostor" }, chain, T1).decision,
    "stop",
  );
  assert.equal(
    reconcileLease(local, chain, "2026-08-14T00:00:00Z").decision,
    "stop",
  );
  assert.equal(
    reconcileLease({ ...local, scope_prefixes: ["other/"] }, chain, T1)
      .decision,
    "stop",
  );
});

test("replay reconstructs terminal state after release", () => {
  const chain = freshChain();
  const released = nextEvent(
    chain,
    {
      action: "RELEASE",
      ...claimRequest(),
      fencing_token: 1,
      next_state: "CLOSED",
    },
    { occurred_at: T1, authority_run_url: RUN_URL },
  );
  assert.equal(released.denied, undefined);
  const full = [...chain, released.event];
  assert.deepEqual(verifyEventChain(full).errors, []);
  const state = replayState(full);
  assert.equal(state.next_state, "CLOSED");
  assert.equal(state.terminal, true);

  const claimAfter = nextEvent(
    full,
    { action: "CLAIM", ...claimRequest({ lease_id: "LEASE-DEMO-2" }) },
    { occurred_at: "2026-08-13T02:00:00Z", authority_run_url: RUN_URL },
  );
  assert.equal(claimAfter.denied, undefined);
  assert.equal(claimAfter.event.fencing_token, 2);
});
