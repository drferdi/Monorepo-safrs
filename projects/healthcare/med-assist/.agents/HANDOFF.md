# HANDOFF

Last updated: 2026-09-27 (evening)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/diagnosis-engine-interface` (from `migrate/healthcare`, not pushed, no PR).

- Earlier (`72a08801`..`e07983ce`): legacy engine behind `lib/diagnosis-engine/`, JSON Schema
  contract, ADR-005 (Proposed), developer/admin MIRA planning-model picker.
- `b5b875a1` (R3): PII false positives fixed in `anonymizer.ts`.
- `3e1b94d4` (R3): `SENTRA_DIAGNOSIS_ENGINE` = `legacy` (default) | `shadow` | `mira`; `mira` shows
  MIRA's list tagged "MIRA" / "MIRA · jangan terlewat", keeps legacy alerts, notes "MIRA tidak
  tersedia" on failure; `VITE_MIRA_DEV_TOKEN` sent as Bearer. `da5e99cf`: test isolation.
- `20a0a16d` (R2): RM number read from the "Data Pasien" table (the "OCR gagal" cause).
- MIRA works end to end: the service runs with `MIRA_DATA_POLICY=openrouter-zdr` (Chief), and the
  first real side-panel request returned `ok` (4 diagnoses incl. one cannot-miss, 9.7 s, US$0.016).
  Visual check in the panel pending Chief.
- Local build settings (gitignored): `.env.production.local` holds only
  `SENTRA_DIAGNOSIS_ENGINE=mira`; `.env.local` is the single source of `VITE_MIRA_SERVICE_URL`
  (`http://127.0.0.1:8787`) and `VITE_MIRA_DEV_TOKEN` (equal to the service token, fingerprint
  `dev-b1a8771b`). Do not put the engine flag in `.env.local`: Vitest reads it.

Verification on 2026-09-27, all exit 0: lint (1 pre-existing warning); typecheck; test (147
files, 1138 passing, 17 skipped); build (rebuilt evening, bundle checked: flag `mira`, URL 8787,
service token); `run:check`. Token gate PASS; SAFRS R3, no R3 file outside the approved list.

## Open items (Chief decides)

1. Service timeout cost gap (MIRA repo), waits for "perbaiki".
2. `.safrs/sensitive-paths.json` lacks `lib/diagnosis-engine/**` as R3 (verification control).
3. `mira` UI limits: no MIRA tag on selected-diagnosis cards; RME transfer carries MIRA's English
   label; confirmed chronic diagnoses can push a MIRA cannot-miss entry out of the five places.
4. After an extension reload, `getPatientInfo` is not re-injected into an open ePuskesmas tab (F5
   works around it); the fix touches the protected `entrypoints/sidepanel/main.tsx`.
5. PII trade-offs of `b5b875a1` (lower-case name after a title, all-caps name after "Ibu",
   digitless RM no longer caught; also affects redaction before the OpenAI reranker).
6. ADR-005 and the Gate 1 case set and thresholds.
7. Whether MIRA's assessment step must always fill cannotMiss.
8. Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).

## Next action

- Chief: confirm the MIRA tags in the side panel, then pick an open item.
- The MIRA service on 8787 runs in Chief's terminal; agents may not stop or restart it.
