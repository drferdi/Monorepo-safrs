# Domain Router — Product

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows domain-local context and never weakens root SAFRS or security controls.

## Apa ini

`projects/product/` adalah **folder domain**, bukan capsule. Ia mengelompokkan capsule sejenis dan tidak memiliki kode, dokumen arsitektur, maupun uji sendiri — semua itu milik capsule anak.

Karena itu isinya hanya dua berkas: `AGENTS.md` (berkas ini) dan `README.md`.

- Domain: `product`
- Cakupan: Produk yang dirilis ke publik, lengkap dengan lisensi, changelog, dan kewajiban rilisnya.
- Human owner: Gaffer (dr. Ferdi Iskandar)
- Default risk: `R2` — rilis publik dan perubahan lisensi adalah `R3`.

## Capsule anak

| Capsule | Isi |
| --- | --- |
| [`sentrabot`](./sentrabot/AGENTS.md) | Bot Sentra untuk rilis publik |
| [`kediri-history`](./kediri-history/AGENTS.md) | Kediri — A Living Civilization: pengalaman web sejarah sinematik resmi untuk Pemerintah Kota Kediri; capsule standalone berdaulat |

Buka `AGENTS.md` capsule yang sedang dikerjakan; berkas itu yang memuat perintah build, lint, type check, dan test yang sebenarnya.

## Aturan domain

- Kunci penandatanganan rilis dan token registry tidak pernah masuk repositori.
- Jangan meletakkan kode, `src/`, `tests/`, atau `docs/` di folder domain ini.
- Capsule anak boleh mempersempit aturan ini, tidak boleh melonggarkannya.
- Perubahan lintas capsule dalam satu domain tetap memerlukan pencatatan perluasan cakupan.
