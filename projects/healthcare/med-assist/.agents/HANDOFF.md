# HANDOFF

Last updated: 2026-09-26

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-26 (see `DECISIONS.md`). Lint, typecheck, the full
Vitest suite (926 passing), build, the extension load check, and `wxt zip` pass from the
capsule root with pnpm 11.21.0 and Node 24.

## Work in flight

None.

## Blockers

None.

## Next action

- Load `.output/chrome-mv3-dev` once in Chrome and click through the side panel; Vitest moved
  from 2.x to 4.x and WXT to 0.20.27 for security fixes.
- Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).
