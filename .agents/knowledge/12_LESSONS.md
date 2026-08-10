# 12_LESSONS.md

Koreksi reusable — lahir dari kesalahan nyata, bukan aturan yang dibuat di awal.

Aturan pengisian:

- One-liner saja; satu pelajaran per baris.
- Tambah entri hanya jika: kesalahan yang sama terjadi **dua kali**, review menemukan konteks
  yang hilang, atau Chief mengoreksi hal yang sama lintas sesi.
- Setiap entri punya tanggal dan konteks singkat.
- Pelajaran yang tidak lagi berlaku **dihapus**, bukan ditumpuk.
- Jangan duplikasi — perketat entri yang ada.
- Pelajaran spesifik project hidup di `projects/<name>/AGENTS.md`, bukan di sini.

---

## Repo & Tooling

- Selalu gunakan `pnpm` — jangan pernah `npm` atau `yarn` (2026-08-11, warisan abyss-monorepo).
- Jangan klaim test/lint/build pass tanpa benar-benar menjalankannya — evidence before assertions
  (2026-08-11).
- Saat menambah/menghapus package di workspace, refresh lockfile sebelum validasi
  `--frozen-lockfile` (2026-08-11).

## Sumber Kebenaran

- Jangan kutip file arsip atau percakapan lama sebagai kebenaran terkini — verifikasi path di
  disk dulu (2026-08-11).
- ChatGPT Memory dan konteks percakapan bukan SSOT repo — kebenaran ada di file repo
  (2026-08-11).

## Migrasi & Keamanan

- Dari `abyss-monorepo`: jangan baca `.env` (credential live), jangan salin `node_modules`,
  `.env`, `.next`, atau lockfile (2026-08-11).
- Jangan `git add -A` saat ada kerja orang lain yang masih staged — stage hanya slice milik task
  sendiri (2026-08-11).
