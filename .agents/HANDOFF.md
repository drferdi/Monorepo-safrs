# HANDOFF — Monorepo control plane

Last updated: 2026-09-25 (Claude Code, branch `integration/post-adr-0007-3`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- ADR 0007 is complete; `main` at `e01f5969` carries `integration/post-adr-0007-2` (condensed
  root `AGENTS.md`, smartboard lint repair, prompt README and CI, kediri env wrapper, root DB
  migration `0003_add_auth_tables`).
- `project-standalone verify` passes for `corporate/portfolio-drnovia`, `internal/unicom`,
  `internal/prompt`, and `academic/academic-smartboard`.
- The main checkout's stale ADR 0007 drafts are stashed at `stash@{0}` (superseded; do not
  re-apply without Chief).

## Work in flight

`integration/post-adr-0007-3`, base `e01f5969`, one merge for Chief:
- `DB-DEMOS-ID-DEFAULT` (Chief, 2026-09-25: "pilihan 1"): `Demo.id` in
  `packages/database/prisma/schema.prisma` is now `@default(dbgenerated("gen_random_uuid()"))`,
  matching migration 0002. No new migration. Proof on a disposable PostgreSQL 16: after
  `migrate deploy`, `migrate diff --from-config-datasource --to-schema` printed
  `ALTER TABLE "demos" ALTER COLUMN "id" DROP DEFAULT;` before the change and an empty migration
  after it; an insert without `id` got a UUID. `generate`, `typecheck`, `lint` pass; `vitest` 22/22
  with `DATABASE_INTEGRATION_TESTS=1` on a disposable database (port 54329, `_local`).
- `KEDIRI-REQUEST-TIME`: capsule scope, see
  `projects/product/kediri-history/.agents/HANDOFF.md`.

## Blockers

None for this branch.

## Next action

- Chief: merge `integration/post-adr-0007-3`.
- Cursor brief for the four non-conformance capsules:
  `docs/plans/active/2026-09-25-cursor-capsule-independence-prompt.md` (gitignored).
  Control-center placement is still a Chief decision (ADR 0007).
- Gate backlog: CI and the verifiers run the checker from the change set under review; classify
  `tests/governance/test_sensitive_classification.py` and `test_handoff_scope.py` as controls.
- Verifier backlog: Windows cleanup EPERM after a `run` timeout (not reproduced since).
- `check_handoff.py` still points to "AGENTS.md § Session protocol", a heading the condensed
  `AGENTS.md` no longer has; the rules now live under "Task Lifecycle & Documentation".

## Owner collision

None.
