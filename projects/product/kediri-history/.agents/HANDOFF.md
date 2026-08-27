# HANDOFF — Keadaan Kediri Saat Ini

> Baca lebih dulu setiap sesi. **Ditimpa**, bukan ditambah — ini keadaan sekarang, bukan log.
> Status fase: `PROGRESS.md`. Keputusan durable: `DECISIONS.md`. Pagar: `BOUNDARIES.md`.

Last updated: 2026-08-27

---

## Keadaan sekarang

**27 citra produksi terintegrasi (2026-08-27).** Direktif sinematik final Chief
dieksekusi melalui proses lima pass Sentra-GSAP: canon audit, manifest citra
(`docs/shots/image-manifest.md` — gate keras §7, seluruh 30 berkas diinspeksi
visual), integrasi lapisan media, dan dua putaran tinjauan desain tangkapan
layar (desktop + mobile). Journey editorial-preview kini menampilkan seluruh 27
hero image di panggung sinematiknya: Prolog dan Finale berbagi satu citra 2026
(bukan aset ke-28), 25 slot scene siap, dan scene 1292 sengaja ditangguhkan
karena teks terbakar yang keliru (flag F1). Lima flag integritas citra (F1–F5)
menunggu keputusan Chief — semuanya terdokumentasi di manifest.

**Refinemen lima scene awal (direktif Chief ketiga, sesi yang sama).**
Scene 00–04 kini sistem beat editorial penuh: kalimat kanon dikelompokkan jadi
beat pendek yang hadir bergiliran dengan jeda hening, Prolog punya koreografi
`prologueReveal`, 1015 punya kunci ke-12 `nameEndures` (kamera diam — Research
Hold menolak dramatisasi; migrasi enum baru), handoff kausal antar-scene lewat
`SCENE_HANDOFFS`, dan penempatan teks merespons komposisi citra. Bukti: gerbang
penuh + e2e **50/8/0** + tangkapan layar sekuens. Lihat `DECISIONS.md`.
Perhatian: Next 16 menolak dev server kedua utk direktori sama — matikan dev
server 4320 sebelum e2e (webServer 4321 gagal start diam-diam kalau tidak).

**Naskah bergiliran di dalam shot (koreksi Chief kedua, sesi yang sama).**
Paragraf naratif kini hidup DI DALAM panggung: timeline shot yang sama
menghadirkannya satu per satu di atas citra selama dataran baca — citra tidak
pernah tayang dua kali, tidak ada bagian teks setelah shot (tinggal strip
arsip: status, bukti, navigasi). Pin diperpanjang untuk ruang baca. Varian
mobile/reduced/tanpa-JS: seluruh paragraf statis, dokumen utuh. Lihat
`DECISIONS.md`. Diverifikasi ulang: typecheck, lint, test+token gate, e2e
40/4/0, bukti tangkapan layar multi-progres.

Catatan gate saat dev server hidup: Next dev menulis ulang
`src/app/(payload)/admin/importMap.js` (hasil generate) tanpa format, sehingga
lint flake. Jalankan gate tanpa dev server, atau format ulang berkas itu.

Naskah produksi (`production-narrative.ts`) tidak diubah prosanya; ia diperkaya
alt text per scene, status siap slot, dan media pembingkai. Daftar putih route
`/api/editorial-preview/` kini diturunkan dari naskah produksi. Pacing pin
dibedakan per koreografi (TS + CSS harus sinkron — lihat `DECISIONS.md`).

**Publikasi CMS citra belum dilakukan dan memang tidak boleh** sampai Chief
menetapkan record hak/provenance (kelas V/R). Build produksi menampilkan tiga
scene CMS tanpa media preview — `check-production-journey.mjs` membuktikan nol
kebocoran, dan itu perilaku benar, bukan kekurangan.

## Bukti terakhir yang benar-benar dijalankan (2026-08-27)

**Diulang penuh di PostgreSQL 18 + MinIO nyata** dari `infra/docker-compose.yml`
(daemon Docker akhirnya pulih sore hari; putaran PGlite sebelumnya tetap sah
sebagai bukti pengembangan, bukan bukti rilis):

| Perintah | Hasil |
| --- | --- |
| `db:migrate` | PASS — idempoten di volume semai 2026-08-26; 3 irisan, 1 `needs_review` |
| `pnpm run verify` (rantai penuh) | PASS — lint, typecheck, test (55), build 20 rute, journey guard, verify:production 12 record 0 kritis |
| `test:e2e` | PASS — 40 lulus, 4 dilewati (kontrak desktop-only), 0 gagal |
| `check-production-journey` | PASS — 3 scene CMS, 0 marker preview bocor |
| Sentra-GSAP mekanis | 5 gate PASS; **Browser QA PASS 28/28** (Chromium+Firefox+WebKit; naik dari 8/10) |
| Sentra-GSAP agregat | **FAIL** — hanya karena tinjauan visual independen (manusia) belum ada |

Catatan laporan agregat: baris "Browser QA FAIL" di
`.sentra-gsap/reports/sentra-gsap-report.md` adalah artefak urutan harness
satu-proses — langkah build verify.mjs membatalkan server hidup sebelum langkah
browser-nya berjalan. Bukti browser yang otoritatif adalah
`.sentra-gsap/reports/browser-qa.json` (PASS 28/28), dihasilkan dengan urutan
wajib build → server segar → QA. Pekerjaan lanjutan: verify.mjs butuh hook
restart server di antara kedua langkah itu.

Peringatan PGlite (bila dipakai lagi sebagai fallback): ia jenuh koneksi
setelah build paralel / e2e panjang — restart servernya sebelum tiap putaran
verifikasi berat (dua kali menggigit sesi ini).

## Yang sedang hidup di mesin ini

- Kontainer `postgres` (54330) dan `minio` (9010/9011) **hidup dan sehat**;
  turunkan dengan `docker compose -f infra/docker-compose.yml down` tanpa `-v`.
- **Server produksi** `scripts/serve.mjs` hidup di 4320 (untuk peninjauan
  Chief); matikan bebas. PGlite sudah dimatikan; port 54330 kembali ke Postgres.
- `apps/web/.next` berisi artefak dev Turbopack — `rm -rf apps/web/.next`
  sebelum `project-standalone verify` (jebakan lama, tetap berlaku).

## Tindakan berikutnya

1. **Keputusan Chief atas flag F1–F5** di `docs/shots/image-manifest.md`
   (citra 1292 revisi; kapsi "Foto Arsip" pada render AI di citra 16/25;
   panel mekanisme 1912; wajah pada scene 12 + duplikat versi).
2. **Tinjauan visual independen Sentra-GSAP** — satu-satunya gate yang tersisa,
   menuntut mata manusia (`.sentra-gsap/reviews/visual-review.json`).
3. **Keputusan hak/provenance** untuk mempromosikan citra dari pratinjau
   editorial ke `MediaAssets` CMS (kelas V/R, kredit, lisensi).
4. Koreografi khusus untuk 15 scene yang kini statis + transisi kausal
   antar-act (§17 direktif) — bahasa sinematiknya sudah terbukti di 11 scene.
5. Phase 17–19 (mobile per scene, aksesibilitas manual, budget performa) —
   belum berubah.
6. **Phase 22 (deployment)** tetap menunggu otorisasi eksplisit Chief (G02).

## Publikasi (2026-08-27, otorisasi eksplisit Chief)

Commit `64bbadd` (lapisan sinematik penuh, hanya path capsule) dibuat atas
perintah Chief, lalu capsule dipublikasikan sebagai subtree murni ke
`https://github.com/drferdii/Kediri-Kings-Century` (remote `kediri`, branch
`main`, HEAD `8f12785`) — riwayat 2 commit capsule saja, tanpa proyek Monorepo
lain. Gate pre-push root menolak lebih dulu dan dibuka dengan override resmi
`CHIEF_PUSH_OK=1` setelah Chief mengizinkan di sesi yang sama. Artefak sesi
(`.playwright-cli/`, `.sentra-gsap/`, lock) dan `.env.local` dipastikan tidak
ikut. Push berikutnya ke repo itu: `git subtree split` ulang lalu push dengan
override yang sama — tetap hanya atas perintah Chief.

## Catatan lintas-repositori

Dua check SAFRS root merah karena sebab warisan non-Kediri (lihat HANDOFF
root). Browser Firefox+WebKit Playwright kini terpasang di mesin ini untuk QA
lintas-engine.
