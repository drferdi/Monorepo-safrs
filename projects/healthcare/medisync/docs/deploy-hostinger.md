# Penempatan di Hostinger

## Jenis layanan

Harus **VPS KVM**. Shared hosting tidak bisa dipakai: Hermes butuh proses yang hidup terus, bind port sendiri, dan penyimpanan persisten — tidak satu pun tersedia di sana.

Ukuran yang masuk akal: 2 vCPU / 8 GB ke atas. Gateway, web UI, dan Chromium untuk agent-browser berjalan berdampingan; 1 vCPU / 4 GB akan sesak.

## Bahan yang sudah tersedia

`deploy/docker-compose.yml` berasal dari runtime Hermes dan mendefinisikan dua layanan:

```yaml
gateway:
  image: hermes-agent
  volumes: [ ~/.hermes:/opt/data ]
  command: ["gateway", "run"]

dashboard:
  image: hermes-agent
  volumes: [ ~/.hermes:/opt/data ]
  command: ["dashboard", "--host", "127.0.0.1", "--no-open"]
```

Keduanya memakai `network_mode: host` dan memasang `~/.hermes` sebagai volume. `deploy/Dockerfile` membangun SQLite 3.53.4 sendiri sehingga bug WAL-reset tidak ikut terbawa.

## Urutan penempatan

1. Bangun citra `hermes-agent` dari checkout sumber Hermes di server.
   `deploy/Dockerfile` disimpan di sini sebagai acuan, bukan konteks build:
   ia menyalin pohon sumber Hermes yang tidak ikut disimpan di repositori,
   sehingga `docker build` dari folder `deploy/` akan gagal. Karena itu
   `build:` di compose sengaja dinonaktifkan.
2. Siapkan `~/.hermes/ai/profiles/avery/` di server: salin `SOUL.md`, `skills/`, `config.yaml` hasil penyesuaian, dan `.env` hasil pengisian.
3. Jalankan `docker compose up -d`.
4. Pasangkan WhatsApp dengan pemindaian QR sekali dari server.
5. Pasang reverse proxy dengan HTTPS di depan antarmuka; jangan buka portnya mentah-mentah.

## Pilihan antarmuka

Dashboard Python sudah ada di compose, port 9119, dan disetel `--host 127.0.0.1` sehingga hanya dapat dijangkau lewat terowongan SSH atau reverse proxy.

Hermes Studio web UI — yang dipakai sehari-hari — adalah paket npm `hermes-web-ui`, `os: "any"`, butuh Node 23 ke atas. Jadi bisa ikut dijalankan di Linux, tidak terbatas di desktop.

## Yang perlu diputuskan lebih dulu

**Nomor WhatsApp.** Bridge memakai Baileys, klien tidak resmi. WhatsApp berhak memblokir nomor yang memakainya, dan berpindah ke alamat pusat data menaikkan profil risiko itu. Bila nomornya dipakai untuk urusan bisnis, pertimbangkan nomor terpisah atau adapter `whatsapp_cloud` yang memakai API resmi.

**Kunci penyedia.** Seluruh kunci ikut pindah ke server dan perlu penanganan yang lebih rapi daripada di laptop.

**Auth.** Begitu keluar dari loopback, gerbang auth aktif dan tidak bisa dimatikan. Siapkan kata sandi yang tersimpan aman sejak awal.
