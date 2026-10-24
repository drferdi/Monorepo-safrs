# Dose audit of the knowledge SSOT (read-only), 2026-10-24

Scope: every row of `dosis` in `theoracle/ssot/sentrapedia-knowledge-ssot.json` (v0.6, sha256 `fd54f1c3…`, round-trips byte for byte with `JSON.stringify(o, null, 1)`, no trailing newline, no CRLF). Nothing outside this folder was changed. Script: `dose-audit.mjs` beside this report (read-only; run from the capsule root with `node docs/verification/theoracle-eval-2026-10-24/dose-audit.mjs <out.json>`). Candidates, one id per proposal: `dose-audit-candidates.json`, written from the audit output by `dose-audit-export.mjs` (which also holds the two rows read by hand and the step 5 row).

Sources the script reads: each entry's own `terapi_teks`, the 34 guideline PDFs of the library (`theoracle/index/chunks.jsonl`, chunks joined per file), and the builder's `doseLines` (whether a row reaches the index). The library holds 18 of the 80 PNPK files the SSOT cites (`PNPK_IN_LIBRARY` in the script), PPK IDI 2017 (`fasyankes-primer-idi-2017.pdf`), KMK 1936/2022 (`fktp-kmk-2022.pdf`) and PPK Perdoski 2017; it holds neither the KMK 1186/2022 nor the Permenkes 5/2014 lampiran, so their rows are checked against the entry's own text of that source.

## Before numbers

| | Count |
|---|---|
| Entries / diseases | 335 / 329 |
| Dose rows | 8,940 (manual 2,383, auto-extracted 6,451, cross-referenced 106) |
| Rows that reach the index (`doseLines` keeps them) | 8,029 |
| Rendered dose lines (after merging) | 7,626 |
| Entries with at least one dose line | 304 |
| `status.n_pernyataan_dosis` (sum) / `n_obat_berdosis` (sum) | 8,940 / 4,649 |

## Applied after Gaffer's approval (2026-10-24)

Gaffer approved M1-M7, H and N-0001; B and K stay open. `dose-audit-apply.mjs --write` applied them: it checked every row against the value the audit saw, found each of the 14 changed quotes in its source (PDF, own text, or SP0174's text for SP0173 #1; whitespace and dash style ignored) and each of the 301 other new values in the row's own quote (SP0053 #15 by its reading "kiprofloksasin"). Each changed row's `catatan` ends with `Audit dosis 2026-10-24: <field> semula "<old>"; disetujui Gaffer.`; the 1,350 removed rows are in `dose-audit-removed.json`. `status.terapi` was left as it was: the SSOT does not say how it was derived, and nothing reads it.

| | Before | After |
|---|---|---|
| SSOT sha256 | `fd54f1c3…` | `f5e8f58e…` (round-trips, no CRLF, no trailing newline) |
| Dose rows (manual / auto / cross-referenced) | 8,940 (2,383 / 6,451 / 106) | 7,591 (2,384 / 5,101 / 106) |
| Rows that reach the index | 8,029 | 7,244 |
| Rendered dose lines | 7,626 | 6,854 |
| Entries with a dose line | 304 | 303 |
| `n_pernyataan_dosis` / `n_obat_berdosis` (sums) | 8,940 / 4,649 | 7,591 / 3,693 (109 entries changed) |
| Index chunks (SSOT + PDF) | 17,989 (2,403 + 15,586), `edad52f5…` | 17,899 (2,313 + 15,586), `d0fa8c3f…` |
| Rows flagged by the audit (rendered) | 6,044 (5,155) | 4,472 (4,147) |

Commit `22a8cea5`. Benchmark `../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-dose-audit.json`: every hit identical to `benchmark-v06-ra-merge.json`. Paid eval: `eval-dose-audit.md` (ICD codes identical in all 61 cases, doses shown 62 → 63).

The audit run again on the new SSOT finds no lost dash, no drug-name fragment with a mechanical fix, no cut unit or thousands, and 343 non-drug rows (222 rendered) that the H rule did not cover. It also proposes seven new mechanical changes on rows whose `obat` M3 had just named ("kgbb", "Mulai infus"): SP0219 #1 and #4 frekuensi "4x/hari" → "3-4x/hari" (parasetamol), SP0223 #31 dosis "10-20 unit" → "10-20 unit/kg/jam" (heparin), SP0239 #1, #3, #10, #12 dosis "500 mg"/"250 mg" → "maks 500 mg"/"maks 250 mg" (azitromisin).

Round 2 (Gaffer: "Ya, terapkan 7 kandidat mekanis baru"): the seven are `dose-audit-candidates-2.json` (M4-0045, M5-0015 to M5-0018, M6-0114, M6-0115), applied by `dose-audit-apply.mjs dose-audit-candidates-2.json --write` with the same checks; each new value is in its row's quote, and `_meta.catatan` gets a second sentence. SSOT `e9f7d1bc…`; rows, rendered rows, dose lines and status counts unchanged. The audit run again finds no mechanical change left; flagged rows 4,472 → 4,466. Not changed and open: SP0219 #1 and #4 give 500 mg (the adult dose of the quote) with `populasi` "anak" (fixed in round 3).

Round 3 and 3b (Gaffer: "Sekalian check aja dulu semua"; approved "terapkan paket putaran 3 + 3b (perbaikan dan hapus)"). Every flagged row of the re-audit that could still be wrong was read once: the non-drug, fragment and class `obat` rows (769, three readers), the 83 read-by-hand proposals and the SP0314 amoxicillin rows (by hand), and 312 auto rows whose dosis, frekuensi or rute sit in another drug's part of the quote (`attr-check`: from the drug's name to the next drug a row of the same quote names; one reader). The readings are in `dose-audit-readings/`; `dose-audit-merge.mjs` merged them into `dose-audit-candidates-3.json`, accepting a value only when it is written in the row's quote (a drug name also just before it) and never deleting a manual row. Held back for Gaffer (`review`, 335 rows): renames where two drugs share the dose, combination names for one component's dose, the SP0075 epilepsy titration table, doses from study reports, and every row a reader left. Round 3 was simulated on a copy first; the re-audit of the result gave the follow-ups of round 3b (`dose-audit-candidates-3b.json`: per-kg and "maksimum" on rows just named, two more non-dose rows).

Round 3 also corrects a round 1 error: M6 took SP0314 #28's "2-3x/hari" from penisilin V; amoksisilin's own is "3x/hari" (the frequency rule took the dose's first occurrence in the quote, not the one after the row's drug).

| | After round 2 | After round 3 + 3b |
|---|---|---|
| SSOT sha256 | `e9f7d1bc…` | `852c762c…` |
| Field changes | | 429 (obat 204, frekuensi 104, dosis 68, rute 39, durasi 10, populasi 2, kutipan 2) |
| Rows removed (auto only; copies in `dose-audit-removed.json`, now 1,673 rows of all rounds) | | 323 (257 rendered) |
| Dose rows (manual / auto / cross-referenced) | 7,591 (2,384 / 5,101 / 106) | 7,268 (2,384 / 4,778 / 106) |
| Rows that reach the index / rendered dose lines | 7,244 / 6,854 | 7,045 / 6,645 |
| Entries with a dose line | 303 | 301 (SP0032 and SP0273 held only "50-75%" and "weight loss 7-10%") |
| Σ `n_obat_berdosis` | 3,693 | 3,398 |
| Rows flagged by the audit (rendered) | 4,466 (4,141) | 3,987 (3,807) |
| Index chunks (SSOT + PDF) | 17,899 (2,313 + 15,586) | 17,871 (2,285 + 15,586) |

The audit of the final SSOT proposes one mechanical change, SP0314 #28 "2-3x/hari", which is the round 1 error above and is not applied.

Clinical decisions (Gaffer, "Ya lakukan", applied by `dose-audit-k.mjs` with old-value checks; the note goes into `konteks`, which the index renders, and `catatan` keeps the old value):
- K1: SP0193 #78 (PPK IDI 2017 "Artesunat … 3,2mg /kg BB") keeps the guideline text and gains "3,2 mg/kgBB adalah dosis awal artemether; dosis artesunat 2,4 mg/kgBB IV/IM". K1b: SP0194 gets no pre-referral row (its text names no dose).
- K2: SP0216 #81 cefadroxil "2 x 500-100 mg" keeps the text and gains "kemungkinan salah ketik di pedoman (500-1000 mg)". The KMK row of the same dose is no longer in the SSOT.
- K3: SP0053 #27 (Permenkes cefixime 1.5-2 mg/kgbb) gains "PPK IDI 2017 dan KMK 1186/2022 menulis 20 mg/kgBB/hari".
- K4: SP0267 #20 ceftriaxone ISO "Bayi sampai 14 hari: sekali sehari 2050 mg/kg bb" → "20-50 mg/kg bb" (the same text caps it at 50 mg/kgBB).
- K5 prednison urtikaria and K6 thalassemia folic acid: unchanged. K7: SP0225 `status.terapi` "dosis_tanpa_frekuensi" → "tanpa_dosis".

## Where each quote is (check c)

| Found in | Match | Rows |
|---|---|---|
| The entry's own therapy text | exact (whitespace collapsed) | 2,142 |
| | whitespace removed | 13 |
| | reflowed table or running header in between | 28 |
| A library PDF | exact | 1,770 |
| | whitespace removed | 94 |
| | only after dropping line-end hyphens | 23 |
| | reflowed table or running header in between | 255 |
| Another entry's therapy text (cross-referenced rows) | | 31 |
| Not found | the source is in the library or the entry's own text | 104 |
| | the source is not in the library (62 PNPK files, ISO Indonesia) | 4,480 |

Half of all rows (4,480) cannot be checked here: 3,202 auto-extracted and 1,241 manual PNPK rows whose PNPK is not in the library, plus the 120 ISO Indonesia rows. They are not wrong; they are unverifiable with this library. The 104 rows not found although their source is present come mostly from `rinosinusitis-kronik-2022.pdf` (53), `skizofrenia-2025.pdf` (19), `stunting-2022.pdf` (10) and PPK IDI 2017 (6): the library edition or its text extraction differs from the one the SSOT quoted (for example the sirosis PNPK the SSOT cites is not the 2025 edition in the library). The 283 reflowed matches hold every word of the quote, but not in the source's order (table columns read across, or a running header such as "KEMENTERIAN KESEHATAN" in between); requirement 3 ("apa adanya") is not met by them, and they are listed in the candidates file (`flagged`, match `tabel_acak` or `urutan_dengan_sisipan`).

## Findings by check

| Check | What the script flags | Rows (rendered) | Where it goes |
|---|---|---|---|
| a. Drug name | `obat` is part of a longer word of the quote ("loperidol" in "Haloperidol", "ofloxacin" in "Ciprofloxacin", "asiklovir" in "Valasiklovir", "vitamin b" in "vitamin B12") | 233 (218) | 91 mechanical (M2), 97 read by hand (two-word names, salts, combinations), 45 not a drug |
| | `obat` is not a drug (a statistic, lab value, place, equipment, sentence fragment) | 1,911 (1,149) | 1,350 delete candidates (H), 30 + 5 named from the quote (M3, B), the rest read by hand |
| | `obat` is a drug class or salt only ("antibiotik", "sodium") | 62 (62) | read by hand |
| | Spelling variants ("ranitidin" in "ranitidine") and ISO brand quotes ("Merek X: …") | 127 / 113 | not findings |
| b. Dose numbers | A lost dash: the quote matches the source only once a line-end hyphen between digits is dropped ("celecoxib 200-\n400" read "200400") | 14 rows (9 doses, 5 quotes only) | M1 |
| | Per-kg dose stored as an absolute dose ("0,5mL/kg" kept as "0,5mL") | 168 (149) | 44 M4, 28 read by hand, the rest non-drug rows |
| | A maximum stored as the dose ("atropin 0.5mg IV (maks 3mg)" kept as 3mg) | 68 (34) | 14 M5, 35 read by hand, the rest non-drug rows |
| | A number cut at a thousands space ("200 000–300 000 U" kept as "000 U") | 1 | M7 |
| | Two numbers that may be joined without a dash ("1250") | 12 | checked by hand: none is a lost dash (capecitabine 850-1250 mg/m2, kalsium 1250 mg) |
| | A dose number missing from the quote | 2 | SP0075 #3, SP0271 #4: auto rows whose quote names another drug; read by hand |
| Frequency | A range cut to its upper end ("2-3 kali sehari" kept as "3 kali sehari") or a weekly frequency cut ("2 kali seminggu" kept as "2 kali") | 128 (128) | 113 M6, 15 read by hand |
| | `frekuensi` or `durasi` worded differently from the quote ("Harian" for a table column) | 191 / 84, manual rows | not findings |
| c. Quote | see the table above | | |
| d. Source and page | Cross-referenced row without its `catatan` | 0 | |
| | KMK/Permenkes page outside the chapter's page range in `dokumen` | 18 auto rows | cannot be checked without the lampiran; reported |
| | Quote found only in another source of the same entry | 3 (SP0106 #4, SP0128 #1, SP0173 #1) | reported; SP0173's line is SP0174's text |
| | Two sources of one entry whose strengths never meet for the same drug and population | 59 pairs, 28 drugs | table K below |
| e. Duplicates | Rows identical in every field | 0 | |
| | Same quote, same dose, other frequency/duration wording; two drugs sharing one dose in one sentence | 26 / 98 | not findings |
| Step 5 | Entries with a dose in their therapy text but no dose line | 0 today; 1 once the H rows go | the A1 work of 2026-10-23 covered them; SP0143 and SP0246 only name a manoeuvre and a pneumothorax size. SP0286's two rows are both H ("Obstruksi jalan 30%"); its KMK text holds "Adrenalin 1/1000 0,3ml SK" (N-0001) |

Only rendered rows reach the index and the evidence gate, but every count above covers all 8,940 rows.

## Proposals

Every proposal has an id in `dose-audit-candidates.json` with the row (`id`, `i`), the field, the value now (`old`), the value proposed (`new`) and the evidence (where the quote is, the match type, the source span for M1). Nothing is applied.

### Mechanical (M1-M7): 315 changes on 301 rows of 118 entries

Each one reads the row's own quote; no dose is taken from anywhere else. Proposed per group, so Gaffer can approve a group or single ids.

- **M1 lost dash** (23 changes, 14 rows, all manual PPK IDI 2017 rows): dose and quote get the dash back as the PDF shows it. Includes the known SP0020 celecoxib 200-400 mg, fluoksetin 10-20 mg, natrium diklofenak 25-50 mg, kloksasilin 250-500 mg, klindamisin 300-450 mg, HTIG 3000-6000 IU, nistatin 100.000-400.000 IU, kloramfenikol tetes mata 0,5-1%, asam salisilat 2-5%. The restored quote is found in the PDF with whitespace ignored.
- **M2 drug name from the word the quote has** (90 rows): the full word replaces the fragment. Several fragments named another drug: ofloxacin/ofloksasin for ciprofloxacin, siprofloksasin or levofloksasin (24 rows), asiklovir/acyclovir for valasiklovir (12), loperidol for haloperidol (10), loperamid for metokloperamid (2), prednisolon for methylprednisolone, tetrasiklin for oksitetrasiklin, epinefrin for norepinefrin, penisilin for benzilpenisilin, omeprazol for esomeprazole, oksasilin for (di)kloksasilin; "vitamin b/d/k" gets its number. SP0013 #11 "besi 250 μg" is the folic acid of the same tablet (read by hand). SP0053 #15 "kiprofloksasin" is the catalogue text's misspelling and is proposed as siprofloksasin.
- **M3 drug name from the quote** (30 rows, 13 rendered): `obat` is a sentence fragment ("kgbb", "Mual", "Penggunaan adefovir") and the quote names exactly one drug before the dose, with a dosing unit (Pirantel, Prednison, Azitromisin, Parasetamol, Metoklopropamid, heparin, …).
- **M4 per-kg** (44 rows): the dose gets its "/kg…" as the quote writes it ("25-100 mcg" → "25-100 mcg/kgBB/menit").
- **M5 maximum** (14 rows): the dose keeps the quote's "maks" word ("3mg" → "maks 3mg"); only where another row of the same quote holds the dose itself.
- **M6 frequency** (113 rows): the frequency gets its range start or "seminggu" back from the quote, at the occurrence nearest after the dose.
- **M7** (1 row): SP0268 #36 penisilin G "000 U" → "200 000–300 000 U/kg/hari".

The full tables follow at the end of this report.

### Delete candidates (H): 1,350 auto-extracted rows (803 rendered) in 95 entries

Rule: an auto-extracted row whose `obat` is not a drug, whose quote names no drug or drug class, and whose dose is a percentage, a lab value ("mg/dL", "g/dL", "mL/menit") or follows a statistic word, with no dosing word in the quote. Most common first words: sekitar 97, sebanyak 46, angka 45, penurunan 26, pasien 25, prevalensi 21, indonesia 20, sensitivitas 19, anemia 17, risiko 14, grade 14, spuit 12. 1,183 of them are percentages. Examples: "Individual Cohort 80%" (an evidence-level table), "Perempuan 200 - 420 mg/dL", "Spuit ukuran 5 ml", "Kadar CRP 100 mg". Manual rows are never in this list. 547 of them are already dropped by `NOT_A_DRUG`. A sample of 30, evenly spaced, is at the end of this report.

Effect on what the index sees: rendered dose lines 7,626 → 6,842; entries with a dose line 304 → 302. The two entries left without a line held no real dose: SP0225 Penyakit Hirschsprung ("enterokolitis sebesar 29%-50%", no therapy text) and SP0286 Status Asmatikus ("APE < 30% nilai terbaik"), for which N-0001 below is proposed.

If approved, each deleted row is copied verbatim to `dose-audit-removed.json` (with its entry and index) before removal, and the SSOT `_meta.catatan` names that file. Removing them changes the SSOT chunks, so retrieval numbers move; the benchmark and the paid eval will show by how much, and drops are reported, not tuned.

### New row (N-0001): SP0286 Status Asmatikus

KMK 1186/2022 p. 467 (the entry's own therapy text, a flowchart) lists "-Adrenalin 1/1000 0,3ml SK" under the alternatives for a moderate and a severe attack. Proposed row: obat "Adrenalin 1/1000", dosis "0,3ml", rute "SK", konteks "Alternatif pada serangan sedang dan berat (bagan tata laksana)", sumber "KMK 1186/2022 PPK", halaman "467", the quote above; populasi, frekuensi and durasi stay empty because the flowchart states none. The PPK IDI 2017 chunks of this chapter in the library hold no dose.

### Read by hand (B): 84 proposals, plus the lists in the candidates file

Proposals whose reading is plausible but not certain: per-kg on rows whose drug is a FORNAS-only or unknown word (28), a maximum without a sister row holding the dose (35), a frequency range on such rows (15), a drug taken from a quote that states a threshold or reports a study (5), and SP0314 #41 (Permenkes amoksisilin "50 mg … dosis tunggal": the source reads "Amoksisilin 50 mg/kgBB dosis dibagi 3 kali/ hari selama 10 hari"; "dosis tunggal" belongs to penicillin G benzatin). Rows flagged without a proposal: 97 two-word or combination fragments (sulfas ferrosus, selenium sulfida, trimetoprim/sulfametoksazol, isosorbid dinitrat, betahistin dihidroklorida, hyoscine butylbromide), 602 non-drug `obat` rows whose quote does name a drug or carries a dosing word, and 62 class or salt names.

### Clinical decisions (K)

- **K1 Malaria serebral / artesunat 3,2 mg/kg.** SP0194 Malaria Serebral has no dose row (its KMK 1186/2022 text names no drug). PPK IDI 2017 (Malaria, Kriteria Rujukan, p. 42 in the SSOT row) reads "diberi dosis awal Artemisinin atau Artesunat per Intra Muskular atau Intra Vena dengan dosis awal 3,2mg /kg BB"; 3.2 mg/kg is the artemether loading dose, artesunate is 2.4 mg/kg. That sentence is already a rendered row of SP0193 Malaria (#86, "Artesunat 3,2mg /kg BB"), next to the catalogue's "artesunate IV 2.4mg/kg" (#95) and the PNPK's "artesunat 3 mg/kgBB/kali" (#24, children under 20 kg). Options: keep #86 as the guideline wrote it, give it a `catatan` that flags the dose, or remove it; and whether SP0194 gets a pre-referral row.
- **K2 Cefadroxil "2 x 500-100 mg"** (SP0216 #109 PPK IDI 2017, #120 KMK 1186/2022): both guidelines print 500-100 mg; it reads like 500-1000 mg, but no library source says so. Report only unless Gaffer decides.
- **K3 Cefixime** (SP0053 #27): the Permenkes 5/2014 table reads "Anak: 1.5-2 mg/kgbb/hari dibagi 2"; PPK IDI 2017 and KMK 1186/2022 give 20 mg/kgBB/hari.
- **K4 Ceftriaxone ISO** (SP0267 #27): the ISO quote reads "Bayi sampai 14 hari: sekali sehari 2050 mg/kg bb tidak boleh lebih dari 50 mg/kgBB"; another ISO brand row of the same entry reads 20-50 mg/kg. ISO is not in the library, so the source cannot prove the dash.
- **K5 Prednison for urtikaria** (SP0325): PPK IDI 2017, Permenkes and KMK give 60-80 mg/hari; Oracle II and the index document give 20-40 mg/hari.
- **K6 Thalassemia folic acid**: the dose chunk is still not retrieved (two-per-document cap); report only, retrieval is not tuned.
- **K7 Unverifiable rows**: 4,480 rows cannot be checked with this library; they stay as they are unless Gaffer decides otherwise.

Regimen conflicts within one entry (check d). Most are different steps, routes or indications that the sources state, or artefacts of mis-read names that M1/M2 resolve:

| Entry | Drug, population | Sources and doses | Note |
|---|---|---|---|
| SP0013 Anemia pada Kehamilan | besi, dewasa/umum | PPK FKTP: besi elemental 60 mg 3 kali sehari; besi elemental 180 mg per hari / Permenkes 5/2014 PPK: besi 250 μg / katalog SKDI: besi 30-60mg 1x/hari; besi 400mcg 1x/hari | besi 250 μg is the folic acid of the same tablet (M2-0001); folat 400-500 mcg (prevention) vs 2 mg (treatment) are different uses |
| SP0013 Anemia pada Kehamilan | vitam, dewasa/umum | PPK FKTP: vitamin B12 1 x 250 – 1000 μg 1 x / katalog SKDI: vitamin c 250mg / Permenkes 5/2014 PPK: vitamin b 250 – 1000 μg 1 x / KMK 1186/2022 PPK: vitamin b 250 – 1000 μg 1 x | besi 250 μg is the folic acid of the same tablet (M2-0001); folat 400-500 mcg (prevention) vs 2 mg (treatment) are different uses |
| SP0013 Anemia pada Kehamilan | folat, dewasa/umum | katalog SKDI: folat 400-500mcg / Permenkes 5/2014 PPK: folat 2 mg 1 x | besi 250 μg is the folic acid of the same tablet (M2-0001); folat 400-500 mcg (prevention) vs 2 mg (treatment) are different uses |
| SP0015 Angina Pectoris Stabil | aspir, dewasa/umum | PNPK: aspirin 75-100mg; aspirin 75-100mg; aspirin 75-100 mg; aspirin 75-100 mg; Aspirin ≥75 mg/hari; aspirin 75-150 mg/hari; aspirin 75-100mg per hari; Aspirin 75-100mg setiap hari; Aspirin 75-100mg; Aspirin 75-100 mg setiap hari; Aspirin 75-100 mg setiap har… | 75-100 mg maintenance vs 160-320 mg loading: different steps, both in the sources |
| SP0020 Artritis Reumatoid | selekoksib, dewasa/umum | PPK FKTP: celecoxib 200400 mg/sehari / Permenkes 5/2014 PPK: celecoxib 200-400 mg | artefact of the lost dash (M1) |
| SP0022 Askariasis | mebendazol, dewasa/umum | PPK FKTP: Mebendazol 100 mg dua kali sehari / Permenkes 5/2014 PPK: mebendazol 500 mg dosis tunggal / KMK 1186/2022 PPK: mebendazol 100 mg dua kali sehari | two valid regimens (3 days vs single dose) |
| SP0042 COPD (Penyakit Paru Obstruktif Kronik) | salbutamol, dewasa/umum | PNPK: salbutamol 5mg / PPK FKTP: salbutamol 1 mg; salbutamol 1 mg | nebulised 5 mg vs oral/MDI 1 mg: different routes |
| SP0053 Demam Tifoid | sefiksim, anak | PPK FKTP: Sefiksim 20 mg/kgBB/hari dibagi menjadi 2 dosis / Permenkes 5/2014 PPK: cefixime 1.5-2 mg/kgbb / KMK 1186/2022 PPK: sefiksim 20 mg/kgBB/hari | Permenkes 5/2014 table reads "Cefixime Anak: 1.5-2 mg/kgbb/hari"; PPK IDI 2017 and KMK 1186/2022 read 20 mg/kgBB/hari (K3) |
| SP0100 Gangguan Campuran Anxietas Dan Depresi | fluokset, dewasa/umum | PPK FKTP: fluoksetin 1x1020 mg/hari 1x / Permenkes 5/2014 PPK: fluoksetin 10-20 mg 1x / KMK 1186/2022 PPK: fluoksetin 10-20 mg 1 x | artefact of the lost dash (M1) |
| SP0115 Herpes Simplex (Herpes) | asiklovir, dewasa/umum | PPK FKTP: Asiklovir 5 x 200 mg/hari 5 x / katalog SKDI: asiklovir 400mg 3x/hari; asiklovir 2g 2x/hari; asiklovir 400mg 2x/hari | different indications (first episode vs recurrent/suppressive) |
| SP0124 Hipertensi Esensial | kaptopril, dewasa/umum | PPK FKTP: captopril 3x12,5-50 mg/hari 3x / Permenkes 5/2014 PPK: captopril 25-100 mg 2 x | different schedules in the sources |
| SP0127 Hiperurisemia | prednison, dewasa/umum | PPK FKTP: prednisone 2-3x5 mg/hari 2-3x / katalog SKDI: prednison 30-35mg | low-dose maintenance vs flare course |
| SP0139 Infeksi Saluran Kemih (ISK) | ofloksas, dewasa/umum | PNPK: Ofloxacin 400 mg; Ofloxacin 200 mg 2 kali; Ofloxacin 300mg dua kali sehari / katalog SKDI: ofloxacin 500mg 2x/hari | different ISK forms in the PNPK vs the catalogue |
| SP0177 Kusta | klofazim, dewasa/umum | KMK 1186/2022 PPK: klofazimin 100 mg / katalog SKDI: clofazimin 300mg; clofazimin 50mg | monthly supervised vs daily doses of the MDT |
| SP0193 Malaria | artesunat, dewasa/umum | PNPK: artesunat 60 mg; artesunat 60 mg; artesunat 3 mg/kgBB/kali / PPK FKTP: Artesunat 3,2mg /kg BB / katalog SKDI: artesunat 2.4mg/kg 1x/hari | artesunat 3,2 mg/kgBB (PPK IDI 2017, pre-referral) vs 2.4 mg/kg (catalogue): K1 |
| SP0245 Pneumonia Komuniti | amoksisil, dewasa/umum | PNPK: amoksisilin 1000 mg 3x / katalog SKDI: amoksisilin 500mg 3x/hari / PPK FKTP: Amoksisilin 1 gram, 3x1/hari 3x1/hari | partly an artefact of mis-read names (#234, #235 are siprofloksasin/levofloksasin, M2); amoksisilin 500 vs 1000 mg are different severities |
| SP0245 Pneumonia Komuniti | amoksisil, anak | PPK FKTP: amoksisilin 25 mg/kgBB dua kali sehari / katalog SKDI: amoksisilin 40-50mg/kg/hari 3x/hari | partly an artefact of mis-read names (#234, #235 are siprofloksasin/levofloksasin, M2); amoksisilin 500 vs 1000 mg are different severities |
| SP0245 Pneumonia Komuniti | ofloksas, dewasa/umum | Permenkes 5/2014 PPK: ofloksasin 500 mg 2x / KMK 1186/2022 PPK: ofloksasin 750 mg | partly an artefact of mis-read names (#234, #235 are siprofloksasin/levofloksasin, M2); amoksisilin 500 vs 1000 mg are different severities |
| SP0283 Skizofrenia | aripiprazol, dewasa/umum | PNPK: Aripiprazol 400 mg; Aripiprazol 1,6 mL / katalog SKDI: aripiprazole 10-30mg; aripiprazole 300-900mg | long-acting injection vs oral doses |
| SP0283 Skizofrenia | olanzap, dewasa/umum | PNPK: Olanzapin 150mg; Olanzapin 300 mg / katalog SKDI: olanzapin 5-20mg | long-acting injection vs oral doses |
| SP0300 Tetanus | diazepam, dewasa/umum | PPK FKTP: diazepam 0,5 mg/kgBB/kali diulang setiap kali kejang; diazepam 240 mg/hari; diazepam 480 mg/hari / katalog SKDI: diazepam 10mg; diazepam 100-400mg / Oracle II: diazepam 100-300 mg / dokumen index: diazepam 100-300 mg / Permenkes 5/2014 PPK: diazepam… | 240/480 mg/hari are daily maximums in PPK IDI 2017; 10 mg a single dose |
| SP0314 Tonsilitis Akut | amoksisil, dewasa/umum | PPK FKTP: Amoksisilin 50 mg/kgBB dosis dibagi 3 kali/hari; Amoksisilin 3 x 500 mg 3 x / Permenkes 5/2014 PPK: amoksisilin 50 mg dosis tunggal / katalog SKDI: amoksisilin 500mg 3x/hari | Permenkes amoksisilin "50 mg" lost its /kgBB (B); eritromisin per-kg per dose vs per day |
| SP0314 Tonsilitis Akut | eritromis, dewasa/umum | PNPK: eritromisin 40 mg/kgbb 4 kali; eritromisin 40 mg/kgbb 4 kali / Permenkes 5/2014 PPK: eritromisin 500 mg 4x; eritromisin 25-50 mg/kgBB/hari | Permenkes amoksisilin "50 mg" lost its /kgBB (B); eritromisin per-kg per dose vs per day |
| SP0320 Tuberkulosis Paru | pirazinamid, dewasa/umum | PNPK: pirazinamid 750 mg; pirazinamid 1500 mg; pirazinamid 2000 mg; pirazinamid 25 mg/kgBB 3x; Pyrazinamide 1,5 g sekali sehari; Pyrazinamide 25-35 mg/kg sekali sehari; pirazinamid 1 gram / PPK FKTP: Pirazinamid 25 mg (20-30 mg)/ Kg BB Dosis Harian; Pirazinam… | PNPK fixed doses vs per-kg table |
| SP0320 Tuberkulosis Paru | rifampis, dewasa/umum | PNPK: rifampisin 450 mg; rifampisin 75 mg; rifampisin 300 mg / PPK FKTP: Rifampicin 10 (8-12) max 600 mg/hr Harian; Rifampicin 10 (8-12) max 600 mg/dosis 3x/minggu; Rifampisin 10 mg (8-12 mg)/ Kg BB Dosis Harian | PNPK fixed doses vs per-kg table |
| SP0325 Urtikaria Akut | prednison, dewasa/umum | PPK FKTP: prednison 60-80 mg/hari; Prednison 60-80 mg mg per hari dalam 3 kali pemberian / Oracle II: prednison 20-40 mg / dokumen index: prednison 20-40 mg / Permenkes 5/2014 PPK: prednison 60-80 mg 3 kali / KMK 1186/2022 PPK: prednison 60-80 mg; prednison 6… | PPK 60-80 mg/hari vs Oracle II/index 20-40 mg/hari: K5 |
| SP0329 Varisela (Cacar Air) | asiklovir, dewasa/umum | PPK FKTP: Asiklovir 5 x 800 mg/hari / Permenkes 5/2014 PPK: asiklovir 1000 mg 3 x / KMK 1186/2022 PPK: asiklovir 1000 mg 3 x / Oracle II: asiklovir 800 mg 5 x / dokumen index: asiklovir 800 mg 5 x | artefact: the 1000 mg 3x rows are valasiklovir (M2) |
| SP0331 Vertigo Posisi Paroksismal Jinak (BPPV) | bet, dewasa/umum | Oracle II: beta 6-12 mg 2 x 24 mg / katalog SKDI: beta 16-24mg 3x/hari / dokumen index: beta 6-12 mg 2 x 24 mg | artefact: "beta" rows are betahistin (M2) |

## Proposal tables

Quotes are cut at 140 characters; the full row is in the candidates file.

#### M1 (23)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M1-0001 | SP0006 #1 | dosis | 25% | 2-5% | Bahan iritan yang dapat mengelupas kulit (peeling), misalnya sulfur (4-8), resorsinol (1-5%), asam salisilat (25%) |
| M1-0002 | SP0006 #1 | kutipan | Bahan iritan yang dapat mengelupas kulit (peeling), misalny… | Bahan iritan yang dapat mengelupas kulit (peeling), misalnya sulfur (4-8), reso… | Bahan iritan yang dapat mengelupas kulit (peeling), misalnya sulfur (4-8), resorsinol (1-5%), asam salisilat (25%) |
| M1-0003 | SP0020 #2 | dosis | 200400 mg/sehari | 200-400 mg/sehari | meloksikam 7,5–15 mg/hari, celecoxib 200400 mg/sehari. |
| M1-0004 | SP0020 #2 | kutipan | meloksikam 7,5–15 mg/hari, celecoxib 200400 mg/sehari. | meloksikam 7,5–15 mg/hari, celecoxib 200-400 mg/sehari. | meloksikam 7,5–15 mg/hari, celecoxib 200400 mg/sehari. |
| M1-0005 | SP0083 #0 | dosis | 100.000400.000 IU | 100.000-400.000 IU | faringitis fungal diberikan Nistatin 100.000400.000 IU, 2 x/hari. Untuk faringitis |
| M1-0006 | SP0083 #0 | kutipan | faringitis fungal diberikan Nistatin 100.000400.000 IU, 2 x… | faringitis fungal diberikan Nistatin 100.000-400.000 IU, 2 x/hari. Untuk faring… | faringitis fungal diberikan Nistatin 100.000400.000 IU, 2 x/hari. Untuk faringitis |
| M1-0007 | SP0100 #0 | dosis | 1x1020 mg/hari | 1x10-20 mg/hari | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin 1x12,5-50 mg/ hari atau imipramin1-2x10-25 mg/hari. |
| M1-0008 | SP0100 #0 | kutipan | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari… | fluoksetin 1x10-20 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin … | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin 1x12,5-50 mg/ hari atau imipramin1-2x10-25 mg/hari. |
| M1-0009 | SP0100 #1 | kutipan | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari… | fluoksetin 1x10-20 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin … | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin 1x12,5-50 mg/ hari atau imipramin1-2x10-25 mg/hari. |
| M1-0010 | SP0100 #2 | kutipan | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari… | fluoksetin 1x10-20 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin … | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin 1x12,5-50 mg/ hari atau imipramin1-2x10-25 mg/hari. |
| M1-0011 | SP0100 #3 | kutipan | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari… | fluoksetin 1x10-20 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin … | fluoksetin 1x1020 mg/hari atau sertralin 1 x 25-50 mg/ hari atau amitriptilin 1x12,5-50 mg/ hari atau imipramin1-2x10-25 mg/hari. |
| M1-0012 | SP0173 #1 | dosis | 0,51% | 0,5-1% | Pada konjungtivitis gonore: Kloramfenikol tetes mata 0,51%sebanyak 1 tetes tiap jam |
| M1-0013 | SP0173 #1 | kutipan | Pada konjungtivitis gonore: Kloramfenikol tetes mata 0,51%s… | Pada konjungtivitis gonore: Kloramfenikol tetes mata 0,5-1%sebanyak 1 tetes tia… | Pada konjungtivitis gonore: Kloramfenikol tetes mata 0,51%sebanyak 1 tetes tiap jam |
| M1-0014 | SP0190 #2 | dosis | 2-3 x 2550 mg/hari | 2-3 x 25-50 mg/hari | natrium diklofenak 2-3 x 2550 mg/hari pada keluhan artritis, artralgia dan mialgia. |
| M1-0015 | SP0190 #2 | kutipan | natrium diklofenak 2-3 x 2550 mg/hari pada keluhan artritis… | natrium diklofenak 2-3 x 25-50 mg/hari pada keluhan artritis, artralgia dan mia… | natrium diklofenak 2-3 x 2550 mg/hari pada keluhan artritis, artralgia dan mialgia. |
| M1-0016 | SP0241 #4 | dosis | 3 x 250500 mg/hari | 3 x 250-500 mg/hari | kloksasilin. Dosis dewasa: 3 x 250500 mg/hari, selama 5-7 hari, selama 5-7 hari. Dosis anak: 50 mg/kgBB/hari terbagi dalam 4 dosis, selama … |
| M1-0017 | SP0241 #4 | kutipan | kloksasilin. Dosis dewasa: 3 x 250500 mg/hari, selama 5-7 h… | kloksasilin. Dosis dewasa: 3 x 250-500 mg/hari, selama 5-7 hari, selama 5-7 har… | kloksasilin. Dosis dewasa: 3 x 250500 mg/hari, selama 5-7 hari, selama 5-7 hari. Dosis anak: 50 mg/kgBB/hari terbagi dalam 4 dosis, selama … |
| M1-0018 | SP0241 #5 | kutipan | kloksasilin. Dosis dewasa: 3 x 250500 mg/hari, selama 5-7 h… | kloksasilin. Dosis dewasa: 3 x 250-500 mg/hari, selama 5-7 hari, selama 5-7 har… | kloksasilin. Dosis dewasa: 3 x 250500 mg/hari, selama 5-7 hari, selama 5-7 hari. Dosis anak: 50 mg/kgBB/hari terbagi dalam 4 dosis, selama … |
| M1-0019 | SP0241 #8 | kutipan | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisny… | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisnya 4 x 300-450 mg per… | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisnya 4 x 300450 mg per hari. |
| M1-0020 | SP0241 #9 | dosis | 4 x 300450 mg per hari | 4 x 300-450 mg per hari | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisnya 4 x 300450 mg per hari. |
| M1-0021 | SP0241 #9 | kutipan | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisny… | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisnya 4 x 300-450 mg per… | Klindamisin 4 x 150 mg per hari, pada infeksi berat dosisnya 4 x 300450 mg per hari. |
| M1-0022 | SP0301 #8 | dosis | 30006000 IU | 3000-6000 IU | Bila tersedia dapat diberikan HTIG 30006000 IU IM |
| M1-0023 | SP0301 #8 | kutipan | Bila tersedia dapat diberikan HTIG 30006000 IU IM | Bila tersedia dapat diberikan HTIG 3000-6000 IU IM | Bila tersedia dapat diberikan HTIG 30006000 IU IM |

#### M2 (90)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M2-0001 | SP0013 #11 | obat | besi | asam folat | tambah darah yang berisi 60 mg besi elemental dan 250 μg asam folat. |
| M2-0002 | SP0013 #13 | obat | vitamin b | vitamin B12 | vitamin B12 1 x 250 – 1000 μg |
| M2-0003 | SP0013 #15 | obat | vitamin b | vitamin B12 | x 2 mg dan vitamin B12 1 x 250 – 1000 μg |
| M2-0004 | SP0014 #229 | obat | epinefrin | Norepinefrin | a) Norepinefrin 0,01-3,0 mcg/kg/menit |
| M2-0005 | SP0034 #0 | obat | ofloxacin | ciprofloxacin | Antibiotik: amoksisilin-klavulanat untuk eksaserbasi (7-14 hari), atau ciprofloxacin 500mg 2x/hari 14 hari (bila Pseudomonas). |
| M2-0006 | SP0037 #1 | obat | acyclovir | Valacyclovir | Valacyclovir 1g 3x/hari. |
| M2-0007 | SP0050 #0 | obat | loperidol | Haloperidol | agitasi, yaitu: Haloperidol injeksi 2-5 mg IntraMuskular (IM)/ IntraVena |
| M2-0008 | SP0050 #1 | obat | loperidol | Haloperidol | psikosis dan atau agitasi, yaitu: Haloperidol injeksi 2-5 mg |
| M2-0009 | SP0053 #15 | obat | ofloksasin | siprofloksasin | Antibiotik: azitromycin 500mg 1x/hari 7 hari (lini pertama Indonesia - efektif dan aman), atau seftriakson 2g IV 1x/hari 10-14 hari (untuk … |
| M2-0010 | SP0053 #20 | obat | ofloksasin | Siprofloksasin | - Siprofloksasin: 2 x 500 mg oral selama 7-10 hari (lini pertama dewasa non-hamil). |
| M2-0011 | SP0053 #26 | obat | ofloxacin | Ciprofloxacin | Quinolone Ciprofloxacin 2x500 mg selama 1 Pefloxacin dan Fleroxacin lebih cepat |
| M2-0012 | SP0053 #30 | obat | ofloxacin | Ciprofloxacin | Kuinolon Ciprofloxacin 2x500 mg |
| M2-0013 | SP0053 #34 | obat | ofloksasin | Siprofloksasin | - Siprofloksasin: 2 x 500 mg oral selama 7-10 hari (lini pertama dewasa non-hamil). |
| M2-0014 | SP0054 #6 | obat | loperidol | Haloperidol | rendah, seperti: Haloperidol 0,5 – 1 mg/hari. |
| M2-0015 | SP0054 #7 | obat | loperidol | Haloperidol | dosis rendah, seperti Haloperidol 0,5 – 1 mg/hari. |
| M2-0016 | SP0068 #2 | obat | ofloxacin | ciprofloxacin | Antibiotik: azitromycin 500mg hari 1, 250mg hari 2-5 (untuk disentri bakteri umum), ciprofloxacin 500mg 2x/hari 3 hari (bila tersedia dan t… |
| M2-0017 | SP0070 #0 | obat | ofloksasin | Siprofloksasin | - Siprofloksasin 2 x 500 mg oral selama 3-5 hari (dewasa). |
| M2-0018 | SP0070 #4 | obat | ofloksasin | Siprofloksasin | - Siprofloksasin 2 x 500 mg oral selama 3-5 hari (dewasa). |
| M2-0019 | SP0074 #3 | obat | prednisolon | methylprednisolone | Kortikosteroid sistemik: prednison 40-60mg/hari 5-7 hari (atau methylprednisolone 125mg IV untuk berat). |
| M2-0020 | SP0078 #5 | obat | agno | AgNO3 | - Kauterisasi kimiawi lidi kapas Perak Nitrat (AgNO3) 20-30% pada titik perdarahan yang teridentifikasi. |
| M2-0021 | SP0078 #12 | obat | agno | AgNO3 | - Kauterisasi kimiawi lidi kapas Perak Nitrat (AgNO3) 20-30% pada titik perdarahan yang teridentifikasi. |
| M2-0022 | SP0079 #3 | obat | oksasilin | Kloksasilin | - Amoksisilin-Klavulanat 3 x 625 mg oral, atau Kloksasilin 4 x 500 mg oral, atau Sefadroksil 2 x 500 mg oral selama 10-14 hari. |
| M2-0023 | SP0079 #11 | obat | oksasilin | Kloksasilin | - Amoksisilin-Klavulanat 3 x 625 mg oral, atau Kloksasilin 4 x 500 mg oral, atau Sefadroksil 2 x 500 mg oral selama 10-14 hari. |
| M2-0024 | SP0079 #17 | obat | oksasilin | dikloksasilin | Ringan (tidak demam, komorbid): dikloksasilin 500mg 4x/hari 7-10 hari, atau sefaleksin 500mg 4x/hari 7-10 hari, atau amoksisilin 500mg 3x/h… |
| M2-0025 | SP0094 #2 | obat | oksasilin | Kloksasilin | - Kloksasilin 4 x 500 mg oral, atau Amoksisilin-Klavulanat 3 x 625 mg oral, atau Sefadroksil 2 x 500 mg oral selama 7 hari. |
| M2-0026 | SP0094 #7 | obat | oksasilin | Kloksasilin | - Kloksasilin 4 x 500 mg oral, atau Amoksisilin-Klavulanat 3 x 625 mg oral, atau Sefadroksil 2 x 500 mg oral selama 7 hari. |
| M2-0027 | SP0103 #11 | obat | loperidol | Haloperidol | Berikan obat antipsikotik: Haloperidol 2-3 x 2-5 mg/hari atau |
| M2-0028 | SP0103 #14 | obat | loperidol | haloperidol | intra muskular haloperidol kerja cepat (short acting) 5 mg, dapat |
| M2-0029 | SP0103 #17 | obat | loperidol | haloperidol | antipsikotik seperti haloperidol decanoas 50 mg atau fluphenazine |
| M2-0030 | SP0103 #21 | obat | loperidol | Haloperidol | 1) Berikan obat antipsikotik: Haloperidol 2-3 x 2-5 mg/hari |
| M2-0031 | SP0103 #25 | obat | loperidol | haloperidol | panjang) antipsikotik seperti haloperidol decanoas 50 mg |
| M2-0032 | SP0106 #26 | obat | ofloxacin | Ciprofloxacin | Antibiotik: Hanya bila terbukti diare invasif/bakteri (Kotrimoksazol atau Ciprofloxacin 2 x 500 mg oral 3-5 hari). |
| M2-0033 | SP0106 #28 | obat | ofloxacin | ciprofloxacin | Golongan kuinolon yaitu ciprofloxacin 2 x 500 mg/hari selama 5-7 hari, |
| M2-0034 | SP0106 #37 | obat | ofloksasin | Siprofloksasin | Golongan kuinolonyaitu Siprofloksasin 2 x 500 mg/hari selama |
| M2-0035 | SP0106 #52 | obat | ofloxacin | Ciprofloxacin | Antibiotik: Hanya bila terbukti diare invasif/bakteri (Kotrimoksazol atau Ciprofloxacin 2 x 500 mg oral 3-5 hari). |
| M2-0036 | SP0116 #12 | obat | asiklovir | Valasiklovir | Valasiklovir: dewasa 3 x 1000 mg/hari. |
| M2-0037 | SP0116 #16 | obat | asiklovir | Valasiklovir | 2) Valasiklovir: dewasa 3 x 1000 mg/hari. |
| M2-0038 | SP0120 #14 | obat | vitamin b | vitamin B6 | Outpatient: dietary modification, vitamin B6 10-25mg 3x/hari, doxylamine 12,5mg HS. |
| M2-0039 | SP0120 #15 | obat | vitamin b | vitamin B6 | Outpatient: dietary modification, vitamin B6 10-25mg 3x/hari, doxylamine 12,5mg HS. |
| M2-0040 | SP0130 #37 | obat | asiklovir | valasiklovir | a) valasiklovir 2x500mg/hari, per oral, selama 10 hari |
| M2-0041 | SP0130 #39 | obat | asiklovir | valasiklovir | a) valasiklovir 2x500 mg/hari, per oral, selama 5 hari |
| M2-0042 | SP0130 #42 | obat | asiklovir | valasiklovir | o valasiklovir 2x500mg/hari, per oral, selama 10 hari |
| M2-0043 | SP0130 #44 | obat | asiklovir | valasiklovir | o valasiklovir 2x500 mg/hari, per oral, selama 5 hari |
| M2-0044 | SP0130 #62 | obat | asiklovir | valasiklovir | atau valasiklovir 500-1000 mg tablet 2-3 kali sehari. |
| M2-0045 | SP0131 #5 | obat | tetrasiklin | Oksitetrasiklin | - Kloramfenikol 1% salep mata atau Oksitetrasiklin 1% salep mata dioleskan 3 kali sehari pada lesi selama 5-7 hari. |
| M2-0046 | SP0131 #12 | obat | tetrasiklin | Oksitetrasiklin | - Kloramfenikol 1% salep mata atau Oksitetrasiklin 1% salep mata dioleskan 3 kali sehari pada lesi selama 5-7 hari. |
| M2-0047 | SP0139 #136 | obat | ofloxacin | ciprofloxacin | Pielonefritis: ciprofloxacin 500mg 2x/hari 7 hari, atau seftriakson 1g IM/IV 1x/hari 10-14 hari. |
| M2-0048 | SP0150 #77 | obat | loperamid | Metokloperamid | Gastroparesis Metokloperamid 4x5–10mg (p.o), |
| M2-0049 | SP0152 #18 | obat | vitamin d | vitamin D3 | b) Suplementasi vitamin D3 Sebesar 800-1000 IU/hari |
| M2-0050 | SP0152 #20 | obat | vitamin d | vitamin D3 | kalsium (1.200mg/hari) dan vitamin D3 (800-1.000 IU/hari) bagi pria |
| M2-0051 | SP0170 #4 | obat | ofloksasin | Siprofloksasin | - Siprofloksasin 1 gram oral dosis tunggal atau Azitromisin 1 gram oral dosis tunggal (alternatif lini pertama untuk anak dan wanita hamil). |
| M2-0052 | SP0170 #10 | obat | ofloksasin | Siprofloksasin | - Siprofloksasin 1 gram oral dosis tunggal atau Azitromisin 1 gram oral dosis tunggal (alternatif lini pertama untuk anak dan wanita hamil). |
| M2-0053 | SP0178 #3 | obat | penisilin | Benzilpenisilin | Benzilpenisilin 1,2 gram IV Setiap 4 jam |
| M2-0054 | SP0193 #113 | obat | perak | Piperakuin | Piperakuin = 16-32 mg/kgBB (dosis tunggal), Primakuin = |
| M2-0055 | SP0196 #45 | obat | vitamin b | vitamin B2 | folat 5 mg, vitamin B2 50 mg, vitamin B6 50 |
| M2-0056 | SP0196 #46 | obat | vitamin b | vitamin B12 | mg, vitamin B12 0.4 mg), vitamin C 500 |
| M2-0057 | SP0197 #5 | obat | ofloxacin | Ciprofloxacin | Ciprofloxacin: 500 mg, 2x sehari; |
| M2-0058 | SP0197 #9 | obat | oksasilin | Kloksasilin | 1) Kloksasilin 500 mg per oral per 6 jam selama 10-14 hari |
| M2-0059 | SP0208 #35 | obat | vitamin b | Vitamin B1 | 1) Vitamin B1 : setidaknya 12 mg/ hari. |
| M2-0060 | SP0208 #36 | obat | vitamin b | Vitamin B12 | 2) Vitamin B12 : 350−500 µg/ hari via oral, atau 1000 µg/ |
| M2-0061 | SP0208 #37 | obat | vitamin b | Vitamin B12 | 2) Vitamin B12 : 350−500 µg/ hari via oral, atau 1000 µg/ |
| M2-0062 | SP0212 #62 | obat | vitamin d | vitamin D3 | Kalsium 1000-1200mg/hari + vitamin D3 800-1000 IU/hari (semua pasien). |
| M2-0063 | SP0213 #14 | obat | loperamid | Metokloperamid | Metokloperamid 4 x 5–10 mg (p.o), |
| M2-0064 | SP0216 #118 | obat | ofloxacin | Ciprofloxacin | atauCiprofloxacin 2 x 500 mg selama 7 hari. |
| M2-0065 | SP0216 #119 | obat | ofloxacin | Levofloxacin | (2) Lini kedua : Levofloxacin 1 x 500 mg per hari |
| M2-0066 | SP0221 #61 | obat | vitamin b | vitamin B1 | Dosis vitamin B1 sebesar 1,1–1,2 mg/hari, |
| M2-0067 | SP0221 #62 | obat | vitamin b | vitamin B2 | vitamin B2 sebesar 1,1–1,3 mg/hari, vitamin B3 sebesar 14–16 |
| M2-0068 | SP0233 #7 | obat | omeprazol | esomeprazole | Formulasi oral (misalnya esomeprazole 40 mg secara oral |
| M2-0069 | SP0233 #21 | obat | omeprazol | esomeprazole | esomeprazole: <40 kg: 0,5 – 1 mg/kg BB/hari 1-2 x |
| M2-0070 | SP0244 #12 | obat | ofloksasin | levofloksasin | 1) Pneumonia komunitas : levofloksasin (500 mg/hari) atau |
| M2-0071 | SP0244 #18 | obat | ofloksasin | siprofloksasin | siprofloksasin (400 mg/12 jam) atau seftriakson (1-2 |
| M2-0072 | SP0245 #234 | obat | ofloksasin | siprofloksasin | • Fluorokuinolon respirasi: siprofloksasin 2x500 mg/hari. |
| M2-0073 | SP0245 #235 | obat | ofloksasin | levofloksasin | levofloksasin (750 mg) (rekomendasi kuat) |
| M2-0074 | SP0256 #7 | obat | hidroksi | hidroksizin | Antihistamin sistemik golongan sedatif: misalnya hidroksizin 2x25 mg |
| M2-0075 | SP0263 #6 | obat | agno | AgNO3 | AgNO3 25% atau trikloroasetat pekat. |
| M2-0076 | SP0283 #122 | obat | loperidol | haloperidol | Antipsikotik: first-generation (haloperidol 5-20mg, fluphenazine - high EPS risk) atau second-generation (risperidone 2-6mg, olanzapine 5-2… |
| M2-0077 | SP0284 #22 | obat | vitamin b | Vitamin B1 | Vitamin B1 1,1-1,2 mg Fosfor 700-1250 mg |
| M2-0078 | SP0284 #23 | obat | vitamin b | Vitamin B1 | Vitamin B1 1,1-1,2 mg Fosfor 700-1250 mg |
| M2-0079 | SP0284 #24 | obat | vitamin b | Vitamin B2 | Vitamin B2 1-1,3 mg Seng 8-11 mg |
| M2-0080 | SP0284 #25 | obat | vitamin b | Vitamin B2 | Vitamin B2 1-1,3 mg Seng 8-11 mg |
| M2-0081 | SP0303 #58 | obat | vitamin k | vitamin K1 | pemberian vitamin K1 1 mg IM maupun PO dilaporkan mengurangi |
| M2-0082 | SP0325 #14 | obat | hidroksi | Hidroksizin | Bila tidak berhasil dikombinasi dengan Hidroksizin 3 x 25 mg atau |
| M2-0083 | SP0329 #8 | obat | asiklovir | Valasiklovir | Valasiklovir: dewasa 3 x 1000 mg/hari. |
| M2-0084 | SP0329 #11 | obat | asiklovir | Valasiklovir | 2) Valasiklovir: dewasa 3 x 1000 mg/hari. |
| M2-0085 | SP0329 #16 | obat | acyclovir | Valacyclovir | Valacyclovir 1g 3x/hari 5 hari (dewasa - better bioavailability). |
| M2-0086 | SP0331 #1 | obat | beta | Betahistin | - Betahistin mesilat 3 x 6-12 mg atau Betahistin dihidroklorida 2 x 24 mg oral. |
| M2-0087 | SP0331 #6 | obat | beta | Betahistin | - Betahistin mesilat 3 x 6-12 mg atau Betahistin dihidroklorida 2 x 24 mg oral. |
| M2-0088 | SP0331 #20 | obat | beta | betahistine | Meniere: diet rendah garam (<1.5g/hari), diuretik (HCTZ-triamterene), betahistine 16-24mg 3x/hari, intratympanic gentamicin untuk refrakter. |
| M2-0089 | SP0332 #5 | obat | agno | AgNO3 | misalnya dengan asam salisilat 20% - 40%, larutan AgNO3 25%. |
| M2-0090 | SP0332 #6 | obat | agno | AgNO3 | misalnya dengan larutan AgNO3 25%, asam trikloroasetat 50% |

#### M3 (30)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M3-0001 | SP0014 #284 | obat | Persiapan obat | Heparin | Persiapan obat meliputi Heparin bolus 5000 unit |
| M3-0002 | SP0026 #5 (not rendered) | obat | kgbb | Prednison | - Prednison: 60 mg/hari oral (1 mg/kgBB/hari) selama 5 hari, dilanjutkan tapering off 10 mg per hari selama 5 hari berikutnya (total durasi… |
| M3-0003 | SP0026 #17 (not rendered) | obat | kgbb | Prednison | - Prednison: 60 mg/hari oral (1 mg/kgBB/hari) selama 5 hari, dilanjutkan tapering off 10 mg per hari selama 5 hari berikutnya (total durasi… |
| M3-0004 | SP0111 #8 | obat | Mual | Metoklopropamid | Mual : Antiemetik seperti Metoklopropamid 3x10 mg/hari atau |
| M3-0005 | SP0112 #19 | obat | Penggunaan adefovir | adefovir | Penggunaan adefovir 10 mg/hari juga tidak menimbulkan |
| M3-0006 | SP0112 #111 | obat | Mual | Metoklopropamid | Mual : Antiemetik seperti Metoklopropamid 3x10 mg/hari atau |
| M3-0007 | SP0113 #44 (not rendered) | obat | Pasien mendapat | sofosbuvir | Pasien mendapat sofosbuvir 400 mg sekali sehari dan |
| M3-0008 | SP0127 #5 | obat | rendah | Allupurinol | akut).Pemberian Allupurinol dimulai dari dosis terendah, 100mg, |
| M3-0009 | SP0128 #23 (not rendered) | obat | sebanyak | dekstrose | Diberikan larutan dekstrose 40% sebanyak 2 flakon (=50 mL) |
| M3-0010 | SP0139 #75 | obat | Standard Azyromycin | Azyromycin | Standard Azyromycin 0.5g per oral hari 1, 250mg per oral day |
| M3-0011 | SP0139 #76 | obat | Standard Azyromycin | Azyromycin | Standard Azyromycin 0.5g per oral hari 1, 250mg per oral day |
| M3-0012 | SP0139 #78 | obat | Standar Doxycycline | Doxycycline | Standar Doxycycline 100mg, 2 kali sehari per oral selama 7 |
| M3-0013 | SP0182 #30 (not rendered) | obat | Minggu | siklofosfamid | o Minggu ke-24–26: siklofosfamid 1.000 mg/m2 |
| M3-0014 | SP0193 #118 | obat | menjadi | primakuin | primakuin ditingkatkan menjadi 0,5 mg/kgBB/hari. |
| M3-0015 | SP0219 #1 (not rendered) | obat | kgbb | Parasetamol | - Analgesik-antipiretik: Parasetamol 10-15 mg/kgBB/kali pada anak atau 500 mg 3-4x/hari pada dewasa; |
| M3-0016 | SP0219 #4 (not rendered) | obat | kgbb | Parasetamol | - Analgesik-antipiretik: Parasetamol 10-15 mg/kgBB/kali pada anak atau 500 mg 3-4x/hari pada dewasa; |
| M3-0017 | SP0223 #54 (not rendered) | obat | Mulai infus | heparin | c) Mulai infus heparin dengan kecepatan 10-20 unit/kg/jam. |
| M3-0018 | SP0223 #56 | obat | Bolus heparin | heparin | (d) Bolus heparin 500 unit dalam 30 menit. |
| M3-0019 | SP0239 #1 (not rendered) | obat | kgbb | Azitromisin | - Azitromisin: 10 mg/kgBB/hari oral dosis tunggal pada hari ke-1 (maks 500 mg), dilanjutkan 5 mg/kgBB/hari pada hari 2-5 (maks 250 mg). |
| M3-0020 | SP0239 #2 (not rendered) | obat | kgbb | Azitromisin | - Azitromisin: 10 mg/kgBB/hari oral dosis tunggal pada hari ke-1 (maks 500 mg), dilanjutkan 5 mg/kgBB/hari pada hari 2-5 (maks 250 mg). |
| M3-0021 | SP0239 #3 (not rendered) | obat | kgbb | Azitromisin | - Azitromisin: 10 mg/kgBB/hari oral dosis tunggal pada hari ke-1 (maks 500 mg), dilanjutkan 5 mg/kgBB/hari pada hari 2-5 (maks 250 mg). |
| M3-0022 | SP0239 #10 (not rendered) | obat | kgbb | Azitromisin | - Azitromisin: 10 mg/kgBB/hari oral dosis tunggal pada hari ke-1 (maks 500 mg), dilanjutkan 5 mg/kgBB/hari pada hari 2-5 (maks 250 mg). |
| M3-0023 | SP0239 #11 (not rendered) | obat | kgbb | Azitromisin | - Azitromisin: 10 mg/kgBB/hari oral dosis tunggal pada hari ke-1 (maks 500 mg), dilanjutkan 5 mg/kgBB/hari pada hari 2-5 (maks 250 mg). |
| M3-0024 | SP0239 #12 (not rendered) | obat | kgbb | Azitromisin | - Azitromisin: 10 mg/kgBB/hari oral dosis tunggal pada hari ke-1 (maks 500 mg), dilanjutkan 5 mg/kgBB/hari pada hari 2-5 (maks 250 mg). |
| M3-0025 | SP0245 #191 | obat | Aureus Vankomisin | Vankomisin | Aureus Vankomisin 15 mg/kg BB/12 jam |
| M3-0026 | SP0255 #9 (not rendered) | obat | spuit | adrenalin | intravenous setelah 0,1 – 0,2 ml adrenalin dilarutkan dalam spuit 10 ml |
| M3-0027 | SP0299 #5 (not rendered) | obat | hingga | Amitriptilin | - Amitriptilin 10-25 mg oral malam hari sebelum tidur, titrasi bertahap hingga 50-75 mg/hari. |
| M3-0028 | SP0299 #17 (not rendered) | obat | hingga | Amitriptilin | - Amitriptilin 10-25 mg oral malam hari sebelum tidur, titrasi bertahap hingga 50-75 mg/hari. |
| M3-0029 | SP0320 #60 | obat | Suplementasi piridoksin | piridoksin | Suplementasi piridoksin (5-10 mg/hari) |
| M3-0030 | SP0327 #13 | obat | Tinjau | tinidazole | Tinjau: tinidazole 2g dosis tunggal. |

#### M4 (44)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M4-0001 | SP0014 #2 | dosis | 25-100 mcg | 25-100 mcg/kgBB/menit | Propofol dapat diberikan 25-100 mcg/kgBB/menit. |
| M4-0002 | SP0014 #82 | dosis | 150 µg | 150 µg/kgBB | µg/kgBB dan deksametason intravena 150 µg/kgBB. |
| M4-0003 | SP0014 #85 | dosis | 25-50 µg | 25-50 µg/kgBB | Morfin 25-50 µg/kgBB per 6 jam pada anak usia <1 |
| M4-0004 | SP0014 #86 | dosis | 1-2 µg | 1-2 µg/kgBB | Fentanil 1-2 µg/kgBB per 4 jam |
| M4-0005 | SP0014 #229 | dosis | 0,01-3,0 mcg | 0,01-3,0 mcg/kg/menit | a) Norepinefrin 0,01-3,0 mcg/kg/menit |
| M4-0006 | SP0014 #230 | dosis | 0,05-0,3 mcg | 0,05-0,3 mcg/kg/menit | b) Epinefrin 0,05-0,3 mcg/kg/menit |
| M4-0007 | SP0014 #231 | dosis | 1-20 mcg | 1-20 mcg/kg/menit | c) Dopamin 1-20 mcg/kg/menit |
| M4-0008 | SP0014 #232 | dosis | 1-20 mcg | 1-20 mcg/kg/menit | d) Dobutamin 1-20 mcg/kg/menit |
| M4-0009 | SP0022 #8 | dosis | 10 mg | 10 mg /kg BB | Pirantel pamoat 10 mg /kg BB, dosis tunggal, atau |
| M4-0010 | SP0040 #31 | dosis | 0,5 – 1 mcg | 0,5 – 1 mcg/Kg BB | d) Fentanyl 0,5 – 1 mcg/Kg BB. |
| M4-0011 | SP0040 #42 | dosis | 0,5 – 1 gr | 0,5 – 1 gr/kg BB | Manitol 20%, dosis 0,5 – 1 gr/kg BB dalam waktu 1 jam, |
| M4-0012 | SP0051 #23 | dosis | 5-7 mL | 5-7 mL/kg/jam | Terapi suportif: rehidrasi (oral/IV) - WHO guidelines: Group A (tidak ada warning signs, dapat pulang dengan hidrasi oral dan follow-up), G… |
| M4-0013 | SP0051 #24 | dosis | 10-20 mL | 10-20 mL/kg | Terapi suportif: rehidrasi (oral/IV) - WHO guidelines: Group A (tidak ada warning signs, dapat pulang dengan hidrasi oral dan follow-up), G… |
| M4-0014 | SP0098 #30 | dosis | 2-5 mcg | 2-5 mcg/kg/menit | Dopamin dosis rendah (2-5 mcg/kg/menit) |
| M4-0015 | SP0098 #31 | dosis | 0,01-0,05 mcg | 0,01-0,05 mcg/kg/menit | diberikan epinefrin dosis rendah 0,01-0,05 mcg/kg/menit. |
| M4-0016 | SP0125 #13 | dosis | 30mcg | 30mcg/kg | Nicardipin Bolus 30mcg/kg |
| M4-0017 | SP0125 #16 | dosis | 4 mcg | 4 mcg/kg | Prazosin 4 mcg/kg, selanjutnya tiba tiba dapat |
| M4-0018 | SP0128 #19 | dosis | 1,5 - 2 g | 1,5 - 2 g/kgBB | dilanjutkan 2 mg tiap 6 jam dan manitol 1,5 - 2 g/kgBB IV setiap 6-8 |
| M4-0019 | SP0132 #10 | dosis | 7 mg | 7 mg/Kg BB | 2% epinefrin 60-400 menit 7 mg/Kg BB |
| M4-0020 | SP0179 #1 | dosis | 0,5mL | 0,5mL/kg | Nebulisasi adrenalina 0,5mL/kg (maks 5mL) untuk stridor inspiratori. |
| M4-0021 | SP0193 #105 | dosis | 10mg | 10mg/ kg BB | Trimester pertama diberikan Kina tablet 3x 10mg/ kg BB + Klindamycin |
| M4-0022 | SP0193 #121 | dosis | 10mg | 10mg/ kg BB | Trimester pertama: Kina tablet 3 x 10mg/ kg BB + Klindamycin |
| M4-0023 | SP0223 #107 | dosis | 0,5-1 g | 0,5-1 g/kg | (2) Manitol 0,5-1 g/kg |
| M4-0024 | SP0223 #128 | dosis | 0,25-1 g | 0,25-1 g/kg | Manitol 20% 0,25-1 g/kg intravena (maksimal 12,5 g) |
| M4-0025 | SP0223 #204 | dosis | 0,5 g | 0,5 g/kg | 2 mg/kg intravena dan Manitol 20% 0,5 g/kg (donor |
| M4-0026 | SP0233 #22 | dosis | 1 mg | 1 mg / kg BB | receptor antagonist: Ranitidin 1 mg / kg BB |
| M4-0027 | SP0239 #8 | dosis | 0,3-0,5 mg | 0,3-0,5 mg perkg BB/hari | Salbutamol dengan dosis 0,3-0,5 mg perkg BB/hari 3x sehari. |
| M4-0028 | SP0258 #19 | dosis | 0,1 U | 0,1 U/kg | dengan insulin 0,1 U/kg + 1 ml/kg D50, CaCl 10 mg/kg atau Ca |
| M4-0029 | SP0258 #22 | dosis | 1-2 mcg | 1-2 mcg/kg | Fentanil 1-2 mcg/kg Diberikan sebagai analgesik intra dan |
| M4-0030 | SP0258 #27 | dosis | 80 U | 80 U/kg | Heparin 80 U/kg Diberikan setelah kateter femoral |
| M4-0031 | SP0258 #28 | dosis | 0,5-1 µg | 0,5-1 µg/kg | Epinefrin 0,5-1 µg/kg Diberikan jika terjadi penurunan |
| M4-0032 | SP0280 #47 | dosis | 1.5 gram | 1.5 gram/kgBB | Albumin 1.5 gram/kgBB diberikan pada hari pertama dalam waktu 6 |
| M4-0033 | SP0280 #148 | dosis | 1.5 gram | 1.5 gram/kgBB | Albumin 1.5 gram/kgBB diberikan pada hari pertama dalam waktu |
| M4-0034 | SP0288 #7 | dosis | 0.25–0.50 gr | 0.25–0.50 gr/kgBB | - Manitol 0.25–0.50 gr/kgBB, selama >20 |
| M4-0035 | SP0293 #4 | dosis | 0,5mL | 0,5mL/kg | Nebulisasi adrenalina 0,5mL/kg (maks 5mL) untuk stridor inspiratori. |
| M4-0036 | SP0300 #15 | dosis | 100.000-200.000 unit | 100.000-200.000 unit/kg/hari | 3) Antibiotik: metronidazole 500mg IV/PO 4x/hari 7-10 hari (preferred), atau penisilin G 100.000-200.000 unit/kg/hari IV 10 hari. |
| M4-0037 | SP0301 #13 | dosis | 50.000 IU | 50.000 IU/kg/kali | 3) Penisilin prokain 50.000 IU/kg/kali IM, tiap 12 jam, atau |
| M4-0038 | SP0302 #6 | dosis | 0,01 ml | 0,01 ml/kgbb | - Berikan adrenalin (1:1000) 0,01 ml/kgbb secara |
| M4-0039 | SP0303 #16 | dosis | 10 mL | 10 mL/kg | NaCl 0,9% atau darah dapat diberikan dengan dosis 10 mL/kg dan |
| M4-0040 | SP0303 #56 | dosis | 0,5 mcg | 0,5 mcg/kg | Epinefrin dosis rendah (0,5 mcg/kg per menit) memiliki efektivitas |
| M4-0041 | SP0303 #57 | dosis | 10 mcg | 10 mcg/kg | Dopamin dosis rendah/sedang (<10 mcg/kg per menit) sama |
| M4-0042 | SP0303 #70 | dosis | 10 mcg | 10 mcg/kg | Dopamin dosis rendah/sedang (<10 mcg/kg per menit) sama efektif |
| M4-0043 | SP0303 #71 | dosis | 0,5 mcg | 0,5 mcg/kg | dengan epinefrin dosis rendah (0,5 mcg/kg per menit) dalam |
| M4-0044 | SP0322 #3 | dosis | 0,5-1,5 gr | 0,5-1,5 gr/kgBB | Manitol (20%) dengan dosis 0,5-1,5 gr/kgBB efektif dalam |

#### M5 (14)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M5-0001 | SP0019 #4 | dosis | 3mg | maks 3mg | Bradyarrhythmia: atropin 0.5mg IV (maks 3mg), pacing sementara. |
| M5-0002 | SP0025 #14 | dosis | 200-400 mg | maksimal 200-400 mg | c) Magnesium 6 mg/kg/hari (maksimal 200-400 mg/hari) |
| M5-0003 | SP0093 #4 | dosis | 2g | maks 2g | Azitromisin 30mg/kg oral dosis tunggal (maks 2g) - WHO preferred (single oral dose, easier than IM penisilin). |
| M5-0004 | SP0108 #10 | dosis | 125mg | maks 125mg | Ophthalmia neonatorum: ceftriaxone 25-50mg/kg IV/IM (maks 125mg) dosis tunggal + saline irrigation. |
| M5-0005 | SP0155 #45 | dosis | 3 gram | dosis maksimal 3 gram | Asetaminofen (parasetamol) dengan dosis maksimal 3 gram per hari dapat |
| M5-0006 | SP0155 #46 | dosis | 3 gram | dosis maksimal 3 gram | Asetaminofen (parasetamol) dengan dosis maksimal 3 gram per hari dapat |
| M5-0007 | SP0162 #24 | dosis | 20 mg | maks 20 mg | Diazepam 0,3 mg/kg dengan rata- 0,5 mg/kg (maks 20 mg |
| M5-0008 | SP0162 #27 | dosis | 4 mg | maks 4 mg | Lorazepam 0,05 – 0,1 mg/kg dalam 1- 0,1 mg/kg (maks 4 mg |
| M5-0009 | SP0179 #2 | dosis | 5mL | maks 5mL | Nebulisasi adrenalina 0,5mL/kg (maks 5mL) untuk stridor inspiratori. |
| M5-0010 | SP0223 #129 | dosis | 12,5 g | maksimal 12,5 g | Manitol 20% 0,25-1 g/kg intravena (maksimal 12,5 g) |
| M5-0011 | SP0293 #5 | dosis | 5mL | maks 5mL | Nebulisasi adrenalina 0,5mL/kg (maks 5mL) untuk stridor inspiratori. |
| M5-0012 | SP0299 #1 | dosis | 4000 mg | maks 4000 mg | - Parasetamol 1000 mg oral per kali (maks 4000 mg/hari). |
| M5-0013 | SP0299 #13 | dosis | 4000 mg | maks 4000 mg | - Parasetamol 1000 mg oral per kali (maks 4000 mg/hari). |
| M5-0014 | SP0329 #15 | dosis | 800mg | maks 800mg | Antiviral: acyclovir 20mg/kg (maks 800mg) 4x/hari 5 hari - untuk: dewasa, adolescents, chronic skin/lung disease, long-term salicylate/ster… |

#### M6 (113)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M6-0001 | SP0008 #8 | frekuensi | 4 kali/hari | 3-4 kali/hari | Antihistamin, seperti klorfeniramin 4-6 mg sebanyak 3-4 kali/hari, |
| M6-0002 | SP0015 #103 | frekuensi | 3 kali sehari | 2-3 kali sehari | • Verapamil 80 mg (2-3 kali sehari) |
| M6-0003 | SP0015 #104 | frekuensi | 4 kali sehari | 3-4 kali sehari | • Diltiazem 30 mg ( 3-4 kali sehari) |
| M6-0004 | SP0015 #110 | frekuensi | 3 kali sehari | 2-3 kali sehari | a) Verapamil 80 mg (2-3 kali sehari) |
| M6-0005 | SP0015 #111 | frekuensi | 4 kali sehari | 3-4 kali sehari | b) Diltiazem 30 mg (3-4 kali sehari) |
| M6-0006 | SP0030 #5 | frekuensi | 4 kali sehari | 3-4 kali sehari | - Kloramfenikol 1% salep mata atau tetes mata antibiotik profilaksis 3-4 kali sehari selama 3-5 hari. |
| M6-0007 | SP0030 #12 | frekuensi | 4 kali sehari | 3-4 kali sehari | - Kloramfenikol 1% salep mata atau tetes mata antibiotik profilaksis 3-4 kali sehari selama 3-5 hari. |
| M6-0008 | SP0035 #8 | frekuensi | 4x/hari | 3-4x/hari | - Antipiretik: Parasetamol 500 mg 3-4x/hari prn. |
| M6-0009 | SP0035 #13 | frekuensi | 4x/hari | 3-4x/hari | - Antipiretik: Parasetamol 500 mg 3-4x/hari prn. |
| M6-0010 | SP0041 #1 | frekuensi | 4x/hari | 3-4x/hari | Terapi simptomatik: decongestant oral/topikal (pseudoephedrine 60mg 3x/hari), analgesik antipiretik (parasetamol 500mg 3-4x/hari), istiraha… |
| M6-0011 | SP0045 #0 | frekuensi | 4x/hari | 3-4x/hari | Terapi simptomatik: decongestant oral/topikal (pseudoephedrine 60mg 3x/hari), analgesik antipiretik (parasetamol 500mg 3-4x/hari), istiraha… |
| M6-0012 | SP0045 #2 | frekuensi | 4x sehari | 3-4x sehari | Paracetamol 500 mg (3-4x sehari) |
| M6-0013 | SP0052 #2 | frekuensi | 4x/hari | 2-4x/hari | Alternatif: penisilin V oral 250mg 2x/hari 10 hari, atau eritromisin 20-40mg/kg/hari 2-4x/hari 10 hari (alergi penisilin). |
| M6-0014 | SP0053 #23 | frekuensi | 4 x 1000 mg | 3-4 x 1000 mg | - Amoksisilin 3-4 x 1000 mg oral atau Kotrimoksazol 2 x 960 mg oral selama 14 hari (alternatif aman pada kehamilan). |
| M6-0015 | SP0053 #37 | frekuensi | 4 x 1000 mg | 3-4 x 1000 mg | - Amoksisilin 3-4 x 1000 mg oral atau Kotrimoksazol 2 x 960 mg oral selama 14 hari (alternatif aman pada kehamilan). |
| M6-0016 | SP0057 #15 | frekuensi | 2 kali sehari | 1-2 kali sehari | - Kortikosteroid Topikal: Betametason dipropionat 0.05% atau Mometason furoat 0.1% krim dioleskan 1-2 kali sehari selama 1-2 minggu pada le… |
| M6-0017 | SP0057 #16 | frekuensi | 2 kali sehari | 1-2 kali sehari | - Kortikosteroid Topikal: Betametason dipropionat 0.05% atau Mometason furoat 0.1% krim dioleskan 1-2 kali sehari selama 1-2 minggu pada le… |
| M6-0018 | SP0057 #36 | frekuensi | 2 kali sehari | 1-2 kali sehari | - Kortikosteroid Topikal: Betametason dipropionat 0.05% atau Mometason furoat 0.1% krim dioleskan 1-2 kali sehari selama 1-2 minggu pada le… |
| M6-0019 | SP0057 #37 | frekuensi | 2 kali sehari | 1-2 kali sehari | - Kortikosteroid Topikal: Betametason dipropionat 0.05% atau Mometason furoat 0.1% krim dioleskan 1-2 kali sehari selama 1-2 minggu pada le… |
| M6-0020 | SP0060 #24 | frekuensi | 2x | 2x/minggu | Topikal: ketoconazole 2% cream/shampoo 2x/minggu (lini pertama - anti-Malassezia), kortikosteroid ringan (hydrocortisone 1% cream untuk waj… |
| M6-0021 | SP0060 #26 | frekuensi | 2x/hari | 1-2x/hari | Topikal: ketoconazole 2% cream/shampoo 2x/minggu (lini pertama - anti-Malassezia), kortikosteroid ringan (hydrocortisone 1% cream untuk waj… |
| M6-0022 | SP0079 #5 | frekuensi | 4 x | 3-4 x | - Klindamisin 3-4 x 300 mg oral (pada alergi penisilin). |
| M6-0023 | SP0079 #13 | frekuensi | 4 x | 3-4 x | - Klindamisin 3-4 x 300 mg oral (pada alergi penisilin). |
| M6-0024 | SP0079 #22 | frekuensi | 4x/hari | 3-4x/hari | MRSA: TMP-SMX DS 1-2 tablet 2x/hari, atau clindamycin 300-450mg 3-4x/hari, atau doxycycline 100mg 2x/hari. |
| M6-0025 | SP0083 #10 | frekuensi | 4x/hari | 3-4x/hari | GAS terkonfirmasi: penisilin V 250-500mg 3-4x/hari selama 10 hari, atau amoksisilin 500mg 3x/hari 10 hari, atau azitromisin 500mg 1x/hari 5… |
| M6-0026 | SP0084 #0 | frekuensi | 2x/hari | 1-2x/hari | Tangani penyebab utama: PPI untuk GERD (omeprazole 20mg 1-2x/hari), antihistamin untuk alergi, berhenti merokok. |
| M6-0027 | SP0094 #0 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin 2% salep atau Asam Fusidat 2% salep dioleskan 2-3 kali sehari. |
| M6-0028 | SP0094 #1 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin 2% salep atau Asam Fusidat 2% salep dioleskan 2-3 kali sehari. |
| M6-0029 | SP0094 #5 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin 2% salep atau Asam Fusidat 2% salep dioleskan 2-3 kali sehari. |
| M6-0030 | SP0094 #6 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin 2% salep atau Asam Fusidat 2% salep dioleskan 2-3 kali sehari. |
| M6-0031 | SP0097 #24 | frekuensi | 4 x/hari | 3-4 x/hari | hydralazine 50 mg (3-4 x/hari) dan ISDN 20 mg (3-4 x/hari). |
| M6-0032 | SP0100 #11 | frekuensi | 2x | 1-2x | imipramin1-2x10-25 mg/hari. |
| M6-0033 | SP0100 #14 | frekuensi | 2x | 1-2x | lorazepam 1-2x0,5-1 mg atau klobazam 2 x 5-10 mg atau alprazolam |
| M6-0034 | SP0100 #17 | frekuensi | 2x | 1-2x | imipramin1-2x10-25 mg/hari. |
| M6-0035 | SP0101 #2 | frekuensi | 2x/hari | 1-2x/hari | - Benzodiazepin jangka sangat pendek (maks 2-4 minggu) untuk mengatasi kecemasan akut: Diazepam 2-5 mg 1-2x/hari oral atau Alprazolam 0.25-… |
| M6-0036 | SP0101 #3 | frekuensi | 2x/hari | 1-2x/hari | - Benzodiazepin jangka sangat pendek (maks 2-4 minggu) untuk mengatasi kecemasan akut: Diazepam 2-5 mg 1-2x/hari oral atau Alprazolam 0.25-… |
| M6-0037 | SP0101 #6 | frekuensi | 2x/hari | 1-2x/hari | - Benzodiazepin jangka sangat pendek (maks 2-4 minggu) untuk mengatasi kecemasan akut: Diazepam 2-5 mg 1-2x/hari oral atau Alprazolam 0.25-… |
| M6-0038 | SP0101 #7 | frekuensi | 2x/hari | 1-2x/hari | - Benzodiazepin jangka sangat pendek (maks 2-4 minggu) untuk mengatasi kecemasan akut: Diazepam 2-5 mg 1-2x/hari oral atau Alprazolam 0.25-… |
| M6-0039 | SP0103 #11 | frekuensi | 3 x | 2-3 x | Berikan obat antipsikotik: Haloperidol 2-3 x 2-5 mg/hari atau |
| M6-0040 | SP0103 #12 | frekuensi | 3 x | 2-3 x | Risperidon 2x 1-3 mg/hari atau Klorpromazin 2-3 x 100-200 |
| M6-0041 | SP0103 #13 | frekuensi | 3 x | 1-3 x | dengan benzodiazepin (contoh: diazepam 2-3 x 5 mg, lorazepam 1-3 x |
| M6-0042 | SP0103 #16 | frekuensi | 3 x | 2-3 x | diberikan injeksi intra muskular klorpromazin 2-3 x 50 mg. |
| M6-0043 | SP0103 #19 | frekuensi | 4 x | 2-4 x | akinesia, dapat diberikan triheksifenidil 2-4 x 2 mg; |
| M6-0044 | SP0103 #20 | frekuensi | 3 x | 2-3 x | propranolol 2-3 x 10-20 mg. |
| M6-0045 | SP0103 #21 | frekuensi | 3 x | 2-3 x | 1) Berikan obat antipsikotik: Haloperidol 2-3 x 2-5 mg/hari |
| M6-0046 | SP0103 #22 | frekuensi | 3 x | 2-3 x | atau Risperidon 2x 1-3 mg/hari atau Klorpromazin 2-3 x |
| M6-0047 | SP0103 #23 | frekuensi | 3 x | 1-3 x | x 5 mg, lorazepam 1-3 x 1-2 mg) untuk mengurangi agitasi |
| M6-0048 | SP0103 #24 | frekuensi | 3 x | 2-3 x | muskular klorpromazin 2-3 x 50 mg. |
| M6-0049 | SP0105 #10 | frekuensi | 2 x 30 mg | 1-2 x 30 mg | - Proton Pump Inhibitor (PPI): Omeprazole 1-2 x 20 mg/hari oral, Lansoprazole 1-2 x 30 mg/hari oral diminum 30-60 menit sebelum makan selam… |
| M6-0050 | SP0105 #11 | frekuensi | 2 x 20 mg | 1-2 x 20 mg | - Proton Pump Inhibitor (PPI): Omeprazole 1-2 x 20 mg/hari oral, Lansoprazole 1-2 x 30 mg/hari oral diminum 30-60 menit sebelum makan selam… |
| M6-0051 | SP0105 #12 | frekuensi | 4 x | 3-4 x | - Sitoprotektor: Sukralfat suspensi 3-4 x 1 gram (15 mL) diminum 1 jam sebelum makan atau sebelum tidur. |
| M6-0052 | SP0105 #13 | frekuensi | 4 x | 3-4 x | - Sitoprotektor: Sukralfat suspensi 3-4 x 1 gram (15 mL) diminum 1 jam sebelum makan atau sebelum tidur. |
| M6-0053 | SP0105 #26 | frekuensi | 2 x 30 mg | 1-2 x 30 mg | - Proton Pump Inhibitor (PPI): Omeprazole 1-2 x 20 mg/hari oral, Lansoprazole 1-2 x 30 mg/hari oral diminum 30-60 menit sebelum makan selam… |
| M6-0054 | SP0105 #27 | frekuensi | 2 x 20 mg | 1-2 x 20 mg | - Proton Pump Inhibitor (PPI): Omeprazole 1-2 x 20 mg/hari oral, Lansoprazole 1-2 x 30 mg/hari oral diminum 30-60 menit sebelum makan selam… |
| M6-0055 | SP0105 #28 | frekuensi | 4 x | 3-4 x | - Sitoprotektor: Sukralfat suspensi 3-4 x 1 gram (15 mL) diminum 1 jam sebelum makan atau sebelum tidur. |
| M6-0056 | SP0105 #29 | frekuensi | 4 x | 3-4 x | - Sitoprotektor: Sukralfat suspensi 3-4 x 1 gram (15 mL) diminum 1 jam sebelum makan atau sebelum tidur. |
| M6-0057 | SP0112 #110 | frekuensi | 4x sehari | 3-4x sehari | Paracetamol 500 mg (3-4x sehari) |
| M6-0058 | SP0120 #18 | frekuensi | 6 kali | 4-6 kali | 1) Dimenhidrinat 50-100 mg per oral atau supositoria, 4-6 kali |
| M6-0059 | SP0120 #19 | frekuensi | 4 kali sehari | 3-4 kali sehari | sehari ATAU Prometazin 5-10 mg 3-4 kali sehari per oral atau |
| M6-0060 | SP0124 #41 | frekuensi | 2 x | 1-2 x | (captopril 2x25-100 mg/hari atau enalapril 1-2 x 2,5-40 mg/hari), |
| M6-0061 | SP0126 #4 | frekuensi | 4x/hari | 3-4x/hari | Beta-blocker (propranolol 10-40mg 3-4x/hari) untuk symptom kontrol. |
| M6-0062 | SP0127 #21 | frekuensi | 2x/hari | 1-2x/hari | Kolkhisin profilaksis 0.6mg 1-2x/hari selama 3-6 bulan saat start ULT. |
| M6-0063 | SP0130 #46 | frekuensi | 3x | 2-3x/minggu | ketokonazol topikal 2% 2-3x/minggu selama empat minggu dengan |
| M6-0064 | SP0130 #54 | frekuensi | 3 kali | 3 kali seminggu | • Untuk infeksi rekurens: flukonazol 100 mg 3 kali seminggu (sangat |
| M6-0065 | SP0130 #58 | frekuensi | 1 kali | 1 kali per minggu | krim asiklovir 5% pada lesi sebanyak 1 kali per minggu. |
| M6-0066 | SP0130 #62 | frekuensi | 3 kali sehari | 2-3 kali sehari | atau valasiklovir 500-1000 mg tablet 2-3 kali sehari. |
| M6-0067 | SP0133 #2 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin salep 2% atau Asam Fusidat krim 2% dioleskan 2-3 kali sehari selama 7 hari. |
| M6-0068 | SP0133 #3 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin salep 2% atau Asam Fusidat krim 2% dioleskan 2-3 kali sehari selama 7 hari. |
| M6-0069 | SP0133 #9 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin salep 2% atau Asam Fusidat krim 2% dioleskan 2-3 kali sehari selama 7 hari. |
| M6-0070 | SP0133 #10 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Mupirosin salep 2% atau Asam Fusidat krim 2% dioleskan 2-3 kali sehari selama 7 hari. |
| M6-0071 | SP0140 #9 | frekuensi | 4x/hari | 3-4x/hari | - Antipiretik/analgesik: Parasetamol 500-1000 mg 3-4x/hari atau Ibuprofen 400 mg 3x/hari. |
| M6-0072 | SP0140 #12 | frekuensi | 4 x | 3-4 x | Pada dewasa yaitu parasetamol 3-4 x 500 mg/hari (10-15 |
| M6-0073 | SP0140 #13 | frekuensi | 4 x | 3-4 x | mg/kgBB), atau ibuprofen 3-4 x 200-400 mg/hari (5-10 mg/kgBB). |
| M6-0074 | SP0140 #14 | frekuensi | 4 x | 3-4 x | mg/kgBB), atau ibuprofen 3-4 x 200-400 mg/hari (5-10 mg/kgBB). |
| M6-0075 | SP0140 #16 | frekuensi | 4 kali/hari | 3-4 kali/hari | Antihistamin, seperti klorfeniramin 4-6 mg sebanyak 3-4 kali/hari, |
| M6-0076 | SP0140 #27 | frekuensi | 4x/hari | 3-4x/hari | - Antipiretik/analgesik: Parasetamol 500-1000 mg 3-4x/hari atau Ibuprofen 400 mg 3x/hari. |
| M6-0077 | SP0160 #114 | frekuensi | 2 x | 1-2 x | • Lorazepam 1-2 x (0,5-1 mg) |
| M6-0078 | SP0160 #121 | frekuensi | 2 x | 1-2 x | • Olanzapin, 1-2 x 2,5-10mg |
| M6-0079 | SP0176 #3 | frekuensi | 2x/hari | 1-2x/hari | Laktulosa: 15-30mL 1-2x/hari. |
| M6-0080 | SP0177 #19 | frekuensi | 2 kali | 2 kali seminggu | Klofazimin 50 mg 2 kali seminggu, dan Klofazimin 100 mg/bulan |
| M6-0081 | SP0177 #20 | frekuensi | 2 kali | 2 kali seminggu | Klofazimin 50 mg 2 kali seminggu, dan Klofazimin 100 mg/bulan |
| M6-0082 | SP0183 #11 | frekuensi | 3x/hari | 1-3x/hari | salep/krim 1-3x/hari, metilprednisolon aseponat 0,1% salep/krim 1- |
| M6-0083 | SP0183 #17 | frekuensi | 2 kali sehari | 1-2 kali sehari | metilprednisolon aseponat salep/krim 0,1% 1-2 kali sehari, |
| M6-0084 | SP0187 #44 | frekuensi | 3x | 2-3x | 6) Vitamin B 2-3x RDA, Asam folat 1 mg/hari |
| M6-0085 | SP0190 #3 | frekuensi | 4 x | 3-4 x | misalnya parasetamol 3-4 x 500-1000 mg, atau ibuprofen 400-800 |
| M6-0086 | SP0190 #4 | frekuensi | 3 x | 2-3 x | mg 3-4 kali perhari, natrium diklofenak 2-3 x 25-50 mg/hari pada |
| M6-0087 | SP0196 #109 | frekuensi | 3x | 2-3x | 6) Vitamin B 2-3x RDA, Asam folat 1 mg/hari |
| M6-0088 | SP0214 #5 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Tetes telinga kombinasi antibiotik dan steroid: Neomisin + Polimiksin B + Deksametason atau Ofloksasin tetes telinga 0.3% 3-4 tetes 2-3 k… |
| M6-0089 | SP0214 #6 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Tetes telinga kombinasi antibiotik dan steroid: Neomisin + Polimiksin B + Deksametason atau Ofloksasin tetes telinga 0.3% 3-4 tetes 2-3 k… |
| M6-0090 | SP0214 #11 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Tetes telinga kombinasi antibiotik dan steroid: Neomisin + Polimiksin B + Deksametason atau Ofloksasin tetes telinga 0.3% 3-4 tetes 2-3 k… |
| M6-0091 | SP0214 #12 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Tetes telinga kombinasi antibiotik dan steroid: Neomisin + Polimiksin B + Deksametason atau Ofloksasin tetes telinga 0.3% 3-4 tetes 2-3 k… |
| M6-0092 | SP0219 #0 | frekuensi | 4x/hari | 3-4x/hari | - Analgesik-antipiretik: Parasetamol 10-15 mg/kgBB/kali pada anak atau 500 mg 3-4x/hari pada dewasa; |
| M6-0093 | SP0219 #3 | frekuensi | 4x/hari | 3-4x/hari | - Analgesik-antipiretik: Parasetamol 10-15 mg/kgBB/kali pada anak atau 500 mg 3-4x/hari pada dewasa; |
| M6-0094 | SP0233 #21 | frekuensi | 2 x | 1-2 x | esomeprazole: <40 kg: 0,5 – 1 mg/kg BB/hari 1-2 x |
| M6-0095 | SP0233 #58 | frekuensi | 4 x | 3-4 x | b) Sitoprotektor: sukralfat 3-4 x1 gram |
| M6-0096 | SP0234 #1 | frekuensi | 4x | 3-4x | Sitoprotektor: sukralfat 3-4x1 gram |
| M6-0097 | SP0241 #13 | frekuensi | 3 kali sehari | 2-3 kali sehari | asam fusidat 2% atau mupirosin 2%, dioleskan 2-3 kali sehari |
| M6-0098 | SP0241 #14 | frekuensi | 3 kali sehari | 2-3 kali sehari | asam fusidat 2% atau mupirosin 2%, dioleskan 2-3 kali sehari |
| M6-0099 | SP0261 #11 | frekuensi | 4x/hari | 3-4x/hari | Terapi simptomatik: decongestant oral/topikal (pseudoephedrine 60mg 3x/hari), analgesik antipiretik (parasetamol 500mg 3-4x/hari), istiraha… |
| M6-0100 | SP0261 #13 | frekuensi | 4x sehari | 3-4x sehari | Paracetamol 500 mg (3-4x sehari) |
| M6-0101 | SP0262 #3 | frekuensi | 2 kali sehari | 1-2 kali sehari | - Cuci hidung dengan cairan NaCl fisiologis 0.9% 1-2 kali sehari. |
| M6-0102 | SP0262 #7 | frekuensi | 2 kali sehari | 1-2 kali sehari | - Cuci hidung dengan cairan NaCl fisiologis 0.9% 1-2 kali sehari. |
| M6-0103 | SP0262 #8 | frekuensi | 2x/hari | 1-2x/hari | Terapi farmakologi: intranasal corticosteroid (flutikason propionat atau mometason furoate 1 semprot/hidung 1-2x/hari - lini pertama), anti… |
| M6-0104 | SP0276 #50 | frekuensi | 3 x | 2-3 x | Captopril 2-3 x 6,25-50 mg |
| M6-0105 | SP0309 #0 | frekuensi | 2x/hari | 1-2x/hari | Topikal: terbinafine 1% cream 1-2x/hari 1-2 minggu (superior dibanding azole), atau klotrimazol/ketoconazole 2x/hari 2-4 minggu. |
| M6-0106 | SP0311 #0 | frekuensi | 2x/hari | 1-2x/hari | Topikal: terbinafine 1% cream/spray 1-2x/hari 1-2 minggu (superior), atau butenafine 1% 1x/hari 2 minggu, atau azole (klotrimazol/ketoconaz… |
| M6-0107 | SP0313 #22 | frekuensi | 2x | 2x/minggu | Topikal: selenium sulfide 2.5% lotion (Selsun) aplikasi pada lesi 10 menit, lalu cuci - ulang 7 hari berturut, atau ketoconazole 2% shampoo… |
| M6-0108 | SP0313 #24 | frekuensi | 1x | 1x/minggu | Oral (untuk extensive/refrakter): itrakonazol 200mg 1x/hari 7 hari, atau fluconazol 300mg 1x/minggu 2 minggu. |
| M6-0109 | SP0314 #15 | frekuensi | 4 kali | 2-4 kali | 6) Eritromisin etilsuksinat (EES) 40 mg/kgbb/hari, 2-4 kali |
| M6-0110 | SP0314 #23 | frekuensi | 4 kali | 2-4 kali | Eritromisin 40 mg/kgbb/hari, 2-4 kali |
| M6-0111 | SP0314 #36 | frekuensi | 3x/hari | 2-3x/hari | Konfirmasi GAS: penisilin V 500mg 2-3x/hari 10 hari, atau benzatin penisilin G 1,2 juta unit IM sekali dosis, atau amoksisilin 500mg 3x/har… |
| M6-0112 | SP0314 #37 | frekuensi | 3x/hari | 2-3x/hari | Konfirmasi GAS: penisilin V 500mg 2-3x/hari 10 hari, atau benzatin penisilin G 1,2 juta unit IM sekali dosis, atau amoksisilin 500mg 3x/har… |
| M6-0113 | SP0327 #15 | frekuensi | 1x | 1x/minggu | Recurrent VVC (>=4x/tahun): fluconazol 150mg tiap 72 jam x 3 dosis (induction), lalu maintenance 150mg 1x/minggu 6 bulan. |

#### M7 (1)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| M7-0001 | SP0268 #36 | dosis | 000 U | 200 000–300 000 U/kg/hari | Penisilin G IM, IV 200 000–300 000 U/kg/hari dalam |

#### B (read by hand) (84)

| ID | Entry, row | Field | Now | Proposed | Quote |
|---|---|---|---|---|---|
| B-0001 | SP0314 #41 | dosis | 50 mg | 50 mg/kgBB | Benzatin 50.000 U/kgBB/IM dosis tunggal atau Amoksisilin 50 mg/ |
| B-0002 | SP0097 #52 | obat | Ekuivalen dengan | enalapril | Ekuivalen dengan enalapril ≥10 mg dua kali sehari |
| B-0003 | SP0211 #9 | obat | Penggunaan asetaminofen | asetaminofen | Penggunaan asetaminofen >3 g/ hari |
| B-0004 | SP0211 #10 | obat | Penggunaan asetaminofen | asetaminofen | Penggunaan asetaminofen >3 g/ hari |
| B-0005 | SP0279 #15 (not rendered) | obat | Penelitian lain | Klaritromisin | Penelitian lain menggunakan Klaritromisin 1 x 500 mg selama 3 |
| B-0006 | SP0303 #55 (not rendered) | obat | Studi lain | dopamin | Studi lain melaporkan penggunaan dopamin >5 mcg/kg |
| B-0007 | SP0014 #150 | dosis | 0,2 - 0,8 µg | 0,2 - 0,8 µg/kg | (5) Remifentanil: dosis bolus 0,2 - 0,8 µg/kg atau |
| B-0008 | SP0014 #233 | dosis | 0,1-8 mcg | 0,1-8 mcg/kg/menit | f) Fenilefrin 0,1-8 mcg/kg/menit |
| B-0009 | SP0014 #234 | dosis | 50 mcg | 50 mcg/kg | g) Milrinon 50 mcg/kg bolus, dilanjutkan 0,25–1 |
| B-0010 | SP0065 #0 | dosis | 75 mL | 75 mL/kg | Terapi utama: ORS (oral rehydration salts) - WHO low-osmolarity ORS 75 mL/kg dalam 4 jam untuk some dehydration, atau 100 mL/kg untuk sever… |
| B-0011 | SP0065 #1 | dosis | 100 mL | 100 mL/kg | Terapi utama: ORS (oral rehydration salts) - WHO low-osmolarity ORS 75 mL/kg dalam 4 jam untuk some dehydration, atau 100 mL/kg untuk sever… |
| B-0012 | SP0109 #2 | dosis | 10-20 IU | 10-20 IU/kg BB | Profilaksis sekunder dengan dosis 10-20 IU/kg BB, 2-3 kali |
| B-0013 | SP0109 #45 | dosis | 50-100 IU | 50-100 IU/kg | dosis FVIII adalah 50-100 IU/kg diulang setiap 8-12 jam. |
| B-0014 | SP0109 #51 | dosis | 25 IU | 25 IU/kg | pemberian F VIII dengan dosis 25 IU/kg selang sehari, dengan |
| B-0015 | SP0109 #60 | dosis | 100 U | 100 U/kg/hari | FVIII 100 U/kg/hari dilaporkan dapat mengontrol |
| B-0016 | SP0109 #61 | dosis | 200 IU | 200 IU/kg/hari | tinggi (F VIII 200 IU/kg/hari), dan penggunaan plasma |
| B-0017 | SP0109 #64 | dosis | 25 IU | 25 IU/kg | pemberian F VIII dengan dosis 25 IU/kg selang sehari, memiliki angka |
| B-0018 | SP0109 #65 | dosis | 10IU | 10IU/kg | Prophylaxis with low dose of FVIII 10IU/kg twice a week, is recommended |
| B-0019 | SP0109 #66 | dosis | 10-15 IU | 10-15 IU/kg | Prophylaxis with low dose of FIX is given 10-15 IU/kg twice week, is |
| B-0020 | SP0109 #67 | dosis | 50-100 IU | 50-100 IU/kg | recommendation dose for FVIII is 50-100 IU/kg, repeated every 8-12 hours, |
| B-0021 | SP0129 #0 | dosis | 1.6mcg | 1.6mcg/kg BB ideal/hari | Levotiroksin sodium (L-thyroxine) 1.6mcg/kg BB ideal/hari (dosis awal: 25-50mcg/hari, dinaikkan 25mcg setiap 4-6 minggu). |
| B-0022 | SP0155 #42 | dosis | 0,25 g | 0,25 g/kg/BB/hari | Amino Acids (BCAA) (0,25 g/kg/BB/hari atau 30 g/hari) dapat diberikan |
| B-0023 | SP0182 #71 | dosis | 1,5-2,3g | 1,5-2,3g/kg BB/hari | (2) Lemak: usia 0-12 bulan 1,5-2,3g/kg BB/hari, usia 1-3 |
| B-0024 | SP0187 #21 | dosis | 2-4 ml | 2-4 ml/KgBB | Ketika pemberian cairan IV dilakukan, antara 2-4 ml/KgBB/%TBSA, C |
| B-0025 | SP0196 #59 | dosis | 1,2-1,5 g | 1,2-1,5 g/kgBB/hari | sedangkan yang menjalani CAPD sebesar 1,2-1,5 g/kgBB/hari |
| B-0026 | SP0196 #62 | dosis | 1,2 - 1,5 g | 1,2 - 1,5 g/kgBB/hari | CAPD : 1,2 - 1,5 g/kgBB/hari (Rekomendasi A) |
| B-0027 | SP0196 #123 | dosis | 1,2 g | 1,2 g/kg BB | (CAPD) : 1,2 g/kg BB |
| B-0028 | SP0223 #33 | dosis | 0,28 g | 0,28 g/kg/hari | a) Dialisis peritoneal: 0,28 g/kg/hari pada bayi sampai |
| B-0029 | SP0223 #34 | dosis | 0,1 g | 0,1 g/kg/hari | b) Hemodialisis: 0,1 g/kg/hari. |
| B-0030 | SP0223 #115 | dosis | 1 g | 1 g/kg | (3) Infus albumin 20% 1 g/kg atau 5 ml/kg |
| B-0031 | SP0223 #120 | dosis | 0,2-0,3 g | 0,2-0,3 g/kg/jam | c) Lemak: laju infus lemak ≤0,2-0,3 g/kg/jam dengan |
| B-0032 | SP0280 #107 | dosis | 0,25 g | 0,25 g/KgBB/hari | Suplemen oral BCAA (0,25 g/KgBB/hari) untuk memfasilitasi |
| B-0033 | SP0317 #41 | dosis | 1-2 mL | 1-2 mL/Kg BB/ jam |  Produksi urine 1-2 mL/Kg BB/ jam ( sesuai umur ) |
| B-0034 | SP0336 #5 | dosis | 5g | 5g/kg/hari | Monitoring: weight gain target 5g/kg/hari (inpatient), 2g/kg/hari (outpatient). |
| B-0035 | SP0050 #2 (not rendered) | dosis | 20 mg | dosis maksimal 20 mg | 30 menit, dengan dosis maksimal 20 mg/hari. |
| B-0036 | SP0089 #15 | dosis | 1500 mg | tidak melebihi 1500 mg | vitamin C tidak melebihi 1500 mg/hari. |
| B-0037 | SP0097 #66 (not rendered) | dosis | 2 gram | maksimal 2 gram | Pembatasan asupan garam maksimal 2 gram/hari (ringan), 1 |
| B-0038 | SP0097 #71 (not rendered) | dosis | 600 mg | dosis maksimal 600 mg | sampai dosis maksimal 600 mg/hari. |
| B-0039 | SP0103 #15 (not rendered) | dosis | 30 mg | dosis maksimal 30 mg | signifikan, dosis maksimal 30 mg/hari. |
| B-0040 | SP0111 #6 (not rendered) | dosis | 2 g | maksimal 2 g | Medikamentosa: Antiemetik (domperidone/ondansetron) bila mual persisten, antipiretik parasetamol (dosis dikurangi maksimal 2 g/hari untuk m… |
| B-0041 | SP0111 #17 (not rendered) | dosis | 2 g | maksimal 2 g | Medikamentosa: Antiemetik (domperidone/ondansetron) bila mual persisten, antipiretik parasetamol (dosis dikurangi maksimal 2 g/hari untuk m… |
| B-0042 | SP0116 #11 (not rendered) | dosis | 800 mg | maksimal 800 mg | maksimal 800 mg), atau |
| B-0043 | SP0116 #15 (not rendered) | dosis | 800 mg | dosis maksimal 800 mg | mg/kgBB (dosis maksimal 800 mg), selama 7 hari, atau |
| B-0044 | SP0127 #4 (not rendered) | dosis | 6 mg | dosis maksimal 6 mg | Dosis oral 0.5-0.6 mg per hari dengan dosis maksimal 6 mg. |
| B-0045 | SP0127 #6 (not rendered) | dosis | 800mg | maksimal 800mg | maksimal 800mg/hari. |
| B-0046 | SP0127 #7 (not rendered) | dosis | 6 mg | dosis maksimal 6 mg | dosis maksimal 6 mg. |
| B-0047 | SP0127 #10 (not rendered) | dosis | 800 mg | dosis maksimal 800 mg | diperlukan, dengan dosis maksimal 800 mg/hari. |
| B-0048 | SP0136 #8 | dosis | 75mg/kgBB/hari | tidak lebih dari 75mg/kgBB/hari | - Berikan parasetamol oral (tidak lebih dari 75mg/kgBB/hari dengan |
| B-0049 | SP0139 #102 | dosis | 1 gram | maksimal 1 gram | Asam (maksimal 1 gram) |
| B-0050 | SP0139 #103 | dosis | 2 gram | maksimal 2 gram | Sulbaktam (maksimal 2 gram) |
| B-0051 | SP0183 #7 (not rendered) | dosis | 300 mg | maksimal 300 mg | (maksimal 300 mg/hari), atau klorfeniramin maleat (CTM) 4 mg |
| B-0052 | SP0183 #9 (not rendered) | dosis | 24 mg | maksimal 24 mg | setiap 4-6 jam (maksimal 24 mg/hari). |
| B-0053 | SP0183 #14 (not rendered) | dosis | 300 mg | maksimal 300 mg | setiap 4-6 jam (maksimal 300 mg/hari), atau klorfeniramin |
| B-0054 | SP0183 #16 (not rendered) | dosis | 24 mg | maksimal 24 mg | maleat (CTM) 4 mg setiap 4-6 jam (maksimal 24 mg/hari). |
| B-0055 | SP0187 #60 (not rendered) | dosis | 20-40% | Maksimal 20-40% | 10-11 Maksimal 20-40% |
| B-0056 | SP0200 #8 | dosis | 6 tablet | maks 6 tablet | - Lini Kedua (Serangan Sedang-Berat): Triptan (Sumatriptan 50-100 mg oral) ATAU Ergotamin tartrat 1 mg + Kafein 100 mg oral saat awal seran… |
| B-0057 | SP0200 #14 (not rendered) | dosis | 200 mg | dosis maksimal 200 mg | dosis maksimal 200 mg dalam 24 jam. |
| B-0058 | SP0200 #33 (not rendered) | dosis | 200 mg | dosis maksimal 200 mg | Dosis awal 50 mg dengan dosis maksimal 200 mg dalam 24 |
| B-0059 | SP0200 #56 | dosis | 6 tablet | maks 6 tablet | - Lini Kedua (Serangan Sedang-Berat): Triptan (Sumatriptan 50-100 mg oral) ATAU Ergotamin tartrat 1 mg + Kafein 100 mg oral saat awal seran… |
| B-0060 | SP0231 #24 | dosis | 0,04 mg | maksimal 0,04 mg | penggunaan epinefrin maksimal 0,04 mg. |
| B-0061 | SP0238 #4 (not rendered) | dosis | 40 tetes | maksimal 40 tetes | tetes sampai his adekuat (maksimal 40 tetes/menit) atau berikan |
| B-0062 | SP0248 #3 (not rendered) | dosis | 30 mg | dosis maksimal 30 mg | dengan dosis maksimal 30 mg. |
| B-0063 | SP0249 #3 | dosis | 300mg | maks 300mg | Antihipertensi: labetalol 20mg IV then 20-80mg q20-30min (maks 300mg), atau nifedipine 10mg PO (mengunyah) then 10-20mg q20-30min, atau hyd… |
| B-0064 | SP0258 #4 | dosis | 2 mg | dosis maksimal 2 mg | Vincristine: 1,5 mg/m2 (dosis maksimal 2 mg), Etoposide: 150 |
| B-0065 | SP0280 #102 | dosis | 10% | tidak boleh lebih dari 10% | Asam lemak jenuh tidak boleh lebih dari 10% dari total |
| B-0066 | SP0320 #24 | dosis | 0,75 g | maksimum 0,75 g | *) Kanamisin diberikan maksimum 0,75 g untuk pasien usia >59 |
| B-0067 | SP0329 #7 (not rendered) | dosis | 800 mg | maksimal 800 mg | maksimal 800 mg), atau |
| B-0068 | SP0329 #10 (not rendered) | dosis | 800 mg | dosis maksimal 800 mg | mg/kgBB (dosis maksimal 800 mg), atau |
| B-0069 | SP0331 #25 | dosis | 6 tablet | Maksimum 6 tablet | Maksimum 6 tablet dibagi dalam beberapa dosis. |
| B-0070 | SP0056 #7 | frekuensi | 2x/hari | 1-2x/hari | Topikal kortikosteroid: hydrocortisone 1% (wajah), triamcinolone 0.1% (badan), mometason/betamethasone (kronik) - apply 1-2x/hari. |
| B-0071 | SP0056 #8 | frekuensi | 2x/hari | 1-2x/hari | Topikal kortikosteroid: hydrocortisone 1% (wajah), triamcinolone 0.1% (badan), mometason/betamethasone (kronik) - apply 1-2x/hari. |
| B-0072 | SP0077 #4 | frekuensi | 4 kali sehari | 3-4 kali sehari | - Tetes mata kortikosteroid ringan (Fluorometolon 0.1%) 3-4 kali sehari jangka pendek pada kasus nodular yang mengganggu. |
| B-0073 | SP0077 #8 | frekuensi | 4 kali sehari | 3-4 kali sehari | - Tetes mata kortikosteroid ringan (Fluorometolon 0.1%) 3-4 kali sehari jangka pendek pada kasus nodular yang mengganggu. |
| B-0074 | SP0107 #65 | frekuensi | 6 x | 4-6 x | Tetes mata kombinasi kortikosteroid + antibiotik 4-6 x 1 tetes sehari |
| B-0075 | SP0109 #2 | frekuensi | 3 kali | 2-3 kali | Profilaksis sekunder dengan dosis 10-20 IU/kg BB, 2-3 kali |
| B-0076 | SP0198 #1 | frekuensi | 6 kali sehari | 4-6 kali sehari | - Tetes mata air mata buatan (artificial tears) bebas pengawet (Carboxymethylcellulose 0.5% atau Sodium Hyaluronate 0.1%) 4-6 kali sehari a… |
| B-0077 | SP0198 #3 | frekuensi | 6 kali sehari | 4-6 kali sehari | - Tetes mata air mata buatan (artificial tears) bebas pengawet (Carboxymethylcellulose 0.5% atau Sodium Hyaluronate 0.1%) 4-6 kali sehari a… |
| B-0078 | SP0245 #197 | frekuensi | 3x/ hari | 2-3x/ hari | Aeruginosa Sefepime 2gr IV 2-3x/ hari (infus 3 jam) |
| B-0079 | SP0257 #21 | frekuensi | 4 x | 3-4 x | - Antasida atau Natrium Alginat 3-4 x 10 mL pasca makan untuk proteksi mukosa saat serangan heartburn. |
| B-0080 | SP0257 #26 | frekuensi | 4 x | 3-4 x | - Antasida atau Natrium Alginat 3-4 x 10 mL pasca makan untuk proteksi mukosa saat serangan heartburn. |
| B-0081 | SP0323 #9 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Antiseptik kumur: Klorheksidin glukonat 0.1-0.2% kumur 2-3 kali sehari. |
| B-0082 | SP0323 #11 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Kortikosteroid topikal: Triamsinolon asetonid pasta oral 0.1% dioleskan tipis pada lesi 2-3 kali sehari pasca makan. |
| B-0083 | SP0323 #14 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Antiseptik kumur: Klorheksidin glukonat 0.1-0.2% kumur 2-3 kali sehari. |
| B-0084 | SP0323 #16 | frekuensi | 3 kali sehari | 2-3 kali sehari | - Kortikosteroid topikal: Triamsinolon asetonid pasta oral 0.1% dioleskan tipis pada lesi 2-3 kali sehari pasca makan. |

## How an approved change will be applied

A script beside this report reads the approved ids from `dose-audit-candidates.json` and, per row:

1. stops if the row's field does not hold the `old` value of the proposal (the SSOT changed since this audit);
2. writes the `new` value and, for a quote change, checks the new quote against the same source (own text or library PDF) and stops if it is not found;
3. appends to `catatan` `; Audit dosis 2026-10-24: <field> semula "<old>"; disetujui Gaffer.`, so an auto-extracted row still starts with "Diekstrak otomatis" and stays under `NOT_A_DRUG`;
4. for deletions, writes the removed rows to `dose-audit-removed.json` first, applies every field change before any deletion, and deletes per entry from the highest index down so the indices of the proposals stay valid (no `catatan` in the SSOT refers to a row by its index); `_meta.catatan`, which the catalogue description repeats, gets one sentence naming the file;
5. adds an approved new row at the end of its entry's `dosis`, after checking its quote against the entry's therapy text;
6. recomputes `status.n_pernyataan_dosis` and `status.n_obat_berdosis` per entry the way the SSOT counts them now, and checks the round trip.

No dose value is written that the row's own quote or its source does not contain.

## Limits

- The drug lexicon is heuristic (curated names, FORNAS words, suffixes, edit distance 2). A real drug the lexicon misses lands in "read by hand", never in "delete".
- KMK 1186/2022 and Permenkes 5/2014 rows are checked against the entry's own text of that source, not the PDF; a typo shared by both cannot be seen.
- "Quote found" means the words are present; it does not prove the row's `populasi`, `konteks` or `halaman` beyond the KMK/Permenkes chapter range.
- The 4,480 rows whose source is not in the library were checked only for internal consistency (fragment, per-kg, frequency, duplicate), not against a source.

## Sample of the delete candidates (H)

30 of the 1,350, evenly spaced by id.

| ID | Entry, row | obat | dosis | Quote |
|---|---|---|---|---|
| H-0001 | SP0007 #0 | Individual Cohort | 80% | IIB Individual Cohort study (including low quality RCT, e.g <80% follow up) |
| H-0046 | SP0014 #77 | APTT | 1.0 g | PT<1,5, APTT<1,5, dan fibrinogen >1.0 g/dL) |
| H-0091 | SP0014 #283 (not rendered) | Sebanyak | 65% | Sebanyak 65% menggunakan |
| H-0136 | SP0021 #5 (not rendered) | Sekitar | 10% | Sekitar 10% dari 120 juta kelahiran bayi memerlukan bantuan |
| H-0181 | SP0040 #71 | Trauma kepala | 60% | Trauma kepala sedang diperkirakan 60% akan menunjukan |
| H-0226 | SP0062 #14 | Diabetes | 126 mg | Diabetes: ≥ 126 mg/dL (7,0 mmol/L) |
| H-0271 | SP0064 #114 | GDPP | 140mg | terdapat GDP >80 mg/dL, GDPP >140mg/dL atau HbA1c >6.5 % |
| H-0316 | SP0097 #33 (not rendered) | Anemia | 13 g | Anemia, didefinisikan sebagai konsentrasi hemoglobin < 13 g/dL |
| H-0361 | SP0107 #40 (not rendered) | Sekitar | 50% | Sekitar 50%-75% pasien dengan aniridia menderita |
| H-0406 | SP0113 #1 | Hampir | 80% | Hampir 80% pasien hepatitis C akut akan menetap menjadi |
| H-0451 | SP0124 #27 | Terdapat pada | 2-10% | Terdapat pada 2-10% populasi hipertensi sekunder yang sebagian |
| H-0496 | SP0139 #1 (not rendered) | Lebih dari | 60% | Lebih dari 40% hingga 60% wanita akan mengalami |
| H-0541 | SP0150 #73 | Kebutuhan lemak | 35–50% | Kebutuhan lemak sebesar 35–50% |
| H-0586 | SP0155 #14 | Mungkin KSH | 100% | Mungkin KSH belum 100% pasti bahwa • ≥ 20 mm dan tanpa |
| H-0631 | SP0178 #40 | Koagulopati | 95% | Koagulopati/DIC (4 studi, 1036 subjek, RR 0,89, 95% CI 0,56 – 1,41) |
| H-0676 | SP0182 #51 | Sindrom Tumor | 29-79% | Sindrom Tumor Lisis diperkirakan menyebabkan 29-79% |
| H-0721 | SP0187 #62 | Kontak | 21 % | Kontak 21 % |
| H-0766 | SP0196 #124 | Analisis | 75% | Analisis <75% dari ≤50% dari <75% ≤75% dari <75% ≤50% |
| H-0811 | SP0212 #41 | Secara keseluruhan | 7% | Secara keseluruhan, sekitar 7% pasien dengan |
| H-0856 | SP0221 #44 | Tiga puluh | 90% | Tiga puluh tiga sampai 90% fraktur shaft humerus |
| H-0901 | SP0223 #188 | Penyakit kardiovaskular | 35% | a) Penyakit kardiovaskular yang berat (EF <35% |
| H-0946 | SP0245 #4 | Ureum | 64,2 mg | • Ureum> 64,2 mg/dL +20 |
| H-0991 | SP0253 #47 | Cold Lateral | 2% | Cold Lateral Kondensasi o Gutapercha ISO 2% o Pengisian pada |
| H-1036 | SP0268 #49 | ScvO | 7 g | saturasi vena cava superior (ScvO2) <70% atau Hb <7 g/dL. |
| H-1081 | SP0280 #7 | Area Under | 95% | NPV 59.2% dengan nilai Area Under the Curve (AUC): 0.65 (95% IK: |
| H-1126 | SP0280 #130 | Insidensi | 7-9% | tersering yaitu dengan Insidensi 7-9% dari semua resipien |
| H-1171 | SP0284 #19 (not rendered) | Grade | 75% | Grade 3: Ossifikasi lateral 75% dari Apophysis |
| H-1216 | SP0292 #0 (not rendered) | Indonesia adalah | 37,2% | di Indonesia adalah 37,2% pada tahun 2013, dan menurun menjadi |
| H-1261 | SP0317 #4 | Bandung bulan | 3,4% | Bandung bulan Januari – Juli tahun 2011 sebesar 3,4% (109 orang korban |
| H-1306 | SP0321 #6 (not rendered) | Sekitar | 30 - 40% | Sekitar 30 - 40% populasi anak dengan gangguan pendengaran disertai |
