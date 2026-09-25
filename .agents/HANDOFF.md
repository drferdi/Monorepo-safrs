# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (Claude Code, branch `integration/post-adr-0007-4`)

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

`integration/post-adr-0007-4` (worktree `../Monorepo.worktrees/fix/root-drop-golden-path-demonstrator`,
renamed from `fix/root-drop-golden-path-demonstrator`), base `481801fc`, one merge for Chief:

1. `ROOT-DROP-GOLDEN-PATH-DEMONSTRATOR` and `ROOT-DROP-GOLDEN-PATH-CI-POLICY` (Chief: "yes tidak" =
   the root needs no demonstrator; see `.agents/DECISIONS.md`):
   - `pnpm-workspace.yaml` excludes `projects/internal/golden-path/**`; the lockfile drops only its
     importer. pnpm 11 kept the stale importer with the default optimistic repeat install; it was
     regenerated with `--config.optimistic-repeat-install=false`.
   - Root CI runs the control-plane typecheck/test and `check:security` unconditionally; the
     golden-path steps (typecheck, full test, browser engine, browser smoke, Playwright artifact)
     are gone. Those steps never ran on origin, which is published without `projects/`.
   - `check_topology.py`, `check_routing.py`, `AGENTS.md`, `test_safrs_topology.py`,
     `workspace-config.test.mjs`, `automation-policy.test.mjs` follow. Removed root tests bound to
     golden-path internals: `build-time-environment`, `playwright-environment`, `lfs-snapshots`.
   - Root `dev:email` and `stripe:listen` removed; `README.md` quick start, capsule table, and
     capability table follow (`pnpm dev` now starts Postgres and control-center on port 3100).
2. Security (`pnpm audit`, root and capsules): root catalog `next` 16.3.6 plus override
   `next: "catalog:"` (the optional `next` peer of `@sentra/token` resolved 16.2.12), overrides
   `sharp >=0.35.4`, `mysql2 ^3.22.0`, `fast-uri ^3.1.6`. Root `pnpm check:security` exit 0 (5
   moderate remain). Kediri and smartboard: see their handoffs; both `verify` PASS.
3. `ROOT-TOKEN-GATE-ROOT-ONLY`: `packages/token/scope.txt` keeps `packages/token`, `packages/ui`,
   and control-center; golden-path, smartboard, and sentrabot left (Chief, 2026-09-25). New tests
   in `workspace-config.test.mjs`: the token scope never covers an excluded capsule, and the
   lockfile keeps no importer for one. Both failed first (scope on 4 capsule paths; `main`'s lockfile
   on the golden-path importer). CI runs `workspace-config.test.mjs` directly (it needs no `.env`);
   `automation-policy.test.mjs` asserts that step and failed first without it.
- Stale claims superseded with evidence: `TASK-20260821-SENTRABOT-WORKSPACE-CATALOG-OWNERSHIP`
  (landed in `88268a73`), `TASK-20260822-DOMAIN-LAYERING-TOKEN-SCOPE` (landed in `3371d9e5`).

## Blockers

None for this branch. Cursor's golden-path claims (`projects/internal/golden-path/`,
`.safrs/known-nonconformance.json`) are untouched.

## Next action

- Chief: integrity review and merge `integration/post-adr-0007-4`.
- Cursor: sentrabot (±1,250 raw colours) and golden-path have no capsule-local token gate yet;
  both capsules still need their own `next`/`sharp` security patch in their own lockfiles.
  `docs/context/active/golden-path.context.md` still calls golden-path the canonical
  implementation that uses root packages.
- Follow-ups: decide whether root `test:e2e`, `scripts/test.mjs` (needs `.env`), and
  `scripts/dev.mjs` still earn their place; ADR 0007 addendum if Chief wants the decision in the
  ADR; control-center placement (ADR 0007, separate R2 package).
- Kediri: the data cache's effect on database reads is not yet observed at runtime.
- Gate backlog: CI and the verifiers run the checker from the change set under review; classify
  `tests/governance/test_sensitive_classification.py` and `test_handoff_scope.py` as controls.
- Verifier backlog: Windows cleanup EPERM after a `run` timeout (not reproduced since); the task
  CLI hit one transient EPERM on the claim registry rename (retry succeeded).
- `check_handoff.py` still points to "AGENTS.md § Session protocol", a heading the condensed
  `AGENTS.md` no longer has; the rules now live under "Task Lifecycle & Documentation".

## Owner collision

None.
