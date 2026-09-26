# Standards Applicability Matrix

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Map relevant 2026 international-standard expectations to the current Sentra MANTRA repository evidence and gaps.

## Matrix

| Standard / framework | Applicability | Current evidence | Gap / action |
|---|---|---|---|
| ISO 9001 quality principles | Applicable to software delivery governance | ADRs, progress docs, boundary scripts, this QMS scaffold | Add formal review/approval log for controlled documents. |
| ISO 13485-style design controls | Partially applicable if system supports clinical workflows; not claiming medical-device certification | Workspace spec, clinical workspace code, risk scaffold | Decide regulatory classification; maintain design inputs/outputs and validation evidence. |
| IEC 62304 software lifecycle principles | Applicable as lifecycle discipline for healthcare software | App boundaries, custom app scaffold, patches, bench commands | Add software safety classification and per-release SOUP/dependency evaluation. |
| ISO 14971 risk management | Applicable for patient-safety and operational risks | Clinical-safety risk plan scaffold | Create actual risk records for each clinical workflow and integration. |
| IEC 62366 usability engineering | Applicable for clinical and operational UI | `docs/SENTRA MANTRA.md`, workspace Custom HTML Blocks | Add critical-task usability evaluation and accessibility testing evidence. |
| ISO/IEC 27001:2022 / 27002:2022 | Applicable for security management | Secrets ADR, devcontainer isolation, Frappe permission checks in workspace endpoints | Create access-control matrix, vulnerability management procedure, audit logging review. |
| ISO/IEC 27005:2022 | Applicable for information-security risk | Security plan scaffold | Maintain security risk register with risk owners and treatment. |
| ISO 27799 health information security | Applicable because project is healthcare/PHI-adjacent | CLAUDE.md warns not to log PHI/secrets | Add PHI data inventory, retention, backup encryption, audit log review. |
| Indonesia UU PDP | Applicable when processing personal data | Privacy scaffold, no-real-patient-data phase notes | Add data-subject request procedure, retention schedule, breach workflow, consent/legal basis matrix. |
| HL7 FHIR / SATUSEHAT | Future applicable for integrations | ADR assigns SATUSEHAT to `sentra_mantra_integrations` | Add interface control document before implementation. |
| BPJS integration requirements | Future applicable for eligibility/SEP/queue integrations | ADR assigns BPJS API clients to `sentra_mantra_integrations` | Add credential, retry, reconciliation, and audit requirements before Tahap 7. |
| OWASP ASVS / Top 10 | Applicable to web/API and future portal | Frappe permission checks in `ws_common.can`; no direct generic DocType REST for portal per ADR | Add secure coding checklist and security tests. |
| WCAG 2.2 AA | Applicable to user-facing Desk/portal UI | Workspace spec mentions laptop width; custom UI blocks exist | Add accessibility acceptance criteria and manual/automated checks. |
| Supply-chain/SBOM practices | Applicable to Frappe/Python/Node dependencies | `sites/apps.json` pins app versions/commits; pyproject files exist | Generate SBOM before staging/production; define dependency review cadence. |

## Validity statement

This matrix is valid as a baseline scaffold on 2026-07-16 and grounded in the repository files reviewed. It does not certify compliance. It identifies documentation and control artifacts needed to move toward compliance.
