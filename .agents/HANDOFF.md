# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (status documents realigned with the repository's actual state)

## Current state

- **There is no Kanban board, in any form.** Do not reintroduce the Cline app or a markdown board.
- Status tracking lives in `.agents/`: `PROGRESS.md` (area/phase), this file (session), `DECISIONS.md` (durable). `docs/plans/` is reference only.
- Rehydrate is MUST-only: one parallel batch of the Always (MUST) list. Always (SHOULD) waits until a task is assigned.

## Work in flight

Nothing. `main` is level with `origin/main` and the working tree holds no content changes
(`git diff --name-only` is empty; the entries `git status` shows are stat-cache noise from the
LF renormalisation). Never pin a HEAD SHA in this file — it goes stale the moment this file is
committed. Read the SHA from `git log`.

Shipped this session, in order:

- `78c62f9` — two R2 policy slices: forbidden address terms widened to five, rehydrate narrowed to the Always (MUST) list.
- `3e05005` — merge of `fix/phase-1-verification-integrity` (`3ecc116`) on Chief's authorization. It pins `* text=auto eol=lf` and Biome `lineEnding: "lf"`, so line endings are now deterministic on every platform.
- `74497c0` — the two tests that merge broke, realigned. `precommit.test.mjs` now asserts a literal LF instead of branching on platform; `workspace-config.test.mjs` reads `biome.jsonc` through the new JSONC parser in `tests/repository/jsonc.mjs`. Both expectations are stricter than what they replaced.
- `8e22025` — integrity review evidence rebound to `base_sha 374e425dde71…`, `change_set_sha256 9da8491c7cea…`, recomputed from scratch by an independent read-only reviewer and approved by Chief.

- The status documents themselves, realigned with what the repository actually contains: Master
  Remediation Phase 1 marked done, the DX friction fixes corrected from "in progress" to not started,
  the three real project capsules named, `docs/plans/active/README.md` rewritten to list the five plans
  it actually holds, the completed SOTA plan moved to `docs/plans/completed/`, and
  `.agents/CONTEXT.md` Repository Shape rebuilt from `git ls-files`. Rationale and the two findings
  left untouched are in `DECISIONS.md`.
- A follow-up correction: two files under `docs/plans/` were named lowercase on disk while git tracked
  them uppercase, and the first draft of `docs/plans/active/README.md` copied the lowercase form. The
  working copy was renamed to match the index, the README now cites the tracked name, and the lesson in
  `12_LESSONS.md` was rewritten — the cause is a Windows case split, not an `ls` bug.
- A second follow-up: `SAFRS_GOVERNANCE_REMEDIATION_PLAN.md` and
  `SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md` declared no status in their headers, so the
  README's status column for them was sourced from `PROGRESS.md` rather than from the plan itself.
  Both now carry a `**Status:**` line, and every plan under `docs/plans/active/` declares its own.

Verified: `scripts/safrs-verify.sh` PASS, 67/67 repository tests, typecheck 8/8, `pnpm lint`
clean after the worktree was renormalized to LF.

## Waiting on Chief

Nothing else is blocked on an agent. Each row is a choice only Chief can make, stated in full.

| # | Decision | Where it is recorded |
| --- | --- | --- |
| 1 | Claude Code automation pack — accept as implemented, or send back | `docs/bootstrap/CLAUDE_SETUP.md` |
| 2 | Codex automation pack — same question | `docs/bootstrap/CODEX_SETUP.md` |
| 3 | Platform authority model — who and what may act on GitHub in a one-human repository | `MASTER REMEDIATION PLAN`, D-002 |
| 4 | Autonomous provider and budgets, control identities, R3 authority and retention, Droid disposition — four gates holding SAFRS automation Phases 6 to 8 | `SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md`, section 3 |

Row 1 is a security-posture question and should go first. Rows 4 and 5 gate whole phases:
nothing in Master Remediation Phase 2 onward, or SAFRS automation Phase 6 onward, can start
without them.

Settled 2026-08-18: the Sentra wiki plan is approved and now `ACTIVE`. D-004 is accepted — Chief's
explicit "yes" is the R2 authorization, there is no second reviewer, and agents never approve. Two rows were removed as
non-decisions — Smartboard Phase B/C has no code in this repository yet, and `semayot` appeared
nowhere except the board itself.

## Notes, not decisions

- `stripLineComments` is duplicated in `lint-baseline.test.mjs` and `jsonc.mjs`; dedupe in its own change.
- `packages/token` publishes as `@sentra/token` while every other workspace package is `@safrs/*`.
- Docker is down, so `tests/integration/database.test.ts` cannot run (`ECONNREFUSED 127.0.0.1:54329`).
- Do not reintroduce a Kanban board, app or markdown.

## Session guardrails

- PowerShell; `;` not `&&`; explicit staging only; never `git add -A`.
- Evidence before assertions.
