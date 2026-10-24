# Follow-ups after 68dffeeb, 2026-10-22

Benchmark recall@5 on the relabelled gold (`eval-set.json`). D is the committed index of 68dffeeb (18,665 chunks). E drops `patologi-klinik-anatomik-unair.pdf` (case-report collection): 17,565 chunks, `indexSha256` `da2fe92f…`. "+cap" is the retrieval fix: when the dose passage's document already holds two matches, it replaces that document's lower match and the next match moves up.

| Category | A v0.2 | D | E | D+cap | E+cap (committed) |
|---|---|---|---|---|---|
| lay_terms | 0.938 | 0.813 | 0.813 | 0.875 | 0.875 |
| abbreviations | 0.933 | 0.933 | 0.933 | 0.933 | 0.933 |
| mixed_id_en | 1 | 1 | 1 | 1 | 1 |
| typos | 0.8 | 1 | 1 | 1 | 1 |
| exact_terms | 0.593 | 0.667 | 0.63 | 0.667 | 0.63 |
| · drug_dose | 0.5 | 0.625 | 0.625 | 0.625 | 0.625 |
| · icd10 | 0.333 | 0.5 | 0.5 | 0.5 | 0.5 |
| · lab | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 |
| · score | 0.75 | 0.75 | 0.625 | 0.75 | 0.625 |
| overall | 0.818 | 0.852 | 0.841 | 0.864 | 0.852 |
| doseRecall | 0.803 | 0.82 | 0.82 | 0.82 | 0.82 |
| targetedDoseRecall | 0.902 | 0.934 | 0.934 | 0.934 | 0.934 |

- Lab stays 0.8 without the case reports, so the exclusion stands. Score drops by one query: `exact_terms-25` "skor ABCD2" matched only a stroke case report in that PDF (`score-lab-probe-{D,E}.jsonl`).
- Rejected first cap variant (`benchmark-D-strict-cap-rejected.json`): skipping a dose passage whose document already has two matches drops doseRecall 0.82 → 0.59, because the dose passage is usually the gold disease's own SSOT dose chunk.
- Tifoid diagnosis retrieval, same fictional case as `e2e-analisis-2026-10-22.md` (local probe, no model call). D: `patologi-klinik-anatomik-unair.pdf` ×2, `fasyankes-primer-idi-2017.pdf`, `dermatovenereologi-perdoski-2017.pdf`, `dermatovenereologi-perdoski-2021.pdf`, Sirosis Hati Pada Dewasa. E+cap: `fasyankes-primer-idi-2017.pdf`, `dermatovenereologi-perdoski-2017.pdf`, `dermatovenereologi-perdoski-2021.pdf`, Demam Tifoid, `penyakit-dalam-papdi-2024.pdf`, Sirosis Hati Pada Dewasa.
- W92: no derived field reads it any more. In SSOT v0.2 `penyakit[SP0179].icd10` was `["W92"]` (asal PPK FKTP / PPK IDI 2017); the catalogue's `kode` derived it in 19200965 and lost it in 68dffeeb (v0.5: SP0172 `["O42","O42.9"]`). The only W92 left is guideline text: `fasyankes-primer-idi-2017.pdf` prints "No. ICPC-2 : W92 Complicated labour/delivery livebirth" under KPD, persalinan lama and ruptur perineum. W92 is an ICPC-2 code, which the v0.2 extraction read as ICD-10 (ICD-10 W92 is exposure to man-made heat).
