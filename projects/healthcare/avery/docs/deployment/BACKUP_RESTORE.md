# Backup & Restore — Avery

## Mengapa

Data Avery (state.db, jobs.json, sesi WhatsApp) hidup di satu volume tanpa
replikasi database eksternal. Backup adalah satu-satunya jaring pengaman
selain snapshot VPS (yang bukan pengganti, lihat di bawah).

## Apa

- Backup: `deploy/backup/backup.sh` — terenkripsi AES256 (gpg symmetric),
  alur stop-copy-start (konsistensi SQLite), exclude `cache`/`logs`/
  `lazy-packages`, retensi 14 hari, kunci di
  `/opt/avery/config/backup.key` (chmod 600).
- Restore: `deploy/backup/restore.sh`, dengan `--verify-only` untuk uji
  tanpa menimpa data.
- Arsip legacy plaintext yang sudah dienkripsi ulang:
  `backups/pre-update-20260824-194544.tar.gz.gpg` (kunci terpisah, dipegang
  Chief — bukan `backup.key` yang sama dengan backup rutin).

## Bagaimana

### Jadwal

- Cron harian 03:00 WIB menjalankan `backup.sh` (lihat `OPERATIONS.md`
  untuk entri crontab).
- Retensi 14 hari, arsip lama di luar retensi dihapus otomatis oleh
  `backup.sh`.

### Kunci

- `/opt/avery/config/backup.key`, chmod 600, dibuat sekali saat provisioning
  (`HOSTINGER_VPS.md` langkah 15).
- Salin kunci ke password manager Chief SEGERA setelah dibuat. Kehilangan
  kunci = seluruh arsip backup tidak bisa didekripsi.
- Kunci arsip legacy (`pre-update-20260824-194544.tar.gz.gpg`) TERPISAH,
  dipegang Chief secara manual di luar `/opt/avery/config`.

### Uji restore rutin (WAJIB, bukan opsional)

- **Bulanan**: `deploy/backup/restore.sh --verify-only` terhadap arsip
  terbaru — memverifikasi arsip bisa didekripsi dan diekstrak tanpa
  menyentuh data produksi.
- **Sebelum cutover** (dan setiap perubahan besar layout data): uji restore
  PENUH di host cadangan/terpisah (bukan VPS produksi), untuk memastikan
  seluruh alur restore -> deploy -> smoke test benar-benar berfungsi.

### Salinan off-host

Arsip backup saat ini hanya tersimpan di `/opt/avery/backups` pada VPS yang
sama dengan produksi — ini SATU titik kegagalan (disk VPS hilang = backup
ikut hilang). Salin arsip ke lokasi off-host secara berkala (mis. `scp` ke
mesin lain atau `rclone` ke object storage) — mekanisme dan jadwal pastinya
adalah keputusan Chief, belum diimplementasikan di v1 (placeholder).

### Snapshot Hostinger

Snapshot VPS dari panel Hostinger adalah lapisan tambahan (mis. untuk
migrasi cepat/gagal total OS), BUKAN pengganti backup terenkripsi rutin:
snapshot tidak dienkripsi dengan kunci terpisah Chief, tidak punya retensi
granular, dan menyatu dengan siklus hidup VPS (hilang bila VPS dihapus).

## Verifikasi

```bash
deploy/backup/backup.sh
deploy/backup/restore.sh /opt/avery/backups/<arsip-terbaru>.tar.gz.gpg --verify-only
ls -la /opt/avery/backups/ | tail
```

- Ukuran arsip terbaru masuk akal (tidak 0 byte).
- `restore.sh --verify-only` melaporkan sukses tanpa mengubah
  `/opt/avery/data`.

## Rollback

- Restore data adalah operasi berisiko: bisa menimpa data baru dengan data
  lama. Selalu backup data SAAT INI sebelum restore dari arsip lama
  (`backup.sh` lagi, atau salin manual `/opt/avery/data`).
- Jika restore penuh gagal di tengah jalan: hentikan, jangan hapus arsip
  sumber, eskalasi ke `DISASTER_RECOVERY.md`.
