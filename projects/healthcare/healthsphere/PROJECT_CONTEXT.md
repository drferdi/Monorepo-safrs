# Project Context: Primary Healthcare Division (Umbrella)

> Dokumen ini adalah umbrella context untuk divisi `primary-healthcare`.
> Untuk detail spesifik per sub-project, lihat pointer di §5.
> Jika ada konflik, ikuti sub-context yang lebih spesifik — umbrella hanya menyediakan gambaran keseluruhan.

---

## 1. Ringkasan Divisi

| Field | Value |
|-------|-------|
| Nama Divisi | Primary Healthcare (Puskesmas Ekosistem) |
| ID | pkm-division |
| Domain | Primary Healthcare — Data + Public Interface |
| Owner | Dr. Ferdi Iskandar (Chief) |
| Status | Active |
| Last updated | 2026-04-15 |

**Tujuan divisi:** Menyediakan ekosistem digital terpadu untuk Puskesmas — mulai dari repositori data medis klinis (ICD-10, dataset penyakit), hingga website publik yang memudahkan pasien mengakses layanan.

---

## 2. Sub-Projects

| Sub-Project | Path | Stack | Tujuan |
|-------------|------|-------|--------|
| **database** | `primary-healthcare/database/` | JSON/CSV static data | Master data ICD-10, 144 penyakit Puskesmas, referensi CDSS |
| **website** | `primary-healthcare/website/` | Vite 7, React 19, Tailwind 4 | Website publik Puskesmas PONED Balowerti — info layanan + reservasi |

---

## 3. Relasi Antar Sub-Project

```
database/
  └─ icd10.json ──────────────────────┐
  └─ 144_penyakit_puskesmas.json ─────┼──► CDSS Engine (sentra-dashboard)
  └─ icdx-extensions.json ────────────┘
                                       │
website/ ◄─── Public user interface    │
  └─ Tidak bergantung pada database/   │
  └─ Reservasi → WhatsApp (external)   │
```

**Catatan:** `database/` berfungsi sebagai data source untuk CDSS dan ICD-X autocomplete di `sentra-dashboard` dan `sentra-assist`. `website/` adalah static SPA yang tidak bergantung pada `database/` secara langsung.

---

## 4. Agent Contract (Divisi)

### Berlaku untuk semua agent di divisi ini:
- Sapa user sebagai Boss atau Chief
- PHI/PII **mutlak dilarang** di seluruh sub-project ini (data publik dan master data saja)
- Semua perubahan dataset ICD-10 harus punya dasar medis yang kuat — cross-check dengan WHO ICD-10 resmi
- Website harus tetap sebagai static SPA — tidak ada backend logic yang ditambahkan

### Eskalasi ke Chief jika:
- Ada perubahan pada kode ICD-10 yang sudah mapan
- Ada rencana konversi format dataset (JSON → SQLite, dll)
- Ada rencana integrasi chatbot AI ke website secara real-time

---

## 5. Sub-Context Pointers

Baca dokumen berikut untuk detail yang lebih spesifik:

| Context | Path | Berisi |
|---------|------|--------|
| Database Context | [`database/PROJECT_CONTEXT.md`](./database/PROJECT_CONTEXT.md) | Stack, file map, agent contract untuk dataset management |
| Website Context | [`website/PROJECT_CONTEXT.md`](./website/PROJECT_CONTEXT.md) | Stack, workflow dev, Drferdi Design Philosophy, deploy |

---

## 6. Known Division-Level Constraints

- Dataset `icd10.json` berukuran ~2.6MB — perlu memory handling di sisi aplikasi saat parsing
- Website menggunakan Google Reviews yang bersifat statis (perlu sync manual via script)
- Kedua sub-project belum terintegrasi satu sama lain secara langsung

---

## 7. Open Questions (Division-Level)

- Apakah `database/` perlu dimigrasi ke `packages/` untuk reusability lintas app? (lihat S7 di TASKS.json)
- Apakah website perlu integrasi AI chatbot yang lebih dinamis dengan koneksi ke Dashboard?

---

*Umbrella context by Claude Code · 2026-04-15 · Pointers ke sub-contexts: database/ dan website/*
