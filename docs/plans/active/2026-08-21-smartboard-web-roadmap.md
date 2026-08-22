# Smartboard `apps/web` — Roadmap Sub-fase

- **Status:** ACTIVE (index, bukan plan eksekusi — tiap baris punya plan sendiri)
- **Induk:** Fase 3 `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md` ("Port `apps/web` — plan terpisah. Paling besar (37 halaman).")
- **Sumber:** `D:\Devops\abyss-monorepo\apps\academic\smartboard\frontend\` (arsip, read-only) — 151 file, ~23,6k baris, React 19 + CRA/craco + react-router-dom 7, target port: Next.js 16 App Router (rewrite, bukan lift-and-shift, D4)

`apps/web` (37 halaman, 8+ area fitur) terlalu besar untuk satu plan sesuai batas "no placeholder" `writing-plans`. Dipecah 5 sub-fase, satu plan per baris, urut eksekusi:

| # | Sub-fase | Halaman arsip tercakup | Plan | Status |
| --- | --- | --- | --- | --- |
| 1 | Fondasi: scaffold, auth, shell, 1 modul master data (vertical proof) | Login, TutorActivation, OwnerActivation, shell/nav, Master › Murid | `docs/plans/completed/2026-08-21-smartboard-web-subphase1-foundation.md` | COMPLETED (Task 1–11 + final-review fix round selesai, merge+push ke main; TutorActivation/OwnerActivation ditunda ke sub-fase 4 per plan; Task 12 `.agents/PROGRESS.md`/`HANDOFF.md` sync sebagian tertunda — diblok lease basi + WIP konkuren, lihat plan) |
| 2 | Penjadwalan + akademik | Jadwal, Sesi(List/Detail), Evaluasi, Kurikulum, KurikulumSelaras, KurikulumCakupan, PerkembanganMurid | belum ditulis | belum dimulai |
| 3 | Payroll + finance | RekapHonor, Payroll, Pembayaran, Tarif, Lembur, Finance (tuition) | belum ditulis | belum dimulai |
| 4 | Komunikasi + operasional | TutorActivation, OwnerActivation, Komunikasi, Pengumuman, JournalEntry (di dalam Perkembangan), Tasks, Laporan, sisa 6 halaman Master (`tim`, `orang-tua`, `sekolah`, `mata-pelajaran`, `jenjang`, `tahun-ajaran`) | belum ditulis | belum dimulai |
| 5 | Admin platform + Kayyisa AI | HakAkses, TutorDirectory, TemplateEvaluasi, AuditLog, Persetujuan, PlatformConsole (+AuditTab, PlansTab), widget chat Kayyisa | belum ditulis | belum dimulai |

## Keputusan lintas sub-fase (berlaku semua baris di atas)

1. **Backend selama transisi:** `apps/api` belum di-port (fase 4 spec, setelah `web`). Sub-fase 1–5 `web` memanggil backend FastAPI arsip langsung lewat `NEXT_PUBLIC_BACKEND_URL` (dev-only, dijalankan manual dari `D:\Devops\abyss-monorepo\...\backend` di luar monorepo, TIDAK di-port kode/prosesnya ke sini). Ini keputusan terbuka tanpa jawaban eksplisit di spec — default ini dipakai kecuali Chief nyatakan lain; dasar: ADR 0003 "selama transisi, produk berjalan dari repo arsip" + urutan `web → api (facade)`.
2. **Auth:** cookie session httpOnly dari backend arsip (`auth.py`), BUKAN token di localStorage — port pola `frontend/src/lib/api.js` (`withCredentials: true`) dan `auth.jsx` (`GET /auth/me`) apa adanya secara perilaku, ditulis ulang untuk Next.js App Router.
3. **Tenancy:** server (backend arsip) yang resolve tenant dari subdomain/host; `web` TIDAK mengirim tenant sebagai klaim otorisasi dari client (port pola `frontend/src/lib/tenant.jsx`).
4. **TIDAK di-port** (redundan/tidak cocok stack target): `react-router-dom` (diganti App Router Next.js), `swr` (duplikat `@tanstack/react-query` — pakai react-query saja), `date-fns` (duplikat `dayjs` — pakai dayjs saja), `framer-motion` (preseden `apps/site`: motion CSS murni + `prefers-reduced-motion`), `react-scripts`/`craco`/`cra-template` (tooling CRA, tidak relevan).
5. **Karantina** (selain daftar ADR 0003 / spec migrasi fondasi): `backend/scripts/cloud_tokens.env` (SUDAH terdaftar di spec baris 51 — dikonfirmasi ulang saat inventory 2026-08-21, TIDAK lolos filter naif `.env*` karena nama file tidak diawali `.env`, jadi task manapun yang menyentuh `backend/scripts/` wajib grep eksplisit nama file, bukan glob), `backend/.uvicorn-out.log`, `backend/_console_be.out`, `backend/_console_fe.out`, `backend/.venv/`.
6. **Data pribadi nyata dikonfirmasi ADA** di arsip di luar `raw_data/` yang sudah dikarantina: tidak ditemukan tambahan per audit 2026-08-21 (seed/fixture di `backend/seed_data.py` tampak sintetis). Kalau task manapun menemukan PII nyata di `frontend/src/**` atau `backend/*.py` (bukan `raw_data/`), STOP task itu dan lapor Chief sebelum lanjut.

## Sizing acuan (audit 2026-08-21)

- `frontend/src/`: 151 file, ~23.628 baris.
- `backend/`: 77 file `.py` (tanpa `.venv`), ~21.150 baris; ~20 modul `routes_*.py` + `auth.py`.
- Model data (`backend/models.py`, 1093 baris): flat Pydantic per collection, isolasi tenant konvensi kode (`tenant_scope.scoped()/stamp()`) bukan constraint DB — jadi tantangan utama fase `api` nanti (di luar scope sub-fase `web`), dicatat di sini supaya tidak hilang.
