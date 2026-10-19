// Files that belong to the private data repository, never to the public code repository (Gaffer, 2026-10-19:
// public code under the royalty licence, private database). Folders end with "/". Used by scripts/export-split.mjs
// and pinned by tests/export-split.node-test.mjs.
export const PRIVATE_PATHS = [
  "theoracle/index/", // TheOracle: chunks, vectors and manifest
  "theoracle/sources/", // hand-written treatment documents that are part of the index
  "theoracle/provenance/", // Oracle II sources, PNPK pages and QA
  "oracle/sentrapedia.json", // the clinical catalogue (144 diseases)
  "oracle-ii/",
  "data/dose-inventory/",
  "docs/verification/", // evidence files quote passages, doses and live outputs
  ".agents/", // internal working notes
  "deploy/beta/", // closed-beta server layout and access setup
];

// The public tree gets this fictional catalogue in place of the real one, so the app builds and says it is a sample.
export const SAMPLE_CATALOG = { from: "oracle/sentrapedia.sample.json", to: "oracle/sentrapedia.json" };

export const isPrivate = file => PRIVATE_PATHS.some(entry => entry.endsWith("/") ? file.startsWith(entry) : file === entry);
