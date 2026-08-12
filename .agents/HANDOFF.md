# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-12 (Windows CI database remediation)

## Current state

- **Lint baseline remediation (merged PR #8):** the pre-existing Biome errors and Windows-native workflow migration are already on `main`.
- Biome now parses Tailwind directives and follows the checked-out platform line ending. Git stores normalized text while fresh Windows checkouts use CRLF; shell scripts remain LF and PowerShell scripts remain CRLF.
- Design reference errors were corrected without redesign: accessible SVG title, valid links, block-scoped declarations, and formatter-safe script markup.
- Token values are semantically unchanged; their CSS and package manifest were formatted. The token gate script received formatter-only changes.
- Fresh Windows checkout evidence: `pnpm lint` checked 146 files with 0 errors (19 warnings, 11 infos); `pnpm check:tokens` passed 38 contrast checks.
- GitHub then reached `pnpm test`; the pre-commit fixture now selects Git Bash on Windows and native `bash` on Linux instead of hard-coding a Windows executable on Ubuntu.
- `scripts/check-tokens.mjs` and `tests/repository/precommit.test.mjs` are now explicit verification-control patterns, with classifier regression coverage, so mixed implementation/control changes require matching independent evidence.
- The token gate resolves the repository root from its module path, so `pnpm check:tokens` and the `@sentra/token` package test use the same `scope.txt` from any working directory.
- GitHub Actions is intentionally Windows-native now: both workflows use `windows-2025`, CI configures the preinstalled PostgreSQL 17 Windows service on the repository's disposable port `54329`, grants the disposable test role `CREATEDB` for isolated integration fixtures, and governance uses PowerShell plus the Windows Python command.
- PR #8's checks exposed the remaining mismatch: the native service was healthy, but CI used port `5432`, which the repository reset guard rejects.
- Isolated worktree: `D:/DEV/Monorepo.worktrees/fix-lint-baseline` on `fix/ci-windows-postmerge`.
- Primary `main` worktree still holds unrelated alignment-pack changes — do not clobber.

## Work in flight

- This branch carries the post-merge CI remediation only: native PostgreSQL port alignment, its automation-policy assertion, refreshed HANDOFF, and matching integrity evidence.

## Blockers

- PR #8's CI and governance checks failed after merge; this focused remediation is based on current `origin/main`.

## Next actions

| Area | Action |
| --- | --- |
| **This branch** | Verify locally, refresh independent evidence, push, and open a focused PR against `main` |
| Primary WT | Keep alignment-pack work separate |

## Session guardrails

- No dependency additions, deployment, secret access, or production mutation.
- `.agents/knowledge/` remains untouched.
- PowerShell commands on Windows; explicit staging only, never `git add -A`.
