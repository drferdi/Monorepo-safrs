# Corporate

Folder domain. Mengelompokkan capsule sejenis; tidak menjalankan produk sendiri dan tidak memuat kode.

Properti korporat dan kehadiran publik Sentra.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`portfolio-drnovia`](./portfolio-drnovia/README.md) | Situs portofolio dr. Novia |

## Susunan

Seluruh `projects/` memakai pola yang sama: `projects/<domain>/<capsule>/`. Tidak ada capsule yang berdiri sendiri di akar `projects/`.

Folder domain hanya memuat `AGENTS.md` dan `README.md`. Berkas capsule lengkap — `docs/`, `src/`, `tests/` — adalah milik capsule anak, dan itulah yang diperiksa `tools/safrs/check_topology.py`.

## Aturan domain

Kredensial penerbitan dan analitik pihak ketiga tidak pernah masuk repositori.
