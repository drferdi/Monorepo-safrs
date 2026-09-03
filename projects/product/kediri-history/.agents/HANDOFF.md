# HANDOFF — Keadaan Kediri Saat Ini

> Baca lebih dulu setiap sesi. **Ditimpa**, bukan ditambah — ini keadaan sekarang, bukan log.
> Status fase: `PROGRESS.md`. Keputusan durable: `DECISIONS.md`. Pagar: `BOUNDARIES.md`.

Last updated: 2026-09-03

---

## Keadaan sekarang

**Overhaul GSAP per-section selesai (2026-09-03, audit penuh di
`docs/GSAP_AUDIT.md`, arc pacing di `docs/MOTION_ARC.md`).** Yang berubah dan
yang harus dijaga:

- Token motion hidup di `modules/motion/tokens.ts` (CustomEase `cine`,
  `cineIn`, `hardCut`, `settle`; `EASES`/`DURATIONS`/`STAGGERS`); `MOTION`
  masih diekspor dari `gsap.ts` untuk kompatibilitas.
- `director.ts` memakai tabel `SCRIPT_STYLES` — satu identitas gerak per
  `choreographyKey` (kalimat pemikul dibelah lines/words/chars sesuai
  identitas; beat tetap register baca). Ambang cue TIDAK berubah (e2e
  mengunci 0.74 rest dan [0.48, 0.7] prolog). `SLUG_IDENTITY` memecah
  1958→1990 (`marketDeparture`) tanpa menyentuh kontrak CMS.
- Saklar debug: `?motionDebug=1` (atau `NEXT_PUBLIC_MOTION_DEBUG=1`)
  menyalakan marker ScrollTrigger dan `window.__kediriMotion.activeTriggers()`;
  hanya dibaca di dalam effect (kontrak hidrasi). Jangan pernah `markers: true`
  literal.
- `MotionRefreshGate` (sekali per halaman) me-refresh ScrollTrigger setelah
  `fonts.ready`, media kritis, dan video lanjutan prolog. `ReadoutBatch`
  memakai `ScrollTrigger.batch` `once` untuk 26 strip arsip — hanya strip di
  bawah viewport yang disembunyikan (tautan dalam tidak boleh meninggalkan
  strip transparan).
- Semua act header kini bergerak lewat `ActHeaderReveal` mode `card` /
  `wipe` / `scrubWords` (Babak III = sorot kata mengikuti gulir). Finale
  punya island `FinaleMotion`. Interlude memakai clip-path wipe, pin 420%.
- Bug yang diperbaiki: kredit prolog menimpa pelat pada reduced/mobile
  (`.prologue-opening { display:none }` di blok alur statis); nama 1042
  menimpa paragraf di mobile (aturan baris "name" kini seluruh mobile);
  garis jembatan 1869 tak terlihat (opacity 0.62, stroke 2.5).
- e2e baseline SEBELUM perubahan di mesin ini: 52 pass / 35 fail / 17 skip —
  kegagalan arsip/pencarian karena tanpa basis data CMS, plus tes prolog
  lama yang usang (`data-opening-frame`, `dataset.intro` tidak ada lagi di
  `src/`). Bandingkan selalu terhadap baseline itu, bukan terhadap nol.
- Belum diverifikasi: Safari/Firefox (config Playwright hanya Chromium),
  DevTools Performance di GPU sungguhan.

**Jeda "bukti prasasti" scroll-driven terpasang di antara Prolog dan Act I**
(direktif Chief 2026-08-30, detail penuh: DECISIONS 2026-08-30). Section baru
`PrologueInscriptionInterlude` — di luar registry koreografi shot
(`scenes.ts`/`director.ts`), karena kontennya bukan naskah CMS: satu
`gsap.timeline` di-scrub LANGSUNG oleh `ScrollTrigger` (pin, scrub 0.5,
bobot tidak seragam, pin 700%), enam-tujuh target reveal (label+pembuka,
empat kartu prasasti Harinjing B/Ceker/Kamulan/Mula Malurung, penutup, lalu
video lanjutan Daha sebagai reveal TERAKHIR — full-bleed, tidak fade-out)
bergiliran tampak persis mengikuti posisi gulir. Video pembuka (Jam 1
`prologueReveal`) tetap pudar lewat `addLosingScaleExit` bawaan (0.16) —
JANGAN naikkan lagi opacity target itu tanpa e2e penuh; percobaan ke 0.02
sempat memicu 2 tes goyang dan sudah dibatalkan. Mobile/reduced-motion tidak
pernah dipin — statis dalam alur dokumen (kontrak aksesibilitas situs).

**Act I diganti** (direktif Chief 2026-08-30): judul "The Land Remembers" →
**"1,100+ Years of Kediri"**; `introCopy` jadi 3 paragraf (`ActDto.introCopy`
kini `string | readonly string[]`, backward-compatible). **Tiket tonggak
sejarah** (`ActMilestoneTicker`) di kepala Act I: 7 baris tanggal (1042–2024,
melintasi SELURUH Journey) bergantian dengan efek typing per-karakter, loop
tak berhenti, berbasis WAKTU — hanya aktif `(prefers-reduced-motion:
no-preference) and (min-width: 48rem)`, SAMA seperti konvensi motion
situs lainnya (mobile tidak pernah dapat motion-pin). Jangan hapus syarat
`min-width` itu — pernah bikin e2e mobile nav-clearing gagal karena
`min-height` ticker menggeser tinggi Act I.

**BG "The Land Remembers" dengan citra scene 879 — PERNAH DICOBA, SALAH,
SUDAH DIBATALKAN PENUH.** Jangan diulang: citra `01-879-first-mark.webp`
masih dipakai scene "The First Mark" sendiri tepat di bawahnya (beda dari
kasus "Panjalu Rises" yang boleh pinjam citra Daha karena Daha sudah pindah
ke video). BG Act I sekarang polos (`var(--cinema-canvas)`) lagi, seperti
act lain kecuali Panjalu Rises.

Catatan gate lama yang masih berlaku: Next 16 menolak dev server kedua —
matikan dev 4320 sebelum e2e; Next dev menulis ulang `importMap.js` tanpa
format (lint flake); `rm -rf apps/web/.next` sebelum `project-standalone
verify`. **Flakiness e2e paralel** (baru diamati 2026-08-30): saat
`pnpm test:e2e` dijalankan berkali-kali berturutan di mesin ini, SATU tes
acak (beda tiap run — pernah `home leads into the journey`, `prologue stage
beats have no local panel`, `prologue disclosure is complete immediately
with reduced motion`) kadang gagal lalu PASS lagi di run berikutnya tanpa
perubahan kode — kontensi 6 worker paralel + dev server cold-compile, BUKAN
regresi. Jangan panik pada satu run merah; jalankan ulang 1-2 kali sebelum
menyimpulkan ada bug nyata.

## Bukti terakhir yang benar-benar dijalankan (2026-09-03)

| Perintah | Hasil |
| --- | --- |
| `pnpm run typecheck` | PASS, 0 error |
| `pnpm run lint` | PASS, 0 error, 16 warning `noDescendingSpecificity` lama di `globals.css` |
| `pnpm run test` | PASS — 7 file, 81 tes; token gate 52 contrast check, 0 raw value |
| `pnpm test:e2e` (DB compose capsule aktif) | HEAD **71/16/17** vs sumber pra-perubahan `3a12b87` **72/15/17**; satu-satunya beda "home leads into the journey" — lulus 3/3 saat diulang terisolasi (flaky paralel). Tanpa DB: 54/33/17 vs baseline 52/35/17 |
| Playwright manual (Chromium) | Navigasi SPA: ScrollTrigger 68 → 0 → 68; deep link 1135 lalu gulir naik: strip arsip di atasnya opacity 1; font terlambat 4 s: label Act I tidak misfire; WebKit smoke PASS; Firefox belum terpasang |
| `pnpm run build` | PASS exit 0 (webpack, 15/15 halaman statis) — sesudah `docker compose -f infra/docker-compose.yml up -d`, `db:migrate`, `db:seed`; stack compose dibiarkan hidup |
| `check-production-journey.mjs` / `verify-production` | PASS: 3 scene CMS, 0 marker editorial; 12 record, 0 kritis, 0 warning |

Sudah di-commit lokal (belum di-subtree-push): `dfc5a97` fix(journey) token/debug/
refresh/CSS, `15c5891` feat(journey) identitas director, `4469ce9` feat(journey)
kartu act/interlude/finale/batch, `d90aae3` docs(journey) audit + arc + handoff.

## Tindakan berikutnya

1. Perluas `check-production-journey.mjs` ke path statis
   `public/journey-approved/`.
2. Keputusan Chief atas flag F1–F5 di `docs/shots/image-manifest.md`.
3. Record rights/provenance CMS untuk seluruh media pratinjau (termasuk
   video) sebelum rilis publik final.
4. Tinjauan visual independen Sentra-GSAP atas identitas per-section yang
   baru (`docs/GSAP_AUDIT.md` §5); `npx playwright install firefox` lalu
   smoke Firefox; Performance panel di GPU sungguhan; perbaiki/hapus tes
   prolog usang (`data-opening-frame`, `dataset.intro`) di `smoke.spec.ts`.
5. Phase 17–19 (mobile per scene, aksesibilitas manual, budget performa);
   Phase 22 (deployment) tetap menunggu otorisasi eksplisit Chief (G02).
6. Pertimbangkan formalisasi flakiness e2e paralel di atas — kalau makin
   sering, mungkin perlu kurangi worker count di `playwright.config.ts` atau
   naikkan timeout default, bukan terus rerun manual.

## Publikasi (2026-08-29, otorisasi eksplisit Chief)

Rantai commit kediri terbaru (termasuk `5feb6a1` — audit editorial museum +
Scene 10) dipublikasikan lewat `git subtree split --prefix=projects/product/kediri-history
-b <branch>` lalu `CHIEF_PUSH_PROJECTS_OK=1 CHIEF_PUSH_OK=1 git push kediri
<branch>:main`, ke `https://github.com/drferdii/Kediri-Kings-Century`
(remote `kediri`, branch `main`, HEAD `e1a6044`, fast-forward dari
`8c36e88`). Branch split lokal dihapus setelah push. Sebelumnya salah
tracking sempat menunjuk `main` lokal ke remote `avery` — dibetulkan ke
`origin/main`, tetapi **origin adalah histori terpisah (rewrite Chief
2026-08-25, `projects/**` dibuang) — JANGAN pernah push/merge/fetch main
lokal dari/ke `origin`** (lihat `BOUNDARIES.md` root). Publikasi kediri
SELALU lewat remote `kediri` via subtree, tidak pernah lewat `origin`.
Kerja sejak `dc06e31` (fix prolog video-continuation) BELUM di-subtree-push.

GitHub melaporkan 5 kerentanan dependabot (3 moderate, 2 low) di
Kediri-Kings-Century pasca-push — belum ditinjau, follow-up terpisah.

## Catatan lintas-repositori

Working tree ROOT monorepo saat ini campur kerja sesi lain yang bukan milik
capsule Kediri (avery, sentra-gsap teardown, dsb) — JANGAN tercampur dalam
commit capsule. `/verify` skill di level root (SAFRS governance,
`pnpm governance`/`pnpm check`) SENGAJA tidak dijalankan sesi ini atas
konfirmasi Chief — verifikasi dilakukan lewat `pnpm verify` milik
kediri-history sendiri, bukan governance root, supaya tidak ikut menyapu
uncommitted diff sesi lain.
