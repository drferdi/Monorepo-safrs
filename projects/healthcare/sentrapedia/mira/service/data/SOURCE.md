# ICD-10 code list

`icd10.json` is a byte-for-byte copy of the list used by the Sentra crew portal.

- Source repository: IntelligenceBoard (`projects/healthcare/medboard`) in the Sentra Monorepo
- Source path: `database/icd10.json` (identical to `public/data/icd10.json` in the same project)
- Source commit: `fbe291bfa3b461927c0b629357dade5351660506` (2026-09-27)
- Provenance, from the file's own `_metadata`: "Database ICD-10 e-Klaim BPJS Kesehatan", source
  "BPJS Kesehatan e-Klaim", metadata version 1.0.0, last updated 2026-01-30
- Version: every entry is tagged `ICD10_2010` (WHO ICD-10, 2010 edition, as used for BPJS claims)
- Size: 18,543 entries (`kode`, `nama_en`, `version`), 2,051 three-character categories
- SHA-256: `d2a3f5b0e3104ae5d6fe65179adf8f647d77e4cc85cddcb55f76cd06f1f78b10`
- Licence: **not verified.** Neither the file nor the source project states under which terms the
  list may be redistributed.

Why not the Med Assist list: Med Assist's only ICD source is `public/data/penyakit.json` (130
unique codes, no K35–K37). Validating against it would remove diagnoses outside the old knowledge
base, which is what this engine is being evaluated for.
