# Domain Router — Healthcare

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows domain-local context and never weakens root SAFRS or security controls.

## Apa ini

`projects/healthcare/` adalah **folder domain**, bukan capsule. Ia mengelompokkan capsule sejenis dan tidak memiliki kode, dokumen arsitektur, maupun uji sendiri — semua itu milik capsule anak.

Karena itu isinya hanya dua berkas: `AGENTS.md` (berkas ini) dan `README.md`.

- Domain: `healthcare`
- Cakupan: Sistem ranah kesehatan, berbagi konteks kepatuhan dan penanganan data pasien.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2` — naikkan ke `R3` untuk logika yang menentukan keputusan klinis.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`avery`](./avery/AGENTS.md) | Konfigurasi dan penempatan Avery, agen Hermes milik Sentra |

Buka `AGENTS.md` capsule yang sedang dikerjakan; berkas itu yang memuat perintah build, lint, type check, dan test yang sebenarnya.

## Aturan domain

- Data pasien, identitas orang sungguhan, dan kredensial tidak pernah masuk repositori.
- Jangan meletakkan kode, `src/`, `tests/`, atau `docs/` di folder domain ini.
- Capsule anak boleh mempersempit aturan ini, tidak boleh melonggarkannya.
- Perubahan lintas capsule dalam satu domain tetap memerlukan pencatatan perluasan cakupan.
