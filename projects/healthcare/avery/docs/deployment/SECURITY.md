# Security — Avery di VPS

## Mengapa

Avery memegang sesi WhatsApp aktif (setara kunci akun) dan kredensial
provider model. Permukaan serang harus diminimalkan secara sadar, bukan
kebetulan.

## Apa

Model ancaman ringkas v1:

- Permukaan publik = **HANYA SSH (port 22)**, idealnya lewat Tailscale/
  WireGuard, bukan publik terbuka. TIDAK ADA HTTP publik (tanpa Caddy di
  v1 — lihat keputusan keamanan di misi).
- Jaringan Docker (`avery_internal`) privat, TANPA published port pada
  service `gateway`; `dashboard` hanya `127.0.0.1:9119` (loopback host),
  diakses lewat SSH tunnel.
- Rahasia (`avery.env`, `backup.key`) chmod 600, tidak pernah masuk git
  (lihat `.gitignore` kapsul), tidak pernah dicetak ke log.
- Sesi WhatsApp (`platforms/whatsapp/session`) diperlakukan sebagai secret
  setara kunci akun — dibackup terenkripsi, tidak pernah disalin ke lokasi
  tidak terenkripsi/tidak dijaga.
- Container berjalan non-root (UID 10000) dengan privilege-drop shim exec.

## Bagaimana

### Permukaan jaringan

- ufw: `default deny incoming`, hanya `allow 22/tcp` (atau tutup total bila
  SSH dialihkan sepenuhnya ke Tailscale).
- Tidak ada rule ufw untuk 80/443 di v1.
- Compose: service `gateway` tanpa `ports:`; `dashboard` hanya
  `127.0.0.1:9119:9119`, dan hanya aktif dengan `--profile dashboard`.

### Rahasia

- `/opt/avery/config/avery.env` — chmod 600, berisi `OPENROUTER_API_KEY`
  dan variabel WhatsApp. Rujuk `.gitignore` kapsul untuk memastikan file
  `.env` terisi tidak pernah ter-commit.
- `/opt/avery/config/backup.key` — chmod 600, dipakai gpg symmetric AES256
  untuk backup. Salinan di password manager Chief (lihat
  `BACKUP_RESTORE.md`).
- Skrip deploy/backup/watchdog TIDAK PERNAH mencetak isi env/kunci ke
  stdout atau log (audit: `grep -r 'avery.env\|backup.key' deploy/` hanya
  boleh muncul sebagai path, bukan isi).

### Sesi WhatsApp

- Diperlakukan sebagai secret: permission direktori dibatasi ke pemilik
  proses container, tidak pernah disalin ke luar arsip backup terenkripsi.
- Cutover satu arah wajib (lihat `HOSTINGER_VPS.md` §5) — sesi tidak boleh
  hidup di dua tempat, karena itu memicu risiko deteksi anomali WhatsApp
  dan potensi kebocoran kredensial sesi di dua lokasi berbeda.

### Container

- UID 10000 (non-root) dijalankan lewat privilege-drop shim exec di image
  overlay `avery-hermes:v2026.8.19-fix02` (dibangun dari `Dockerfile.avery`).
- `restart: unless-stopped`, `stop_grace_period: 60s` agar shutdown SQLite/
  bridge rapi, tidak menyebabkan korupsi state saat container dihentikan.

### Insiden kebocoran sesi

Bila sesi WhatsApp (`creds.json`/direktori session) diduga bocor (mis.
arsip backup tidak terenkripsi tersebar, atau akses tidak sah ke
`/opt/avery/data`):

1. Unpair nomor WhatsApp dari sisi WhatsApp (Linked Devices -> hapus Avery).
2. Rotasi API key model (`OPENROUTER_API_KEY`) — anggap juga berpotensi
   terekspos bila host yang sama diakses tanpa sah.
3. Rujuk `incident_runbook` SPDS repo untuk langkah eskalasi/pelaporan
   lengkap di luar cakupan dokumen ini.

## Verifikasi

```bash
ufw status verbose
docker compose -f deploy/docker-compose.prod.yml config | grep -A3 ports
stat -c '%a' /opt/avery/config/avery.env /opt/avery/config/backup.key
docker inspect --format '{{.Config.User}}' avery-gateway
```

- ufw hanya mengizinkan 22 (atau tertutup total jika full-Tailscale).
- Tidak ada `ports:` untuk `gateway` di output compose config; `dashboard`
  hanya `127.0.0.1:9119`.
- Permission `avery.env`/`backup.key` = 600.

## Rollback

- Bila hardening baru (mis. rule ufw) memutus akses operator: gunakan
  console VPS dari panel Hostinger (bukan SSH) untuk memperbaiki rule.
- Bila kebocoran sesi terjadi pasca-deploy: ikuti prosedur insiden di atas
  dahulu, baru evaluasi rollback image/data lewat `DISASTER_RECOVERY.md`.
