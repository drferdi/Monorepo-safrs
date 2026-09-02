# Indonesia Governance Profile — 2026-08-31

## Purpose
This file is an engineering governance baseline, **not legal advice**. It keeps Indonesia-specific regulatory status separate from role prompts so changes can be versioned without rewriting the entire catalog.

## Verified legal / policy baseline
### UU No. 27 Tahun 2022 — Pelindungan Data Pribadi
The BPK regulation database describes the law as covering personal-data principles and types, data-subject rights, processing, controller/processor obligations, transfers, sanctions, institutions, disputes, prohibitions, and criminal provisions. Product teams should perform a workflow-specific legal mapping when processing personal data.

### SE Menteri Kominfo No. 9 Tahun 2023 — Etika Kecerdasan Artifisial
Use as an ethics-governance reference while checking for later superseding instruments. Implementation should include security, accountability, transparency, appropriate human oversight, and responsible data practices.

## 2026 AI regulation status
Official Komdigi reporting in May–August 2026 states that draft presidential instruments on the National AI Roadmap 2026–2029 and AI Ethics had completed inter-ministerial discussion and were awaiting presidential establishment. The repository therefore labels them **draft**, not enacted law.

## Engineering implications
- Store regulatory status and source separately from operational policy interpretation.
- Require official-source verification before changing a policy from `draft` to `active`.
- Do not allow a language model to infer legal status from memory.
- Add sector overlays for healthcare, finance, employment, education, or public administration.
- Log policy-pack version with each consequential decision so later audits can reproduce the applicable controls.

## Change procedure
1. Verify new instrument on an official source.
2. Record establishment/effective date and superseded instruments.
3. Obtain appropriate legal/compliance review.
4. Update `governance/indonesia/regulatory-status-*.json`.
5. Increment the Indonesia policy-pack version.
6. Re-run governance and approval evals before deployment.
