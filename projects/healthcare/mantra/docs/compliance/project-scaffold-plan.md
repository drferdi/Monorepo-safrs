# Project Scaffold Plan

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Define the standards-aligned project scaffold for Sentra MANTRA development. This document describes the expected folder/document/code structure and the rules for extending it.

## Current scaffold

```text
apps/healthcare/mantra/
  apps/
    frappe/                      upstream framework, do not modify directly
    erpnext/                     upstream ERP, do not modify directly
    hrms/                        upstream HRMS, do not modify directly
    healthcare/                  upstream Marley Healthcare, do not modify directly
    sentra_mantra_core/          shared cross-cutting Sentra logic
    sentra_mantra_hospital/      hospital/clinical extensions
    sentra_mantra_indonesia/     Indonesia localization and current workspace blocks
    sentra_mantra_integrations/  future SATUSEHAT/BPJS adapters
    sentra_mantra_portal/        future portal/frontend/BFF boundary
  docs/
    adr/                         architecture decision records
    architecture/                system architecture and data flow
    clinical-safety/             patient-safety risk management
    compliance/                  standards mapping, document control, traceability, gaps, templates
    operations/                  runbooks and readiness controls
    privacy/                     privacy and data-protection controls
    quality/                     quality-management controls
    security/                    security-management controls
    validation/                  verification and validation controls
  scripts/                       governance automation
  sites/                         Frappe site config and generated site artifacts
  .devcontainer/                 Docker development environment
  Procfile                       bench process entrypoint list
```

## Required scaffold rules

1. New business logic goes into the most specific custom app that owns the domain.
2. Upstream app source is inspection-only unless a separate fork/patch strategy is formally approved.
3. Schema/setup changes must be versioned patches or idempotent setup functions.
4. Every new endpoint must have permission behavior reviewed.
5. Every clinical, privacy, security, finance, identity, or integration change must update traceability, risk, and validation records.
6. Every architecture boundary change must update or add an ADR.
7. Generated files, logs, secrets, PHI, PII, and private site files are excluded from onboarding and documentation evidence.

## Recommended next scaffold additions

- `docs/validation/records/` for executed validation records.
- `docs/clinical-safety/records/` for executed safety risk records.
- `docs/security/risk-register.md` for information-security risk tracking.
- `docs/privacy/data-inventory.md` for PHI/PII data inventory.
- `docs/operations/backup-restore-runbook.md` for concrete backup/restore commands using environment-variable secrets.
- CI or local command wrapper that runs boundary checks, tests, and secret scanning.

## Current compliance position

The scaffold is now structurally aligned with 2026 healthcare software governance expectations. It is not yet externally certified or production-complete; execution records and approvals are still required.
