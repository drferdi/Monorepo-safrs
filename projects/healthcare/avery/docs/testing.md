# Pengujian

Belum ada berkas kode di `src/`, jadi tidak ada rangkaian uji otomatis. Yang diverifikasi adalah gateway yang sedang berjalan.

## Setelah mengubah konfigurasi

Konfigurasi baru hanya terbaca saat gateway dimulai. Jalankan `scripts/restart-gateway.bat` atau `scripts/restart-gateway.sh`, lalu pastikan tiga hal:

1. `gateway status` melaporkan gateway hidup.
2. Ada satu proses `whatsapp-bridge`, dan pemilik port 3000 adalah proses itu.
3. Kirim satu pesan uji ke kanal rumah; `logs/gateway.log` harus memuat pasangan baris `inbound message` dan `response ready`.

Gagal di langkah kedua hampir selalu berarti bridge yatim. Skrip restart sudah menanganinya, tetapi bila masih tersisa, proses bridge yang induknya sudah mati aman dihentikan paksa.

## Memeriksa nilai konfigurasi terbaca

Konfigurasi dibaca berlapis, dan blok platform tingkat atas mengalahkan blok bersarang. Untuk memastikan nilai yang benar-benar dipakai, baca lewat pemuat Hermes sendiri, bukan dengan membaca YAML mentah — pemuat itulah yang menentukan pemenangnya.

## Memeriksa memori

Sebelum menyetujui usulan tulis memori, cocokkan `old_text` usulan dengan isi berkas menggunakan pemisah dan pengodean yang sama seperti kode Hermes: pemisah `\n§\n`, pengodean `utf-8-sig`. Cocok tepat satu entri berarti usulan akan berhasil; nol berarti usulan sudah basi.

Perhatikan juga batas karakter. Beberapa usulan bisa lolos sendiri-sendiri tetapi melebihi batas bila digabung, dan yang terakhir disetujui akan gagal.

## Log yang berguna

Semuanya di `<HERMES_HOME>/profiles/<profil>/logs/`:

| Berkas | Isi |
| --- | --- |
| `gateway.log` | pesan masuk dan keluar, jejak utama |
| `errors.log` | peringatan dan galat |
| `gateway-exit-diag.log` | JSON per proses, memuat kode keluar |
| `gateway-stdio.log` | keluaran mentah, termasuk galat penghentian bridge |
| `gui.log` | perubahan dari web UI |

Kode keluar 78 berarti masalah konfigurasi. Bila disertai pesan "WhatsApp enabled but not paired", periksa bridge yatim lebih dulu sebelum menyimpulkan sesi hilang.
