# Final Source Parser QA Report — V2 (72 PNPK)

## Verified technical results

| Metric | Result |
|---|---:|
| New original PDFs matched and SHA-256 checked | 72/72 PASS |
| Old PDF sources from V1 retained | 8 |
| Source PDF pages parsed | 8,332 |
| Exact source-anchored machine candidate excerpts | 904 |
| Evidence quote-to-page offset verified | 904/904 PASS |
| Record JSON and Markdown files | 144 + 144 |
| Previous curated clinical facts preserved | 182/182 PASS |
| Previous curated documents and pages preserved | 8 docs / 710 pages |
| New source documents indexed | 72 |
| FTS disease query smoke tests | 10/10 PASS |
| SQLite integrity & foreign key check | PASS / PASS |
| Source parser automatic clinical-field promotion | BLOCKED / PASS |
| Raw extraction requiring PDF visual review | 116 sparse-text pages |
| Clinician semantic approval | NOT PERFORMED |

## Why the safety gate is mandatory

Spot checks of the first source extraction identified several **wrong section-to-field associations** despite correct literal PDF anchors, e.g.:

- Pneumonia: a prevalence statistic was selected by the naive definition heuristic.
- Anesthesiology: an appendix-related symptom sentence from the same guideline was selected as a generic symptom candidate.
- Childhood leukemia: supportive treatment language was initially classified as symptoms.
- Chronic kidney disease: introductory text was initially selected as a definition.

All top-level clinical fields for the 72 remain explicitly missing and are not eligible for clinical retrieval; these excerpts are retained **only in the review queue** for source-specific evaluation. Exact string matching is necessary but insufficient for clinical meaning or appropriateness.

## Machine triage flags

- DEFINITION_SEMANTICS_UNCERTAIN: 77
- METHODOLOGY_OR_ADMINISTRATIVE_MIXTURE: 10
- SYMPTOM_VS_TREATMENT_MIXTURE: 37
- TOPIC_ALIGNMENT_UNCONFIRMED: 161

## Final scope

**COMPLETE:** source retrieval, independent PDF text parsing, per-page provenance, document mapping, exact anchor validation, isolated SQLite/FTS, machine candidate queue, safe-field quarantine.

**NOT COMPLETE:** 72/72 independent clinical semantic curation, table/figure visual review, active-regulation certification, and clinician approval. Do not use machine candidates as clinical recommendations.
