# Penempatan Avery di Hostinger VPS

**Diputuskan:** 2026-08-23 — Hostinger VPS dipilih sebagai rumah Avery 24/7.
**Sifat dokumen:** runbook. Dijalankan berurutan, bukan dibaca sekilas.

---

## 1. Jenis layanan

Harus **VPS KVM**. Shared hosting tidak bisa dipakai: Hermes butuh proses yang hidup terus, bind port sendiri, dan penyimpanan persisten — tidak satu pun tersedia di sana.

Ukuran yang masuk akal: **2 vCPU / 8 GB** ke atas. Gateway, bridge Node, dan Chromium untuk `browser-use` berjalan berdampingan; 1 vCPU / 4 GB akan sesak.

Sistem operasi: Ubuntu LTS. Docker dipasang di atasnya.

---

## 2. Yang pindah, dan yang tidak

Instalasi lengkap di laptop berukuran 3,6 GB, tetapi sebagian besar tidak relevan di server.

**Pindah — sekitar 60 MB:**

| Isi | Ukuran | Kenapa perlu |
|---|---|---|
| `skills/` | 46 MB | seluruh kemampuan yang diajarkan ke Avery |
| `platforms/whatsapp/session/` | 8,1 MB | sesi WhatsApp; tanpa ini harus pairing ulang |
| `state.db` | 5,4 MB | riwayat sesi dan delivery ledger |
| `cron/`, `memories/`, `SOUL.md`, `channel_aliases.json` | < 100 KB | jadwal, ingatan, persona, nama grup |
| `config.yaml`, `.env` | < 20 KB | disusun ulang di server, lihat §4 |

**Tidak ikut — sekitar 1,2 GB:** Hermes Studio (Electron, desktop-only), berkas updater, dan cache Roaming. Di server hanya `hermes-agent` yang berjalan.

---

## 3. Peringatan yang paling mudah merusak

> [!CAUTION]
> **Sesi WhatsApp tidak bisa hidup di dua tempat.**

Baileys mengikat `creds.json` ke satu perangkat. Bila gateway berjalan di laptop **dan** di VPS dengan sesi yang sama, keduanya berebut: sambungan putus bergantian, dan dalam kasus terburuk WhatsApp mengeluarkan perangkat itu sepenuhnya.

Peralihannya harus tegas — laptop berhenti dulu, baru VPS menyala. Tidak pernah berdampingan.

Di Windows ada jebakan tambahan: gateway dipasang sebagai **login item**, `Hermes_Gateway_avery.vbs` di folder Startup. Mematikan prosesnya saja tidak cukup — ia menyala lagi saat Chief login berikutnya. Berkas itu harus dipindahkan keluar dari folder Startup.

---

## 4. Urutan penempatan

### 4.1 Siapkan server

1. Sewa VPS KVM, pasang Ubuntu LTS.
2. Pasang Docker dan Docker Compose.
3. Buat pengguna non-root untuk menjalankan Hermes; catat `id -u` dan `id -g`.

### 4.2 Bangun citra

`deploy/Dockerfile` disimpan di repositori ini sebagai **acuan, bukan konteks build** — ia menyalin pohon sumber Hermes yang tidak ikut tersimpan di sini, sehingga `docker build` dari folder `deploy/` pasti gagal. Karena itu `build:` di compose sengaja dinonaktifkan.

Bangun citra `hermes-agent` dari checkout sumber Hermes di server, lalu compose memakai citra yang sudah jadi.

Dockerfile membangun SQLite 3.53.4 sendiri, sehingga bug WAL-reset yang menggigit versi Debian bawaan tidak ikut terbawa.

### 4.3 Siapkan profil

Di server, buat `~/.hermes/profiles/avery/` lalu isi:

1. `SOUL.md` dan `skills/` — dari repositori ini, `ai/profiles/avery/`.
2. `config.yaml` — salin dari `deploy/config.linux.example.yaml`, isi setiap `<...>`. Berkas itu sudah dibersihkan dari blok `mcp_servers`; isinya menunjuk Hermes Studio yang tidak ada di server, dan membiarkannya berarti gateway mencoba menjalankan berkas yang tidak ada setiap kali start.
3. `.env` — salin dari `deploy/.env.example`, isi kuncinya.

### 4.4 Pindahkan sesi WhatsApp

Ada dua jalan. Pilih satu.

**Menyalin sesi** — Avery langsung online, nomor tetap, tidak perlu QR.

1. Hentikan gateway di laptop dengan `scripts/restart-gateway.bat`, lalu matikan — jangan dinyalakan lagi.
2. Pindahkan `Hermes_Gateway_avery.vbs` keluar dari folder Startup Windows.
3. Pastikan tidak ada proses tersisa: port 3000 dan 8748 harus bebas.
4. Salin `platforms/whatsapp/session/` ke server, lalu `state.db`, `cron/`, `memories/`, `channel_aliases.json`.
5. Jalankan `docker compose up -d`.

**Pairing ulang** — lebih bersih, tetapi riwayat sesi hilang dan grup dikenali ulang. Jalankan gateway di server, pindai QR lewat SSH.

### 4.5 Nyalakan dan verifikasi

```bash
HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d
```

`restart: unless-stopped` di compose itulah yang memberi 24/7 — kontainer hidup lagi setelah reboot server maupun setelah crash.

Verifikasi berurutan, jangan melompat:

| Periksa | Yang diharapkan |
|---|---|
| `docker compose ps` | kedua layanan `running` |
| `docker compose logs gateway` | `✓ whatsapp connected` |
| `curl -s localhost:3000/health` | `{"status":"connected"}` |
| Kirim pesan di grup kerja | `inbound message` lalu `response ready` di log |

Selesai hanya bila pesan WhatsApp sungguhan mendapat balasan. Kontainer yang `running` bukan bukti Avery bekerja.

---

## 5. Antarmuka

Dashboard Python sudah ada di compose, port 9119, disetel `--host 127.0.0.1` sehingga hanya terjangkau lewat terowongan SSH:

```bash
ssh -L 9119:localhost:9119 <pengguna>@<server>
```

Jangan pernah membukanya dengan `--insecure --host 0.0.0.0` — ia menyimpan kunci API. Bila butuh akses jarak jauh, pasang reverse proxy ber-HTTPS dengan autentikasi di depannya.

Hermes Studio web UI adalah paket npm `hermes-web-ui`, `os: "any"`, butuh Node 23 ke atas — bisa ikut dijalankan di Linux bila diinginkan.

---

## 6. Operasi harian di Linux

| Kebutuhan | Perintah |
|---|---|
| Restart | `docker compose restart gateway` |
| Log berjalan | `docker compose logs -f gateway` |
| Grup belum terdaftar | `scripts/check-unregistered-groups.ps1` — **butuh PowerShell**; belum ada padanan `sh` |
| Sinkron profil ke repo | `scripts/sync-profile-to-repo.ps1` — sama, PowerShell |

> [!WARNING]
> **Gateway tidak melahirkan ulang bridge yang mati.** Bila bridge tumbang, Avery diam tanpa peringatan dan satu-satunya pemulihan adalah restart gateway. Di laptop Chief menyadarinya sendiri; di server bisa diam berjam-jam.
>
> `scripts/restart-gateway.sh` menangani urutan yang benar — hentikan gateway, bunuh bridge yatim, nyalakan lagi — tetapi **belum pernah dijalankan di Linux**. Uji sekali di server sebelum diandalkan.

---

## 7. Pemantauan

Belum ada. Ini lubang terbesar dari penempatan 24/7, dan harus ditutup sebelum Avery dianggap produksi.

Minimal yang dibutuhkan: pemeriksaan berkala terhadap `/health`, dan pemberitahuan ke Chief bila `disconnected` atau tidak menjawab. Cron Hermes bisa dipakai untuk ini — tetapi bila gateway itu sendiri yang mati, cron ikut mati. Karena itu pemantauan harus berada **di luar** kontainer: cron sistem di host, atau layanan pemantau eksternal.

---

## 8. Yang perlu diputuskan

**Nomor WhatsApp.** Bridge memakai Baileys, klien tidak resmi. WhatsApp berhak memblokir nomor yang memakainya, dan berpindah ke alamat pusat data menaikkan profil risiko itu. Yang meredam: Avery sudah memakai nomor terpisah, bukan nomor pribadi Chief — bila diblokir, yang hilang agennya.

Adapter `whatsapp_cloud` memakai API resmi Meta dan bebas risiko blokir, **tetapi tidak mendukung grup** — adapternya menolak pesan berbentuk grup secara eksplisit. Untuk Avery yang bekerja di grup, itu bukan pengganti. Cocoknya untuk DM resmi ke pasien atau klien, berdampingan dengan Baileys.

**Kunci penyedia.** Seluruh kunci ikut pindah ke server dan perlu penanganan lebih rapi daripada di laptop.

**Auth.** Begitu keluar dari loopback, gerbang auth aktif dan tidak bisa dimatikan. Siapkan kata sandi yang tersimpan aman sejak awal.

---

## 9. Perkiraan biaya bulanan

Dari pemakaian nyata 21–23 Agustus: 30,2 juta token, ~$2,58 — tetapi itu masa pembangunan dengan pemanggilan CLI yang intensif, bukan pola normal. Balasan WhatsApp sendiri tercatat 75 pesan, rata-rata 1,5 panggilan model per balasan.

| Komponen | Perkiraan |
|---|---|
| VPS KVM 2 vCPU / 8 GB | Rp 150.000 – 300.000 |
| Model — internal, lima grup | $3 – 8 |
| Model — ditambah grup komunitas aktif | $15 – 40 |
| WhatsApp via Baileys | gratis |

Pengali terbesar adalah **grup komunitas dengan `free_response_chats`** — setiap pesan siapa pun memanggil model. Dengan wajib sebut nama, hanya pesan yang ditujukan kepada Avery yang dihitung; selisihnya bisa sepuluh kali lipat.

Anggaran awal yang disarankan: **Rp 400.000/bulan**, dipantau lewat `hermes insights` selama dua minggu pertama lalu disesuaikan dengan pola nyata.
