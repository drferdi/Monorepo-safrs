---
name: contact-outreach
description: >-
  Use this skill whenever the Chief asks Avery to contact, greet, introduce herself to, notify, or send a message to a specific person or number that Avery has not been talking to — including people who have never messaged Avery before. It resolves the common mistaken belief that Avery cannot initiate outbound messages. Triggers: "hubungi", "kirim pesan ke", "kenalkan diri ke", "sapa", "beritahu", "contact her/him", "reach out", "introduce yourself to", any request naming a phone number or a person plus an instruction to message them.
version: 4.0.0
author: Sentra Artificial Intelligence
license: Proprietary
---

# Menghubungi kontak atas instruksi Chief

## Cara mengirim pesan

Satu perintah:

```
hermes -p avery send --to whatsapp:628xxxxxxxxxx --file <berkas-pesan>
```

Itu saja. `hermes send` adalah pembungkus langsung `send_message_tool`: tanpa
LLM, tanpa agent loop, teks dikirim apa adanya. Kode keluarnya adalah bukti:

| Kode | Arti |
|---|---|
| `0` | terkirim |
| `1` | gagal di sisi platform |
| `2` | salah argumen atau konfigurasi |

Pakai `--file`, bukan argumen posisional, supaya kutip dan baris baru dalam
pesan tidak dirusak shell.

## Jangan pakai cronjob untuk mengirim pesan

Cron adalah **penjadwal**, bukan pengirim. Memakainya untuk mengirim pesan
sekarang itu keliru, dan pernah gagal di depan orang sungguhan.

Cron menjalankan `prompt` sebagai **perintah kepada Avery**, lalu mengirim
**jawaban Avery**, bukan isi `prompt`. Pada 23 Agustus 2026 teks perkenalan
untuk seorang kontak luar ditaruh sebagai `prompt`. Avery membacanya sebagai
perintah, tidak menemukan nomor tujuan dalam konteksnya, lalu menjawab kepada
Chief: *"saya tidak dapat melanjutkan karena saya tidak memiliki informasi
nomor WhatsApp beliau."* Jawaban itulah yang mendarat di HP kontak tersebut,
lengkap dengan header `Cronjob Response:` dan `(job_id: ...)`.

Cron hanya dipakai bila pesannya memang **harus tertunda** ke waktu tertentu.
Dalam hal itu pun isinya tidak boleh ditaruh di `prompt` — pakai
`no_agent: true` dengan `script`, karena hanya mode itu yang mengirim stdout
apa adanya.

## Prosedur

1. **Pastikan Chief yang meminta.** Pesan keluar hanya atas instruksi Chief
   yang jelas. Tidak pernah atas inisiatif sendiri.

2. **Tulis pesannya ke berkas UTF-8.** Ditujukan kepada penerima, bukan kepada
   Chief. Jangan menyebut cronjob, job_id, atau apa pun soal mesinnya.

3. **Periksa draf lewat broker persetujuan.** Jalankan dari akar kapsul
   dengan `PYTHONPATH=src`:

   ```
   python -m avery_outbound.cli prepare --to 628xxxxxxxxxx --file <berkas>
   python -m avery_outbound.cli approve <id>
   python -m avery_outbound.cli status <id>
   ```

   `prepare` menolak draf yang menyapa Chief atau memuat perancah internal,
   mengikat draf pada hash SHA-256-nya, dan mencetak `<id>` permintaan.
   Persetujuan kedaluwarsa 15 menit. `status` menampilkan perintah
   `hermes -p avery send ...` yang harus dijalankan manusia — broker tidak
   pernah mengeksekusinya sendiri dan hanya sekali pakai per permintaan.

   Broker **tidak pernah** mengubah `WHATSAPP_ALLOWED_USERS`. Bila nomor
   penerima belum ada di daftar itu, `prepare` keluar dengan kode `3` dan
   Chief menambahkannya manual di `.env` runtime sebelum mengirim — tanpa
   itu balasan penerima jatuh ke `unauthorized_dm_behavior: ignore` dan
   didiamkan total. Menyapa orang lalu tidak menggubris balasannya lebih
   buruk daripada tidak menyapa.

4. **Kirim, lalu baca kode keluarnya.** Kode `0` berarti terkirim. Kode selain
   `0` berarti **tidak** terkirim — laporkan galatnya apa adanya, jangan
   mengaku terkirim.

5. **Laporkan** kepada siapa, isi persis yang dikirim, dan hasil pengirimannya.

## Batas yang tidak boleh dilanggar

- Hanya kepada kontak yang Chief tentukan. Tidak pernah kepada daftar nomor
  sekaligus.
- Satu pesan per instruksi. Jangan menyusul bila belum dibalas, kecuali Chief
  memintanya.
- Perkenalkan diri apa adanya: asisten Chief, bukan manusia, bukan Chief.
- Jangan menuliskan nomor telepon, alamat, atau data pribadi orang lain ke
  dalam pesan tanpa alasan yang Chief berikan.
- Bila penerima meminta berhenti dihubungi, hentikan dan laporkan.

## Bila gagal terkirim

WhatsApp lewat Baileys memerlukan gateway hidup. Periksa berurutan:

1. bridge `connected` — `http://127.0.0.1:3000/health`,
2. format target benar — nomor tanpa `+`, tanpa spasi, tanpa tanda hubung,
3. nomor tersebut memang terdaftar di WhatsApp.

Laporkan kegagalan apa adanya beserta pesan galatnya. Jangan mengaku sudah
mengirim bila belum ada bukti.
