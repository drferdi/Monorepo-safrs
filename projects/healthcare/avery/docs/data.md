# Data

## Klasifikasi

| Data | Lokasi | Sifat | Masuk repo |
| --- | --- | --- | --- |
| Persona | `SOUL.md` | definisi perilaku | ya |
| Skills | `skills/` | 33 kemampuan | ya |
| Konfigurasi | `config.yaml` | pengaturan, tanpa rahasia | contohnya saja |
| Kunci penyedia | `.env`, `auth.json` | rahasia | tidak |
| Sesi WhatsApp | `platforms/whatsapp/session/` | setara kunci nomor | tidak |
| Memori agen | `memories/MEMORY.md`, `USER.md` | catatan tentang orang sungguhan | tidak |
| Riwayat percakapan | `state.db`, `sessions/` | isi percakapan | tidak |
| Papan kerja | `kanban.db` | tugas | tidak |
| Antrean persetujuan | `pending/memory/`, `pending/skills/` | usulan tulis | tidak |

## Sesi WhatsApp

Direktori `platforms/whatsapp/session/` memuat `creds.json` beserta kunci sinkronisasi. Isinya cukup untuk bertindak sebagai perangkat tertaut pada nomor tersebut. Perlakukan setara kata sandi: jangan disalin, jangan dikirim, jangan di-commit.

Sesi bertahan melintasi restart. Bila gateway melaporkan WhatsApp belum terpasang padahal `creds.json` ada, penyebabnya hampir selalu proses bridge yatim yang masih memegang direktori itu — bukan sesi yang hilang.

## Memori agen

Dua berkas, keduanya teks biasa dengan pemisah `\n§\n`:

- `MEMORY.md` — memori umum.
- `USER.md` — profil pengguna.

Penulisan melewati gerbang persetujuan bila `memory.write_approval` bernilai true. Usulan menunggu sebagai JSON di `pending/memory/`. Tiap usulan `replace` menyimpan potret teks lama; bila teks di berkas sudah berubah, usulan itu tidak akan pernah cocok lagi dan harus ditolak, bukan dipaksakan.

## Basis data

SQLite, dan runtime yang terpasang menautkan SQLite 3.50.4 — versi yang terkena bug WAL-reset. Hermes menanganinya sendiri: basis data baru dibuka dengan `journal_mode=DELETE`, sedangkan yang sudah telanjur WAL dibiarkan apa adanya karena penurunan mode saat ada pembuka lain justru berbahaya. Peringatan ini muncul sekali per proses per basis data di `logs/errors.log` dan bukan tanda kerusakan.

Berkas `deploy/Dockerfile` membangun SQLite 3.53.4 sendiri, sehingga penempatan berbasis kontainer tidak mewarisi masalah ini.
