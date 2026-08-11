# SAFRS Control Plane v1 Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Control Plane v1 coordinate one shared task registry across sibling Git worktrees and close the safety, recovery, CI, and verification gaps found by independent review.

**Architecture:** Store live task leases under the Git common directory so all local worktrees see one registry. Keep schema and behavior in repository code, serialize mutations with an exclusive lock, replace the registry atomically, and make governance verify both lease consistency and coverage of the current worktree's changed paths.

**Tech Stack:** Node.js ESM, Python 3.11+, Git CLI, Node test runner, unittest, PowerShell, Bash. No new dependency.

## Global Constraints

- Work only in `D:/DEV/Monorepo.worktrees/feat-safrs-control-plane-v1`.
- Do not modify the primary `D:/DEV/Monorepo` worktree.
- Use test-first development and observe every new regression test fail before production edits.
- The live registry is local runtime state under `git rev-parse --git-common-dir`; it is not committed.
- All registry writes use an exclusive lock, reread under lock, and same-directory atomic replace.
- R0 tasks cannot enter mutation-active states.
- Human status output is Bahasa Indonesia; stable JSON fields and values are English.
- No dependency, commit, push, PR, deployment, or GitHub setting mutation.

---

### Task 1: Shared Cross-Worktree Registry

**Files:**
- Create: `tools/task/src/storage.mjs`
- Modify: `tools/task/src/cli.mjs`
- Modify: `tools/status/src/cli.mjs`
- Modify: `tools/safrs/check_task_ownership.py`
- Delete: `.safrs/active-tasks.json`
- Test: `tests/repository/task-command.test.mjs`
- Test: `tests/governance/test_task_ownership.py`

**Interfaces:**
- Produces Node `resolveControlPlanePaths(repositoryRoot)`, `loadSharedRegistry(paths)`, and `mutateSharedRegistry(paths, transform)`.
- Produces Python `resolve_registry_path(root)` using `git rev-parse --git-common-dir`.
- Registry location: `<git-common-dir>/safrs-control-plane/active-tasks.json`.

- [x] Add a test that initializes one repository with two worktrees and proves a claim written from one is visible from the other.
- [x] Run the focused Node test and observe failure because each CLI currently resolves its own `.safrs/active-tasks.json`.
- [x] Implement shared path resolution through `git rev-parse --git-common-dir`.
- [x] Add tests proving an existing lock rejects a write and a successful write preserves existing tasks.
- [x] Implement exclusive `open(..., "wx")`, reread under lock, temp write, `rename`, and cleanup in `finally`.
- [x] Run focused Node and Python tests until green.

### Task 2: Strict Registry Safety and Recovery

**Files:**
- Modify: `tools/task/src/ownership.mjs`
- Modify: `tools/task/src/cli.mjs`
- Modify: `tools/safrs/check_task_ownership.py`
- Test: `tests/repository/task-command.test.mjs`
- Test: `tests/governance/test_task_ownership.py`

**Interfaces:**
- `validateRegistry(registry, context, { enforceOperational })` can validate schema for repair loading or enforce expiry/overlap for normal operations.
- `publicTask(task)` recursively redacts every serialized field.

- [x] Add failing tests for internal `.` aliases, an existing directory missing `/`, Windows case variants, invalid calendar timestamps, and mutation-active R0.
- [x] Canonicalize path segments, validate existing directory/file suffixes, compare conservatively case-insensitively, require valid `Z` timestamps, and reject R0 mutation-active combinations in Node and Python.
- [x] Add failing tests showing `close` can repair one expired or overlapping task without manual JSON edits.
- [x] Load structurally for close repair, then validate the prospective registry operationally before writing it.
- [x] Add failing tests for secret-like values in task fields and public output.
- [x] Reject obvious credential assignments before persistence and recursively redact all public output fields.
- [x] Run focused Node/Python tests until green.

### Task 3: Changed-Path Ownership and Status Correctness

**Files:**
- Modify: `tools/safrs/check_task_ownership.py`
- Modify: `tools/status/src/cli.mjs`
- Test: `tests/governance/test_task_ownership.py`
- Test: `tests/repository/status-command.test.mjs`

**Interfaces:**
- Each claim records an automatically derived `worktree_id`.
- Governance compares staged, unstaged, and all untracked paths with active scopes for the current `worktree_id`.
- Every changed path must be covered by exactly one active task.

- [x] Add a failing test where the registry is empty but the disposable worktree has a changed file.
- [x] Add failing tests for an out-of-scope change and a correctly covered change.
- [x] Collect staged, unstaged, and untracked paths and enforce exact worktree association.
- [x] Add a failing test proving human `next_action` is Bahasa Indonesia while JSON `next_action` remains English.
- [x] Add bounded subprocess timeouts and accurate file-level dirty counts.
- [x] Make status no-write tests compare the complete Git status before and after in a disposable repository.
- [x] Run focused tests until green.

### Task 4: CI and Verification Integrity Wiring

**Files:**
- Modify: `.github/workflows/safrs-governance.yml`
- Modify: `.safrs/sensitive-paths.json`
- Modify: `scripts/test.mjs`
- Modify: `tests/repository/automation-policy.test.mjs`

**Interfaces:**
- Governance workflow runs ownership checker and Python ownership tests.
- Root `pnpm test` runs all repository Node tests before contract/package tests.
- `tools/task/**`, `tools/status/**`, and their control tests are verification-control paths.

- [x] Extend behavioral automation-policy tests first and observe them fail.
- [x] Wire the ownership checker/test into governance CI.
- [x] Wire `tests/repository/*.test.mjs` into `pnpm test` without duplicating the CI-only command.
- [x] Extend verification-control classification for Control Plane logic and tests.
- [x] Run automation-policy, repository, and sensitive-classification tests until green.

### Task 5: Documentation and Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-08-11-safrs-control-plane-v1-design.md`
- Modify: `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md`
- Modify: `.agents/HANDOFF.md`

- [x] Replace the per-worktree tracked-registry design with the Git-common live lease model.
- [x] Document lock/atomic behavior, changed-path coverage, repair behavior, and local-only limitations.
- [x] Bind task mutation to its recorded worktree and permit legal terminal recovery through both `state` and `close`.
- [x] Add fail-closed, change-set-bound evidence for completed independent verification-integrity review.
- [x] Self-review documents for contradictions, placeholders, and duplicate sources of truth.
- [x] Run focused tests, targeted Biome, governance checks, token gate, lint, typecheck, test, build, and both SAFRS adapters where the environment supports them.
- [x] Record change-caused failures separately from pre-existing/environmental failures.
- [x] Review the final diff; do not stage or commit.

## Spec Coverage Self-Review

- Cross-worktree visibility: Task 1.
- Locking and atomicity: Task 1.
- Path/risk/time validation, recovery, and redaction: Task 2.
- Real changed-path ownership and status behavior: Task 3.
- CI/test/integrity wiring: Task 4.
- Canonical documentation and verification evidence: Task 5.
- No TODO/TBD placeholders or unresolved interface names remain.
