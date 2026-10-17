# Sentrapedia — Tinjauan Arsitektur

Tanggal: 2026-10-11 · Commit yang diperiksa: `2d71a200` (branch `codex/oracle-ii-grounding`) plus perubahan belum di-commit pada working tree (lihat §0).

## 0. Cakupan dan metode

- **Metode.** Laporan ini disusun dengan membaca kode sumber. Tidak ada build, test, atau runtime yang dijalankan. Setiap temuan diberi penanda:
  - **Terverifikasi** — kode/config yang disebut sudah dibaca langsung.
  - **Inferensi** — kesimpulan dari pembacaan kode; belum dibuktikan dengan eksekusi.
- **Di luar cakupan.** Folder `theoracle/` (untracked) tidak dianalisis. Prompt model di `mira/service/prompts.py` dan kualitas klinis keluaran model juga tidak dinilai.
- **Perubahan working tree yang terlihat.** `src/lib/mira/presentation.ts`: `oracleSourceLinks` sekarang juga mengembalikan `text` per evidence. Ada juga perubahan CSS/UI kecil di `globals.css`, `document-studio.tsx`, dan `workspace.tsx`.
- **`docs/architecture.md` (2026-10-09) sebagian sudah usang.** Dokumen itu masih menggambarkan MIRA sebagai service eksternal (`MiraRoot`, launcher PowerShell yang menulis `.env.local`), hanya 2 mode yang memakai MIRA, dan `mira-case-form.tsx` yang menduplikasi logika client. Kode saat ini sudah berbeda di ketiga hal tersebut.

### Koreksi terhadap premis brief

| Premis | Temuan di kode | Status |
| --- | --- | --- |
| "14 structured document modes" | `src/lib/drafts.ts:4` mendefinisikan **18** `modeIds`. `clinical-templates.ts` berisi 18 template. **5** mode memakai MIRA (`question`, `ddx`, `workup`, `refer`, `icd10` — `composerUsesMira`), 13 lainnya dibuat secara lokal. Angka 14 di `CONTEXT.md` sudah usang. | Terverifikasi |
| "Fully isolated from external dependencies" | Terisolasi dari monorepo dan proyek lain, tetapi **tidak** dari jaringan. `preflightProvider` (`scripts/mira-runtime.mjs`) memanggil `openrouter.ai` dua kali setiap startup dan menghentikan startup bila gagal. Inference berjalan lewat OpenRouter dengan `MIRA_OPENROUTER_ZDR: "false"`. Citation Oracle II memuat `driveUrl` (Google Drive). Dictation memakai speech service milik vendor browser. | Terverifikasi |
| "A local Oracle II grounding store" (tunggal) | Ada **dua** store: `oracle/sentrapedia.json` (144 record, di-bundle ke client, dipakai `presentation.ts` untuk narasi per ICD-10) dan `oracle-ii/*.sqlite` (72 dokumen, 8.332 halaman, 904 candidate, 182 clinical fact; dibaca server-side lewat `node:sqlite`). | Terverifikasi |
| Next.js di `127.0.0.1:3101`, Python di `.runtime/mira/venv` | Benar. Engine MIRA juga mendengarkan di port loopback acak yang dipilih per run (`freePort`). | Terverifikasi |

---

## 1. Diagram arsitektur

```text
 ┌──────────────────────────── Browser (client) ────────────────────────────┐
 │ components/workspace.tsx  (useReducer, satu komponen koordinator)        │
 │   ├─ generate() ── 13 mode lokal ──► lib/drafts.ts / workflow.ts         │
 │   └─ analyzeMain() ── 5 mode MIRA ─► lib/mira/composer.ts (composerCase) │
 │                                       └► lib/mira/client.ts              │
 │ lib/mira/presentation.ts ◄── oracle/sentrapedia.json (144 record, bundle)│
 │ localStorage "sentrapedia-workspace-v1" (tidak dienkripsi)               │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ POST /api/mira  (same-origin, loopback)
 ┌───────────────────────────────▼─ Next.js server 127.0.0.1:3101 ──────────┐
 │ src/app/api/mira/route.ts → lib/mira/gateway.ts (createMiraGateway)      │
 │   ├─ lib/oracle-grounding.ts ──► oracle-ii/*.sqlite (node:sqlite, RO)    │
 │   └─ fetch Bearer <token per run>, X-MIRA-Case-Origin: synthetic         │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ http://127.0.0.1:<port acak>/v1/diagnosis/step
 ┌───────────────────────────────▼─ MIRA engine (Python 3.11, FastAPI) ─────┐
 │ mira/service/app.py → engine.py (StepEngine) → postchecks.py             │
 │ auth.py (token + rate limit) · privacy.py (PII) · audit.py (JSONL)       │
 └───────────────────────────────┬──────────────────────────────────────────┘
                                 │ HTTPS
                        Gemini API → gemini-3.1-flash-lite

 Supervisor: scripts/run-system.mjs  (menjalankan engine → menunggu /healthz → menjalankan Next.js;
             satu lifecycle; jika salah satu child berhenti, seluruh sistem ikut berhenti)
```

---

## 2. Direktori dan kelompok file

| Lokasi | Peran |
| --- | --- |
| `src/app/` | Shell App Router: `layout.tsx` (`lang="id"`), `page.tsx` → `Workspace`, token CSS (`sentra-tokens.css`, `globals.css` ±85 KB), `api/mira/route.ts` (satu-satunya API route). |
| `src/components/` | UI React. `workspace.tsx` adalah koordinator state dan alur; komponen lain mencakup `composer`, `document-studio`, `diagnosis-document`, `mira-case-form`, `knowledge-dialog`, `work-queue`, `sidebar`, `scribe`/`use-dictation`, dan `thinking-card`. |
| `src/lib/` | Logika murni: `workspace.ts` (model data, reducer, validasi restore), `workflow.ts` (review checklist, revisi, simpan ke localStorage), `drafts.ts` + `note-structure.ts` + `clinical-templates.ts` (18 mode/template lokal), `studio.ts`, `oracle.ts` (search JSON), `oracle-grounding*.ts` (retrieval Oracle II). |
| `src/lib/mira/` | Adapter MIRA: `contract.ts` (validasi skema, regex identitas), `client.ts` (browser → API), `gateway.ts` (server → engine), `composer.ts` (membangun case), `presentation.ts` (format dokumen klinis), `model-profile.ts` (pin model dan budget), schema JSON beserta validatornya, `free-profile.ts` (legacy). |
| `mira/` | Engine Python yang di-bundle: `service/` (FastAPI, engine, prompt, postchecks, audit, auth, privacy), `common/` (provider, data policy, call guard), `managed_child.py` (guardian proses di Windows), `requirements*.lock`, `SOURCE.json`/`LICENSE`. |
| `oracle/` | `sentrapedia.json` (dipakai). `data.ts`, `diseases-data.ts`, dan `diseases.json` tidak di-import oleh `src/`. |
| `oracle-ii/` | Korpus SQLite 24 MB (FTS5) beserta QA report dan source inventory. |
| `scripts/` | `run-system.mjs` (supervisor), `mira-runtime.mjs` (preflight, env engine, cek kesiapan), `install-mira.mjs` (venv + pip lock, dijalankan sebagai `postinstall`), `build-system.mjs` (standalone + engine), `deploy-dry-run.mjs`, `benchmark-oracle-grounding.mjs`. |
| `tests/` | 12 file Vitest (`*.test.ts`) dan 1 test Node (`system-runtime.node-test.mjs`). Test Python ada di `mira/service/tests/`. Belum ada test komponen React atau DOM. |
| `config/`, `docs/`, `.agents/` | Contoh env, dokumentasi/plan/verifikasi, CONTEXT/HANDOFF/DECISIONS. |
| `.runtime/` (git-ignored) | venv Python, stamp instalasi, audit log MIRA. |

---

## 3. Pipeline diagnostik MIRA

### 3.1 Startup (`npm run dev` / `npm start`)

1. `run-system.mjs` memuat `.env.local`, lalu `installedPython()` memastikan venv ada dan SHA-256 `requirements.lock` cocok dengan `.runtime/mira/installed.json`.
2. Token 32-byte dibuat per run (`randomBytes(32)`). `engineEnvironment()` mewajibkan `OPENROUTER_API_KEY` dan memasang profil engine (model, `MIRA_STEP_DEADLINE_S=20`, `MIRA_MAX_USD_PER_STEP=0.10`, `MIRA_DAILY_BUDGET_USD=5`, mode fast).
3. `preflightProvider()` membaca metadata publik OpenRouter (katalog dan endpoint). Startup dibatalkan bila harga melebihi batas atau structured output tidak tersedia.
4. `freePort()` memilih port loopback acak. Uvicorn dijalankan (`service.app:create_app`); di Windows proses dibungkus `managed_child.py`.
5. `/healthz` di-poll selama maksimal 30 detik sampai `engineReady()` lolos (capability `oracle-grounding-v1` dan string versi profil cocok). Setelah itu Next.js dijalankan dengan `MIRA_SERVICE_URL` dan `MIRA_SERVICE_TOKEN` di env.

### 3.2 Satu permintaan analisis

| # | Tahap | File · fungsi | Kontrol utama |
| --- | --- | --- | --- |
| 1 | Klinisi mengirim teks | `workspace.tsx` · `generate()` | `composerUsesMira(mode, personal)` memilih jalur MIRA atau jalur lokal |
| 2 | Kunci UI | `workspace.tsx` · `analyzeMain()` | Satu `AbortController` aktif; teks disimpan untuk dikembalikan bila gagal |
| 3 | Bangun case | `composer.ts` · `composerCase()` | Keluhan, umur numerik ≤130, jenis kelamin, konteks Encounter, catatan pasien; **nama dan ID tidak disalin** |
| 4 | Validasi browser | `client.ts` · `requestMiraAnalysis()` | Konfirmasi data sintetis, `validCase`, `containsIdentity`, lalu POST `/api/mira` |
| 5 | Gerbang server | `gateway.ts` · `step()` | Host/Origin loopback (403), body ≤32 KB, skema, regex identitas, token terkonfigurasi (503), lock `active` (429) |
| 6 | Cek profil | `gateway.ts` · `serviceHealth()` | Versi model terpin dan capability grounding; bila tidak cocok, inference tidak dijalankan |
| 7 | Grounding | `oracle-grounding.ts` · `retrieveOracleGrounding()` | Maks 24 term, FTS5 candidate dan fact (BM25), fallback `LIKE` per halaman, verifikasi hash halaman, filter PII, maks 6 evidence (≤2 per dokumen), bundle dibekukan |
| 8 | Kirim ke engine | `gateway.ts` | Body ≤64 KB, Bearer token, header `synthetic`, timeout 135 detik, `redirect: "error"` |
| 9 | Engine | `mira/service/app.py` · `step()` | Token (HMAC compare), 30 req/menit, ≤65.536 B, skema, header synthetic, `pii_kinds`; `StepEngine.run` (mode fast: diagnosis, workup, dan therapy paralel, masing-masing ×3 salinan); `postchecks.apply`; `audit.write` |
| 10 | Validasi respons | `gateway.ts` | Respons ≤1 MB, tidak memuat token, `validResult`, model = `model+model`, `costUsd` ≤ 0,10, kode error dipetakan ke pesan Indonesia yang tetap |
| 11 | Validasi ulang browser | `client.ts` | `status === "ok"`, `traceId`/`createdAt` valid, grounding wajib ada dan valid |
| 12 | Format dokumen | `presentation.ts` · `miraMessage()` → `miraDraft()` + `oracleCitations()` | Enam bagian (Ringkasan Gejala, DDx, Diagnosis, Penunjang, Terapi Farmakologi, Edukasi); urutan berubah untuk `workup`/`refer`/`icd10`; regimen MIRA ditampilkan lebih dulu, terapi Oracle dipindah ke "Terapi referensi" |
| 13 | Simpan | `workspace.tsx` → reducer `message.add` → `saveLocalWorkspace()` | Seluruh workspace di-serialize ke localStorage; `sourceText` menyimpan case, result, trace, grounding, hash Oracle, dan status "belum ditinjau" |
| 14 | Tampil ulang | `presentation.ts` · `diagnosisContent()` | Draf yang belum disunting dirender ulang dari `sourceText` dengan format terbaru; draf yang sudah disunting ditampilkan apa adanya |

### 3.3 Cuplikan kode kunci

`src/lib/mira/client.ts` — tiga guard sebelum data meninggalkan browser:

```ts
export async function requestMiraAnalysis(caseData: CaseState, options: { synthetic: boolean; signal?: AbortSignal; fetchFn?: typeof fetch }): Promise<MiraAnalysis> {
  if (!options.synthetic) throw new Error("Konfirmasi bahwa keluhan dan konteks menggunakan data fiktif ...");
  if (!validCase(caseData)) throw new Error("Keluhan atau konteks tidak valid atau terlalu panjang.");
  if (containsIdentity(JSON.stringify(caseData))) throw new Error("Hapus identitas dari keluhan dan konteks. ...");
```

`src/lib/mira/gateway.ts:56-58` — urutan penolakan sebelum engine dipanggil:

```ts
if (containsIdentity(JSON.stringify(payload.case))) return failure("IDENTITY", "...", 400);
if (!base || !token) return failure("NOT_CONFIGURED", "...", 503);
if (active) return failure("BUSY", "Analisis lain masih berjalan. ...", 429);
```

`src/lib/mira/presentation.ts:50-57` — pencocokan ICD-10 ke record Oracle (kode tunggal, subkode, atau rentang):

```ts
function referenceIncludes(sourceCode: string, code: string): boolean {
  if (!/^[A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?$/.test(code)) return false;
  return sourceCode.toUpperCase().split(",").some(value => {
    const token = value.trim();
    const range = /^([A-Z]\d{2})-([A-Z]\d{2})$/.exec(token);
    return range ? code.slice(0, 3) >= range[1] && code.slice(0, 3) <= range[2] : code === token || code.startsWith(token + ".");
  });
}
```

`src/lib/mira/presentation.ts:71-77` — format regimen farmakoterapi:

```ts
const regimen = therapy && join([
  `Untuk ${therapy.forDiagnosis.label} (${therapy.forDiagnosis.icd10})`,
  points(therapy.regimen.map(r => [r.drug, r.dose, r.route, r.duration].filter(Boolean).join(" ") + (r.note ? ` (${r.note})` : ""))),
  field("DDI", points(therapy.interactions)),
  field("Kontraindikasi", points(therapy.contraindications)),
]);
```

---

## 4. Temuan

### 4.1 Keamanan dan privasi

| ID | Temuan | Bukti | Status |
| --- | --- | --- | --- |
| S1 | Audit log menyimpan **seluruh request dan response** (teks case, grounding, keluaran model) sebagai plaintext JSONL tanpa rotasi atau retensi. Ukurannya sudah mencapai 915 KB pada satu hari (2026-10-09). | `mira/service/app.py:131` (`"request": payload, "response": response`), `audit.py` (append per hari) | Terverifikasi |
| S2 | `/api/mira` tidak memiliki autentikasi pengguna. Proteksinya hanya kesamaan header `Host`/`Origin` dengan loopback. Klien non-browser bisa memalsukan kedua header tersebut. Risikonya kecil selama server hanya bind ke `127.0.0.1`, tetapi menjadi nyata bila `SENTRAPEDIA_HOST` diubah atau di image Docker (`HOSTNAME=0.0.0.0`). | `gateway.ts:41-52`, `run-system.mjs:79`, `Dockerfile` | Inferensi (bergantung pada cara Next.js menyusun `request.url` dari header `Host`) |
| S3 | Ada tiga detektor identitas dengan pola berbeda: `containsIdentity` (TS, client dan gateway), `sourceTriggersMiraPrivacy` (TS, grounding), dan `PII_PATTERNS` (Python). Input yang lolos di satu lapisan bisa ditolak di lapisan lain, sehingga pesan error yang muncul tidak konsisten. Ketiganya hanya mendeteksi pola: nama tanpa gelar tetap lolos. | `contract.ts`, `oracle-grounding.ts:102`, `mira/service/privacy.py` | Terverifikasi |
| S4 | Proses Next.js menerima `OPENROUTER_API_KEY` di env walaupun tidak memakainya (`webEnv = { ...process.env, ... }`). Hal ini melanggar prinsip least privilege. | `run-system.mjs:77` | Terverifikasi |
| S5 | `MIRA_OPENROUTER_ZDR: "false"`: filter zero-data-retention di provider dimatikan. Ini keputusan yang terdokumentasi, tetapi bertentangan dengan klaim "fully isolated". | `mira-runtime.mjs` | Terverifikasi |
| S6 | Data workspace di localStorage tidak dienkripsi (sudah dinyatakan di README/CONTEXT; hanya untuk data fiktif). | `workspace.tsx:88-89` | Terverifikasi |

**Kontrol yang sudah kuat:** perbandingan token memakai HMAC (`auth.py`); token dibuat ulang setiap run; bentuk URL engine dibatasi (hanya http loopback, tanpa kredensial/path); semua body dibaca dengan batas ukuran (`boundedBody`); `redirect: "error"`; respons ditolak bila memuat token; pesan error provider tidak diteruskan ke pengguna; koneksi SQLite `readOnly` + `PRAGMA query_only`; query FTS memakai parameter terikat dan meng-escape tanda kutip.

### 4.2 Performa

| ID | Temuan | Bukti | Status |
| --- | --- | --- | --- |
| P1 | `retrieveOracleGrounding` berjalan sinkron (`DatabaseSync`) di jalur request Next.js dan memblokir event loop selama query. | `oracle-grounding.ts:252-357` | Terverifikasi |
| P2 | Fallback halaman memakai `lower(text_search) LIKE '%term%'` untuk maksimal 8 term atas 8.332 baris, berupa full scan tanpa index. Fallback ini berjalan setiap kali candidate dan fact menghasilkan kurang dari 6 evidence. | `oracle-grounding.ts:313-336` | Terverifikasi (biaya aktual belum diukur di sini; ada `npm run benchmark:oracle`) |
| P3 | Database dibuka dan ditutup pada setiap request. Request pertama per proses membaca seluruh file 24 MB untuk SHA-256 (setelah itu di-cache berdasarkan size+mtime). | `oracle-grounding.ts:112-120, 259, 355` | Terverifikasi |
| P4 | Setiap analisis menambah satu round-trip `/healthz` sebelum memanggil `/v1/diagnosis/step`. | `gateway.ts:67-70` | Terverifikasi |
| P5 | Seluruh workspace di-`JSON.stringify` ke satu key localStorage pada **setiap** perubahan state, dan setiap pesan MIRA menyimpan `sourceText` lengkap (case + result + grounding hingga 6×1.600 karakter). Biaya serialisasi dan risiko melampaui kuota (umumnya ±5 MB) tumbuh linear dengan riwayat. | `workspace.tsx:89`, `workflow.ts:18`, `presentation.ts:157` | Terverifikasi (kuota: inferensi) |

### 4.3 Skalabilitas, biaya, dan keandalan

| ID | Temuan | Bukti | Status |
| --- | --- | --- | --- |
| C1 | Mode fast mengirim hingga **9 panggilan model paralel per analisis** (3 bagian × `FAST_COPIES = 3`; yang pertama valid dipakai, sisanya dibatalkan dengan biaya tetap dicatat sebagai `estimated-cancelled`). Latensi turun, tetapi biaya per kasus berlipat. | `mira/service/engine.py:37, 167, 230` | Terverifikasi |
| C2 | Lock `let active` hanya berlaku per proses dan per instance gateway: seluruh sistem hanya melayani satu analisis pada satu waktu. Ini sesuai untuk pemakaian lokal oleh satu pengguna, tetapi menjadi batas keras bila dipakai bersama. | `gateway.ts:26` | Terverifikasi |
| C3 | Timeout tidak sinkron: gateway 135.000 ms (`route.ts`), deadline engine 20 detik (`MIRA_STEP_DEADLINE_S`). Nilai budget dan model ditulis di dua tempat (`model-profile.ts` dan `mira-runtime.mjs`). | `route.ts:7`, `mira-runtime.mjs`, `model-profile.ts` | Terverifikasi |
| C4 | `restoreWorkspace` mengembalikan `initialWorkspace` (data demo) bila **satu** record saja gagal validasi. Effect simpan berikutnya lalu menimpa data lama di localStorage. | `workspace.ts:83-92`, `workspace.tsx:89` | Inferensi (alur penimpaan belum diuji) |
| C5 | Startup gagal tanpa retry bila metadata OpenRouter tidak dapat diakses, sehingga UI lokal (13 mode non-MIRA) juga tidak bisa dipakai saat offline. | `mira-runtime.mjs` · `preflightProvider`, `run-system.mjs` | Terverifikasi |

### 4.4 Maintainability dan drift dokumentasi

- `free-profile.ts` beserta cabang `freeModel` di `gateway.ts`, `tests/mira-free.test.ts`, dan `config/mira-free.env.example` adalah kode legacy: `route.ts` tidak pernah mengoper `freeModel`. **Terverifikasi.**
- `oracle/data.ts`, `oracle/diseases-data.ts`, dan `oracle/diseases.json` tidak di-import oleh `src/`. **Terverifikasi.**
- Gaya kode sangat padat (banyak statement per baris; `workspace.tsx` berisi 26 KB dalam 187 baris), sehingga diff dan review sulit dibaca. **Terverifikasi.**
- Nama `.runtime/mira-deepseek/` dan `config/mira-deepseek.env.example` sebenarnya mengonfigurasi Gemini. **Terverifikasi.**
- `CONTEXT.md` (14 template) dan `docs/architecture.md` (alur MIRA eksternal) tidak lagi sesuai dengan kode. **Terverifikasi.**

---

## 5. Rekomendasi perbaikan

| # | Usulan | Alasan | Dampak / risiko |
| --- | --- | --- | --- |
| R1 | **Satu koneksi Oracle II per proses.** Simpan `DatabaseSync` dan prepared statement di modul-level (lazy), hitung `databaseSha256` sekali saat startup, dan ganti fallback `LIKE` dengan tabel FTS5 untuk `source_pages_v2` (atau matikan fallback bila FTS sudah menghasilkan ≥N evidence). | Menghilangkan P1–P3: open/close per request, hashing 24 MB, dan full scan. | Perubahan pada R2/data path; perlu benchmark sebelum/sesudah (`npm run benchmark:oracle`) dan test `oracle-grounding.test.ts`. |
| R2 | **Retensi dan redaksi audit log.** Simpan hanya metadata (trace, status, biaya, latensi, model, hash case) secara default; payload lengkap hanya dicatat lewat flag eksplisit; tambahkan rotasi N hari. | Menutup S1: data klinis (walaupun fiktif) tidak menumpuk sebagai plaintext. | Menyentuh engine Python yang byte-nya dipin di `SOURCE.json`; perlu keputusan Gaffer. |
| R3 | **Satu sumber pola identitas.** Simpan pola di satu file JSON yang dibaca oleh TS dan Python, dan uji keduanya dengan fixture yang sama. | Menutup S3: perilaku tolak/terima menjadi konsisten dan perubahan cukup dilakukan di satu tempat. | Risiko rendah–sedang; berpengaruh ke kontrak privasi. |
| R4 | **Hapus jalur `freeModel` legacy** (`free-profile.ts`, cabang di `gateway.ts`, test dan contoh env terkait). | Mengurangi cabang kode di file keamanan terpenting (`gateway.ts`) tanpa mengubah perilaku runtime. | Risiko rendah; test `mira-free.test.ts` ikut dihapus. |
| R5 | **Satu konstanta profil.** Ekspor model, budget, dan deadline dari satu modul untuk dipakai `route.ts`, `model-profile.ts`, dan `mira-runtime.mjs`; turunkan timeout gateway dari deadline engine + margin. | Menutup C3 dan mencegah drift antara launcher dan gateway. | Risiko rendah. |
| R6 | **Least-privilege env dan persistensi bertahap.** Hapus `OPENROUTER_API_KEY` dari `webEnv` (S4); untuk jangka menengah, pecah localStorage per Encounter atau pindah ke IndexedDB, dan karantina record yang rusak alih-alih reset total (P5, C4). | Mengurangi permukaan kebocoran dan risiko kehilangan data lokal. | S4 sangat kecil; perubahan persistensi butuh migrasi dan test. |

Prioritas yang disarankan: **R4 + R5** (cepat, risiko rendah) → **R1** (performa terukur) → **R2/R3** (privasi; butuh keputusan karena menyentuh kontrak/engine).
