# Product

Folder domain. Mengelompokkan capsule sejenis; tidak menjalankan produk sendiri dan tidak memuat kode.

Produk yang dirilis ke publik, lengkap dengan lisensi, changelog, dan kewajiban rilisnya.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`sentrabot`](./sentrabot/README.md) | Bot Sentra untuk rilis publik |

## Susunan

Seluruh `projects/` memakai pola yang sama: `projects/<domain>/<capsule>/`. Tidak ada capsule yang berdiri sendiri di akar `projects/`.

Folder domain hanya memuat `AGENTS.md` dan `README.md`. Berkas capsule lengkap — `docs/`, `src/`, `tests/` — adalah milik capsule anak, dan itulah yang diperiksa `tools/safrs/check_topology.py`.

## Aturan domain

Kunci penandatanganan rilis dan token registry tidak pernah masuk repositori.
