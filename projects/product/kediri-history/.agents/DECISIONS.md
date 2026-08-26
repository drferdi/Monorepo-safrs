# DECISIONS — Keputusan Durable Kediri

Append-only, terbaru di atas. Tiap entri: tanggal, keputusan, alasan singkat, bukti.
Keputusan lintas-repositori tetap dicatat di `.agents/DECISIONS.md` root.

---

## 2026-08-26 — Mount volume Postgres 18 di compose capsule diperbaiki

`infra/docker-compose.yml` memasang volume di `/var/lib/postgresql/data`. Image `postgres:18`
menolak start dengan konfigurasi itu: sejak 18 ia menyimpan data di subdirektori per-versi
mayor, jadi mount harus di induknya, `/var/lib/postgresql`. Cacat ini tidak terlihat selama
berbulan sesi karena Docker tidak pernah berjalan di mesin ini. Diperbaiki dan diuji saat
Chief menyalakan Docker.
Bukti: `infra/docker-compose.yml` (komentar menjelaskan alasannya), PostgreSQL 18.6 healthy,
seluruh rantai verifikasi lulus di atasnya.

## 2026-08-26 — Adapter S3 dan pemisahan bucket terbukti di lapisan objek

Sonda teknis mengunggah lewat Payload ke `kediri-public` dan `kediri-private`, lalu diperiksa
langsung di MinIO: anon GET derivatif publik **200**, anon GET master arsip **403**, dan
menghapus record ikut menghapus objeknya tanpa meninggalkan yatim. Pemisahan publik/privat
karena itu adalah perilaku yang terbukti, bukan konvensi penamaan. Fixture-nya draf, ditandai
non-historis, dihapus, dan basis data disemai ulang bersih.

## 2026-08-26 — Klaim tidak bisa lahir dalam keadaan terbit

`sourceLinks` adalah field join: ia tidak pernah hadir di `data`, sehingga gerbang publikasi
harus **menghitung** tautan yang benar-benar ada, secara asinkron. Konsekuensinya sebuah klaim
tidak dapat dibuat langsung sebagai `published`. Alur editorialnya menjadi: draf → lampirkan
`EvidenceLink` → terbitkan. Ini ternyata alur yang benar, bukan kompromi.
Bukti: `apps/web/src/payload/collections/EvidenceClaims.ts`, `apps/web/src/scripts/seed.ts`.

## 2026-08-26 — Build produksi memakai webpack, bukan Turbopack

Turbopack menulis symlink di bawah `.next/`, dan verifier standalone menolak **setiap** symlink
di pohon capsule. `next build --webpack` menghasilkan 20 rute yang identik dengan nol symlink.
Bukti: `docs/testing.md`, `AGENTS.md`, `docs/architecture.md`.

## 2026-08-26 — Perintah Payload ber-titik-dua dipindah ke `scripts/payload-cli.mjs`

Pemeriksa independensi capsule memecah nilai skrip berdasarkan spasi dan menguji tiap token
sebagai calon path; token seperti `generate:types` cocok dengan pola skema URI dan dilaporkan
sebagai path di luar capsule. Perintahnya dipindahkan ke dalam pembungkus sehingga kontrak
standalone tetap dapat diverifikasi **tanpa melemahkan satu pun gerbang**. Kosakata
`pnpm run …` tidak berubah.

## 2026-08-26 — `push: false` pada adapter Postgres

Skema dikelola migrasi. Push otomatis membuat basis data pengembang menyimpang dari migrasi
yang benar-benar dijalankan saat rilis, dan penyimpangan itu baru terlihat di produksi. Push
otomatis juga yang memutus koneksi PGlite saat pengembangan.

## 2026-08-26 — Port e2e dipisahkan ke 4321

Saat berbagi port 4320 dengan server produksi, Playwright memakai ulang server yang sudah
berjalan dan diam-diam menguji build lama — melaporkan hijau untuk kode yang belum pernah
dijalankan. Itu benar-benar terjadi sekali dan langsung diperbaiki.

## 2026-08-26 — `nodeLinker: hoisted` adalah syarat kebenaran, bukan gaya

Verifier standalone memindai seluruh pohon capsule untuk symlink **sebelum** pengecualian
`mutableStatePaths`, sehingga `node_modules` ikut dipindai. Linker default pnpm yang berbasis
symlink membuat capsule gagal verifikasi meski secara fungsional benar.

## 2026-08-26 — Batas modul ditegakkan uji, bukan paket (keputusan Chief G03)

Membuat paket internal `workspace:*` akan melanggar kontrak ekstraksi standalone. Batasnya
karena itu ditegakkan `tests/architecture/module-boundaries.test.ts` yang mem-parsing pernyataan
import sungguhan dan **gagal pada direktori modul yang tidak dikenal**, sehingga aturannya tidak
bisa diam-diam kedaluwarsa. Kemasan fisik menyesuaikan; tanggung jawab arsitektural tidak runtuh.

## 2026-08-26 — Kediri dikecualikan dari workspace root (keputusan Chief G01)

`pnpm-workspace.yaml` root menambahkan `- '!projects/product/kediri-history/**'`. Capsule
memiliki workspace, lockfile, konfigurasi, skrip, dan infrastrukturnya sendiri.
Bukti: `node tools/project-standalone/src/cli.mjs verify product/kediri-history` = PASS penuh
setelah menyalin **hanya** capsule ke direktori baru.
