# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (Cline Kanban trialled and removed on Chief's order)

## Current state

- The Cline Kanban board is gone. It was adopted as the execution board earlier today (`fd2dedd`) and
  removed the same day; the rationale and the evidence are in `DECISIONS.md`. Do not reintroduce it.
- Removed: the board section in `AGENTS.md`, all 13 `refs/kanban/*` refs, the seven
  `~/.cline/worktrees/*` git worktrees, and the board data under `~/.cline/kanban/workspaces/`.
- Left in place deliberately: `.cline/` and `.clinerules` (Cline the coding agent, a different tool),
  `refs/cline/*` and `refs/codex/*` checkpoints, `refs/original`, and the historical mentions of the
  deleted `MASTER REMEDIATION KANBAN.md` in `docs/superpowers/plans/`.
- The globally installed npm package `kanban` was left alone (outside the repository).

## Work in flight

- **Branch `fix/phase-1-verification-integrity` holds real, unreviewed work** — commit `3ecc116`
  "fix(verification): make the lint baseline deterministic across platforms", touching `.gitattributes`,
  `biome.jsonc`, `scripts/check-supply-chain.mjs`, `tools/automation/src/gates.mjs`, and a new
  `tests/repository/lint-baseline.test.mjs`. It was produced by the Phase 1 board card before its session
  was killed. The branch survives; nothing has reviewed or verified it.
- `TASK-20260818-PHASE1-VERIFICATION-INTEGRITY` owned that work. Its worktree was deleted with the board,
  which orphaned the lease, so the registry entry was set to `ABORTED` directly. Reclaim a fresh task
  before continuing that work.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Decide what happens to `fix/phase-1-verification-integrity` — review and merge it, or drop it |
| **Open** | `PROGRESS.md` last updated 2026-08-13 and has drifted; decide whether it is frozen as an archive |
| **Do not** | Reinstate the Kanban board |

## Session guardrails

- PowerShell; explicit staging only; never `git add -A`.
- Evidence before assertions.
