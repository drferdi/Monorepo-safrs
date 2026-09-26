# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-26 and brought up to `drferdi/Medassist` `main`
(`b17e83c2`, PR #1–#10) on 2026-09-27 (see `DECISIONS.md`). `pnpm project:verify
healthcare/med-assist` passes (lint, typecheck, test, build, extension load check, `wxt zip`);
Vitest: 961 passing, 16 skipped.

## Work in flight

None.

## Blockers

None.

## Next action

- Load `.output/chrome-mv3-dev` once in Chrome and click through the side panel; Vitest moved
  from 2.x to 4.x and WXT to 0.20.27 for security fixes.
- Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).
- The CI badge in `README.md` shows no status until `drferdi/Medassist` has a `ci.yml`
  workflow; the logo link renders only for viewers with access (the repository is private).
