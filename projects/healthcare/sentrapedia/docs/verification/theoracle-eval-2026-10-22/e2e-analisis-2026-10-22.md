# One fictional Analisis request on the SSOT v0.5 index, 2026-10-22

Browser, `http://localhost:3101` (`scripts/run-system.mjs dev`), index D: `indexSha256` `1b965faf…` (18,665 chunks: 1,979 SSOT v0.5 + 16,686 guideline PDF), catalogue 333 entries.

- Case (fictional, same as 2026-10-21): "Pasien fiktif, laki-laki 30 tahun, demam 6 hari makin tinggi sore-malam, nyeri ulu hati, mual, konstipasi, lidah kotor. Tidak ada riwayat alergi obat." TD 110/70, N 88, S 38,9, RR 20. Mode Analisis, Standar.
- Trace `8b404e3c-7996-4742-9989-f8ef7da28db9`.
- Diagnosis kerja (kandidat): Typhoid fever (A01.0); cannot-miss Meningococcal infection (A39.9) and dengue (A91). Terapi usulan: Chloramphenicol 500 mg, four times a day for 14 days (2026-10-21: Azithromycin 500 mg once a day for 7 days).

## TheOracle passages cited ("Kutipan pedoman")

| Document | Passages | Content |
|---|---|---|
| `patologi-klinik-anatomik-unair.pdf` | 2 | case report (toxoplasmosis cerebri, HIV); off-topic for this case, re-included in index D for lab queries |
| `fasyankes-primer-idi-2017.pdf` | 3 | "Demam Tifoid" chapter: risk factors and the antibiotic dose table |
| `dermatovenereologi-perdoski-2017.pdf` | 1 | drug eruption |
| `dermatovenereologi-perdoski-2021.pdf` | 1 | febrile neutropenic patient differential |
| Sirosis Hati Pada Dewasa (SSOT) | 1 | dose lines, `sumber: PNPK (013_…SIROSIS_HATI_PADA_DEWASA.pdf); halaman: 239`, `242`, `257` |
| Demam Tifoid (SSOT) | 2 | therapy chunk with source labels `[Katalog SKDI 4A]`, `[Oracle II / PNPK; Dokumen index]`, `[Daftar KKI]`, `[Permenkes 5/2014 (hal. 93)]` |
| `tuberkulosis-2019.pdf` | 2 | OAT dose table by body weight |

Same document set as 2026-10-21. The v0.5 page-bearing source labels now reach the cited passage ("Permenkes 5/2014 (hal. 93)"); the KMK 1186/2022 (hal. 136) paragraph is in the catalogue's reference therapy but not in the two cited SSOT chunks.
