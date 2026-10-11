# Sentra Clinical Core — Source Parser V2 (QA Gated)

**Source reparse: COMPLETE (72/72 PDFs). Clinical curation for the 72: NOT COMPLETE.**

80 source PDFs recovered. 72 newly reprocessed PDFs generated 8,332 PDF-page text records and **904 machine-selected literal source excerpts**. Previous 8-PNPK clinical facts (182) are preserved. Each machine candidate has a validated exact quote-to-page text match, source filename/Drive ID, PDF page, SHA-256 and source-text offsets.

**Safety:** Automated section/candidate classification has false-positive clinical semantics (found in spot-checks). To prevent erroneous clinical field assignment, all `definisi/gejala/diagnosis/terapi/rujukan` fields of these 72 records are explicitly unavailable until reviewed. Machine candidates remain only in `source_extraction_candidates`, source evidence JSONL, and separate SQLite tables. These are not clinician-approved facts, and are excluded from clinical retrieval.

This is a **source parser repair with source-level provenance and semantic quarantine**, not a certification of clinical accuracy across 72 guidelines.

Files:
- `knowledge_base/json` and `markdown`: all 144 records, status-safe.
- `evidence/source_pages.jsonl`: 8,332 indexed original PDF-page extracts.
- `evidence/source_evidence_candidates.jsonl`: 904 machine evidence candidates (exact text and page anchors).
- `evidence/clinical_review_queue.csv`: triage candidates by topic and section-mixing risks.
- `sentra_clinical_core_source_reparsed.sqlite`: previous curated database + separate non-promoted source tables.
- `source_inventory.json`: every new source and SHA-256 / Drive URL.
- `tools`: deterministic parser and fail-closed QA finalizer.
- `checksums/`: original untouched local ZIP and V1 repaired checkpoint.

72 original PDFs are separately archived as `SENTRA_PNPK_72_ORIGINAL_SOURCE_PDFS.zip` (not included inside core ZIP to avoid duplication). The other 8 source PDFs exist in V1 repaired checkpoint.

**Outstanding:** per-document semantic clinical curation and table/figure visual verification (116 page extracts with sparse text) and clinician attestation. Regulatory applicability is UNVERIFIED for the new 72. Never auto-generate a diagnosis or treatment from unreviewed candidates.

Architect & Build by dr. Ferdi Iskandar (the Gaffer) — Sentra Artificial Intelligence.
