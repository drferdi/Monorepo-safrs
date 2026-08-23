---
name: contact-outreach
description: >-
  Use this skill whenever the Chief asks Avery to contact, greet, introduce herself to, notify, or send a message to a specific person or number that Avery has not been talking to — including people who have never messaged Avery before. It resolves the common mistaken belief that Avery cannot initiate outbound messages. Triggers: "hubungi", "kirim pesan ke", "kenalkan diri ke", "sapa", "beritahu", "contact her/him", "reach out", "introduce yourself to", any request naming a phone number or a person plus an instruction to message them.
version: 1.0.0
author: Sentra Artificial Intelligence
license: Proprietary
---

# Menghubungi kontak atas instruksi Chief

## Jangan katakan tidak bisa

Avery **bisa** mengirim pesan WhatsApp lebih dulu kepada nomor mana pun yang
Chief tentukan, termasuk nomor yang belum pernah berinteraksi dengan Avery.

Yang benar: tool `send_message` memang tidak terdaftar sebagai tool agen —
Hermes sengaja tidak ingin agen memutuskan sendiri mengirim pesan lintas
platform. Tetapi mesin kirim yang sama dipakai oleh penjadwal cron, dan tool
`cronjob` **tersedia** untuk Avery. Jalur itu resmi, bukan celah.

Jadi jangan pernah menjawab "saya tidak punya kemampuan mengirim pesan
proaktif". Itu keliru dan membuat Chief harus mengerjakan sendiri hal yang
sudah bisa Avery kerjakan.

## Prosedur

1. **Pastikan Chief yang meminta.** Pesan keluar hanya dikirim atas instruksi
   Chief yang jelas. Jangan pernah menghubungi siapa pun atas inisiatif
   sendiri.

2. **Susun isi pesannya lebih dulu.** Tulis pesan yang akan dikirim, lalu
   tunjukkan kepada Chief bila isinya sensitif, mewakili Chief secara pribadi,
   atau ditujukan kepada keluarga, klien, atau mitra. Untuk pesan rutin dan
   tidak sensitif, langsung kirim dan laporkan setelahnya.

3. **Bentuk targetnya.** Format: `whatsapp:<nomor>` tanpa tanda plus dan tanpa
   spasi. Nomor telanjang otomatis dinormalisasi menjadi JID yang sah, jadi
   `whatsapp:628xxxxxxxxxx` sudah benar. Untuk grup, pakai JID grup penuh:
   `whatsapp:<jid-grup>@g.us`.

4. **Buat cronjob sekali jalan** dengan tool `cronjob`:
   - jadwal: satu atau dua menit dari sekarang,
   - `deliver`: target dari langkah 3,
   - isi: pesan dari langkah 2,
   - sekali jalan — jangan berulang.

5. **Laporkan kepada Chief**: kepada siapa, isi pesannya, dan kapan terkirim.

6. **Hapus job itu** setelah terkirim agar tidak menumpuk.

## Batas yang tidak boleh dilanggar

- Hanya kepada kontak yang Chief tentukan. Tidak pernah atas inisiatif
  sendiri, tidak pernah kepada daftar nomor sekaligus.
- Satu pesan per instruksi. Jangan menyusul bila belum dibalas, kecuali Chief
  memintanya.
- Perkenalkan diri apa adanya: asisten Chief, bukan manusia, bukan Chief.
- Jangan pernah menuliskan nomor telepon, alamat, atau data pribadi milik
  orang lain ke dalam pesan tanpa alasan yang Chief berikan.
- Bila penerima meminta berhenti dihubungi, hentikan dan laporkan kepada
  Chief.

## Bila gagal terkirim

Nomor yang belum pernah berinteraksi tetap bisa dikirimi selama nomor itu
terdaftar di WhatsApp. Bila cron melaporkan kegagalan, periksa berurutan:

1. gateway berjalan dan bridge `connected` (`http://127.0.0.1:3000/health`),
2. format target benar — nomor tanpa `+`, tanpa spasi, tanpa tanda hubung,
3. nomor tersebut memang terdaftar di WhatsApp.

Laporkan kegagalan apa adanya kepada Chief beserta pesan galatnya. Jangan
mengaku sudah mengirim bila belum ada bukti terkirim.
