# Operasi Harian — Avery di VPS

## Mengapa

Avery berjalan tanpa operator hadir 24/7; operasi harian harus bisa
dilakukan cepat dan aman lewat SSH tanpa membuka HTTP publik.

## Apa

- `deploy/scripts/status.sh` — surface status operator (runtime, WA,
  scheduler, state, disk, backup, versi, uptime).
- `docker logs` untuk melihat log gateway.
- Restart aman lewat `docker restart` (bukan `stop` lalu lupa `start`).
- `deploy/scripts/watchdog.sh` via cron tiap 2 menit, dengan mekanisme
  pause saat maintenance.
- Dashboard opsional lewat SSH tunnel (loopback-only, profile `dashboard`).
- Cron entries di host: watchdog, backup harian, status opsional.
- Update image: ubah pin versi, jalankan `deploy.sh` lagi.

## Bagaimana

### Cek status

```bash
/opt/avery/app/.../deploy/scripts/status.sh
```

### Lihat log

```bash
docker logs -f --tail 200 avery-gateway
tail -f /opt/avery/logs/deploy.log
tail -f /opt/avery/logs/watchdog.log
tail -f /opt/avery/logs/backup.log
```

### Restart aman

```bash
docker restart avery-gateway
```

Gunakan `docker restart`, JANGAN pola `docker stop` tanpa `docker start`
segera setelahnya — meninggalkan container mati berarti bridge WhatsApp
yatim (tidak ada proses mendengarkan), pesan masuk hilang tanpa jejak.
Setelah restart, jalankan `deploy/scripts/smoke-test.sh --auto-only` untuk
memastikan sesi/health pulih.

### Watchdog

- Terpasang via cron host, tiap 2 menit, cooldown restart 10 menit.
- Untuk menjeda saat maintenance atau saat proses pairing ulang WhatsApp
  (supaya watchdog tidak restart container di tengah proses pairing):

```bash
touch /opt/avery/state/watchdog.pause
# ... lakukan maintenance/pairing ...
rm /opt/avery/state/watchdog.pause
```

### Dashboard (opsional, via SSH tunnel)

```bash
docker compose -f deploy/docker-compose.prod.yml --profile dashboard up -d dashboard
ssh -L 9119:127.0.0.1:9119 <user>@<vps-host>
# buka http://127.0.0.1:9119 di browser lokal
```

Jangan pernah publish port dashboard tanpa prefiks `127.0.0.1:` di compose —
dashboard menyimpan API key dan tidak punya autentikasi sendiri.

### Cron entries di host (contoh crontab operator)

```
*/2 * * * * /opt/avery/app/.../deploy/scripts/watchdog.sh >> /opt/avery/logs/watchdog.cron.log 2>&1
0 3 * * * /opt/avery/app/.../deploy/backup/backup.sh >> /opt/avery/logs/backup.cron.log 2>&1
# opsional: status ringkas harian
0 8 * * * /opt/avery/app/.../deploy/scripts/status.sh >> /opt/avery/logs/status.cron.log 2>&1
```

Backup harian dijadwalkan 03:00 WIB (jam sepi trafik).

### Lokasi log & rotasi

- Log container: `docker logs` (driver `json-file`, max 10m x 5 file per
  service, sudah diset di `docker-compose.prod.yml`).
- Log skrip: `/opt/avery/logs/{deploy,watchdog,backup}.log` — belum
  dirotasi otomatis; tambahkan `logrotate` bila ukurannya jadi masalah
  (di luar cakupan v1, catat sebagai item lanjutan).

### Update image

1. Ubah pin image (`HERMES_IMAGE`/`AVERY_IMAGE_TAG` atau Dockerfile.avery)
   di `deploy/`.
2. `git pull` di `/opt/avery/app`.
3. Jalankan `deploy/scripts/deploy.sh` — otomatis mencatat image lama ke
   `/opt/avery/state/previous_image` sebelum ganti, sehingga
   `rollback.sh` tersedia bila update bermasalah.

## Verifikasi

- `status.sh` menunjukkan semua bagian sehat.
- `docker inspect --format '{{.State.Health.Status}}' avery-gateway` ->
  `healthy`.
- Cron watchdog & backup terdaftar: `crontab -l`.

## Rollback

- Update image bermasalah: `deploy/scripts/rollback.sh` (image saja, bukan
  data — lihat `BACKUP_RESTORE.md` untuk restore data).
- Restart tidak memulihkan: cek `docker logs`, lalu `deploy.sh` ulang atau
  eskalasi ke `DISASTER_RECOVERY.md`.
