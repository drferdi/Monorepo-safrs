# TheOracle pipeline evaluation: legacy vs targeted therapy (2026-10-11)

Live run, 61 cases each (`eval-set.json` gold queries, no exact-term rows), model `google/gemini-2.5-flash` via OpenRouter, TheOracle index `f9d64669...`. Same code, same engine; only `MIRA_TARGETED_THERAPY` differs. Script: `scripts/eval-theoracle-pipeline.mjs`. Raw rows: `pipeline-2026-10-11-{legacy,targeted}.json`.

## Result (numbers first)

| Metric | Legacy | Targeted |
|---|---|---|
| Cases ok / run | 61 / 61 | 61 / 61 |
| Latency total p50 / p95 | 2.50 s / 2.87 s | 4.55 s / 5.55 s |
| retrieve_dx p50 / p95 | 79 / 96 ms | 78 / 94 ms |
| mira_dx p50 / p95 | 2394 / 2785 ms | 2522 / 2949 ms |
| retrieve_tx p50 / p95 | - | 43 / 47 ms |
| mira_tx p50 / p95 | - | 1879 / 2512 ms |
| gate p50 / p95 | 1 / 1 ms | 1 / 1 ms |
| ICD-10 valid | 100% | 100% |
| ICD-10 top-1 vs draft gold (queries name the disease; upper bound) | 98.4% (60/61) | 98.4% (60/61) |
| Drugs written (gate report) | 65 | 71 |
| Doses written | 64 | 71 |
| Doses "supported" (loose lexical, overstates; see limits) | 61 (95.3%) | 69 (97.2%) |
| Drugs verified (dose shown; headline dose number) | 36 (55%) | 41 (58%) |
| Dose removed (drug shown, dose blanked) | 20 (31%) | 28 (39%) |
| Drug removed (no support) | 9 (14%) | 2 (3%) |
| Doses displayed | 36 | 41 |
| Cases with at least one verified dose | 27 | 31 |
| Therapy retrieval success | n/a | 100% (61/61) |
| Path taken | legacy 61 | targeted 61, no `TARGETED_UNAVAILABLE`, no failed stage |
| Cost, audit log (all MIRA calls) | $0.8945 (61 calls) | $0.8401 (122 calls) |

Cost note: `result.meta.costUsd` summed to $0.6009 for targeted (diagnosis step only); the audit log adds the therapy calls, giving $0.8401. Targeted is not more expensive overall because the diagnosis call no longer writes therapy. Total spend of this evaluation: $1.7345 (audit total for the day $1.7673 including $0.0328 spent earlier).

Offline retrieval numbers from Task 2 (dose-bearing chunk from a gold doc or naming the gold disease reaches the model, 61 queries): 0.508 (before) -> 0.754 (after the second query) -> 0.885 (targeted retrieval, 54/61).

### Re-scored with the final gate (offline replay, no model calls)

The table above uses the gate at `c67639e6`. The final review then tightened the gate:
- strengths in note, duration, route, the drug name and safety items are checked;
- both bounds of a range are checked;
- mEq, mmol, "juta IU" and μg are recognised.

The gate was replayed over the same 122 model replies stored in the MIRA audit log (`.runtime/mira-deepseek/audit/audit-2026-10-11.jsonl`, with the grounding bundle sent to each call). The replay with the old gate reproduces the committed counts exactly (36/20/9 and 41/28/2), so it is a faithful re-run.

| Gate counts (drugs) | Legacy | Targeted |
|---|---|---|
| Verified, old gate → final gate | 36 → 38 | 41 → 43 |
| Dose removed | 20 → 18 | 28 → 26 |
| Drug removed | 9 → 9 | 2 → 2 |

Headline with the shipped gate: verified doses **38 → 43** (legacy → targeted), drug removals 9 → 2. Counted with drop, spray and puff counts as strengths (last gate change). That change verified 7 more drops, each against a passage for the same disease: ofloksasin 2 x 4 tetes (OMSK), kloramfenikol 1 tetes (konjungtivitis), karbogliserin (serumen), ofloksasin (otitis eksterna). Before it, the counts were 35 → 39. Latency, ICD-10 and cost are unchanged; the gate takes about 1 ms.

## What it means

- The dose-correct path improved modestly end to end: verified doses 36 -> 41, drug removals 9 -> 2, cases with a usable dose 27 -> 31. Verified share of written drugs is 55% -> 58%; the larger change is that unsupported drugs are now kept with the dose blanked (28 vs 20) instead of the whole drug disappearing.
- The offline gain (0.754 -> 0.885) is larger than the end-to-end gain. The remaining gap sits in what the model writes (child vs adult forms, combined products) and in the lexical gate, not in retrieval alone.
- Diagnosis quality is unchanged (same 1 miss, `abbreviations-10`, P21.0). 4 of 61 cases picked a different top-1 code string between runs (three only in the subcode, e.g. L50.0 vs L50; one M17.9 vs M19.9); all 4 are correct under the 3-character rule in both runs.
- Latency: +2.05 s at p50, +2.68 s at p95. The cost is the second MIRA call (about 1.9 s) plus retrieval (43 ms). The 15 s retrieval limit was never approached.

## Spot-check of 10 verified doses (targeted run)

The first 10 rows with `verified > 0`; I read the cited passage in the TheOracle index and judged same disease and adult/child consistency with the dose written. This is the semantic check the lexical gate cannot do.

| # | Case | Diagnosis | Drug, dose | Same disease and population? | Note |
|---|---|---|---|---|---|
| 1 | lay_terms-01 | B80 Enterobiasis | Pirantel pamoat 10 mg/kgBB | yes | IDI 2017 helminth section, 10 mg/kg single dose, weight-based |
| 2 | lay_terms-03 | B36.0 P. versicolor | Flukonazol 50 mg | no | Cited chunk is a PERDOSKI azole list (fluconazole 50-100 mg for 14-30 d, voriconazole, posaconazole, amphotericin) with no mention of versicolor; reads as candidiasis/deep mycosis. Dose number matches, disease does not |
| 3 | lay_terms-04 | H00.0 Hordeolum | Parasetamol 500 mg | yes | Hordeolum disease note, "500 mg prn", adult |
| 4 | lay_terms-06 | G44.2 TTH | Parasetamol 1000 mg | yes | TTH note and UNAIR table, 1000 mg oral, adult |
| 5 | lay_terms-09 | B01.9 Varicella | Asiklovir 4x20 mg/kgBB | yes | Passage gives adult 5x800 mg and child 4x20 mg/kg; the model wrote the child form. Case has no age, so it cannot be told which is right |
| 6 | lay_terms-11 | A37.9 Pertussis | Azitromisin 10 and 5 mg/kgBB | yes | Pertussis note, weight-based day-1 and day 2-5 schedule |
| 7 | lay_terms-12 | B26 Mumps | Paracetamol 3-4x500 mg | yes | Mumps note: "500 mg 3-4x/hari pada dewasa" |
| 8 | lay_terms-13 | I84.9 Haemorrhoids | Diosmin 3x450 mg, Hesperidin 3x50 mg (and 2x variants) | unclear | Disease and adult match, but the passage says 450 mg + 50 mg per tablet, "3 x 2 tablet", so the per-dose figure written (450 mg) is one tablet's content, not the regimen |
| 9 | lay_terms-14 | K29.7 Gastritis | Omeprazole 1x20 mg | yes | Gastritis note: "1-2 x 20 mg/hari", adult |
| 10 | abbreviations-02 | A91 DHF | Parasetamol 3x500-1000 mg | yes | IDI 2017 DHF, "Pasien Dewasa", exact text |

Result: 8 yes, 1 no, 1 unclear. Both failures are of the kind a lexical gate passes: numbers present in a passage that is about another disease (#2) or a tablet-content figure turned into a dose (#8).

## Limits

- Every eval query names the disease, its abbreviation or a lay term for it, and the cases carry no age, sex, vitals or labs, so the ICD-10 figure measures name-to-code lookup, not diagnosis from a clinical presentation.
- Gold ICD-10 labels are drafts (written from document titles), not clinician-reviewed; accuracy against them is an upper-leaning proxy. The 98.4% reflects mostly easy, textbook queries.
- Cases are fictional one-line complaints with null age/sex; no vitals, labs or history. Adult/child cannot be told from the case, so population consistency is judged only against the passage.
- The "supported" metric is lexical and loose: a dose counts as supported when each strength number appears as a substring in any sent passage (a "5" matches "50"). It overstates support; the gate's `verified` count (drug named and dose present in the same passage) is the stricter number. The gate itself is lexical, as spot-check #2 and #8 show.
- Spot-check is 10 rows, one rater, no second reading.
- One run per path, temperature as configured; model variation between runs was not measured (4 of 61 top-1 code strings differed between the two runs).
- Cost and latency are for 1 case at a time on local CPU with a warm index (cold start 2.6 s not included).
- Therapy retrieval success was counted from `therapyGrounding`, which a `mira_tx` failure also clears; the script now reads the `retrieve_tx` stage. No `mira_tx` stage failed in the saved runs, so 61/61 still holds.
