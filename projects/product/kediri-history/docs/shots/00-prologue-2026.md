# SHOT 00 — Sebelum Kita Kembali

> Unit implementasi adalah **shot**, bukan hero lalu halaman bacaan. Prolog
> membuka dengan citra Kediri 2026, melewati dua babak footage yang dipisahkan
> kanvas gelap, lalu kembali ke citra yang sama untuk pertanyaan dan portal 879
> (direktif Chief 2026-09-04).

## Kontrak shot

| Aspek                   | Keputusan                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frame**               | Gambar HD kontemporer Kediri dan Brantas hadir sejak first paint dan tetap menjadi bingkai DASAR: ia poster, fallback tanpa JavaScript, dan bingkai Finale. Dua babak footage (`00-prologue.mp4`, `00-prologue-daha.mp4`) hidup sebagai LAPISAN terpisah, bukan source swap pada satu elemen. Keduanya rekonstruksi dan menyatakannya sendiri lewat aria-label. |
| **Camera**              | Mulai dari kota yang masih ramai, merayap ke permukaan air dengan dolly 1 → 1,34 dan pergeseran vertikal ringan, lalu menahan pada pertanyaan tentang usia sebuah kota.                                                                                                                                     |
| **Light**               | Cahaya kota diredupkan oleh veil; empat garis air vektor resolution-independent memipih menjadi satu horizon tembaga. Surface procedural adalah metafora presentasi, bukan gambar artefak.                                                                                                                  |
| **Time**                | Kota 2026 → gelap → footage kota kuno → gelap → naskah era Daha → footage kehidupan sehari-hari → gelap → kota 2026 kembali, pertanyaan, dua beat, air menjadi tembaga, portal 879. Kanvas gelap adalah `.stage-void` yang memang ada di belakang, bukan lapisan tambahan. Tidak ada forced wait: seluruhnya dikendalikan gulir. |
| **Historical argument** | Kota tidak mempunyai satu kelahiran tunggal. 27 Juli 879 adalah pintu masuk kronologi peringatan Kota Kediri, bukan tanggal lahir pemerintahan kota modern.                                                                                                                                                 |
| **Text reveal**         | Lead line muncul setelah kota dan Brantas terbaca. Beat konteks datang satu per satu, dengan jeda kosong yang nyata; seluruh teks tetap ada di HTML.                                                                                                                                                        |
| **Rest state**          | Pertanyaan lead dan satu beat konteks terbaca di atas citra yang tenang; reduced motion dan mobile langsung menjadi komposisi baca utuh.                                                                                                                                                                    |
| **Exit / handoff**      | Pantulan Brantas memipih menjadi garis tembaga; garis itu diteruskan oleh permukaan prasasti 879. Handoff hanya dekoratif dan tidak memuat klaim sejarah.                                                                                                                                                   |

## Ketukan

| #   | Progres     | Yang terjadi                                                            | Sebabnya                                                                              |
| --- | ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 0   | 0,00 → 0,06 | Opening Screen resmi: Kediri 2026, pelat judul, lead line, dan beat awal. | Pengunjung disambut langsung oleh pintu gerbang resmi dan judul kota di awal.        |
| 1   | 0,06 → 0,18 | Pelat memudar lembut saat digulir; citra 2026 bergerak (dolly).         | Transisi masuk yang mulus mengalir dari judul ke eksplorasi waktu.                    |
| 2   | 0,18 → 0,24 | Citra menyerah pada kanvas gelap (`.stage-void`).                       | Jeda atmosferik memisahkan masa kini dari gerbang masa lalu.                          |
| 3   | 0,24 → 0,44 | Footage kota kuno tayang penuh bingkai (`00-prologue.mp4`).             | Masa lalu diperkenalkan sebagai bayangan artistik perjalanan waktu.                   |
| 4   | 0,36 → 0,52 | Naskah era Daha: abad ke-11 dan ke-12, dan caveat rekonstruksinya.      | Klaim historis dibaca tenang di atas kanvas gelap.                                    |
| 5   | 0,48 → 0,68 | Footage kehidupan sehari-hari tayang (`00-prologue-daha.mp4`).          | Narasi yang baru dibaca memperoleh gambaran visualnya.                                |
| 6   | 0,68 → 0,85 | Aliran Brantas memipih; garis horizon dan tembaga mengambil panggung.   | Menghubungkan aliran sungai abadi dengan permukaan prasasti logam kuno.              |
| 7   | 0,85 → 1,00 | Portal `879` muncul megah; garis `water-copper` menyerahkan ke Scene 879. | Pintu masuk kronologi catatan pertama Kediri resmi dibuka.                            |

## Layar pertama sebagai title sequence (direktif Chief 2026-09-04: "just a cinematic first visual")

Entrance berbasis waktu ±2,4 detik, sekali per pemasangan island, HANYA pada
varian motion desktop/tablet; mobile, reduced motion, dan tanpa JavaScript tetap
komposisi langsung. Pemiliknya director (`createReadingDirector`, cue negatif
`at: -1`), targetnya `.prologue-surface .stage-media` — bukan surface, karena
surface dipegang timeline scrub `prologueReveal` dan ditulis ulang setiap
`ScrollTrigger.refresh()`.

| Detik | Yang terjadi                                                                      |
| ----- | --------------------------------------------------------------------------------- |
| 0,0   | `.stage-void` gelap; citra 2026 muncul dengan letterbox 2,39:1 yang membuka dan dorongan 1,10 → 1 (1,6 s, ease `cine`) |
| 0,55  | Eyebrow "Kediri · Jawa Timur · 2026" naik lembut                                  |
| 0,75  | "KEDIRI, 2026" terkuak dari topeng baris (SplitText `mask: "lines"`), ukuran 1,25× |
| 1,25  | "Berapa Usia Sebuah Kota?" tiba sebagai satu blok (gaya `prologueReveal`)          |
| 1,6   | Dua beat menyusul (stagger 0,2 s)                                                  |
| 1,9   | Cue "Gulir untuk Memulai" muncul                                                   |

Gulir selalu menang: begitu progres > 0,01 entrance dilompatkan ke keadaan
akhir, dan timeline scrub mengambil alih bingkai seperti sebelumnya. Tautan
dalam dan restorasi gulir langsung mendapat keadaan akhir.

## Polesan 2026-09-04 (tinjauan sinematik)

| Aspek                  | Sebelum                                                                 | Sesudah                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Handoff water → copper | Elemen `transform` terisi penuh menjadi balok emas 54×49 px di bawah 879 | Seam vertikal 0,35 rem (`globals.css`, `.scene-handoff[data-handoff="water-copper"] .scene-handoff__transform`)       |
| Judul sinematik        | Blur masuk 10 px, blur keluar 8 px — bayangan keruh masih tampak di 0,34 | 6 px / 3 px (`scenes.ts`, `prologueReveal`)                                                                          |
| Kredit presenter       | Logo + teks mengetik di TENGAH bingkai, menutupi kota                    | Sepertiga bawah (`.prologue-overture-present`), konvensi kartu "presents"                                             |
| Footage pembuka        | Watermark alat di sudut kanan-bawah render 1080p                         | SEMENTARA: `scale(1.09)` dengan titik asal 40% 36% pada `<video>`; hapus saat render bersih Chief tiba               |
| Alur statis            | Naskah era Daha tampil di ATAS "KEDIRI, 2026" (mobile, reduced, tanpa-JS) | Grid `"frame" "overture"`: bingkai 2026 dulu, naskah Daha sesudahnya (naskah tetap terbaca di ketiga varian)         |

Belum diputuskan (menunggu Chief): kalimat "Yang tampak berikut ini adalah
bayangan artistik …" tidak punya rujukan pada alur statis karena footage tidak
dirender di sana; dan grammar kredit "Present" → "Presents".

## Varian dan lifecycle

- **Desktop/tablet** — satu stage sticky dengan satu timeline `prologueReveal`;
  ruang 520svh / 340svh (mencerminkan `PIN_DISTANCES.prologueReveal`); setiap
  rentang scroll mengubah babak, kamera, atau material. Footage hanya berputar
  selama babaknya sendiri — keadaan pemutaran dihitung ulang dari progres,
  bukan dari `.call()` yang bisa terlewat saat menggulir cepat atau mundur.
- **Mobile** — tanpa pin; naskah era Daha mendapat baris sendiri di atas panel,
  lapisan footage tidak dirender sama sekali, dan beat menjadi alur vertikal
  seperti graphic novel.
- **Reduced motion dan tanpa JavaScript** — tanpa pin dan tanpa ruang kosong;
  citra, naskah era Daha, lead, seluruh beat, notice editorial, dan tautan ke
  tanda pertama langsung terbaca. Footage tidak pernah tampil di jalur ini.
- **Cleanup** — `SceneMotion` memiliki satu context dan satu ScrollTrigger;
  handoff berada di dalam scope dan ikut dibersihkan.
- **Pacing sesudah Prolog** — jeda bukti prasasti tidak lagi memotong handoff;
  ia hadir setelah Scene 921, ketika nama Kadhiri sudah diperkenalkan.
