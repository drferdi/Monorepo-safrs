# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-12 (Control Plane v1 — CI portability follow-up)

## Current state

- **Control Plane Increment A remediation (R2, this branch):** shared Git-common task leases, locked atomic writes, changed-path ownership, strict validation/redaction, owner-worktree mutation binding, recovery, `pnpm status`, `pnpm task`, CI/verify wiring, tests, protocol, and design.
- The original snapshot and CI-portability correction received independent spec, SAFRS boundary, and verification-integrity approval; both are merged through PR #4.
- Integrity review evidence is fail-closed and bound to the exact changed-file content fingerprint; stale or malformed evidence is rejected.
- PR #3 exposed a Windows/Linux byte-representation mismatch. The follow-up uses canonical Git blob identities and `origin/main` as the trusted fetched local base, with regression coverage for CRLF worktrees, historical LF blobs in CI, a stale local `main` branch, and manual feature-branch dispatch. CI now fetches history and passes immutable PR base/head SHAs to `pnpm governance`; manual dispatch compares `origin/main` to `github.sha`, while classifier subprocess tests strip inherited CI refs before entering disposable repositories.
- Isolated worktree: `D:/DEV/Monorepo.worktrees/feat-safrs-control-plane-v1` on `fix/safrs-ci-diff-context`.
- Primary `main` working tree still holds unrelated Cursor alignment pack — do not clobber.

## Work in flight (do not clobber)

- This Control Plane branch owns paths listed in the design file map only.
- Cursor alignment pack remains in the primary worktree (uncommitted) — out of scope here.
- DX friction ownership of unrelated `scripts/` / INSTALL.md — do not expand into those.

## Blockers

- PRs #3 and #4 were merged externally before their failing runs were remediated; the final CI diff-context correction requires one narrow follow-up PR.
- Separate worktree `fix/lint-baseline` owns unrelated pre-existing Biome failures so they are not mixed into the Control Plane commit.
- Full repo lint/typecheck/test/build retain unrelated baseline/environment failures: design-reference Biome findings, missing generated Prisma client, and absent local `.env` / app environment.
- Bash adapter under WSL cannot resolve this Windows-created worktree Git metadata; native PowerShell governance is the authoritative local adapter here.
- Do not merge until Chief review; primary WT conflicts are separate.

## Next actions

| Area | Action |
| --- | --- |
| **This branch** | Refresh integrity evidence against merged PR #4 → push narrow follow-up PR |
| Lint baseline | Rebase the separate lint fix onto merged Control Plane, then verify and publish its own PR |
| Primary WT | Keep alignment pack review separate |

## Session guardrails

- Never read `.env` in `D:\Devops\abyss-monorepo`; never copy old `node_modules`/`.env`/`.next`/lockfiles.
- `.agents/knowledge/` — no changes without Chief's approval.
- Worktrees: sibling `../Monorepo.worktrees/<branch>` only.
- PowerShell for commands; chat diagnostics in Bahasa Indonesia; docs/code in English.
