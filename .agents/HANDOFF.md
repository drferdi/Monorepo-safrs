# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-12 (CI lint baseline remediation)

## Current state

- **Lint baseline remediation (R2, this branch):** the pre-existing Biome errors exposed by PR #3 are corrected in an isolated worktree.
- Biome now parses Tailwind directives and follows the checked-out platform line ending. Git stores normalized text while fresh Windows checkouts use CRLF; shell scripts remain LF and PowerShell scripts remain CRLF.
- Design reference errors were corrected without redesign: accessible SVG title, valid links, block-scoped declarations, and formatter-safe script markup.
- Token values are semantically unchanged; their CSS and package manifest were formatted. The token gate script received formatter-only changes.
- Fresh Windows checkout evidence: `pnpm lint` checked 146 files with 0 errors (19 warnings, 11 infos); `pnpm check:tokens` passed 38 contrast checks.
- GitHub then reached `pnpm test`; the pre-commit fixture now selects Git Bash on Windows and native `bash` on Linux instead of hard-coding a Windows executable on Ubuntu.
- `scripts/check-tokens.mjs` and `tests/repository/precommit.test.mjs` are now explicit verification-control patterns, with classifier regression coverage, so mixed implementation/control changes require matching independent evidence.
- GitHub Actions is intentionally Windows-native now: both workflows use `windows-2025`, CI starts the preinstalled PostgreSQL 17 Windows service, and governance uses PowerShell plus the Windows Python command.
- Isolated worktree: `D:/DEV/Monorepo.worktrees/fix-lint-baseline` on `fix/lint-baseline`.
- Primary `main` worktree still holds unrelated alignment-pack changes — do not clobber.

## Work in flight

- PR #5 carries the separate SAFRS CI diff-context correction; this lint branch is stacked on it so CI receives the fixed diff context without mixing commits.
- This branch owns `.gitattributes`, `biome.jsonc`, the affected design references, `packages/token/`, the app layout import, `scripts/check-tokens.mjs`, and this HANDOFF.

## Blockers

- After PR #5 merges, rebase this branch onto updated `origin/main` before final merge.
- R2 designated boundary and verification-integrity reviews are approved for this lint delta.

## Next actions

| Area | Action |
| --- | --- |
| **This branch** | Push stacked branch → open PR against PR #5 branch → confirm full CI |
| PR #5 | Merge CI diff-context correction before this lint PR |
| Primary WT | Keep alignment-pack work separate |

## Session guardrails

- No dependency additions, deployment, secret access, or production mutation.
- `.agents/knowledge/` remains untouched.
- PowerShell commands on Windows; explicit staging only, never `git add -A`.
