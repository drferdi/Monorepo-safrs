# Healthcare

Folder domain. Mengelompokkan capsule sejenis; tidak menjalankan produk sendiri dan tidak memuat kode.

Sistem ranah kesehatan, berbagi konteks kepatuhan dan penanganan data pasien.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`avery`](./avery/README.md) | Konfigurasi dan penempatan Avery, agen Hermes milik Sentra |

## Susunan

Seluruh `projects/` memakai pola yang sama: `projects/<domain>/<capsule>/`. Tidak ada capsule yang berdiri sendiri di akar `projects/`.

Folder domain hanya memuat `AGENTS.md` dan `README.md`. Berkas capsule lengkap — `docs/`, `src/`, `tests/` — adalah milik capsule anak, dan itulah yang diperiksa `tools/safrs/check_topology.py`.

## Aturan domain

Data pasien, identitas orang sungguhan, dan kredensial tidak pernah masuk repositori.
