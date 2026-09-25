# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (Claude Code, branch `fix/root-drop-golden-path-demonstrator`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- `main` at `481801fc`: `project-standalone verify` isolates `APPDATA`/`LOCALAPPDATA` and honours
  a contract `timeoutSeconds` (1-600, default 120) on finite lifecycle commands. `pnpm governance`
  PASS on `main`.
- `project-standalone verify` passes for `corporate/portfolio-drnovia`, `internal/unicom`,
  `internal/prompt`, `academic/academic-smartboard`, and `product/kediri-history`.
- The main checkout's stale ADR 0007 drafts are stashed at `stash@{0}` (superseded; do not
  re-apply without Chief).

## Work in flight

`fix/root-drop-golden-path-demonstrator`, base `481801fc`, claim
`ROOT-DROP-GOLDEN-PATH-DEMONSTRATOR` (Chief, 2026-09-25: "yes tidak" = the root needs no
demonstrator; see `.agents/DECISIONS.md`):
- `pnpm-workspace.yaml` excludes `projects/internal/golden-path/**`. `pnpm install --lockfile-only`
  (with `optimistic-repeat-install=false`; the default reported "Already up to date" and kept the
  stale importer) drops only the golden-path importer and packages used by it alone; every other
  importer is byte-identical.
- Root CI runs the control-plane typecheck/test steps and `check:security` unconditionally; the
  golden-path typecheck, full `pnpm test`, browser engine install, browser smoke, and Playwright
  artifact steps are removed.
- `check_topology.py` and `check_routing.py` no longer require golden-path paths; `AGENTS.md`
  "Known Non-Conformance" says the root has no demonstrator; `test_safrs_topology.py` and
  `workspace-config.test.mjs` follow (the latter asserts the exclusion).
- Removed root tests bound to golden-path internals: `tests/contracts/build-time-environment`,
  `tests/contracts/playwright-environment`, `tests/repository/lfs-snapshots`. Their claims belong
  in the capsule (Cursor's golden-path standalone work).
- Root `dev:email` and `stripe:listen` removed (they filtered `@safrs/web`); `doctor`, `setup`,
  `dev`, `test:e2e` stay. After the exclusion `pnpm dev` starts only control-center.
- Stale claim `TASK-20260821-SENTRABOT-WORKSPACE-CATALOG-OWNERSHIP` (Kilo, `pnpm-workspace.yaml`)
  was superseded: its work landed in `88268a73` (sentrabot exclusion).

## Blockers

None for this branch. Cursor's golden-path claims (`projects/internal/golden-path/`,
`.safrs/known-nonconformance.json`) are untouched.

## Next action

- Chief: integrity review and merge `fix/root-drop-golden-path-demonstrator`.
- Follow-ups: decide whether root `test:e2e`, `scripts/test.mjs` (needs `.env`), and
  `scripts/dev.mjs` still earn their place; ADR 0007 addendum for this decision if Chief wants it
  in the ADR itself; control-center placement (ADR 0007, separate R2 package).
- Kediri: the data cache's effect on database reads is not yet observed at runtime.
- Gate backlog: CI and the verifiers run the checker from the change set under review; classify
  `tests/governance/test_sensitive_classification.py` and `test_handoff_scope.py` as controls.
- Verifier backlog: Windows cleanup EPERM after a `run` timeout (not reproduced since).
- `check_handoff.py` still points to "AGENTS.md § Session protocol", a heading the condensed
  `AGENTS.md` no longer has; the rules now live under "Task Lifecycle & Documentation".

## Owner collision

None.
