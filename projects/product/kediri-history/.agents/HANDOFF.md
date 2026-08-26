# HANDOFF — Keadaan Kediri Saat Ini

> Baca lebih dulu setiap sesi. **Ditimpa**, bukan ditambah — ini keadaan sekarang, bukan log.
> Status fase: `PROGRESS.md`. Keputusan durable: `DECISIONS.md`. Pagar: `BOUNDARIES.md`.

Last updated: 2026-08-26

---

## Keadaan sekarang

Capsule adalah aplikasi utuh yang berjalan: 14 koleksi Payload dengan RBAC/draf/versi, gerbang
publikasi yang dapat dieksekusi, tiga irisan vertikal yang sudah ditinjau (879 Kwak · 1135
Hantang · 1869 Jembatan Lama), Arsip publik, Explore, Journey satu-rute dengan anchor stabil,
overlay Timeline, fondasi GSAP dengan tiga koreografi hero, dan `verify:production`.

Rincian fase ada di `PROGRESS.md`. Jangan mengulang angkanya di sini.

## Bukti terakhir yang benar-benar dijalankan (2026-08-26)

Seluruh rantai di atas **PostgreSQL 18.6 + MinIO** dari `infra/docker-compose.yml`, dari basis
data kosong:

| Perintah | Hasil |
| --- | --- |
| `db:migrate` / `db:seed` | PASS — dari nol; 3 irisan ditinjau, 1 tertahan `needs_review` |
| `lint` / `typecheck` | PASS — 94 berkas, 0 error |
| `test` | PASS — 51 uji; token gate 34 pemeriksaan kontras |
| `build` | PASS — 20 rute, 11 worker paralel |
| `verify:production` | PASS — 12 record, 0 kritis, 0 peringatan |
| `test:e2e` | PASS — 32 lulus, 2 dilewati (kontrak motion desktop-only) |
| `deploy-dry-run` | PASS — 96 berkas klien, 0 rahasia server |
| `project-standalone verify` | **PASS penuh** — kedaulatan capsule terbukti |

Sonda penyimpanan objek: unggahan nyata ke kedua bucket; anon publik 200, master privat 403;
hapus record ikut menghapus objek. Fixture-nya sudah dibersihkan.

## Yang sedang hidup di mesin ini

Kontainer `postgres` dan `minio` **dibiarkan hidup**. Turunkan dengan
`docker compose -f infra/docker-compose.yml down` — tanpa `-v`, supaya data semai bertahan.
Tidak ada listener aplikasi di 4320/4321.

## Tindakan berikutnya

1. **Akuisisi citra historis** dari Museum Nasional, Perpusnas, KITLV, Rijksmuseum,
   Wereldmuseum, Nationaal Archief. Phase 16 tidak dapat maju tanpa ini. Pekerjaan
   institusional, bukan kode.
2. **Konfirmasi arsip** untuk klaim jembatan 1869 dan mekanisme pengangkatan 1912.
3. **Delapan choreography key** sisanya (Phase 14–15).
4. **Phase 17–18**: koreografi mobile per scene, uji screen reader manual, zoom 200%, reflow
   sempit, `@axe-core/playwright`.
5. **Phase 19**: budget Core Web Vitals — belum pernah diukur sama sekali.
6. **Gate Sentra-GSAP** (tingkat repositori, G04) masih **FAIL** karena belum dijalankan.
7. **Phase 22 (deployment)** menunggu otorisasi eksplisit Chief (G02). Tidak ada remote yang
   dibuat.

## Catatan lintas-repositori

Dua check SAFRS root berwarna merah karena sebab warisan yang **tidak berasal dari Kediri**
(instalasi Sentra-GSAP dan berkas deploy Avery yang belum bertuan; basis review pasca-rewrite
riwayat 2026-08-25). Nol path Kediri terlibat. Rinciannya di `.agents/HANDOFF.md` root.
