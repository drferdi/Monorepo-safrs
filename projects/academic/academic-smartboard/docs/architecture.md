# Architecture

Record the project's real components, boundaries, dependencies, critical flows, and failure modes. Link accepted ADRs for material decisions. Do not duplicate root SAFRS policy.

## Generated capsule context

- App binding: `apps/web`
- Selected capabilities: ai
- This wizard creates no application code or package binding.

## Komposisi capsule (target akhir — ADR 0003)

| App | Peran | Status | Asal |
| --- | --- | --- | --- |
| `apps/web` | Aplikasi bimbel multi-tenant (37 halaman) | di-port (sub-fase 1/5 — fondasi) | `frontend/` CRA di repo arsip |
| `apps/site` | Website promo/publik el-Kayyisa (10 route) | di-port | `landing/` Vite di repo arsip |
| `apps/api` | Backend (24 modul route) | belum di-port | `backend/` FastAPI+Mongo di repo arsip |
| `apps/demo` | Environment demo: seed sintetis + config deploy, tanpa fork kode | belum dibuat | menggantikan `demo/` di repo arsip |

Aset yang sudah bermigrasi:

- `ai/kayyisa/` — knowledge package Kayyisa v3.0.0 (manifest sha256-verified; path sensitif R2)
- `data/curriculum/`, `data/reference/` — data kurikulum dan registri sumber
- `apps/site` — website publik El-Kayyisa (Next.js 16, 10 route)
- `apps/web` sub-fase 1/5 — fondasi: scaffold, auth, shell, Master › Murid
  (Next.js 16, 3 route)

## `apps/site` — arsitektur

Static export murni: `next.config.ts` mengeset `output: "export"` +
`trailingSlash: true` (tiap route dibuild sebagai `out/<route>/index.html`,
bukan `out/<route>.html` — ramah untuk static host mana pun). Sengaja TANPA
import `@safrs/env/server` dan tanpa `cacheComponents`: tidak ada runtime
server, tidak ada env server-side, semua fitur di build-time saja.

Konten tiap halaman adalah modul TypeScript bertipe di `src/content/`
(`beranda.ts`, `cara-belajar.ts`, `legal.ts`, `smartboard.ts`, `tentang.ts`,
`wawasan.ts`, tiga modul `program-*.ts`) — ekstraksi verbatim dari arsip
`landing/` (Vite), bukan tulis ulang bebas. `src/content/index.ts` merakit
`allPages` + `NAV_ITEMS` yang jadi sumber kebenaran untuk 10 route dan
navigasi.

Chrome (header, footer, komponen showcase, dll.) di `src/components/` dan
semua warna/radius memakai token semantik `@sentra/token`
(`transpilePackages: ["@sentra/token"]` di `next.config.ts`) — bukan nilai
hex/px bebas. Situs memakai token `@sentra/token` secara penuh (audit
`check-tokens.mjs --audit` = nol pelanggaran); pendaftaran ke scope
enforcement `packages/token/scope.txt` dilakukan pada branch kontrol
terpisah (task plan lanjutan). Motion memakai CSS murni (bukan library JS)
dengan guard `prefers-reduced-motion` (lihat `SmartboardShowcase.tsx`) agar
animasi berhenti untuk pengguna yang memintanya.

## `apps/web` — arsitektur (sub-fase 1/5)

Static export murni, sama seperti `apps/site`: `next.config.ts` mengeset
`output: "export"` + `trailingSlash: true`. Sengaja TANPA import
`@safrs/env/server` — tidak ada runtime server, tidak ada env server-side.
Alasannya sama seperti `apps/site` (Keputusan terbuka #1, plan sub-fase 1):
arsip sendiri adalah SPA murni tanpa server, dan tidak ada kebutuhan nyata
(SSR/SEO) untuk app internal berlogin — jadi tidak ada alasan menambah
kompleksitas server sebelum ada kebutuhan nyata.

Bedanya dari `apps/site`: `apps/web` memanggil API eksternal saat runtime di
browser. Auth berbasis cookie-session (`session_token` httpOnly, di-set oleh
backend lewat `Set-Cookie`, dibaca lewat `withCredentials: true` pada
instance `axios`) terhadap backend FastAPI arsip yang di-deploy terpisah
(dev-only) di `NEXT_PUBLIC_BACKEND_URL` — backend itu sendiri BELUM di-port
ke monorepo ini; port-nya adalah fase `apps/api` terpisah di roadmap.
Frontend tidak pernah menyimpan/membaca token secara eksplisit (tidak ada
`localStorage`, tidak ada header `Authorization` manual).

Proteksi route berbasis role dilakukan di sisi client lewat komponen
`<ProtectedRoute roles={[...]}>` (bukan middleware Next.js), karena tidak
ada server yang bisa menjalankan middleware — konsisten dengan static
export client-only di atas. Nav sidebar difilter per role lewat
`filterByRole(NAV_ITEMS, role)` (`src/lib/nav.ts`).

Sub-fase 1 baru meliputi 1 dari ~8 area fitur arsip (37 halaman total):
master data — hanya daftar Master › Murid (`/master/murid`). Area lain
(kurikulum, evaluasi, payroll tutor, aktivasi, dst.) menyusul sub-fase 2-5
per roadmap.

## Urutan port

`site` → `web` → `api` (per modul di belakang facade) → `demo`.
Satu plan per fase; plan aktif: `docs/plans/active/2026-08-20-smartboard-migration.md`.

Sumber arsip read-only: `D:\Devops\abyss-monorepo\apps\academic\smartboard`.
Riwayat git arsip tidak di-graft (snapshot whitelist, ADR 0003).

## Keputusan material

- ADR 0003 — capsule tunggal, port bertahap, karantina `raw_data/` dan `.env*`.
