# Medisync

Rumah bagi **Avery** — agen Hermes milik Sentra Artificial Intelligence — dalam bentuk konfigurasi yang terversi.

Runtime-nya adalah **Hermes Studio**, dipasang terpisah di luar repositori ini. Yang disimpan di sini hanya bagian yang menentukan *bagaimana* Avery berperilaku dan *di mana* ia dijalankan. Dengan begitu menambah agen baru cukup menambah profil, dan pindah dari laptop ke VPS cukup `git pull` lalu `docker compose up`.

## Isi

| Folder | Isi |
| --- | --- |
| `ai/profiles/avery/` | Persona (`SOUL.md`), skills, dan contoh konfigurasi |
| `deploy/` | `Dockerfile`, `docker-compose.yml`, `.env.example` |
| `scripts/` | Skrip operasional harian |
| `docs/` | Arsitektur, data, pengujian, panduan deploy |

## Mulai cepat

Hermes membaca semuanya dari satu direktori, disebut `HERMES_HOME`:

- Windows: `%LOCALAPPDATA%\hermes` (junction ke `%USERPROFILE%\.hermes`)
- Linux / kontainer: `~/.hermes`

Profil aktif ditentukan berkas `active_profile` di direktori itu.

Untuk menyiapkan profil baru dari repositori ini:

1. Salin `ai/profiles/avery/SOUL.md` dan `ai/profiles/avery/skills/` ke `<HERMES_HOME>/profiles/avery/`.
2. Salin `ai/profiles/avery/config.example.yaml` menjadi `config.yaml` di sana, lalu isi bagian bertanda `<...>`.
3. Salin `deploy/.env.example` menjadi `.env` di sana, lalu isi kuncinya.
4. Jalankan gateway.

Pemasangan WhatsApp butuh pemindaian QR sekali di mesin tujuan; sesi hasilnya tinggal di `<HERMES_HOME>` dan tidak pernah masuk repositori.

## Operasional harian

`scripts/restart-gateway.bat` (Windows) dan `scripts/restart-gateway.sh` (Linux) memulai ulang gateway dengan urutan yang benar. Urutan itu penting: proses `whatsapp-bridge` bisa hidup lebih lama daripada gateway induknya, lalu terus memegang port 3000 dan direktori sesi. Akibatnya gateway berikutnya menyimpulkan WhatsApp belum terpasang dan keluar dengan kode 78. Skrip ini menghentikan gateway lebih dulu, membersihkan bridge yang tersisa, baru menyalakan lagi.

## Yang tidak ada di sini

Kredensial, sesi WhatsApp, basis data runtime, catatan memori, dan binary Hermes Studio. Daftar lengkap beserta alasannya ada di `AGENTS.md`.
