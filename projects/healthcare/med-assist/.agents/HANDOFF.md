# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/diagnosis-engine-interface` (from `migrate/healthcare`, not pushed, no PR).

- Earlier (`72a08801`..`e07983ce`): legacy engine behind `lib/diagnosis-engine/`, JSON Schema
  contract, ADR-005 (Proposed), developer/admin MIRA planning-model picker.
- `b5b875a1` (R3, Chief approved): PII false positives fixed in `anonymizer.ts`.
- `3e1b94d4` (R3, Chief approved): `SENTRA_DIAGNOSIS_ENGINE` = `legacy` (default) | `shadow` |
  `mira`. `mira` shows MIRA's list in the existing diagnosis list, tagged "MIRA" / "MIRA · jangan
  terlewat", legacy alerts kept, note "MIRA tidak tersedia" on failure. `VITE_MIRA_DEV_TOKEN` is
  sent as `Authorization: Bearer`. Manifest unchanged (`http://127.0.0.1:*/*` already allowed).

- `da5e99cf`: MIRA header tests no longer read a developer's `.env.local` token.
- `20a0a16d` (R2): the patient extractor reads the RM number from the "Data Pasien" table
  ("No. eRM" followed by "No. RM Lama"); before, the side panel failed closed with "OCR gagal".
  Not yet confirmed by Chief on a live RME page.

Verification on 2026-09-27, all exit 0: lint (1 pre-existing warning); typecheck; test (147
files, 1138 passing, 17 skipped; baseline 1109); build; `run:check`. Token gate PASS; SAFRS R3,
no R3 file outside the approved list.

## Blockers

- The service runs with `MIRA_DATA_POLICY=synthetic-only`, so it refuses real cases
  (`DATA_POLICY`); in `mira` mode the panel then shows "MIRA tidak tersedia". The client does not
  send `X-MIRA-Case-Origin`. Changing the data policy is Chief's decision.
- The service's documented port is 8765; Chief's setup uses 8787, so start uvicorn with
  `--port 8787` or set `VITE_MIRA_SERVICE_URL` to the port in use.
- `.safrs/sensitive-paths.json` does not classify `lib/diagnosis-engine/**` as R3 although it now
  decides what the physician sees; adding it is a verification-control change for Chief.
- Confirmed chronic diagnoses share the five places ahead of the engine list and can push a MIRA
  entry, including a cannot-miss one, out of view (`diagnosis-algorithm.ts` is R3, not changed).
- ADR-005 and Gate 1 cases and thresholds wait for Chief.

## Next action

- Chief: try `mira` with a synthetic case once the data policy allows it; decide the R3
  registration for `lib/diagnosis-engine/**`; review ADR-005.
- Put local settings in `.env.production.local` (gitignored; `wxt build` reads it, Vitest does
  not), then build and reload the extension.
- Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).
