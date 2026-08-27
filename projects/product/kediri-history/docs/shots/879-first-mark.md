# SHOT 879 — Tanda Pertama

> Unit implementasi Journey adalah **shot**, bukan section. Dokumen ini ditulis
> **sebelum** satu baris GSAP. Kalau breakdown-nya tidak sinematik, kodenya
> hampir pasti juga tidak.
>
> Sumber: Cinematic Bible bagian 3 (Hukum Motion Global) dan Scene 01.

---

## Kontrak shot

| Aspek | Keputusan |
| --- | --- |
| **Frame** | Satu subjek: **permukaan material Prasasti Kwak**, dilihat makro, memenuhi bingkai. Tidak ada objek kedua. Tidak ada situs galian. Tidak ada aksara rekaan. |
| **Camera** | **Mendekat.** Kamera melakukan dolly ke arah permukaan — permukaan membesar dan bergeser pelan. Halaman tidak bergerak ke atas; yang berubah adalah jarak pandang. |
| **Light** | Pita cahaya sangat tipis menyapu permukaan pada sudut 104°. Apa pun yang dilewatinya menjadi terbaca, dan **tetap** terbaca. Cahaya adalah satu-satunya sebab sesuatu terlihat. |
| **Time** | Tujuh ketukan dengan dua tahanan. Informasi ditahan sampai objeknya sudah berbicara. |
| **Historical argument** | Sebelum ada kerajaan bernama Kediri, sudah ada sebuah catatan — dan kita hanya mengetahuinya karena seseorang menoreh, lalu cahaya menemukannya sebelas abad kemudian. Gerakan itu membuktikan: **catatan mendahului kerajaan, dan keterbacaan adalah peristiwa.** |
| **Hero object** | Prasasti Kwak, sebagai material — bukan sebagai foto, bukan sebagai bukti visual. Kelas visualnya rekonstruksi abstrak (V-rendah), dan halaman tidak pernah mengaku sebaliknya. |
| **Text reveal** | `879` muncul **sebagai akibat** permukaan menjadi terbaca, bukan sebagai widget yang fade in. Tarikh presisi menyusul setelahnya. Narasi masuk paling akhir, setelah objek selesai bicara. |
| **Rest state** | Dua momen diam. Yang kedua adalah keadaan baca yang stabil — dan itu pula keadaan yang dituju tautan dalam. |
| **Exit** | Permukaan **kehilangan skala**: ia terus membesar sampai garis strata berhenti terbaca sebagai material dan mulai terbaca sebagai bentang geografis. Dari situ dunia 921 lahir. |

---

## Ketukan

| # | Progres | Yang terjadi | Sebabnya |
| --- | --- | --- | --- |
| 0 | 0,00 | **Hitam.** Hanya kehampaan. | Keadaan awal yang membuat cahaya berikutnya berarti. |
| 1 | 0,00 → 0,12 | Tekstur logam **samar** hadir; kamera mulai mendekat. | Ada sesuatu di sana sebelum kita bisa membacanya. |
| 2 | 0,08 → 0,46 | Pita cahaya tipis menyapu bingkai. Goresan muncul di belakangnya dan tidak hilang lagi. | Keterbacaan adalah peristiwa, dan ia searah. |
| 3 | 0,34 → 0,44 | **`879`** muncul di tempat cahaya baru saja lewat. | Tarikh adalah akibat permukaan yang kini terbaca. |
| 4 | 0,44 → 0,52 | **Tahanan.** Tidak ada yang bergerak selain kamera yang masih merayap. | Objek diberi waktu berbicara. |
| 5 | 0,52 → 0,64 | `27` dan `JULI` bergabung menjadi **27 · JULI · 879**; judul-label dan kalimat master menyusul. | Presisi datang setelah keberadaan. |
| 6 | 0,64 → 0,84 | **Tahanan baca.** Komposisi diam. Tautan dalam mendarat di sini. | Naskah penting tidak boleh hanya ada pada satu instan gulir. |
| 7 | 0,84 → 1,00 | Permukaan kehilangan skala dan meredup; garis strata melebar menjadi bentang. | Material menjadi geografi — pintu menuju 1042. |

---

## Yang dilarang di shot ini

- Menganimasikan aksara seolah urutan goresannya diketahui. **Tidak ada satu glyph pun** di kanvas.
- Menempatkan objek di situs galian Kediri rekaan.
- Menyembunyikan teks dengan `visibility`. Naskah sejarah tidak pernah keluar dari pohon aksesibilitas.
- Membuat gerakan yang tidak menjawab pertanyaan Hukum Motion Global. Kalau tidak ada jawabannya, gerakan itu dihapus.

## Varian

- **Desktop** — pin 320svh. Progresi internal terasa penuh.
- **Tablet** — pin 200svh. Ketukan sama, jarak lebih pendek.
- **Mobile** — tanpa pin. Alur vertikal asli, ketukan berurutan (novel grafis).
- **Reduced motion** — komposisi akhir langsung, tanpa pin, tanpa ruang kosong. Seluruh sejarahnya tetap ada.
