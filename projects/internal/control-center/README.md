# Control Center

Pusat kendali repository untuk operator non-coding.

## Untuk apa ini

Aplikasi ini membaca repository Monorepo secara langsung dan menampilkan seluruh kemampuan yang
dimilikinya, lengkap dengan status yang jujur: mana yang benar-benar terhubung, mana yang butuh
konfigurasi, mana yang masih menunggu keputusan Anda, dan mana yang bermasalah.

Yang membedakannya dari papan status biasa: **tidak ada status yang ditulis tangan.** Setiap fitur
mendaftarkan berkas yang membuktikan keberadaannya, lalu aplikasi memeriksa berkas itu setiap kali
halaman dibuka. Fitur yang berkasnya hilang otomatis berubah statusnya tanpa ada yang perlu
mengubah katalog.

## Menjalankan

```bash
pnpm --filter @sentra/control-center dev
```

Lalu buka <http://localhost:3100>.

Aplikasi ini sengaja dibuat agar tetap menyala meski Docker mati dan basis data belum siap —
justru keadaan seperti itulah yang perlu ditampilkan.

## Menunjuk ke checkout lain

Secara bawaan aplikasi mencari akar repository dari direktori tempat ia dijalankan. Untuk
mengarahkannya ke checkout atau worktree lain:

```bash
SENTRA_REPO_ROOT=D:/DEV/Monorepo pnpm --filter @sentra/control-center dev
```

## Batas kewenangan

- Hanya membaca. Perintah yang mengubah mesin belum tersedia dari sini.
- Tidak pernah menyentuh produksi. Operasi R3 tidak dapat dijalankan dari halaman ini.
- Tidak membaca atau menampilkan rahasia apa pun.

## Dokumentasi terkait

- `docs/feature-inventory.md` — daftar lengkap fitur repository
- `docs/dashboard-integration.md` — bagaimana penyambungannya bekerja
- `AGENTS.md` — aturan untuk agen yang mengubah kapsul ini
