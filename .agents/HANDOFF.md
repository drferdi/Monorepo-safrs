# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens. Overwrite; do not append history.

Last updated: 2026-08-24 — WP-A standalone project foundation closeout

## Current state

- Branch/worktree: `codex/standalone-foundation` in sibling worktree
  `D:/DEV/Monorepo.worktrees/standalone-foundation`; no push, merge, deployment, credential, or
  production action was performed.
- WP-A Tasks 1–7 are implemented. ADR 0006 defines the monorepo as an optional AI control plane
  and every active capsule as a standalone product. Schema v1, structural independence checker,
  extraction/lifecycle verifier, template contract, and root orchestration aliases are present.
- Portfolio Dr. Novia is the first active reference capsule. Extraction proof passes install, test,
  deterministic build, artifact validation, deploy dry-run, run, HTTP smoke, and cleanup without
  copying any root file. Visual composition and browser runtime behavior were not redesigned.
- Focused evidence: project-standalone 14/14; Portfolio 44/44; repository 67/67; architecture
  22/22; document registry, routing, topology, structural independence, targeted Biome, root
  `project:status`, root `project:verify`, and filtered frozen lockfile validation all pass.
- Risk: R2 because architecture/governance boundaries and their tests changed together. Fresh
  independent Luna Max review concluded CLEAN; no approval evidence was authored by the implementer.
- Scoped PowerShell SAFRS verification (`SAFRS_BASE_REF=f1aeb75c349e`) passes its first 11 gates,
  classifies exactly 46 WP-A files as R2, then stops at the expected independent integrity-review
  requirement. The default verifier sees 1,191 files because `main` moved with unrelated work.

## Inherited baseline failures

- WSL `bash scripts/safrs-verify.sh` cannot resolve the Windows linked-worktree gitdir.
- PowerShell SAFRS verification previously reported about 1,157 unrelated main-diff findings; the
  current default count is 1,191 including the fully explained 44-file WP-A slice.
- Unfiltered `pnpm install` fails because `packages/api` references missing workspace package
  `@safrs/auth`; targeted install for `@safrs/project-standalone` passes.
- Root `pnpm test` requires a missing `.env`; setup would start shared Docker/PostgreSQL and was not
  run. These failures predate WP-A and are not hidden as WP-A regressions.

## Next action

Hand the cleanly reviewed branch to Chief for R2 review. Do not merge, push, deploy, or fabricate
verification-integrity approval.
