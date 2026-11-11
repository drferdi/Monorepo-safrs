# Paid eval after dose audit rounds 2-3 (2026-10-24)

Run: `node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:3101 dose-audit-r3 docs/verification/theoracle-eval-2026-10-22/v0.6-gold` on the SSOT after rounds 2, 3 and 3b (`852c762c…`, index `9b81edc3…`, 17,871 chunks), browser pane parked on `GET /api/aadi`, model gemini-3.1-flash-lite. Result: `pipeline-2026-10-24-dose-audit-r3.json`. No case timed out. Compared with `pipeline-2026-10-24-dose-audit.json` (round 1).

| | round 1 (`22a8cea5`) | rounds 2-3 |
|---|---|---|
| ok | 61/61 | 61/61 |
| ICD top-1 vs draft gold | 57/61 (0.934) | 57/61 (0.934) |
| ICD valid / name match | 60 / 56 | 60 / 56 |
| doses written / supported by passages | 84 / 83 | 84 / 83 |
| doses displayed (all verified) | 63 | 63 |
| cost | 0.32 USD | 0.32 USD |

Every case has the same ICD code. Benchmark `../theoracle-eval-2026-10-22/v0.6-gold/benchmark-v06-dose-audit-r3.json`: recall@5 77/88 and targeted dose 57/61 as before, dose recall 50 → 51 (mixed_id_en-05 now hit).

Doses shown changed in 19 cases, in both directions. Now shown: lay_terms-03 selenium sulfida 1.8%, lay_terms-13 diosmin + hesperidin (SP0110's rows were "Venotonik", renamed in round 3b), abbreviations-05 ofloxacin drops, typos-03 insulin basal 10 unit. No longer shown: typos-04 ampisilin 4x1.5 g, typos-14 lidokain 2%. Other doses: abbreviations-08 metformin → insulin basal, abbreviations-11 sertralin 25 → 50 mg, typos-11 kalsium and vitamin D → deferoksamin 40-50 mg/kg, typos-13 haloperidol and triheksifenidil → risperidone; the rest differ in spelling or in how the dose is written. As in round 1, these read as run-to-run differences of the model and of the passages that reach the dose step. Retrieval, prompts and the exclusion list were not tuned on this result.
