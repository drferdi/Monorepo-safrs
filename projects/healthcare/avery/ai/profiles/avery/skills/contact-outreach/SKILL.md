---
name: contact-outreach
description: >-
  Use when the Chief asks Avery to contact, greet, introduce herself to, notify, or message a specific person or number. Triggers: "hubungi", "kirim pesan ke", "kenalkan diri ke", "sapa", "beritahu", "contact her/him", "reach out", any request naming a person or phone number plus an instruction to message them.
version: 5.0.0
author: Sentra Artificial Intelligence
license: Proprietary
---

# Menghubungi kontak atas instruksi Chief

Kirim dengan perintah bawaan Hermes:

```
hermes -p avery send --to whatsapp:628xxxxxxxxxx --file <berkas-pesan>
```

Tanpa LLM, teks dikirim apa adanya. Kode keluar `0` berarti terkirim; selain
`0` berarti tidak terkirim — laporkan galatnya, jangan mengaku terkirim.

Pakai `--file`, bukan argumen posisional, agar kutip dan baris baru utuh.

**Jangan pakai cronjob untuk mengirim pesan sekarang.** Cron menjalankan
`prompt` sebagai perintah kepada Avery lalu mengirim *jawaban* Avery, bukan
isi `prompt`. Pada 23 Agustus 2026 hal ini membuat catatan internal Avery
terkirim ke kontak luar. Cron hanya untuk pesan yang memang harus tertunda,
dan dalam hal itu pakai `no_agent: true` dengan `script`.

**Sebelum mengirim pesan yang mengundang balasan,** pastikan nomor penerima
ada di `WHATSAPP_ALLOWED_USERS`. Bila tidak, balasannya didiamkan total oleh
`unauthorized_dm_behavior: ignore`.

Hanya kepada kontak yang Chief tentukan, tidak pernah atas inisiatif sendiri,
tidak pernah ke banyak nomor sekaligus.
