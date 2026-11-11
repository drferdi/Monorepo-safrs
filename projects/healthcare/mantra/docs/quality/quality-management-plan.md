# Quality Management Plan

Status: scaffold baseline
Date: 2026-07-16
System: Sentra MANTRA Frappe Bench

## Purpose

Define the quality-management approach for Sentra MANTRA development in this repository. This plan applies a lightweight, auditable quality system suitable for a pre-production healthcare information system and prepares the project for stricter regulated operation before real patient data and external healthcare integrations are introduced.

## Scope

In scope:

- Custom Sentra apps: `sentra_mantra_core`, `sentra_mantra_hospital`, `sentra_mantra_indonesia`, `sentra_mantra_integrations`, `sentra_mantra_portal`.
- Bench configuration, documentation, setup scripts, and operational procedures.
- Frappe Desk custom workspaces and Custom HTML Blocks.
- Future SATUSEHAT/BPJS and portal work as documented boundaries.

Out of scope for direct modification:

- Upstream apps: `frappe`, `erpnext`, `hrms`, `healthcare`.
- Generated runtime folders: `env/`, `logs/`, `sites/assets/`, caches.

## Quality objectives

1. Preserve patient safety and operational continuity.
2. Maintain clear app boundaries and avoid direct upstream modifications.
3. Ensure every clinical, HR, finance, privacy, and integration change is traceable from requirement to verification evidence.
4. Avoid handling secrets, PHI, or PII in logs, documentation, shell history, or generated reports.
5. Maintain reproducible setup through migrations, patches, and documented bench commands.

## Roles

| Role | Responsibility |
|---|---|
| Product owner / clinical owner | Approves clinical workflow intent and safety-critical acceptance criteria. |
| Technical owner | Maintains architecture, app boundaries, security controls, and release readiness. |
| Developer | Implements changes in correct custom app, updates traceability and validation evidence. |
| Reviewer | Reviews code, documentation, security, privacy, and risk impacts before merge/release. |
| Operator | Runs bench, backup/restore, migration, monitoring, and incident procedures. |

## Controlled artifacts

Controlled artifacts include:

- ADRs under `docs/adr/`.
- Compliance and quality documents under `docs/compliance/`, `docs/quality/`, `docs/security/`, `docs/privacy/`, `docs/clinical-safety/`, `docs/validation/`, `docs/operations/`, and `docs/architecture/`.
- Frappe patches under each custom app `patches/` folder.
- Bench operational files: `Procfile`, `.devcontainer/*`, `sites/apps.txt`, `sites/apps.json`, `sites/common_site_config.json`.
- Boundary scripts under `scripts/`.

## Development quality gates

Before a change is considered ready:

1. Boundary check passes: `python scripts/check_app_boundaries.py`.
2. The change avoids direct edits to upstream apps unless explicitly documented as a temporary inspection-only local change, then reverted.
3. Relevant tests pass, such as `bench --site mantra.localhost run-tests --app <custom_app>` when tests exist.
4. Any DocType schema or setup behavior is implemented as a versioned patch or idempotent setup function, not as undocumented console state.
5. Requirements, risk, and validation records are updated when behavior changes.
6. No secret, PHI, or PII is introduced into commits, logs, documentation, or screenshots.

## Release readiness gates

Before staging:

- SOPS + age or equivalent staging secret handling exists outside the app repo.
- Backup/restore procedure has been executed and recorded.
- Requirements traceability matrix has no high-priority undocumented requirement.
- Security and privacy gap register items marked mandatory-before-staging are closed.

Before production / real patient data:

- Production secrets manager exists: Cloud KMS or Vault-equivalent.
- Formal access-control review is completed.
- Audit logging and retention policy are approved.
- Incident response and breach-notification workflow are approved.
- Clinical-safety risks are reviewed and accepted by the clinical owner.
- SATUSEHAT/BPJS credentials, if introduced, are stored only in Frappe `Password` fields or a production secrets manager.

## Nonconformance handling

A nonconformance is any deviation from documented architecture, security, privacy, safety, or validation procedure. Record it in `docs/compliance/compliance-gap-register.md` or a linked issue with:

- Description.
- Impact.
- Severity.
- Owner.
- Required closure evidence.
- Target closure phase.

## Current assessment

Current project is suitable for controlled pre-production development. It is not yet production-compliant for real patient data because secret management, privacy operating procedures, formal validation records, clinical-safety risk files, and production operational controls are scaffolded but not fully executed.
