# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-17 (Tasks 1-7 of 100%-ready plan done in worktree; Task 8 gate pending)

## Current state

- Working in isolated worktree `D:\DEV\Monorepo.worktrees\fix-db-100-ready`, branch `feat/database-100-ready` (created from `origin/main` @ `9565b48`).
- Executing `docs/superpowers/plans/2026-08-16-database-monorepo-100-ready.md`.
- Commits so far on this branch:
  1. `ad043d1` test: reject Git LFS pointers as Playwright PNG baselines
  2. `f07d919` feat(web): show stored demos from PostgreSQL on the readiness desk
  3. `e1f7522` fix(database): drop unused transaction_samples and align Demo defaults (R2)
  4. `d9f2511` fix(ci): run verify on push to main and correct stale red-smoke copy
  5. `b9dcaba` docs: stop claiming a live corpus database or Prisma schema dependency that does not exist
  6. Task 7 (this commit): ignore Next-generated agent files, complete `.env.example`, this HANDOFF
- Visual e2e baseline (`readiness-desk.png`) was already a real PNG in this worktree (LFS smudge worked on `worktree add`) — no `git lfs pull`/`checkout` was needed, only the guard test was added.
- `TransactionSample` model, its migration, and seed logic are removed. New migration `0002_align_demo_schema` applied locally (UUID default + unique `name`, drops `transaction_samples`).
- Golden-path page now lists stored demos (`aria-label="Contoh tersimpan"`) and refreshes after save via `router.refresh()`.
- `ci.yml` now runs on `push` to `main` in addition to `pull_request`; stale "red on main" claims removed from catalog/inventory/PROGRESS.

## Known deviation from audit baseline

- This worktree's Docker Compose project (`fix-db-100-ready_default`) got a **fresh** Postgres volume, not the shared `safrs_local` instance the 2026-08-16 audit inspected. Starting census here was 1 demo / 1 transaction_sample (matches audit), but `corpus_local` database didn't exist at all in this volume (audit found it existed but empty) — even more honest than expected, not a blocker.

## Next actions

| Area | Action |
| --- | --- |
| **Claude** | Run Task 8 final gate: full local verification (doctor, migrate, all test suites, e2e functional+visual, lint, typecheck, governance), confirm live schema, report with evidence |
| **Do not** | Merge `feat/corpus-engine-poc`, reset production, print `.env` |
| **Done only if** | Task 8 gate is all green, including visual e2e |

## Session guardrails

- PowerShell/Bash; explicit staging only; never `git add -A`.
- `.env` / `.env.example` are Read-denied by `.claude/settings.json`; edits to `.env.example` need explicit Chief approval per-edit (Bash) since the Read/Edit/Write tools are blocked by pattern.
- Schema/CI changes are R2.
- Chat diagnostics in Bahasa Indonesia; docs/code in English.
- Verify before reporting.
