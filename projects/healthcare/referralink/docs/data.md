# Data

- Synthetic clinical input only. The public sandbox must never receive patient identity or PHI.
- Server state: Upstash Redis (challenges, sessions, quotas) and Upstash Vector (diagnosis
  support index). Both are external and declared by environment-variable name in
  `project.contract.json`.
- Browser state: IndexedDB v3 with redacted logbook audit envelopes and metadata-only
  credential records.
- Reference data in `data/`: ICD-10 legacy master and catalog, and a Sentrapedia disease
  extract. These are public reference texts, not patient data.
- `scripts/generateIcd10LegacyMaster.py` and `scripts/syncSentrapediaCatalog.mjs` regenerate
  reference data; review the diff before committing their output.
