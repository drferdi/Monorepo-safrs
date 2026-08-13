import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GATES, runGate } from "../src/gates.mjs";

/**
 * Fail-path coverage. The live `gate --all` run proves the pass paths; these
 * tests prove each gate actually fails closed on invalid artifacts rather
 * than passing them through.
 */

function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), "safrs-gates-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const control = join(root, "control");
  mkdirSync(control, { recursive: true });
  return { root, control };
}

function writeJson(directory, name, value) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, name), `${JSON.stringify(value, null, 2)}\n`);
}

test("every declared gate id resolves and an unknown one fails", () => {
  assert.equal(GATES.length, 8);
  assert.equal(runGate("safrs.nope", { root: process.cwd() }).verdict, "FAIL");
});

test("evidence gate fails on a tampered manifest", (t) => {
  const { root, control } = sandbox(t);
  writeJson(join(root, ".safrs/evidence"), "m.json", {
    manifest_id: "M-1",
    task_id: "TASK-20260813-DEMO-R1",
    manifest_digest: "0".repeat(64),
  });
  const result = runGate("safrs.evidence", { root, controlDirectory: control });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors.length > 0, true);
});

test("review gate fails on a self-reviewed approval record", (t) => {
  const { root, control } = sandbox(t);
  writeJson(join(root, ".safrs/approvals"), "a.json", {
    approval_id: "APR-1",
    kind: "R2_CODE_OWNER",
    task_id: "TASK-20260813-DEMO-R2",
    contract_digest: "c".repeat(64),
    subject_sha: "b".repeat(40),
    diff_digest: "e".repeat(64),
    reviewer_identity: "agent:claude:fable",
    reviewer_authority: "code-owner",
    author_identity: "agent:claude:fable",
    issued_at: "2026-08-13T00:00:00Z",
    expires_at: "2036-08-14T00:00:00Z",
    revoked_at: null,
  });
  const result = runGate("safrs.review", { root, controlDirectory: control });
  assert.equal(result.verdict, "FAIL");
  assert.equal(
    result.errors.some((error) => /self-review/iu.test(error)),
    true,
  );
});

test("platform gate fails on expiry, drift, and bypass actors", (t) => {
  const { root, control } = sandbox(t);
  const attestation = {
    expires_at: "2026-08-13T00:00:00Z",
    force_push_blocked: false,
    code_owner_review: false,
    bypass_actors: ["someone"],
  };
  mkdirSync(join(root, ".safrs"), { recursive: true });
  writeFileSync(
    join(root, ".safrs/platform-attestation.json"),
    JSON.stringify(attestation),
  );
  const result = runGate("safrs.platform", {
    root,
    controlDirectory: control,
    now: "2026-08-14T00:00:00Z",
  });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors.length, 4);
});

test("budgets gate fails on a tripped breaker and on an exceeded counter", (t) => {
  const { root, control } = sandbox(t);
  writeFileSync(
    join(control, "budget-ledger.json"),
    JSON.stringify({
      version: 1,
      tasks: {
        "TASK-20260813-A": {
          counters: { tool_calls: 9 },
          limits: { tool_calls: 5 },
          stopped: true,
          reason: "budget tool_calls exhausted (9/5)",
        },
      },
    }),
  );
  const result = runGate("safrs.budgets", { root, controlDirectory: control });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.errors.length, 2);
});

test("lease gate fails on a chain with a forged fencing token", (t) => {
  const { root, control } = sandbox(t);
  const event = {
    schema_version: 1,
    event_id: "e1",
    sequence: 1,
    event_type: "CLAIM",
    task_id: "TASK-20260813-A",
    lease_id: "L-1",
    fencing_token: 7,
    actor: "agent",
    worktree_id: "main",
    scope_digest: "d".repeat(64),
    scope_prefixes: ["docs/"],
    previous_state: null,
    next_state: "CLAIMED",
    occurred_at: "2026-08-13T00:00:00Z",
    expires_at: null,
    authority_run_url: null,
    event_digest: "0".repeat(64),
  };
  writeFileSync(
    join(control, "lease-events.ndjson"),
    `${JSON.stringify(event)}\n`,
  );
  const result = runGate("safrs.lease", { root, controlDirectory: control });
  assert.equal(result.verdict, "FAIL");
});

test("gates report not_applicable instead of inventing a pass reason", (t) => {
  const { root, control } = sandbox(t);
  for (const id of [
    "safrs.lease",
    "safrs.budgets",
    "safrs.review",
    "safrs.evidence",
    "safrs.platform",
  ]) {
    const result = runGate(id, { root, controlDirectory: control });
    assert.equal(result.verdict, "PASS", id);
    assert.equal(result.state, "not_applicable", id);
  }
});
