# Backup & Restore — mantra.localhost

Prasyarat gate Tahap 2 (transaksi finansial nyata): backup penuh + salinan
off-machine SEBELUM flip doc_status workflow. Backup berisi data pegawai/
klinis — perlakukan sebagai rahasia; jangan kirim lewat kanal publik.

## Membuat backup (dalam dev container, dari bench root)

```bash
bench --site mantra.localhost backup --with-files
```

Artefak di `sites/mantra.localhost/private/backups/` (ter-mount ke host
`sites\...`):

- `*-database.sql.gz` — dump MariaDB
- `*-files.tar` / `*-private-files.tar` — file publik/privat
- `*-site_config_backup.json` — berisi KREDENSIAL DB; jangan dibuka/di-log,
  simpan terenkripsi

## Salinan off-machine (tindakan manual Chief)

Salin KEEMPAT file set backup terbaru ke media di luar mesin dev (drive
eksternal / cloud storage pribadi terenkripsi). Minimal sebelum gate Tahap 2,
selanjutnya rutin (usulan: mingguan, dan setiap sebelum perubahan besar).
Catat tanggal salinan di bagian Log di bawah.

## Restore (bila diperlukan)

```bash
bench --site mantra.localhost restore \
    sites/mantra.localhost/private/backups/<stamp>-mantra_localhost-database.sql.gz \
    --with-public-files sites/.../<stamp>-mantra_localhost-files.tar \
    --with-private-files sites/.../<stamp>-mantra_localhost-private-files.tar
bench --site mantra.localhost migrate
```

Uji restore setidaknya sekali di site percobaan sebelum mengandalkannya.

## Log backup

| Tanggal | Artefak (stamp) | Off-machine? |
|---|---|---|
| 2026-07-17 | 20260717_054143 | BELUM — menunggu Chief |
