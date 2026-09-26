# HANDOFF

Last updated: 2026-09-26

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-26 (see `DECISIONS.md`). Lint, typecheck, tests,
build and deploy dry-run pass from the capsule root with pnpm 11.21.0 and Node 24.

## Work in flight

None.

## Blockers

None.

## Next action

Re-point the Railway service for the Puskesmas website to the root directory
`projects/healthcare/healthsphere/website` (Chief). Its `railway.toml` still builds with npm;
switch it to pnpm when convenient.
