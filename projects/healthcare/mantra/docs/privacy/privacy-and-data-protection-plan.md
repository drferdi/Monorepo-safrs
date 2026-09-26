# Privacy and Data Protection Plan

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Define privacy and data-protection controls for Sentra MANTRA, aligned with healthcare privacy expectations, ISO 27799-style health information controls, ISO/IEC 27001:2022 security governance, and Indonesia UU PDP principles.

## Data categories

| Category | Examples in current/future system | Handling rule |
|---|---|---|
| Identity data | User full name, email, Employee ID, NIK | Minimum necessary display; no logs/screenshots unless approved. |
| Employment data | Department, designation, leave, attendance, shifts | Role-based access; HR confidentiality. |
| Healthcare data | Patient, appointment, encounter, practitioner, STR/SIP | PHI controls, auditability, least privilege. |
| Financial data | Sales Invoice, Payment Entry, Journal Entry, Purchase Order | Role-based access; no unauthorized aggregation. |
| Secrets | DB passwords, encryption key, future API credentials | Never print/log; use `.env` only for dev; KMS/Vault before production. |

## Current privacy-sensitive files to avoid reading/logging

- `.env`
- `sites/*/site_config.json`
- `logs/*`
- `sites/*/private/*`
- Real employee import XLSX at `/tmp/daftar_pegawai.xlsx`

## Privacy principles

1. Data minimization.
2. Purpose limitation.
3. Role-based access.
4. Auditability.
5. Secure retention and deletion.
6. No PHI/PII in source control.
7. No PHI/PII in AI prompts, screenshots, logs, or public documentation unless explicitly anonymized and approved.

## Data-subject rights scaffold

Before real patient data:

- Define request intake channel.
- Define identity verification process.
- Define response SLA.
- Define export format.
- Define correction workflow.
- Define deletion/restriction workflow where legally permitted.
- Define exception handling for medical/legal retention obligations.

## Breach/incident workflow scaffold

1. Detect and triage.
2. Preserve evidence without spreading PHI/secrets.
3. Contain access or system path.
4. Assess impacted data categories and subjects.
5. Notify internal owner and legal/regulatory owner.
6. Notify external parties if legally required.
7. Remediate root cause.
8. Record incident and lessons learned.

## Current status

Policy scaffold exists. Full compliance requires a data inventory, access-control matrix, retention schedule, breach drill, and approved operating procedure before real patient data is processed.
