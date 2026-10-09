# Templat, riwayat, peninjauan, dan antrean Sentrapedia

Status: IMPLEMENTED — rancangan disetujui Chief dengan “Comfirmed, Executive” pada 2026-10-09; eksekusi dan review solo sesuai arahan tanpa worker tambahan.
Risiko: R2, penambahan kontrak penyimpanan lokal. Eksekusi solo sesuai instruksi Chief sebelumnya.

## Tujuan dan batas

Mempercepat dokumentasi, menjaga isi sebelum perubahan, dan memudahkan pengguna melanjutkan pekerjaan. Pertahankan visual Tosca/neumorfisme, jarak beranda, empat intent, dan semua alur yang sudah bekerja. Semua fitur berjalan lokal tanpa instalasi, AI, knowledge base, cloud, billing, atau inferensi klinis. Data tetap fiktif; penyimpanan browser belum aman untuk pasien nyata. Status/checklist adalah metadata kerja pengguna, bukan validasi klinis atau tanda tangan audit.

## 1. Templat pribadi dan favorit

- Akses Kelola templat di dekat pilihan templat composer; dialog untuk membuat, mengubah, menggandakan, dan menghapus templat.
- Templat menyimpan nama, mode dasar dari 14 mode yang ada, daftar judul bagian Markdown, dan instruksi penulisan. Semua masukan adalah teks biasa, bukan kode atau instruksi untuk layanan eksternal.
- Struktur pribadi menghasilkan kerangka bagian dengan isi yang pengguna masukkan secara eksplisit melalui label yang sesuai. Bagian tanpa isi dinyatakan belum tersedia. Input dan konteks mentah tetap tersedia sebagai sumber. Instruksi penulisan dicatat sebagai preferensi; aplikasi lokal tidak mengklaim memahaminya melalui AI.
- Favorit dapat mencakup mode bawaan dan templat pribadi. Chip favorit muncul dekat composer dengan jumlah terbatas dan akses ke daftar lengkap.
- Memilih templat tidak membuang prompt atau langsung mengirim. Templat terpilih terlihat jelas, dapat dilepas, dan identitas/struktur/preferensinya disalin ke metadata sumber saat draf dibuat. Mengubah atau menghapus templat tidak mengubah dokumen lama.
- Hapus memerlukan konfirmasi di dalam dialog; pilihan/favorit terkait dibersihkan.

## 2. Riwayat versi dan pemulihan draf

- Tab Riwayat di Document Studio memperlihatkan waktu Jakarta, label versi, alasan (edit/pemulihan), dan pratinjau isi; pengguna dapat memberi nama versi dan membandingkannya dengan isi terkini.
- Simpan versi sebelum perubahan isi yang nyata, baik edit penuh, bagian, maupun checklist Markdown dalam dokumen. Edit tanpa perubahan tidak menambah versi.
- Pemulihan memperlihatkan isi target dan meminta konfirmasi, menyimpan isi terkini sebagai versi terlebih dahulu, kemudian mengganti isi dengan salinan versi yang dipilih. Versi sumber tidak dihapus.
- Semua edit/pemulihan mengembalikan status ke Draf dan mengosongkan tanda peninjauan. sourceText serta originalContent tetap mempertahankan sumber/baseline awal.
- Dokumen lama hanya memiliki riwayat sejak fitur tersedia; jangan mengarang versi atau waktu lampau.
- Simpan maksimal 50 snapshot per dokumen dengan pemberitahuan batas; baseline awal tetap disimpan terpisah. Ini pemulihan lokal, bukan audit permanen.

## 3. Daftar peninjauan sebelum finalisasi

- Bagian Peninjauan di Document Studio, berbeda dari tugas Markdown yang sudah ada.
- Default: identitas/kaitan Encounter diperiksa; sumber dan isi ditinjau; bagian kosong diperhatikan; bahasa/format diperiksa.
- Pengguna dapat mengatur daftar default di pengelola checklist. Setiap dokumen mendapat snapshot daftar sendiri; perubahan default tidak mengubah checklist dokumen lain.
- Item bisa memiliki target bagian untuk navigasi; item umum mengarah ke dokumen atau sumber. Centang tidak menambahkan informasi klinis ke isi.
- Ditinjau hanya tersedia setelah seluruh item wajib dicentang; Final memerlukan Ditinjau dan checklist lengkap. Gate yang sama diterapkan di reducer, bukan hanya dropdown.
- Edit atau pemulihan isi membatalkan seluruh tanda checklist dan status Ditinjau/Final. Status final lama tetap terbaca; perubahan berikutnya mengikuti gate baru.
- Checklist kosong tidak boleh menjadi jalan pintas finalisasi; minimal satu item wajib. Item tambahan dapat dibuat/dihapus sebelum peninjauan, dengan status kembali Draf jika daftar berubah.

## 4. Antrean pekerjaan klinis

- Akses Antrean kerja di sidebar dan Command Center, membuka dialog/panel dengan tiga kelompok: Sedang dikerjakan, Perlu ditinjau, Selesai.
- Status antrean diatur pengguna per Encounter, terpisah dari status Draf/Ditinjau/Final setiap dokumen. Tidak menandakan kesembuhan, diagnosis, urgensi, atau validasi klinis.
- Kartu menampilkan judul, kaitan Patient atau Tidak terkait Patient, waktu perubahan, jumlah draf, dan status dokumen terakhir. Dapat dicari dan difilter berdasarkan Patient.
- Pin Encounter mengurutkannya lebih dahulu. Tugas tindak lanjut manual memiliki teks dan centang selesai; tanpa notifikasi terjadwal atau rekomendasi otomatis.
- Klik kartu membuka Encounter beserta draf terakhir. Status, pin, dan tugas tersimpan setelah reload; hapus Encounter/Patient membersihkan item terkait melalui kontrak yang ada.

## Kontrak dan cakupan file

- Pertahankan storageKey dan version 1; penambahan bersifat optional dengan default aman untuk data lama.
- lib/workspace.ts: types, reducer, validasi restore/metadata, tambahan templat/favorit/checklist/versi/antrean. Buang metadata baru yang malformed secara terpisah sambil menjaga record lama yang valid.
- lib/workflow.ts (baru): helper murni struktur templat, snapshot/checklist, dan filter/sort antrean. Tidak mengimpor dari capsule lain atau root.
- components/template-library.tsx dan components/work-queue.tsx (baru): dialog lokal yang memakai komponen Dialog yang ada.
- components/composer.tsx, document-studio.tsx, message-card.tsx, workspace.tsx, sidebar.tsx, command-palette.tsx: integrasi terbatas pada fitur ini.
- app/globals.css: gaya komponen baru berbasis token lokal, responsive, fokus keyboard, dan reduced motion.
- tests/workflow.test.ts (baru), tests/workspace.test.ts dan tests/studio.test.ts: uji kontrak serta regresi. CONTEXT/HANDOFF mencatat hasil dan batas.
- Backup JSON menyertakan metadata baru. Jangan mengklaim impor backup tersedia jika belum ada alurnya. Kegagalan simpan browser harus terlihat; jangan menyatakan tersimpan ketika gagal.

## Kriteria penerimaan dan verifikasi

1. Buat/edit/hapus/favorit templat; pilih tanpa kehilangan prompt; hasil mempertahankan sumber dan tidak mengarang bagian kosong; reload mempertahankan data.
2. Edit nyata membuat snapshot; edit identik tidak; pemulihan mempertahankan isi sebelumnya; source/baseline tidak berubah; reload dan metadata malformed diuji.
3. Finalisasi ditolak sebelum checklist lengkap dan Ditinjau; edit/reset/pemulihan membatalkan tanda; dokumen lama terbaca.
4. Tiga kelompok antrean, pin, filter, tugas manual, buka Encounter, dan pembersihan relasi bekerja setelah reload.
5. Verifikasi typecheck lalu lint dan targeted tests; build dan deploy dry run; salinan mandiri identik tanpa instalasi. Dua kegagalan verifikasi berturut-turut mengikuti circuit breaker Chief.
6. Browser desktop/ponsel: seluruh alur memakai data QA fiktif, keyboard/Escape, dialog, overflow, preview build aktual, dan data awal dipertahankan. Uji storage error dan laporkan jika batas lingkungan mencegah pengujian.

## Urutan teknis yang diusulkan

Kontrak penyimpanan dan helper teruji terlebih dahulu; lalu templat/favorit; riwayat dan pemulihan; checklist/gate; antrean; integrasi/export; pemeriksaan browser dan review solo. Rencana dan bukti penutupan tersedia di docs/plans/completed/2026-10-09-local-workflow-tools.md dan docs/verification/2026-10-09-local-workflow-tools.md. Berikutnya tinjauan penggunaan oleh Chief.
