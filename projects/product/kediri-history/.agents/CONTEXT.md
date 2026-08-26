# CONTEXT — Identitas Kediri

Jarang berubah. Menjawab: proyek ini apa, untuk siapa, dan apa yang tidak boleh diubah
sembarangan.

Last updated: 2026-08-26

---

## Proyek

- **Nama:** Kediri — A Living Civilization
- **Pemilik/klien:** Pemerintah Kota Kediri. Ini karya resmi pemerintah daerah, bukan situs
  wisata dan bukan blog sejarah.
- **Capsule:** `projects/product/kediri-history` — sovereign product capsule (R2).
- **Bentuk:** pengalaman web sejarah sinematik, server-first, dengan Journey satu-rute dan
  Arsip publik yang simetris.

## Taruhannya

Situs ini akan dikutip. Guru akan membagikan tautan dalam ke sebuah scene; peneliti akan
membuka catatan arsipnya; warga akan membacanya sebagai pernyataan resmi tentang kotanya
sendiri. Karena itu **kesalahan sejarah lebih mahal daripada kegagalan teknis**, dan gerbang
integritas historis memblokir rilis alih-alih memperingatkan.

Konsekuensi praktisnya: lebih baik menampilkan ketiadaan yang jujur ("belum ada klaim terbit
yang tertaut ke peristiwa ini") daripada mengisi lubang dengan tebakan yang terlihat rapi.

## Model yang mengikat

```
Historical Truth → Editorial Narrative → Experience Model → Motion Choreography → Presentation
```

Arah panah itu satu arah. Presentasi tidak pernah boleh mengubah apa yang dianggap benar;
kalau sebuah scene menuntut fakta yang tidak ada, yang mengalah adalah scene-nya.

## Yang tidak boleh diubah tanpa keputusan Chief

- `research/original/` — korpus riset mentah. **Tidak pernah** diimpor otomatis ke CMS.
- `docs/ARCHITECTURE_LOCK.md`, `docs/bibles/**`, `docs/implementation/**` — sumber kebenaran
  spesifikasi; diklasifikasikan sensitif di `.safrs/sensitive-paths.json`.
- Kontrak standalone capsule (lihat `project.contract.json` dan `AGENTS.md`).
- Enam kelas bukti dan pemisahan V0–V5 / R0–R5. Ia tidak boleh diciutkan menjadi satu skor
  "kepercayaan".

## Sumber kebenaran lain

- Spesifikasi: `docs/bibles/` (Historical, Technical, UX) dan
  `docs/implementation/MASTER_IMPLEMENTATION_PLAN.md`.
- Router agen capsule: `AGENTS.md` di akar capsule.
- Kebijakan repositori: `AGENTS.md` dan `.agents/` di root Monorepo.
