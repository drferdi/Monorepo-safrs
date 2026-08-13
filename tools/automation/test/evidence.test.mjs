import assert from "node:assert/strict";
import test from "node:test";

import { digestCanonical } from "../src/canonical-json.mjs";
import {
  buildManifest,
  finalizeManifest,
  verifyManifest,
} from "../src/evidence.mjs";
import {
  REDACTION_VERSION,
  redactText,
  redactValue,
} from "../src/redaction.mjs";

const BASE = "a".repeat(40);
const HEAD = "b".repeat(40);
const DIGEST = "c".repeat(64);

function manifestInput(overrides = {}) {
  return {
    manifest_id: "MANIFEST-1",
    task_id: "TASK-20260813-DEMO-R1",
    run_id: "RUN-DEMO-1",
    attempt_ids: [1],
    contract_digest: DIGEST,
    lease_event_digests: [DIGEST],
    base_sha: BASE,
    head_sha: HEAD,
    diff_digest: DIGEST,
    effective_risk: "R1",
    risk_reasons: ["path: write scopes grant reversible mutation (R1)"],
    tool_events: [
      {
        sequence: 1,
        tool: "git",
        decision: "allow",
        reason_code: "OK",
        duration_ms: 12,
      },
    ],
    network_events: [],
    budget_usage: { tool_calls: 3 },
    check_verdicts: [
      { check_id: "safrs.contract", verdict: "PASS", duration_ms: 100 },
    ],
    approval_ids: [],
    publication: null,
    execution: null,
    recovery_events: [],
    artifact_hashes: { "report.txt": DIGEST },
    created_at: "2026-08-13T00:00:00Z",
    ...overrides,
  };
}

test("redaction removes secrets deterministically and is stable", () => {
  const dirty =
    "export GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234 && curl https://user:pw@example.com";
  const clean = redactText(dirty);
  assert.doesNotMatch(clean, /ghp_[A-Za-z0-9]{20,}/u);
  assert.doesNotMatch(clean, /user:pw@/u);
  assert.match(clean, /\[REDACTED/u);
  assert.equal(redactText(dirty), clean, "redaction must be deterministic");
});

test("redaction walks nested structures and leaves safe text intact", () => {
  const value = redactValue({
    command: "pnpm test",
    env: ["AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE"],
    nested: { note: "no secrets here" },
  });
  assert.equal(value.command, "pnpm test");
  assert.match(value.env[0], /\[REDACTED/u);
  assert.equal(value.nested.note, "no secrets here");
});

test("manifest finalization is content-addressed over the canonical body", () => {
  const manifest = finalizeManifest(buildManifest(manifestInput()));
  const { manifest_digest, ...body } = manifest;
  assert.equal(manifest_digest, digestCanonical(body));
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.redaction_version, REDACTION_VERSION);
  assert.deepEqual(verifyManifest(manifest).errors, []);
});

test("secret canaries never reach the finalized manifest", () => {
  const manifest = finalizeManifest(
    buildManifest(
      manifestInput({
        recovery_events: [
          "retry after GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234 rotated",
        ],
      }),
    ),
  );
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9]{20,}/u);
  assert.match(manifest.recovery_events[0], /\[REDACTED/u);
});

test("a redaction marker at the end of a value is not mistaken for a secret", () => {
  const manifest = finalizeManifest(
    buildManifest(
      manifestInput({
        recovery_events: [
          "rotate GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234",
        ],
      }),
    ),
  );
  assert.deepEqual(verifyManifest(manifest).errors, []);
});

test("tampering with a finalized manifest fails verification", () => {
  const manifest = finalizeManifest(buildManifest(manifestInput()));
  const tampered = { ...manifest, effective_risk: "R0" };
  assert.equal(
    verifyManifest(tampered).errors.some((error) => /digest/iu.test(error)),
    true,
  );
});

test("manifest validates against EvidenceManifestV1 required fields", () => {
  const manifest = finalizeManifest(buildManifest(manifestInput()));
  for (const field of [
    "manifest_id",
    "task_id",
    "run_id",
    "contract_digest",
    "base_sha",
    "effective_risk",
    "artifact_hashes",
    "redaction_version",
    "created_at",
    "manifest_digest",
  ]) {
    assert.ok(Object.hasOwn(manifest, field), field);
  }
  const incomplete = { ...manifest };
  delete incomplete.check_verdicts;
  assert.equal(verifyManifest(incomplete).errors.length > 0, true);
});
