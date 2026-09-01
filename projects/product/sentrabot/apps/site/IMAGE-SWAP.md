# Image swap log — Cora visuals → Sentra Bot 2026

Lanjutan dari `REBRAND.md` (Wave 1–10 = copy). Wave ini **hanya mengganti isi file gambar**.
Struktur desain, CSS, class, spacing, dan tata letak tidak diubah sama sekali.

**Aturan yang dipegang:** setiap aset pengganti memakai **nama file dan dimensi piksel yang
identik** dengan aslinya. Tidak ada satu pun `<img>`, class, atau properti CSS yang disentuh —
sehingga tidak mungkin terjadi pergeseran layout.

## Sumber aset merek

| Aset | Asal |
|---|---|
| Logomark Sentra (S diagonal) | Dipotong dari panel **1. MASTER LOGOMARK** pada `sentra-logo-usage-guidelines.png`, di-threshold jadi PNG transparan (versi hitam & putih). Proporsi tidak diubah — sesuai butir 2 pedoman. |
| Kepala Sentra Bot | Dipotong dari panel **LOGO MARK** pada brand sheet Sentra Bot, latar putih dihapus. |
| Tipografi | Font milik situs sendiri: **Switzer** (sans) dan **Signifier** (serif), dibaca langsung dari `public/assets/*.woff2`. |
| Latar langit | Diambil dari aset langit situs sendiri (`3b088bdb031e.webp`) agar sistem visual tetap konsisten. |

## Wave 11 — Logo & identitas (2026-08-21)

| File | Dimensi | Sebelum | Sesudah |
|---|---|---|---|
| `6c37fbbce1e0.png` | 152×112 | Stempel "cora" | Stempel Sentra Bot: bingkai putih + latar langit, kepala robot + "Sentra Bot" |
| `5c034dcd3ece.png` | 2420×878 | "MADE BY EVERY" + postmark | "BAGIAN DARI / SENTRA / ARTIFICIAL INTELLIGENCE" + logomark |
| `ec52fc786ac8.png` | 3866×1080 | Wordmark "EVERY" | Logomark + wordmark "Sentra" |
| `favicon-32/180/512.png` | baru | — | Ikon kepala Sentra Bot |

`6c37fbbce1e0.png` dipakai di Header **dan** Footer — satu file, dua tempat.

## Wave 12 — Testimoni: avatar & logo perusahaan (2026-08-21)

| File | Dimensi | Sebelum | Sesudah |
|---|---|---|---|
| `272967acdc52.jpg` | 400 | Foto wajah | Monogram **RP** (Raka Putra) |
| `34b4e355dec3.jpg` | 200 | Foto wajah | Monogram **SW** (Sari Wijaya) — juga muncul di Pricing |
| `ca71bdf88f63.jpg` | 200 | Foto wajah | Monogram **AP** (Andi Pratama) |
| `351b7361cc16.png` | 31 | Foto wajah | Monogram **MK** (Maya Kusuma) |
| `14a2f406eba3.jpg` | 320 | Foto wajah | Monogram **BS** (Bima Santoso) |
| `44d0e5b402a3.jpg` | 400 | Foto wajah | Monogram **DL** (Dewi Lestari) |
| `886f78464ee0.jpg` | 400 | Foto wajah | Monogram **FA** (Farhan Akbar) |
| `e6849fca596e.jpg` | 400 | Foto wajah | Monogram **NR** (Nina Rahayu) |
| `1d30680e56ad.png` | 21 | Foto wajah mikro | Avatar monogram **S** |
| `eb1cb1319224.png` | 276×32 | Logo pihak ketiga | Wordmark placeholder "Nusantara Ops" |
| `86ad33557c89.png` | 54×32 | Logo pihak ketiga | Wordmark placeholder "Arka" |
| `c9519fbb9102.png` | 174×32 | Logo pihak ketiga | Wordmark placeholder "Bahari" |
| `de14f6bc1e2c.png` | 101×24 | Logo pihak ketiga | Wordmark placeholder "Cakrawala" |
| `9f3d12ce7430.png` | 156×32 | Logo pihak ketiga | Wordmark placeholder "Dwipa" |
| `2b5476baa743.png` | 164×32 | Logo pihak ketiga | Wordmark placeholder "Elang Data" |
| `e725a0be2401.png` | 236×32 | Logo pihak ketiga | Wordmark placeholder "Garuda Works" |
| `e61da0bd1d2d.svg` | 40×14 | Teks "NYT" | Wordmark placeholder "Katalis AI" |

Seluruh foto wajah orang nyata dihapus dari repo (isi file diganti, bukan hanya ditimpa referensi).

## Wave 13 — Baris demo (2026-08-21)

7 baris desktop (1290×123/124) dan 7 baris mobile (658×131/132).

| Sebelum | Sesudah |
|---|---|
| Baris inbox email berbahasa Inggris + foto wajah | Baris tugas agen Bahasa Indonesia + avatar monogram |
| "Data-Sharing Agreement Signature", "Surf Trip Headcount", dst. | "Izin: jalankan tugas sandbox", "Ringkasan rutinitas pagi", "4 tugas menunggu persetujuan", "Sinkronisasi dataset selesai", "Draf rekap biaya token BYOK", "Ekstraksi 12 PDF pedoman selesai", "Uji sandbox gagal pada 1 langkah" |
| Format jam AM/PM | Format 24 jam (17.20 / 15.24 / 13.04) |

## Wave 14 — Kartu Brief & panel Brief (2026-08-21)

| File | Dimensi | Judul kartu baru |
|---|---|---|
| `255f14365f1f.png` | 603×291 | Antrean deploy menunggu izin — Agen Operasi |
| `4a7faa4448ab.png` | 607×343 | Ringkasan rutinitas pagi — Agen Riset |
| `7ced7031f6a5.png` | 517×259 | Ekstraksi pedoman selesai — Agen Dokumen |
| `307bf3119067.png` | 538×262 | Biaya token BYOK bulan ini — Agen Keuangan |
| `118e4eb5663e.png` | 552×277 | Uji sandbox gagal di langkah 3 — Agen QA |
| `b44661517a71.png` | 612×321 | Sinkronisasi basis pengetahuan — Agen Data |
| `587de78e9b9e.png` | 1028×1526 | Panel Brief: Informasi Penting / Tindakan / Jadwal |

Alamat email kontak diganti ke domain `sentrahai.com`. Kartu izin "Izinkan / Tolak" dipakai,
konsisten dengan copy Wave 3 dan Wave 6.

## Wave 15 — Visual Fitur (2026-08-21)

3 file 630×674. Komposisi asli dipertahankan (kartu ter-fan di dalam folder, di atas latar langit).

| File | Sebelum | Sesudah |
|---|---|---|
| `07e16afbf855.webp` | Folder oranye, "You are a designer" | Merah Sentra, "Anda seorang operator" |
| `ac1fd8003bc8.webp` | Folder hijau, "You are a manager" | Biru, "Anda seorang manajer" |
| `19335921c79b.webp` | Folder biru, "You are a CEO" | Hitam, "Anda seorang peneliti" |

Aksen oranye asli tidak dipakai lagi. Tidak ada nilai warna oranye di CSS situs, sehingga
perpindahan ke merah Sentra tidak menimbulkan konflik dengan elemen lain.

## Wave 16 — Hero (2026-08-21)

| File | Dimensi | Sesudah |
|---|---|---|
| `8a6554a0a252.webp` | 2044×1175 | Screenshot "Brief Hari Ini — 10 Okt 2026": strip tanggal, chip Pagi/Sore + "Semua agen", kartu sapaan, seksi Informasi Penting / Tindakan / Jadwal |
| `71287266a05b.webp` | 656×982 | Versi mobile dari komposisi yang sama |

Stempel Sentra Bot ditempatkan di pojok kiri atas, menggantikan badge "cora".

## Wave 17 — Latar halaman penuh: pedesaan Indonesia (2026-08-21)

| File | Dimensi | Sebelum | Sesudah |
|---|---|---|---|
| `3b088bdb031e.webp` | 1440×12467 | Langit biru → padang gandum keemasan | Langit + awan tetap utuh; pedesaan direkolorisasi jadi hamparan hijau tropis Indonesia |

Instruksi Chief: karakter gambar **sama**, tapi bernuansa Indonesia — pedesaan, bukan gradasi.

### Pendekatan

Lukisan aslinya **tidak digambar ulang**. Yang diubah hanya palet warnanya, sehingga sapuan
kuas, komposisi bukit, jalur setapak, rumpun pohon, dan tekstur cat tetap persis sama — inilah
yang menjaga "karakter gambar" tetap identik.

Pemetaan warna:
- Baris 0–6180 (langit, awan, pohon atas) **tidak disentuh sama sekali**.
- Rona emas/oker (18°–62°) dipetakan ke hijau padi (92°–118°), dengan variasi rona
  frekuensi-rendah agar terbaca sebagai petak-petak sawah, bukan warna rata.
- Oker gelap diperlakukan sebagai tanah: diarahkan ke zaitun redup, bukan hijau terang.
- Hijau dedaunan yang sudah ada dipertahankan dan sedikit digelapkan agar pohon tetap
  terbaca terpisah dari hamparan sawah.
- Ditambahkan kabut lembap tropis ke arah horizon dan perspektif atmosfer pada punggung
  bukit jauh, khas dataran tinggi Indonesia.
- Transisi dari langit ke lanskap di-*ease* sepanjang 260 baris agar tidak ada garis sambung.

### Yang dicoba dan dibuang

Siluet gunung berapi kerucut sempat ditempelkan di punggung bukit jauh sebagai penanda
Indonesia yang lebih eksplisit. Pada jarak dan opasitas berapa pun hasilnya terbaca sebagai
noda pucat di atas deck awan, bukan gunung — kualitas lukisan aslinya justru turun. **Dibuang.**

Wave 17 versi gradasi biru-navy (percobaan sebelumnya) diganti seluruhnya oleh versi ini.
Visual Fitur dikembalikan ke latar langit cerah karena kini kembali selaras dengan halaman.

## Wave 18 — Amplop → ponsel dengan notifikasi Sentra Bot (2026-08-21)

77 frame amplop (2 sequence × 38 + 1 overlay statis) diganti menjadi ponsel yang menampilkan
lock screen berisi notifikasi Sentra Bot. Semua file memakai nama dan dimensi asli (800×1192,
rasio 2918/4346), jadi tidak ada perubahan markup maupun CSS.

| Layer | File | Isi baru |
|---|---|---|
| Belakang (38 frame) | `9d0996d1ddc4.webp` dst. | Bodi ponsel: wallpaper dari lanskap situs, status bar, jam, tumpukan notifikasi |
| Depan (38 frame) | `cffd7a37f053.webp` dst. | Dagu ponsel + home indicator, menutup bagian bawah panel Brief |
| Overlay statis | `0f40914b1b50.webp` | Bingkai bezel luar, bagian tengah transparan |

### Isi notifikasi — dasar pemilihan (riset pasar)

| Notifikasi | Alasan |
|---|---|
| **Pembayaran masuk (QRIS)** — dipasang paling atas | QRIS adalah rel pembayaran dominan Indonesia: 12,55 miliar transaksi pada semester I 2026 (tumbuh 100,12% yoy), nilai Rp600,69 triliun, ~66 juta pengguna, 44,86 juta merchant yang mayoritas UMKM (Bank Indonesia, via ANTARA & Republika, Agustus 2026) |
| **Pesan pelanggan (WhatsApp)** | WhatsApp adalah kanal komunikasi bisnis utama di Indonesia; keluhan operasional yang paling sering muncul adalah pesan pelanggan menumpuk dan kecepatan respons turun saat volume naik |
| **Tagihan jatuh tempo** | CELIOS menyoroti digitalisasi UMKM belum diterjemahkan menjadi pencatatan dan arus kas yang kuat — piutang adalah titik nyeri nyata |
| **Jadwal berubah** | Kebutuhan koordinasi harian yang universal |
| **Butuh izin Anda** (kartu Izinkan / Tolak) | Ini pembeda produk Sentra Bot, bukan sekadar fitur umum. Ditempatkan agar terlihat sebagai kartu paling "hidup" di layar |
| **Brief pagi siap** | Menutup narasi ke seksi Brief di bawahnya |

Angka rupiah dan nomor invoice pada notifikasi bersifat **ilustratif**, bukan data nyata.

### Batasan yang perlu diketahui

1. **Sequence-nya statis di rebuild ini.** CSS hanya mengatur `visibility`, dan tidak ada
   penggerak scroll di `src/` — markup hasil capture mengunci frame 0 tiap sequence sebagai
   satu-satunya frame yang terlihat. Karena itu ke-77 frame dirender dalam keadaan akhir yang
   sama, sehingga frame mana pun yang tampil, ponselnya terbaca benar. Menghidupkan animasi
   (layar menyala → notifikasi masuk satu per satu) menuntut penambahan hook JS — di luar
   remit "hanya ganti gambar".
2. **Rasio perangkat 0,671, bukan 19,5:9 seperti iPhone asli.** Kotak frame ditetapkan CSS
   (`aspect-[2918/4346]`); memakai siluet iPhone yang benar-benar proporsional menuntut
   perubahan CSS. Perangkat digambar mengisi kotak, dengan Dynamic Island, status bar, dan
   home indicator sebagai penanda agar tetap terbaca sebagai ponsel.

## Wave 19 — Logo diganti ke aset resmi Sentra Artificial Intelligence (2026-09-01)

Wave 11 memakai logomark yang di-*threshold* manual dari tangkapan layar panduan merek dan
tipografi situs sendiri (Signifier/Switzer). Wave ini mengganti isi tiga file gambar tersebut
dengan **logomark vektor resmi** (`docs/brand/01-LOGO-MASTER/sentra-logomark-master-black.svg`,
tidak digambar ulang — hanya di-render ke raster) dan **font resmi Geist Sans** (paket npm
`geist@1.7.2`, sesuai `docs/brand/00-BRAND-STRATEGY/BRAND_FOUNDATION.md`). Nama file dan
dimensi piksel tetap identik; tidak ada `<img>`, class, atau markup yang disentuh.

| File | Dimensi | Sebelum (Wave 11) | Sesudah (Wave 19) |
|---|---|---|---|
| `6c37fbbce1e0.png` | 152×112 | Bingkai putih + latar langit, kepala robot + "Sentra Bot" | Kartu putih bulat, logomark resmi hitam + wordmark "Sentra Bot" (Geist SemiBold) |
| `5c034dcd3ece.png` | 2420×878 | "BAGIAN DARI / SENTRA / ARTIFICIAL INTELLIGENCE" — wordmark serif situs (Signifier) | Layout ghost-card sama persis; logomark resmi + "Sentra" (Geist SemiBold) menggantikan wordmark serif |
| `ec52fc786ac8.png` | 3866×1080 | Logomark hasil threshold + wordmark "Sentra" outline | Logomark resmi + wordmark "Sentra" (Geist Bold), putih solid |
| `favicon-32/180/512.png` | 32/180/512 | Ikon kepala Sentra Bot | `sentra-favicon-32.png`, `sentra-apple-touch-icon-180.png`, `sentra-pwa-icon-512.png` resmi (disalin langsung, tanpa modifikasi) |

Diterapkan ke `public/assets/`, `assets/`, dan `dist/assets/` sekaligus (mengikuti pola Wave 11–18).

**Tidak diubah:** proporsi logomark, warna resmi (`#0D1117`/`#FFFFFF`/`#000000`), tata letak kartu,
posisi/ukuran elemen. Logomark tidak digambar ulang — hanya di-render dari SVG master resmi.

**Rekomendasi lanjutan (di luar remit "hanya ganti gambar"):**
1. `index.html` dan `docs/brand/04-FAVICON-BROWSER/sentra-favicon.svg` — tambahkan varian SVG favicon resmi untuk browser modern (saat ini hanya PNG).
2. Header/Footer nav pill dan tombol CTA masih pakai `bg-primary` biru `#117bc8` (tema lama), bukan aksen resmi Sentra Intelligence Blue `#5B8CFF` atau dasar gelap resmi `#0D1117` — perubahan ini di luar cakupan "ganti logo" dan butuh keputusan terpisah karena menyentuh CSS/tema, bukan hanya gambar.
3. Font situs (Switzer/Signifier) belum diganti ke Geist Sans/Geist Mono resmi di luar aset gambar ini — perubahan itu menyentuh `site.css`/build config, di luar cakupan wave ini.

## Wave 20 — Logo kartu testimoni: korporat → kampus & kota (2026-09-01)

Lanjutan Wave 11 di `REBRAND.md` (testimoni ditulis ulang ke persona mahasiswa / ibu rumah
tangga / pekerja / pemilik warung). Jabatan baru berakhiran "di", sementara wordmark mungil
di sebelahnya masih nama perusahaan fiktif — terbaca "Mahasiswa di Nusantara Ops". Wave ini
mengganti isi kedelapan file itu. Nama file dan dimensi piksel identik; markup tidak disentuh.

| File | Dimensi | Sebelum | Sesudah | Dipakai oleh |
|---|---|---|---|---|
| `eb1cb1319224.png` | 276×32 | Nusantara Ops | Universitas Nusantara | Raka Putra — Mahasiswa di |
| `86ad33557c89.png` | 54×32 | Arka | Solo | Sari Wijaya — Ibu rumah tangga di |
| `c9519fbb9102.png` | 174×32 | Bahari | Bahari Group | Andi Pratama — Staf keuangan di |
| `de14f6bc1e2c.png` | 101×24 | Cakrawala | Yogyakarta | Maya Kusuma — Ibu rumah tangga di |
| `9f3d12ce7430.png` | 156×32 | Dwipa | Bandung | Bima Santoso — Pemilik warung di |
| `2b5476baa743.png` | 164×32 | Elang Data | Surabaya | Dewi Lestari — Ibu rumah tangga di |
| `e725a0be2401.png` | 236×32 | Garuda Works | Politeknik Dwipa | Farhan Akbar — Mahasiswa tingkat akhir di |
| `e61da0bd1d2d.svg` | 90×14 | Katalis AI | Elang Data | Nina Rahayu — Staf kantor di |

Tipografi memakai **Geist SemiBold resmi** (`geist@1.7.2`), warna `#1C1917` — sama dengan
wordmark asli. Ukuran huruf dikunci ke rasio tinggi kotak (19px pada kotak 32px, 14px pada
kotak 24px), bukan dipaskan ke lebar, karena CSS menyamakan **tinggi** semua logo ke 14px
(`!dr-h-14`); memaskan ke lebar membuat teks pada kotak sempit tampil jauh lebih kecil dari
yang lain. Teks dipilih agar muat pada rasio tetap itu — karena itu Sari memakai "Solo"
(kotak hanya 54px) dan Farhan "Politeknik Dwipa", bukan "Institut Teknologi Dwipa".

Nama kampus, kota, dan perusahaan bersifat **ilustratif**, sejalan dengan status testimoni
yang masih fiktif. Lihat catatan risiko di bawah.

## Perubahan markup

Satu-satunya perubahan di luar file gambar: dua baris `<link rel="icon">` pada `index.html`
untuk favicon. Bersifat aditif dan mudah dicabut. Tidak ada perubahan pada `src/html/**`.

## Aset yang sengaja TIDAK diubah

| Aset | Alasan |
|---|---|
| `173fb9e5f029.webp` (awan) | Dekoratif murni, tanpa merek |


| `original/`, `content-clean.md`, `fullpage-preview.png` | Arsip pra-rebrand, sengaja dibiarkan |
| `assets/*.js` (chunk Next lama) | Tidak dimuat aplikasi Vite |

## Verifikasi

Situs di-build ulang secara lokal dan di-screenshot dari header sampai footer pada viewport
1440×900. Header, hero, dua seksi demo, marquee testimoni, kartu fitur, seksi privasi, FAQ,
pricing, dan footer tampil benar tanpa pergeseran layout.

Satu request gagal di seluruh halaman: `videos/demo.mp4` — aset video yang memang tidak ada
dalam ZIP sejak awal, bukan akibat wave ini.

`npm run build` tidak dapat dijalankan di lingkungan Linux ini karena biner native Rollup di
`node_modules` berasal dari Windows. Aset baru diterapkan ke `public/assets/`, `assets/`, dan
`dist/assets/` sekaligus, sehingga `dist/` yang sudah ada langsung menampilkan visual baru.
Di mesin lokal, `npm install && npm run build` akan menghasilkan build bersih.

## Risiko terbuka — perlu keputusan sebelum publikasi

1. **Testimoni dan logo perusahaan bersifat fiktif.** Nama orang (Wave 2) maupun nama
   perusahaan (Wave 12) tidak merujuk pelanggan nyata. Sebelum tayang, ganti dengan klien
   nyata beserta izin tertulis, atau nonaktifkan seluruh seksi testimoni. Menayangkan
   endorsement fiktif adalah risiko hukum dan reputasi.
2. **Angka pada visual bersifat ilustratif** ("24 tugas rutin", "turun 18%", "12 PDF").
   Ganti dengan angka nyata atau pastikan disajikan jelas sebagai ilustrasi produk.
3. **Klaim keamanan pada visual dan copy** (local-first, sandboxed, human-gated, BYOK) harus
   diverifikasi terhadap implementasi Sentra Bot yang sebenarnya sebelum publikasi.
4. **Metafora amplop** di seksi Brief masih menyiratkan produk email, bukan platform agen.

## Addendum — 2026-09-02: warna aksen diputuskan

Pertanyaan terbuka Wave 19 (nav pill dan tombol CTA masih `#117bc8`) sudah diputuskan pemilik produk: aksen resmi `#5B8CFF` dipakai pada kontrol nyata melalui `src/polish.css` (`--color-primary`, `--color-contrast`), teks pill header memakai ink `#0D1117` agar kontras terpenuhi. Detail di `VISUAL_AUDIT.md`.
