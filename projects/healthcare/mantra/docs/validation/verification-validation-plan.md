# Verification and Validation Plan

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Define how Sentra MANTRA verifies implementation correctness and validates fitness for intended hospital workflows.

## Verification levels

| Level | Method | Examples |
|---|---|---|
| Static | Code review, boundary script, lint | `python scripts/check_app_boundaries.py`, Ruff configuration. |
| Unit | Frappe test runner | `bench --site mantra.localhost run-tests --app sentra_mantra_indonesia`. |
| Integration | Bench/site execution | Execute setup functions and verify resulting DocTypes/workspaces. |
| UI validation | Manual Desk validation and screenshots without PHI | Home, Pasien & Klinik, SDM, Keuangan workspaces. |
| Operational | Backup/restore, migration, startup/shutdown | `bench start`, `bench migrate`, restore drill. |
| Security/privacy | Permission tests, role review, secret scan | Workspace endpoints must not leak restricted data. |

## Required validation records

Use `docs/compliance/templates/validation-record-template.md` for:

- Workspace navigation build.
- Home profile block.
- Home “Hari Ini” block.
- Clinical workspace block.
- HR workspace block.
- Finance workspace block.
- HR setup.
- Employee import dry run/run/backfill.
- Backup/restore drill.
- Any integration with SATUSEHAT/BPJS.
- Any portal/BFF endpoint.

## Minimum acceptance criteria

- Feature works for authorized users.
- Feature fails safely or hides data for unauthorized users.
- No PHI/PII/secret leakage in UI errors, logs, command output, or docs.
- Data source and filters match the requirement.
- Empty states are understandable.
- Error states do not expose tracebacks to users.
- Migration/setup functions are idempotent or versioned.

## Current test evidence found

- `apps/sentra_mantra_indonesia/sentra_mantra_indonesia/tests/test_ws_permissions.py` exists and should be expanded/recorded.

## Current status

This plan is valid as a baseline. Full validation requires executed test runs, manual validation records, and sign-off evidence.
