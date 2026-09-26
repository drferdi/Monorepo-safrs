# Audit E2E ASSIST Side Panel

Tanggal: 2026-04-08 Status: Completed (partial-runtime, code-first evidence)
Auditor: Sentra Agent

## Executive Summary

Audit end-to-end jalur ASSIST Side Panel menunjukkan fondasi integrasi utama
sudah aktif (UI -> typed messaging -> background worker -> content script ->
bridge/API), namun masih ada gap kontrak, fitur UI yang belum terhubung ke logic
operasional, dan beberapa risiko keamanan/privasi. Verifikasi lokal sudah
diperluas ke gate otomatis (`typecheck`, `lint`, targeted smoke vitest, `build`,
dan baseline `test:e2e`) dengan hasil hijau.

Top 5 temuan prioritas:

1. **CRITICAL** - Kontrak `ProtocolMap` drift: ada message dideklarasikan tetapi
   tidak punya handler/runtime path aktif (`encounterUpdated`, `updateEncounter`
   flow UI).
2. **CRITICAL** - Kredensial offline hardcoded + offline mode default aktif di
   auth client.
3. **WARNING** - `SettingsConsole` toggle tidak mengontrol engine nyata (UI-only
   preferences, tidak terhubung ke bridge/config engine).
4. **WARNING** - Ada engine config yang tidak pernah bisa dipilih dari tab
   header (`sentratype`, `movi`, `uplink`) sehingga menjadi logic-only/dead
   branch.
5. **WARNING** - Logging background masih verbose dan berpotensi memuat payload
   klinis mentah ke console.

## Scope, Coverage, dan Bukti

### Scope yang diaudit

- Side panel runtime: `entrypoints/sidepanel/main.tsx`
- Flow klinis utama: `TTVInferenceUI`, `ClinicalTrajectory`,
  `ClinicalDifferential`, `SettingsConsole`
- Message contract dan router: `utils/messaging.ts`, `entrypoints/background.ts`
- Eksekutor DOM dan scraper: `entrypoints/content.ts`,
  `entrypoints/inject.content.ts`
- Service/API/store/rules: `lib/api/*`, `lib/rme/transfer-orchestrator.ts`,
  `lib/services/audit-service.ts`, `utils/storage.ts`

### Runtime evidence (lokal)

- `pnpm exec vitest run lib/api/bridge-client.test.ts` -> **pass** (10/10)
- `pnpm exec vitest run components/clinical/TTVInferenceUI.test.tsx` -> **pass**
  (3/3)
- `pnpm exec vitest run lib/iskandar-diagnosis-engine/get-suggestions-flow.integration.test.ts`
  -> **pass** (2/2)
- `pnpm exec vitest run lib/clinical/canonical-triage-builder.test.ts` ->
  **pass** (30/30)
- `pnpm typecheck && pnpm lint` -> **pass**
- `pnpm build` -> **pass**
- `pnpm test:e2e` -> **pass baseline** (command diisolasi ke
  `tests/e2e --pass-with-no-tests` agar tidak false-fail terhadap suite Vitest)

### Batasan audit

- Belum ada akses staging, production logs, tracing backend, dan DB read-only.
- Flow manual klinis real-world (`fetch context`, `AutoComplete+`, `trajectory`,
  `differential`, `transfer RME`, `forward consult`) belum dieksekusi pada
  environment staging berdata dummy.
- Maka status audit ini: **partial audit (code + local runtime verification)**.

### Status smoke execution sheet (staging/manual)

| Flow                   | Status  | Evidence minimum                       | Catatan                |
| ---------------------- | ------- | -------------------------------------- | ---------------------- |
| Login sidepanel        | PASS    | User confirmation + session persisted  | Terkonfirmasi berhasil |
| Fetch context          | PENDING | Screenshot panel + log ringkas non-PHI | Butuh staging run      |
| AutoComplete+          | PENDING | Output inference + duration            | Butuh staging run      |
| Clinical Trajectory    | PENDING | Grafik/risk band tampil + data visit   | Butuh staging run      |
| Differential Diagnosis | PENDING | Suggestions + rationale ringan         | Butuh staging run      |
| Transfer RME           | PENDING | Progress step + final reason code      | Butuh staging run      |
| Forward to Doctor      | PENDING | Consult request success + id/ack       | Butuh staging run      |

## Feature vs Logic Matrix

| Feature ID | UI Feature                              | UI Trigger                                  | Protocol/Message                                                                               | Backend/Service/Rules                                   | Storage/State                                  | Status                         | Bukti                                                                                                           |
| ---------- | --------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| F-01       | Login side panel                        | `ConsoleLogin` tombol power                 | `auth-client.login()` (tanpa `sendMessage`)                                                    | `auth-store` + optional server auth                     | `browser.storage.session/local`                | Connected                      | `components/sidepanel/ConsoleLogin.tsx`, `lib/api/auth-client.ts`, `lib/api/auth-store.ts`                      |
| F-02       | Boot fetch patient context              | mount `main.tsx`                            | `scanMedicalHistory`, `scanVisitHistory`, `scanClinicalContext` + tab message `getPatientInfo` | background router + content scanner                     | state React (`patientData`, `clinicalContext`) | Connected                      | `entrypoints/sidepanel/main.tsx`, `entrypoints/background.ts`, `entrypoints/content.ts`                         |
| F-03       | VS Inference AutoComplete+              | tombol `AutoComplete+`                      | lokal (no message), optional canonical via bridge API                                          | builder + canonical evaluate API                        | local state + output panel                     | Connected                      | `components/clinical/TTVInferenceUI.tsx`, `lib/api/bridge-client.ts`                                            |
| F-04       | Forward to Doctor                       | tombol `Forward to Doctor`                  | direct bridge client call (`/api/doctors/online`, `/api/consult`)                              | bridge API                                              | local state (doctor picker)                    | Connected                      | `components/clinical/TTVInferenceUI.tsx`, `lib/api/bridge-client.ts`                                            |
| F-05       | Clinical Trajectory                     | tab `ClinicalTrajectory`                    | `scanVisitHistory`                                                                             | local analyzer + canonical evaluate                     | prefetched visits + trajectory state           | Connected (fallback aware)     | `components/clinical/ClinicalTrajectory.tsx`                                                                    |
| F-06       | Differential Diagnosis                  | tab `ClinicalDifferential`                  | `getSuggestions`, `getRecommendations`, `resolveTenagaMedis`                                   | SentraAPI + canonical differential                      | diagnosis/therapy transfer state               | Connected                      | `components/clinical/ClinicalDifferential.tsx`, `entrypoints/background.ts`                                     |
| F-07       | RME Uplink stepwise                     | `Auto Fill RME` / `Uplink ...`              | `transferRME`, `cancelRMETransfer`, progress `RME_TRANSFER_PROGRESS`                           | orchestrator + fill handlers                            | transfer run state + reason codes              | Connected                      | `components/clinical/ClinicalDifferential.tsx`, `lib/rme/transfer-orchestrator.ts`, `entrypoints/background.ts` |
| F-08       | Dashboard assist mode selector          | `Clinical/Diagnostic/Therapy Assist` toggle | none                                                                                           | none                                                    | local `activeAssist` only                      | **UI-only**                    | `components/sidepanel/DashboardView.tsx`                                                                        |
| F-09       | Settings feature toggles                | toggle in `SettingsConsole`                 | none                                                                                           | none terhubung ke runtime bridge/auth flags             | localStorage only                              | **UI-only**                    | `components/clinical/SettingsConsole.tsx`                                                                       |
| F-10       | Bridge polling control                  | expected from settings `bridge` toggle      | none from UI                                                                                   | `startBridgePoller`, `isBridgeReady`, `getBridgeConfig` | `sentra:bridge-config`                         | **Logic-only** (no UI binding) | `lib/api/bridge-poller.ts`, `lib/api/bridge-client.ts`                                                          |
| F-11       | Protocol `encounterUpdated`             | tidak ada trigger UI                        | dideklarasi di `ProtocolMap`                                                                   | tidak ada handler aktif                                 | n/a                                            | **Logic-only/dead contract**   | `utils/messaging.ts`, `entrypoints/background.ts`                                                               |
| F-12       | Protocol `updateEncounter` message path | tidak ada sender aktif                      | dideklarasi `ProtocolMap`                                                                      | background update storage internal saja                 | `utils/storage.ts`                             | **Inconsistent contract**      | `utils/messaging.ts`, `entrypoints/background.ts`, `utils/storage.ts`                                           |
| F-13       | Engine tabs extended                    | type union memuat `sentratype/movi/uplink`  | tidak ada tab trigger UI                                                                       | section mapping ada                                     | `activeEngine`                                 | **Logic-only branch**          | `entrypoints/sidepanel/main.tsx`, `components/sidepanel/SidePanelHeader.tsx`                                    |
| F-14       | CDSS widget status tools                | komponen tidak dirender side panel          | `getCDSSStatus`, `getSuggestions`                                                              | handler tersedia                                        | n/a                                            | **Logic-only (unmounted)**     | `components/cdss/CDSSWidget.tsx`, `components/cdss/index.ts`                                                    |

## Temuan Audit Terurut Severity

### CRITICAL-01 - Drift kontrak messaging (`ProtocolMap`) vs runtime handler

- Dampak: ketidakpastian integrasi, potensi silent failure, beban maintenance
  tinggi.
- Evidence:
  - `ProtocolMap` memiliki `encounterUpdated` dan `updateEncounter`.
  - Tidak ditemukan `onMessage('encounterUpdated')` atau
    `onMessage('updateEncounter')`.
  - `updateEncounter()` yang ada dipanggil internal background (bukan melalui
    contract message sender UI/content).
- Root cause: contract-first tidak dijaga oleh contract test otomatis.
- Remediasi:
  - Hapus contract mati atau implementasikan handler + caller end-to-end.
  - Tambahkan contract test yang memvalidasi simetri `ProtocolMap` <->
    `onMessage` handlers.

### CRITICAL-02 - Offline auth default aktif + kredensial hardcoded

- Dampak: risiko akses tidak sah jika build dev/konfigurasi tidak dikunci.
- Evidence:
  - `enableOfflineMode: true` default.
  - `DEV_USERS` memuat username/password literal.
- Root cause: mode dev tidak dipagari oleh env/build guard untuk release
  profile.
- Remediasi:
  - Ganti default `enableOfflineMode` menjadi `false`.
  - Isolasi kredensial dev ke fixture non-production + compile-time guard.
  - Tambahkan startup assertion: block offline auth saat `manifest.version_name`
    production.

### WARNING-01 - Settings UI tidak mengendalikan runtime feature flags

- Dampak: user mengira toggle mengubah sistem, padahal tidak berdampak pada alur
  klinis.
- Evidence:
  - `SettingsConsole` hanya
    `localStorage.setItem('sentra-assist:settings', ...)`.
  - Tidak ada pembacaan kunci ini oleh poller/bridge/router.
  - Bridge runtime justru memakai `sentra:bridge-config` pada `bridge-client`.
- Root cause: belum ada wiring antara settings UI dan service config.
- Remediasi:
  - Mapping eksplisit toggle -> API/config function (`saveBridgeConfig`, auth
    config, dsb).
  - Tampilkan status efektif runtime (source of truth) bukan nilai UI lokal.

### WARNING-02 - Dead branch engine config (`sentratype`, `movi`, `uplink`)

- Dampak: kompleksitas tak perlu dan potensi bug saat refactor.
- Evidence:
  - `EngineId` dan `engineConfig` memuat 6 id.
  - Header tab hanya expose `vs/emergency/settings`.
- Root cause: migrasi UI lama belum dipangkas.
- Remediasi:
  - Sinkronkan union type dengan tab aktual atau expose tab tambahan lengkap.

### WARNING-03 - Logging payload klinis verbose pada background

- Dampak: risiko kebocoran data sensitif lewat log local/devtools.
- Evidence:
  - Banyak `console.warn/error` berisi payload transfer/fill.
- Root cause: debug instrumentation belum diproteksi level/flag produksi.
- Remediasi:
  - Gunakan logger terpusat dengan redaksi PHI.
  - Gate debug dengan env flag yang default off di release.

### WARNING-04 - Build artifact `.output` ikut terindeks sebagai sumber referensi

- Dampak: risiko audit/noise, potensi salah baca artifact alih-alih source.
- Evidence:
  - Banyak hasil search menangkap `.output/chrome-mv3-dev/*`.
- Root cause: output build berada di workspace dan tidak selalu terfilter saat
  audit.
- Remediasi:
  - Tegakkan `.gitignore` dan audit script yang selalu exclude `.output`.

### SUGGESTION-01 - Belum ada OpenAPI/contract artifact untuk endpoint bridge/canonical

- Dampak: sulit deteksi drift schema lintas tim.
- Evidence:
  - Tidak ditemukan file `openapi`/`swagger` pada package ini.
- Remediasi:
  - Publish spec canonical endpoint dan validasi request/response via CI
    contract tests.

## Contoh Template Temuan (format operasional)

Contoh ini mengikuti format wajib agar mudah dipakai ulang saat full audit
staging.

- **ID**: F-001
- **Judul**: Toggle Settings tidak terhubung ke Bridge Poller
- **Severity**: WARNING
- **Flow**: SidePanel -> Settings -> Bridge Sync
- **Expected**: Toggle `Dashboard Sync` menyalakan/mematikan poller bridge
- **Actual**: Toggle hanya menyimpan nilai ke `localStorage` UI
- **Evidence**:
  - `components/clinical/SettingsConsole.tsx`
  - `lib/api/bridge-client.ts` (`saveBridgeConfig`)
  - `lib/api/bridge-poller.ts` (`isBridgeReady`)
- **Root Cause**: Wiring tidak diimplementasi
- **Fix**:
  1. Saat toggle bridge berubah -> panggil `saveBridgeConfig({ enabled })`
  2. Emit feedback status poller pada UI
  3. Tambah test integration settings->poller
- **Acceptance Criteria**:
  - Toggle ON membuat `isBridgeReady()` true (dengan auth valid)
  - Toggle OFF menghentikan alarm poller aktif
  - UI menampilkan status runtime sinkron

## Remediation Plan (Owner, ETA, Effort)

| Priority | Task                                                                                   | Owner               | Effort   | ETA       |
| -------- | -------------------------------------------------------------------------------------- | ------------------- | -------- | --------- |
| P0       | Bersihkan drift `ProtocolMap` (`encounterUpdated`, `updateEncounter`) + contract tests | FE + Extension Core | 1-2 hari | T+2 hari  |
| P0       | Hardening auth: offline mode off by default, remove hardcoded dev creds dari runtime   | Security + FE       | 1 hari   | T+1 hari  |
| P1       | Wiring Settings -> bridge/auth/runtime config nyata                                    | FE                  | 2 hari   | T+4 hari  |
| P1       | Kurangi dead branch engine tab + rapikan type union                                    | FE                  | 0.5 hari | T+3 hari  |
| P1       | Log sanitization dan debug gate untuk PHI-safe output                                  | FE + Security       | 1 hari   | T+5 hari  |
| P2       | OpenAPI/contract artifact + schema validation pipeline                                 | FE + BE             | 2-3 hari | T+10 hari |

## Test Cases dan Acceptance Criteria

### TC-01 Contract Parity Messaging

- Langkah:
  1. Enumerasi key `ProtocolMap`
  2. Enumerasi semua `onMessage('<type>')` di background
  3. Diff dua list
- Expected:
  - Tidak ada type declared-only atau handler-only tanpa alasan.

### TC-02 Settings -> Runtime Bridge Control

- Langkah:
  1. Login valid
  2. Toggle bridge ON dari settings
  3. Verifikasi alarm bridge aktif
  4. Toggle bridge OFF
- Expected:
  - Poller start/stop sinkron dengan toggle.

### TC-03 RME Transfer Resilience

- Langkah:
  1. Trigger `transferRME` step-by-step
  2. Simulasikan no receiver/timeout
  3. Verifikasi reason codes + retry behavior
- Expected:
  - State `success/partial/failed` konsisten dan reason code akurat.

### TC-04 Forward to Doctor Safety

- Langkah:
  1. Isi TTV minimum + pilih dokter
  2. Trigger forward
  3. Verifikasi payload hanya tokenized id (`patient_id_token`) untuk jalur
     audit
- Expected:
  - Konsult terkirim dan ringkasan tampil, tanpa kebocoran kredensial.

## Snippet Verifikasi (Read-Only / Safe)

### 1) Contract drift check (bash/pwsh)

```bash
rg "onMessage\\('" entrypoints/background.ts
rg "interface ProtocolMap|updateEncounter|encounterUpdated" utils/messaging.ts
```

### 2) API smoke (curl, no credential hardcoded)

```bash
curl -X GET "$BRIDGE_BASE/api/doctors/online" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BRIDGE_BASE/api/clinical/engine/evaluate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @canonical-request-sample.json
```

### 3) SQL read-only (contoh audit metadata)

```sql
SELECT consult_id, created_at, status
FROM consult_events
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
```

### 4) Log query (Kibana/Splunk concept)

```text
service:sentra-assist AND event:"RME_TRANSFER_*" AND level:(warn OR error)
```

### 5) E2E skeleton (Playwright)

```ts
test('settings bridge toggle controls runtime', async ({ page }) => {
  await page.goto('chrome-extension://<id>/sidepanel.html');
  await page.getByText('Pengaturan').click();
  await page.getByText('Dashboard Sync').click();
  // assert runtime status badge/log endpoint
});
```

## Monitoring dan Rollback Criteria

- Golden Signals:
  - Latency `transferRME` per step (`anamnesa/diagnosa/resep`)
  - Error rate per message type
  - Traffic `scanVisitHistory` dan `sendConsultToDoctor`
  - Saturation worker (concurrency poller)
- Rollback trigger:
  - error rate transfer meningkat > 5% selama 30 menit
  - mismatch severity canonical vs UI lokal > threshold yang disepakati
  - incident privasi/logging PHI terdeteksi

## Akses Tambahan yang Diperlukan untuk Full Audit

1. Staging environment siap data dummy klinis
2. Read-only log access (worker, API gateway, dashboard engine)
3. Read-only DB untuk tabel consult/bridge/audit
4. API contract artifact (OpenAPI/JSON schema)
5. Tracing correlation ID dari UI -> background -> API

## Estimasi Durasi

- Partial audit (yang selesai di dokumen ini): ~1 hari
- Full audit (dengan staging + log + DB + tracing): 3-5 hari kerja
