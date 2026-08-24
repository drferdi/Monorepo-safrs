# Konteks — Migrasi Standalone Academic Smartboard

Status: SELESAI — verifier resmi `tools/project-standalone` RESULT PASS
(11 stage) pada 2026-08-24, branch `chore/smartboard-standalone`.
Pemilik: Chief. Pelaksana: agent.

## Keputusan teknis saat eksekusi

- `nodeLinker: hoisted` + token sebagai tarball `vendor/sentra-token-1.0.0.tgz`:
  verifier menolak symlink/reparse point di seluruh pohon capsule; workspace
  link dan `file:` direktori selalu symlink di pnpm, tarball tidak. Source +
  gate token tetap di `packages/token`; repack via `pnpm run token:pack`.
- `scripts/pnpm.mjs`: kontrak butuh argv executable; spawn `pnpm` langsung
  ENOENT di Windows (.cmd), wrapper node + shell resolve portabel.
- Lint domain Next Biome aktif setelah versi di-pin (sebelumnya `catalog:`
  menyembunyikan deteksi Next) — 9 temuan di apps/site diperbaiki di kode
  (key konten stabil, `next/image`), bukan dengan mematikan aturan.
- Root `pnpm governance` gagal karena mod asing pra-sesi
  (`.safrs/reviews/verification-integrity.json` tanpa owner aktif) dan root
  install gagal karena `@safrs/auth` tanpa package.json — keduanya inherited,
  terdokumentasi di `.agents/HANDOFF.md`, di luar scope migrasi ini.
  `check_project_independence`: OK.

## Masalah lengkap

Root `AGENTS.md` (§107–120, ADR 0006 "standalone project capsules", di-merge
2026-08-24 01:12 pada commit `19165a0`) mewajibkan setiap capsule proyek
sepenuhnya mandiri: install, build, test, run, dan deploy dry-run harus bisa
dijalankan dari capsule root tanpa Monorepo, dibuktikan dengan ekstraksi ke
direktori bersih.

`projects/academic/academic-smartboard` melanggar kontrak itu pada lima titik:

1. **Root workspace + lockfile.** Capsule tidak punya `pnpm-workspace.yaml`
   atau lockfile sendiri; apps ter-resolve lewat root `pnpm-workspace.yaml`
   (pattern `projects/*/*/apps/*`) dan `pnpm-lock.yaml` root.
2. **Root catalog.** Hampir semua dependency `apps/site` dan `apps/web`
   memakai `catalog:`; di luar Monorepo protokol itu tidak ter-resolve dan
   install gagal.
3. **Root package.** `"@sentra/token": "workspace:*"` menunjuk
   `packages/token` milik root — di-import di `globals.css`, `layout.tsx`,
   dan `transpilePackages` kedua apps. §118–120 mewajibkan capsule baru
   memakai token package capsule-local atau versi distribusi independen.
4. **Root config path.** Kedua `tsconfig.json` apps `extends`
   `../../../../../packages/config/tsconfig/nextjs.json` — keluar dari
   direktori capsule, dilarang eksplisit §112.
5. **Kontrak lifecycle absen.** Tidak ada `package.json` di capsule root,
   tidak ada `project.contract.json`; komando di AGENTS.md capsule memakai
   `pnpm --filter` yang membutuhkan workspace root.

## Asal-usul (bukan pembenaran, catatan kronologi)

- Smartboard di-port bertahap dari pekerjaan pra-Monorepo memakai pola
  root-integrated yang saat itu standar (seperti golden-path).
- Kontrak standalone baru lahir 2026-08-24 dini hari; pada merge itu hanya
  `corporate/portfolio-drnovia` yang dimigrasi penuh.
- Commit `ab73ac1` (2026-08-24 06:51) memperbaiki path tsconfig yang putus
  akibat relokasi domain dengan menunjuk ulang ke root config — menambal
  coupling setelah aturan berlaku, tanpa mencatat utang kepatuhan. Itu
  kesalahan proses yang memicu migrasi ini.

## Solusi yang dijalankan

Pola acuan: `corporate/portfolio-drnovia` (satu-satunya capsule yang lolos).
Rencana 8 fase / 28 butir, checklist live di Artifact
"Smartboard Standalone" (panel Chief):

- Fase 0 Baseline: typecheck site+web hijau via root (terverifikasi), branch kerja.
- Fase 1 Fondasi lokal: `package.json` + `pnpm-workspace.yaml` capsule
  (pnpm@11.21.0, biome 2.5.7, `allowBuilds`), tsconfig base lokal, biome config lokal.
- Fase 2 Vendor token: copy `packages/token` → capsule (nama tetap
  `@sentra/token`), provenance v1.0.0 + commit sumber, `check-tokens.mjs` lokal.
- Fase 3 Pin versi: seluruh `catalog:` diganti versi eksplisit
  (next 16.3.0, react 19.2.8, typescript 7.0.2, vitest 4.1.10, tailwindcss 4.3.3, dst.).
- Fase 4 Lepas root: negation `!projects/academic/academic-smartboard/**`
  di root workspace (diverifikasi dry-run), install root + install capsule
  (lockfile capsule lahir).
- Fase 5 Kontrak: `project.contract.json` valid
  `.safrs/schemas/project-contract.schema.json`; `scripts/serve.mjs`
  (kedua apps `output: export` — `next start` tidak berlaku),
  `scripts/deploy-dry-run.mjs`; AGENTS.md capsule diperbarui.
- Fase 6 Verifikasi: struktural (nol `catalog:`, nol path keluar capsule),
  gate capsule hijau, ekstraksi fresh-dir (install/build/test/deployDryRun) —
  bukti penentu, root tetap utuh (`pnpm governance`).
- Fase 7 Penutupan: review fable-advisor, hapus artefak scratch, commit +
  handoff satu paket.

## Risiko terbuka

- Negation pattern pnpm belum terbukti — fallback enumerasi pattern eksplisit.
- Biome binary/config saat ini menumpang root — dipasang lokal, dibuktikan ekstraksi.
- `allowBuilds` kurang akan memblokir postinstall di fresh-dir — dilengkapi
  dari error install pertama.
- Versi pin membeku pada snapshot catalog 2026-08-24 — disengaja; update
  berikutnya milik capsule.
