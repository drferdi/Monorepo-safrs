# HANDOFF

Last updated: 2026-09-26

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-26 (see `DECISIONS.md`). Typecheck, 87 tests, build and
deploy dry-run pass from the capsule root with pnpm 11.21.0 and Node 24.

## Work in flight

None.

## Blockers

None.

## Next action

Re-point the Vercel project for MEDLINK to the root directory `projects/healthcare/referralink`
(Chief). Run `test:browser` once Playwright browsers are installed locally.
