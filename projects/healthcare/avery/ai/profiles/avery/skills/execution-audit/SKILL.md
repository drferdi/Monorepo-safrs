---
name: execution-audit
description: >-
  Use this skill for any work that takes more than one step, runs on a schedule, changes something outside the conversation, or that the Chief may later ask for proof of. It turns work into a kanban task with an auditable run trail, per the Execution rule in SOUL.md. Triggers: multi-step tasks, scheduled jobs, sending messages on the Chief's behalf, changing configuration, any claim of "sudah selesai" or "sudah terkirim".
version: 1.0.0
author: Sentra Artificial Intelligence
license: Proprietary
---

# Jejak eksekusi yang bisa dibuktikan

## Kenapa

Execution rule di SOUL.md menyatakan verifikasi wajib sebelum menyatakan selesai: setiap mutasi harus dibuktikan lewat ID tugas beserta keadaan yang dibaca ulang, dan catatan peristiwa ber-`run ID`.

Artinya: pekerjaan yang tidak meninggalkan jejak dianggap tidak terjadi. Bukan karena tidak dipercaya, tetapi karena tidak bisa diperiksa.

## Alat yang dipakai

Kanban Hermes sudah menyediakan semuanya — tidak perlu membangun apa pun. Terverifikasi 2026-08-23 (tugas `t_d24db445`): `create` menghasilkan ID, `show` mengembalikan keadaan beserta daftar Events bertimestamp, `comment` menambah peristiwa, `complete` menutup dengan hasil dan mencatat `[run 1] completed`.

## Kapan wajib dicatat

- Pekerjaan lebih dari satu langkah.
- Apa pun yang berjalan terjadwal.
- Apa pun yang mengubah keadaan di luar percakapan — mengirim pesan, menyunting berkas, mengubah konfigurasi.
- Apa pun yang Chief mungkin tanyakan buktinya nanti.

**Tidak perlu dicatat:** menjawab pertanyaan, mengobrol, mencari sesuatu tanpa mengubah apa pun.

## Prosedur

Semua lewat tool `terminal`.

**1. Buka tugas sebelum bekerja**

```
hermes kanban create "<judul ringkas>" --body "<hasil yang dituju dan kenapa>" --idempotency-key "<kunci-unik>"
```

Simpan ID yang dikembalikan. `--idempotency-key` mencegah tugas kembar bila langkah ini terulang — pakai kunci yang menggambarkan pekerjaannya, misalnya `sambut-anggota-<jid>-<tanggal>`.

**2. Catat peristiwa penting selagi bekerja**

```
hermes kanban comment <task_id> "<apa yang terjadi, beserta buktinya>"
```

Catat yang bisa diperiksa: ID pesan, status pengiriman, kode keluar, nama berkas. Jangan mencatat niat — catat hasil.

**3. Tutup dengan hasil sebenarnya**

```
hermes kanban complete <task_id> --result "<apa yang benar-benar terjadi>"
```

Bila gagal, tetap tutup dengan hasil yang jujur, atau blokir dengan sebabnya:

```
hermes kanban block <task_id> --reason "<yang menghambat>"
```

**4. Periksa sebelum melapor**

```
hermes kanban show <task_id>
```

Baca ulang keadaannya. Baru laporkan kepada Chief dengan menyebut ID tugasnya.

## Aturan yang tidak boleh dilanggar

**Jangan pernah menyatakan sesuatu selesai tanpa membaca ulang hasilnya.** Ini pernah terjadi: Avery menyatakan sebuah nomor sudah tersimpan di memori, padahal tulisannya tertahan di antrean persetujuan lalu gagal karena batas karakter. Tidak ada yang tersimpan, dan tidak ada yang tahu sampai Chief membuka panel persetujuan.

Aturannya sederhana: yang dilaporkan adalah yang dibaca kembali, bukan yang dikirimkan.

**Jangan menghapus atau menulis ulang jejak.** Peristiwa bersifat menumpuk. Kalau ada yang salah, tambahkan koreksi sebagai peristiwa baru.

**Sebutkan ID tugas dalam laporan.** Itu yang membuat laporan bisa diperiksa Chief tanpa bertanya lagi.
