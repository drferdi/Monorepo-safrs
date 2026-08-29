# HANDOFF — Keadaan Kediri Saat Ini

> Baca lebih dulu setiap sesi. **Ditimpa**, bukan ditambah — ini keadaan sekarang, bukan log.
> Status fase: `PROGRESS.md`. Keputusan durable: `DECISIONS.md`. Pagar: `BOUNDARIES.md`.

Last updated: 2026-08-29

---

## Keadaan sekarang

**Arah editorial museum terpasang (direktif Chief 2026-08-29).** Body copy
sinematik = Plus Jakarta Sans kecil (token `--type-body`, `--cinema-body-ink`)
dengan scrim gradient halus; judul era = Cinzel (`--type-display`); micro-label
seragam (de-emphasis via color-mix, bukan opacity — kontrak a11y). Register
BACA `MOTION.read` (y:16, power2.out, stagger .15) untuk beat/master/tarikh;
parallax ambient `MOTION.parallax` pada KONTAINER `.stage-media` (jangan
pernah pindahkan ke `img` — ia memegang transform crop anti-teks-terbakar).
`min-height` passages sudah diukur ulang untuk skala tipe baru. Scene 10
(1292) AKTIF atas perintah Chief — caveat teks terbakar TETAP TERBUKA di
image-manifest F1 (JAYAKASTWANG / KEDAHIRAN / atribusi Jayabaya). Bukti sesi:
e2e 61/13/0 dengan DB hidup + `pnpm run verify` penuh PASS (verify:production
12 record 0 kritis). Detail: DECISIONS 2026-08-29. Belum di-commit.

Jebakan verifikasi yang menggigit dua kali sesi ini: (a) tab Browser pane
yang di-background membekukan rAF — GSAP/ScrollSmoother tampak "mati" padahal
sehat; probe motion harus lewat Playwright headless atau tab yang di-front.
(b) exit code pipeline `pnpm ... | tail` adalah milik tail — selalu tangkap
exit `pnpm` sendiri.


**Model dua-jam hidup (direktif Chief 2026-08-28).** Setelah teardown empat
situs referensi (bombon.rs, jasminadenner.com, lusion, whiteoutworks) dan
prototype yang disetujui Chief, Journey memakai pemisahan struktural: KAMERA
(permukaan, cahaya, goresan, handoff, transisi keluar) tetap di-scrub linear
oleh factory `scenes.ts`; NASKAH (tarikh, kalimat pemikul, nama, beat
editorial) di-TRIGGER pada ambang progres oleh sutradara naskah
`modules/motion/director.ts` dan bermain dengan ease ekspresif (CustomEase
"cine", topeng baris/huruf SplitText, aria "auto" menjaga pohon
aksesibilitas). Stack 100% GSAP resmi: core + ScrollTrigger + ScrollSmoother +
SplitText + CustomEase — tanpa Lenis/three.js.

**ScrollSmoother opt-in Journey** (`modules/motion/smooth.ts`, refcount
singleton; desktop/tablet, tanpa reduced): scrollbar tetap native sehingga
restorasi scroll hidup. CSS sticky digantikan pin ScrollTrigger
(`pinSpacing:false`) di atas `.scene-pin-space` server-rendered — tetap nol
CLS, dan `end` DIUKUR dari tinggi pin-space nyata (kontrak pacing CSS↔JS kini
tunggal). Nav journey (fixed) hidup DI LUAR `#smooth-wrapper` — elemen fixed
di dalam konten transform ikut tergulir (terbukti e2e). `setReadableState`
dihapus: keadaan baca = DOM server-render; mobile/reduced tidak membangun
timeline sama sekali.

**Media video + variasi arah (direktif Chief 2026-08-28, di-commit atas
perintah "GIT COMMIT").** Prolog memakai `00-prologue.mp4`, scene Daha memakai
`05-daha-centre-of-power.mp4` (poster = citra slot; fallback tanpa-JS
identik); citra Daha pindah menjadi latar kartu judul act "Panjalu Rises".
Teks dobel diperbaiki dua sisi: scene tanpa `choreographyKey` menumpuk beat
statis via CSS `.scene:not([data-choreography])`, dan mesin beat director
menyembunyikan beat lama dengan fade cepat deterministik. Arah gerak per
koreografi berbeda-beda lewat `FLAVORS` (director.ts) — variasi yang tetap
menjawab argumen historis scene. Sumber video: `project-video/`.

**Publikasi aset pratinjau kini terekam sebagai keputusan Chief** (route
`SHOW_EDITORIAL_PREVIEW`, `public/journey-approved/` statis, kedua mp4).
Catatan tetap terbuka: `check-production-journey.mjs` belum mencakup path
statis (follow-up), dan record rights/provenance CMS tetap terutang sebelum
rilis publik final.

Catatan gate lama yang masih berlaku: Next 16 menolak dev server kedua —
matikan dev 4320 sebelum e2e; Next dev menulis ulang `importMap.js` tanpa
format (lint flake); `rm -rf apps/web/.next` sebelum `project-standalone
verify`.

## Bukti terakhir yang benar-benar dijalankan (2026-08-28)

| Perintah | Hasil |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` (biome) | PASS — 14 warning pre-existing |
| `pnpm test` (vitest) | PASS — 71 |
| `pnpm e2e` | PASS — 56 lulus, 10 dilewati, 0 gagal (3 assertion media diadaptasi ke kontrak video — rule 7 dicatat di DECISIONS) |
| `pnpm build` | PASS |
| Runtime dev server | Dua-jam hidup (kamera scrub + naskah triggered, mundur jujur); deep-link `#921-kadhiri` mendarat di dataran baca; kedua video playing readyState 4; beat anti-dobel terverifikasi (maks 1 beat tampil di semua sampel); mobile/reduced statis utuh |

**Update 2026-08-29:** `pnpm run verify` penuh sudah PASS (lihat Keadaan
sekarang); tabel di atas adalah bukti sesi 2026-08-28 dan tetap sah sebagai
riwayat. E2e kini 61/13/0 (count media 26/0; dua tes interaksi 1135
diperkeras timing terhadap lag smoother).

## Tindakan berikutnya

1. Perluas `check-production-journey.mjs` ke path statis
   `public/journey-approved/`.
2. Keputusan Chief atas flag F1–F5 di `docs/shots/image-manifest.md`.
3. Record rights/provenance CMS untuk seluruh media pratinjau (termasuk dua
   video) sebelum rilis publik final.
4. Koreografi khusus untuk scene yang masih memakai flavor default + transisi
   kausal antar-act; tinjauan visual independen Sentra-GSAP.
5. Phase 17–19 (mobile per scene, aksesibilitas manual, budget performa);
   Phase 22 (deployment) tetap menunggu otorisasi eksplisit Chief (G02).

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

GitHub melaporkan 5 kerentanan dependabot (3 moderate, 2 low) di
Kediri-Kings-Century pasca-push — belum ditinjau, follow-up terpisah.

Push berikutnya: `git subtree split` ulang dari `main` lokal +
`CHIEF_PUSH_PROJECTS_OK=1 CHIEF_PUSH_OK=1 git push kediri <branch>:main` —
tetap hanya atas perintah Chief.

## Catatan lintas-repositori

Dua check SAFRS root merah karena sebab warisan non-Kediri (lihat HANDOFF
root). Change set root Monorepo lain (avery, sentra-gsap teardown, dsb.) milik
pekerjaan lain — jangan tercampur dalam commit capsule.
