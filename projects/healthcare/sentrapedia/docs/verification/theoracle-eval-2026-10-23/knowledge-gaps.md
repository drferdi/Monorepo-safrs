# SSOT therapy and dose gaps, with references (read-only), 2026-10-23

SSOT v0.6 (330 diseases), marked clinically reviewed by Gaffer on 2026-10-23 (`status.review_klinis` on every entry). This report covers the diseases that still miss a therapy text or a dose line as the builder renders them. Nothing clinical was added to the SSOT: the references below are for the SSOT author to fill the next version.

Method: `doseLines` and `therapyText` from `scripts/knowledge-ssot.mjs` decide the groups. References come from two places: the entry's own `dokumen` metadata (guideline file and the page of its Penatalaksanaan section), and a lexical search of the 34 guideline PDFs in the TheOracle library (disease name within 800 characters of a drug with a strength, or of a management heading). Every library hit was read; only the ones about the disease are listed. Candidates: `knowledge-gaps-candidates.json`.

## A. Therapy text, no dose line (42)

### A1. The dose is already in the therapy text (15)

The SSOT marks these `teks_ada_dosis_numerik`: the regimen with its dose is in the narrative, but no structured dose row was extracted. Reference: the entry's own therapy text. Action: extract dose rows from it.

| ID | Disease | Drugs named | Guideline pages (SSOT `dokumen`) | Library passage |
|---|---|---|---|---|
| SP0001 | Aborsi spontan komplit | methylergometrine | - (Daftar KKI) | - |
| SP0003 | Abses folikel rambut atau kelenjar sebasea | amoksisilin | - | - |
| SP0017 | Apendisitis Akut | - | PPK IDI 2017 hal. 97; Permenkes 5/2014 hal. 110; KMK 1186/2022 hal. 176 | - |
| SP0063 | Diabetes melitus tipe 1 | insulin | - | FORNAS 2023 hal. 133-135 (insulin, formulary strengths only) |
| SP0090 | Fraktur Terbuka | sefalosporin, imunoglobulin | PPK IDI 2017 hal. 166; Permenkes 5/2014 hal. 211; KMK 1186/2022 hal. 296 | - |
| SP0134 | Impetigo ulseratif (ektima) | amoksisilin | - | - |
| SP0142 | Intoleransi makanan | - | Permenkes 5/2014 hal. 89; KMK 1186/2022 hal. 128 | - |
| SP0143 | Inverted nipple | - | PPK IDI 2017 hal. 424; KMK 1186/2022 hal. 777 | - |
| SP0164 | Kekerasan tumpul | parasetamol | - | - |
| SP0246 | Pneumotoraks | - | KMK 1186/2022 hal. 485 | - |
| SP0265 | Salpingitis | seftriakson, doksisiklin | - | - |
| SP0304 | Tinea barbe | griseofulvin | - | - |
| SP0312 | Tinea unguium | itrakonazol | - | `dermatovenereologi-perdoski-2017.pdf`, Tinea unguium: terbinafin 1x250 mg/hari, itrakonazol |
| SP0328 | Vaginosis bakterialis | metronidazol | - | `fasyankes-primer-idi-2017.pdf`: metronidazol 2x500 mg 7 hari; 2x400 mg 5-7 hari; klindamisin krim 2% |
| SP0334 | Vulnus laseratum, punctum | - | - | - |

### A2. A drug is named but no dose is given (4)

| ID | Disease | Drugs named | Guideline pages | Library passage |
|---|---|---|---|---|
| SP0029 | Benda Asing Di Telinga | alkohol, lidokain | KMK 1186/2022 hal. 265 | - |
| SP0092 | Fraktur Tulang | morfin, fentanil, sefazolin, gentamisin, kalsium | - (catalogue source) | - |
| SP0277 | Sinusitis (Rinosinusitis) | salin, kortikosteroid | KMK 1186/2022 hal. 523 | `rinosinusitis-kronik-2022.pdf` is in the library (chronic RS only) |
| SP0316 | Transient Ischemic Attack (TIA) | klopidogrel, dipiridamol, silostazol, dabigatran, apiksaban | KMK 1186/2022 hal. 365 | `stroke-2019.pdf` is in the library; no passage names TIA next to a dose |

### A3. No drug in the therapy text (23)

Most are managed by procedure, correction or referral, so no dose is expected; a few may still need one (marked *).

| ID | Disease | Guideline pages |
|---|---|---|
| SP0024 | Astigmatism ringan | Permenkes 5/2014 hal. 162; KMK 1186/2022 hal. 219 |
| SP0028 | Benda Asing Di Hidung | PPK IDI 2017 hal. 276; Permenkes 5/2014 hal. 183; KMK 1186/2022 hal. 501 |
| SP0039 | Cardiorespiratory Arrest * (resuscitation drugs) | PPK IDI 2017 hal. 161; Permenkes 5/2014 hal. 201; KMK 1186/2022 hal. 286 |
| SP0082 | Failure to Thrive (Gagal Tumbuh) | KMK 1186/2022 hal. 691 |
| SP0091 | Fraktur Tertutup | Permenkes 5/2014 hal. 216; KMK 1186/2022 hal. 298 |
| SP0114 | Hernia | - |
| SP0123 | Hipermetropia ringan | PPK IDI 2017 hal. 125; Permenkes 5/2014 hal. 163; KMK 1186/2022 hal. 222 |
| SP0163 | Kekerasan tajam | - |
| SP0180 | Laserasi Kelopak Mata | PPK IDI 2017 hal. 138; KMK 1186/2022 hal. 245 |
| SP0185 | Lipoma | PPK IDI 2017 hal. 178; Permenkes 5/2014 hal. 226; KMK 1186/2022 hal. 315 |
| SP0192 | Malabsorbsi Makanan | PPK IDI 2017 hal. 71; Permenkes 5/2014 hal. 92; KMK 1186/2022 hal. 131 |
| SP0194 | Malaria Serebral * (pre-referral antimalarial) | KMK 1186/2022 hal. 350 |
| SP0202 | Miopia ringan | Permenkes 5/2014 hal. 165; KMK 1186/2022 hal. 223 |
| SP0203 | Moluskum kontagiosum | PPK IDI 2017 hal. 299; Permenkes 5/2014 hal. 394; KMK 1186/2022 hal. 543 |
| SP0218 | Parafimosis | KMK 1186/2022 hal. 706 |
| SP0236 | Perdarahan Subkonjungtiva | Permenkes 5/2014 hal. 158; KMK 1186/2022 hal. 215 |
| SP0237 | Peritonitis * (initial antibiotic before referral) | Permenkes 5/2014 hal. 144; KMK 1186/2022 hal. 179 |
| SP0250 | Presbiopia | PPK IDI 2017 hal. 127; Permenkes 5/2014 hal. 167; KMK 1186/2022 hal. 225 |
| SP0251 | Pterigium | index_md (pterigium, pterigium-tatalaksana) |
| SP0315 | Tonsilitis Kronik | - (catalogue source); `tonsilitis-2018.pdf` is in the library |
| SP0318 | Trauma Kimia Mata | KMK 1186/2022 hal. 243 |
| SP0324 | Ulkus pada tungkai | PPK IDI 2017 hal. 354; KMK 1186/2022 hal. 642 |
| SP0330 | Varises dan Insufisiensi Vena Kronik | - (catalogue source) |

## B. Dose lines, no therapy text (17)

These are mostly PNPK entries whose doses were extracted but whose management narrative was not. Reference: the PNPK and its Penatalaksanaan page from `dokumen`; the library passage where one exists.

| ID | Disease | Guideline (SSOT `dokumen`) | Library passage |
|---|---|---|---|
| SP0043 | COVID-19 | - | - |
| SP0102 | Gangguan Depresi Ringan-Sedang | - | - |
| SP0119 | Hiperbilirubinemia | PNPK 2019 Hiperbilirubinemia hal. 97 | - |
| SP0125 | Hipertensi Pada Anak | PNPK 2021 Hipertensi Pada Anak | - (FKTP 2022 hal. 135-136 is adult hypertension) |
| SP0137 | Infeksi Intraabdominal | PNPK 2017 Infeksi Intraabdominal hal. 73 | - |
| SP0147 | Kandidosis mukokutan ringan | - | - |
| SP0148 | Kanker Kolorektal | PNPK 2018 Kanker Kolorektal hal. 160 | - (FKTP 2022 hal. 269-270 is screening) |
| SP0157 | Katarak Pada Anak | PNPK 2020 Katarak Pada Anak hal. 37 | - |
| SP0188 | Luka bakar derajat 1 dan 2 | Permenkes 5/2014 hal. 406; KMK 1186/2022 hal. 634 | - |
| SP0224 | Penyakit Ginjal Tahap Akhir | PNPK 2017 PGTA hal. 143 | FKTP 2022 hal. 227-230 (diabetic kidney disease, referral back) |
| SP0225 | Penyakit Hirschsprung | PNPK 2017 Hirschsprung hal. 31 | - |
| SP0232 | Perdarahan Post Partum | - | - |
| SP0267 | Sepsis | PNPK 2017 Sepsis | `sepsis-2017.pdf` (the same PNPK) |
| SP0276 | Sindroma Koroner Akut | PNPK 2019 SKA hal. 90 | - (corrected 2026-10-24: the PPK IDI 2017 passage that follows the words "Sindrom koroner akut" is the management of Angina Pektoris Stabil, the end of its "Komplikasi" line) |
| SP0296 | Tatalaksana BBLR | - | `fktp-kmk-2022.pdf` hal. 293 (Tatalaksana BBLR); `resusitasi-bblr-2018.pdf` |
| SP0297 | Tatalaksana Ulkus Kornea Bakteri | PNPK Ulkus Kornea Bakteri hal. 41 | `ulkus-kornea-bakteri-2025.pdf` (the same PNPK) |
| SP0298 | TB dengan HIV | - | `fasyankes-primer-idi-2017.pdf` TB/HIV chapter |

## C. No therapy text and no dose (1)

| ID | Disease | Reference |
|---|---|---|
| SP0027 | Benda asing (T17) | `bedah-toraks-2020.pdf`, "Benda Asing pada saluran nafas (ICD X:17.90)" with its Tata laksana. Overlaps SP0028 (hidung) and SP0029 (telinga), which carry their own therapy text. |

## Limits

- The 34-PDF library does not hold the PNPK, PPK IDI 2017 page numbers are often missing in the SSOT, and the KMK/Permenkes pages point to the official lampiran, not to a file in the repository.
- The lexical search finds a passage only when the disease name and the drug or heading sit close together; absence of a library hit does not mean the guideline has no dose.

## A1 applied (Gaffer, 2026-10-23)

Dose rows were added to 12 of the 15 entries, each quoted word for word from the entry's own `terapi_teks` (the script stops if a quote is not in the text), `sumber` the text's source (Daftar KKI, Permenkes 5/2014 PPK hal. 211, KMK 1186/2022 PPK hal. 296), `catatan` "Diambil dari teks terapi entri ini (terapi_teks …), 2026-10-23; ditinjau Gaffer.": SP0001, SP0003, SP0063 (insulin only), SP0090 (tetanus immunoglobulin 250 unit, two sources), SP0134, SP0142, SP0164, SP0265 (two rows), SP0304, SP0312, SP0328, SP0334. Diseases with a dose line: 287 → 299.

Not taken:
- SP0017 Apendisitis Akut, SP0143 Inverted nipple, SP0246 Pneumotoraks: their therapy text has no drug dose ("sekitar 20%", a syringe size, a needle gauge); the SSOT's `teks_ada_dosis_numerik` flag is a false positive for them.
- SP0063 metformin 500 mg: the source is a combined KKI text for several diseases and metformin is not a type 1 diabetes regimen.

For Gaffer: SP0312 reads "Itraconazole 200 mg sekali sehari 3 bulan (pulse therapy)"; a daily dose for 3 months is a continuous regimen, while pulse therapy is usually given one week a month. Transcribed as written. The SSOT's automatic `status` counts (`n_pernyataan_dosis`, `n_obat_berdosis`) were not recomputed.

Rebuild: 17,994 chunks (2,408 SSOT + 15,586 PDF), `indexSha256` `57ca2482…`; the 17,981 chunks with unchanged text keep their vectors (min cosine 0.99999994). Benchmark (`../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-a1.json` vs `benchmark-v06-optBE.json`): identical in every category (overall 0.875, dose 0.82, targeted 0.934). The gate verifies the new rows from their own chunk (metronidazol 2x500 mg for N76, doksisiklin 2x100 mg for N70, griseofulvin 500 mg for B35, methylergometrine 3x0.2 mg for O03, tetanus immunoglobulin 250 unit for T14).

## Item by item (Gaffer, "Kerjakan satu per satu", 2026-10-24)

1. Therapy and dose gaps. Five entries got a therapy text quoted from a library PDF (joined chunks; running page headers removed), keyed with the source and "ditambahkan dari pustaka 2026-10-24, belum ditinjau Gaffer"; the same note is in each entry's `status.review_klinis.catatan`:
   - SP0298 TB dengan HIV: PPK IDI 2017, chapter TB dengan HIV (from p. 15), Penatalaksanaan to Kriteria Rujukan.
   - SP0188 Luka bakar derajat 1 dan 2: PPK IDI 2017, chapter Luka Bakar Derajat I dan II (from p. 352).
   - SP0232 Perdarahan Post Partum: PPK IDI 2017, chapter Perdarahan Post Partum (from p. 412).
   - SP0296 Tatalaksana BBLR: `fktp-kmk-2022.pdf` (KMK 1936/2022), BBLR (p. 293), "Tata laksana BBLR" to Pemantauan.
   - SP0027 Benda asing (T17): `bedah-toraks-2020.pdf` (PPK HBTKVI 2016-2018), "8. Tata laksana Bronkoskopi Operasi eksplorasi Thoracotomy".
   The builder labels the two new sources ("KMK 1936/2022", "PPK HBTKVI 2016-2018").
   Not filled: SKA (the library passage belongs to Angina Pektoris Stabil); Sepsis and Ulkus kornea (whole PNPKs, no single management passage to quote); Depresi and Kandidosis mukokutan (PPK IDI 2017 has only "Gangguan Campuran Anxietas dan Depresi" and "Kandidiasis Mulut"); Hiperbilirubinemia, COVID-19 and the other PNPK entries (no library text). A2 (SP0029, SP0092, SP0277, SP0316) and the starred A3 entries (SP0039, SP0194, SP0237): their KMK/Permenkes texts give no dose. Malaria serebral: PPK IDI 2017 gives a pre-referral dose "Artemisinin atau Artesunat … dosis awal 3,2mg /kg BB", which is the artemether dose (artesunate is usually 2.4 mg/kg); not added, for Gaffer.
2. DM tipe 1 (SP0063): `icd10` E10, E11, E14 → E10. DM tipe 2 was already E11 only. `terkait` is curated, not derived from the codes, and is unchanged.
3. ICPC-2 codes: none left in `icd10`. The W92 case was gone in v0.5; no code of an entry collides with an ICPC-2 code of PPK IDI 2017 while being absent from the entry's ICD text. Code-text differences for Gaffer: SP0112 Hepatitis B is coded B18.1 (chronic) while its PPK text says B16 Acute Hepatitis B; SP0168 Keracunan makanan is coded T47 while its PPK text says T62.2.
4. Categories: the catalogue shows 42 categories, because 228 entries carry a source category (27 names from several sources: "Kulit" and "Penyakit Kulit dan Kelamin", "Neurologi" and "Penyakit Saraf", "Musculoskeletal" and "Muskuloskeletal", …) and 108 take the ICD-10 chapter. Applied after Gaffer's approval (2026-10-24): every disease's `kategori` is the ICD-10 chapter of its first code (21 categories, helper `chapter` in `scripts/knowledge-ssot.mjs`, also the catalogue fallback); the source category is in `kategori_sumber_lama` (228 entries). Known ICD effects: stroke under Kardiovaskular, nose and throat under Pernapasan, BPPV (R42) under Gejala, HIV/AIDS (Z21) under Faktor Status Kesehatan. Chunks and index unchanged (`fc028da5…`). Coding question found on the way: SP0020 Artritis Reumatoid is coded M53.3, not an RA code (M05/M06).
5. SP0312 itrakonazol: Perdoski 2017 (Tinea unguium) gives "itrakonazol dosis denyut (2x200 mg/hari selama 1 minggu, istirahat 3 minggu) sebanyak 2 denyut untuk kuku tangan dan 3-4 denyut untuk kuku kaki atau 200 mg/hari selama 2 bulan untuk kuku tangan dan minimal 3 bulan untuk kuku kaki". The KKI row "200 mg sekali sehari 3 bulan (pulse therapy)" is the continuous toenail regimen with the wrong label. Replaced on Gaffer's instruction (2026-10-24) by two rows from PPK Perdoski 2017 hal. 55, both quoting the passage above: itrakonazol 200 mg 2x sehari, 1 minggu, istirahat 3 minggu (2 denyut kuku tangan, 3-4 denyut kuku kaki); itrakonazol 200 mg 1x sehari, 2 bulan kuku tangan, minimal 3 bulan kuku kaki; konteks "alternatif (obat pilihan: terbinafin)", `catatan` names the KKI row it replaces. The entry's KKI therapy text, the source's own words, still reads "(pulse therapy)". Index `61ac3f80…`; benchmark `../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-itraconazole.json` identical to `benchmark-v06-itemized.json`.
6. Non-drug rows: `NOT_A_DRUG` also drops auto-extracted rows whose `obat` starts with normal, studi, lebih, kurang, volume, mortalitas, survival, data, tidak, nilai, skor, penelitian, hasil, jumlah, total, rerata, sebesar, hingga, kemudian, kelompok, stadium, derajat, ukuran, frekuensi, saturasi, tekanan, hemoglobin, kreatinin or leukosit (every dropped value was checked: lab values, statistics, sentence fragments). Rendered dose lines 7,779 → 7,624. Kept on purpose: albumin, natrium, kalium, umur (vitamin A by age), bayi, lesi, fase, trombosit.
7. Status counts: recomputed for every entry with the rules the SSOT's own values follow (n_pernyataan_dosis = rows, n_obat_berdosis = distinct obat ignoring case, sumber_teks = sorted keys, ada_teks_terapi). 39 entries changed: the 12 A1 entries, the 5 new texts, and about 22 entries whose counts were already stale before A1 (rows or texts merged after the counts were made). `teks_ada_dosis_numerik` was set only for the five new texts; its original rule is not reproducible exactly.
8. Thalassemia folic acid (report only): the dose chunk of the 17-chunk entry is still not in the retrieved set; retrieval is not tuned.
9. ICD top-1 (read-only): abbreviations-13 "BPPV manuver Epley" now returns R42 with the right name; SSOT v0.6 codes SP0331 BPPV as R42 (the guideline's "No. ICD") and keeps H81.1 in `icd10_sumber_lama`, while the gold is H81.1. abbreviations-14 "LLA pada anak kemoterapi induksi" returned D61.8 febrile neutropenia; SP0182 is coded C91.0 and did not change, so this reads as the model taking the complication in the query.


Rebuild (one for items 1, 2, 6, 7): 17,990 chunks (2,404 SSOT + 15,586 PDF; fewer SSOT chunks because the dropped rows shortened some entries), `indexSha256` `fc028da5…`, full re-embed on DirectML in 1,406 s. Benchmark (`../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-itemized.json` vs `benchmark-v06-a1.json`): identical in every category (overall 0.875, drug_dose 0.75, dose 0.82, targeted 0.934), and no query changed hit or miss.

## Code fixes (Gaffer approved, 2026-10-24)

The replaced code is kept in `icd10_sumber_lama`, so the catalogue `kode` and the evidence gate still match it; `kategori` follows the new first code.

| Entry | Before | After | Reason |
|---|---|---|---|
| SP0020 Artritis Reumatoid | M53.3 | M06.9 | The PPK chapter repeats the polymyalgia line "M53.3 Polymyalgia rheumatica"; M53.3 is sacrococcygeal disorders. |
| SP0247 Polimialgia Reumatik | M53.3 | M35.3 | The PPK names polymyalgia rheumatica; its code is M35.3 (digits swapped). |
| SP0168 Keracunan makanan | T47 | T62.2 | The PPK's "No. ICD" (T47 is poisoning by gastrointestinal drugs). |
| SP0331 BPPV | R42 | H81.1 | The specific code instead of the symptom code the PPK gives; kategori Gejala dan Temuan Abnormal → Telinga. |

SP0112 Hepatitis B is unchanged: B16 (the PPK code) is already its first code, B18.1 adds the chronic form; the earlier "B18.1 vs B16" line was a misreading. Left for Gaffer: SP0020 and SP0260 "Rheumatoid Arthritis (RA)" (M05) describe the same disease. Index `818c1be1…`; benchmark `../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-codes.json` identical to `benchmark-v06-itraconazole.json`; gate green. Not run through the paid eval.

## Library texts reviewed (Gaffer, 2026-10-24)

Gaffer reviewed the five library therapy texts side by side with their sources (each matches its source word for word once page headers and footers are removed) and approved them. Their keys now read "ditambahkan dari pustaka 2026-10-24, ditinjau Gaffer 2026-10-24", and `status.review_klinis` is {ditinjau, Gaffer, 2026-10-24} with a `catatan` naming the text: SP0298, SP0188, SP0232, SP0296, SP0027. Index `c190d587…`; benchmark `../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-reviewed.json` identical to `benchmark-v06-codes.json`; gate green.

