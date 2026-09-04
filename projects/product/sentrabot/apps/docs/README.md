# apps/docs — situs dokumentasi Mintlify

Situs dokumentasi publik SentraBot. Isinya **hanya** materi yang layak dibaca pengguna.

## Menjalankan lokal

```bash
cd apps/docs
npx mint dev          # http://localhost:3000
npx mint broken-links # cek tautan mati
```

Unduhan pertama `mint` cukup besar, jadi jalankan sekali di jaringan yang stabil.

## Menerbitkan

Belum tersambung. Untuk menerbitkan, Chief perlu:

1. Membuat akun di [mintlify.com](https://mintlify.com)
2. Memasang GitHub App Mintlify ke repositori ini
3. Mengarahkan *docs directory* ke `apps/docs`

Langkah 1–3 memerlukan kredensial dan pembuatan akun, jadi tidak dapat dilakukan agen.

## Struktur

| Berkas | Isi |
|---|---|
| `docs.json` | Konfigurasi, navigasi, warna brand (`#5B8CFF` aksen, `#0D1117` gelap) |
| `index.mdx` | Beranda |
| `mulai/paket.mdx` | Paket dan batas — diturunkan dari `docs/product/paket-free-batas-v1.md` |
| `mulai/pasang.mdx` | Pasang sendiri — dari `docs/self-host.md` |
| `menjalankan/*.mdx` | Computer runtime dan performa |
| `kebijakan/*.mdx` | Ringkasan Privasi & Ketentuan, menautkan ke versi resmi di situs utama |

## Yang sengaja TIDAK diterbitkan

Isi `docs/` berikut **tidak** dimasukkan karena bersifat internal. Jangan menambahkannya ke
`docs.json` tanpa pemeriksaan ulang:

| Berkas | Alasan |
|---|---|
| `docs/superpowers/plans/*` | Rencana implementasi |
| `docs/superpowers/specs/*` | Spesifikasi arsitektur |
| `docs/plans/*` | Spesifikasi MVP internal |
| `docs/2026-agent-best-practices-brief.md` | Brief internal |
| `docs/mobile-release.md` | Proses rilis internal |

`docs/product/paket-free-batas-v1.md` **tidak** disalin utuh — halaman `mulai/paket.mdx` hanya
mengambil bagian yang layak publik. Target COGS internal (Rp4.000/user/bulan), catatan pajak,
dan riwayat keputusan sengaja ditinggalkan.

## Menjaga tetap sinkron

`mulai/paket.mdx` dan `kebijakan/*.mdx` adalah turunan. Bila angka paket atau kebijakan berubah,
perbarui sumbernya lebih dulu — `docs/product/paket-free-batas-v1.md` dan
`apps/site/public/*.html` — lalu sesuaikan halaman di sini.
