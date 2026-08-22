# Domain Router — Academic

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows domain-local context and never weakens root SAFRS or security controls.

## Apa ini

`projects/academic/` adalah **folder domain**, bukan capsule. Ia mengelompokkan capsule sejenis dan tidak memiliki kode, dokumen arsitektur, maupun uji sendiri — semua itu milik capsule anak.

Karena itu isinya hanya dua berkas: `AGENTS.md` (berkas ini) dan `README.md`.

- Domain: `academic`
- Cakupan: Sistem pembelajaran dan administrasi akademik.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R1` — naikkan ke `R2` untuk perubahan yang menyentuh data siswa atau penilaian.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`academic-smartboard`](./academic-smartboard/AGENTS.md) | Papan pintar dan portal akademik |

Buka `AGENTS.md` capsule yang sedang dikerjakan; berkas itu yang memuat perintah build, lint, type check, dan test yang sebenarnya.

## Aturan domain

- Data siswa, nilai, dan identitas pengajar tidak pernah masuk repositori.
- Jangan meletakkan kode, `src/`, `tests/`, atau `docs/` di folder domain ini.
- Capsule anak boleh mempersempit aturan ini, tidak boleh melonggarkannya.
- Perubahan lintas capsule dalam satu domain tetap memerlukan pencatatan perluasan cakupan.
