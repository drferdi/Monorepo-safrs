# Disaster Recovery — Avery

## Mengapa

Runtime berpindah dari laptop ke satu VPS tanpa redundansi infrastruktur;
harus ada prosedur pulih yang jelas untuk setiap moda kegagalan realistis,
bukan improvisasi saat insiden.

## Apa

Empat skenario dicakup: VPS mati total, data korup, sesi WhatsApp invalid,
image container rusak. Semua prosedur pulih bertumpu pada
`deploy/backup/restore.sh` + `deploy/scripts/deploy.sh`, dan bila perlu
re-pair WhatsApp.

RPO/RTO realistis:

- **RPO** (Recovery Point Objective): ≤ 24 jam — sebesar umur backup harian
  terakhir (cron 03:00 WIB). Data sejak backup terakhir hingga insiden bisa
  hilang.
- **RTO** (Recovery Time Objective): perkiraan 1-3 jam untuk rebuild host
  baru dari nol (provisioning + hardening manual adalah bagian terlama);
  restore dari backup di VPS yang sudah ada jauh lebih cepat (menit).
- Git kapsul (kode) **BUKAN** backup sesi/nomor WhatsApp/state — hanya
  kode aplikasi. Kehilangan `/opt/avery/data` tanpa backup berarti
  kehilangan sesi WhatsApp dan harus pairing ulang dari nol.

## Bagaimana

### Skenario 1: VPS mati total (hardware/provider gagal)

1. Provision VPS baru (ikuti `HOSTINGER_VPS.md` bagian 1-3, tanpa langkah
   cutover WhatsApp — itu hanya untuk migrasi awal dari laptop).
2. Salin arsip backup terbaru dari lokasi off-host (lihat
   `BACKUP_RESTORE.md`) ke `/opt/avery/backups` di VPS baru.
3. `deploy/backup/restore.sh` (restore penuh, bukan `--verify-only`) ke
   `/opt/avery/data`.
4. `deploy/scripts/deploy.sh`.
5. `deploy/scripts/smoke-test.sh` penuh. Sesi WhatsApp seharusnya tetap
   valid bila backup cukup baru (WhatsApp bisa menolak sesi yang terlalu
   lama offline — bila begitu, lanjut ke Skenario 3).

### Skenario 2: Data korup (state.db/jobs.json rusak, container crash loop)

1. Stop container: `docker stop avery-gateway`.
2. Backup kondisi korup saat ini untuk investigasi (jangan timpa langsung):
   `cp -r /opt/avery/data /opt/avery/data.corrupt-$(date +%Y%m%d)`.
3. `deploy/backup/restore.sh` dari arsip backup terakhir yang sehat (cek
   dengan `--verify-only` dulu bila ragu arsip mana yang baik).
4. `docker start avery-gateway` atau `deploy/scripts/deploy.sh`.
5. `deploy/scripts/smoke-test.sh` penuh untuk konfirmasi.

### Skenario 3: Sesi WhatsApp invalid (logged out/banned/kadaluarsa)

1. Konfirmasi via log bridge (`docker logs avery-gateway` /
   `platforms/whatsapp/bridge.log`) bahwa penyebabnya memang sesi invalid,
   bukan masalah jaringan/container.
2. Hapus direktori sesi lama: `/opt/avery/data/profiles/avery/platforms/whatsapp/session`
   (backup dulu untuk investigasi bila perlu).
3. Restart container, ikuti alur pairing ulang WhatsApp Avery dari awal
   (scan QR/kode pairing sesuai dokumentasi Hermes gateway).
4. Verifikasi `WHATSAPP_DM_POLICY=pairing` masih benar di `avery.env` —
   nilai lain membuat bridge membuang pesan grup secara senyap.
5. `deploy/scripts/smoke-test.sh` penuh, termasuk checklist manual (kirim
   pesan WA, cek balasan, dst).

### Skenario 4: Image container rusak (build gagal/corrupt/CVE kritis)

1. `deploy/scripts/rollback.sh` bila ada `previous_image` yang diketahui
   sehat — ini cepat dan TIDAK menyentuh data.
2. Bila tidak ada image sebelumnya yang sehat: perbaiki `Dockerfile.avery`/
   pin base image, `deploy/scripts/deploy.sh` untuk build ulang dari nol.
3. `deploy/scripts/smoke-test.sh` untuk konfirmasi sebelum menutup insiden.

### Rebuild host baru dari nol (ringkasan urutan, rujuk dokumen detail)

1. Provision VPS baru — `HOSTINGER_VPS.md` §1 (hardening).
2. Install Docker — `HOSTINGER_VPS.md` §2.
3. Clone kapsul (`git clone`), buat layout `/opt/avery/*` —
   `HOSTINGER_VPS.md` §3.
4. Restore data dari backup terenkripsi — `BACKUP_RESTORE.md`.
5. Deploy — `deploy/scripts/deploy.sh`.
6. Verifikasi penuh — `deploy/scripts/smoke-test.sh` (otomatis + checklist
   manual §16 misi), termasuk uji reboot VPS.

## Verifikasi

- Setiap skenario ditutup dengan `deploy/scripts/smoke-test.sh` lulus
  penuh (otomatis + manual) sebelum insiden dianggap selesai.
- Catat waktu mulai/selesai insiden untuk mengukur RTO aktual vs target.

## Rollback

- Rollback dari prosedur DR ini sendiri berarti: jika pemulihan gagal di
  tengah jalan, JANGAN hapus arsip backup sumber atau `data.corrupt-*`
  sampai insiden benar-benar tertutup — itu satu-satunya jejak untuk
  investigasi ulang atau percobaan pemulihan berikutnya.
