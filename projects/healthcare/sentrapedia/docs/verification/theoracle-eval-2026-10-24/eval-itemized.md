# Paid eval after the item-by-item fixes (2026-10-24)

Run: `node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:3101 targeted-itemized docs/verification/theoracle-eval-2026-10-22/v0.6-gold` on commit `3a506cc5` (index `fc028da5…`), browser pane parked on `GET /api/aadi`. Result: `pipeline-2026-10-24-targeted-itemized.json`.

| | 2026-10-23 (B-E gate, timeouts re-run) | 2026-10-24 |
|---|---|---|
| ok | 61/61 | 61/61 |
| ICD top-1 vs draft gold | 56/61 (0.918) | 56/61 (0.918) |
| doses written / supported by passages | - | 84 / 84 |
| doses displayed (all verified) | 64 | 61 |
| cost | - | 0.32 USD, 10 rate-limit retries |

Cases whose displayed doses changed (ICD unchanged in all five):

- abbreviations-08 (E11.9, 1 → 0): metformin 2x500 mg was verified only by the SP0063 "Diabetes melitus tipe 1" chunk, whose combined KKI text carries a metformin line. That entry counted as the diagnosis's own entry because it was coded E10, E11, E14. Coded E10 since item 2, it no longer does, and the DM tipe 2 entry's own dose chunk was not retrieved. The removal follows from the code fix.
- mixed_id_en-13 (B20, 2 → 1): tenofovir was not verified this time; the HIV/AIDS passage that verified it on 2026-10-23 (chunk `03b39641…`, a PDF chunk, unchanged) was retrieved again and verified efavirenz. The written tenofovir dose differs from the run before (model output).
- lay_terms-11 (A37.0, 2 → 1) and mixed_id_en-12 (B18.1, 1 → 0): the model wrote fewer drugs (2 → 1, 1 → 0); the passages are the same.
- abbreviations-05 (H66.1, 1 → 2): the model wrote one more drug, verified from the entry's own chunk.

Retrieval, prompts and the exclusion list were not tuned on this result.
