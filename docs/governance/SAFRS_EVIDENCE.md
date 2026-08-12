# SAFRS Evidence — Canonical Rules

Evidence uses `EvidenceManifestV1`
(`.safrs/schemas/evidence-manifest.v1.schema.json`): one content-addressed
manifest per run correlating

`task_id → contract_digest → lease chain → run/attempts → PR head/diff →
check verdicts → approvals → publication or execution → recovery →
artifact hashes → manifest_digest`.

## Requirements

- **Content-addressed.** Every artifact is referenced by SHA-256; the
  manifest digest covers the manifest minus its own digest field, in
  canonical JSON.
- **Redacted before written.** Evidence stores command identifiers,
  normalized redacted arguments, exit status, durations, and hashes. It
  never stores secrets, raw prompts, full environment dumps, production
  payloads, or unbounded tool output. `redaction_version` records which
  redaction rules produced the artifact.
- **Durable before terminal.** A run may not reach a terminal state until
  its evidence is durably written; evidence-write failure is an
  operational failure that forces the recovery path, never silent loss.
- **Reconstructable.** From evidence alone, an auditor must be able to
  replay what was requested, granted, attempted, verified, approved,
  published, or executed — without access to any agent session.

## Retention

Per `.safrs/automation-policy.json` (`evidence.retention_days`). R3
approval, execution, rollback, and incident evidence follow the retention
period Chief selects in Activation Decision 3.
