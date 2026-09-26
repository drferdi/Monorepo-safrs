# ASSIST Side Panel Remediation Backlog

Tanggal: 2026-04-08 Sumber: `2026-04-08-assist-sidepanel-e2e-audit-report.md`

## Prioritized Backlog

| ID    | Priority | Finding                                    | Task                                                                                                           | Owner             | Effort   | ETA  | Dependency |
| ----- | -------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------- | -------- | ---- | ---------- |
| RB-01 | P0       | Drift contract `ProtocolMap` vs runtime    | Audit semua key `ProtocolMap`, hapus yang mati atau implement handler+caller, lalu tambah contract parity test | FE Extension Core | 1-2 hari | T+2  | none       |
| RB-02 | P0       | Offline auth default + hardcoded dev creds | Set default offline mode `false`, pindahkan dev users ke mode test-only, tambahkan release guard               | Security + FE     | 1 hari   | T+1  | RB-01      |
| RB-03 | P1       | Settings UI tidak wired ke runtime         | Hubungkan toggle bridge ke `saveBridgeConfig`, tampilkan status runtime efektif di UI                          | FE                | 2 hari   | T+4  | RB-02      |
| RB-04 | P1       | Dead branch engine tabs                    | Sinkronkan `EngineId` dengan tab aktual atau implement tab tambahan end-to-end                                 | FE                | 0.5 hari | T+3  | none       |
| RB-05 | P1       | Verbose logging berisiko PHI               | Refactor ke logger terpusat + redaction + env gating                                                           | FE + Security     | 1 hari   | T+5  | RB-02      |
| RB-06 | P2       | Tidak ada OpenAPI/contract artifact        | Publish schema canonical/bridge dan validasi via CI contract test                                              | FE + BE           | 2-3 hari | T+10 | RB-01      |

## Implementation Update (2026-04-08)

- RB-01 (completed): message kontrak mati `encounterUpdated` dan
  `updateEncounter` sudah dihapus dari `ProtocolMap` agar sinkron dengan handler
  aktif.
- RB-02 (completed): auth hardening sudah diterapkan:
  - `enableOfflineMode` default diubah menjadi `false`
  - kredensial offline tidak lagi hardcoded; kini dibaca dari env
    `VITE_DEV_LOGIN_*`
  - offline auth dibatasi ke build dev atau explicit
    `VITE_ALLOW_OFFLINE_AUTH=true`
- RB-03 (completed): toggle `Dashboard Sync` pada `SettingsConsole` sudah wired
  ke `saveBridgeConfig/getBridgeConfig` dan menampilkan status runtime efektif
  (`ready/disabled/auth required/error`).
- RB-04 (completed): `EngineId` dan `engineConfig` di sidepanel disinkronkan ke
  tiga tab aktual (`vs`, `emergency`, `settings`) tanpa branch dead config.
- RB-05 (completed): hardening log berisiko pada jalur runtime kritikal:
  - payload mentah transfer tidak lagi di-`console.warn/error`
  - worker boot banner verbose dipindah ke scoped debug logger
  - warning fetch patient di sidepanel entry dipindah ke structured logger
  - sweep `console.*` selesai pada `entrypoints/*`, `entrypoints/content.ts`,
    `entrypoints/inject.content.ts`, `lib/api/sentra-api.ts`,
    `lib/handlers/page-diagnosa.ts`, dan `lib/handlers/page-resep.ts`
- RB-06 (completed phase-1): artifact contract + guard runtime + parity test
  sudah tersedia:
  - `CANONICAL_CLINICAL_ENGINE_OUTPUT_SCHEMA` dan
    `CANONICAL_DIFFERENTIAL_OUTPUT_SCHEMA` ditambahkan di
    `lib/api/bridge-client.ts`
  - runtime guard `isCanonicalClinicalEngineOutput()` dan
    `isCanonicalDifferentialOutput()` menahan contract drift saat evaluate
  - parity tests diperluas di `lib/api/bridge-client.test.ts`
  - script `pnpm run test:contract` ditambahkan di `package.json`
- Validation update:
  - `pnpm exec eslint` untuk seluruh file perubahan: pass
  - `pnpm exec tsc --noEmit`: pass
  - `pnpm exec vitest run lib/api/bridge-client.test.ts`: pass
  - targeted smoke suite pass:
    - `bridge-client.test.ts`
    - `TTVInferenceUI.test.tsx`
    - `get-suggestions-flow.integration.test.ts`
    - `canonical-triage-builder.test.ts`
  - `pnpm build`: pass
  - baseline `pnpm test:e2e`: pass (command diisolasi ke `tests/e2e` dengan
    `--pass-with-no-tests` agar tidak false-fail karena suite Vitest)

## Acceptance Criteria per Backlog Item

### RB-01

- Semua key pada `ProtocolMap` punya status jelas: implemented atau removed.
- Tidak ada message type orphan (declared-only atau handler-only) tanpa
  whitelist.
- CI test gagal otomatis jika ada drift baru.

### RB-02

- Build production menolak offline auth.
- Tidak ada kredensial statik di runtime source.
- Login gagal aman bila config auth tidak valid.

### RB-03

- Toggle `Dashboard Sync` mengubah state `sentra:bridge-config.enabled`.
- Poller berhenti saat OFF dan aktif saat ON (dengan session valid).
- UI menampilkan status `ready/disabled/not-authenticated` dari runtime.

### RB-04

- `EngineId` dan tab header konsisten.
- Tidak ada section config tak terpakai.

### RB-05

- Tidak ada payload klinis mentah di log level default.
- Debug payload hanya muncul saat explicit debug flag aktif.

### RB-06

- Ada schema request/response untuk endpoint bridge/canonical.
- Contract test memvalidasi shape payload UI terhadap schema backend.

## Verification Checklist (post-fix)

- [x] `pnpm typecheck` pass
- [x] `pnpm lint` pass
- [x] `pnpm test` pass untuk suite sidepanel/bridge/engine terkait
- [x] Contract parity script menunjukkan 0 drift
- [ ] Manual smoke: login, fetch context, AutoComplete+, trajectory,
      differential, transfer RME, forward consult
- [x] Tidak ada PHI leak di console log default (berdasarkan sweep logging +
      sanitasi payload)

## Suggested Owner Mapping

- FE Extension Core: RB-01, RB-03, RB-04
- Security: RB-02, RB-05
- BE Platform/Engine: RB-06
