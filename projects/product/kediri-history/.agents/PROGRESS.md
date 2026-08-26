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

- **14–15:** 3 dari 11 `choreographyKey` diimplementasikan. Delapan sisanya belum.
- **16:** nol citra historis dikirim. Akuisisi dari Museum Nasional, Perpusnas, KITLV,
  Rijksmuseum, Wereldmuseum, dan Nationaal Archief adalah pekerjaan institusional, bukan kode.
- **17:** empat varian motion responsif ada, tetapi koreografi mobile yang dirancang
  individual per scene belum.
- **18:** reduced motion kelas satu, skip link, dan label bukti ada; uji screen reader manual,
  zoom 200%, reflow sempit, dan `@axe-core/playwright` belum.
- **19:** budget LCP/CLS/INP di Android kelas menengah **belum pernah diukur**. Tidak ada klaim
  performa yang boleh dibuat.
- **22:** tidak ada remote, target deploy, atau integrasi eksternal yang dibuat.

## Gate di luar papan fase

- **Sentra-GSAP: FAIL** — `sentra:gsap:qa`, tinjauan visual independen, dan
  `sentra:gsap:verify` belum dijalankan. Lihat `BOUNDARIES.md` §5.

## Utang editorial yang terbuka

- Klaim jembatan **1869** sengaja tertahan di `needs_review` sampai materi arsipnya diperoleh.
- Mekanisme pengangkatan **1912** menunggu konfirmasi arsip.

Keduanya adalah keadaan yang benar, bukan bug. Jangan "perbaiki" dengan menerbitkannya.
