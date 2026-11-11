// The one pinned TheOracle embedding model. The index build writes this profile into
// theoracle/index/manifest.json; the runtime reads the manifest, never these constants.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const modelDir = `${root}theoracle/model/`;
export const indexDir = `${root}theoracle/index/`;
export const profile = {
  id: "onnx-community/embeddinggemma-300m-ONNX",
  revision: "5090578d9565bb06545b4552f76e6bc2c93e4a66",
  dtype: "fp32",
  dims: 768,
  maxTokens: 2048,
  pooling: "model sentence_embedding output, L2-normalised",
  prefixes: { query: "task: search result | query: ", document: "title: none | text: " },
  files: {
    "config.json": { size: 1765, sha256: "6e1f06404b7163e0325ed2ea3e6781cde50f4a50b31780a95ad0d30e8404d77b" },
    "tokenizer.json": { size: 20323312, sha256: "4dda02faaf32bc91031dc8c88457ac272b00c1016cc679757d1c441b248b9c47" },
    "tokenizer_config.json": { size: 1156830, sha256: "3ca953eea6c3c9fcda9cf3df22949ff18b216f7c74bd6459230f3f1013953f3a" },
    "onnx/model.onnx": { size: 479932, sha256: "ea91fd315a7c152d427d231746f0f811a1ac93beaba656abfdf2b24e091265e4" },
    "onnx/model.onnx_data": { size: 1234521088, sha256: "ef835ae565d8695236652475903078e8ed794c7c35faf1164d78ec3238e8a88d" },
  },
};
export function fileSha256(path) {
  return new Promise((done, fail) => {
    const hash = createHash("sha256");
    createReadStream(path).on("error", fail).on("data", chunk => hash.update(chunk)).on("end", () => done(hash.digest("hex")));
  });
}
