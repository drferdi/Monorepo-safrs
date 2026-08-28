# HANDOFF — Keadaan Kediri Saat Ini

> Baca lebih dulu setiap sesi. **Ditimpa**, bukan ditambah — ini keadaan sekarang, bukan log.
> Status fase: `PROGRESS.md`. Keputusan durable: `DECISIONS.md`. Pagar: `BOUNDARIES.md`.

Last updated: 2026-08-28

---

## Keadaan sekarang

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

**BELUM dijalankan sesi ini:** `pnpm run verify` penuh
(check-production-journey + verify:production — butuh Postgres hidup);
jalankan tanpa `SHOW_EDITORIAL_PREVIEW` sebelum rilis.

## Tindakan berikutnya

1. `pnpm run verify` penuh + perluas `check-production-journey.mjs` ke path
   statis `public/journey-approved/`.
2. Keputusan Chief atas flag F1–F5 di `docs/shots/image-manifest.md`.
3. Record rights/provenance CMS untuk seluruh media pratinjau (termasuk dua
   video) sebelum rilis publik final.
4. Koreografi khusus untuk scene yang masih memakai flavor default + transisi
   kausal antar-act; tinjauan visual independen Sentra-GSAP.
5. Phase 17–19 (mobile per scene, aksesibilitas manual, budget performa);
   Phase 22 (deployment) tetap menunggu otorisasi eksplisit Chief (G02).

## Publikasi (2026-08-27, otorisasi eksplisit Chief)

Commit `64bbadd` dipublikasikan sebagai subtree murni ke
`https://github.com/drferdii/Kediri-Kings-Century` (remote `kediri`, branch
`main`). Push berikutnya: `git subtree split` ulang + `CHIEF_PUSH_OK=1` —
tetap hanya atas perintah Chief.

## Catatan lintas-repositori

Dua check SAFRS root merah karena sebab warisan non-Kediri (lihat HANDOFF
root). Change set root Monorepo lain (avery, sentra-gsap teardown, dsb.) milik
pekerjaan lain — jangan tercampur dalam commit capsule.
