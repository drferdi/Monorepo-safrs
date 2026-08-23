# Medisync

Rumah bagi **Avery** — agen Hermes milik Sentra Artificial Intelligence — dalam bentuk konfigurasi yang terversi.

Runtime-nya adalah **Hermes Studio**, dipasang terpisah di luar repositori ini. Yang disimpan di sini hanya bagian yang menentukan *bagaimana* Avery berperilaku dan *di mana* ia dijalankan. Dengan begitu menambah agen baru cukup menambah profil, dan pindah dari laptop ke VPS cukup `git pull` lalu `docker compose up`.

## Isi

| Folder | Isi |
| --- | --- |
| `ai/profiles/avery/` | Persona (`SOUL.md`), skills, dan contoh konfigurasi |
| `deploy/` | `Dockerfile`, `docker-compose.yml`, `.env.example` |
| `scripts/` | Skrip operasional harian |
| `runtime/` | Instalasi Hermes yang sesungguhnya — tidak dilacak git, lihat di bawah |
| `docs/` | Arsitektur, data, pengujian, panduan deploy, riwayat perbaikan |

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

## Runtime di dalam proyek

Sejak 2026-08-23 instalasi Hermes berada fisik di `runtime/`: `HERMES_HOME`, state web UI, aplikasi Hermes Studio, cache Electron, dan berkas updater. Lokasi lama di `C:` dan di `abyss-monorepo` diganti *directory junction* yang menunjuk ke sini, sehingga seluruh path absolut lama tetap bekerja tanpa satu pun perlu ditulis ulang.

Ukurannya sekitar 3,8 GB dan sebagian setara kredensial. Seluruh `runtime/` masuk `.gitignore` — tidak satu byte pun ikut ter-commit. Rinciannya di `docs/whatsapp-group-fix.md`.

## Menemukan grup yang belum terdaftar

`group_policy` harus `allowlist`: sejak Hermes 0.20.4, nilai `open` menolak start kecuali `WHATSAPP_ALLOW_ALL_USERS` menyala, dan flag itu mengotorisasi siapa pun di grup maupun DM. Konsekuensinya setiap grup baru harus didaftarkan manual, dan grup yang terlewat diam total tanpa satu baris log pun.

```powershell
pwsh -File scripts/check-unregistered-groups.ps1
```

Skrip membandingkan grup yang dikenal sesi WhatsApp dengan isi `config.yaml`, lalu menyebut nama grup yang belum terdaftar beserta JID-nya. Jalankan setiap kali agen tampak diam di suatu grup.

## Riwayat perbaikan

`docs/whatsapp-group-fix.md` mencatat penyelidikan 2026-08-23 saat Avery tidak pernah membalas di grup WhatsApp: akar masalahnya, tiga jebakan konfigurasi yang menyebabkan kegagalan senyap, matriks siapa yang bisa memanggil agen, dan perintah rollback.

Baca dokumen itu sebelum menyentuh blok `whatsapp:` atau `gateway.platforms.whatsapp` di konfigurasi mana pun. Tiga hal yang paling mudah terulang:

1. Blok `whatsapp:` tingkat atas **menimpa** `gateway.platforms.whatsapp.extra` untuk kunci bridgeable. `group_allowed_chats` dan `free_response_chats` adalah pengecualian — keduanya hanya berlaku di `extra`.
2. Regex `mention_patterns` harus ditulis dalam kutip tunggal YAML. Dalam kutip ganda, backslash ter-escape ganda dan pola tidak pernah cocok.
3. Nilai `group_policy` yang tidak dikenal — misalnya `none` dari templat yang belum diisi — membuat semua pesan grup dibuang tanpa satu baris log pun.

## Yang tidak ada di sini

Kredensial, sesi WhatsApp, basis data runtime, catatan memori, dan binary Hermes Studio. Daftar lengkap beserta alasannya ada di `AGENTS.md`.
