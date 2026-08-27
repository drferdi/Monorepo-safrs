# PROGRESS — Papan Fase Kediri

**Ini satu-satunya klaim status yang hidup untuk capsule Kediri.** Dokumen lain (README,
artifact laporan, HANDOFF root) boleh menarasikan, tetapi angka fasenya diambil dari sini.

Diukur terhadap **Definition of Done tiap fase** di
`docs/implementation/MASTER_IMPLEMENTATION_PLAN.md` — bukan terhadap "kodenya sudah ada".

Last updated: 2026-08-26

---

| Fase | Judul | Status |
| --- | --- | --- |
| 0 | Lock ground truth | ✅ Selesai |
| 1 | Repository & runtime foundation | ✅ Selesai |
| 2 | PostgreSQL + object storage | ✅ Selesai |
| 3 | Historical domain package | ✅ Selesai |
| 4 | CMS foundation | ✅ Selesai |
| 5 | Historical knowledge collections | ✅ Selesai |
| 6 | Publishing governance | ✅ Selesai |
| 7 | Seed a canonical vertical slice | ✅ Selesai |
| 8 | Archive first | ✅ Selesai |
| 9 | Explore layer | ✅ Selesai |
| 10 | Semantic Journey | ✅ Selesai |
| 11 | Journey UX | ✅ Selesai |
| 12 | GSAP foundation | ✅ Selesai |
| 13 | First three hero scenes | ✅ Selesai |
| 14 | Engineering / transformation heroes | 🟨 Sebagian |
| 15 | Remaining supporting scenes | 🟨 Sebagian |
| 16 | Final visual assets | ⬜ Belum |
| 17 | Mobile choreography | 🟨 Fondasi |
| 18 | Accessibility | 🟨 Fondasi |
| 19 | Performance | ⬜ Belum |
| 20 | Historical production verification | ✅ Selesai |
| 21 | End-to-end tests | ✅ Selesai |
| 22 | Deployment | ⏸ Menunggu Chief (G02) |

## Rincian yang tidak boleh dibulatkan

- **14–15:** 13 `choreographyKey` terimplementasi (11 kanon + `prologueReveal`
  + `nameEndures`, 2026-08-27); timeline factory ada untuk semua kunci di
  registry. Yang tersisa untuk DoD fase ini: koreografi khusus per scene bagi
  ±14 scene yang masih memakai komposisi statis, dan transisi bertanda tangan
  antar-act. Lima scene awal (00–04) sudah melewati pass refinemen beat
  editorial + handoff kausal.
- **16:** nol citra historis dikirim. Akuisisi dari Museum Nasional, Perpusnas, KITLV,
  Rijksmuseum, Wereldmuseum, dan Nationaal Archief adalah pekerjaan institusional, bukan kode.
- **17:** empat varian motion responsif ada, tetapi koreografi mobile yang dirancang
  individual per scene belum.
- **18:** reduced motion kelas satu, skip link, dan label bukti ada; uji screen reader manual,
  zoom 200%, reflow sempit, dan `@axe-core/playwright` belum.
- **19:** budget LCP/CLS/INP di Android kelas menengah **belum pernah diukur**. Tidak ada klaim
  performa yang boleh dibuat.
- **22:** tidak ada remote, target deploy, atau integrasi eksternal yang dibuat.

## Bahasa sinematik (2026-08-26)

Lapisan yang sebelumnya kosong dan membuat Journey terbaca sebagai teks yang
bergerak. Kini ada:

- **Lapisan era hidup.** `visualEraKey` sudah mengalir dari CMS ke `data-era`
  sejak awal, tetapi CSS tidak pernah memakainya - lapisan itu mati. Kini
  `[data-era]` menimpa peran `--cinema-*` penuh, jadi setiap act benar-benar
  berganti abad: arang 879-1042, obsidian-indigo Panjalu, dan gading kertas
  yang TERANG untuk era kolonial-industri.
- **Kanvas Historis** - lapisan 1 Scene Contract (UX Bible bagian 6) yang
  sebelumnya tidak ada. Lima perlakuan: material, landscape, word, structure,
  document. Semuanya abstrak, tanpa satu pun aksara atau wajah rekaan.
- **`visualVariant`** - field spesifikasi Technical Bible bagian 17 yang belum
  pernah diimplementasikan. Intent murni; komposisinya milik kode.
- **`masterLine`** - satu kalimat yang memikul scene, tipografi monumental,
  hidup di keadaan istirahat.
- **Enam keadaan scene** (UX Bible bagian 39) termasuk dataran istirahat dan
  transisi keluar. Pin di desktop dan tablet; mobile alur vertikal asli;
  reduced motion tanpa pin sama sekali.
- **Keadaan masuk lewat deep-link** - tiba di anchor mendarat pada keadaan baca
  yang stabil, bukan awal rentang scrub. Dikunci uji e2e.

Yang masih kurang: delapan choreography key, Scene 00 Prologue (butuh media
kontemporer yang belum ada), dan transisi bertanda tangan antar-act.

## Citra produksi (2026-08-27)

27 hero image (Prolog + 26 scene; Finale memakai ulang citra Prolog) diperiksa
visual, dipetakan di `docs/shots/image-manifest.md`, dikonversi ke WebP dua
ukuran, dan diintegrasikan ke panggung sinematik melalui jalur pratinjau
editorial — 25 slot siap, scene 1292 sengaja ditangguhkan (flag F1), publikasi
CMS menunggu keputusan hak Chief. Prolog dan Finale kini bingkai sinematik penuh
dengan citra 2026 yang sama. Pacing pin dibedakan per koreografi (§19 direktif).
Lima flag integritas citra (F1–F5) menunggu keputusan Chief di manifest.

## Gate di luar papan fase

- **Sentra-GSAP: tetap FAIL**, kini karena SATU alasan: **tinjauan visual
  independen belum dilakukan** — itu pekerjaan manusia. Dijalankan 2026-08-27
  terhadap sumber capsule: GSAP Architecture PASS (0 error, 0 warning),
  Typecheck PASS, Lint PASS, Test PASS, Build PASS, dan Browser QA **PASS
  28/28** (naik dari 8/10; Firefox/WebKit terpasang penuh dan urutan
  build → server segar → QA ditegakkan). Selama tinjauan visual manusia belum
  ada, standarnya menghitung gate ini FAIL.

## Utang editorial yang terbuka

- Klaim jembatan **1869** sengaja tertahan di `needs_review` sampai materi arsipnya diperoleh.
- Mekanisme pengangkatan **1912** menunggu konfirmasi arsip.

Keduanya adalah keadaan yang benar, bukan bug. Jangan "perbaiki" dengan menerbitkannya.
