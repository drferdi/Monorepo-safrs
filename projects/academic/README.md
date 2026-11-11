# Academic

Folder domain. Mengelompokkan capsule sejenis; tidak menjalankan produk sendiri dan tidak memuat kode.

Sistem pembelajaran dan administrasi akademik.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`academic-smartboard`](./academic-smartboard/README.md) | Papan pintar dan portal akademik |

## Susunan

Seluruh `projects/` memakai pola yang sama: `projects/<domain>/<capsule>/`. Tidak ada capsule yang berdiri sendiri di akar `projects/`.

Folder domain hanya memuat `AGENTS.md` dan `README.md`. Berkas capsule lengkap — `docs/`, `src/`, `tests/` — adalah milik capsule anak, dan itulah yang diperiksa `tools/safrs/check_topology.py`.

## Aturan domain

Data siswa, nilai, dan identitas pengajar tidak pernah masuk repositori.
