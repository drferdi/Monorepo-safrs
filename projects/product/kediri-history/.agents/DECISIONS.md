# DECISIONS — Keputusan Durable Kediri

Append-only, terbaru di atas. Tiap entri: tanggal, keputusan, alasan singkat, bukti.
Keputusan lintas-repositori tetap dicatat di `.agents/DECISIONS.md` root.

---

## 2026-08-30 — Jeda "bukti prasasti" scroll-driven, video lanjutan sebagai reveal terakhir, revisi konten Act I, tiket tonggak sejarah

Direktif Chief in-session (iteratif, ScrollTrigger skill dipakai eksplisit).

(1) **Jeda bukti prasasti** — section baru `PrologueInscriptionInterlude`
antara Prolog dan Act I: mula-mula timer-based (video `ended` event → jeda →
lanjutan), lalu DIROMBAK jadi murni scroll-scrubbed atas permintaan Chief
("pergerakannya tergantung scroll") — satu `gsap.timeline` di-scrub langsung
oleh `ScrollTrigger` (pin, scrub 0.5), bukan trigger-lalu-bermain-sendiri
seperti Jam 2 milik shot canonical. Bidikan ini SENGAJA di luar registry
`scenes.ts`/`director.ts` karena kontennya bukan naskah CMS (lihat komentar
di berkas). Video pembuka (Jam 1 prologueReveal) tetap pudar lewat
`addLosingScaleExit` bawaan (0.16) — percobaan menambah nudge ke 0.02 di
`scenes.ts` DIBATALKAN karena memicu 2 e2e goyang saat suite penuh jalan
(`prologue stage beats have no local panel`, `prologue disclosure types...`).
(2) **Video lanjutan (Daha) jadi target reveal TERAKHIR** di dalam section
jeda itu sendiri — fade-in menggantikan kalimat penutup, full-bleed, tidak
pernah fade-out (sama seperti perlakuan beat terakhir). Timing awal (bobot
seragam, pin 550%) terlalu cepat dilalui gulir wajar — direvisi jadi bobot
tidak seragam (beat terakhir 3× porsi dari totalWeight) + pin 700%.
(3) **BG "The Land Remembers" dengan citra scene 879 — SALAH, DIBATALKAN.**
Sempat dipasang menyamai pola "Panjalu Rises" (pinjam citra scene pertama
act), tapi beda kasus: citra 879 MASIH dipakai scene "The First Mark" sendiri
di bawahnya (Daha sudah pindah ke video, jadi nganggur — 879 belum). Direvert
penuh ke BG polos atas komplain eksplisit Chief ("completely change the
order... lost concept").
(4) **Konten Act I diganti**: judul "The Land Remembers" → "1,100+ Years of
Kediri"; `introCopy` jadi 3 paragraf (perlu extend tipe `ActDto.introCopy`
ke `string | readonly string[]`, backward-compatible untuk 8 act lain +
field textarea Payload).
(5) **Tiket tonggak sejarah** (`ActMilestoneTicker`) di kepala Act I: 7 baris
tanggal (1042–2024, melintasi SELURUH Journey) bergantian dengan efek typing
per-karakter, loop tak berhenti, berbasis WAKTU (bukan scroll — satu layar
hero yang belum digulir, sama seperti kredit/kartu judul Prolog). Bug
ditemukan+diperbaiki sebelum commit: CSS `position:absolute` semula SELALU
aktif → tanpa-JS/reduced-motion tujuh baris bertumpuk tak terbaca; diperbaiki
jadi baseline alur normal, absolute-stacking hanya nyala lewat atribut
`data-ticker-motion` yang diset skrip. Bug kedua: matchMedia ticker awalnya
cuma cek `prefers-reduced-motion`, ikut nyala di MOBILE (beda dari konvensi
situs — mobile selalu tanpa motion-pin) — `min-height` tambahannya menggeser
tinggi Act I dan bikin e2e `early mobile shots clear the fixed navigation`
gagal (offset −13.6px). Diperbaiki: syarat `min-width: 48rem` ditambahkan.

Bukti: `pnpm verify` (lint 0 error/14 warning lama, typecheck, unit 71+token
gate, build 20 rute, check-production-journey 0 marker editorial, verify-production
12 record 0 kritis) PASS penuh. `pnpm test:e2e` — beberapa run awal
menunjukkan flakiness kontensi paralel (1 tes acak berbeda tiap run, pola
lama yang sudah tercatat), run bersih akhir **66/14/0**.

## 2026-08-29 — Arah editorial museum: body sans kecil, judul inskripsi, scrim, register baca; 1292 dipasang

Direktif editorial Chief 2026-08-29 ("Senior Creative Front-End Engineer &
Editorial UI Architect"), diterapkan token-level agar seragam di 26 scene:

(1) **Tipografi.** Peran kelima `--type-body` = Plus Jakarta Sans (400/500):
body copy sinematik `clamp(0.8125rem, 0.9vw, 0.9rem)`, lh 1.78, ls 0.025em,
tinta `--cinema-body-ink` rgba(240,240,235,0.82), ukur maksimal 42ch — di
SEMUA varian termasuk mobile (±13px; catatan ukuran baca mobile diserahkan ke
veto Chief). Judul era memakai `--type-display` (Cinzel 500, ls 0.05em, tanpa
tracking negatif); master-line serif 400 dengan ukuran diturunkan; micro-label
seragam 0.65–0.72rem ls 0.15em — de-emphasis lewat COLOR-MIX, bukan opacity
(kontrak a11y reduced-motion "tidak ada elemen tertinggal transparan").

(2) **Scrim beat** dikembalikan sebagai gradient halus kiri→transparan
(membalikkan sebagian `background: none` commit 0d4b005 atas direktif yang
lebih baru; blur backdrop ditolak — repaint per frame gulir).

(3) **Register BACA** (`MOTION.read`): naskah masuk y:16 + fade, power2.out,
stagger 0.15 — beat/master/tarikh; rotateX nama 921 diredam −55°→−20°.
Register "cine" tetap milik kredit Sentra dan kartu judul. **Parallax latar**
ambient (`MOTION.parallax` 4→−10%) pada KONTAINER `.stage-media` — tidak
pernah pada `img` pemegang transform crop anti-teks-terbakar. Reservasi
`min-height` passages diukur ulang untuk skala tipe baru; probe tabrakan
kelima scene berkunci: nol overlap.

(4) **Scene 10 (1292) dipasang** atas perintah Chief (menutup penangguhan F1;
derivatif webp digenerate ulang dari project-images). CAVEAT TERBUKA di
image-manifest F1: raster revisi masih memuat "JAYAKASTWANG", "RAJA KEDAHIRAN
TERAKHIR", dan atribusi keliru "pasukan Jayabaya (Raden Wijaya)".

(5) Dua tes interaksi 1135 diperkeras timing-nya terhadap lag ScrollSmoother
(assertion tak berubah); count media 25/1 → 26/0.

Bukti: typecheck, lint, unit 71, **e2e 61/13/0 dengan Postgres+MinIO hidup**,
dan **`pnpm run verify` penuh PASS exit 0** (build produksi, journey guard,
verify:production 12 record 0 kritis) — hutang verifikasi 2026-08-28 tertutup.

## 2026-08-28 — Video pembuka & Daha, latar act Panjalu Rises, publikasi aset pratinjau (otorisasi Chief)

Direktif Chief in-session (2026-08-28), ditutup perintah eksplisit "GIT COMMIT".

(1) **Video sebagai media hero**: prolog (halaman gelap pembuka) memakai
`00-prologue.mp4` (sumber `project-video/opening.mp4`); scene Daha memakai
`05-daha-centre-of-power.mp4` (sumber `project-video/dahanasada.mp4`).
Keduanya `autoplay muted loop playsinline`, dengan citra slot sebagai poster
+ fallback tanpa-JS — cat pertama identik dengan versi statis. Kamera GSAP
(dolly, mask `--lit`, transisi keluar) menyapu video persis seperti citra.
(2) **Citra Daha pindah** menjadi latar kartu judul act "Panjalu Rises"
(`ACT_HEADER_MEDIA`, mode pratinjau editorial, opacity rendah + gradien —
kartu judul tetap dipimpin naskah). (3) **Publikasi aset pratinjau** (route
`SHOW_EDITORIAL_PREVIEW` + `public/journey-approved/` statis, termasuk kedua
mp4) kini TEREKAM sebagai keputusan Chief; catatan tetap terbuka:
`check-production-journey.mjs` belum mencakup path statis (follow-up), dan
verifikasi Redo Register membuktikan crop, bukan rights — record rights CMS
tetap terutang sebelum rilis publik final. (4) **Teks dobel** diperbaiki dua
sisi: scene tanpa `choreographyKey` kini menumpuk beat secara statis via CSS
(`.scene:not([data-choreography])`), dan mesin beat director menyembunyikan
beat lama dengan fade cepat deterministik — tidak pernah reverse pelan.
(5) **Variasi arah** per koreografi (`FLAVORS` di director.ts): arah masuk
tarikh/beat berbeda antar-scene dan tetap menjawab argumen historisnya.
Bukti: unit 71, e2e 56 (3 assertion media diadaptasi ke kontrak video —
integrity review rule 7 dicatat di sini), typecheck, lint hijau.

## 2026-08-28 — Model dua-jam + stack 100% GSAP; smooth scroll opt-in Journey

Direktif Chief in-session (2026-08-28), setelah teardown empat situs referensi
(bombon.rs, jasminadenner.com, exp-ion.lusion.co, whiteoutworks.com) dan
prototype bukti yang disetujui Chief ("Yes I like that, now apply that").

(1) **Model dua-jam.** Doktrin "gerak scrub = linear" dipersempit: ia tetap
berlaku untuk KAMERA (permukaan, cahaya, goresan, handoff — timeline factory
`scenes.ts`), tetapi NASKAH (tarikh, kalimat pemikul, nama, beat editorial)
kini DI-TRIGGER pada ambang progres dan bermain di jamnya sendiri dengan ease
ekspresif (`modules/motion/director.ts`, CustomEase "cine"). Alasan: naskah
yang menumpang jam kamera terasa mekanis; seluruh situs referensi DOM-based
memisahkan dua jam ini.

(2) **Stack motion 100% GSAP resmi**: core + ScrollTrigger + ScrollSmoother +
SplitText + CustomEase. Tanpa Lenis/Locomotive/three.js.

(3) **ScrollSmoother opt-in di Journey** (revisi terbatas atas doktrin
no-smooth-scroll UX Bible §17; terbuka untuk diveto Chief). Mitigasi: smoother
mempertahankan scrollbar NATIVE sehingga restorasi scroll peramban tetap
hidup; hanya desktop/tablet tanpa reduced-motion; mobile/reduced/tanpa-JS
tetap scroll native + DOM statis. Konsekuensi teknis: CSS sticky tidak bekerja
di dalam konten yang ditransformasikan → pin ScrollTrigger mengambil alih
dengan `pinSpacing: false` di atas `.scene-pin-space` server-rendered (tetap
nol CLS), dan `end` kini DIUKUR dari tinggi pin-space sungguhan (kontrak
pacing CSS↔JS menjadi tunggal). Nav journey (fixed) hidup DI LUAR
#smooth-wrapper — elemen fixed di dalam konten transform ikut tergulir
(terbukti e2e "Timeline pushState lands on a readable early scene").

(4) **SplitText + aria "auto"** memenuhi Authority Rule 1: induk menerima
aria-label utuh, potongan aria-hidden — naskah historis tidak pernah keluar
dari pohon aksesibilitas (dikunci e2e "no historical text is ever removed").

(5) **Keadaan baca = DOM server-render.** Cabang mobile/reduced tidak lagi
membangun timeline sama sekali; `setReadableState` (60 baris duplikasi nilai
yang sudah terbukti drift) dihapus. Bukti: typecheck, lint, 71 unit test,
56 e2e, build produksi hijau; verifikasi runtime dua-jam + deep-link
`#921-kadhiri` di dev server.

## 2026-08-27 — Pass refinemen lima scene awal: beat editorial, handoff kausal

Direktif refinemen Chief dieksekusi pada Scene 00–04. (1) Paragraf kanon
dikelompokkan menjadi BEAT sinematik (`beatGroups` di production-narrative —
indeks ke paragraf, kalimat tidak pernah ditulis ulang), hadir bergiliran
dengan JEDA HENING di antaranya; beat pertama tiap kelompok bersuara lebih
besar. (2) Scene 03 (1015) mendapat kunci koreografi ke-12 `nameEndures` —
kamera nyaris diam karena klaimnya Research Hold: dunia bergeser, nama
bertahan; migrasi `20260827_120000_name_endures_key` menambah nilai enum
(down: validasi lalu biarkan — enum PG tidak mendukung DROP VALUE). (3) Prolog
mendapat `prologueReveal` + pin. (4) Handoff kausal antar-scene lewat
`SCENE_HANDOFFS` (water→copper, groove→mark, name→world, record→territory,
territory→centre) — elemen dekoratif murni, tanpa makna bukti. (5) Penempatan
teks per komposisi citra (921 ruang negatif kanan). Bukti: e2e 50/8/0,
tangkapan layar sekuens 00–04.

## 2026-08-27 — Naskah bergiliran DI DALAM shot; tidak ada bagian bacaan kedua

Menggantikan keputusan di bawahnya pada hari yang sama. Latar-ulang citra di
bagian bacaan ditolak Chief — citra jadi tayang dua kali. Bentuk finalnya:
paragraf naratif pindah ke DALAM panggung (`.stage-passages` di pelat), dan
timeline shot yang sama menghadirkannya bergiliran selama dataran baca
(0.60–0.82) — satu kalimat pada satu waktu di halaman citra, paragraf terakhir
tidak pernah pergi. Pin diperpanjang (+70–80svh, tetap dibedakan per key) untuk
memberi ruang baca. Varian mobile/reduced/tanpa-JS menampilkan seluruh paragraf
statis menumpuk (dokumen selalu utuh; hanya opacity yang dianimasikan). Bagian
setelah shot kini hanya strip arsip: status epistemik, bukti, navigasi.
Bukti: `modules/motion/scenes.ts` (blok passages), `scene-section.tsx`,
`globals.css` (`.stage-passages`), e2e 40/4/0.

## 2026-08-27 — Bacaan hidup di dalam dunia visual scene, bukan di latar polos

Chief menolak pola "panggung sinematik lalu blok teks di latar hitam" sebagai
amatir, dan benar: struktur GSAP+citra | teks itu memutus scene jadi dua
halaman. Kini `.scene-readout` memuat kelanjutan citra scene yang sama sebagai
latar (`readout-backdrop`, kamera lebih dalam, crop lebih rendah), naskah tiba
di atasnya lewat pelat gradien editorial (perlakuan sah Art Direction Bible §6),
kalimat pembuka jadi lead besar, dan kedatangan paragraf dikoreografikan
ScrollTrigger kedua di `attachScene` (opacity saja — naskah tidak pernah keluar
dari pohon aksesibilitas; tanpa JS komposisinya sudah utuh). Sumber citranya
satu fungsi (`sceneMediaSource`) supaya panggung dan bacaan tidak bisa berbeda
dunia.

## 2026-08-27 — 27 citra produksi masuk lewat jalur pratinjau editorial, bukan CMS

Chief menetapkan 27 hero image (Prolog + 26 scene; Finale memakai ulang citra
Prolog — bukan aset ke-28). Publikasi lewat `MediaAssets` menuntut record hak
dan provenance (kelas V/R) yang hanya Chief dapat tetapkan; mengarangnya berarti
memfabrikasi provenance. Karena itu citra hidup di `apps/web/editorial-preview/`
(WebP 1536w+768w), disajikan `/api/editorial-preview/` yang 404 di produksi, dan
`scripts/check-production-journey.mjs` menjaga tidak ada kebocoran ke build
produksi. Pemetaan + flag integritas: `docs/shots/image-manifest.md`. Daftar
putih route diturunkan dari naskah produksi, bukan daftar tangan.

## 2026-08-27 — Citra 1292 ditangguhkan karena teks terbakar yang keliru

Citra scene 10 memuat typo "JAYAKASTWANG" dan atribusi "pasukan Jayabaya
(Raden Wijaya)" — yang benar pasukan Raden Wijaya. Pada produk sejarah resmi,
slot kosong yang jujur menang atas teks salah: `ready=false`, kartu slot media
tampil, dan uji mengunci keadaan ini sampai citranya direvisi (flag F1).

## 2026-08-27 — Pacing per koreografi dicerminkan dua sisi

Direktif §19 melarang durasi seragam. `PIN_DISTANCES` per `choreographyKey`
hidup di `modules/motion/scenes.ts` dan DICERMINKAN `.scene-pin-space` per
koreografi di `globals.css`, karena ruang pin dirender server (tanpa CLS).
Mengubah satu sisi tanpa sisi lain memutus sinkron pin — periksa keduanya.

## 2026-08-26 — Teks scene tidak pernah memakai autoAlpha

`autoAlpha` GSAP menyetel `visibility: hidden`, yang mengeluarkan naskah
sejarah dari pohon aksesibilitas sampai pengunjung menggulir ke sana. Ketika
scene di-pin, judul scene 1135 benar-benar hilang — dan dua uji e2e
menangkapnya. Teks kini hanya memakai `opacity`; `autoAlpha` disediakan untuk
kanvas dekoratif yang memang `aria-hidden`. Kontraknya dikunci uji e2e yang
memeriksa setiap heading Journey tetap terlihat tanpa menggulir.

## 2026-08-26 — Lapisan era menimpa peran, bukan menambah peran baru

`[data-era]` menimpa `--cinema-canvas`, `--cinema-ink`, dan saudaranya. Karena
setiap komponen sudah memakai peran itu, tidak ada satu pun komponen yang perlu
tahu tentang era — dan tidak ada satu pun nilai warna di luar direktori token.
Blok era sebelumnya hanya mendefinisikan `--era-ground`/`--era-accent` yang
tidak pernah dipakai selector mana pun, sehingga lapisan era efektif mati sejak
awal.

Palet era masuk `kediri.json` DENGAN pasangan kontras per era, dan
`scripts/check-tokens.mjs` mengukurnya: 34 menjadi 52 pemeriksaan. Palet tanpa
pasangan kontras adalah gate yang tidak menguji apa pun — dan justru di atas
komposisi 70% gelap teks sekunder paling sering gagal.

## 2026-08-26 — Enam keadaan scene, dengan dataran istirahat yang eksplisit

Satu timeline dinormalkan ke total 1: reveal 0–0,55; dataran istirahat
0,55–0,82; transisi keluar sisanya. Dataran itu bagian yang paling mudah
dilupakan dan paling mahal bila hilang — tanpa ia, naskah penting hanya utuh
pada satu instan progres gulir.

Tiba lewat deep-link mencari titik tengah dataran itu, bukan awal rentang.
Dengan scene yang di-pin, tanpa pencarian ini `/journey#1135-...` mendarat di
komposisi separuh jadi — padahal tautan itu justru dibagikan supaya orang
membaca scene-nya. Transisi keluar meredupkan KANVAS, tidak pernah teksnya.

## 2026-08-26 — Pin adalah keputusan per varian

Desktop 110% tinggi viewport, tablet 70%, mobile dan reduced motion nol.
Mobile adalah novel grafis dengan alur vertikal asli (UX Bible bagian 26), dan
menggulir ruang kosong bukan aksesibilitas. Setiap scene tetap menyediakan
tautan "Lewati ke bab berikutnya" yang bekerja tanpa JavaScript, sesuai UX
Bible bagian 10: tidak ada pengunjung yang terjebak di dalam rangkaian pin.

## 2026-08-26 — Mount volume Postgres 18 di compose capsule diperbaiki

`infra/docker-compose.yml` memasang volume di `/var/lib/postgresql/data`. Image `postgres:18`
menolak start dengan konfigurasi itu: sejak 18 ia menyimpan data di subdirektori per-versi
mayor, jadi mount harus di induknya, `/var/lib/postgresql`. Cacat ini tidak terlihat selama
berbulan sesi karena Docker tidak pernah berjalan di mesin ini. Diperbaiki dan diuji saat
Chief menyalakan Docker.
Bukti: `infra/docker-compose.yml` (komentar menjelaskan alasannya), PostgreSQL 18.6 healthy,
seluruh rantai verifikasi lulus di atasnya.

## 2026-08-26 — Adapter S3 dan pemisahan bucket terbukti di lapisan objek

Sonda teknis mengunggah lewat Payload ke `kediri-public` dan `kediri-private`, lalu diperiksa
langsung di MinIO: anon GET derivatif publik **200**, anon GET master arsip **403**, dan
menghapus record ikut menghapus objeknya tanpa meninggalkan yatim. Pemisahan publik/privat
karena itu adalah perilaku yang terbukti, bukan konvensi penamaan. Fixture-nya draf, ditandai
non-historis, dihapus, dan basis data disemai ulang bersih.

## 2026-08-26 — Klaim tidak bisa lahir dalam keadaan terbit

`sourceLinks` adalah field join: ia tidak pernah hadir di `data`, sehingga gerbang publikasi
harus **menghitung** tautan yang benar-benar ada, secara asinkron. Konsekuensinya sebuah klaim
tidak dapat dibuat langsung sebagai `published`. Alur editorialnya menjadi: draf → lampirkan
`EvidenceLink` → terbitkan. Ini ternyata alur yang benar, bukan kompromi.
Bukti: `apps/web/src/payload/collections/EvidenceClaims.ts`, `apps/web/src/scripts/seed.ts`.

## 2026-08-26 — Build produksi memakai webpack, bukan Turbopack

Turbopack menulis symlink di bawah `.next/`, dan verifier standalone menolak **setiap** symlink
di pohon capsule. `next build --webpack` menghasilkan 20 rute yang identik dengan nol symlink.
Bukti: `docs/testing.md`, `AGENTS.md`, `docs/architecture.md`.

## 2026-08-26 — Perintah Payload ber-titik-dua dipindah ke `scripts/payload-cli.mjs`

Pemeriksa independensi capsule memecah nilai skrip berdasarkan spasi dan menguji tiap token
sebagai calon path; token seperti `generate:types` cocok dengan pola skema URI dan dilaporkan
sebagai path di luar capsule. Perintahnya dipindahkan ke dalam pembungkus sehingga kontrak
standalone tetap dapat diverifikasi **tanpa melemahkan satu pun gerbang**. Kosakata
`pnpm run …` tidak berubah.

## 2026-08-26 — `push: false` pada adapter Postgres

Skema dikelola migrasi. Push otomatis membuat basis data pengembang menyimpang dari migrasi
yang benar-benar dijalankan saat rilis, dan penyimpangan itu baru terlihat di produksi. Push
otomatis juga yang memutus koneksi PGlite saat pengembangan.

## 2026-08-26 — Port e2e dipisahkan ke 4321

Saat berbagi port 4320 dengan server produksi, Playwright memakai ulang server yang sudah
berjalan dan diam-diam menguji build lama — melaporkan hijau untuk kode yang belum pernah
dijalankan. Itu benar-benar terjadi sekali dan langsung diperbaiki.

## 2026-08-26 — `nodeLinker: hoisted` adalah syarat kebenaran, bukan gaya

Verifier standalone memindai seluruh pohon capsule untuk symlink **sebelum** pengecualian
`mutableStatePaths`, sehingga `node_modules` ikut dipindai. Linker default pnpm yang berbasis
symlink membuat capsule gagal verifikasi meski secara fungsional benar.

## 2026-08-26 — Batas modul ditegakkan uji, bukan paket (keputusan Chief G03)

Membuat paket internal `workspace:*` akan melanggar kontrak ekstraksi standalone. Batasnya
karena itu ditegakkan `tests/architecture/module-boundaries.test.ts` yang mem-parsing pernyataan
import sungguhan dan **gagal pada direktori modul yang tidak dikenal**, sehingga aturannya tidak
bisa diam-diam kedaluwarsa. Kemasan fisik menyesuaikan; tanggung jawab arsitektural tidak runtuh.

## 2026-08-26 — Kediri dikecualikan dari workspace root (keputusan Chief G01)

`pnpm-workspace.yaml` root menambahkan `- '!projects/product/kediri-history/**'`. Capsule
memiliki workspace, lockfile, konfigurasi, skrip, dan infrastrukturnya sendiri.
Bukti: `node tools/project-standalone/src/cli.mjs verify product/kediri-history` = PASS penuh
setelah menyalin **hanya** capsule ke direktori baru.
