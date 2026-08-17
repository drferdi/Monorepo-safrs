# RECONCILE-GOVERNANCE Design

**Date:** 2026-08-17
**Status:** Approved design for implementation planning
**Owner:** Codex
**Risk:** R2
**Task ID:** TASK-20260817-RECONCILE-GOVERNANCE
**Kanban card:** RECONCILE-GOVERNANCE
**Worktree:** `D:\\DEV\\Monorepo.worktrees\\reconcile-governance`
**Branch:** `feat/reconcile-governance`
**Base:** `main` @ `124e9e0`

## Goal

Reconcile SAFRS task, lease, and worktree ownership so Master Remediation documents have a valid R2 owner, Control Center no longer blocks `docs/`, and governance can PASS for the claimed scope without weakening the ownership checker.

This task does not start `RECONCILE-RENOVATE`, does not start Phase 1, and does not clean the dirty `main` checkout.

This design file lives on dirty `main` at `docs/superpowers/specs/2026-08-17-reconcile-governance-design.md`. It is not one of the six claimed mutation paths and must not be imported into the dedicated worktree.

## Constraints

- Dedicated sibling worktree only. Do not mutate dirty `D:\\DEV\\Monorepo`.
- Claim through the official SAFRS control plane from inside the new worktree.
- Do not modify `tools/safrs/check_task_ownership.py` or any other governance checker.
- Do not change `renovate.json`.
- Do not start `RECONCILE-RENOVATE` before this task reaches `REVIEW`.
- Do not start Phase 1.
- Do not rewrite the Ground Truth baseline; add a dated addendum only.
- Do not rewrite the Master Plan body; align status only.
- HANDOFF is overwritten as current state. DECISIONS is append-only.
- Stage explicit files only. Never `git add -A`.
- Residual dirty paths on `main` stay out of scope.

- This design spec and the later implementation plan stay on `main`; they are planning artifacts, not claimed R2 mutation scope.

## Chosen approach

Use a clean worktree cut from `main` @ `124e9e0`, then import only the six authorized files.

This is preferred over claiming on dirty `main` because the ownership checker fail-closes on every dirty path in the current worktree. A clean worktree makes PASS possible for the claimed scope without weakening the checker and without cleaning unrelated residual files.

This is preferred over a wide `docs/` claim because Chief authorized six exact files.

## Isolation and claim

1. Create `D:\\DEV\\Monorepo.worktrees\\reconcile-governance` on `feat/reconcile-governance` from `main` @ `124e9e0`.
2. From that worktree, claim:

   - ID: `TASK-20260817-RECONCILE-GOVERNANCE`
   - Title: Reconcile SAFRS governance ownership for Master Remediation
   - Owner: `agent:codex:root` / `Codex governance reconciliation`
   - Risk: `R2`
   - Initial state: `CLAIMED`
   - Scope, exactly:

     - `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
     - `docs/plans/active/MASTER REMEDIATION KANBAN.md`
     - `docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md`
     - `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`
     - `.agents/HANDOFF.md`
     - `.agents/DECISIONS.md`

3. Import only those six files from the dirty `main` working tree after the claim exists.
4. Advance `CLAIMED -> PLANNED -> EXECUTING` only after the files are imported and edits begin.

The claim writes to the shared control plane at `.git/safrs-control-plane/`, not into the working tree. A local `CLAIM` lease event is recorded. Remote lease reconciliation is not required for this local R2 documentation task.

`TASK-20260813-CONTROL-CENTER` is already `CLOSED` as of `2026-08-17T10:18:41Z`. No other mutation-active task currently owns `docs/`.

## Document reconciliation

### Kanban

- Record `TASK-20260813-CONTROL-CENTER = CLOSED`.
- Record that `docs/` is no longer blocked by that task.
- Move `RECONCILE-GOVERNANCE` out of `BLOCKED` into `IN PROGRESS`, then `VERIFYING` / `REVIEW` after verification.
- Keep `RECONCILE-RENOVATE` blocked or planned until this task is reviewed.
- Update the board snapshot and last-updated date.

### Assignments

- Align the authorization boundary: Phase 0A evidence exists, Control Center no longer owns `docs/`, and this task is the authorized R2 package for ownership reconciliation.
- Do not authorize Phase 1 or Renovate from this file.

### Ground Truth

- Keep the 2026-08-17 observational body unchanged.
- Append a dated addendum: Control Center closed at `2026-08-17T10:18:41Z`, `docs/` had no active owner before this claim, and this task now owns the six listed files.

### HANDOFF

Overwrite with current state: HEAD, worktree, task ID, six-file scope, residual `main` dirt as out-of-scope, and the Renovate/Phase 1 prohibition.

### DECISIONS

Append one new entry recording option B, Approach 1, confirmed Control Center close, and this R2 claim. Do not edit older entries.

### Master Plan

Align the document status with already-approved Chief decisions. Do not rewrite the 47KB body.

## Out of scope

Do not touch:

- `tmp-*`
- `docs/handbook/`
- `projects/control-center/apps/web/next-env.d.ts`
- Copilot files
- `AGENTS.md`
- deleted `.specstory` files
- `renovate.json`
- governance checkers
- other pre-existing dirty paths on `main`

A governance FAIL on dirty `main` remains expected and is not a reason to weaken the checker.

## Verification and review gate

Run all verification inside the new worktree:

```powershell
pnpm governance
powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1
git diff --check
git status --short --branch
```

Promotion to `REVIEW` requires:

- Governance PASS
- Ownership PASS
- No unrelated path changed
- No `renovate.json` change
- `RECONCILE-GOVERNANCE` at `REVIEW`

If any command fails, stay in `VERIFYING` or return to `EXECUTING` and report the exact blocker. Do not change the checker to force PASS.

Evidence lives in HANDOFF: task ID, worktree, HEAD, six paths, command results, freshness `FRESH`, and confirmation that Renovate and residual `main` paths were not changed.

Lifecycle stops at `REVIEW`. Do not `MERGED` or `CLOSED` in this task. Do not open `RECONCILE-RENOVATE`.

Commit only after verification is green, staging the six claimed files explicitly.

## Success criteria

- Dedicated worktree exists and is the only mutation surface.
- Official SAFRS claim owns exactly the six authorized files.
- Control Center no longer blocks `docs/`.
- Kanban, Assignments, HANDOFF, DECISIONS, Ground Truth addendum, and Master Plan status agree.
- Governance and ownership PASS in the claimed worktree.
- Residual dirty `main` files remain untouched.
- `RECONCILE-RENOVATE` remains unopened.
