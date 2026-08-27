# Kediri — A Living Civilization

Official-grade cinematic historical web experience for Pemerintah Kota Kediri, covering
879 → 2026. Two first-class experiences share one historical truth: a scroll-directed
cinematic **Journey**, and a structured, verifiable **Archive**.

The Journey answers *why this history matters*. The Archive answers *how we know*.

## Sovereign capsule

This directory is an independently portable project. It installs, builds, tests, runs, and
performs a deploy dry-run from its own root, with no runtime, configuration, path, tooling, or
infrastructure dependency on the enclosing Monorepo. Root governance and authoring standards
apply while developing here; they are not dependencies.

## Start here

| Document | Purpose |
| --- | --- |
| [`00_READ_FIRST.md`](00_READ_FIRST.md) | Canonical read order and authority hierarchy |
| [`AGENTS.md`](AGENTS.md) | Capsule router, boundaries, non-negotiables |
| [`MANIFEST.md`](MANIFEST.md) | Package contents |
| [`docs/ARCHITECTURE_LOCK.md`](docs/ARCHITECTURE_LOCK.md) | Implementation authority boundary |
| [`docs/bibles/`](docs/bibles/) | Historical, cinematic, visual-evidence, art-direction, UX, and technical canon |
| [`docs/implementation/MASTER_IMPLEMENTATION_PLAN.md`](docs/implementation/MASTER_IMPLEMENTATION_PLAN.md) | Execution order and Definition of Done |

Capsule-local engineering documents: [architecture](docs/architecture.md), [data](docs/data.md),
[testing](docs/testing.md).

## Commands

All commands run from this directory.

```
pnpm install
pnpm run dev          # http://127.0.0.1:4320
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
node scripts/serve.mjs
node scripts/deploy-dry-run.mjs
```

## Current state

Papan fase kanonik ada di [`.agents/PROGRESS.md`](.agents/PROGRESS.md) dan hanya di sana —
diukur terhadap Definition of Done tiap fase Master Implementation Plan. Bagian di bawah
menarasikan keadaannya, bukan menduplikasi papannya.

**Sudah berjalan.** Fondasi repositori dan runtime; PostgreSQL dan object storage
capsule-local; model domain historis; empat belas koleksi CMS dengan RBAC, draf, dan versi;
tata kelola publikasi yang dapat dieksekusi; tiga irisan vertikal yang sudah ditinjau; Arsip
publik; lapisan Explore; Journey semantik lengkap dengan tautan dalam yang stabil; UX Journey
(Timeline, bukti, kembali ke konteks); fondasi GSAP dan tiga koreografi hero; varian responsif
dan reduced motion; verifikasi integritas historis produksi; dan bukti browser di dua
perangkat.

**Diverifikasi di atas infra nyata (2026-08-26).** Seluruh rantai — migrate, seed,
`verify:production`, build, e2e, dan `project-standalone verify` — dijalankan di atas
PostgreSQL 18.6 dan MinIO dari `infra/docker-compose.yml`, dari basis data kosong. Batas hak
terbukti di lapisan objek, bukan hanya di kode: derivatif publik terbaca anonim (200),
master arsip menolak (403), dan menghapus record juga menghapus objeknya. Sebelumnya
verifikasi berjalan di atas PGlite karena Docker tidak tersedia di mesin ini; PGlite tetap
fallback yang sah, tetapi bukan lagi satu-satunya bukti.

**Bahasa sinematik (2026-08-26).** Lapisan era kini hidup: menggulir dari satu act ke act
berikutnya benar-benar berpindah abad — arang untuk 879-1042, obsidian dan indigo untuk
Panjalu, dan gading kertas yang terang untuk era kolonial-industri, karena kegelapan harus
bermakna dan bukan default. Setiap scene mendapat Kanvas Historis, master line dalam tipografi
monumental, dan enam keadaan penuh termasuk keadaan masuk lewat tautan dalam. Tidak ada satu
pun nilai warna di luar direktori token, dan setiap palet era diukur kontrasnya.

**Fondasi, belum selesai.** Mobile dan aksesibilitas punya fondasinya — empat varian motion
terpisah, reduced motion kelas satu, skip link, label bukti tertulis, dua proyek browser —
tetapi Phase 17-18 menuntut lebih: koreografi mobile yang dirancang individual per scene, uji
screen reader manual, zoom 200%, reflow sempit, dan `@axe-core/playwright`. Phase 19 (budget
LCP, CLS, INP di Android kelas menengah) belum pernah diukur, jadi tidak ada klaim performa
yang dibuat. Delapan dari sebelas choreography key belum diimplementasikan.

**Belum, dan sebabnya.**

- *Aset final (Phase 16).* Tidak ada satu pun citra historis yang dikirim. Akuisisi dari
  Museum Nasional, Perpusnas, KITLV, Rijksmuseum, Wereldmuseum, dan Nationaal Archief adalah
  pekerjaan institusional yang belum dilakukan. Ketiadaan yang jujur lebih baik daripada
  gambar pengganti yang menyesatkan.
- *Klaim 1869.* Peristiwanya terbit; klaimnya sengaja berhenti di `needs_review` sampai
  materi arsipnya diperoleh. Halaman arsipnya mengatakan itu apa adanya.
- *Deployment (Phase 22).* Tidak ada remote, target deploy, atau integrasi eksternal yang
  dibuat. Itu menunggu otorisasi eksplisit Chief.
- *Gate Sentra-GSAP.* `sentra:gsap:qa`, tinjauan visual independen, dan `sentra:gsap:verify`
  belum dijalankan. Standarnya menyebut gate yang tidak dijalankan sebagai FAIL, jadi motion
  di sini tidak disebut production-ready.

Korpus riset di `research/original/` tetap utuh dan **tidak** pernah diimpor. Ia masuk hanya
lewat tinjauan, seperti dijelaskan [`docs/data.md`](docs/data.md).
