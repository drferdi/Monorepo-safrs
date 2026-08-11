# Sentra Corpus Engine — Medical PDF to Agent-Ready Database

- **Date:** 2026-08-11
- **Status:** Approved design (brainstorming output); next step is an implementation plan via writing-plans
- **Risk tier:** Design doc itself R1. Implementation touches dependencies + new project capsule → R2 review before merge. Healthcare-critical *logic* (diagnosis engine) is out of scope here; this spec covers corpus infrastructure only.

## 1. Problem

Sentra owns hundreds of GB of medical PDFs (digital textbooks, native text layer). They must become a structured, queryable knowledge base serving four downstream consumers:

1. RAG knowledge agent with citations (first product)
2. Diagnosis engine (later phase)
3. Clinical trajectory engine (later phase)
4. Fine-tune dataset generation (later phase)

Constraints: commercial company (license cleanliness required), data must stay local (local GPU available), storage standard is PostgreSQL + pgvector (`:54329`), corpus is too large to ever re-parse casually.

## 2. Decision

**Docling + CocoIndex + PostgreSQL/pgvector**, with one governing rule:

> CocoIndex manages the pipeline; it never owns Sentra's semantic schema. The DoclingDocument JSON files on disk are the source of truth. PostgreSQL holds a queryable canonical projection loaded from them. Chunks and embeddings are derivatives that may be dropped and rebuilt at any time.

Components (all verified against GitHub on 2026-08-11):

| Component | Role | License | Health |
| --- | --- | --- | --- |
| Docling | PDF → lossless DoclingDocument JSON | MIT | 64.6k stars, LF AI & Data, very active |
| CocoIndex | Incremental pipeline materializer | Apache-2.0 | 11.2k stars, pushed 2026-08-10 |
| BGE-M3 | Local multilingual embeddings (1024-dim), GPU | MIT | de-facto standard multilingual embedder |
| pgvector | Vector index (HNSW) in Postgres | PostgreSQL | standard |

Starting codebase: the official CocoIndex `examples/pdf_embedding/main.py` (verified: walk local PDFs → Docling → markdown → chunk → embed → Postgres pgvector, with `cocoindex update` batch and `-L` incremental modes). Three deliberate changes from the example:

1. Parse function: `export_to_markdown()` (lossy) → `export_to_dict()` lossless JSON persisted to disk as the canonical corpus.
2. Chunker input: canonical JSON blocks, not markdown.
3. Table schema: Sentra's own schema (below) with BGE-M3 1024-dim, not MiniLM 384.

Known caveat: CocoIndex is young (created 2025-03). Mitigation is structural: because canonical JSON lives on disk and the canonical tables belong to Sentra, CocoIndex is replaceable without re-parsing a single PDF.

## 3. Alternatives considered (rejected for the foundation)

| Option | Why rejected |
| --- | --- |
| Docling + hand-rolled glue (original A1) | Superseded: CocoIndex provides incremental/delta processing and resumability we would otherwise hand-build |
| LlamaIndex IngestionPipeline | Framework owns default schema; LlamaParse parsing is a paid API; optional later on the query side only |
| LightRAG / RAG-Anything (HKUDS) | Built on LLM entity-extraction at indexing time — prohibitive over hundreds of GB; framework owns storage schema; serves only retrieval, not the four consumers. Recorded as **future graph-layer candidate**: canonical blocks can be fed to it in the diagnosis-engine phase with zero re-parse |
| RAGFlow | Elasticsearch/Infinity storage, heavy service fleet, RAG-centric product — not canonical infrastructure |
| Pixeltable | Wants to be storage+orchestration+vector store in one abstraction; canonical medical corpus must not depend on it |
| Unstructured ingest | Second ingestion abstraction overlapping Docling; no net benefit |
| Marker / MinerU parsers | License risk: Marker weights OpenRAIL-M (revenue-capped), MinerU custom/NOASSERTION |

## 4. Architecture

```
PDF corpus (hundreds of GB, read-only)
   │  stage 1: parse (Docling, CPU, resumable)
   ▼
Text Quality Gate (per-page score + triage)          ← stage 2
   ▼
Canonical corpus: DoclingDocument JSON per PDF (disk, source of truth)
   + manifest.jsonl (sha256, path, status, quality, timestamps)
   │  stages 3–5: CocoIndex flow (load, chunk, embed)
   ▼
PostgreSQL :54329
   ├─ documents / blocks          canonical projection (schema owned by Sentra)
   └─ chunks (+ pgvector HNSW)    derivative (rebuildable)
   ▼
Consumers: RAG knowledge agent (now)
           diagnosis engine / trajectory / fine-tune (later, derived from canonical — zero re-parse)
```

Properties:

- Every stage is idempotent and resumable; the manifest keyed by sha256 is the ledger.
- Stages after parse never touch a PDF again.
- Adding `entities` / `relations` tables (UMLS/ICD, scispaCy/medspaCy) in the diagnosis-engine phase requires no re-parse.

## 5. Schemas

### 5.1 Canonical (disk)

One DoclingDocument JSON per PDF via `export_to_dict()` — Docling's standard lossless format (layout, reading order, cell-level tables), not a bespoke format. Plus `manifest.jsonl`, one record per source file: `sha256`, `source_path`, `doc_id`, `status` (`parsed` | `failed` | `needs_review`), per-page quality summary, timestamps, error detail on failure.

### 5.2 PostgreSQL (v1 — three tables, YAGNI)

```sql
CREATE TABLE documents (
  doc_id      text PRIMARY KEY,          -- slug, e.g. 'harrison-21e'
  sha256      text NOT NULL UNIQUE,
  source_path text NOT NULL,
  title       text,
  specialty   text[],
  language    text,
  year        int,
  pages       int,
  meta        jsonb NOT NULL DEFAULT '{}'  -- includes quality report
);

CREATE TABLE blocks (                    -- canonical projection, 1 row per block
  block_id  text PRIMARY KEY,            -- '<doc_id>#<docling_ref>'
  doc_id    text NOT NULL REFERENCES documents,
  type      text NOT NULL,               -- paragraph | table | heading | caption | list
  section   text,                        -- heading path, e.g. 'Ch 297 > Diagnosis'
  page      int,
  text      text,
  payload   jsonb                        -- table cells etc. (lossless)
);

CREATE TABLE chunks (                    -- derivative: may be dropped and rebuilt
  chunk_id   text PRIMARY KEY,
  doc_id     text NOT NULL REFERENCES documents,
  block_ids  text[] NOT NULL,            -- provenance to blocks
  section    text,
  page_start int,
  page_end   int,
  text       text NOT NULL,
  embedding  vector(1024)                -- BGE-M3
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
```

Provenance chain: chunk → `block_ids` → block → page → source PDF. Every agent answer can cite title, section, and page.

Deferred to later phases (explicitly not v1): `document_versions`, `citations`, `figures`, separate `embeddings` table (embedding stays an inline column while there is one model), `entities`, `relations`.

## 6. Pipeline stages

1. **Parse** — walk PDF directories → Docling (CPU) → canonical JSON + manifest update.
2. **Quality gate** — see §7.
3. **Load** — JSON → `documents` + `blocks`.
4. **Chunk** — structure-aware: per section, ~500-token target, tables kept whole with caption, never split mid-table. Input is blocks, not markdown.
5. **Embed** — BGE-M3, local GPU, batched → `chunks.embedding`.

Operations: `cocoindex update` for batch catch-up; `-L` live mode when the corpus grows.

## 7. Text Quality Gate

Principle: **no text enters the canonical store without a quality score; garbage never enters silently.** Bad text poisons both RAG and fine-tune data.

Per-page metrics after parse: valid-character ratio (mojibake / U+FFFD / private-use glyph detection), text density vs page area, language-detection confidence (id/en), dictionary-word ratio.

Three-way triage:

- **Good score** → normal path.
- **Empty / text-poor page** (stray scanned page) → Docling's built-in OCR fallback.
- **Text present but garbled** (broken CID/ToUnicode maps — the dangerous case, which OCR fallback does *not* catch because text "exists") → re-render page to image → OCR/VLM path. Candidates, evaluated when first needed: Unlimited-OCR (MIT, Baidu), DeepSeek-OCR (MIT), Chandra (Apache-2.0).

Recording: per-page score + route taken → manifest and `documents.meta.quality`. Pages that still fail → `needs_review` human queue. Documents above a bad-page threshold are held out of ingestion entirely.

Scanned corpora: v1 assumes a digital-native corpus; OCR exists only as fallback. A dedicated VLM-parser stage is deferred until a real scanned corpus (old journals, archives) exists — it slots into the parse stage and still emits DoclingDocument JSON, so downstream is unaffected.

## 8. Error handling & resumability

- Idempotency key = sha256 in manifest; re-runs skip completed files.
- A file that fails to parse gets `status: failed` + error detail; the pipeline continues past it.
- Chunking-logic changes: drop `chunks`, rebuild from `blocks`/JSON; canonical layer untouched.
- CocoIndex's incremental claim (only deltas recompute) is treated as **unverified until the PoC proves it** (gate 4 below).

## 9. PoC validation gates (first implementation milestone)

The PoC is deliberately small; all gates must pass before scaling to the full corpus:

1. One PDF in → canonical JSON on disk; `documents`, `blocks`, `chunks` populated.
2. Semantic query in Indonesian and English → relevant chunks with citation (title, section, page).
3. A diagnostic table (e.g. DM diagnostic criteria) is retrieved whole, never truncated mid-table.
4. Adding a second PDF does **not** reprocess the first (incremental claim proven).
5. At least one deliberately corrupted/scanned PDF is detected and routed by the quality gate — not silently ingested.

## 10. Repository placement

- New project capsule: `projects/corpus-engine/` following `docs/governance/SAFRS_PROJECT_CAPSULES.md`.
- Python is an optional capability pack per the golden-path baseline; activation follows the documented capability workflow and its risk review.
- New dependencies (docling, cocoindex, sentence-transformers/BGE-M3, pgvector client) are R2 (dependency boundary) — designated review before merge.
- Corpus PDFs and canonical JSON live outside the repository (large binary data; location decided in the implementation plan).
