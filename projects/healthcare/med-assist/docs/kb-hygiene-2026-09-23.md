# KB Hygiene — 2026-09-23

**Chief GO:** reduce absurd matcher rankings from overly generic `gejala_klinis`.  
**Base:** `main` @ `01156f6` (LLM invent hard-gate already merged).  
**Scope:** surgical `gejala_klinis` edits only — no new diseases/ICD, no regimen invent.

## Problem

Matcher bag-of-words on keluhan *“lemas pusing tidak enak badan”* ranked **B76 Penyakit cacing tambang** as top-1 (~40%) because DIS-054 listed bare nonspecific tokens:

| Token from complaint | Matched DIS-054 phrase |
| -------------------- | ---------------------- |
| `lemas`              | “Lemas dan mudah lelah” |
| `pusing`             | “Pusing dan sakit kepala” |
| `badan`              | “Penurunan berat badan” |

## Change log

| ID | ICD | Nama | Field | Before → After |
| -- | --- | ---- | ----- | -------------- |
| `DIS-054` | `B76` | Penyakit cacing tambang | `gejala_klinis` | Removed bare *lemas / pusing / penurunan berat badan*; kept anemia + GI + pathognomonic ground-itch / larva migration / soil-contact clues (see below) |

### DIS-054 `gejala_klinis` (final)

1. Pucat  
2. Mudah lelah kronis dengan tanda anemia  
3. Mual  
4. Nyeri perut terutama epigastrium  
5. Diare yang kadang disertai darah  
6. Nafsu makan menurun  
7. Malnutrisi atau BB menurun pada infeksi kronis  
8. Ground itch: gatal dan ruam pada kulit telapak kaki tempat larva masuk  
9. Batuk saat migrasi larva melalui paru  
10. Riwayat kontak tanah tanpa alas kaki di daerah endemis  

**Not changed:** `icd10`, `nama`, `kompetensi`, `terapi`, other diseases.

## Regression

`lib/iskandar-diagnosis-engine/diagnosis-quality.test.ts` — Kasus 4:  
keluhan generik must **not** top-1 match `/^B7/` or `/^B6/` (guards B76 hookworm and similar parasites).

## Follow-ups (out of this PR)

- Broader instructional `gejala_klinis` remnants (e.g. DIS-001) — separate Chief GO.  
- Dual UI ranking / trajectory — skipped per scope.
