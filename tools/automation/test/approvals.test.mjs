import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGitHubReview, verifyApproval } from "../src/approvals.mjs";

const HEAD = "b".repeat(40);
const OTHER_HEAD = "d".repeat(40);
const CONTRACT = "c".repeat(64);
const DIFF = "e".repeat(64);

function approval(overrides = {}) {
  return {
    schema_version: 1,
    approval_id: "APR-1",
    kind: "R2_CODE_OWNER",
    task_id: "TASK-20260813-DEMO-R2",
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
    source_event_url: "https://github.com/drferdii/Monorepo-safrs/pull/1",
    source_event_id: "review-1",
    revoked_at: null,
    approval_digest: "f".repeat(64),
    ...overrides,
  };
}

function subject(overrides = {}) {
  return {
    task_id: "TASK-20260813-DEMO-R2",
    contract_digest: CONTRACT,
    head_sha: HEAD,
    diff_digest: DIFF,
    author_identity: "agent:claude:fable",
    authorized_reviewers: ["chief"],
    now: "2026-08-13T06:00:00Z",
    ...overrides,
  };
}

test("a current code-owner approval bound to the exact head is valid", () => {
  const verdict = verifyApproval(approval(), subject());
  assert.equal(verdict.valid, true, verdict.reason);
});

test("self-review is rejected even with a valid binding", () => {
  const verdict = verifyApproval(
    approval({ reviewer_identity: "agent:claude:fable" }),
    subject(),
  );
  assert.equal(verdict.valid, false);
  assert.match(verdict.reason, /self/iu);
});

test("stale head, changed diff, or changed contract invalidate the approval", () => {
  assert.match(
    verifyApproval(approval(), subject({ head_sha: OTHER_HEAD })).reason,
    /head/iu,
  );
  assert.match(
    verifyApproval(approval(), subject({ diff_digest: "9".repeat(64) })).reason,
    /diff/iu,
  );
  assert.match(
    verifyApproval(approval(), subject({ contract_digest: "9".repeat(64) }))
      .reason,
    /contract/iu,
  );
});

test("expiry, revocation, and unknown authority fail closed", () => {
  assert.match(
    verifyApproval(approval(), subject({ now: "2026-08-15T00:00:00Z" })).reason,
    /expir/iu,
  );
  assert.match(
    verifyApproval(approval({ revoked_at: "2026-08-13T01:00:00Z" }), subject())
      .reason,
    /revok/iu,
  );
  assert.match(
    verifyApproval(approval({ reviewer_identity: "stranger" }), subject())
      .reason,
    /authorit/iu,
  );
});

test("R3 approvals demand operation, target, and idempotency bindings", () => {
  const r3Subject = subject({
    operation_digest: "1".repeat(64),
    target_environment: "simulation",
    idempotency_key: "idem-1",
  });
  const incomplete = verifyApproval(
    approval({ kind: "R3_EXECUTION" }),
    r3Subject,
  );
  assert.equal(incomplete.valid, false);
  assert.match(incomplete.reason, /operation|target|idempotency/iu);

  const complete = verifyApproval(
    approval({
      kind: "R3_EXECUTION",
      operation_digest: "1".repeat(64),
      target_environment: "simulation",
      idempotency_key: "idem-1",
    }),
    r3Subject,
  );
  assert.equal(complete.valid, true, complete.reason);

  const driftedTarget = verifyApproval(
    approval({
      kind: "R3_EXECUTION",
      operation_digest: "1".repeat(64),
      target_environment: "production",
      idempotency_key: "idem-1",
    }),
    r3Subject,
  );
  assert.equal(driftedTarget.valid, false);
  assert.match(driftedTarget.reason, /target/iu);
});

test("GitHub review normalization keeps only current, approving, non-dismissed reviews", () => {
  const reviews = [
    {
      id: 1,
      state: "APPROVED",
      commit_id: HEAD,
      user: { login: "chief" },
      submitted_at: "2026-08-13T00:00:00Z",
      html_url: "https://github.com/x/1",
    },
    {
      id: 2,
      state: "DISMISSED",
      commit_id: HEAD,
      user: { login: "chief" },
      submitted_at: "2026-08-13T00:00:00Z",
      html_url: "https://github.com/x/2",
    },
    {
      id: 3,
      state: "APPROVED",
      commit_id: OTHER_HEAD,
      user: { login: "chief" },
      submitted_at: "2026-08-12T00:00:00Z",
      html_url: "https://github.com/x/3",
    },
    {
      id: 4,
      state: "COMMENTED",
      commit_id: HEAD,
      user: { login: "chief" },
      submitted_at: "2026-08-13T00:00:00Z",
      html_url: "https://github.com/x/4",
    },
  ];
  const normalized = normalizeGitHubReview(reviews, {
    head_sha: HEAD,
    task_id: "TASK-20260813-DEMO-R2",
    contract_digest: CONTRACT,
    diff_digest: DIFF,
    author_identity: "agent:claude:fable",
    expires_in_hours: 24,
  });
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].source_event_id, "review-1");
  assert.equal(normalized[0].subject_sha, HEAD);
});
