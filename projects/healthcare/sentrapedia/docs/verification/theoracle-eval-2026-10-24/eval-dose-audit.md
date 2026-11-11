# Paid eval after the dose audit (2026-10-24)

Run: `node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:3101 dose-audit docs/verification/theoracle-eval-2026-10-22/v0.6-gold` on commit `22a8cea5` (index `d0fa8c3f…`, 17,899 chunks), browser pane parked on `GET /api/aadi`, model gemini-3.1-flash-lite. Result: `pipeline-2026-10-24-dose-audit.json`. No case timed out, so nothing was re-run. Compared with `pipeline-2026-10-24-targeted-codes.json` (its mixed_id_en-13 taken from the timeout re-run).

| | codes (`a297a5eb`) | dose audit (`22a8cea5`) |
|---|---|---|
| ok | 61/61 | 61/61 |
| ICD top-1 vs draft gold | 57/61 (0.934) | 57/61 (0.934) |
| ICD valid / name match | 60 / 56 | 60 / 56 |
| doses written / supported by passages | 83 / 83 | 84 / 83 |
| doses displayed (all verified) | 62 | 63 |
| cost | 0.31 + 0.005 USD | 0.32 USD |

Every case has the same ICD code as before. The doses shown changed in 13 cases, in both directions:

- More shown: lay_terms-11 pertussis (azitromisin 5 mg/kgBB for days 2-5 added), abbreviations-08 E11.9 (metformin 2x500 mg, removed before), mixed_id_en-12 hepatitis B (tenofovir disoproxil 300 mg, not written before), typos-04 pneumonia (ampisilin 4x1.5 g, removed before), typos-11 beta thalassemia major (kalsium 500 mg and vitamin D 400 U from the Thalasemia entry, not written before), typos-14 epistaxis (lidokain 2%, removed before).
- Fewer shown: lay_terms-03 pityriasis versicolor (selenium sulfida 1.8% removed; SP0313's row "Suspensi selenium sulfida 1,8%" is unchanged), abbreviations-05 CSOM (ofloxacin drops not written; SP0216's manual ofloxacin row is unchanged, M2 renamed two other rows to ciprofloxacin and levofloxacin), mixed_id_en-02 heart failure (bisoprolol and spironolakton not written), typos-03 E11.9 (metformin 2x500 mg removed), typos-12 osteoarthritis (jahe 250 mg written but not supported, so removed).
- Same count, other dose: abbreviations-01 COPD (metilprednisolon 32 mg → prednison 40 mg), mixed_id_en-08 otitis externa (ofloxacin 10 tetes → 2x4 tetes). lay_terms-13 and mixed_id_en-10 differ only in doses written and removed.

None of these drugs lost a row to H. The same dose moved in opposite directions (metformin 2x500 mg for E11.9 is shown in abbreviations-08 and removed in typos-03), so the changes read as run-to-run differences in the model's output and in which passages reach the dose step (the SSOT chunks were re-split), not doses the audit removed. Retrieval, prompts and the exclusion list were not tuned on this result.
