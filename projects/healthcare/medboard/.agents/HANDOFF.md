# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-27 (see `DECISIONS.md`). Install, typecheck, the
capsule test set, build, `start:local`, and the deploy dry run work from the capsule root with
pnpm 11.21.0 and Node 24.

## Work in flight

None.

## Blockers

None. Known test gaps below are deliberately left as they were in legacy (Chief, 2026-09-27).

## Next action

Fix these in the new Monorepo, with Chief's approval (clinical logic is R3):

1. `scripts/test-cdss.ts` has 4 failing cases hidden by the commented-out
   `// process.exitCode = 1;` (line 1463), so `test` passes while the report says
   `PASS: 21 | FAIL: 4`:
   - "Auth CDSS diagnose: role non-klinis ditolak dengan 403": an ADMIN whose profession is
     Perawat gets 200. The route allows a clinical role OR a clinical profession; the test
     expects role only. Access-policy decision for Chief.
   - Three "Autocomplete klinis" cases for "nyeri pinggang" and "nyeri punggung" map to the
     wrong symptom chain.
   After fixing, restore the exit code so failures fail `test`.
2. `auth-hardening` is skipped when `DATABASE_URL` is unset (legacy behaviour); running it needs
   a disposable PostgreSQL with migrations applied.
3. Test runs overwrite the tracked `runtime/test-*.txt` reports; move them to an ignored path.
