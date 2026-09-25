# HANDOFF

Last updated: 2026-09-25

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- Branch `feat/golden-path-standalone`, task `TASK-20260925-GOLDEN-PATH-STANDALONE` (R2, Cursor,
  BLOCKED). `TASK-20260925-GOLDEN-PATH-NONCONFORMANCE` is SUPERSEDED (single-writer collision on
  `.safrs/known-nonconformance.json`; ownership only checks uncommitted paths, so it was not needed).
- Rebased on `main` 481801fc; verify rerun from a clean tree: RESULT PASS.
- `pnpm governance` also fails `check_sensitive_changes.py` (`.safrs/**` plus capsule implementation
  in one change set); needs Chief integrity review.
- `project.contract.json` added; root packages localized under `packages/` (see `DECISIONS.md`).
- Standalone verify: RESULT PASS on every stage from a clean tree (install, lint, typecheck,
  test 64 passed / 2 skipped seed-integration, build, artifacts, deployDryRun, run, smoke `/` 200).
- The known-nonconformance entry for this capsule is removed; independence check OK.

## Blockers

- `pnpm governance` fails outside this capsule: root `pnpm-workspace.yaml` still includes
  `projects/*/*/apps/*`, so the root install rewrites root `pnpm-lock.yaml` (specifiers changed from
  `catalog:` to exact versions), and task ownership rejects that root change. Needs Chief: exclude
  `projects/internal/golden-path/**` from the root workspace and refresh the root lockfile, plus
  update root CI, tests, and tools that still treat golden-path as a root demonstrator.

## Next action

- After the root change lands on `main`: rebase, rerun verify and `pnpm governance`, then move the
  tasks to VERIFYING → REVIEW.
