# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-12 (PR #9 conflict remediation)

## Current state

- PR #10 merged the Windows-native CI database remediation into `main` at `ce6bc99`; its final `CI` and `SAFRS Governance` checks passed.
- PR #9 adds `docs/governance/AI_REPOSITORY_REVIEW_PROMPT.md` as a reusable, read-only, evidence-based repository review prompt.
- PR #9 was rebased onto current `origin/main`; the stale HANDOFF replacement from the original Jules commit was reconciled with current repository state.
- The prompt now follows SAFRS trust, secret-handling, scope, and verification rules.
- Isolated worktree: `D:/DEV/Monorepo.worktrees/fix-pr9-conflict` on `feat/ai-repository-review-prompt-6519240458101956909`.
- The primary `main` worktree still holds unrelated alignment-pack changes — do not clobber.

## Work in flight

- This branch owns only `docs/governance/AI_REPOSITORY_REVIEW_PROMPT.md` and `.agents/HANDOFF.md`.

## Blockers

- The HANDOFF path makes this an R2 change; designated Chief review is required before merge.

## Next actions

| Area | Action |
| --- | --- |
| **PR #9** | Complete local verification, push the rebased branch, and confirm GitHub checks |
| Review | Chief reviews the R2 change and decides whether to merge |
| Primary WT | Keep the unrelated alignment pack separate |

## Session guardrails

- No dependency, deployment, credential, production, or verification-control changes.
- `.agents/knowledge/` remains untouched.
- PowerShell commands on Windows; explicit staging only, never `git add -A`.
