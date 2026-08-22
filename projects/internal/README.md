# Internal

Folder domain. Mengelompokkan capsule sejenis; tidak menjalankan produk sendiri dan tidak memuat kode.

Perkakas internal dan demonstrator baseline yang dipakai tim sendiri, bukan pelanggan.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`control-center`](./control-center/README.md) | Pusat kendali operasional monorepo |
| [`golden-path`](./golden-path/README.md) | Demonstrator baseline: Next.js + Hono di satu unit penempatan |

## Susunan

Seluruh `projects/` memakai pola yang sama: `projects/<domain>/<capsule>/`. Tidak ada capsule yang berdiri sendiri di akar `projects/`.

Folder domain hanya memuat `AGENTS.md` dan `README.md`. Berkas capsule lengkap — `docs/`, `src/`, `tests/` — adalah milik capsule anak, dan itulah yang diperiksa `tools/safrs/check_topology.py`.

## Aturan domain

Kredensial lingkungan pengembangan tidak pernah masuk repositori.
