# Integritas Historis — Invarian dan Tempat Gerbangnya Hidup

Spesifikasinya ada di `docs/bibles/`. Berkas ini hanya menjawab satu pertanyaan yang mahal
kalau harus dicari ulang: **aturan mana ditegakkan di berkas mana**, dan apa yang sudah
terbukti benar-benar menolak.

---

## Rantai yang tidak boleh dilewati

```
EvidenceClaim → EvidenceLink → Source
```

Tidak ada jalan pintas dari narasi ke layar. Setiap pernyataan publik menggantung pada klaim,
klaim menggantung pada tautan, tautan menggantung pada sumber.

## Dua sumbu yang independen

| Sumbu | Menjawab | Jangan diciutkan |
| --- | --- | --- |
| Kelas bukti (6 kelas) | "ini bukti jenis apa" | menjadi skor kepercayaan tunggal |
| Kepercayaan | "seberapa yakin" | menggantikan kelas bukti |
| `visualEvidenceClass` V0–V5 | "citra ini bukti apa" | dicampur dengan hak |
| `rightsClass` R0–R5 | "boleh dipakai atau tidak" | dicampur dengan autentisitas |

Autentisitas dan izin adalah dua pertanyaan terpisah. Aset boleh autentik tetapi terlarang, dan
boleh bebas hak tetapi bukan bukti apa pun.

## Di mana aturannya ditegakkan

| Aturan | Berkas |
| --- | --- |
| Klaim tidak bisa terbit tanpa `EvidenceLink` yang sah | `apps/web/src/payload/collections/EvidenceClaims.ts` |
| Aset publik wajib punya provenance, hak, alt text, credit | `apps/web/src/payload/collections/MediaAssets.ts` |
| Kelas hak "reference-only" tidak pernah tampil publik | `modules/historical-domain/media.ts` (`NEVER_PUBLIC_RIGHTS_CLASS`) |
| Presisi kronologi menolak bulan/hari pada presisi tahun | `modules/historical-domain/chronology.ts` |
| Validasi lintas-entitas yang memblokir rilis | `modules/content-validation/historical-integrity.ts` |
| Gerbang yang sama terhadap basis data nyata | `apps/web/src/scripts/verify-production.ts` |

`verify:production` **memblokir** rilis pada kegagalan kritis; ia bukan peringatan.

## Gerbang yang sudah terbukti menolak

Ini bukan daftar niat — semuanya benar-benar terpicu:

- Klaim tidak dapat dibuat langsung sebagai `published` (ditemukan saat seed pertama).
- Irisan **1869** berhenti di `needs_review`, dan halaman arsipnya mengatakan itu apa adanya.
- Folklor tidak naik menjadi fakta.
- Aset reference-only tidak pernah publik; anon GET bucket privat = **403**.

## Pola editorial yang sudah dipakai

- **Pisahkan catatan dari pembacaan.** Panjalu Jayati menjadi dua klaim: apa yang tertulis di
  catatan primer, dan apa artinya menurut interpretasi ilmiah.
- **Perbaiki angka di data, bukan di prosa.** Kekeliruan 1.142 tahun diperbaiki menjadi klaim
  1.147 tahun yang menyebut dirinya aritmetika, bukan klaim kota berdiri tanpa putus.
- **Ketiadaan yang jujur.** Jayabhaya bertanda `no_known_likeness`; tidak ada wajah ditampilkan.
- **Locator yang jujur.** "catatan katalog D.9", bukan nomor baris yang belum pernah diperiksa.

## Larangan yang tidak pernah kedaluwarsa

Lihat `.agents/BOUNDARIES.md` §2. Ringkasnya: jangan mengarang, jangan mendamaikan diam-diam,
jangan menyajikan folklor atau rekonstruksi sebagai dokumen, jangan memaparkan master privat.
