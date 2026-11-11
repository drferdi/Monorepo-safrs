# Pengujian

Dua lapis: uji otomatis terhadap kode di repositori, dan verifikasi manual terhadap gateway yang sedang berjalan.

## Uji otomatis

Perintah kanonik, dijalankan dari akar monorepo:

```bash
pwsh -NoProfile -File projects/healthcare/avery/scripts/test.ps1
```

Runner mencari `py -3` lalu `python` (tidak pernah Python di `runtime/`), mengatur `PYTHONPATH=src`, dan menjalankan `unittest discover` — pustaka standar saja, tanpa dependensi. Kode keluarnya adalah kode keluar unittest. Bila `pwsh` belum terpasang, `powershell.exe` 5.1 bisa menjalankan skrip yang sama.

Yang dicakup:

| Berkas uji | Kontrak yang dijaga |
| --- | --- |
| `test_policy.py` | normalisasi nomor, penolakan draf yang menyapa Chief atau memuat perancah cron, validasi target tunggal, pembacaan allowlist read-only |
| `test_safety.py` | envelope keselamatan keluaran: thinking-only, empty model, retrying, fallback provider, jejak tool, job_id, traceback, instruksi internal, kosong/separator; prosa sah lolos |
| `test_store.py` | siklus pending → approved → sent, kedaluwarsa 15 menit (jam disuntikkan), sekali pakai, tulis atomik, ledger tanpa isi pesan |
| `test_sender.py` | argv `hermes -p avery send ...` persis, pengikatan hash draf, penolakan pengiriman kedua |
| `test_member_watch.py` | keluaran kosong pada jalankan pertama dan tanpa perubahan; anggota baru dilaporkan tersamar |
| `test_powershell_dryrun.py` | `sync-profile-to-repo.ps1 -WhatIf` tidak menulis satu berkas pun |

Uji tidak pernah menyentuh `runtime/`, `.env`, sesi WhatsApp, atau mengeksekusi Hermes.

## Verifikasi gateway hidup

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
