# One fictional Analisis request on the SSOT v0.6 index, 2026-10-22

Browser, `http://localhost:3101` (`scripts/run-system.mjs dev`), index `indexSha256` `e46a2fb0…` (17,560 chunks: 1,974 SSOT v0.6 + 15,586 guideline PDF), catalogue 330 entries, per-document cap fix of `6e9938fa`.

- Case (fictional, same as `../e2e-analisis-2026-10-22.md`): "Pasien fiktif, laki-laki 30 tahun, demam 6 hari makin tinggi sore-malam, nyeri ulu hati, mual, konstipasi, lidah kotor. Tidak ada riwayat alergi obat." TD 110/70, N 88, S 38,9, RR 20. Mode Analisis, Standar.
- Trace `34b70c3e-39c0-43d9-b7c9-fe3ccb76a0d1`.
- Diagnosis kerja (kandidat): Typhoid fever (A01.0). Terapi usulan: Chloramphenicol 500 mg, four times a day for 14 days.

## TheOracle passages cited ("Kutipan pedoman")

| Document | Passages | Content |
|---|---|---|
| `fasyankes-primer-idi-2017.pdf` | 3 | "Demam Tifoid" chapter: risk factors and the antibiotic dose table |
| `dermatovenereologi-perdoski-2017.pdf` | 1 | drug eruption |
| Demam Tifoid (SSOT v0.6) | 3 | diagnosis chunk (suspect / probable case) and therapy chunk with labels `[Katalog SKDI 4A]`, `[Oracle II / PNPK; Dokumen index]`, `[Daftar KKI]`, `[Permenkes 5/2014 (hal. 93)]` |
| `dermatovenereologi-perdoski-2021.pdf` | 1 | febrile neutropenic patient differential |
| `penyakit-dalam-papdi-2024.pdf` | 1 | PPK hepatitis virus akut (definition) |
| Sirosis Hati Pada Dewasa (SSOT) | 1 | dose lines, `sumber: PNPK (013_…SIROSIS_HATI_PADA_DEWASA.pdf); halaman: 239`, `242`, `257` |
| `tuberkulosis-2019.pdf` | 2 | OAT dose table by body weight |

Compared with the v0.5 run (`../e2e-analisis-2026-10-22.md`): the two `patologi-klinik-anatomik-unair.pdf` case-report passages are gone; SSOT Demam Tifoid now contributes a diagnosis chunk as well as the therapy chunk, and PAPDI 2024 appears. The three Demam Tifoid passages come from the diagnosis and therapy retrievals together.
