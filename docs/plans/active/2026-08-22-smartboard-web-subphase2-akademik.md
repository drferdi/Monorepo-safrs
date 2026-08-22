<!-- markdownlint-configure-file { "MD013": false } -->
# Smartboard `apps/web` Sub-fase 2: Penjadwalan + Akademik Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

- **Status:** PROPOSED — menunggu persetujuan Chief sebelum Task 1 dieksekusi.
- **Owner:** Chief
- **Roadmap:** `docs/plans/active/2026-08-21-smartboard-web-roadmap.md` (baris 2/5)
- **Pendahulu:** `docs/plans/completed/2026-08-21-smartboard-web-subphase1-foundation.md` (COMPLETED — scaffold, auth, shell, Master › Murid)

**Goal:** Port 8 halaman penjadwalan + akademik dari `frontend/` arsip (~5.219 baris halaman + ~880 baris komponen/lib pendukung) ke `projects/academic-smartboard/apps/web`, memakai fondasi sub-fase 1 (axios cookie-session, `ProtectedRoute`, `AppShell`, `DataTable`, primitif token) — sampai seorang pengajar bisa: melihat jadwal mingguan, membuka daftar sesi, membuka satu sesi, mengisi absensi + evaluasi, lalu melihat perkembangan murid dan peta kurikulum, semuanya terhadap backend FastAPI arsip.

**Architecture:** Tidak ada perubahan arsitektur dari sub-fase 1. Tetap Next.js 16 `output: "export"`, client-only, semua halaman `"use client"`, data lewat `@tanstack/react-query` + `apiClient` (axios `withCredentials`). Route dinamis `/sesi/[id]` dan `/akademik/perkembangan/[studentId]` di static export TIDAK bisa di-prerender per-id (id datang dari backend runtime) — dipakai `generateStaticParams()` kosong + `dynamicParams` tidak berlaku pada `output: "export"`, jadi pola yang dipakai adalah **satu route statis dengan id di query string** ATAU shell route yang membaca id dari `useParams()` hasil `generateStaticParams` placeholder. Keputusan terbuka #1 di bawah menetapkan default: **query string** (`/sesi?id=...`) DITOLAK demi kesetiaan URL arsip — dipakai `generateStaticParams()` yang mengembalikan satu segmen sentinel dan client-side fetch by `useParams()`; lihat Task 3 Step 1 yang memverifikasi ini secara empiris SEBELUM halaman apa pun ditulis.

**Tech Stack:** Sama seperti sub-fase 1, ditambah dua dependensi baru via `catalog:` (versi persis dari `frontend/package.json` arsip): `recharts` 3.6.0 (grafik perkembangan murid) dan `sonner` 2.0.3 (toast). TIDAK ditambah: `framer-motion` (roadmap keputusan #4 — dan lihat temuan di bawah: `lib/dashboardMotion.js` arsip sudah inert, `detailEnter`/`riseItem`/`staggerContainer` semuanya `{}` kosong, jadi `motion.*` di arsip praktis tidak menganimasikan apa pun; diganti elemen biasa + CSS `prefers-reduced-motion`), `swr`, `date-fns`, `react-router-dom`.

**Spec:** `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md` (Fase 3) + `docs/adrs/0003-smartboard-migration.md` + roadmap keputusan lintas sub-fase 1–6.

**Sumber:** `D:/Devops/abyss-monorepo/apps/academic/smartboard/frontend/src/` (read-only). Referensi backend read-only (TIDAK di-port): `backend/models.py`, `backend/routes_ops.py`, `backend/routes_curriculum.py`, `backend/routes_progression.py`, `backend/routes_journal.py`.

## Temuan audit sumber (2026-08-22 — dasar semua task di bawah)

Ukuran halaman arsip yang masuk sub-fase ini:

| Halaman arsip | Baris | Route arsip | Roles di `App.js` | Roles di nav `Layout.jsx` |
| --- | --- | --- | --- | --- |
| `Jadwal.jsx` | 605 | `/jadwal` | `owner, admin_akademik, tentor` | sama |
| `SesiList.jsx` | 271 | `/sesi` | (tanpa `roles` — semua role login) | `owner, admin_akademik, tentor, murid_ortu, finance` |
| `SesiDetail.jsx` | 1128 | `/sesi/:id` | (tanpa `roles`) | (tidak ada di nav) |
| `Evaluasi.jsx` | 114 | `/evaluasi` | (tanpa `roles`) | `owner, admin_akademik, tentor, murid_ortu` |
| `PerkembanganMurid.jsx` | 1715 | `/akademik/perkembangan` + `/akademik/perkembangan/:studentId` | `owner, admin_akademik, tentor, murid_ortu` | sama |
| `Kurikulum.jsx` | 420 | `/akademik/kurikulum` | keenam role | sama |
| `KurikulumSelaras.jsx` | 424 | `/akademik/keselarasan` | keenam role | sama |
| `KurikulumCakupan.jsx` | 542 | `/akademik/cakupan` | `owner, admin_akademik, tentor` | sama |

**Perbedaan roles route vs nav adalah nyata di arsip, bukan salah baca:** `/sesi`, `/sesi/:id`, `/evaluasi` diproteksi tanpa daftar role (semua user login boleh), sementara nav menyembunyikannya dari sebagian role. Port apa adanya: `ProtectedRoute` tanpa `roles` untuk ketiga route itu, pembatasan role hanya di `NAV_GROUPS`. Jangan "rapikan" jadi seragam.

Komponen + lib pendukung yang di-import 8 halaman itu (semua wajib ikut diport):

| Sumber arsip | Baris | Dipakai oleh |
| --- | --- | --- |
| `lib/labels.js` | 101 | Jadwal, SesiList, SesiDetail, PerkembanganMurid |
| `lib/curriculumPhase.js` | 12 | SesiDetail, KurikulumCakupan, Kurikulum |
| `components/PageHead.jsx` | 40 | kedelapan halaman |
| `components/EmptyInvite.jsx` | 47 | KurikulumSelaras, KurikulumCakupan, PerkembanganMurid |
| `components/CurriculumReadingPane.jsx` | 232 | Kurikulum, KurikulumSelaras, KurikulumCakupan |
| `components/CurriculumPhaseBanner.jsx` | 38 | PerkembanganMurid |
| `components/CpPickerModal.jsx` | 260 | SesiDetail |
| `components/AttendanceCatchUp.jsx` | 124 | SesiDetail |
| `lib/dashboardMotion.js` | 26 | SesiList, SesiDetail — **inert**, tidak diport |

Endpoint backend yang disentuh sub-fase ini (hasil grep `api.<method>(` pada 8 halaman + 5 komponen; semua relatif terhadap `${NEXT_PUBLIC_BACKEND_URL}/api`):

- Master (sudah sebagian ada di `lib/api.ts`): `GET /students`, `GET /tutors`, `GET /subjects`, `GET /schools`, `GET /grade-levels`
- Jadwal: `GET /schedules`, `POST /schedules`, `PUT /schedules/{id}`, `DELETE /schedules/{id}`
- Sesi: `GET /sessions`, `GET /sessions?{query}`, `GET /sessions/{id}`, `POST /sessions/{id}/attendance`, `POST /sessions/{id}/verify`, `POST /sessions/{id}/cancel`, `POST /sessions/{id}/reschedule`, `POST /sessions/{id}/evaluations`, `POST /sessions/{id}/evaluations/draft`, `POST /tutor/check-in`, `POST /tutor/check-out`, `POST /attendance/catch-up`
- Kurikulum: `GET /curriculum/status`, `GET /curriculum/structure`, `GET /curriculum/outcomes`, `GET /curriculum/outcomes?{query}`, `GET /curriculum/alignment`, `GET /curriculum/coverage`
- Perkembangan: `GET /students/{id}/progression{query}`

Endpoint yang **sengaja TIDAK dipakai** sub-fase ini walau ada di file yang diport (lihat Non-goals): `GET /students/{id}/journal`, `POST /journal`, `POST /students/{id}/journal/parent-message`, `POST /students/{id}/progression/summary-draft`.

Bentuk data (dari `backend/models.py`, read-only): `Schedule` (`schedule_id, student_ids[], tutor_id, subject_id, school_id?, grade_id?, team_id?, format, mode, location, date, start_time, end_time, is_recurring, recurrence_days[], recurrence_until?, notes, status, created_by?, created_at`), `LearningSession` (`session_id, schedule_id?, student_ids[], tutor_id, subject_id, school_id?, grade_id?, format, mode, location, date, scheduled_start, scheduled_end, actual_start?, actual_end?, status, verified, verified_by?, verified_at?, notes, created_at`), `StudentAttendance` (`att_id, session_id, student_id, status, check_time?, reason, note, recorded_by_tutor_id?, updated_at`). Konstanta status: `STUDENT_ATT_STATUS = [hadir, terlambat, izin, sakit, tidak_hadir]`, `TUTOR_ATT_STATUS = STUDENT_ATT_STATUS + [digantikan, dibatalkan]`.

## Non-goals (eksplisit — bagian file arsip yang TIDAK diport di sub-fase ini)

1. **Panel Jurnal Kolaboratif di `PerkembanganMurid.jsx`** (kurang lebih baris 900–1180 arsip: state `journal/observation/recommendation/parentSummary/parentMessage`, `journalPanel`, `saveEntry`, `saveParentMessage`, dan ketiga endpoint `journal`). Roadmap baris 4 menempatkan "JournalEntry (di dalam Perkembangan)" di sub-fase 4. Halaman detail Perkembangan di sub-fase 2 berhenti pada grafik + kalender kehadiran; slot jurnal ditinggalkan sebagai komentar penanda `{/* Jurnal Kolaboratif — sub-fase 4 */}`, bukan komponen kosong yang di-render.
2. **`KayyisaTrajectoryPanel` di `PerkembanganMurid.jsx`** (baris ~118–330 arsip: efek typewriter, `POST /students/{id}/progression/summary-draft`, label model AI). Roadmap baris 5 memiliki "widget chat Kayyisa". Sama: penanda komentar, tidak dirender.
3. **`TemplateEvaluasi`** (sub-fase 5). Halaman `Evaluasi.jsx` arsip TIDAK mereferensi template sama sekali (diverifikasi: file 114 baris, hanya `GET /sessions|students|subjects|tutors` + link ke `/sesi/{id}`), jadi tidak ada dependensi terputus.
4. **`Dashboard.jsx`**, **`Pengajar.jsx`**, **`TutorialPenggunaan.jsx`** — lihat Keputusan terbuka #5 (tidak tercantum di baris roadmap mana pun).
5. Perubahan `packages/token/scope.txt`, `projects/academic-smartboard/AGENTS.md`, `.github/workflows/**` — tidak diperlukan: `projects/academic-smartboard/apps/web/src` **sudah** terdaftar di `packages/token/scope.txt` dan perintah `apps/web` sudah ada di capsule `AGENTS.md` (keduanya diselesaikan di Task 11 sub-fase 1). Sub-fase 2 karena itu TIDAK punya branch kontrol terpisah.

## Prasyarat (blocking — jangan mulai sebelum terpenuhi)

1. Plan ini disetujui Chief (status `PROPOSED` → `ACTIVE`).
2. **Tree kerja bersih dari pekerjaan asing.** Per audit 2026-08-22 tree utama KOTOR: perubahan uncommitted milik sesi/agent lain di `packages/api/**`, `packages/database/**`, `packages/schemas/**`, `packages/auth/**` (baru), `projects/sentrabot/**` (baru), `projects/academic-smartboard/apps/site/src/components/*.tsx`, dan **8 file di `projects/academic-smartboard/apps/web/src/`** (konversi utilitas Tailwind `[var(--x)]` → `(--x)`). Delapan file terakhir menabrak langsung scope plan ini. Harus di-commit/di-stash/di-buang oleh pemiliknya sebelum Task 1.
3. `pnpm task list --active` bersih dari lease yang overlap `projects/academic-smartboard/apps/web/`. Verifikasi ulang di Task 1 (per sub-fase 1 pernah ada bentrok lease `TASK-20260821-SENTRABOT-*` di `packages/token/scope.txt`; sub-fase ini tidak menyentuh file itu, jadi risiko bentrok lebih kecil).
4. Backend FastAPI arsip TIDAK dibutuhkan untuk Task 1–15 (semua build-time/unit). Dibutuhkan (dijalankan manual Chief di luar monorepo) hanya untuk verifikasi manual Task 16.

## Global Constraints

- Semua dependensi baru via `catalog:` di `pnpm-workspace.yaml`. Sub-fase ini menambah **tepat dua** entri: `recharts: 3.6.0`, `sonner: 2.0.3`. `minimumReleaseAge: 1440` berlaku — kalau salah satu versi ditolak gate umur, naikkan ke rilis stabil terdekat yang lolos dan catat di Catatan eksekusi (jangan turunkan `minimumReleaseAge`).
- Warna/radius/spasi HANYA token `@sentra/token` (`var(--color-*)`, `var(--radius-*)`, `var(--space-*)`) — nol hex mentah. `recharts` menerima warna lewat prop JS, bukan CSS class: pola arsip (`CHART_TOKENS` + `getComputedStyle(document.documentElement).getPropertyValue(name)`) diport apa adanya karena itulah cara membaca token ke SVG; jangan hardcode warna chart.
- Copy UI Indonesia diambil **verbatim** dari arsip (judul `PageHead`, label kolom tabel, teks empty state, teks toast). Jangan menulis ulang copy tanpa arahan Chief.
- `ProtectedRoute` dipakai persis seperti arsip (lihat tabel roles di atas — termasuk 3 route tanpa daftar role).
- Kerja di worktree `../Monorepo.worktrees/<branch>`; Conventional Commits; `bash scripts/safrs-verify.sh` sebelum klaim selesai.
- **Centang checkbox task di commit yang sama dengan pekerjaan task itu** — bukan ditunda ke task terakhir (pelajaran proses sub-fase 1 Task 10). Sitasi di dalam checkbox pakai path repo-root-relative penuh (`projects/academic-smartboard/apps/web/src/lib/labels.ts`), bukan nama file telanjang — `check_status_claims.py` menolak nama bare.
- Karantina permanen, tidak pernah dibaca/disalin: `raw_data/**`, semua `.env*`, `backend/scripts/cloud_tokens.env` (grep eksplisit nama file — TIDAK cocok glob `.env*`), `node_modules/`, `build/`, `.venv/`.
- Kalau ada PII nyata ditemukan di `frontend/src/**` atau `backend/*.py` (bukan `raw_data/`), STOP task itu dan lapor Chief (roadmap keputusan #6).
- **Setiap endpoint baru yang dipanggil sub-fase ini wajib dicek otorisasinya di server.** `ProtectedRoute` hanya menyembunyikan UI; siapa pun bisa memanggil backend langsung. Sebelum sebuah halaman dianggap selesai, buka `routes_*.py` yang melayani endpoint-nya dan pastikan ada dependency role/tenant di sana. 24 endpoint sub-fase ini terdaftar di Temuan audit sumber; kalau ada satu saja yang tidak punya pemeriksaan role sisi server, STOP task itu dan lapor Chief — jangan port halaman yang mengekspos data tanpa penjaga.
- Batas keamanan deploy (security header di host, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `CORS_ORIGINS`) didokumentasikan di `projects/academic-smartboard/apps/web/AGENTS.md` § "Batas keamanan". Sub-fase ini tidak boleh melemahkannya, dan Task 16 memverifikasinya ulang.

## Keputusan terbuka (milik Chief — default plan berjalan tanpa memblokir)

| # | Keputusan | Default plan ini |
| --- | --- | --- |
| 1 | Route dinamis (`/sesi/{id}`, `/akademik/perkembangan/{studentId}`) pada `output: "export"` — Next.js butuh `generateStaticParams()`, sedangkan id hanya diketahui runtime | Pertahankan bentuk URL arsip. Task 3 memverifikasi empiris pendekatan `generateStaticParams()` sentinel + `useParams()` client-side; kalau `next build` menolak, fallback yang dipakai adalah query string (`/sesi?id=...`) dan itu dicatat sebagai deviasi URL di Catatan eksekusi. Yang TIDAK boleh dilakukan tanpa keputusan Chief: mengubah `output: "export"` menjadi server-rendered |
| 2 | `sonner` (2.0.3) sebagai dependensi toast baru vs menulis toast sendiri di atas token Sentra | Pakai `sonner` — arsip memanggil `toast.success/error` di 3 halaman, menulis ulang berarti menciptakan komponen baru yang bukan bagian port. Styling diarahkan ke token lewat `toastOptions` |
| 3 | `recharts` (3.6.0) untuk grafik perkembangan murid vs menunda grafik | Pakai `recharts` — tanpa grafik, halaman detail Perkembangan kehilangan isi utamanya. Ukuran bundle diterima karena `apps/web` adalah app internal berlogin, bukan halaman publik |
| 4 | Testing komponen React (RTL + jsdom) — sub-fase 1 memutuskan SKIP (keputusan terbuka #5 di plan itu) | Tetap SKIP untuk konsistensi; test dibatasi unit murni (`labels.ts`, `curriculumPhase.ts`, helper `api.ts`, transformasi baris tabel, filter, agregasi kalender) + `test:build`. **Catatan penting untuk Chief:** arsip PUNYA test RTL untuk 4 halaman sub-fase ini (`Kurikulum.test.jsx`, `KurikulumSelaras.test.jsx`, `KurikulumCakupan.test.jsx`, `PerkembanganMurid.test.jsx`) yang TIDAK bisa diport tanpa RTL. Kalau Chief mau paritas test, itu keputusan cross-cutting (catalog `@testing-library/react` + `jsdom` untuk semua app) yang layak diambil SEKARANG, sebelum 3 sub-fase sisanya menumpuk hutang yang sama |
| 5 | `Dashboard.jsx`, `Pengajar.jsx`, `TutorialPenggunaan.jsx` tidak muncul di baris roadmap 1–5 mana pun (dikonfirmasi dengan membaca kelima baris roadmap dan seluruh isi `pages/`) | Plan ini TIDAK menyerap ketiganya diam-diam. Default: dicatat di sini + satu baris catatan di roadmap agar Chief menentukan sub-fasenya. `Dashboard.jsx` relevan karena `App.js` mengarahkan `*` → `/dashboard`; selama belum diport, root `/` `apps/web` tetap seperti sub-fase 1 |
| 6 | Panel "Honor Tentor untuk Sesi Ini" di `SesiDetail.jsx` — menampilkan angka honor, sementara halaman payroll ada di sub-fase 3 | Diport di sub-fase 2 sebagai bagian utuh `SesiDetail` (read-only, datanya datang dari `GET /sessions/{id}` yang sudah dipanggil) — memotongnya berarti merender halaman yang tidak setia pada arsip |

## Peta route target

| Arsip | Route `apps/web` | `ProtectedRoute roles` |
| --- | --- | --- |
| `pages/Jadwal.jsx` | `/jadwal` | `owner, admin_akademik, tentor` |
| `pages/SesiList.jsx` | `/sesi` | (tanpa `roles`) |
| `pages/SesiDetail.jsx` | `/sesi/[id]` | (tanpa `roles`) |
| `pages/Evaluasi.jsx` | `/evaluasi` | (tanpa `roles`) |
| `pages/PerkembanganMurid.jsx` (list) | `/akademik/perkembangan` | `owner, admin_akademik, tentor, murid_ortu` |
| `pages/PerkembanganMurid.jsx` (detail) | `/akademik/perkembangan/[studentId]` | `owner, admin_akademik, tentor, murid_ortu` |
| `pages/Kurikulum.jsx` | `/akademik/kurikulum` | keenam role |
| `pages/KurikulumSelaras.jsx` | `/akademik/keselarasan` | keenam role |
| `pages/KurikulumCakupan.jsx` | `/akademik/cakupan` | `owner, admin_akademik, tentor` |

## Struktur file target (tambahan di atas sub-fase 1)

```text
projects/academic-smartboard/apps/web/src/
├── app/
│   ├── jadwal/page.tsx
│   ├── sesi/page.tsx
│   ├── sesi/[id]/page.tsx
│   ├── evaluasi/page.tsx
│   └── akademik/
│       ├── perkembangan/page.tsx
│       ├── perkembangan/[studentId]/page.tsx
│       ├── kurikulum/page.tsx
│       ├── keselarasan/page.tsx
│       └── cakupan/page.tsx
├── components/
│   ├── PageHead.tsx
│   ├── StatusBadge.tsx           STATUS_BADGE arsip -> token
│   ├── EmptyState.tsx            port EmptyInvite.jsx
│   ├── Panel.tsx                 .panel/.panel__head/.panel__title arsip -> token
│   ├── ChipTabs.tsx              .chips[role=tablist] arsip (Jadwal, Kurikulum, Selaras)
│   ├── CurriculumReadingPane.tsx
│   ├── CurriculumPhaseBanner.tsx
│   ├── CpPickerModal.tsx
│   ├── AttendanceCatchUp.tsx
│   └── ScheduleForm.tsx          form create/edit jadwal
└── lib/
    ├── labels.ts                 + labels.test.ts
    ├── curriculumPhase.ts        + curriculumPhase.test.ts
    ├── api.ts                    (diperluas) + api.test.ts (diperluas)
    ├── nav.ts                    (diperluas ke NAV_GROUPS) + nav.test.ts
    ├── week.ts                   agregasi minggu Jadwal + week.test.ts
    └── progression.ts            transformasi data grafik/kalender + progression.test.ts
```

Branch tunggal: `feat/smartboard-web-akademik` (Task 2–16). Tidak ada branch kontrol (lihat Non-goals #5).

---

### Task 1: Prasyarat, klaim task, worktree, commit plan

**Files:** Commit: `docs/plans/active/2026-08-22-smartboard-web-subphase2-akademik.md`, `docs/plans/active/2026-08-21-smartboard-web-roadmap.md`, `docs/plans/active/README.md`

- [ ] **Step 1**: Dari tree utama `d:\DEV\Monorepo` (CLI mencap `worktree_id` saat klaim; semua transisi state berikutnya WAJIB dari tree yang sama):

```bash
pnpm task list --active
git status -sb
```

Pastikan tidak ada lease yang overlap `projects/academic-smartboard/apps/web/` dan Prasyarat #2 (tree bersih) sudah terpenuhi. Kalau 8 file `apps/web/src` masih dirty milik sesi lain — STOP, lapor Chief.

- [ ] **Step 2**: Klaim task:

```bash
pnpm task claim --id TASK-20260822-SMARTBOARD-WEB-AKADEMIK \
  --title "Port apps/web sub-fase 2: penjadwalan + akademik" \
  --scope projects/academic-smartboard/apps/web --scope pnpm-workspace.yaml
```

- [ ] **Step 3**: Update baris 2 roadmap (`docs/plans/active/2026-08-21-smartboard-web-roadmap.md`) → kolom Plan diisi path plan ini, Status `ACTIVE`. Tambah baris catatan di roadmap tentang 3 halaman tak tercakup (Keputusan terbuka #5). Tambah baris plan ini ke tabel `docs/plans/active/README.md`.
- [ ] **Step 4**: Commit `docs(plan): add smartboard apps/web sub-phase 2 plan`.
- [ ] **Step 5**: Buat worktree: `git worktree add ../Monorepo.worktrees/feat-smartboard-web-akademik -b feat/smartboard-web-akademik`. Semua Task 2–15 dikerjakan di sana.

### Task 2: Katalog dependensi + toast provider

**Files:** Modify: `pnpm-workspace.yaml`, `projects/academic-smartboard/apps/web/package.json`, `projects/academic-smartboard/apps/web/src/app/providers.tsx`, `pnpm-lock.yaml`

- [ ] **Step 1**: Tambah ke `catalog:` (urut alfabetis): `recharts: 3.6.0`, `sonner: 2.0.3`.
- [ ] **Step 2**: Tambah `"recharts": "catalog:"` dan `"sonner": "catalog:"` ke `dependencies` `@sentra/smartboard-web`. `pnpm install`.
- [ ] **Step 3**: Mount `<Toaster />` sonner di `providers.tsx` (di dalam `QueryClientProvider`), dengan `toastOptions` yang memetakan warna ke token (`--color-background-surface`, `--color-text-primary`, `--color-border-subtle`, `--color-status-critical`, `--color-status-success`) dan `richColors` mati supaya tidak menyuntik hex sendiri.
- [ ] **Step 4**: `pnpm --filter @sentra/smartboard-web build` PASS; `node scripts/check-tokens.mjs --audit` nol pelanggaran baru.
- [ ] **Step 5**: Commit `chore(web): add recharts and sonner to catalog`. Perubahan `pnpm-workspace.yaml`/lock = **R2** (dependensi) — tandai di pesan commit.

### Task 3: Verifikasi route dinamis pada static export (spike, memblokir Task 8 & 15)

**Files:** Create sementara lalu jadikan permanen: `projects/academic-smartboard/apps/web/src/app/sesi/[id]/page.tsx`

- [ ] **Step 1**: Tulis stub `/sesi/[id]/page.tsx` minimal: `"use client"`, baca `useParams()`, render id. Tambah `export function generateStaticParams() { return [{ id: "placeholder" }] }` di file server wrapper kalau perlu (client component tidak boleh mengekspor `generateStaticParams`; pola yang dipakai: `page.tsx` server tipis yang mengekspor `generateStaticParams` + merender komponen client `SesiDetailClient`).
- [ ] **Step 2**: `pnpm --filter @sentra/smartboard-web build`. Catat hasilnya: apakah `out/sesi/placeholder/index.html` terbentuk, dan apakah membuka `/sesi/<id-nyata>/` dari server statis menghasilkan 404. Sekalian buktikan di spike yang sama apakah `useParams()` dan `useSearchParams()` menuntut `<Suspense>` saat prerender — hasilnya mengikat Task 9, 10, dan 15.
- [ ] **Step 3**: Kalau 404 (kemungkinan besar untuk hosting statis polos) — pilih dan catat **satu** strategi permanen: (a) `next.config.ts` `trailingSlash` + rewrite di server hosting, (b) satu route `/sesi/[id]` dengan daftar id di-generate saat build (TIDAK mungkin — id runtime), atau (c) fallback query string `/sesi?id=...`. Default plan: (c) kalau (a) menuntut server. Tulis hasil keputusan sebagai catatan permanen di plan ini (Catatan eksekusi) — Task 10, 11, dan 15 mengikuti keputusan ini. **Pada fallback (c):** hapus folder `src/app/sesi/[id]/` dan `src/app/akademik/perkembangan/[studentId]/`, lalu perbarui bagian "Struktur file target", "Peta route target", dan header **Files** Task 10/11/15 di Catatan eksekusi — supaya `tests/build-output.test.mjs` Task 16 tidak meng-assert route yang tidak pernah terbit.
- [ ] **Step 4**: Commit `spike(web): resolve dynamic route strategy for static export`.

### Task 4: Port `lib/labels.ts` + `lib/curriculumPhase.ts`

**Files:** Create: `projects/academic-smartboard/apps/web/src/lib/labels.ts`, `projects/academic-smartboard/apps/web/src/lib/labels.test.ts`, `projects/academic-smartboard/apps/web/src/lib/curriculumPhase.ts`, `projects/academic-smartboard/apps/web/src/lib/curriculumPhase.test.ts`

- [ ] **Step 1**: Port `frontend/src/lib/labels.js` → TypeScript: `ROLE_LABEL`, `FORMAT_LABEL`, `MODE_LABEL`, `SESSION_STATUS_LABEL`, `ATTEND_LABEL`, `COMPETENCE_LABEL`, `rupiah()`, `fmtDate()`, `fmtDateShort()` — nilai string **verbatim**. `STATUS_BADGE` arsip memetakan status ke class warna (`badge-blue`/`badge-yellow`/`badge-green`/`badge-red`/`badge-gray`); ganti nilainya menjadi tipe union semantik (`"info" | "warning" | "success" | "critical" | "neutral"`) yang dikonsumsi `StatusBadge` (Task 6) — pemetaan status→severity tetap identik dengan arsip, hanya namanya yang jadi token-friendly.
- [ ] **Step 2**: `fmtDate`/`fmtDateShort` arsip pakai `Date#toLocaleDateString('id-ID', …)`. Monorepo punya `dayjs` di catalog dan sudah terpasang di `apps/web`. Tulis ulang dengan `dayjs` + locale `id` supaya output deterministik lintas mesin/CI, dan tulis test yang mengunci format keluaran persis ("Sen, 04 Agu 2026" / "04 Agu"). Kalau `dayjs/locale/id` menghasilkan string berbeda dari `toLocaleDateString`, pertahankan output arsip dan catat.
- [ ] **Step 3**: Port `curriculumPhase.js` (`PHASES`, `phaseForGrade(stage, order)`) apa adanya + test yang mencakup batas tiap fase: SD 1,2→A; 3,4→B; 5,6→C; SMP→D; SMA 10→E; 11,12→F; input tidak valid → `null`.
- [ ] **Step 4**: `pnpm --filter @sentra/smartboard-web test` PASS. Verifikasi merah: ubah satu nilai label, test harus FAIL, kembalikan.
- [ ] **Step 5**: Commit `feat(web): port label and curriculum phase helpers`, centang Task 4 di plan pada commit yang sama.

### Task 5: Perluas `lib/api.ts` (tipe + helper terketik)

**Files:** Modify: `projects/academic-smartboard/apps/web/src/lib/api.ts`, `projects/academic-smartboard/apps/web/src/lib/api.test.ts`

- [ ] **Step 1**: Tambah tipe dari `backend/models.py` (read-only): `Schedule`, `ScheduleCreate`, `LearningSession`, `StudentAttendance`, `Tutor`, `Subject`, `School`, `GradeLevel`, `CurriculumStatus`, `CurriculumStructure`, `CurriculumOutcome`, `CurriculumAlignment`, `CurriculumCoverage`, `ProgressionData`. Field opsional ditandai `?`/`| null` sesuai `Optional[...]` di Pydantic — jangan menebak; buka `models.py` per tipe.
- [ ] **Step 2**: Tambah helper: `listSchedules`, `createSchedule`, `updateSchedule`, `deleteSchedule`, `listSessions(query?)`, `getSession(id)`, `saveAttendance(id, rows)`, `verifySession(id)`, `cancelSession(id, reason)`, `rescheduleSession(id, payload)`, `submitEvaluation(id, payload)`, `draftEvaluation(id, payload)`, `tutorCheckIn`, `tutorCheckOut`, `attendanceCatchUp`, `listTutors`, `listSubjects`, `listSchools`, `listGradeLevels`, `getCurriculumStatus`, `getCurriculumStructure`, `listCurriculumOutcomes(query?)`, `getCurriculumAlignment`, `getCurriculumCoverage(query?)`, `getStudentProgression(studentId, query?)`.
- [ ] **Step 3**: Test: bangun query string `listSessions`/`listCurriculumOutcomes`/`getStudentProgression` dari objek filter (kunci kosong dihilangkan, nilai di-`encodeURIComponent`) — ekstrak jadi fungsi murni `buildQuery()` yang diuji tanpa jaringan, pola sama seperti test `api.test.ts` sub-fase 1.
- [ ] **Step 4**: `pnpm --filter @sentra/smartboard-web test && pnpm --filter @sentra/smartboard-web typecheck` PASS.
- [ ] **Step 5**: Commit `feat(web): typed API helpers for scheduling and academics`, centang Task 5.

### Task 6: Primitif UI bersama (PageHead, StatusBadge, Panel, ChipTabs, EmptyState)

**Files:** Create: `projects/academic-smartboard/apps/web/src/components/PageHead.tsx`, `.../StatusBadge.tsx`, `.../Panel.tsx`, `.../ChipTabs.tsx`, `.../EmptyState.tsx`

- [ ] **Step 1**: Port `frontend/src/components/PageHead.jsx` (props `seq`, `eyebrow`, `title`, `lede`, `actions`) — layout dan copy sama, styling ditulis ulang dengan token.
- [ ] **Step 2**: SEBELUM menulis `StatusBadge`, verifikasi token status yang benar-benar ada: `grep -n "color-status" packages/token/src/tokens.css`. Kalau salah satu dari `--color-status-info` / `--color-status-warning` / `--color-status-success` / `--color-status-neutral` absen, pakai token terdekat yang ada dan catat di Catatan eksekusi — **jangan** menambah token baru (perubahan token = R2 milik Chief). Perlakuan sama seperti `--color-data-4` di Task 15 Step 2.
- [ ] **Step 3**: `StatusBadge` mengonsumsi severity dari `labels.ts` Task 4 → token status hasil Step 2 + `--color-text-*`. Kontras WCAG 2.2 AA wajib (gate `check-tokens.mjs` menghitung ulang kontras).
- [ ] **Step 4**: `Panel` (`.panel`, `.panel__head`, `.panel__title` arsip) dan `ChipTabs` (`.chips` `role="tablist"` + `aria-pressed`, dipakai Jadwal minggu/daftar, Kurikulum fase, Selaras jenjang). `ChipTabs` mempertahankan `data-testid` arsip di mana ada (`view-week`, `view-list`).
- [ ] **Step 5**: `EmptyState` port dari `EmptyInvite.jsx` (props `title`, `lede`, aksi opsional) — dipakai state kosong/loading/error di Kurikulum trio dan Perkembangan.
- [ ] **Step 6**: Semua interaktif ≥ `var(--target-min)` (44px) sesuai `packages/token/UI-RULES.md`. `node scripts/check-tokens.mjs --audit` nol pelanggaran.
- [ ] **Step 7**: Commit `feat(web): shared page primitives for academic pages`, centang Task 6.

### Task 7: Navigasi bergrup (nav.ts + AppShell)

**Files:** Modify: `projects/academic-smartboard/apps/web/src/lib/nav.ts`, `projects/academic-smartboard/apps/web/src/lib/nav.test.ts`, `projects/academic-smartboard/apps/web/src/components/AppShell.tsx`

- [ ] **Step 1**: Ubah `NAV_ITEMS` datar menjadi `NAV_GROUPS: { title: string; items: NavItem[] }[]` mengikuti `frontend/src/components/Layout.jsx` baris 70–132: grup `Utama` (Smartboard/Pengumuman — **belum ada di sub-fase ini**, jangan tambahkan entri ke halaman yang belum diport), `Operasional` (Kalender & Jadwal; Sesi Pembelajaran), `Akademik` (Evaluasi Murid; Perkembangan Murid; Kurikulum Nasional; Keselarasan Kurikulum; Cakupan Kurikulum), plus `Master` (Murid — dari sub-fase 1). Label dan daftar `roles` **verbatim** dari `Layout.jsx`.
- [ ] **Step 2**: `filterByRole` menjadi `filterGroupsByRole` yang membuang item tak berizin dan membuang grup yang jadi kosong. Test: tiap dari 6 role menghasilkan daftar yang tepat; `content_manager` misalnya hanya melihat Kurikulum + Keselarasan.
- [ ] **Step 3**: `AppShell` merender judul grup (`--font-size-label`, uppercase, `--color-text-secondary`) di atas item; state aktif tetap memakai `stripTrailingSlash` yang sudah ada.
- [ ] **Step 4**: `pnpm --filter @sentra/smartboard-web test` PASS (termasuk test nav lama yang harus diperbarui, bukan dihapus).
- [ ] **Step 5**: Commit `feat(web): grouped role-aware navigation`, centang Task 7.

### Task 8: Halaman `/jadwal`

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/jadwal/page.tsx`, `projects/academic-smartboard/apps/web/src/components/ScheduleForm.tsx`, `projects/academic-smartboard/apps/web/src/lib/week.ts`, `projects/academic-smartboard/apps/web/src/lib/week.test.ts`

Sumber: `frontend/src/pages/Jadwal.jsx` (605 baris).

- [ ] **Step 1**: `lib/week.ts` — fungsi murni: `weekDaysOf(anchor)` (7 tanggal, Senin-awal seperti `DAY_NAMES` arsip), `groupSchedulesByDate(schedules)` → `Record<'YYYY-MM-DD', Schedule[]>`, `isToday(dateKey)`. Test mengunci batas minggu, pergantian bulan, dan tahun kabisat.
- [ ] **Step 2**: Halaman: `PageHead seq="OPS" eyebrow="Operasional" title="Kalender & Jadwal" lede="Jadwal berulang yang menurunkan sesi pembelajaran. Perubahan jadwal tidak mengubah sesi yang sudah terbit."` + `ChipTabs` Mingguan/Daftar + tombol "Tambah jadwal" (hanya `canManage`: `owner`/`admin_akademik` — verifikasi definisi `canManage` persis di arsip sebelum menulis).
- [ ] **Step 3**: Tampilan mingguan: grid 7 kolom, navigasi ‹ / › / "Hari Ini", tiap item menampilkan `start_time—end_time`, nama mapel, nama tutor; `data-testid` arsip dipertahankan (`view-week`, `view-list`, `btn-prev-week`, `btn-next-week`, `sched-{schedule_id}`, `btn-tambah-jadwal`).
- [ ] **Step 4**: Tampilan daftar memakai `DataTable` yang ada bila cukup; kalau butuh kolom aksi (edit/hapus), perluas `DataTable` dengan kolom render kustom opsional — **perluas, jangan fork**, karena sub-fase 3–5 akan memakainya juga.
- [ ] **Step 5**: `ScheduleForm`: field persis arsip — `date`, `format` (`FORMAT_LABEL`), `start_time`, `end_time`, `mode` (`MODE_LABEL`), `location`, `tutor_id`, `subject_id`, `school_id`, `grade_id`, `student_ids` (multi-checkbox, header "Murid (n)"), `is_recurring` + `recurrence_days` + `recurrence_until`, `notes`. Validasi arsip: tolak submit bila `tutor_id`/`subject_id` kosong atau `student_ids` kosong (toast error, teks verbatim). Create/update/delete lewat `useMutation` + invalidate `["schedules"]`.
- [ ] **Step 6**: `pnpm --filter @sentra/smartboard-web lint typecheck test build` PASS; `check-tokens.mjs --audit` bersih.
- [ ] **Step 7**: Commit `feat(web): port jadwal page`, centang Task 8.

### Task 9: Halaman `/sesi` (daftar sesi)

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/sesi/page.tsx`

Sumber: `frontend/src/pages/SesiList.jsx` (271 baris).

- [ ] **Step 1**: `PageHead seq="OPS" eyebrow="Operasional" title="Sesi Pembelajaran"` (lede verbatim dari arsip). Filter arsip (search + filter mapel/tutor/status) diport; state filter di URL `useSearchParams` seperti arsip — di App Router pakai `useSearchParams()` + `router.replace` dengan `scroll: false`. **Wajib:** komponen yang memanggil `useSearchParams()` dibungkus `<Suspense>`, kalau tidak `next build` gagal dengan "useSearchParams() should be wrapped in a suspense boundary" pada halaman yang diprerender — pola sama seperti server-wrapper tipis Task 3.
- [ ] **Step 2**: Kolom tabel verbatim: Tanggal · Jam · Mata pelajaran · Pengajar · Format / Mode · (num) · Status · (aksi, `hide-sm`). Isi kolom `num` diverifikasi ulang dari arsip baris 198–201 sebelum ditulis.
- [ ] **Step 3**: `motion.*` + `useReducedMotion` + `detailEnter` arsip DIHAPUS (inert, lihat Tech Stack). Kalau ada animasi masuk yang benar-benar terlihat, ganti CSS `@media (prefers-reduced-motion: reduce)` sesuai preseden `apps/site`.
- [ ] **Step 4**: Baris menautkan ke `/sesi/{session_id}` sesuai keputusan Task 3.
- [ ] **Step 5**: Test unit untuk fungsi filter/pencarian (murni, tanpa render). `lint typecheck test build` PASS.
- [ ] **Step 6**: Commit `feat(web): port sesi list page`, centang Task 9.

### Task 10: `/sesi/[id]` bagian A — informasi, absensi, aksi status

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/sesi/[id]/page.tsx` (isi penuh menggantikan stub Task 3), `projects/academic-smartboard/apps/web/src/components/AttendanceCatchUp.tsx`

Sumber: `frontend/src/pages/SesiDetail.jsx` baris ~1–605 + `components/AttendanceCatchUp.jsx`.

- [ ] **Step 1**: Panel "Informasi Sesi" — tanggal, jam terjadwal vs aktual, format/mode/lokasi, mapel, tutor, murid, status (`StatusBadge`).
- [ ] **Step 2**: Panel "Absensi Pengajar" — tombol `btn-checkin`/`btn-checkout` (`POST /tutor/check-in`, `/tutor/check-out`), aturan enable/disable persis arsip (verifikasi kondisi di sekitar baris 365–470).
- [ ] **Step 3**: Panel "Absensi Murid" — satu baris per murid, status dari `STUDENT_ATT_STATUS` (`ATTEND_LABEL`), `check_time`, `reason`, `note`; simpan lewat `btn-save-attendance` (`POST /sessions/{id}/attendance`).
- [ ] **Step 4**: `AttendanceCatchUp` diport (`POST /attendance/catch-up`), termasuk kondisi kapan komponen muncul.
- [ ] **Step 5**: Aksi status: `btn-verify` (`POST /sessions/{id}/verify`), `btn-cancel-session` (`POST /sessions/{id}/cancel`), modal reschedule + `btn-save-reschedule` (`POST /sessions/{id}/reschedule`, payload `{date, start_time, end_time, reason}`). Gating role/status persis arsip.
- [ ] **Step 6**: `lint typecheck test build` PASS. Commit `feat(web): port sesi detail — info and attendance`, centang Task 10.

### Task 11: `/sesi/[id]` bagian B — evaluasi, CP picker, panel honor

**Files:** Modify: `projects/academic-smartboard/apps/web/src/app/sesi/[id]/page.tsx`; Create: `projects/academic-smartboard/apps/web/src/components/CpPickerModal.tsx`

Sumber: `frontend/src/pages/SesiDetail.jsx` baris ~606–1128 + `components/CpPickerModal.jsx` (260 baris).

- [ ] **Step 1**: Panel "Evaluasi Murid" — form per murid dengan skala kompetensi `COMPETENCE_LABEL` (`belum_memahami`…`menguasai`), catatan; `btn-draft-eval` → `POST /sessions/{id}/evaluations/draft`, `btn-submit-eval` → `POST /sessions/{id}/evaluations`. Untuk role `murid_ortu` catatan internal pengajar TIDAK ditampilkan (aturan ini eksplisit di `Evaluasi.jsx` lede; verifikasi perilaku setara di `SesiDetail.jsx` sebelum menulis).
- [ ] **Step 2**: `CpPickerModal` — memuat `GET /curriculum/outcomes?{query}` dengan filter fase/jenjang/mapel; `btn-pick-cp`, `btn-change-cp`, `btn-clear-cp`, `btn-pick-cp-disabled` dipertahankan. Fase default dihitung `phaseForGrade(stage, order)` dari `grade_id` sesi.
- [ ] **Step 3**: Panel "Honor Tentor untuk Sesi Ini" — read-only, format `rupiah()` (Keputusan terbuka #6).
- [ ] **Step 4**: Modal (`CpPickerModal`, reschedule) memenuhi pola dialog aksesibel: fokus terjebak, `Esc` menutup, `aria-modal`, tombol ≥44px.
- [ ] **Step 5**: `lint typecheck test build` PASS. Commit `feat(web): port sesi detail — evaluation and CP picker`, centang Task 11.

### Task 12: Halaman `/evaluasi`

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/evaluasi/page.tsx`

Sumber: `frontend/src/pages/Evaluasi.jsx` (114 baris — seluruh isinya sudah dibaca dan dipetakan).

- [ ] **Step 1**: Muat paralel `GET /sessions|/students|/subjects|/tutors`, indeks by id. Filter status verbatim: `['menunggu_evaluasi','menunggu_verifikasi','berlangsung','terverifikasi']`.
- [ ] **Step 2**: `PageHead seq="AKA" eyebrow="Akademik" title="Evaluasi Murid"` dengan lede bercabang role verbatim: untuk `murid_ortu` "Ringkasan perkembangan belajar anak per sesi. Catatan internal pengajar tidak ditampilkan.", selain itu "Isi dan tinjau evaluasi murid per sesi. Sesi tidak dapat masuk payroll sebelum seluruh evaluasi selesai."
- [ ] **Step 3**: Ringkasan "{n} sesi" + "Sesi yang sudah berjalan atau lebih lanjut". Kolom: Tanggal · Mata pelajaran · Pengajar · Murid · Status · aksi. Empty state verbatim: "Belum ada sesi yang perlu dievaluasi." Badge status: `menunggu_evaluasi` → "Belum diisi" (warning), `terverifikasi` → "Terverifikasi" (success), selainnya "Dalam proses" (neutral). Link `btn-open-eval-{session_id}` → "Buka sesi".
- [ ] **Step 4**: Test unit untuk fungsi filter status + perakitan baris. `lint typecheck test build` PASS. Commit `feat(web): port evaluasi page`, centang Task 12.

### Task 13: Trio kurikulum — `/akademik/kurikulum`, `/akademik/keselarasan`, `/akademik/cakupan`

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/akademik/kurikulum/page.tsx`, `.../keselarasan/page.tsx`, `.../cakupan/page.tsx`, `projects/academic-smartboard/apps/web/src/components/CurriculumReadingPane.tsx`

Sumber: `Kurikulum.jsx` (420), `KurikulumSelaras.jsx` (424), `KurikulumCakupan.jsx` (542), `components/CurriculumReadingPane.jsx` (232).

- [ ] **Step 1**: `CurriculumReadingPane` lebih dulu (dipakai ketiganya) — port struktur + interaksi, styling token.
- [ ] **Step 2**: `/akademik/kurikulum`: `PageHead seq="AKA" eyebrow="Akademik" title="Kurikulum Nasional 2026"`, `GET /curriculum/status` + `GET /curriculum/structure`, `ChipTabs` fase (`PHASES` A–F), pohon struktur yang bisa dibuka-tutup (ikon `ChevronDown`/`ChevronRight`), state kosong/gagal via `EmptyState`.
- [ ] **Step 3**: `/akademik/keselarasan`: `title="Keselarasan Kurikulum"`, `GET /curriculum/alignment` + `GET /curriculum/outcomes`, `ChipTabs` jenjang, matriks "Matriks penawaran × panduan" (header kolom per `grade_id`, sel = status keselarasan). Tabel lebar wajib `overflow-x: auto` di kontainernya sendiri — body halaman tidak boleh menggeser horizontal.
- [ ] **Step 4**: `/akademik/cakupan`: `title="Cakupan Kurikulum"`, `GET /curriculum/coverage|structure|outcomes|/grade-levels`, pemilih ruang lingkup ("Pilih ruang lingkup cakupan"), tabel Capaian Pembelajaran (Kode CP · Elemen · Status · Aksi), panel detail CP terpilih.
- [ ] **Step 5**: Empty/loading/error state verbatim dari arsip ("Memuat peta keselarasan", "Peta belum dapat dimuat", "Belum ada penawaran yang dipetakan", "Memuat cakupan kurikulum", "Cakupan belum dapat dimuat", "Data cakupan belum tersedia").
- [ ] **Step 6**: `lint typecheck test build` PASS. Commit `feat(web): port curriculum pages`, centang Task 13. Kalau task ini terasa >1 siklus test saat dieksekusi, pecah commit per halaman — plan mengizinkan 3 commit di bawah task ini.

### Task 14: `/akademik/perkembangan` (daftar murid)

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/akademik/perkembangan/page.tsx`, `projects/academic-smartboard/apps/web/src/components/CurriculumPhaseBanner.tsx`

Sumber: `PerkembanganMurid.jsx` baris ~340–880 + `components/CurriculumPhaseBanner.jsx`.

- [ ] **Step 1**: `CurriculumPhaseBanner` (memanggil `GET /curriculum/structure` + `GET /grade-levels`) diport.
- [ ] **Step 2**: Daftar murid dengan pencarian (`q`), `GET /students`, kartu/baris menuju `/akademik/perkembangan/{student_id}`. Untuk role `murid_ortu`, daftar dibatasi ke `student_ids` milik user (verifikasi mekanisme persis di arsip — kemungkinan filter client-side atas respons backend yang sudah ter-scope).
- [ ] **Step 3**: `EmptyState` bila kosong. Test unit fungsi pencarian.
- [ ] **Step 4**: `lint typecheck test build` PASS. Commit `feat(web): port student progression list`, centang Task 14.

### Task 15: `/akademik/perkembangan/[studentId]` (grafik + kalender kehadiran)

**Files:** Create: `projects/academic-smartboard/apps/web/src/app/akademik/perkembangan/[studentId]/page.tsx`, `projects/academic-smartboard/apps/web/src/lib/progression.ts`, `projects/academic-smartboard/apps/web/src/lib/progression.test.ts`

Sumber: `PerkembanganMurid.jsx` baris ~880–1715 **dikurangi** panel Jurnal dan panel Kayyisa (Non-goals #1 dan #2).

- [ ] **Step 1**: `lib/progression.ts` — fungsi murni yang mengubah respons `GET /students/{id}/progression` menjadi seri grafik (`compare` = murid vs rata-rata kelas; `metrics` = understanding/focus/participation/independence) dan menjadi matriks kalender kehadiran per tanggal. Test mengunci agregasi, tanggal kosong, dan filter mapel.
- [ ] **Step 2**: Grafik `recharts` dengan palet dibaca dari token lewat `getComputedStyle` (pola `CHART_TOKENS` arsip: `student → --color-accent`, `classAvg → --color-status-warning`, `grid → --color-border-subtle`, `axis`/`tick` → `--color-text-secondary`, tooltip → `--color-background-canvas` + `--color-border-subtle`, `understanding → --color-accent`, `focus → --color-accent-text`, `participation → --color-status-warning`, `independence → --color-data-4`). Verifikasi keenam token itu ada di `packages/token/src/tokens.css`; kalau `--color-data-4` tidak ada, pilih token data yang ada dan catat — **jangan** memperkenalkan warna baru (perubahan token = R2 milik Chief).
- [ ] **Step 3**: Kalender kehadiran + pemilih rentang (`rangeId` arsip: `month` default) + filter mapel + toggle `chartMode` compare/metrics.
- [ ] **Step 4**: Sisipkan penanda komentar di posisi arsipnya: `{/* Jurnal Kolaboratif — sub-fase 4 */}` dan `{/* Kak Kayyisa trajectory — sub-fase 5 */}`. Tidak ada komponen kosong, tidak ada tombol mati.
- [ ] **Step 5**: `lint typecheck test build` PASS; grafik ter-render di `next build` (client component, `ResponsiveContainer` aman di static export selama tidak dipakai saat SSR — gunakan guard `typeof window`/dynamic import bila build mengeluh).
- [ ] **Step 6**: Commit `feat(web): port student progression detail`, centang Task 15.

### Task 16: Guard build output, verifikasi penuh, dokumen, merge, tutup lifecycle

**Files:** Modify: `projects/academic-smartboard/apps/web/tests/build-output.test.mjs`, `projects/academic-smartboard/{README.md,docs/architecture.md,docs/data.md,docs/testing.md}`, `docs/plans/active/2026-08-22-smartboard-web-subphase2-akademik.md`, `docs/plans/active/2026-08-21-smartboard-web-roadmap.md`, `docs/plans/active/README.md`, `.agents/HANDOFF.md`, `.agents/DECISIONS.md`

- [ ] **Step 1**: Perluas `tests/build-output.test.mjs` — assert semua route sub-fase 2 ada di `out/` (bentuk path mengikuti keputusan Task 3). Verifikasi merah: rename sementara satu folder route, test FAIL, kembalikan.
- [ ] **Step 2**: Update 4 dokumen capsule: status `apps/web` → `di-port (sub-fase 2/5)`; `docs/data.md` mencatat endpoint baru yang dipanggil + bahwa jurnal/AI belum dipanggil; `docs/testing.md` mencatat RTL masih absen (Keputusan terbuka #4).
- [ ] **Step 3**: Verifikasi penuh di worktree — tunjukkan output, jangan ringkas:

```bash
pnpm --filter @sentra/smartboard-web lint
pnpm --filter @sentra/smartboard-web typecheck
pnpm --filter @sentra/smartboard-web test
pnpm --filter @sentra/smartboard-web build
pnpm --filter @sentra/smartboard-web test:build
node scripts/check-tokens.mjs
bash scripts/safrs-verify.sh
pnpm check
```

- [ ] **Step 4**: Audit keamanan change set — bukan opsional, tunjukkan output:

```bash
grep -rnE "dangerouslySetInnerHTML|innerHTML|eval\(|new Function|localStorage|sessionStorage|document\.cookie" projects/academic-smartboard/apps/web/src   # harus nol hasil
grep -rn "process.env" projects/academic-smartboard/apps/web/src                                                                                        # hanya NEXT_PUBLIC_BACKEND_URL + NEXT_PUBLIC_DEV_TENANT_SLUG
pnpm audit --prod                                                                                                                                       # nol vulnerability
```

Plus tabel bukti: untuk tiap dari 24 endpoint di Temuan audit sumber, baris `routes_*.py` yang menegakkan role/tenant. Endpoint tanpa penjaga = STOP + lapor Chief (lihat Global Constraints).

- [ ] **Step 5**: Verifikasi manual E2E oleh Chief terhadap backend arsip (di luar scope agent): login → jadwal (buat/ubah/hapus) → sesi → detail sesi (check-in, absensi, evaluasi) → evaluasi → perkembangan → trio kurikulum. Agent menyiapkan daftar langkah + `NEXT_PUBLIC_BACKEND_URL` yang dibutuhkan. Sertakan uji negatif: login sebagai `murid_ortu`, panggil endpoint yang seharusnya tertutup untuk role itu langsung lewat `curl` (bukan lewat UI) — backend harus menolak.
- [ ] **Step 6**: Review Chief (R2 — dependensi baru di catalog); merge no-ff ke `main`; `safrs-verify.sh` di main PASS; Chief push.
- [ ] **Step 7**: `pnpm task state --id TASK-20260822-SMARTBOARD-WEB-AKADEMIK --to VERIFYING --yes` → `REVIEW` → `MERGED` → `CLOSED` (dari tree utama, bertahap sesuai fase riil). `git mv` plan ini ke `docs/plans/completed/`, status header → COMPLETED, baris 2 roadmap → COMPLETED, hapus baris dari `docs/plans/active/README.md`, overwrite `.agents/HANDOFF.md`, catat keputusan durable (recharts/sonner, strategi route dinamis, carve-out jurnal/Kayyisa) di `.agents/DECISIONS.md`.
- [ ] **Step 8**: Hapus worktree + branch. Lapor Chief: daftar commit, output verifikasi, keputusan terbuka yang masih terbuka.

## Verifikasi akhir (bukti wajib sebelum klaim selesai)

```bash
pnpm --filter @sentra/smartboard-web test        # unit logic PASS
pnpm --filter @sentra/smartboard-web build       # export seluruh route sub-fase 1+2
pnpm --filter @sentra/smartboard-web test:build  # assert output PASS
node scripts/check-tokens.mjs                    # nol pelanggaran token
bash scripts/safrs-verify.sh                     # SAFRS PASS
pnpm check                                       # gate penuh root
```
