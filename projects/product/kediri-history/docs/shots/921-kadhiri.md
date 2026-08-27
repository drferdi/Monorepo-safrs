# SHOT 921 — Nama Muncul

> Scene 921 adalah kelanjutan epigrafis dari 879. Ia bukan kartu judul baru:
> guratan dari shot sebelumnya berubah menjadi satu nama yang dapat diwariskan.

## Kontrak shot

| Aspek | Keputusan |
| --- | --- |
| **Frame** | Satu permukaan prasasti dan satu kata hero: `KADHIRI`. Tidak ada pseudo-aksara tambahan dan tidak ada objek kedua. |
| **Camera** | Dari bidang yang masih dekat dengan prasasti, kamera bergeser tipis menuju ruang negatif tempat nama dapat berdiri. |
| **Light** | Cahaya tipis mengangkat bidang tulisan; nama menjadi lebih terang daripada barisan aksara yang tidak dianimasikan. |
| **Time** | Establish → nama terbaca → lead → dua beat tentang tempat dan nama → tahanan → handoff. |
| **Historical argument** | 879 memberi jangkar peringatan; 921 memberi salah satu kemunculan tertulis yang diasosiasikan dengan Kadhiri. Etymologi tidak dipastikan di sini. |
| **Text reveal** | Kata/nama di HTML tetap utuh; choreography hanya mengatur posisi, cahaya, dan urutan baca. |
| **Rest state** | `Kadhiri` dan lead line terbaca di ruang negatif kanan; beat terakhir menetap cukup lama untuk deep-link. |
| **Exit / handoff** | Alur tulisan / guratan menjadi garis tipis yang membawa nama ke lempeng lebih gelap pada 1015. |

## Ketukan

| # | Progres | Yang terjadi | Sebabnya |
| --- | --- | --- | --- |
| 0 | 0,00 → 0,28 | Permukaan dan barisan aksara hadir sebagai tekstur. | Nama belum diberi prioritas sebelum bidangnya terbaca. |
| 1 | 0,28 → 0,45 | `KADHIRI` / konteks tahun memperoleh bobot dari kedalaman. | Sebuah nama muncul dari dalam sejarah, bukan dari UI. |
| 2 | 0,45 → 0,56 | Lead line menetap di ruang negatif. | Pengunjung menerima tesis sebelum penjelasan. |
| 3 | 0,58 → 0,70 | Beat tempat sebelum nama. | Nama baru bermakna karena ada tempat dan manusia sebelum catatan. |
| 4 | 0,70 → 0,80 | Beat tentang 921 sebagai nama yang dapat diwariskan. | Jangkar 879 berubah menjadi identitas tertulis. |
| 5 | 0,80 → 0,88 | Tahanan baca. | Nama harus memiliki bobot sebelum keluar. |
| 6 | 0,88 → 1,00 | Guratan mengarah ke bidang tembaga gelap berikutnya. | Menyiapkan Scene 1015 tanpa fade-out generik. |

## Varian dan lifecycle

- **Desktop/tablet** — satu timeline `nameEmerges`, satu trigger, tanpa
  animasi layout.
- **Mobile** — nama, lead, dan beat mengalir vertikal tanpa pin.
- **Reduced motion** — komposisi nama dan semua beat langsung stabil, tanpa
  ruang pin.
- **Cleanup** — timeline dan trigger dimiliki island scene dan di-revert saat
  breakpoint atau route berubah.

