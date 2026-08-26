# Jebakan yang Sudah Menggigit

Hanya kegagalan **nyata** yang tercatat di sini, dengan tanggal. Bukan daftar kekhawatiran.
Tiap entri: gejalanya, sebabnya, dan cara menghindarinya.

---

## `next build` tidak membersihkan `.next/dev/` — 2026-08-26

**Gejala.** `project-standalone verify` GAGAL: "Capsule tree contains a symbolic link:
`apps/web/.next/dev/node_modules/@aws-sdk/client-s3-…`" — padahal build memakai webpack dan
tidak ada server dev yang berjalan.

**Sebab.** Satu `pnpm dev` di sesi **lampau** meninggalkan symlink di `.next/dev/`.
`next build` menulis di sampingnya, tidak menghapusnya. Verifier memindai seluruh pohon
capsule untuk symlink sebelum pengecualian `mutableStatePaths`.

**Hindari.** `rm -rf apps/web/.next` sebelum setiap standalone verify. Tercatat juga di
`docs/testing.md`.

---

## Compose Postgres 18 tidak pernah bisa start — 2026-08-26

**Gejala.** Kontainer `postgres` Exited (1) segera setelah start.

**Sebab.** Volume dipasang di `/var/lib/postgresql/data`. Sejak Postgres 18, image menyimpan
data di subdirektori per-versi mayor, jadi mount harus di induknya. Tidak terlihat berbulan
sesi karena Docker tidak pernah berjalan di mesin ini.

**Hindari.** Sudah diperbaiki. Pelajaran yang lebih besar: **"terkonfigurasi" bukan
"terverifikasi"** — konfigurasi yang belum pernah dijalankan belum tentu benar.

---

## Playwright diam-diam menguji build lama — 2026-08-26

**Gejala.** e2e hijau untuk kode yang belum pernah dijalankan.

**Sebab.** `reuseExistingServer` memakai ulang `serve.mjs` yang sudah hidup di port 4320.

**Hindari.** e2e memakai port 4321 sendiri.

---

## Selector CSS menolak anchor berawalan angka — 2026-08-26

**Gejala.** Uji gagal dengan selector tidak sah pada `#1135-panjalu-jayati`.

**Sebab.** Fragment URL menerima anchor berawalan angka; **selector CSS tidak**.

**Hindari.** Kode aplikasi memakai `getElementById`; uji memakai selector atribut
`[id="1135-panjalu-jayati"]`.

---

## Tautan bukti hilang dari halaman — 2026-08-26

**Gejala.** Klaim tampil tanpa bukti pendukungnya.

**Sebab.** `sourceLinks` adalah field join; kedalaman relasi tidak cukup untuk mengambilnya.

**Hindari.** Query layer memanggil `fetchLinksByClaim()` secara eksplisit dan meneruskan
petanya ke mapper. Bukti tidak boleh bisa lenyap diam-diam.

---

## Token ber-titik-dua dibaca sebagai skema URI — 2026-08-26

**Gejala.** `check_project_independence` menolak `cms:types`, `verify`, `test:e2e`.

**Sebab.** Pemeriksa memecah nilai skrip berdasarkan spasi dan menguji tiap token sebagai
calon path; `generate:types` cocok dengan pola skema URI.

**Hindari.** Perintah ber-titik-dua hidup di `scripts/payload-cli.mjs`, bukan di
`package.json`.

---

## Migrasi hasil generate mengimpor tipe sebagai nilai — 2026-08-26

**Gejala.** `MigrateDownArgs` tidak ter-ekspor saat runtime.

**Hindari.** Ubah menjadi `import type` pada migrasi yang baru di-generate.

---

## PGlite putus saat build paralel — 2026-08-26

**Gejala.** `ECONNRESET` saat Next membangun dengan banyak worker.

**Sebab.** Dipicu push skema Payload saat dev; PGlite juga kurang tahan terhadap koneksi
paralel.

**Hindari.** `push: false`, dan pakai Postgres sungguhan dari compose bila tersedia.
