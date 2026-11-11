# Requirements Traceability Matrix

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Track requirements from source to implementation and verification evidence. This initial matrix is grounded in current repository files.

| ID | Requirement | Source | Implementation evidence | Verification evidence / status |
|---|---|---|---|---|
| REQ-ARCH-001 | Do not modify upstream apps directly; Sentra-specific logic must live in custom apps. | `CLAUDE.md`, ADR-0000, ADR-0001 | `apps/sentra_mantra_*`; `scripts/check_app_boundaries.py` | Boundary script exists; run result should be recorded per change. |
| REQ-ARCH-002 | Maintain five main workspaces: Home, Pasien & Klinik, SDM, Keuangan, Pengaturan. | `docs/SENTRA MANTRA.md`, `workspace_nav.py` | `sentra_mantra_core.workspace_nav.WORKSPACES` | Execute `workspace_nav.build`; verify Desk workspace order/visibility. |
| REQ-UI-001 | Home must show profile, current tasks, quick actions, and recent activity without noisy zero rows. | `docs/SENTRA MANTRA.md` | `home_profile.py`, `home_today.py` | Manual Desk validation; add automated permission/data tests. |
| REQ-UI-002 | Clinical workspace must show patient/appointment/encounter/practitioner operational summary. | `docs/SENTRA MANTRA.md` | `ws_klinik.py` | Manual Desk validation; add tests for permissions and empty states. |
| REQ-UI-003 | HR workspace must show employee, leave, attendance, shift summary and payroll preparation note. | `docs/SENTRA MANTRA.md` | `ws_sdm.py`, `hr_setup.py` | `test_ws_permissions.py` exists; expand validation record. |
| REQ-UI-004 | Finance workspace must show invoices, payments, procurement, journals, approvals with permission checks. | `docs/SENTRA MANTRA.md` | `ws_keuangan.py`, `ws_common.can` | Permission tests required for finance aggregates. |
| REQ-SEC-001 | Never log or print secrets or site config contents. | `CLAUDE.md`, ADR-0002 | Policy documented | Needs secret scanning and review checklist. |
| REQ-SEC-002 | No secret literal on command line; use env var references. | ADR-0002 | Policy documented | Needs shell/runbook review before staging. |
| REQ-SEC-003 | Credential DocType fields must use Frappe `Password` field type. | ADR-0002 | No credential DocType implemented yet | Mandatory before SATUSEHAT/BPJS implementation. |
| REQ-HR-001 | Configure Indonesian leave types, 2026 holidays, leave policy, and shifts. | `hr_setup.py` docstring/code | `sentra_mantra_indonesia.hr_setup.setup` | Execute setup and record output; validate HRMS records. |
| REQ-HR-002 | Employee import must not print NIK/address and must use XLSX outside git. | `employee_import.py` | `/tmp/daftar_pegawai.xlsx` path; aggregate outputs | Dry-run/run records required; verify no PII in logs. |
| REQ-PRIV-001 | PHI/PII must not be committed, logged, or included in screenshots/docs. | `CLAUDE.md`, ADR-0002 | Policy notes | Add privacy review checklist before real data. |
| REQ-INT-001 | SATUSEHAT/BPJS integrations must live in `sentra_mantra_integrations` and not become system of record. | ADR-0000, ADR-0001 | App scaffold exists | Interface control document and outbox/retry design needed before implementation. |
| REQ-PORTAL-001 | Future portal frontend uses Vue 3 + Vite + TailwindCSS + Frappe UI through BFF/API contract, not generic DocType REST. | ADR-0000 | `sentra_mantra_portal` scaffold exists | Validate when Tahap 8 frontend is scaffolded. |

## Update rule

Add a row for every meaningful feature, control, data migration, integration, security/privacy requirement, or operational requirement. Link verification evidence when tests or validation records are created.
