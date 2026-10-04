# HANDOFF

Last updated: 2026-10-04

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Install, typecheck, `test:capsule`, build and `start:local` are green (Node 24, pnpm 11.21.0).
This session aligned MedBoard with Med-Assist so Assist payloads are accepted; Chief's direction is
"accept payloads first", the dashboard stays the authoritative engine for now.

Commits on `feat/sidepanel-ui-batch` (not pushed): `73be4057` consult reads glucose, the consult
critical alert stops mislabelling Assist risk as momentum, anamnesis extract takes up to 10000
characters, two RME reason codes; `320ac1af` repo tidy (TASK_CHECKLIST removed, README named
MedBoard with target-design note, testing.md gaps); `ff303c12` untracks the test-run reports
(320ac1af re-recorded them by mistake); `b03a3e41` (R3) the Assist trajectory summary reaches the
CDSS prompt as its own block. New suite `assist-acceptance` runs with `--conditions react-server`.

## Work in flight

None.

## Blockers

None.

## Next action

Decisions for Chief, from the 2026-10-04 Med-Assist contract audit:

1. Clinical rule divergence (R3, row by row): NEWS2 O2 points, consciousness scale, deterioration
   cutoffs 80/55 vs 70/50, momentum per day vs per hour, adult vital red flags, PE and anaphylaxis
   gates, two different `penyakit.json`.
2. Infants: `parseDiagnoseRequestBody` and `/api/clinical/engine/evaluate` reject age 0; accepting
   them means adult NEWS2 runs on infants.
3. Auth-gated: no `POST /api/medlens/ecg/analyze`; no CORS on login/session/passkey routes;
   `CORS_ALLOWED_EXTENSION_IDS` empty and no stable extension key; role values (`DOKTER`, `BIDAN`,
   `CEO`) unknown to Med-Assist (`normalizeRole`); no `/api/auth/refresh`; cookie mode from
   `chrome-extension://` unverified.
4. Bridge queue has no state-transition guard; consult retries are not deduplicated by `event_id`.
   Med-Assist patient-sync sends no SpO2, AVPU or O2 (Med-Assist side).
5. `next.config.ts` traces from the monorepo root (`outputFileTracingRoot` = `D:\DEV\monorepo`);
   `railway.toml` pins Node 22 with npm; CI pins pnpm 9.
6. Publish: no MedBoard remote; `src/lib/cdss/symphony` forbids a public repository; README clone
   URL still points at the legacy `drferdii/intelligenceBoard`.
7. `auth-hardening` is still skipped without `DATABASE_URL`; Docker is available, a disposable
   Postgres run needs `prisma migrate deploy` on it (Chief's yes).
8. `ClinicalTrajectoryV1` panel fetches `/api/patients/[id]/trajectory`, which does not exist.
