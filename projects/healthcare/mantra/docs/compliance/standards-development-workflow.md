# Sentra MANTRA Standards Workflow

Status: accepted baseline
Date: 2026-07-16
Scope: `apps/healthcare/mantra`

## Purpose

This workflow explains how to continue Sentra MANTRA development using the 2026 standards-aligned scaffold that was created for the project. It is designed for disciplined healthcare software development: every change must be traceable, reviewed, risk-aware, validated, and safe for future clinical/PHI use.

This workflow does not claim external certification. It defines the internal operating process required before the project can later pursue staging, production, audit, or regulatory review.

---

## Workflow summary

```text
1. Understand the current system
   -> 2. Classify the change
   -> 3. Confirm app boundary
   -> 4. Update requirements and design docs
   -> 5. Assess risk, privacy, security, and clinical safety
   -> 6. Implement only in the correct custom app
   -> 7. Verify with tests, boundary checks, and validation records
   -> 8. Review compliance gaps and release readiness
   -> 9. Record evidence and close the change
```

---

## 1. Understand the current system first

Before changing code, review the current source of truth:

- `CLAUDE.md`
- `docs/compliance/README.md`
- `docs/compliance/project-scaffold-plan.md`
- `docs/architecture/system-architecture-and-data-flow.md`
- `docs/adr/0000-app-boundaries-frontend-stack-version-baseline.md`
- `docs/adr/0001-custom-app-boundaries.md`
- `docs/adr/0002-secrets-management.md`
- `docs/SENTRA MANTRA.md`
- `sites/apps.txt`
- `sites/apps.json`

Do not use these files as onboarding evidence:

- `.env`
- `sites/*/site_config.json`
- `logs/*`
- `sites/*/private/*`
- `env/*`
- generated caches or build artifacts

Reason: those locations may contain secrets, PHI/PII, runtime-only data, or generated state.

---

## 2. Classify the change

Every task must be classified before implementation.

| Change type | Examples | Required documents |
|---|---|---|
| Architecture | App boundary, frontend stack, integration pattern | ADR + traceability update |
| Clinical workflow | Patient, appointment, encounter, practitioner schedule | Risk record + validation record + traceability update |
| HR workflow | Employee, leave, attendance, shift, payroll | Traceability + validation record + privacy review |
| Finance workflow | Invoice, payment, journal, purchase order | Traceability + validation record + permission/security review |
| Security/privacy | Auth, roles, secrets, PHI/PII, logs | Security/privacy plan update + gap register if incomplete |
| Integration | SATUSEHAT, BPJS, FHIR, external API | ADR/ICD + risk record + validation plan + secrets review |
| UI/workspace | Frappe Desk blocks, `/me`, portal | Traceability + accessibility/usability validation |
| Operations | backup, restore, deployment, monitoring | Operational readiness update + validation evidence |

If a change touches more than one class, apply all required controls.

---

## 3. Confirm custom app boundary

Use the ADR-defined boundaries:

| App | Responsibility |
|---|---|
| `sentra_mantra_core` | Shared cross-cutting utilities, navigation, branding, organization positions, reusable frameworks. |
| `sentra_mantra_hospital` | Hospital/clinical extensions to Marley Healthcare. |
| `sentra_mantra_indonesia` | Indonesian localization, BPJS/KFA/business rules, current RSIA workspace blocks, HR local setup. |
| `sentra_mantra_integrations` | SATUSEHAT/BPJS API clients, outbox/retry/reconciliation, external credentials. |
| `sentra_mantra_portal` | Future portal/frontend/BFF boundary. |

Rules:

1. Never modify upstream apps directly: `frappe`, `erpnext`, `hrms`, `healthcare`.
2. Put logic in the most specific matching custom app.
3. If boundary is unclear, update an ADR before implementing.
4. Cross-app imports must follow `docs/adr/0001-custom-app-boundaries.md`.
5. Run boundary check before closing work:

```bash
python scripts/check_app_boundaries.py
```

---

## 4. Update requirements and design evidence

For every meaningful change, update:

- `docs/compliance/requirements-traceability-matrix.md`

Add or update:

- Requirement ID.
- Requirement description.
- Source.
- Implementation evidence.
- Verification evidence/status.

If the change affects architecture or app responsibility, create an ADR using:

- `docs/compliance/templates/adr-template.md`

Store final ADRs in:

- `docs/adr/`

---

## 5. Assess risk, privacy, security, and clinical safety

### Clinical-safety review

Required if the change affects:

- Patient identity.
- Appointment state.
- Encounter state.
- Practitioner schedules.
- Clinical documentation.
- Clinical integrations.
- Any workflow where wrong/stale data can affect care.

Use:

- `docs/clinical-safety/clinical-safety-risk-management-plan.md`
- `docs/compliance/templates/risk-record-template.md`

### Privacy review

Required if the change reads, writes, displays, imports, exports, logs, or transmits:

- patient data,
- employee data,
- NIK,
- STR/SIP,
- contact data,
- clinical data,
- financial patient-linked data.

Use:

- `docs/privacy/privacy-and-data-protection-plan.md`

### Security review

Required if the change adds or modifies:

- whitelisted method,
- API endpoint,
- permission logic,
- role access,
- credentials,
- external services,
- deployment/runtime config.

Use:

- `docs/security/security-management-plan.md`

Hard rules:

1. No secret literal on command line.
2. No secrets in documentation, logs, or screenshots.
3. Future credential DocType fields must use Frappe `Password` fields.
4. No `ignore_permissions` in user-facing data APIs unless formally justified and reviewed.
5. Do not log PHI/PII.

---

## 6. Implement the change

Implementation rules:

1. Work inside the dev container for bench commands.
2. Use Frappe patches for schema/data migrations that must be reproducible.
3. Use idempotent setup functions for repeatable workspace/config setup.
4. Keep UI data endpoints permission-aware.
5. Keep empty/error states safe and user-friendly.
6. Avoid modifying generated folders or upstream app code.

Common commands:

```bash
bench start
bench --site mantra.localhost migrate
bench --site mantra.localhost list-apps
bench build
bench --site mantra.localhost run-tests --app sentra_mantra_indonesia
python scripts/check_app_boundaries.py
```

---

## 7. Verify and validate

Use:

- `docs/validation/verification-validation-plan.md`
- `docs/compliance/templates/validation-record-template.md`

Minimum verification checklist:

- Boundary check passes.
- Relevant Frappe tests pass.
- Feature works for authorized users.
- Feature fails safely for unauthorized users.
- No tracebacks shown to end users.
- No PHI/PII/secrets in command output, logs, docs, screenshots.
- Empty states render correctly.
- Setup/migration is reproducible.
- Requirement traceability row is updated.
- Risk/compliance gap is updated if anything remains incomplete.

Recommended validation record location when executed records begin:

```text
docs/validation/records/
```

Recommended clinical risk record location:

```text
docs/clinical-safety/records/
```

---

## 8. Review compliance gaps and readiness

Before marking a task complete, review:

- `docs/compliance/compliance-gap-register.md`
- `docs/compliance/standards-applicability-matrix.md`
- `docs/operations/operational-readiness-plan.md`

If the change exposes a missing control, add it to the gap register with:

- Gap ID.
- Description.
- Severity.
- Required-before phase.
- Owner.
- Closure evidence.

Do not claim production readiness while high-severity mandatory gaps remain open.

---

## 9. Close the change with evidence

A change is complete only when evidence exists.

Required closure evidence:

- Files changed.
- Tests/checks run.
- Boundary check result.
- Requirement traceability update.
- Risk/security/privacy/validation updates, if applicable.
- Known gaps added to the gap register.

Suggested final task note format:

```text
Implemented: <short summary>
Files changed: <paths>
Checks run: <commands + result>
Docs updated: <paths>
Open gaps: <gap IDs or none>
Compliance status: scaffold/pre-production/staging-ready/etc.
```

---

## Stage gates

### Development gate

Allowed now if:

- No real patient data.
- Dev container is used.
- Secret rules are followed.
- Boundary checks pass.

### Staging gate

Required before staging:

- SOPS + age or equivalent staging secrets process.
- Backup/restore evidence.
- Access-control matrix.
- Validation records for enabled workflows.
- Security/privacy gap review.

### Production / real patient data gate

Required before production or real PHI use:

- KMS/Vault-equivalent production secrets manager.
- Clinical-safety risk acceptance.
- Privacy procedure and breach workflow.
- Incident response drill.
- Backup/restore and disaster recovery evidence.
- Audit logging and retention review.
- Role/access-control sign-off.
- SBOM/dependency review.
- Regulatory classification decision.

---

## Current baseline status

As of 2026-07-16:

- Standards documentation scaffold exists.
- Architecture and app boundaries are documented.
- Boundary script passes for current custom app files.
- Sensitive files are identified and excluded from onboarding evidence.
- The project is suitable for controlled pre-production development.
- The project is not yet production-certified or ready for real patient data without closing the documented gaps.
