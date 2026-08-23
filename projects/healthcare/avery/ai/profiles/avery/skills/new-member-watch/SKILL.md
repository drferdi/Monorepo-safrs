---
name: new-member-watch
description: >-
  Use this skill to detect people who have newly joined a WhatsApp group and welcome them proactively, without waiting to be asked. Runs on a schedule and also on demand. Triggers: "cek anggota baru", "siapa yang baru gabung", "sambut anggota baru", the scheduled member-watch job, or any moment a message arrives from a sender Avery has never seen in that group before.
version: 1.0.0
author: Sentra Artificial Intelligence
license: Proprietary
---

# Mengawasi dan menyambut anggota baru

## Kenapa skill ini ada

Bridge WhatsApp tidak meneruskan peristiwa "anggota bergabung" — `bridge.js` tidak mendengarkan `group-participants.update`, jadi tidak ada notifikasi otomatis. Itu keterbatasan nyata.

Jalur yang bekerja: bridge menyediakan `GET /chat/<jid>` yang mengembalikan daftar peserta terkini. Bandingkan dengan snapshot sebelumnya, dan selisihnya adalah anggota baru. Ini penerapan langsung prinsip di skill `capability-and-limits` — tidak ada event, tetapi ada endpoint yang bisa ditanya.

## Cara memeriksa

Bridge berjalan di `http://127.0.0.1:3000`. Snapshot disimpan di
`<HERMES_HOME>/state/group-members.json`.

Langkah, dijalankan lewat tool `terminal`:

1. Baca daftar grup dari `config.yaml` — kunci `whatsapp.group_allow_from`.
2. Untuk setiap grup: `curl -s http://127.0.0.1:3000/chat/<jid>` → objek berisi `name` dan `participants`.
3. Bandingkan `participants` dengan snapshot untuk grup itu.
4. Peserta yang ada sekarang tetapi tidak ada di snapshot = **anggota baru**.
5. Peserta yang hilang = keluar. Catat, jangan diumumkan.
6. Tulis snapshot baru.

Bila berkas snapshot belum ada, tulis snapshot pertama dan **jangan menyambut siapa pun** — semua peserta akan tampak baru, dan menyambut semuanya sekaligus itu keliru.

## Menyambut

Untuk setiap anggota baru:

1. **Kenali dulu.** Cari nomor atau LID-nya di memori. Bila dikenal, sapa dengan namanya. Bila tidak dikenal, sambut tanpa mengarang identitas.
2. **Sambut di grup**, bukan lewat japri, kecuali Chief meminta lain. Anggota baru perlu terlihat diterima oleh grupnya.
3. **Isi sambutan mengikuti skill `member-onboarding`** — kenali orangnya, jelaskan Avery dalam satu kalimat, sebutkan konteks grup ini, tawarkan satu langkah orientasi berikutnya. Jangan menumpahkan dokumen.
4. **Sesuaikan dengan topik grup.** Tiap grup punya lingkup berbeda; sambutan di grup teknis tidak sama dengan di grup pertumbuhan bisnis.
5. **Satu sambutan per orang per grup.** Snapshot mencegah pengulangan — pastikan snapshot tertulis setelah menyambut, bukan sebelum.

## Membimbing setelah menyambut

Menyambut hanya pembuka. Selama beberapa hari pertama:

- Perhatikan pertanyaan anggota baru dan jawab lebih penuh dari biasanya.
- Bila ia tampak mencari sesuatu yang sudah ada — dokumen, keputusan lama, kontak — tunjukkan, jangan biarkan mencari sendiri.
- Bila ia menyebut peran atau keahliannya, simpan ke memori supaya bantuan berikutnya lebih tepat sasaran.
- Jangan membanjiri. Satu langkah berikutnya, bukan lima.

## Batas

- Jangan pernah menyambut di grup yang tidak terdaftar di `group_allow_from`.
- Jangan menyebut nomor telepon, alamat, atau data pribadi anggota lain di dalam sambutan.
- Jangan mengumumkan siapa yang keluar dari grup. Catat diam-diam, laporkan ke Chief bila ia bertanya.
- Bila data yang dibutuhkan benar-benar tidak ada, laporkan BLOCKED sesuai format SOUL.md; jangan bertanya untuk hal yang bisa diperiksa sendiri.

## Mencatat pekerjaan

Setiap putaran pengawasan yang menghasilkan sambutan dicatat sebagai tugas kanban, sesuai skill `execution-audit`. Bila tidak ada anggota baru, tidak perlu mencatat apa pun.

## Bila gagal

Bila bridge tidak menjawab, periksa `http://127.0.0.1:3000/health`. Bila `disconnected` atau tidak menjawab sama sekali, gateway sedang tidak berjalan — laporkan kepada Chief, jangan diam. Jangan menulis snapshot dari data yang gagal diambil; snapshot yang salah akan membuat seluruh grup tampak baru pada putaran berikutnya.
