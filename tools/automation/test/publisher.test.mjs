import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePublication, REQUIRED_CHECKS } from "../src/publisher.mjs";

const HEAD = "b".repeat(40);
const CONTRACT = "c".repeat(64);
const DIFF = "e".repeat(64);

function greenChecks() {
  return REQUIRED_CHECKS.map((check_id) => ({
    check_id,
    verdict: "PASS",
    duration_ms: 10,
  }));
}

function pullRequest(overrides = {}) {
  return {
    number: 42,
    head_sha: HEAD,
    diff_digest: DIFF,
    author_identity: "agent:claude:fable",
    reviews: [],
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    task_id: "TASK-20260813-DEMO-R1",
    contract_digest: CONTRACT,
    head_sha: HEAD,
    diff_digest: DIFF,
    effective_risk: "R1",
    check_verdicts: greenChecks(),
    approval_ids: [],
    ...overrides,
  };
}

function platform(overrides = {}) {
  return {
    observed_at: "2026-08-13T05:00:00Z",
    expires_at: "2026-08-14T00:00:00Z",
    force_push_blocked: true,
    code_owner_review: true,
    ...overrides,
  };
}

const NOW = "2026-08-13T06:00:00Z";

test("R1 with every gate green is eligible without any approval", () => {
  const verdict = evaluatePublication(pullRequest(), evidence(), {
    platform: platform(),
    now: NOW,
  });
  assert.equal(verdict.eligible, true, JSON.stringify(verdict.missingGates));
  assert.equal(verdict.risk, "R1");
  assert.equal(verdict.headSha, HEAD);
});

test("a new commit invalidates the verdict: evidence must match the exact head", () => {
  const verdict = evaluatePublication(
    pullRequest({ head_sha: "9".repeat(40) }),
    evidence(),
    { platform: platform(), now: NOW },
  );
  assert.equal(verdict.eligible, false);
  assert.equal(
    verdict.missingGates.some((gate) => /head/iu.test(gate)),
    true,
  );
});

test("any failing or missing required check blocks publication", () => {
  const failing = greenChecks();
  failing[0] = { ...failing[0], verdict: "FAIL" };
  assert.equal(
    evaluatePublication(pullRequest(), evidence({ check_verdicts: failing }), {
      platform: platform(),
      now: NOW,
    }).eligible,
    false,
  );

  const missing = greenChecks().slice(1);
  const verdict = evaluatePublication(
    pullRequest(),
    evidence({ check_verdicts: missing }),
    { platform: platform(), now: NOW },
  );
  assert.equal(verdict.eligible, false);
  assert.equal(
    verdict.missingGates.some((gate) => gate.includes(REQUIRED_CHECKS[0])),
    true,
  );
});

test("R2 is blocked until a qualifying approval exists, then becomes eligible", () => {
  const blocked = evaluatePublication(
    pullRequest(),
    evidence({ effective_risk: "R2" }),
    { platform: platform(), now: NOW },
  );
  assert.equal(blocked.eligible, false);
  assert.equal(
    blocked.missingGates.some((gate) => /approval/iu.test(gate)),
    true,
  );

  const approved = evaluatePublication(
    pullRequest(),
    evidence({ effective_risk: "R2", approval_ids: ["APR-1"] }),
    {
      platform: platform(),
      now: NOW,
      approvals: [
        {
          approval_id: "APR-1",
          kind: "R2_CODE_OWNER",
          task_id: "TASK-20260813-DEMO-R1",
          contract_digest: CONTRACT,
          subject_sha: HEAD,
          diff_digest: DIFF,
          operation_digest: null,
          target_environment: null,
          idempotency_key: null,
          reviewer_identity: "chief",
          reviewer_authority: "code-owner",
          author_identity: "agent:claude:fable",
          issued_at: "2026-08-13T00:00:00Z",
          expires_at: "2026-08-14T00:00:00Z",
          source_event_url: "https://github.com/x/1",
          source_event_id: "review-1",
          revoked_at: null,
          approval_digest: "f".repeat(64),
        },
      ],
      authorizedReviewers: ["chief"],
    },
  );
  assert.equal(approved.eligible, true, JSON.stringify(approved.missingGates));
});

test("R3 code may publish under R2 rules; an R3 operation never publishes here", () => {
  const verdict = evaluatePublication(
    pullRequest(),
    evidence({
      effective_risk: "R3",
      approval_ids: [],
      execution: { operation_digest: "1".repeat(64) },
    }),
    { platform: platform(), now: NOW },
  );
  assert.equal(verdict.eligible, false);
  assert.equal(
    verdict.missingGates.some((gate) => /operation|R3/iu.test(gate)),
    true,
  );
});

test("stale or drifted platform attestation fails publication closed", () => {
  assert.equal(
    evaluatePublication(pullRequest(), evidence(), {
      platform: platform({ expires_at: "2026-08-13T00:00:00Z" }),
      now: NOW,
    }).eligible,
    false,
  );
  assert.equal(
    evaluatePublication(pullRequest(), evidence(), {
      platform: platform({ force_push_blocked: false }),
      now: NOW,
    }).eligible,
    false,
  );
  assert.equal(
    evaluatePublication(pullRequest(), evidence(), { platform: null, now: NOW })
      .eligible,
    false,
  );
});

test("the publisher never merges: the verdict only ever requests auto-merge", () => {
  const verdict = evaluatePublication(pullRequest(), evidence(), {
    platform: platform(),
    now: NOW,
  });
  assert.equal(verdict.action, "enable_auto_merge");
  assert.equal(Object.hasOwn(verdict, "merge"), false);
});
