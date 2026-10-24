# Why fewer doses are shown on the SSOT v0.6 index (read-only diagnosis, 2026-10-23)

Source: `eval-rerun-v06.md` (doses shown 56 → 49 against the v0.5 index D). Nothing was changed. The replay ran the production retrieval and the dose gate offline: local query embedding, no model call. It used the drug and dose the model wrote in the v0.5 run, on three indexes (D v0.5 + both pathology PDFs, E v0.5 without the case-report PDF, v0.6) and two catalogues (v0.5, v0.6). Rows are in `dose-gate-replay.jsonl`; `v` = verified, `d` = dose removed, `r` = drug removed.

| Case, diagnosis, drug | D + v0.5 cat | E + v0.5 cat | v0.6 + v0.5 cat | D + v0.6 cat | E + v0.6 cat | v0.6 + v0.6 cat | Cause |
|---|---|---|---|---|---|---|---|
| lay_terms-06 TTH G44.2, parasetamol 3x1000 mg | v | d | r | v | d | r | index: in D only the case-report PDF verified it |
| abbreviations-01 PPOK J44.1, prednison 1x40 mg | v | v | v | d | d | d | catalogue codes |
| abbreviations-03 cystitis N30.0, ciprofloxacin 2x250 mg | v | v | v | d | d | d | catalogue codes |
| typos-05 asthma J45.9, salbutamol 1x2.5 mg | v | v | d | v | v | d | index: merged asthma entry |
| mixed_id_en-02 heart failure I50.0, ramipril + bisoprolol | dd | dd | dd | dd | dd | dd | model chose I50.0 |
| mixed_id_en-02 heart failure I50.1 (v0.5 run's diagnosis) | vv | vv | vv | vv | vv | vv | — |
| lay_terms-05 BPPV R42 or H81.1, betahistin 3x6 mg | v | v | v | v | v | v | model wrote another drug |

Also model variation, no gate loss: lay_terms-04 (hordeolum, 2 drugs written instead of 3, all verified) and typos-10 (G43.0 → G43.9, 1 drug instead of 2, verified).

## Causes

1. **Catalogue codes (2 cases, systemic).** v0.6 keeps in `icd10` only the code of the PPK's "No. ICD" line and moves the rest to the new field `icd10_sumber_lama`. Examples: COPD J44, J44.9 → J44.9; ISK N30, N39, N39.0 → N39.0; TTH G44, G44.2 → G44.2; BPPV H81, H81.1, H82, R42 → R42; Gagal Jantung I50, I50.9 → I50.9.
   - `scripts/build-oracle-catalog.mjs` writes only `icd10` into the catalogue `kode`.
   - The gate (`diagnosisWords`, `referenceIncludes`) therefore no longer finds a catalogue entry for a sibling code such as J44.1 or N30.0. It loses the disease words and removes the dose.
   - Scope: 107 of 336 v0.6 entries have `icd10_sumber_lama`, and 95 of them lost a 3-character category code. Any model diagnosis that is a sibling of the PPK code is affected, not only these two cases.
2. **Merged asthma entry (1 case).** v0.6 merged "Asma Bronkiale" into "Asma Bronkial". The text "Salbutamol nebulisasi 2.5-5 mg" is still there, but it now sits in a longer document. Retrieval keeps two chunks per document, and the two kept "Asma Bronkial" chunks are not the one that states 2.5 mg.
3. **Case-report exclusion (1 case, expected).** On the v0.5 index, TTH parasetamol was verified only by a passage from `patologi-klinik-anatomik-unair.pdf`. Without that PDF no passage supports the dose. On v0.6 no passage names parasetamol for TTH at all. The earlier "verified" was weak evidence.
4. **Model variation (4 cases).** Heart failure: the gate removes the doses for I50.0 on every index and catalogue, and verifies them for I50.1, so the model's code choice decides. BPPV: the replay verifies betahistin on every combination, so the eval's removed drug was a different drug the model wrote that run. Hordeolum and migraine: fewer drugs written, all verified.

## Options for Gaffer (not done)

- Cause 1:
  - The catalogue builder could also write `icd10_sumber_lama` into the codes the gate matches (catalogue shape or `kode`). This is a builder change, not a retrieval change.
  - Or the SSOT could keep the category code in `icd10`.
  - Or the gate could match on the 3-character category.
- Cause 2: an upstream SSOT question. Either the merged entry keeps its dose text in its own section, or the per-document cap is accepted as is.
- Causes 3 and 4: no action suggested.

## Follow-up 2026-10-23: cause 1 fixed (Gaffer's choice)

`scripts/build-oracle-catalog.mjs` now writes the sorted union of `icd10` and `icd10_sumber_lama` into the catalogue `kode` (COPD "J44, J44.9", ISK "N30, N39, N39.0", TTH "G44, G44.2", BPPV "H81, H81.1, H82, R42"). Replay on the v0.6 index (`dose-gate-replay-after-fix.jsonl`) now gives the same statuses as the v0.5 catalogue column: PPOK J44.1 and cystitis N30.0 are verified again. Asthma, TTH, heart failure I50.0 and BPPV are unchanged; they were not catalogue causes. No paid eval was re-run.
