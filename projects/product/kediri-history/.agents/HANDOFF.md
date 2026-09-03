# HANDOFF — Keadaan Kediri Saat Ini

> Baca lebih dulu setiap sesi. **Ditimpa**, bukan ditambah — ini keadaan sekarang, bukan log.
> Status fase: `PROGRESS.md`. Keputusan durable: `DECISIONS.md`. Pagar: `BOUNDARIES.md`.

Last updated: 2026-09-04 (sesi sinematik — Fable 5.1 arah kreatif, tiga lane Opus 5)

---

## Status commit

Pekerjaan tiga sesi di bawah ini DI-COMMIT sebagai satu rantai atas perintah
Chief (2026-09-04): `af80476` "feat(journey): cinematic first visual, light-era
legibility, framing restored, gated video". Sengaja TIDAK ikut: dua mp3 tak
terpakai di `public/journey-approved/`, `project-video/backup|output|output_1080p`
(render sumber), log Zed, dan `.playwright-mcp/`. Belum di-subtree-push ke
remote `kediri` (menunggu perintah Chief).

Tiga sesi yang tergabung di commit itu, pada berkas yang sama:

1. **Sesi 2026-09-03 sore**: Prolog kamera prosedural, jeda prasasti pindah
   setelah 921, `prologue-visual-label.tsx` dihapus, dan — TANPA keputusan
   tercatat — transform framing `<img>` diganti `transform: none` (dipulihkan
   sesi ini, lihat DECISIONS 2026-09-04 sesi sinematik).
2. **Sesi 2026-09-04 pagi**: pembuka Prolog bertahap, penempatan video 1080p.
3. **Sesi 2026-09-04 sinematik (ini)**: keterbacaan era terang, framing
   dipulihkan + 1869/two-bridges, gate video, polesan Prolog, baseline hijau.

**Jangan `git stash` per-path** untuk mencari baseline — hasilnya pohon
Frankenstein (terbukti 2026-09-04 pagi). Baseline kini `af80476`.

## Keadaan sekarang

### Prolog (struktur direktif Chief 2026-09-04 pagi, DIPERTAHANKAN)

Satu bidikan di-pin 420/300 svh, seluruhnya digerakkan gulir:

| Progres     | Yang tampak                                                          |
| ----------- | -------------------------------------------------------------------- |
| 0,00 → 0,14 | Opening Screen resmi Kediri 2026 (judul, lead, dua beat, citra 2026) |
| 0,14 → 0,38 | `stage-void` gelap + judul sinematik "Kediri: A Century of History…" |
| 0,38 → 0,58 | Footage kota kuno (`00-prologue.mp4`) + kredit presenter sepertiga bawah |
| 0,54 → 0,68 | Naskah era Daha di atas kanvas gelap                                 |
| 0,62 → 0,80 | Footage kehidupan sehari-hari (`00-prologue-daha.mp4`)               |
| 0,80 → 1,00 | Veil kota, empat garis air memipih, horizon tembaga, seam, portal 879 |

Polesan sesi ini (detail: `docs/shots/00-prologue-2026.md` §"Polesan
2026-09-04"): seam handoff (bukan balok emas), blur judul 6/3 px, kredit
presenter di sepertiga bawah, crop 1,09× SEMENTARA untuk menyembunyikan
watermark render 1080p, alur statis "frame" lalu "overture".

**Layar pertama = title sequence** (direktif Chief "just a cinematic first
visual", DECISIONS 2026-09-04 lanjutan): entrance ±2,4 s milik director
(`intro[]` + `settleIntro`, cue negatif) — citra dari gelap dengan letterbox
`--letterbox` yang membuka dan dorongan 1,10 → 1 pada `.stage-media` (BUKAN
surface), lalu eyebrow → judul topeng baris → lead → beat → cue. Babak citra
dibuat sinkron, babak naskah setelah fonts.ready. Gulir > 0,01 melompatkan ke
akhir. Keadaan awal opacity 0 hanya di media query varian motion +
blok `scripting: none` pengembali. Mobile/reduced tidak berubah.

- Jendela footage = `PROLOGUE_OVERTURE_WINDOWS` di `modules/motion/scenes.ts`
  (satu sumber untuk fade dan pemutaran; pemutaran dihitung ulang dari progres).
- Kedua render 1080p (`00-prologue.mp4` = `opening.mp4`, `00-prologue-daha.mp4`
  = `Daha.mp4`, dikonfirmasi identik lewat metadata MP4) MASIH memuat watermark
  sudut kanan-bawah. `05-daha-centre-of-power.mp4` (1280×720) dan `jayabaya.mp4`
  (1504×832) BELUM diganti 1080p — padanannya `dahanasada.mp4` / `Jayabaya.mp4`.

### Keterbacaan paruh kedua (Babak VI–IX, `data-layout="right"`)

`.stage-media-shade` untuk tata letak kanan kini cermin (berat di kanan);
era `colonialIndustrial` memakai veil gading lebih tebal di desktop dan mobile.
Diverifikasi tangkapan layar: sugar, 1906, 1912, people terbaca; 1958, 2024
(era gelap, tata letak kanan) tidak berubah keterbacaannya.

### Framing Authority Rule 1

Transform `scale(var(--frame-zoom)) translate(...)` pada `<img>` panggung
DIPULIHKAN — tanpa itu jendela 879/921/1015/1042 tidak pernah diterapkan di
browser dan kata "kadhiri" terbakar tampil lagi. Jendela baru:
`1869-brantas-bridge` (sumber 1389×1132, BUKAN 3:2) dan
`two-bridges-two-centuries` (REDO-ASSET-005/006), gate vitest
`framing-baked-text.test.ts` kini 21 kasus. Bila sebuah jendela terasa terlalu
besar, ubah jendelanya di `framing.ts` — jangan matikan mekanismenya.

### Gate video scene

`modules/motion/media-gate.ts` (baru) memiliki pemutaran `.stage-media video`
(Daha, 1135): IntersectionObserver pada `.scene-stage` (bukan `.stage-media`
yang dibesarkan dolly), threshold 0,25; reduced motion tidak pernah memutar;
`autoPlay` dihapus dari `scene-media.tsx` (poster = citra scene, komposisi
utuh tanpa JS). Cabang video act-header di `journey/page.tsx` masih `autoPlay`
tetapi mati (tidak ada `.mp4` di `ACT_HEADER_MEDIA`).

### Yang masih berlaku dari sesi sebelumnya

- Jeda bukti prasasti SETELAH Scene 921, pin 320%, wipe clip-path per kartu.
- Act I: `ActMilestoneTicker` hanya `(prefers-reduced-motion: no-preference)
  and (min-width: 48rem)` — jangan hapus syarat `min-width`.
- BG Act I dengan citra 879 PERNAH DICOBA, SALAH, DIBATALKAN — jangan diulang.
- Scene 1135 memakai footage Jayabaya dengan status epistemik tercetak di
  halaman (sosok raja rekaan) — jangan hapus kalimat itu.
- Kartu "Panjalu Bangkit" memakai citra diam Daha.

## Bukti terakhir yang benar-benar dijalankan (2026-09-04, sesi sinematik)

| Perintah                                                   | Hasil                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `npx biome check src tests e2e` (apps/web)                 | PASS — **0 error**, 24 warning CSS (`noImportantStyles`, `noDescendingSpecificity`; 4 baru dari aturan varian motion layar pertama) |
| `npx vitest run` (apps/web)                                | PASS — **8 berkas, 92 tes** (+4 media-gate, +6 framing)               |
| `npx tsc --project tsconfig.json` (apps/web)               | PASS, 0 error                                                         |
| `node scripts/check-tokens.mjs`                            | PASS — 52 pemeriksaan kontras, 0 raw value                            |
| `npx next build --webpack` (apps/web)                      | PASS, exit 0, 20 rute (dijalankan bersamaan dev 4320; dist `.next/dev` terpisah) |
| `node scripts/check-production-journey.mjs`                | PASS — 3 scene CMS, 0 marker editorial                                |
| Tinjauan visual browser (dev 4320): desktop 1224×1040 & 1440×900, mobile 375×812 | Seluruh section Prolog → Finale; Daha/1135 hanya berputar saat tampak; crop 921/879/1869/two-bridges tanpa teks terbakar |

**Sebelum sesi ini** (laporan Opus baseline, read-only): lint **2 error**
(`prologue-scene.tsx` noImgElement + noArrayIndexKey), token gate **4 raw hex**
di `globals.css` — HANDOFF lama keliru mengklaim PASS.

**TIDAK dijalankan / tidak dapat dijalankan:**

- **Playwright e2e**: Next 16 menolak dev server kedua di 4321 selama dev 4320
  (PID 10168, milik sesi lain) hidup; `next start` 4321 tidak setara karena
  `/journey` di-prerender tanpa pratinjau editorial. Matikan dev 4320 dari sesi
  pemiliknya, lalu `npx playwright test`. Catatan Opus: dari 4 kegagalan e2e
  yang HANDOFF lama sebut "usang", hanya 1 yang terbukti usang (sudah
  diperbaiki); `Scene 1015 Carama`, `Timeline pushState`, `Act I opening
  transition` masih punya seluruh hook DOM-nya di `src` → kemungkinan bug
  perilaku, bukan kontrak basi.
- **Gate Sentra-GSAP root** (`scripts/sentra-gsap/verify.mjs`): TIDAK ADA di
  Monorepo → **FAIL** (BOUNDARIES §5: gate yang tidak dijalankan = gagal).
- `verify-production` (butuh urutan build → server segar), Firefox, profil GPU
  sungguhan, reduced-motion di browser (perlu emulasi Playwright).
- `rtk` tidak ada di PATH; `pnpm` tidak ada di PATH (pakai `corepack pnpm`).

## Jebakan yang menggigit sesi ini (2026-09-04 sinematik)

1. **Emulasi viewport Browser pane rusak setelah beberapa menit**: tangkapan
   layar menjadi bidang krem polos padahal DOM sehat. Reset preset `desktop`
   + reload memulihkannya. Pakai ukuran pane asli untuk tinjauan panjang.
   **rAF tab latar belakang di-throttle ke 1 fps** (Browser pane dan halaman
   Playwright yang tidak di depan): tween berbasis waktu tampak macet karena
   lag smoothing GSAP. Verifikasi entrance dengan Playwright
   `page.bringToFront()` (rAF 38–166 fps), jangan dari Browser pane.
2. **Posisi section tidak bisa dihitung dari `rect.top + scrollY`** di bawah
   ScrollSmoother (dan tidak dari rect yang dipin). Yang andal:
   `rect.top - smoothContent.getBoundingClientRect().top` lalu `scrollTo`.
3. **`.stage-media` dibesarkan dolly** sampai ~1,7× viewport → rasio
   IntersectionObserver tak pernah mencapai 0,25; amati `.scene-stage`.
4. **Token gate menolak `border-radius: 999px`** (raw radius) — pakai token
   radius atau hilangkan.
5. **Biome menuntut `biome-ignore noArrayIndexKey` tepat di atas atribut
   `key`**, bukan di atas `.map(`.
6. **Higgsfield MCP**: saldo 0 kredit, paket free → generate_image terblokir.
7. Catatan lama yang masih berlaku: Chromium Playwright bawaan tidak
   mendekode H.264 (pakai `channel: "chrome"`); `file://` video diblokir;
   `rm -rf apps/web/.next` sebelum `project-standalone verify`.

## Tindakan berikutnya

1. Keputusan Chief: (a) kalimat naskah Daha "Yang tampak berikut ini …" pada
   alur statis; (b) grammar kredit "Present" → "Presents"; (c) render 1080p
   tanpa watermark (lalu hapus `scale(1.09)` di `.prologue-overture-clip
   video`); (d) padanan 1080p untuk Daha dan Jayabaya.
2. Subtree-push `af80476` ke remote `kediri` bila Chief memerintahkan
   (lihat bagian Publikasi); JANGAN ke `origin`.
3. Matikan dev 4320 dari sesi pemiliknya, jalankan e2e, triase tiga kegagalan
   yang kemungkinan bug perilaku (1015 Carama, Timeline pushState, Act I
   transition).
4. Bila kredit Higgsfield tersedia: kandidat pengganti citra 15 (sugar —
   grading paling jenuh) dan 12 (wajah raja frontal, flag F5); kandidat masuk
   scratchpad/pratinjau, bukan produksi, sampai Chief menetapkan provenance.
5. Phase 17–19 (mobile per scene, aksesibilitas manual, budget performa);
   Phase 22 (deployment) menunggu otorisasi eksplisit Chief (G02).

## Publikasi (2026-08-29, otorisasi eksplisit Chief)

Rantai commit kediri terbaru dipublikasikan lewat `git subtree split
--prefix=projects/product/kediri-history -b <branch>` lalu
`CHIEF_PUSH_PROJECTS_OK=1 CHIEF_PUSH_OK=1 git push kediri <branch>:main`, ke
`https://github.com/drferdii/Kediri-Kings-Century` (remote `kediri`, branch
`main`, HEAD `e1a6044`). **origin adalah histori terpisah — JANGAN pernah
push/merge/fetch main lokal dari/ke `origin`.** Kerja sejak `dc06e31` BELUM
di-subtree-push. GitHub melaporkan 5 kerentanan dependabot (3 moderate, 2 low)
— belum ditinjau.

## Catatan lintas-repositori

Working tree ROOT monorepo memuat kerja sesi lain (avery, sentrabot, skill
Codex, dsb) — JANGAN tercampur dalam commit capsule. `/verify` root SENGAJA
tidak dijalankan; verifikasi memakai perintah milik kediri-history sendiri.
