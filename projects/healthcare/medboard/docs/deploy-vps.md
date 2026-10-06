# Deploy MedBoard ke VPS (pengganti Railway)

Berlaku untuk VPS Ubuntu 24.04 mana pun (IDCloudHost, DomaiNesia, Biznet Gio, Hetzner).
Spesifikasi minimal: 2 vCPU, 4 GB RAM, 40 GB disk. Chromium (PDF laporan, robot ePuskesmas,
ekspor LB1) butuh RAM, maka 2 GB swap ditambahkan.

Perintah `ssh`/server memakai bash; perintah di PC Chief memakai PowerShell. Nilai secret tidak
pernah ditulis di sini; hanya nama variabelnya.

## Susunan di server

| Path | Isi |
| --- | --- |
| `/opt/medboard/app` | Kode; diganti setiap deploy (versi sebelumnya disimpan di `app.old`) |
| `/var/lib/medboard/runtime` | Semua data `runtime/` (bridge-queue, pendaftaran, profil crew, riwayat EMR, PDF laporan). `app/runtime` adalah symlink ke sini, jadi data bertahan saat deploy. Di Railway hanya `bridge-queue` yang bertahan. |
| `/opt/medboard/browsers` | Chromium untuk Playwright (`PLAYWRIGHT_BROWSERS_PATH`) |
| `/etc/medboard/medboard.env` | Environment variables (dibaca systemd dan saat build) |
| `/var/backups/medboard` | Backup harian database dan `runtime/` |

Alur: internet → Caddy (:443, HTTPS otomatis, WebSocket ikut diteruskan) → `127.0.0.1:3000`
(`server.ts`, Next.js + Socket.IO) → PostgreSQL lokal.

## 1. Siapkan server (sekali, sebagai root)

Penyedia seperti Biznet Gio membuat user biasa dengan sudo (misalnya `gaffer`); masuk dengan
`ssh gaffer@IP_VPS`, lalu `sudo -i` untuk menjadi root.

```bash
apt update && apt -y upgrade
apt -y install postgresql caddy ufw curl
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt -y install nodejs
corepack enable   # pnpm 11.21.0 diambil dari packageManager di package.json

adduser --system --group --home /opt/medboard medboard
mkdir -p /opt/medboard/app /opt/medboard/browsers /var/lib/medboard/runtime /etc/medboard /var/backups/medboard
chown -R medboard:medboard /opt/medboard /var/lib/medboard
chown root:postgres /var/backups/medboard && chmod 770 /var/backups/medboard
install -m 640 -o root -g medboard /dev/null /etc/medboard/medboard.env

sudo -u postgres createuser medboard
sudo -u postgres createdb -O medboard medboard
# Tanpa password: user Linux medboard masuk ke database medboard lewat socket lokal (peer auth).
```

### Environment (`/etc/medboard/medboard.env`)

Isi minimal yang dipakai di server Biznet Gio (2026-10-06). `CREW_ACCESS_REGISTRATION_REQUESTS_FILE`
dan `CREW_ACCESS_PROFILE_FILE` tidak perlu: default-nya di `runtime/`, yang bertahan di VPS.

```
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
TRUST_PROXY_HEADERS=true
DATABASE_URL=postgresql://medboard@localhost/medboard?host=/var/run/postgresql
NEXT_PUBLIC_BASE_URL=https://medboard.sentrahai.com
PLAYWRIGHT_BROWSERS_PATH=/opt/medboard/browsers
```

Dua secret dibuat acak langsung di server, tanpa pernah ditampilkan:

```bash
echo "CREW_ACCESS_SECRET=$(openssl rand -hex 32)" >> /etc/medboard/medboard.env
echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> /etc/medboard/medboard.env
```

Akun crew disimpan di database (tabel `User`), bukan di `CREW_ACCESS_USERS_JSON`. Variabel
opsional lain (LiveKit, Resend, Sentry, dan sebagainya) ada di `docs/DEPLOYMENT.md`.
`TRUST_PROXY_HEADERS=true` wajib: tanpa Railway, kode tidak lagi menebak bahwa ia di belakang proxy.

### Service (`/etc/systemd/system/medboard.service`)

```ini
[Unit]
Description=MedBoard
After=network.target postgresql.service

[Service]
User=medboard
WorkingDirectory=/opt/medboard/app
EnvironmentFile=/etc/medboard/medboard.env
ExecStartPre=/usr/bin/pnpm exec prisma migrate deploy
ExecStart=/usr/bin/pnpm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`prisma migrate deploy` saat start sama dengan `startCommand` di Railway.

### Caddy (`/etc/caddy/Caddyfile`)

```
medboard.sentrahai.com {
	reverse_proxy 127.0.0.1:3000
}
```

Domain lama `crew.puskesmasbalowerti.com` tidak dipakai lagi (Chief, 2026-10-05). Domain lain
untuk MedBoard, kalau ada, ditambahkan di baris pertama, dipisah koma. Lalu `systemctl reload caddy && systemctl enable medboard`.

## 2. Deploy (setiap rilis)

Di PC Chief (PowerShell), kemas kode dari commit yang sudah di-commit:

```powershell
git -C D:\DEV\monorepo archive --format=tar.gz -o $env:TEMP\medboard.tar.gz HEAD:projects/healthcare/medboard; scp $env:TEMP\medboard.tar.gz root@IP_VPS:/tmp/
```

Di server (root):

```bash
set -euo pipefail
cd /opt/medboard && rm -rf app.new && mkdir app.new && tar -xzf /tmp/medboard.tar.gz -C app.new
cp -rn app.new/runtime/. /var/lib/medboard/runtime/
chown -R medboard:medboard app.new /var/lib/medboard/runtime
cd app.new
# Tanpa NODE_ENV=production, supaya devDependencies untuk build ikut terpasang.
sudo -u medboard env -u NODE_ENV HOME=/opt/medboard COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile
PLAYWRIGHT_BROWSERS_PATH=/opt/medboard/browsers ./node_modules/.bin/playwright install-deps chromium
sudo -u medboard env HOME=/opt/medboard PLAYWRIGHT_BROWSERS_PATH=/opt/medboard/browsers ./node_modules/.bin/playwright install chromium
# Build dengan runtime/ sebagai folder biasa: Turbopack menolak symlink yang keluar dari proyek,
# dan cache .next dari build yang gagal menyimpan path lama, jadi .next dihapus dulu.
rm -rf .next
sudo -u medboard bash -c 'set -a; . /etc/medboard/medboard.env; set +a; export HOME=/opt/medboard; pnpm run build'
rm -rf runtime && ln -s /var/lib/medboard/runtime runtime && chown -h medboard:medboard runtime
cd /opt/medboard && rm -rf app.old && { [ -d app ] && mv app app.old || true; } && mv app.new app
systemctl restart medboard && sleep 15 && curl -fsS http://127.0.0.1:3000/api/health
```

Build dijalankan dengan env dimuat karena `NEXT_PUBLIC_*` dibakukan saat build.

### Akun admin pertama

MedBoard berhenti saat start kalau belum ada user aktif. Akun `sentraone` dibuat dengan
`prisma/seed.ts`; password diketik Chief sendiri. Di server dipasang `/usr/local/bin/medboard-seed-admin`
(membaca password tanpa ditampilkan, mengirimnya lewat stdin ke `pnpm seed`, lalu restart service).
Dari PowerShell:

```powershell
ssh -t gaffer@IP_VPS sudo medboard-seed-admin
```

Rollback: `cd /opt/medboard && mv app app.bad && mv app.old app && systemctl restart medboard`.
Rollback kode tidak membatalkan migrasi database.

Log: `journalctl -u medboard -f`.

## 3. Pindah dari Railway (sekali, oleh Chief)

1. Turunkan TTL DNS `medboard.sentrahai.com` (misalnya 300 detik) sehari sebelumnya.
2. Tunggu bridge-queue kosong (tidak ada entri pending), lalu hentikan layanan Railway sebentar.
3. Pindahkan database (`pg_dump` versi klien ≥ versi server Railway):
   `pg_dump -Fc "<DATABASE_URL publik Railway>" -f medboard.dump`, salin ke server, lalu
   `sudo -u postgres pg_restore --no-owner --role=medboard -d medboard medboard.dump`.
4. Berkas pendaftaran dan profil crew di Railway ada di luar volume. Kalau masih ada dan
   dibutuhkan, salin `runtime/crew-access-*.json` ke `/var/lib/medboard/runtime/`.
5. `medboard.sentrahai.com` sekarang mengarah ke Vercel (tanpa deployment). Lepas domain itu
   dari project Vercel, lalu ganti record-nya menjadi A record ke IP VPS. Caddy mengambil sertifikat sendiri
   begitu DNS mengarah.
6. Cek `https://medboard.sentrahai.com/api/health`, login dari Asisten Medis, lalu lihat ACARS.
7. Matikan Railway setelah satu sampai dua hari stabil.

## 4. Backup harian (`/etc/cron.d/medboard-backup`)

```
30 2 * * * postgres pg_dump -Fc medboard > /var/backups/medboard/db-$(date +\%F).dump
45 2 * * * root tar -czf /var/backups/medboard/runtime-$(date +\%F).tar.gz -C /var/lib/medboard runtime
0 3 * * * root find /var/backups/medboard -type f -mtime +14 -delete
```

Backup ini masih di mesin yang sama. Aktifkan juga snapshot atau backup dari penyedia VPS, atau
unduh backup secara berkala ke tempat lain.
