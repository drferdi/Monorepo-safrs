# Sentra MANTRA 2026 Standards Documentation Index

Status: scaffold baseline
Date: 2026-07-16
Scope: `apps/healthcare/mantra` Frappe Bench for Sentra MANTRA / RSIA Melinda

## Compliance position

This repository is a pre-production healthcare information system built on Frappe Framework v15, ERPNext v15, HRMS v15, and Marley Healthcare v15. The documents in this folder are a standards-aligned documentation scaffold for engineering and governance. They are not a legal certification, regulatory clearance, or external audit attestation.

## Standards and frameworks mapped

| Area | 2026-aligned reference set | Project use |
|---|---|---|
| Quality management | ISO 9001:2015 principles; ISO 13485:2016-style design-control discipline where software may affect clinical workflows | Quality plan, controlled documentation, change control, traceability |
| Software lifecycle | IEC 62304:2006 + A1:2015 principles; ISO/IEC/IEEE 12207 lifecycle concepts | Requirements, architecture, implementation, verification, release records |
| Risk management | ISO 14971:2019; IEC 62366-1:2015+A1:2020 usability engineering concepts | Clinical-safety hazards, risk controls, usability risks |
| Health informatics privacy/security | ISO 27799:2016; ISO/IEC 27001:2022 and 27002:2022; ISO/IEC 27005:2022 | ISMS-lite controls, access control, logging, backup, incident response |
| Privacy | Indonesia UU PDP principles; GDPR-inspired data-subject-rights pattern where applicable | PHI/PII handling, consent/data-subject workflows, retention |
| Health data interoperability | HL7 FHIR R4/R5 awareness; SATUSEHAT integration constraints; BPJS integration constraints | Future integrations boundary in `sentra_mantra_integrations` |
| Usability/accessibility | WCAG 2.2 AA; IEC 62366-style critical-task analysis | Desk/portal usability and accessibility acceptance criteria |
| Secure development | OWASP ASVS 5.x principles where applicable; OWASP Top 10; SBOM/SLSA-style supply-chain hygiene | Secure coding, dependency review, secret handling, release gates |

## Document set created

- `docs/quality/quality-management-plan.md` — QMS-lite plan and quality gates.
- `docs/compliance/standards-applicability-matrix.md` — Standard-by-standard applicability and evidence mapping.
- `docs/compliance/document-control-procedure.md` — Document lifecycle, ownership, status, review, and change-control procedure.
- `docs/compliance/requirements-traceability-matrix.md` — Initial requirements-to-evidence matrix grounded in current files.
- `docs/clinical-safety/clinical-safety-risk-management-plan.md` — Clinical-safety and patient-safety risk workflow.
- `docs/privacy/privacy-and-data-protection-plan.md` — PHI/PII handling, data-subject rights, retention, and privacy controls.
- `docs/security/security-management-plan.md` — Security controls and secure development requirements.
- `docs/validation/verification-validation-plan.md` — Verification/validation plan for Frappe custom apps and workflows.
- `docs/operations/operational-readiness-plan.md` — Backup, restore, monitoring, startup, and support readiness.
- `docs/architecture/system-architecture-and-data-flow.md` — Current architecture and data-flow summary.
- `docs/compliance/compliance-gap-register.md` — Known gaps and closure plan.
- `docs/compliance/templates/adr-template.md` — ADR template.
- `docs/compliance/templates/change-request-template.md` — Change request template.
- `docs/compliance/templates/risk-record-template.md` — Risk record template.
- `docs/compliance/templates/validation-record-template.md` — Validation record template.

## Current repository evidence reviewed

- `CLAUDE.md`
- `Procfile`
- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.yml`
- `sites/apps.txt`
- `sites/apps.json`
- `sites/common_site_config.json`
- `docs/SENTRA MANTRA.md`
- `docs/adr/0000-app-boundaries-frontend-stack-version-baseline.md`
- `docs/adr/0001-custom-app-boundaries.md`
- `docs/adr/0002-secrets-management.md`
- `scripts/check_app_boundaries.py`
- `scripts/install_boundary_hooks.py`
- Sentra custom app files under `apps/sentra_mantra_*`

Sensitive files intentionally not used as evidence content: `.env`, `sites/*/site_config.json`, logs, and private site files.

## Usage rule

Every new feature should update, at minimum:

1. Requirements traceability matrix.
2. Risk register / clinical-safety risk record if patient care, finance, identity, or integration behavior changes.
3. Verification/validation record.
4. ADR if architecture or app-boundary decisions change.
5. Compliance gap register if a required control remains incomplete.
