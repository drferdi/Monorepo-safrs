# Paid eval re-run on the SSOT v0.6 index, 2026-10-22

Re-run of `pipeline-2026-10-22-targeted-v06-index.json` (49/61, 12 × 429 `BUSY` from a concurrent browser analysis) with the browser pane parked on `GET /api/aadi`. Output: `../pipeline-2026-10-22-targeted-v06-index-rerun.json`, index `e46a2fb0…`, gold `v0.6-gold/`.

| Run | ok | ICD top-1 | ICD valid | name match | doses supported | doses shown | doses removed | p50 / p95 ms | cost USD |
|---|---|---|---|---|---|---|---|---|---|
| A v0.2 index | 61/61 | 0.951 | 0.967 | 0.934 | 80/81 | 58 | 23 | 3,836 / 4,689 | 0.31 |
| D v0.5 index | 61/61 | 0.951 | 0.984 | 0.918 | 82/82 | 56 | 25 | 3,940 / 4,540 | 0.32 |
| v0.6 index (re-run) | 61/61 | 0.934 | 0.984 | 0.918 | 84/84 | 49 | 33 | 4,039 / 4,863 | 0.32 |

- ICD top-1 vs D: lay_terms-05 (H81.1 → R42) and mixed_id_en-09 (A41.9 → R57.2) now wrong, abbreviations-14 (D84.8 → C91.0) now right.
- Doses shown fall in 8 cases and rise in 2. Same diagnosis, fewer shown: lay_terms-04 (H00.0), lay_terms-06 (G44.2, 0/1), abbreviations-01 (J44.1, 0/1, removed), abbreviations-03 (N30.0, 0/1, removed), typos-05 (J45.9, 0/2, removed). Diagnosis changed: lay_terms-05, mixed_id_en-02 (I50.1 → I50.0, 0/3), typos-10. More shown: lay_terms-14 (K30 → K29.7), typos-01 (A15.0).
- Not investigated or tuned (Gaffer: report, do not tune). Model output varies between runs, and v0.6 renames and code changes reach the dose gate through the catalogue names (for example Asma Bronkiale → Asma Bronkial, TTH coded G44.2 only).
