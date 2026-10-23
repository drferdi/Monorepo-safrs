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
| SP0276 | Sindroma Koroner Akut | PNPK 2019 SKA hal. 90 | `fasyankes-primer-idi-2017.pdf` SKA: "Penatalaksanaan … Terapi farmakologi: oksigen, nitrat, aspirin" |
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
