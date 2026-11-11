# TheOracle — local embedding model evaluation

Date: 2026-10-11 · Branch `feat/oracle-vector-only` (checkpoint `20b15b2e`) · No production code changed.

## Setup

- Corpus: 20,423 chunks = the 20,322 `theoracle/` chunks (text and metadata unchanged; old 768-dim
  vectors not used) + 101 chunks from the 44 missing Kemenkes markdowns.
- Chunking of the 44 markdowns: AnythingLLM's splitter reproduced with `RecursiveCharacterTextSplitter`
  (`@langchain/textsplitters` 1.0.1), chunkSize 2048, overlap 20, `<document_metadata>` header.
  Proof: 48/48 approved markdowns whose text matches byte for byte regenerate identical chunks; the
  other 52 uploaded markdowns differ in text, not in chunking. Content form: repo markdown without
  the two "Clinical QA / Clinical use" lines, CRLF, as in the 100 approved uploads (Gaffer's review).
- Runtime: Node 24.21.0, `@huggingface/transformers` 4.3.0 (onnxruntime-node). Index built on GPU
  (DirectML, AMD RX 6750 XT); queries embedded on CPU (AMD Ryzen 5 7500F), the deployment target.
  CPU/GPU parity: minimum cosine ≥ 0.999998 on probe chunks for every model.
- Search: exact brute-force cosine over all chunks (vectors normalised).
- Eval set: `eval-set.json`, 88 fictional queries; gold labels **draft** until Gaffer reviews.
  recall@5 = a query is a hit when any top-5 chunk comes from a gold document; for exact terms, when
  any top-5 chunk literally contains the term.
- Network: model downloads from huggingface.co only. No Gemini or other remote inference.
  EmbeddingGemma is Google's open-weights Gemma model running locally (Gemma licence), not the Gemini API.

## Results

| | multilingual-e5-small | EmbeddingGemma-300m | bge-m3 |
| --- | --- | --- | --- |
| Repo @ revision | Xenova/multilingual-e5-small @761b726d | onnx-community/embeddinggemma-300m-ONNX @5090578d | Xenova/bge-m3 @4de13258 |
| Variant / size on disk | fp32 / 465 MB | fp32 / 1,199 MB | fp32 / 2,179 MB |
| Dimensions | 384 | 768 | 1024 |
| Token limit · chunks truncated | 512 · 113 | 2048 · 0 | 8192 · 0 |
| Index build (GPU) · peak RAM | 198 s · 2.2 GB | 1,394 s · 2.1 GB | 638 s · 3.1 GB |
| Vector store (float32, 20,423 chunks) | 31 MB | 63 MB | 84 MB |
| Query embed, CPU median / p95 | 3.6 / 4.5 ms | 14.1 / 16.9 ms | 28.8 / 38.8 ms |
| Search, median / p95 | 8.1 / 11.1 ms | 11.0 / 12.4 ms | 26.8 / 30.5 ms |
| **recall@5 lay terms** (16) | 0.31 | **0.94** | 0.63 |
| **abbreviations** (15) | 0.60 | **0.87** | 0.73 |
| **mixed ID/EN** (15) | 0.60 | **0.87** | 0.73 |
| **typos** (15) | 0.67 | **0.93** | 0.87 |
| **exact terms** (27) | 0.56 | **0.70** | 0.63 |
| · drug/dose (8) | **0.63** | 0.50 | **0.63** |
| · ICD-10 (6) | 0.00 | **0.50** | 0.00 |
| · lab (5) | 0.60 | 0.80 | **1.00** |
| · score (8) | 0.88 | **1.00** | 0.88 |
| **overall** (88) | 0.55 | **0.84** | 0.70 |

Per-query top-5 titles and scores: `results-<model>.json`.

## Limits

- Small groups (5–16 queries per row): one query moves a row by 0.06–0.20. Treat differences under
  about 0.15 as noise.
- Queries and draft gold labels were written by Claude; Gaffer's review may change them.
- Document-level gold: a hit means the right document, not necessarily the best passage.
- Only fp32 variants were measured. Smaller quantised files exist (e5 int8 118 MB, EmbeddingGemma q8
  309 MB, bge-m3 int8 569 MB) but were not evaluated.
- Pure vector search still misses half or more of the ICD-10 code queries with every model.
