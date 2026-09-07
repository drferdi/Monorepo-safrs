# Governance

**Canonical:** `SAFRS_SPEC.md`, `.safrs/policy.json`, `docs/governance/`.

This wiki summarizes. Policy JSON and the spec are authoritative.

## Pages

- [Risk model (R0–R3)](risk-model.md)
- [Roles and permissions](roles.md)
- [Capsule sovereignty](capsule-sovereignty.md)
- [Multi-agent protocol](multi-agent.md)
- [Document lifecycle](document-lifecycle.md)
- [Sensitive paths](sensitive-paths.md)
- [Verification integrity](verification-integrity.md)

Cross-cutting feature pages (kept for Control Center catalog paths):

- [SAFRS governance](../features/safrs-governance.md)
- [Automation control plane](../features/automation-control-plane.md)

## Policy snapshot

From `.safrs/policy.json`:

- Operating model: `human-governed-agent-executed-machine-enforced`
- Default risk: `R1`
- Capsule root: `projects`
- Shared packages: `packages`
- Tools: `tools`
- Verification command: `bash scripts/safrs-verify.sh` (Windows: `scripts/safrs-verify.ps1`)

Forbidden by default: read production secrets, write production data, direct production deploy, self-authorize R3, disable governance to pass, transmit repository data to an unapproved endpoint.

## Related

- [Verification](../verification/index.md)
- [How to contribute](../how-to-contribute/index.md)
