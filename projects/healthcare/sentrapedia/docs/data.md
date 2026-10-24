# Sentrapedia data

Sentrapedia has no database server. Its data comes from four places.

## Browser storage

- `sentrapedia-workspace-v1` (localStorage): patients, encounters, drafts and settings for the workspace.
- `sentrapedia-feedback` (localStorage): feedback the user leaves on generated drafts.

The storage is unencrypted and is only for fictional demonstration data. Never enter real patient data. The account dialog can export a backup or clear all local records.

### Format changes

A saved workspace that fails validation is kept under `sentrapedia-workspace-v1-unreadable` and offered as a download, never discarded. A change to the stored format must not rely on that:

- A new format gets a new key (`sentrapedia-workspace-v2`) and reads the v1 blob through `parseWorkspace`, then migrates it in memory. The v1 blob stays untouched, so rolling back to an older build still finds its data.
- A renamed mode maps the old id to the new one before validation instead of rejecting the message.
- Every file in `tests/fixtures/workspace/` must keep parsing (`tests/workspace-fixtures.test.ts`); add a fixture for each shape a release writes.
- Ship the reader before the writer: one release reads the new format while still writing the old one.

The full plan is `docs/plans/active/2026-10-19-workspace-v2-migration.md`.

## Bundled reference data

- `oracle/sentrapedia.json`: the disease catalogue (`metadata`, `categories`, `diseases`), read by `src/lib/theoracle.ts`. It is derived from the knowledge SSOT by `scripts/build-oracle-catalog.mjs`, which also writes its SHA-256 into `src/lib/theoracle.ts`; do not edit it by hand. Each disease's `kategori` is the ICD-10 (WHO 2010) chapter of its first code, 21 categories (SSOT, 2026-10-24); the source category is kept in `kategori_sumber_lama`.
- Earlier forms of the same data (`oracle/diseases.json`, `oracle/diseases-data.ts`, `oracle/data.ts`) were removed on 2026-10-17 (tech-debt row 20); git history keeps them.

The reference data ships with the build. The app does not change it at runtime.

## TheOracle

Structured clinical facts live only in `theoracle/ssot/sentrapedia-knowledge-ssot.json` (the SSOT); guideline PDF texts are the citation library. Both feed one index through `npm run knowledge:build`, which runs `scripts/build-theoracle-chunks.mjs`, `scripts/build-theoracle-index.mjs` and `scripts/build-oracle-catalog.mjs` in that order (2026-10-21). Nothing clinical is edited anywhere else.

- `theoracle/index/chunks.jsonl`: 17,989 chunks. 2,403 come from the SSOT v0.6 (origin `ssot`, one document per entry: name, alias, ICD-10, competence, definition, symptoms, diagnosis, therapy text per source, one line per dose statement with context, source, page and the guideline quote (`kutipan`); a cross-referenced dose (`sumber` "rujukan silang") also carries its `catatan`, identical statements from several sources share one line, and auto-extracted rows whose "obat" is a statistic or lab value are left out; referral; split at 2048 characters with overlap 20, the disease name in every chunk). 15,586 are guideline-PDF chunks from the TheOracle LanceDB export, carried over unchanged; 10 PDFs that are not Indonesian clinical guidance are left out (`EXCLUDED_LIBRARY_PDFS` in the builder). Each record has `origin` and `textSha256`.
- `theoracle/index/vectors.f32` and `manifest.json`: one L2-normalised 768-dimension EmbeddingGemma-300m vector per chunk, with the model id, revision, file hashes, prefixes, chunk and vector hashes and `indexSha256`.
- `theoracle/model/`: the pinned ONNX model, installed by `scripts/install-theoracle-model.mjs` (postinstall) and checked by SHA-256. Not in git.

`src/lib/theoracle-grounding.ts` verifies the manifest hashes, embeds the query locally with the same model and returns at most six passages (two per document). Rebuild everything with `npm run knowledge:build` after changing the SSOT (`node scripts/build-theoracle-index.mjs --device dml` embeds on the GPU when the chunks are already written).

## AADI service

`src/app/api/aadi/route.ts` forwards case reviews to the bundled `aadi/service` started by `scripts/run-system.mjs`. The supervisor supplies its private loopback URL and token to the server; the browser never sees the token. The request/response schemas remain in `src/lib/aadi/` and `aadi/service/contract/`. TheOracle retrieval validates index and model hashes before forwarding evidence. Only confirmed synthetic cases may be sent. `.env.example` names the server-side provider key; no external AADI folder is needed. See `docs/aadi-integration.md`.

## Public code, private data

Gaffer's decision of 2026-10-19: the code may be published under the royalty licence in `LICENSE`; the database stays private.

- `scripts/private-data.mjs` lists what is private: `theoracle/ssot/`, `theoracle/index/`, `oracle/sentrapedia.json`, `oracle-ii/`, `docs/verification/` and `.agents/`.
- `npm run export:split -- <empty folder outside the capsule>` copies the tracked files into `<folder>/public` (code, with `oracle/sentrapedia.sample.json` as the catalogue) and `<folder>/data` (the private files at the same paths). It stops if a file is still a Git LFS pointer. Daily work in the monorepo is unchanged.
- Without the data, the app builds and runs: the library shows the fictional sample, analyses answer "Database TheOracle belum terpasang di server ini", and tests that need the real catalogue or index are skipped (`tests/private-data.ts`).
- To build with the data (for example on the beta server): check out the code, copy the contents of the private data repository over it, then `npm run build` or `docker build`.

