import { digestCanonical } from "./canonical-json.mjs";
import {
  containsSecret,
  REDACTION_VERSION,
  redactValue,
} from "./redaction.mjs";

/**
 * Evidence plane: assemble, redact, hash, and verify EvidenceManifestV1.
 *
 * A manifest is finalized exactly once: redaction runs first, then the
 * content-addressed digest is computed over the canonical body without the
 * digest field. Finalization refuses to emit a manifest that still contains
 * secret-shaped content — evidence failure is operational failure.
 */

const REQUIRED_FIELDS = [
  "schema_version",
  "manifest_id",
  "task_id",
  "run_id",
  "attempt_ids",
  "contract_digest",
  "lease_event_digests",
  "base_sha",
  "head_sha",
  "diff_digest",
  "effective_risk",
  "risk_reasons",
  "tool_events",
  "network_events",
  "budget_usage",
  "check_verdicts",
  "approval_ids",
  "publication",
  "execution",
  "recovery_events",
  "artifact_hashes",
  "redaction_version",
  "created_at",
];

export function buildManifest(input) {
  return {
    schema_version: 1,
    manifest_id: input.manifest_id,
    task_id: input.task_id,
    run_id: input.run_id,
    attempt_ids: input.attempt_ids ?? [1],
    contract_digest: input.contract_digest,
    lease_event_digests: input.lease_event_digests ?? [],
    base_sha: input.base_sha,
    head_sha: input.head_sha ?? null,
    diff_digest: input.diff_digest ?? null,
    effective_risk: input.effective_risk,
    risk_reasons: input.risk_reasons ?? [],
    tool_events: input.tool_events ?? [],
    network_events: input.network_events ?? [],
    budget_usage: input.budget_usage ?? {},
    check_verdicts: input.check_verdicts ?? [],
    approval_ids: input.approval_ids ?? [],
    publication: input.publication ?? null,
    execution: input.execution ?? null,
    recovery_events: input.recovery_events ?? [],
    artifact_hashes: input.artifact_hashes ?? {},
    redaction_version: REDACTION_VERSION,
    created_at: input.created_at,
  };
}

export function finalizeManifest(manifest) {
  const redacted = redactValue(manifest);
  if (containsSecret(redacted)) {
    throw new Error(
      "evidence finalization refused: secret-shaped content survived redaction",
    );
  }
  const body = { ...redacted, redaction_version: REDACTION_VERSION };
  delete body.manifest_digest;
  return { ...body, manifest_digest: digestCanonical(body) };
}

export function verifyManifest(manifest) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(manifest ?? {}, field)) {
      errors.push(`missing required field: ${field}`);
    }
  }
  if (!manifest?.manifest_digest) {
    errors.push("missing required field: manifest_digest");
    return { valid: false, errors };
  }
  const { manifest_digest, ...body } = manifest;
  if (errors.length === 0 && manifest_digest !== digestCanonical(body)) {
    errors.push(
      "manifest_digest mismatch: evidence was modified after sealing",
    );
  }
  if (containsSecret(manifest)) {
    errors.push("manifest contains secret-shaped content");
  }
  return { valid: errors.length === 0, errors };
}

/** Correlation key set an auditor can replay a lifecycle from. */
export function correlationKeys(manifest) {
  return {
    task_id: manifest.task_id,
    contract_digest: manifest.contract_digest,
    run_id: manifest.run_id,
    lease_event_digests: manifest.lease_event_digests,
    head_sha: manifest.head_sha,
    diff_digest: manifest.diff_digest,
    approval_ids: manifest.approval_ids,
    manifest_digest: manifest.manifest_digest,
  };
}
