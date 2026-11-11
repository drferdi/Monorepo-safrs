# One fictional Analisis request on the SSOT index, 2026-10-21

Browser, `http://localhost:3101` (`npm run dev` via `scripts/run-system.mjs`), index `indexSha256` `7c5877fc…f1bc` (18,992 chunks), catalogue 347 entries.

- Case (fictional): "Pasien fiktif, laki-laki 30 tahun, demam 6 hari makin tinggi sore-malam, nyeri ulu hati, mual, konstipasi, lidah kotor. Tidak ada riwayat alergi obat." TD 110/70, N 88, S 38,9, RR 20. Mode Analisis, Standar.
- Trace `f8674e8f-cdbe-4fa9-99b6-e13a46e1c281`, cost 0.005272 USD.
- Diagnosis kerja (kandidat): Typhoid fever (A01.0). Terapi usulan: Azithromycin 500 mg, sekali sehari selama 7 hari.

## TheOracle passages cited ("Kutipan pedoman")

| Document | Passages | Source and page in the passage |
|---|---|---|
| `patologi-klinik-anatomik-unair.pdf` | 2 | case report (toxoplasmosis cerebri, HIV); off-topic for this case |
| `fasyankes-primer-idi-2017.pdf` | 3 | Panduan Praktik Klinis bagi Dokter di FKTP, "6. DEMAM TIFOID", ICD-10 A01.0, page 73; antibiotic dose table (Kloramfenikol, Seftriakson, Ampisilin) |
| `dermatovenereologi-perdoski-2017.pdf` | 1 | drug eruption criteria |
| `dermatovenereologi-perdoski-2021.pdf` | 1 | candidiasis differential |
| Sirosis Hati Pada Dewasa (SSOT) | 1 | dose lines, `sumber: PNPK (013_PEDOMAN_NASIONAL_PELAYANAN_KLINIS_TATA_LAKSANA_SIROSIS_HATI_PADA_DEWASA.pdf); halaman: 207`, `halaman: 229` |
| Demam Tifoid (SSOT) | 2 | definition chunk (ICD-10 A01, A01.0, SKDI 4A); dose chunk, `obat: Kloramfenikol; dosis: 4x500 mg; durasi: selama 10 hari; rute: PO/IV; populasi: Dewasa; sumber: PPK FKTP (IDI2017); halaman: 94` |
| `tuberkulosis-2019.pdf` | 2 | OAT dose table by body weight |

No passage names "KMK 1186/2022" literally: the SSOT labels the FKTP guideline "PPK FKTP (IDI2017)" or "PPK FKTP (KMK1936)".
