# Data

- Patient data: the extension reads patient data from the open ePuskesmas page at run time to
  assist the clinician. It must never be written into this repository, fixtures, tests, or logs.
  Outgoing API payloads pass the PII guard in `lib/api/pii-guard.ts`.
- Bundled reference data (public, no patient-level records):
  - `public/data/penyakit.json` — 159-disease clinical knowledge base (R3).
  - `public/data/epidemiology_weights_v2.json` — aggregate counts and prevalence per ICD-10 code
    from Puskesmas Balowerti and four Pustu, January 2025 to February 2026; no individual
    records.
  - `public/data/stok_obat.json` — drug stock reference.
  - `data/ddi-clinical.json` — drug–drug interaction reference.
- Browser storage: extension storage for settings and session tokens (`@wxt-dev/storage`).
- Changes to the knowledge base or epidemiology weights are clinical changes (R3).
