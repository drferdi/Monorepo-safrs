# Paid eval after the ICD code fixes (2026-10-24)

Run: `node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:3101 targeted-codes docs/verification/theoracle-eval-2026-10-22/v0.6-gold` on commit `a297a5eb` (index `818c1be1…`), browser pane parked on `GET /api/aadi`. Result: `pipeline-2026-10-24-targeted-codes.json`. mixed_id_en-13 returned 504 TIMEOUT (20.1 s) and was re-run alone from a scratch copy of the eval set: `pipeline-2026-10-24-targeted-codes-timeouts.json` (ok).

| | itemized (`3a506cc5`) | codes (`a297a5eb`, timeout re-run merged) |
|---|---|---|
| ok | 61/61 | 61/61 |
| ICD top-1 vs draft gold | 56/61 (0.918) | 57/61 (0.934) |
| ICD valid / name match | 60 / 55 | 60 / 56 |
| doses written = supported by passages | 84 | 83 |
| doses displayed (all verified) | 61 | 62 |
| cost | 0.32 USD | 0.31 + 0.005 USD |

Cases that changed:

- abbreviations-13 "BPPV manuver Epley": R42 → H81.1 (correct against gold H81), and betahistin 3x6 mg is now displayed, verified by the SP0331 BPPV chunks and FORNAS 2023/2025. Both follow from SP0331's code change: the SSOT chunk now reads "ICD-10: H81.1", and the gate takes the BPPV entry as the diagnosis's own entry.
- abbreviations-14 "LLA pada anak kemoterapi induksi": still febrile neutropenia, coded D84.8 this time (D61.8 before); wrong against gold C91 both times. Model output; SP0182 (C91.0) did not change.
- mixed_id_en-13 (after the re-run): same as before (B20, efavirenz 1x600 mg displayed, two doses removed).

All other 58 cases have the same ICD code, correctness and displayed-dose count as the itemized run. Retrieval, prompts and the exclusion list were not tuned on this result.
