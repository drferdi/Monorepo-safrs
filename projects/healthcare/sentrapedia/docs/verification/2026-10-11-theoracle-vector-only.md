# TheOracle vector-only — verification, 2026-10-11

Branch `feat/oracle-vector-only` (worktree `D:\DEV\monorepo.worktrees\oracle-vector-only`),
commits `c3581e5e` (store, runtime, contract, tests) and `8b030bfd` (SQLite removal, Oracle II
move). Not pushed, not merged.

## What was built

| Item | Value |
| --- | --- |
| Chunks | 20,423 = 20,322 from the TheOracle LanceDB export (every field unchanged) + 101 from 44 missing Kemenkes markdown files |
| Chunker | AnythingLLM `RecursiveCharacterTextSplitter`, 2048 / 20, `<document_metadata>` header (reproduced 48/48 against the export) |
| Embedding model | `onnx-community/embeddinggemma-300m-ONNX` @ `5090578d9565bb06545b4552f76e6bc2c93e4a66`, fp32, 768 d, max 2048 tokens, 0 chunks truncated |
| Runtime | `@huggingface/transformers` 4.3.0 (onnxruntime-node 1.30.0); index built on DirectML (1,504 s), queries on CPU |
| indexSha256 | `f9d646693cb0bf334eb602da3fd933be120333d7cdcbafe7711bfd3f0a878964` |
| Gemini | not used for any embedding; the old 768-d Gemini vectors were not reused |

Parity: the 20,322 exported chunks have cosine 1.000000 (min 1.000000) against the vectors
used in the model evaluation; the 101 new chunks differ only by their `published` header.

## Gates (worktree, Windows, Node 24.21)

| Gate | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 158/158 passed (includes the real index + local model test) |
| `npm run test:mira` | 157 passed, 1 skipped |
| `npm run test:system` | 7/7 passed |
| `npm run build` | exit 0 |
| `npm run deploy:dry-run` | PASS, 7 traces |
| Standalone smoke | `@huggingface/transformers` resolves inside `.next/standalone`, offline model load 1.3 s, 768-d output |
| Dev system | `npm run dev` on 3105: MIRA ready, `/api/mira` health `groundingReady: true`; no paid analysis run |
| `docker build` | exit 0, image 3.1 GB (first attempt stopped when Docker Desktop's engine failed with HTTP 500; passed after restart, same 4 GB VM) |
| Container (Linux x64) | onnxruntime-node and sharp Linux binaries present; offline embedding 768-d, load 2.7 s; full system on 127.0.0.1:3106 → home 200 in about 6 s, `/api/mira` `groundingReady: true`, 141 MiB before the first query; no paid analysis run |

## Retrieval quality and cost (`npm run benchmark:oracle`, production module, CPU)

Draft eval set (88 fictional queries, gold labels await Gaffer review), recall@5:

| Category | Recall@5 |
| --- | --- |
| Lay terms | 0.938 |
| Abbreviations | 0.867 |
| Mixed ID/EN | 0.867 |
| Typos | 0.933 |
| Exact terms | 0.704 (drug/dose 0.50, ICD-10 0.50, lab 0.80, scores 1.00) |
| Overall | 0.841 |

Cold start 3.1 s (hash check + model load), warm latency median 39.1 ms, p95 44.6 ms,
RSS growth about 846 MB.

## Removed or moved

- `oracle-ii/sentra_clinical_core_source_reparsed.sqlite` (24 MB, FTS5/BM25): removed from git;
  worktree copy in git-ignored `_to_delete/`.
- BM25/FTS5 retrieval code (`node:sqlite`, `LIKE` fallback, page/PDF/Drive provenance) and its
  tracing include.
- `oracle-ii/` → `theoracle/provenance/oracle-ii/` (300 files, rename only).

Left for Gaffer: the main checkout's `oracle-ii/*.sqlite`, `-wal` (0 B) and `-shm` (32 KB),
still used by that checkout's branch.

## Known limits

- Exact drug/dose and ICD-10 queries reach 0.50; the prompt now requires verbatim values and
  leaves fields empty when no excerpt states them.
- Eval gold labels are draft.
- `npm ci` downloads 1.2 GB with no resume; the contract install timeout is 600 s.
- The Docker image is 3.1 GB (model 1.2 GB); the first retrieval adds about 0.85 GB RSS.
- MIRA's reasoning model is still `google/gemini-2.5-flash` via OpenRouter (pre-existing,
  outside this change).
