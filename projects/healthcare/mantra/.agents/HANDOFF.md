# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated to `projects/healthcare/mantra` on 2026-09-27 (see `DECISIONS.md`) with a static
SAFRS contract (`smoke: none`). `pnpm project:verify healthcare/mantra` passes: install, the
static `test` (`scripts/capsule_check.py`), `build` (`compileall`), `run`, and the deploy dry
run. `bench-apps.lock.json` pins every upstream app by repository, ref, and commit.

## Work in flight

None.

## Blockers

None.

## Next action

1. The full runtime (bench, MariaDB, Redis) and `bench run-tests` are not part of the contract;
   run them in the dev container (`matra.bat`) when changing app code.
2. The five `sentra_mantra_*` app repositories do not exist on GitHub yet (Chief will create
   them). Push each app's `wip/pre-safrs-migration` there once they exist.
