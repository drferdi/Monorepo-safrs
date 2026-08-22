# Domain Router — Internal

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows domain-local context and never weakens root SAFRS or security controls.

## Apa ini

`projects/internal/` adalah **folder domain**, bukan capsule. Ia mengelompokkan capsule sejenis dan tidak memiliki kode, dokumen arsitektur, maupun uji sendiri — semua itu milik capsule anak.

Karena itu isinya hanya dua berkas: `AGENTS.md` (berkas ini) dan `README.md`.

- Domain: `internal`
- Cakupan: Perkakas internal dan demonstrator baseline yang dipakai tim sendiri, bukan pelanggan.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R1` — naikkan ke `R2` untuk perubahan yang menyentuh batas bersama atau rantai build.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`control-center`](./control-center/AGENTS.md) | Pusat kendali operasional monorepo |
| [`golden-path`](./golden-path/AGENTS.md) | Demonstrator baseline: Next.js + Hono di satu unit penempatan |

Buka `AGENTS.md` capsule yang sedang dikerjakan; berkas itu yang memuat perintah build, lint, type check, dan test yang sebenarnya.

## Aturan domain

- Kredensial lingkungan pengembangan tidak pernah masuk repositori.
- Jangan meletakkan kode, `src/`, `tests/`, atau `docs/` di folder domain ini.
- Capsule anak boleh mempersempit aturan ini, tidak boleh melonggarkannya.
- Perubahan lintas capsule dalam satu domain tetap memerlukan pencatatan perluasan cakupan.
