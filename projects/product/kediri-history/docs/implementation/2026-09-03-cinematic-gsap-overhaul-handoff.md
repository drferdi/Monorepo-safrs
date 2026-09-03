# KEDIRI — A Living Civilization: Cinematic GSAP Overhaul & Handoff

**Tanggal**: 3 September 2026  
**Status**: Approved, Implemented, Verified (81/81 Tests Passing, Token Contrast Passing, Clean Build)  
**Git Commit**: `7f116fd` (`feat(journey): cinematic gsap overhaul, prologue video sync, scroll cue, and middle format for act transitions`)  

---

## 1. Executive Summary & Ringkasan Perubahan

Sesi ini mengeksekusi pemulihan visual penuh dan pembaruan arsitektur sinematik GSAP untuk pengalaman **Journey** pada proyek *KEDIRI — A Living Civilization*. Seluruh arahan Chief/User telah diselesaikan dan diverifikasi:

1. **Sinkronisasi Video Prolog (00:00:00 Start)**:
   - *Issue*: Video pertama (`00-prologue.mp4`) sebelumnya terputar di background sejak awal render (`t = 0`), sehingga saat teks pembuka di kanvas hitam memudar pada detik ke-4, pengunjung melihat video yang sudah terpotong di tengah.
   - *Fix*: Di `director.ts` dan `prologue-video-sequence.tsx`, pemutaran video kini tepat dipicu pada detik ke-4.0 saat tirai visual terbuka, dengan `video.currentTime = 0`. Video tampil utuh dari frame pertama.

2. **Perbaikan Video Lanjutan (Daha) yang Statis/Macet**:
   - *Issue*: Saat video pertama selesai dan digantikan oleh `00-prologue-daha.mp4`, pemanggilan `video.play()` gagal karena media baru belum siap dimainkan (`canplay`), menyebabkan video terhenti di frame pertama.
   - *Fix*: Ditambahkan asynchronous event listener `canplay` dan `video.load()`. Video kedua kini bertransisi dengan `autoAlpha: 1` dan memutar terus-menerus (`loop={true}`) tanpa jeda atau freeze.

3. **Indikator GSAP "Scroll Down" (*Mandatory Visual Affordance*)**:
   - *Issue*: Pengunjung mendarat di halaman tanpa petunjuk visual untuk mulai menggulir.
   - *Fix*: Ditambahkan elemen sinematik `.prologue-scroll-cue` dengan teks **"GULIR UNTUK MEMULAI"** dan ikon panah melayang di bagian bawah tengah layar. Menggunakan osilasi GSAP kontinu (`y: 5px`, `repeat: -1`, `yoyo: true`, `ease: "sine.inOut"`) dan otomatis memudar halus (`opacity: 0`) begitu pengguna mulai menggulir (`progress > 0.04`).

4. **Penghapusan Potongan Kasar Antar Citra (*Inter-Scene Transitions*)**:
   - *Issue*: Antara Scene 01 dan Scene 02 terdapat kotak hitam pekat setinggi ~792px dengan `border-top: 1px solid var(--cinema-rule)` yang memotong citra secara kasar.
   - *Fix*:
     - Ditambahkan gradasi vertikal 180° di bagian atas (0%–22%) dan bawah (76%–100%) pada `.stage-media-shade`. Citra memudar secara organik ke kanvas gelap (`var(--cinema-canvas)`).
     - Garis `border-top` pada `.scene-readout` dihapus, digantikan oleh tata letak transparan terintegrasi dengan efek `backdrop-filter: blur(8px)`.
     - Transisi antar-scene kini mengalir secara mulus sesuai standar GSAP ScrollTrigger.

5. **Pengayaan Narasi & Format Middle Era Header ("Pusat Kekuasaan Berpindah")**:
   - *Issue*: Bagian babak 3 ("Pusat Kekuasaan Berpindah", 1222–1293) sebelumnya hanya memuat 1 kalimat pendek di atas latar hitam kosong.
   - *User Directive*:
     > *"Tidak perlu ada background, dan text bisa di perluas secara horisontal, format middle"*
   - *Fix*:
     - Latar visual dihapus dari `ACT_HEADER_MEDIA`, menyajikan kanvas hitam kontemplatif murni (`var(--cinema-canvas)`).
     - Narasi diperkaya menjadi 4 paragraf berbobot sastrawi tinggi mencakup Pertempuran Ganter 1222, bertahannya peradaban Daha di lembah Brantas, kebangkitan Jayakatwang 1292, hingga kelahiran Majapahit 1293.
     - Tata letak diatur dalam format **tengah (middle format)**: judul monumental, label tarikh, dan paragraf berposisi di tengah vertikal dan horizontal dengan bentangan lebar horizontal (`max-width: min(100%, 64rem)`).

---

## 2. Arsitektur File & Komponen Kunci

### `apps/web/src/components/journey/prologue-video-sequence.tsx`
- Mengatur urutan pemutaran video `00-prologue.mp4` (8.7 detik) yang diikuti oleh video loop `00-prologue-daha.mp4`.
- Menggunakan single `<video>` element untuk mematuhi kontrak E2E smoke tests.
- Penanganan `canplay` listener dan pembersihan poster dinamis mencegah kedipan daylight bridge photo (`00-prologue.webp`).

### `apps/web/src/components/journey/prologue-scene.tsx`
- Struktur DOM adegan prolog dengan kelas `.prologue-stage`, `.prologue-surface`, `.prologue-plate`, dan elemen baru `.prologue-scroll-cue`.
- Memuat teks pembuka: *"Dari jejak yang tercatat, Kediri tumbuh di tepi Brantas..."*

### `apps/web/src/modules/motion/director.ts`
- **Director Jam 2**: Mengorkestrasi timeline teks pembuka, kemunculan video (`t = 4.0s`), kemunculan scroll-cue (`t = 4.8s`), dan pembagian beat teks.
- `onProgress`: Mengontrol opacity `.prologue-scroll-cue` secara reaktif terhadap progres scroll pengunjung.

### `apps/web/src/app/(public)/globals.css`
- `.stage-media-shade`: Gradasi vertikal atas dan bawah untuk menghilangkan tepian citra yang terpotong kasar.
- `.scene-readout`: Styling tanpa border pemotong, terintegrasi halus sebagai strip bukti arsip.
- `.journey-act > header:not([data-header-media])`: Styling **format middle** khusus kartu era tanpa media:
  - `min-height: 82svh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;`
  - `max-width: min(100%, 64rem);` untuk bentangan horizontal yang nyaman dibaca.
- `.prologue-scroll-cue`: Styling affordance scroll down dengan token warna aksen emas (`var(--cinema-accent)`).

### `apps/web/src/content/production-narrative.ts`
- Naskah kanonik 9 babak dan 26 adegan.
- Babak 3 (`ACT_3`, "the-throne-breaks", 1222–1293) diperkaya menjadi 4 paragraf sejarah mendalam.

---

## 3. Verifikasi & Kontrak Pengujian

Semua pintu verifikasi (*gates*) telah diuji dan lulus:
- **Unit & Contract Tests**: `pnpm -r test` -> **81 passed across 7 test suites** (0 failures).
- **Design Token Audit**: `node scripts/check-tokens.mjs` -> **52 contrast checks across 2 Sentra themes**, 0 raw values.
- **Linting & Formatting**: `pnpm run lint` -> **0 errors** (Biome).
- **Typecheck**: `pnpm run typecheck` -> **0 errors** (`tsc`).
- **Browser Visual Smoke (Playwright)**:
  - Video prolog mulai tepat di `00:00:00` saat pembukaan.
  - Video lanjutan Daha berputar stabil dan melakukan looping.
  - Indikator scroll cue melayang di tengah bawah dan memudar saat di-scroll.
  - Transisi Scene 01 ke Scene 02 bebas dari pemotong hitam kasar.
  - Babak "Pusat Kekuasaan Berpindah" tampil di tengah dengan bentangan horizontal yang elegan.

---

## 4. Panduan Menjalankan Lingkungan Lokal

Server lokal telah dikonfigurasi dan berjalan pada port `4320`:
```bash
# Menjalankan dev server
pnpm --filter @kediri/web dev -p 4320

# Menjalankan unit tests & token audit
pnpm run test

# Menjalankan lint & typecheck
pnpm run lint
pnpm run typecheck
```
URL Akses Langsung:
- **Journey**: `http://127.0.0.1:4320/journey`
- **Babak 3 (Pusat Kekuasaan Berpindah)**: `http://127.0.0.1:4320/journey#act-the-throne-breaks`
