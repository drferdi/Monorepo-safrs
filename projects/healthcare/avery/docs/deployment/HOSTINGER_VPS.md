# Hostinger VPS — Provisioning & Cutover Avery

Untuk sizing VPS (vCPU/RAM/storage) dan alasan pemilihan Hostinger, rujuk
`docs/deploy-hostinger.md` (lama) — dokumen ini tidak mengulanginya, hanya
merujuk. Minimal: KVM Ubuntu 24.04, ≥2 vCPU / 8GB RAM.

## Mengapa

Runtime Avery saat ini di laptop Windows: satu titik kegagalan, tidak bisa
`unless-stopped`/reboot otomatis, dan menahan laptop tetap menyala. Migrasi
ke VPS memindahkan satu volume state (`HERMES_HOME` -> `/opt/avery/data`)
tanpa mengubah arsitektur Hermes.

## Apa

- VPS KVM Ubuntu 24.04, sizing lihat `docs/deploy-hostinger.md`.
- Hardening: SSH key-only, `PasswordAuthentication no`, `PermitRootLogin no`,
  user non-root + sudo, ufw default deny incoming, fail2ban sshd,
  unattended-upgrades, timezone Asia/Jakarta, NTP aktif.
- Docker Engine + compose plugin dari repo resmi Docker.
- Layout `/opt/avery/{app,data,config,backups,logs,state}`.
- Deploy via `deploy/scripts/deploy.sh`.

## Bagaimana

### 1. Provisioning & hardening dasar

1. Buat VPS KVM Ubuntu 24.04 di Hostinger (sizing: `docs/deploy-hostinger.md`).
2. Buat user non-root + sudo, salin SSH public key ke `~/.ssh/authorized_keys`.
3. Edit `/etc/ssh/sshd_config`: `PasswordAuthentication no`,
   `PermitRootLogin no`, lalu `systemctl restart ssh`.
4. `ufw default deny incoming`, `ufw default allow outgoing`,
   `ufw allow 22/tcp`, `ufw enable`. TANPA 80/443 — v1 tidak memakai Caddy
   dan tidak ada HTTP publik (lihat `SECURITY.md`).
5. Opsi lebih kuat: pasang Tailscale/WireGuard untuk akses SSH, lalu tutup
   port 22 publik di ufw dan hanya izinkan lewat interface VPN.
6. Install `fail2ban`, aktifkan jail `sshd`.
7. Install `unattended-upgrades`, aktifkan pembaruan keamanan otomatis.
8. `timedatectl set-timezone Asia/Jakarta`; pastikan NTP sinkron
   (`timedatectl` menunjukkan `System clock synchronized: yes`).

### 2. Docker

9. Install Docker Engine + compose plugin dari repo resmi Docker
   (`docs.docker.com/engine/install/ubuntu/`), bukan paket `docker.io` distro.
10. (Opsional) Tambahkan `/etc/docker/daemon.json` dengan default
    `log-driver: json-file` + `max-size`/`max-file` setara compose (per-service
    logging sudah diset di `deploy/docker-compose.prod.yml`; daemon.json hanya
    jaring pengaman untuk container di luar compose ini).
11. Tambahkan user non-root ke grup `docker` agar tidak perlu `sudo` tiap
    perintah docker (opsional, evaluasi risiko).

### 3. Layout & kapsul

12. `sudo mkdir -p /opt/avery/{app,data,config,backups,logs,state}` lalu
    `chown` ke user operator.
13. `git clone <url-kapsul> /opt/avery/app` (clone monorepo atau kapsul
    avery, sesuai kebijakan Chief).
14. `cp /opt/avery/app/projects/healthcare/avery/deploy/.env.example
    /opt/avery/config/avery.env` lalu isi nilai (API key, allowlist WA, dll)
    dan `chmod 600 /opt/avery/config/avery.env`.
15. Buat `backup.key`: `gpg --armor --gen-random 1 32 > /opt/avery/config/backup.key
    && chmod 600 /opt/avery/config/backup.key` (`--armor` menghasilkan teks
    base64 satu baris, aman disalin ke password manager). Simpan salinan di
    password manager Chief (lihat `BACKUP_RESTORE.md`).

### 4. Build image awal (BELUM deploy penuh)

16. Validasi + build image overlay saja — JANGAN jalankan `deploy.sh` penuh
    di tahap ini: data belum ditransfer, sesi WhatsApp belum ada, sehingga
    health check tidak akan pernah `"connected"` dan deploy pasti timeout.

    ```
    cd /opt/avery/app/projects/healthcare/avery
    docker compose -f deploy/docker-compose.prod.yml config --quiet
    docker build -f deploy/Dockerfile.avery -t avery-hermes:v2026.8.19-fix02 .
    ```

    Build harus berakhir dengan `Patch applied and verified ...`; kegagalan
    `BOOT FAIL: sha256 mismatch` berarti pin image dan manifest patch tidak
    sinkron — berhenti dan periksa sebelum lanjut. `deploy.sh` penuh baru
    dijalankan pada langkah cutover 6 di bawah, SETELAH data berada di VPS.

### 5. PROSEDUR CUTOVER WHATSAPP — SATU ARAH (WAJIB, tidak boleh dua sesi hidup bersamaan)

Sesi WhatsApp (`platforms/whatsapp/session`) hanya boleh hidup di SATU
tempat. Urutan ini wajib diikuti persis, tidak boleh dibalik:

1. Backup penuh `HERMES_HOME` di laptop Windows (arsip terenkripsi manual
   atau via `backup.sh` bila sudah bisa dijalankan lokal).
2. **Matikan gateway laptop secara permanen**: hentikan proses Hermes yang
   berjalan, lalu hapus `Hermes_Gateway_avery.vbs` dari folder Startup
   Windows (`shell:startup`) agar tidak menyala lagi setelah reboot laptop.
3. Verifikasi tidak ada proses Hermes/gateway Avery lagi berjalan di laptop.
4. Transfer `HERMES_HOME` ke VPS lewat `tar` + `scp` (bukan rsync live
   sambil salah satu sisi masih jalan), **dengan meng-exclude direktori
   khusus-Windows dan disposable** — binari Windows (PE) akan gagal exec di
   Linux bila ikut terbawa (adapter memakai `find_node_executable` dan bisa
   menemukan node bundelan Windows di dalam home):

   ```
   tar -czf avery-home.tar.gz -C <HERMES_HOME> \
     --exclude='./node' --exclude='./bin' --exclude='./gateway-service' \
     --exclude='./lsp' --exclude='./cache' .
   ```

   **JANGAN pernah menjalankan dua sesi WhatsApp bersamaan** — `creds.json`
   yang dipakai di dua tempat akan membuat WhatsApp mencurigai akun dan bisa
   memicu logout paksa.
5. Ekstrak arsip ke `/opt/avery/data` di VPS, pastikan permission wajar.
6. **Adaptasi konfigurasi ke Linux** (config Windows tidak boleh dipakai
   apa adanya):
   - Ganti `/opt/avery/data/profiles/avery/config.yaml` dengan salinan dari
     `deploy/config.linux.example.yaml` yang diisi ulang nilai asli
     (JID grup, LID chief, dll dari config Windows) — config Windows berisi
     path `node.exe` dan MCP server Hermes Studio desktop yang tidak ada
     di VPS.
   - Rekonsiliasi env: nilai rahasia yang tadinya di `.env` dalam home
     (`HERMES_HOME/.env` dan `profiles/avery/.env`) harus tercermin di
     `/opt/avery/config/avery.env` (sumber env produksi via compose);
     pastikan `WHATSAPP_DM_POLICY=pairing` tetap persis — nilai lain membuat
     bridge membuang pesan grup.
7. Jalankan `deploy/scripts/deploy.sh` di VPS (validasi compose, backup,
   build, `compose up -d`, tunggu healthy, smoke test otomatis).
8. Pasang cron watchdog (`deploy/scripts/watchdog.sh` tiap 2 menit) dan cron
   backup harian (lihat `OPERATIONS.md`).
9. Jalankan `deploy/scripts/smoke-test.sh` penuh (otomatis + checklist
   manual §16 misi) — semua butir harus lulus sebelum dianggap selesai.
10. Uji reboot VPS (`sudo reboot`), tunggu online, verifikasi container pulih
    otomatis dan smoke test otomatis lulus kembali.

## Verifikasi

- `ufw status verbose` -> hanya 22 (atau tertutup bila pakai Tailscale) yang
  allow, default deny incoming.
- `docker compose -f deploy/docker-compose.prod.yml config --quiet` lulus.
- `deploy/scripts/smoke-test.sh` lulus penuh (otomatis + checklist manual).
- `systemctl status fail2ban` aktif; `timedatectl` menunjukkan zona Asia/Jakarta.

## Rollback

- Gagal deploy awal: `deploy/scripts/rollback.sh` mengembalikan image
  sebelumnya (bila ada), TIDAK me-restore data.
- Gagal total provisioning: hapus VPS, ulangi dari langkah 1 — data belum
  ada di VPS pada tahap ini sehingga tidak ada risiko kehilangan data.
- Setelah cutover selesai (sesi WA sudah di VPS): JANGAN nyalakan kembali
  gateway laptop sebagai "rollback" — itu akan menciptakan dua sesi WA
  hidup bersamaan. Jika VPS bermasalah pasca-cutover, ikuti
  `DISASTER_RECOVERY.md`.
