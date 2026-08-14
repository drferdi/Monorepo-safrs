# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-14 (control-center capsule built on `feat/control-center`; Chief stopped the session)

## Current state

- **`main` is untouched.** All 20 commits sit on `feat/control-center`
  (worktree `../Monorepo.worktrees/feat-control-center`). Both working trees are clean.
- **New capsule `projects/control-center`** — a local Node-runtime Next.js operator board that reads
  this repository directly. What genuinely works, each verified by running it:
  - Feature registry: status derived from evidence paths on disk, never hand-authored. Branch-aware,
    so `corpus-engine` resolves to "requires human action" with its branch named.
  - Workspace map + blast radius (`@safrs/config` reaches 8 members).
  - Change flow from git (172 commits/30 days; 146 by agent identities, 26 by people).
  - Machine readiness via a new `--json` mode on `tools/doctor` (text mode unchanged).
  - Allowlisted command executor: fixed argv, no shell, confirmation phrase compared server-side,
    audit line per attempt. Proven by generating Prisma Client from the board (exit 0), after which
    the step removed itself from the derived next-steps list.
- **`packages/token` gained Archivo + JetBrains Mono** as an opt-in typeface (`@sentra/token/fonts-archivo`,
  `archivo.css`). Geist remains the default; Golden Path unchanged. R2, scope expansion recorded in commit.
- `sentrawiki` refresh committed to `main` earlier in the session (governance PASS at that point).

## Blockers

- **`check_sensitive_changes.py` refuses this change set**: `projects/control-center/AGENTS.md` is a
  verification control created alongside its implementation. Needs Chief's independent review, or the
  capsule AGENTS.md split into its own change. Do not weaken the gate.
- **`TASK-20260813-CONTROL-CENTER` (R2) is still open** in the registry.
- **Medical library counts are unknowable from disk**: `database/canonical/manifest.jsonl` records 4
  entries against 82 canonical documents; canonical files carry no quality verdict. Only the pgvector
  projection can answer "ready to use", and Docker is down. The board reports this as unknown by design.
- Docker engine down → 4 readiness checks blocked, 1 Vitest suite fails. Pre-existing.

## Not done — do not assume otherwise

- Agents, Tasks, Governance, Knowledge sections still render **static catalog data**.
- Long-running processes (`pnpm dev`, corpus pipeline) cannot be started from the board; needs a
  supervisor with start/stop/status/log, and the pipeline must honour `database/corpus.lock`.
- **No automated tests for the registry.** Coverage owed is listed in
  `projects/control-center/docs/testing.md`.
- Command output still carries raw ANSI escapes.

## Next actions

| Area | Action |
| --- | --- |
| **Review** | Chief decides: review the R2 change set, or split the capsule AGENTS.md out |
| **Library** | Bring Docker + database up, then rebuild the manifest over the 82 canonical documents |
| **Tests** | Path containment and status derivation, before extending the board further |
| **Sections** | Wire the four remaining sections to real readings |
| **Disposition** | If the branch is not wanted: `git worktree remove` + `git branch -D feat/control-center` leaves `main` exactly as it was |

## Session guardrails

- PowerShell for commands; explicit staging only, never `git add -A`.
- Sentra design tokens only. `.panel` corner marks are for a genuinely bounded object — a card around
  every section is a prohibition. Reference: `docs/design-system/reference/`, notes in
  `projects/control-center/docs/design-brief.md`.
- Worktrees: sibling `../Monorepo.worktrees/<branch>` only.
- Chat diagnostics in Bahasa Indonesia; docs/code in English.
- **Verify before reporting.** This session repeatedly claimed work verified when it was not — a font
  said to be applied that rendered as Times New Roman, buttons called runnable while every visible one
  was disabled, and a "ready to use" figure taken from a manifest the same code had just proved
  damaged. Measure the thing itself, and where the source is unsound report unknown rather than a
  number.
