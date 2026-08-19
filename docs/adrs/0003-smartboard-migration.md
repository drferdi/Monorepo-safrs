# ADR 0003 — Migrasi Smartboard sebagai Capsule Tunggal dengan Port Bertahap

- Status: Accepted
- Date: 2026-08-20
- Deciders: Chief (drferdii)
- Spec: `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md`
- Plan: `docs/plans/active/2026-08-20-smartboard-migration.md`

## Context

Produk smartboard hidup di repo arsip `abyss-monorepo` dengan empat permukaan:
aplikasi utama (CRA + craco + yarn, ~50 pin `resolutions` CVE manual), backend
(FastAPI + MongoDB, 24 modul route), website promo (Vite 8), dan dua fork demo
dengan repo git tersarang yang dipublikasikan ke GitHub. Monorepo SAFRS ini
menegakkan satu lockfile pnpm, katalog versi terpusat, `minimumReleaseAge`,
gate design token, dan kontrak capsule.

## Options Considered

1. **Lift-and-shift** — salin apa adanya, pertahankan yarn/CRA dan pip/MongoDB.
   Ditolak: membuka dua supply chain di luar jangkauan `pnpm check` dan
   `scripts/check-supply-chain.mjs`; CRA tidak bisa masuk katalog tanpa
   pengecualian; gate token pasti merah.
2. **Folder domain perantara** (`projects/academic/smartboard/`). Ditolak:
   memaksa edit serentak pada `pnpm-workspace.yaml`,
   `tools/safrs/check_topology.py`, dan `scripts/check-tokens.mjs`.
3. **Capsule tunggal dengan port bertahap** — dipilih.

## Decision

1. Satu capsule `projects/academic-smartboard/` — domain sebagai prefix nama.
2. Empat app dalam capsule: `web` (produk utama), `site` (promo/publik),
   `api` (backend), `demo` (konfigurasi environment demo — bukan fork kode).
3. Knowledge package Kayyisa di `ai/kayyisa/` dalam capsule; naik ke
   `packages/` hanya setelah ada konsumen kedua nyata (Rule 3 kontrak capsule).
4. Port bertahap ke stack golden-path (Next.js 16, Hono 4, Prisma 7 +
   Postgres). Urutan: site → web → api (per modul di belakang facade) → demo.
5. Migrasi adalah snapshot whitelist — riwayat git repo lama tidak di-graft
   karena berpotensi membawa secret lama secara permanen.
6. `raw_data/**` repo lama (data pribadi siswa/tentor/gaji) diklasifikasi R3
   dan dikarantina permanen; tidak masuk repo ini dalam bentuk apa pun tanpa
   konfirmasi tertulis Chief. Semua `.env*` repo lama ikut dikarantina.

## Consequences

- Selama transisi, produk berjalan dari repo arsip; capsule ini menerima port
  per plan terpisah (site, web, api, demo) sampai paritas tercapai.
- 26 file test Python backend menjadi spesifikasi perilaku untuk port Vitest.
- Repo publik `smartboard-demo` dan `smartboard-landing` berhenti menjadi
  sumber; postur lanjutannya diputuskan pada plan fase demo.
- `projects/**/ai/**` terdaftar sebagai path sensitif (minimum R2) demi
  integritas persona dan knowledge pack Kayyisa.
