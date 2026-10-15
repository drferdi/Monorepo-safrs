# Dose inventory

Data for the dose gate, built 2026-10-11 and moved here from the git-ignored `.runtime/dose-inventory/`
of the main checkout (bytes unchanged). Not clinician reviewed. Source typos are copied verbatim.

| File | Content |
| --- | --- |
| `inventory.json` | About 296 disease groups from `oracle/sentrapedia.json`, `oracle-ii/knowledge_base` and the legacy `penyakit.json`, with the dose status per group |
| `pnpk_doses_verified.json` | 1,491 drug-dose statements from PNPK PDFs, each with page and verbatim quote |
| `ppk_doses_verified.json` | 757 drug-dose statements from PPK FKTP (KMK 1936/2022, PPK IDI 2017), each with page and verbatim quote |
| `iso_gap_fill.json` | 120 rows from ISO Indonesia Vol. 53 (2021) for 19 groups: general per-drug doses, not first-line regimens |
| `build_inventory.py` | Rebuilds `inventory.json` |

`build_inventory.py` reads `oracle-ii/knowledge_base/json/` and Gaffer's legacy `penyakit.json` next to
itself. Neither is in this branch (`penyakit.json` is kept untracked on purpose: some ICD-10 codes are
wrong), so it only reruns where both exist. Details: `.agents/HANDOFF.md`, sections of 2026-10-11 18:10-19:00.
