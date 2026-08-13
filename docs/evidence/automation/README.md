# SAFRS Automation Evidence

Durable, content-addressed evidence for every automated change. Canonical
rules: `docs/governance/SAFRS_EVIDENCE.md`. Schema:
`.safrs/schemas/evidence-manifest.v1.schema.json`.

## Layout

| Path | Contents |
| --- | --- |
| `.safrs/evidence/<manifest-id>.json` | Sealed `EvidenceManifestV1` records |
| `.safrs/approvals/<approval-id>.json` | Sealed `ApprovalRecordV1` records |
| `.git/safrs-control-plane/lease-events.ndjson` | Append-only local lease chain (not published) |

Both published directories are classified as sensitive **and** as
verification controls in `.safrs/sensitive-paths.json`: editing evidence is
never routine work.

## Verifying evidence

```bash
node tools/automation/src/cli.mjs evidence verify .safrs/evidence/<file>.json
python tools/safrs/check_approval_evidence.py
node tools/automation/src/cli.mjs gate --all
```

`evidence verify` recomputes the manifest digest over the canonical body
(the manifest minus its own digest field) and rejects any manifest that
still carries secret-shaped content. The Python checker repeats both checks
independently, so a manifest sealed by Node must verify byte-identically in
Python — that cross-language agreement is itself a governance gate.

## Reading a manifest

Every manifest correlates one lifecycle end to end:

`task_id → contract_digest → lease event digests → run_id/attempt_ids →
base_sha/head_sha/diff_digest → check verdicts → approval_ids →
publication or execution → artifact hashes → manifest_digest`

`redaction_version` records which redaction rules produced the artifact.
Evidence stores command identifiers, redacted arguments, exit status,
durations, and hashes — never secrets, raw prompts, environment dumps, or
unbounded tool output.

## Retention

`.safrs/automation-policy.json` → `evidence.retention_days`. R3 approval,
execution, rollback, and incident evidence follow the retention period
selected in Activation Decision 3.
