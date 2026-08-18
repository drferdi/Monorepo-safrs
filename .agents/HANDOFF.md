# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (Dependabot alert 6 remediated locally — not yet committed or pushed)

## Current state

- Work in flight on `main`: the fix for Dependabot alert 6,
  GHSA-ggr8-5vv4-36mx / CVE-2026-40345 (high, CWE-674 uncontrolled recursion) in `deepmerge-ts < 8.0.0`.
- The package is a transitive runtime dependency, pulled in only by `@prisma/config@7.9.1`.
  Upstream still pins `deepmerge-ts@7.1.5` in its latest release, so there is no version of
  `@prisma/config` to upgrade to — the remediation has to be a pnpm override.
- Change set (2 files, uncommitted): `pnpm-workspace.yaml` gains `deepmerge-ts: ">=8.0.1"` in the existing
  `overrides:` block; `pnpm-lock.yaml` re-resolves `7.1.5` → `8.0.1` with `@prisma/config` as the dependent.
- `8.0.1` was published 2026-08-16, so it clears the `minimumReleaseAge: 1440` gate without an exclude entry.
  Engines (`node >=16`) and the dual CJS/ESM export map are unchanged from `7.1.5`.
- The v8 breaking changes are deep Map merging, two type renames, and `deepmergeInto` no longer
  leak-mutating its inputs. `@prisma/config` merges plain records, so none of them apply.
- Tasks: `TASK-20260818-DEPENDABOT-DEEPMERGE`, R2, owns the two dependency files;
  `TASK-20260818-DEPENDABOT-HANDOFF`, R1, owns this file. Both `EXECUTING`, owner `agent:claude:root`.

## Verification evidence (this worktree)

- `pnpm install` clean; `grep deepmerge-ts pnpm-lock.yaml` shows only `8.0.1` — `7.1.5` is gone.
- `pnpm check:security` → `no advisories found`, `OK: no blocking advisories`.
- `pnpm db:generate` → `Loaded Prisma config from prisma.config.ts.` then
  `Generated Prisma Client (7.9.1)` — the `@prisma/config` consumer path works on the forced major.
- `pnpm governance` → PASS after both task claims.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Authorize the commit of the two dependency files on `main` and the push; Dependabot closes alert 6 once the lockfile lands on the default branch |
| **After push** | Drive both tasks VERIFYING → REVIEW → MERGED → CLOSED |
| **Next task** | Fix the E2E test-database bring-up in CI (`@safrs/web#test:e2e`); red on `main` since `fe1af2d` |
| **Open** | The integrity control verifies fingerprint match, not reviewer independence — Chief to decide whether that gap is closed structurally |
| **Do not** | Expire `refs/original` or the reflog; Phase 1 remains unstarted |

## Session guardrails

- PowerShell; explicit staging only; never `git add -A`.
- Evidence before assertions.
