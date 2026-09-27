# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-27 (see `DECISIONS.md`). Install, typecheck, the
capsule test set, build, `start:local`, and the deploy dry run work from the capsule root with
pnpm 11.21.0 and Node 24. CDSS diagnosis access comes from the clinical role only (Chief,
option A). `scripts/test-cdss.ts` reports `PASS: 27 | FAIL: 0`, and any failure sets exit
code 1.

Added `GET /api/doctors/contacts` (crew-authorised, CORS via `handleCorsPreflight`/`jsonWithCors`
like `/api/doctors/online`): lists active doctors (`Dokter`/`Dokter Gigi`, status `ACTIVE`) whose
crew profile has a WhatsApp number, digits normalised (`toWhatsappDigits` — leading `0` becomes
`62`), sorted by username. Backs Assist's "Send to Doctors". A doctor only appears once their
crew profile's WhatsApp number field is filled in. Its test is registered in
`scripts/test-suite.ts` under `intelligence-route`; `pnpm run test` and `pnpm run lint` are green.

## Work in flight

None.

## Blockers

None.

## Next action

1. `auth-hardening` is skipped when `DATABASE_URL` is unset (legacy behaviour); running it needs
   a disposable PostgreSQL with migrations applied.
2. Test runs overwrite the tracked `runtime/test-*.txt` reports; move them to an ignored path.
