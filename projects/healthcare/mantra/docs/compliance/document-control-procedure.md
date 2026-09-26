# Document Control Procedure

Status: scaffold baseline
Date: 2026-07-16

## Controlled document locations

- `docs/adr/` — architectural decisions.
- `docs/compliance/` — standards mapping, document control, traceability, gap register.
- `docs/quality/` — quality management plans and procedures.
- `docs/security/` — security management and secure development procedures.
- `docs/privacy/` — privacy and data-protection procedures.
- `docs/clinical-safety/` — clinical-safety risk management.
- `docs/validation/` — verification and validation plans/records.
- `docs/operations/` — operational readiness, backup/restore, runbooks.
- `docs/architecture/` — current and target architecture descriptions.

## Required metadata

Every controlled document must include:

- Title.
- Status: draft, scaffold baseline, accepted, superseded, retired.
- Date.
- Scope.
- Owner or responsible role when known.

## Change process

1. Identify affected controlled documents during design or implementation.
2. Update the document in the same change as the code or configuration change.
3. If the change alters architecture or app boundaries, add or update an ADR.
4. If the change affects patient safety, privacy, security, finance posting, identity, permissions, or external integrations, update traceability, risk, and validation records.
5. Reviewer confirms document update before approval.

## Review cadence

- Compliance index and applicability matrix: every major phase or at least quarterly during active development.
- Security/privacy documents: before staging, before production, and after incidents.
- Clinical-safety risk documents: before enabling real clinical workflow use.
- Operational readiness: before every deployment environment change.

## Document states

- Draft: incomplete and not approved.
- Scaffold baseline: structurally valid but requires project-specific execution evidence.
- Accepted: approved for current phase.
- Superseded: replaced by newer document.
- Retired: no longer applicable.

## Records retention

Do not delete historical ADRs, validation records, risk records, or release records. Supersede them with new documents or append dated entries.
