# Paid eval and one browser Analisis after the gate rules and dose options B-E, 2026-10-23

Index `indexSha256` `c63b1627…` (17,993 chunks), catalogue 330 entries, gate of `796f24eb` (cross-referenced doses, OAT abbreviations, own-entry SSOT passages), builder of `2f88925b` (options B-E). Server `scripts/run-system.mjs dev` on port 3101; the browser tab stayed on `GET /api/aadi` during the eval.

## Paid eval (`pipeline-2026-10-23-targeted-optBE-gate.json`, eval set `v0.6-gold`)

- 59/61 ok, 0.31 USD. abbreviations-04 and typos-02 ended in 504 `TIMEOUT` (about 20 s); re-run alone (`…-timeouts.json`, 0.01 USD) both ok in about 4.5 s with the same doses shown as the v0.6 rerun (2 and 1).
- Against the v0.6 rerun (`../theoracle-eval-2026-10-22/pipeline-2026-10-22-targeted-v06-index-rerun.json`): doses shown 49 → 61 on the 59 cases (64 with the two re-run cases), dose removed 33 → 22, drug removed 2 → 1, every shown dose verified. ICD top-1 0.934 → 0.915 on 59 cases (abbreviations-13 and -14 now wrong, lay_terms-05 now right; model variation, not investigated).
- New verified doses, all from passages of the same disease: TB (abbreviations-07, typos-01) isoniazid, rifampisin, pirazinamid, etambutol from the Tuberkulosis Paru entry; asthma (typos-05) salbutamol 3x2.5 mg and prednison from Asma Bronkial (the open "2.5 mg chunk" item); COPD metilprednisolon, cystitis fosfomisin, TTH parasetamol, BPPV betahistin, pertussis azitromisin, hepatitis B and HIV tenofovir/efavirenz, heart failure (I50.1) furosemid, ramipril, bisoprolol, spironolakton, conjunctivitis kloramfenikol, osteoarthritis jahe, type 2 diabetes metformin.
- Fewer shown: lay_terms-08 food allergy (cetirizine, by design), typos-11 thalassemia (folic acid chunk not retrieved, see the dose audit), lay_terms-13 haemorrhoid, abbreviations-05 otitis, mixed_id_en-04 stroke, abbreviations-13 (now coded R42).
- SSOT question: abbreviations-08 (E11.9) metformin was verified by the "Diabetes melitus tipe 1" entry, whose `icd10` is E10, E11, E14 (the same codes as Diabetes Melitus Tipe 2) and whose therapy text is a combined KKI text that names metformin.
- Remaining non-drug rows: the E2E retrieved a cirrhosis chunk with "obat: Normal; dosis: 2.0 mg" (a lab reference row); "normal" is not in the option C word list.

## Browser Analisis

Same fictional case as `../theoracle-eval-2026-10-22/e2e-analisis-2026-10-22.md` ("Pasien fiktif, laki-laki 30 tahun, demam 6 hari …", TD 110/70, N 88, S 38,9, RR 20), Standar. Trace `ec3e629a-38d4-4034-ab5c-74580a282387`, 0.0056 USD.

- Likely: Typhoid fever (A01.0); alternatives dengue, malaria; cannot miss sepsis.
- Therapy shown: "Kloramfenikol 500 mg, diminum empat kali sehari selama 14 hari"; summary "1 dari 1 obat dosisnya terverifikasi". Interactions and contraindications marked "(belum terverifikasi)".
- Grounding index in the response: `c63b1627…`; passages include `fasyankes-primer-idi-2017.pdf` and the SSOT Demam Tifoid diagnosis chunk.
