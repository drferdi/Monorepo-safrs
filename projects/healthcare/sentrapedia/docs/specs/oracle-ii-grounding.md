# Oracle II Grounding Specification

**Status:** Approved for local implementation on 2026-10-10  
**Risk:** R3 - Gaffer-approved clinical-facing prompt grounding; R2 for the backward-compatible data contracts  
**Scope:** Sentrapedia capsule and the local MIRA service under `D:/DEV/gafferverse/mira-system/assist`

## Outcome

Every Sentrapedia MIRA analysis retrieves a bounded set of Oracle II references before any model call. The service receives those references in a dedicated `grounding` envelope, separate from the de-identified patient `case`, and exposes the capability before the gateway will send a grounded request.

The saved draft contains the exact reference snapshot used for that analysis. Each reference keeps its source file, source SHA-256, PDF page, page-text SHA-256, extraction coordinates/status, retrieval kind, and quoted text. These citations show which source passages were supplied to MIRA; they do not assert that a passage entails a diagnosis or other generated claim.

## Retrieval contract

- Open `oracle-ii/sentra_clinical_core_source_reparsed.sqlite` with `node:sqlite` in read-only and query-only mode.
- Merge ranked `source_candidates_fts_v2` results (72 source documents) with `clinical_facts_fts` results (the smaller curated legacy set), deduplicate source pages, and limit repeated documents. If fewer than six references remain, run a bounded lexical fallback over `source_pages_v2` (8,332 pages across 72 documents). The legacy `pages_fts` index covers only eight documents and is not treated as full-corpus fallback.
- Derive at most 24 normalized lexical terms from the already validated case. Do not persist the terms; persist only a SHA-256 query digest.
- Return at most six references, at most 1,600 characters per quotation, with a bounded total request below the gateway body limit.
- An empty or unusable query and a lexical no-match are explicit `ORACLE_NO_MATCH` failures. No model call occurs.
- The database file and its content remain unchanged. Retrieval never updates review state, corpus metadata, FTS indexes, sidecars, or evidence rows.

## Grounding boundary

- The MIRA v1 request remains valid for legacy clients. A grounded request adds the optional strict `grounding` envelope with version `oracle-grounding-v1`.
- `/healthz` keeps `contractVersion: "1"` and advertises `capabilities: ["oracle-grounding-v1"]`.
- Sentrapedia requires that capability before forwarding a grounded request and fails with an actionable error before inference when it is absent.
- Planning, full assessment, fast diagnosis, fast workup, and fast therapy prompts all receive the same bounded reference block.
- Prompt instructions identify the block as guideline source material, keep it separate from patient facts, require no unsupported extrapolation, and preserve `evidence.supporting/opposing` exclusively for recorded patient findings.
- MIRA response schema remains unchanged. Source citations live in the immutable Sentrapedia draft provenance rather than being attached to individual generated claims.

## Provenance

Gaffer stated in this implementation session that the corpus sources are from Kementerian Kesehatan and that Gaffer personally reviewed the corpus. The grounding bundle records that session-level statement verbatim in meaning. It does not rewrite `regulatory_status`, `clinical_review_status`, `review_status`, or any per-field approval in Oracle II.

## UI and persistence

- Main composer and the existing structured MIRA form use the same grounded gateway path.
- A grounded MIRA message stores `case`, `result`, trace/time, and the exact grounding bundle in `sourceText`.
- Rendered drafts include a separate "Referensi Oracle II yang diambil" section with immutable source/page citations and an explicit reference-selection label.
- The Document Studio source pane distinguishes grounded MIRA snapshots from legacy MIRA and local document sources.
- Existing saved MIRA messages without grounding remain readable and keep their current presentation.

## Verification

- TypeScript unit tests prove retrieval bounds, candidate-first behavior, page fallback, no-match handling, read-only integrity, capability negotiation, request forwarding, persistence, regeneration, and UI-facing source labels.
- Python service tests prove legacy v1 compatibility and that the unchanged patient case plus the retrieved quotation appear in every enabled LLM prompt branch, using only the fake model client.
- A local benchmark reports warm retrieval latency without external inference.
- Typecheck, lint, targeted tests, full tests, build, deploy dry run, and practical extracted standalone verification run without provider credentials or paid calls.
