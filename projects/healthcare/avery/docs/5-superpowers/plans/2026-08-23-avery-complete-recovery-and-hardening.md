# Avery Complete Recovery and Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the Avery capsule deterministic, safe to reconcile, and able to prepare a single approval-bound native Hermes outbound delivery without touching a live runtime.

**Architecture:** The repository owns only Avery persona-adjacent assets, a manifest-defined custom skill set, deterministic local scripts, and a small standard-library Python broker. Runtime state remains outside Git under `HERMES_HOME`; a human performs final cutover and live verification. The broker persists only metadata and draft hashes, then delegates the actual delivery to the native `hermes -p avery send` command.

**Tech Stack:** PowerShell 7-compatible scripts, Python 3.11+ standard library, `unittest`, JSON/JSONL, Git.

**Spec:** Approved Avery complete-recovery and hardening specification dated 2026-08-23.

## Global Constraints

- No live WhatsApp send, runtime restart, installer, junction switch, credential/session read, or allowlist mutation.
- Keep runtime data only beneath `HERMES_HOME`; never version it.
- Outbound accepts exactly one concrete WhatsApp target, one immutable draft hash, explicit approval, one send attempt, and a 15-minute approval expiry.
- The canonical test command is `pwsh -NoProfile -File projects/healthcare/avery/scripts/test.ps1` and uses standard-library `unittest` only.
- The repository keeps exactly the 18 manifest-listed Avery custom skill trees; managed/bundled payloads are excluded.

### Task 1: Establish contract tests and the test runner

**Files:** `tests/test_*.py`, `tests/fixtures/cron-agent-outbound.json`, `scripts/test.ps1`.

- [x] Write behavior tests for broker policy, profile sync, member snapshots, and PowerShell dry-runs.
- [x] Run the test command before implementation and observe import/contract failures.
- [x] Implement only enough code for each failing test and rerun until green.

### Task 2: Canonical profile ownership and reconciliation

**Files:** `ai/profiles/avery/custom-skills.json`, `scripts/sync-*.ps1`, `ai/profiles/avery/skills/`.

- [x] Define the exact manifest and preserve only its named skill trees.
- [x] Reconcile only `SOUL.md` and manifest-listed skills with backup, hash verification, and sensitive-content rejection.
- [x] Verify `-WhatIf` does not mutate a temporary profile.

### Task 3: Approval-bound outbound broker

**Files:** `src/avery_outbound/{models,store,policy,sender,cli}.py`.

- [x] Create tests for target validation, hash binding, expiry, cancellation, single-use delivery, and native command mapping.
- [x] Implement atomic pending/ledger persistence without bodies, secrets, or credentials.
- [x] Verify native command construction without executing Hermes.

### Task 4: Membership and Windows recovery tools

**Files:** `scripts/member_watch.py`, `scripts/restart-gateway.ps1`, `scripts/health-check.ps1`, `scripts/restore-native-runtime-layout.ps1`, `scripts/verify-runtime-junctions.ps1`, `scripts/restart-gateway.bat`.

- [x] Implement snapshot comparison with empty first/no-change output and candidate-only new-member reports.
- [x] Implement dry-run restart and layout recovery with fail-closed path checks.
- [x] Verify health emits sanitized JSON and well-defined exit codes.

### Task 5: Documentation and review gates

**Files:** capsule docs, configuration templates, `.gitignore`, `CHANGELOG.md`, `.agents/HANDOFF.md`.

- [x] Record target versus verified repository behavior without asserting live cutover, elapsed monitoring, repository visibility, or MAESTRO operation.
- [x] Replace sensitive incident material with a sanitized baseline.
- [x] Run unit tests, SAFRS verification, diff checks, ownership scans, and sensitive-pattern scans before focused commits.

## Execution Gates

1. **Repository gate:** all contract tests, SAFRS checks, and diff scans pass with no sensitive runtime data.
2. **Human cutover gate:** Chief reviews the exact profile diff and manually applies it to the intended runtime.
3. **Single-recipient E2E gate:** Chief supplies a non-production test recipient and explicitly approves one generated request; native Hermes receipt is read back.
4. **Monitoring gate:** retain seven days of sanitized operational evidence before any maturity claim.
