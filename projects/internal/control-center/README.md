# Control Center

Pusat kendali repository untuk operator non-coding.

## Untuk apa ini

Aplikasi ini membaca repository Monorepo secara langsung dan menampilkan situasi
SAFRS secara visual: gerbang publikasi, control plane, kesiapan mesin, dan fitur
yang butuh perhatian — dengan status yang jujur, bukan ditulis tangan.

Setiap fitur mendaftarkan berkas yang membuktikan keberadaannya; aplikasi
memeriksa berkas itu setiap kali halaman dibuka. Fitur yang berkasnya hilang
otomatis berubah statusnya tanpa mengubah katalog.

## Menjalankan

```bash
pnpm --filter @sentra/control-center dev
```

Lalu buka <http://localhost:3100>.

Aplikasi ini sengaja dibuat agar tetap menyala meski Docker mati dan basis data
belum siap — justru keadaan seperti itulah yang perlu ditampilkan.

## Menunjuk ke checkout lain

Secara bawaan aplikasi mencari akar repository dari direktori tempat ia
dijalankan. Untuk mengarahkannya ke checkout atau worktree lain:

```bash
SENTRA_REPO_ROOT=D:/DEV/Monorepo pnpm --filter @sentra/control-center dev
```

## Batas kewenangan

- Membaca repository pada setiap permintaan (`force-dynamic`).
- Perintah dalam **allowlist** (`lib/exec/commands.ts`) dapat dijalankan dari
  papan: id saja yang menyeberang wire; argv tetap; mutasi membutuhkan frasa
  konfirmasi exact-match; setiap percobaan diaudit.
- Id di luar allowlist ditolak sebelum proses jalan.
- Operasi R3 tidak ada di allowlist — produksi tidak dapat dijangkau dari sini.
- Tidak membaca atau menampilkan rahasia (tidak membaca `.env` terisi).

## Dokumentasi terkait

- `docs/architecture.md` — bentuk teknis dan apa yang sudah dibangun
- `docs/design-brief.md` — aturan visual Sentraverse
- `docs/dashboard-integration.md` di akar monorepo — peta permukaan lanjutan
- `AGENTS.md` — aturan untuk agen yang mengubah kapsul ini
