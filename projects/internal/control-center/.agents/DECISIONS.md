# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-08-17 - TASK-20260813-CONTROL-CENTER MERGED and CLOSED

Migrated from root .agents/DECISIONS.md (original date kept).

Chief authorized `REVIEW → MERGED → CLOSED`. Executed via `tools/task/src/cli.mjs state --to MERGED --yes` then `close --yes`, both from the owning worktree. Final record confirmed `state: CLOSED`, `updated_at: 2026-08-17T10:18:41Z`. `docs/` is no longer owned by any active task — `RECONCILE-GOVERNANCE` may now claim it. (`close` emitted a non-fatal warning: no local lease-ledger RELEASE event existed for this task, since it predates this session's lease ledger; state file itself updated correctly.)

## 2026-08-17 - TASK-20260813-CONTROL-CENTER reconciled to REVIEW

Migrated from root .agents/DECISIONS.md (original date kept).

Checked the task against the control plane and its owning worktree instead of assuming staleness:

- Control-plane record showed `EXECUTING`, `updated_at` unchanged since claim (2026-08-13T15:33:54Z) — looked stale but code delivery had actually landed.
- Worktree `worktrees/feat-control-center` @ `4e07ddf` is clean (no uncommitted changes) and `git merge-base --is-ancestor` confirms it is an ancestor of `main` — the work shipped via PR #26 (merge commit `9565b48`), outside the task's own lifecycle bookkeeping.
- Ran `scripts/safrs-verify.ps1` fresh inside the owning worktree: PASS, 0 changed files, all governance and test suites green.
- Advanced state through the legal chain `EXECUTING → VERIFYING → REVIEW` via `tools/task/src/cli.mjs state` (ownership guard requires running from the owning worktree, not `main`).
- Did not advance to `MERGED`/`CLOSED`: that is Chief's call (R2, designated review) even though the code is already on `main` — the task record and the git reality should agree before closing.
- Consequence: `REVIEW` is still `MUTATION_ACTIVE`, so `docs/` stays owned by this task and `RECONCILE-GOVERNANCE` remains blocked until Chief authorizes the close.
