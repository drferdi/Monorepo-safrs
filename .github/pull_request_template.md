## Objective
<!-- What problem does this PR solve? -->

## Scope
<!-- Paths/modules intentionally changed. -->

## SAFRS risk tier
- [ ] R0 — read-only/no mutation (normally no PR)
- [ ] R1 — reversible local change
- [ ] R2 — boundary-affecting / sensitive / governance or verification change
- [ ] R3 — high-impact; explicit human authorization required before execution

## Task binding
<!-- SAFRS automation lifecycle references; leave a field blank only if it does not exist yet. -->
- Task ID: <!-- TASK-YYYYMMDD-... -->
- Contract digest: <!-- sha256 of the canonical TaskContractV1, if compiled -->
- Lease: <!-- lease_id + fencing token, or "local-only (pre-remote-authority)" -->
- Evidence: <!-- evidence manifest/artifact reference, if produced -->

## Verification
<!-- Commands/tests run and outcomes. -->

## Sensitive / governance changes
- [ ] Auth/authz/security
- [ ] Migration/data model
- [ ] Dependency/lockfile
- [ ] CI/CD
- [ ] AGENTS/SAFRS/governance
- [ ] Architecture boundary/shared API
- [ ] Production/safety-critical surface
- [ ] None

## Verification integrity
- [ ] This PR changes implementation and its governing tests/gates together; independent review requested.
- [ ] Not applicable.

## Documentation / decisions
<!-- Canonical docs/ADR/plan updated if behavior or architecture changed. -->

## Human authorization
<!-- Required for R3 execution; include approver/evidence reference, never credentials. -->
