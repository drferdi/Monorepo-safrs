# Rancangan pencahayaan dan interaksi panel samping

Status: diimplementasikan pada branch terpisah `codex/sidepanel-lighting` berdasarkan arahan Chief pada 2026-09-27 untuk bekerja di folder lain saat logic dikerjakan paralel. Pemeriksaan visual langsung di Chrome masih tertunda.

## Tujuan

Membuat panel samping Chrome yang aktif terasa seperti satu konsol yang utuh dan realistis, sambil menjaga informasi klinis tetap jelas dan komposisi yang telah disetujui Chief tetap utuh.

## Kebutuhan desain

1. Selaraskan bingkai, kartu, kontrol, tombol tema, dan efek pergantian tema pada satu sumber cahaya di kiri atas, dekat posisi tombol tema yang benar. Efek pergantian tema saat ini berasal dari 92% 6% di kanan atas; perbaiki asal efek itu tanpa mengubah susunan panel. Gunakan pantulan lokal dan arah bayangan yang konsisten; batasi cahaya dekoratif.
2. Gunakan status nyata `ready`, `processing`, `completed`, dan `alert` untuk menyelaraskan tepi bingkai dengan kontrol yang melaporkan operasi yang sama. Indikator sinkronisasi pasien hanya menjelaskan sinkronisasi pasien; permintaan Uplink tidak boleh membuat indikator itu terlihat sibuk. Peringatan merah memiliki prioritas visual ketika status bertumpuk. Teks dan batas status tetap terbaca tanpa animasi.
3. Bedakan tiga tingkat permukaan: bingkai, kontrol menonjol, dan input cekung. Gunakan kembali token warna Sentra serta pertahankan palet gelap dan terang yang sudah disetujui.
4. Pertahankan Uplink, Doctor, dan Trajectory dalam bilah aksi tiga tombol yang sudah ada. Bedakan status awal, diproses, selesai, nonaktif, dan fokus papan ketik. Pertahankan nama, urutan, handler, dan teks kesalahannya.
5. Pada lebar panel 320, 360, dan 440 piksel CSS, pertahankan GCS di kiri tekanan darah, SBP dan DBP bersama, label tanda vital terbaca, dan tiga tombol aksi terlihat tanpa gulir horizontal.
6. Gunakan transisi cahaya dekoratif singkat yang dipicu kejadian. Hormati preferensi pengurangan gerakan dengan gaya status statis; pertahankan cincin fokus dan label yang jelas. Jangan tambahkan pustaka visual pihak ketiga.
7. Tambahkan tiga lampu dekoratif kecil pada ruang kosong di kanan atas header. Pola nyalanya boleh berubah secara acak tetapi terbatasi: paling banyak dua lampu menyala sekaligus, tanpa pola yang berulang langsung, waktu tahan 4–9 detik, dan transisi paling lama 180ms. Hentikan variasi saat tab tersembunyi, preferensi pengurangan gerakan aktif, atau triase merah tampil. Lampu ini murni dekoratif, `aria-hidden`, dan tidak boleh meniru warna atau kedipan peringatan klinis.
8. Tampilkan label singkat `CEK ULANG` pada tombol sinkronisasi pasien hanya ketika `demographicStatus === 'insufficient'`, yang saat ini berasal dari kegagalan ekstraksi pasien. Ketika status lain, pertahankan label `SYN PATIENT`. Lampu acak tidak boleh memunculkan label ini, mengubah status pasien, atau memicu tindakan apa pun.

## Batasan

- Runtime aktif: `entrypoints/sidepanel/main.tsx` mengimpor `style.css` dan memasang `SidePanelHeader` serta `TTVInferenceUI`. `sentra-panel.css` milik `ApprovedSentraAssistApp`, yang tidak dipasang pada runtime ini.
- Acuan UI panel samping adalah `clinical-trajectory-v2`. Arahan Chief dalam percakapan ini mengizinkan implementasi rencana UI di checkout terpisah; perubahan tetap dibatasi pada berkas dan perilaku yang dijabarkan di atas.
- Jangan ubah ambang klinis, diagnosis atau keputusan triase, perilaku transfer RME, penanganan data pasien, atau kapsul lain.
- Jangan ubah urutan maupun jumlah tiga aksi, atau penempatan GCS dan tekanan darah yang telah disetujui.
