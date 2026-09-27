# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-26 and brought up to `drferdi/Medassist` `main`
(`b17e83c2`, PR #1–#10) on 2026-09-27 (see `DECISIONS.md`). `pnpm project:verify
healthcare/med-assist` passes (lint, typecheck, test, build, extension load check, `wxt zip`);
Vitest: 961 passing, 16 skipped (last recorded run; not re-run on 2026-09-27).

`docs/architecture.md` was rewritten as a full architecture map and renamed to
`docs/ARCHITECTURE.md` (`AGENTS.md` updated); both changes are staged, not committed.

## Work in flight

Task "Isolate the legacy diagnosis engine behind an interface and add a MIRA engine slot", on
branch `feat/diagnosis-engine-interface` (from `migrate/healthcare`, not pushed). Step A
(read-only inventory) is done: `docs/plans/diagnosis-engine-inventory.md`. Steps B–E have not
started.

## Blockers

Step B waits for Chief's approval of the inventory, including the one R3 file it would touch
(`lib/iskandar-diagnosis-engine/feature-flags.ts`, adding `diagnosisEngine`, default `legacy`).

## Next action

- On approval, start Step B from inventory §7: record golden outputs first, then add
  `lib/diagnosis-engine/`, then switch `entrypoints/background.ts:1728` to the registry.
- Load `.output/chrome-mv3-dev` once in Chrome and click through the side panel; Vitest moved
  from 2.x to 4.x and WXT to 0.20.27 for security fixes.
- Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).
- The CI badge in `README.md` shows no status until `drferdi/Medassist` has a `ci.yml`
  workflow; the logo link renders only for viewers with access (the repository is private).
