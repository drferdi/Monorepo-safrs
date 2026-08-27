# SHOT 00 — Sebelum Kita Kembali

> Unit implementasi adalah **shot**, bukan hero lalu halaman bacaan. Prolog
> memakai satu citra Kediri 2026 sepanjang bidikan; naskah hadir bergiliran di
> dalam dunia citra yang sama.

## Kontrak shot

| Aspek | Keputusan |
| --- | --- |
| **Frame** | Satu citra kontemporer Kediri dan Brantas. Jembatan, lalu lintas, dan kota tetap satu dunia visual; tidak ada salinan citra sebagai panel bacaan. |
| **Camera** | Mulai dari kota yang masih ramai, merayap ke permukaan air, lalu menahan pada pertanyaan tentang kapan sebuah kota mulai menjadi dirinya sendiri. |
| **Light** | Cahaya senja dan pantulan air berkurang perlahan; air menjadi bidang gelap yang dapat menerima material tembaga pada handoff ke 879. |
| **Time** | Establish → kota → sungai → lead line → beat pendek → tahanan → 879. Tidak ada forced wait atau intro terpisah. |
| **Historical argument** | Kota tidak mempunyai satu kelahiran tunggal. 27 Juli 879 adalah pintu masuk kronologi peringatan Kota Kediri, bukan tanggal lahir pemerintahan kota modern. |
| **Text reveal** | Lead line muncul setelah kota dan Brantas terbaca. Beat konteks datang satu per satu, dengan jeda kosong yang nyata; seluruh teks tetap ada di HTML. |
| **Rest state** | Pertanyaan lead dan satu beat konteks terbaca di atas citra yang tenang; reduced motion dan mobile langsung menjadi komposisi baca utuh. |
| **Exit / handoff** | Pantulan Brantas memipih menjadi garis tembaga; garis itu diteruskan oleh permukaan prasasti 879. Handoff hanya dekoratif dan tidak memuat klaim sejarah. |

## Ketukan

| # | Progres | Yang terjadi | Sebabnya |
| --- | --- | --- | --- |
| 0 | 0,00 | Kota kontemporer hadir. | Pengunjung masuk dari Kediri yang hidup sekarang. |
| 1 | 0,12 → 0,34 | Detail kota bergeser, Brantas mulai mengambil ruang. | Sungai ditetapkan sebagai benang waktu sebelum perjalanan mundur. |
| 2 | 0,34 → 0,48 | **Lead line** pertanyaan tentang identitas kota muncul. | Pertanyaan datang setelah citra memberi konteks, bukan sebagai judul situs. |
| 3 | 0,50 → 0,68 | Beat kehidupan sehari-hari dan perubahan kota hadir bergiliran. | Kota dibaca sebagai tempat hidup, bukan kartu pembuka. |
| 4 | 0,68 → 0,80 | Beat tentang tanggal 27 Juli 879 dan banyak lapisan kelahiran kota. | Caveat historis harus terbaca sebelum pintu masuk kronologi. |
| 5 | 0,80 → 0,90 | **Tahanan.** Kota dan Brantas diam; lead tetap terbaca. | Pengunjung diberi waktu memahami pertanyaan dan jawaban yang tidak tunggal. |
| 6 | 0,90 → 1,00 | Pantulan air menjadi garis tembaga menuju permukaan prasasti. | 2026 tidak ditinggalkan; ia berubah menjadi syarat bagi catatan 879. |

## Varian dan lifecycle

- **Desktop/tablet** — satu stage sticky dengan satu timeline `prologueReveal`;
  ruang 330svh / 210svh memberi kamera waktu, bukan scroll-jacking.
- **Mobile** — tanpa pin; citra menjadi latar satu panel tinggi dan beat menjadi
  alur vertikal seperti graphic novel.
- **Reduced motion** — tanpa pin dan tanpa ruang kosong; citra, lead, seluruh
  beat, notice editorial, dan tautan ke tanda pertama langsung terbaca.
- **Cleanup** — `SceneMotion` memiliki satu context dan satu ScrollTrigger;
  handoff berada di dalam scope dan ikut dibersihkan.

