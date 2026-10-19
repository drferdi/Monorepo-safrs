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

- `oracle/sentrapedia.json`: the disease knowledge base (`metadata`, `categories`, `diseases`), read by `src/lib/theoracle.ts`.
- Earlier forms of the same data (`oracle/diseases.json`, `oracle/diseases-data.ts`, `oracle/data.ts`) were removed on 2026-10-17 (tech-debt row 20); git history keeps them.

The reference data ships with the build. The app does not change it at runtime.

## TheOracle

TheOracle is the single source of truth for Sentra knowledge used to ground MIRA (Gaffer, 2026-10-11).

- `theoracle/index/chunks.jsonl`: 20,423 chunks (20,322 exported from the TheOracle LanceDB store unchanged, plus 101 chunks from the 44 Kemenkes markdown files that were missing, split with the same AnythingLLM splitter, 2048 characters, overlap 20). Each record has `origin` and `textSha256`.
- `theoracle/index/vectors.f32` and `manifest.json`: one L2-normalised 768-dimension EmbeddingGemma-300m vector per chunk, with the model id, revision, file hashes, prefixes, chunk and vector hashes and `indexSha256`.
- `theoracle/model/`: the pinned ONNX model, installed by `scripts/install-theoracle-model.mjs` (postinstall) and checked by SHA-256. Not in git.
- `theoracle/provenance/oracle-ii/`: the former Oracle II sources, evidence, QA and tools.

`src/lib/theoracle-grounding.ts` verifies the manifest hashes, embeds the query locally with the same model and returns at most six passages (two per document). Rebuild the vectors with `node scripts/build-theoracle-index.mjs [--device dml]` after changing `chunks.jsonl`.

## MIRA service

`src/app/api/mira/route.ts` forwards case reviews to the bundled `mira/service` started by `scripts/run-system.mjs`. The supervisor supplies its private loopback URL and token to the server; the browser never sees the token. The request/response schemas remain in `src/lib/mira/` and `mira/service/contract/`. TheOracle retrieval validates index and model hashes before forwarding evidence. Only confirmed synthetic cases may be sent. `.env.example` names the server-side provider key; no external MIRA folder is needed. See `docs/mira-integration.md`.

## Public code, private data

Gaffer's decision of 2026-10-19: the code may be published under the royalty licence in `LICENSE`; the database stays private.

- `scripts/private-data.mjs` lists what is private: `theoracle/index/`, `theoracle/sources/`, `theoracle/provenance/`, `oracle/sentrapedia.json`, `oracle-ii/`, `data/dose-inventory/`, `docs/verification/` and `.agents/`.
- `npm run export:split -- <empty folder outside the capsule>` copies the tracked files into `<folder>/public` (code, with `oracle/sentrapedia.sample.json` as the catalogue) and `<folder>/data` (the private files at the same paths). It stops if a file is still a Git LFS pointer. Daily work in the monorepo is unchanged.
- Without the data, the app builds and runs: the library shows the fictional sample, analyses answer "Database TheOracle belum terpasang di server ini", and tests that need the real catalogue or index are skipped (`tests/private-data.ts`).
- To build with the data (for example on the beta server): check out the code, copy the contents of the private data repository over it, then `npm run build` or `docker build`.

