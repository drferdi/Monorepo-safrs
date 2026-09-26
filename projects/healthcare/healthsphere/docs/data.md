# Data

- `database/icd10.json`: WHO ICD-10 master list; the primary reference when sources conflict.
- `database/144_penyakit_puskesmas.json`: the 144 diseases that Puskesmas handle, with
  reference clinical content.
- `database/icdx-extensions.json`: local ICD-X extensions.
- All of it is public reference data. No patient data, and no transactional database.
- Dataset backups (`database/backups/`) are not kept in this capsule.
- Changing or deleting an established diagnosis code needs a sound medical basis and Chief's
  approval.
