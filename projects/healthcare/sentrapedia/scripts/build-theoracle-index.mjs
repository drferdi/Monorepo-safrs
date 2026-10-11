// Embeds theoracle/index/chunks.jsonl with the pinned local model and writes vectors.f32 + manifest.json.
// Usage: node scripts/build-theoracle-index.mjs [--device cpu|dml]. Resumable after interruption.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { AutoModel, AutoTokenizer, env } from "@huggingface/transformers";
import { fileSha256, indexDir, modelDir, profile } from "./theoracle-model.mjs";

const device = process.argv.includes("--device") ? process.argv[process.argv.indexOf("--device") + 1] : "cpu";
env.allowRemoteModels = false; env.localModelPath = modelDir;
for (const [name, expected] of Object.entries(profile.files)) {
  if (await fileSha256(`${modelDir}${profile.id}/${name}`) !== expected.sha256) throw new Error(`Model file ${name} does not match its pinned hash. Run node scripts/install-theoracle-model.mjs.`);
}
const chunksRaw = readFileSync(`${indexDir}chunks.jsonl`);
const texts = chunksRaw.toString("utf8").trim().split("\n").map(line => profile.prefixes.document + JSON.parse(line).text);
const tokenizer = await AutoTokenizer.from_pretrained(profile.id);
const model = await AutoModel.from_pretrained(profile.id, { dtype: profile.dtype, device });
const lengths = texts.map(text => tokenizer.encode(text).length);
const order = texts.map((_, i) => i).sort((a, b) => lengths[a] - lengths[b]);
const partial = `${indexDir}vectors.partial.f32`, progress = `${indexDir}vectors.partial.json`;
const vectors = existsSync(progress) ? new Float32Array(readFileSync(partial).buffer.slice(0)) : new Float32Array(texts.length * profile.dims);
let done = existsSync(progress) ? JSON.parse(readFileSync(progress, "utf8")).done : 0;
const started = performance.now();
for (let at = done, batch = 0; at < order.length; at += 16, batch++) {
  const ids = order.slice(at, at + 16);
  const inputs = await tokenizer(ids.map(i => texts[i]), { padding: true, truncation: true, max_length: profile.maxTokens });
  const rows = (await model(inputs)).sentence_embedding.tolist();
  ids.forEach((i, k) => { const norm = Math.hypot(...rows[k]) || 1; vectors.set(rows[k].map(x => x / norm), i * profile.dims); });
  done = Math.min(at + 16, order.length);
  if (batch % 50 === 0 || done === order.length) {
    writeFileSync(partial, Buffer.from(vectors.buffer)); writeFileSync(progress, JSON.stringify({ done, total: order.length }));
    console.log(JSON.stringify({ done, total: order.length, seconds: Math.round((performance.now() - started) / 1000) }));
  }
}
const vectorBytes = Buffer.from(vectors.buffer);
writeFileSync(`${indexDir}vectors.f32`, vectorBytes); rmSync(partial); rmSync(progress);
const sha = data => createHash("sha256").update(data).digest("hex");
const chunks = { count: texts.length, sha256: sha(chunksRaw), truncated: lengths.filter(n => n > profile.maxTokens).length };
const vectorInfo = { format: "float32 little-endian, row-major, one L2-normalised row per chunk in chunks.jsonl order", sha256: sha(vectorBytes) };
const modelInfo = { id: profile.id, revision: profile.revision, dtype: profile.dtype, dims: profile.dims, files: profile.files };
const manifest = {
  name: "TheOracle",
  model: modelInfo, prefixes: profile.prefixes, pooling: profile.pooling, maxTokens: profile.maxTokens,
  runtime: { library: "@huggingface/transformers", version: env.version },
  chunker: { splitter: "@langchain/textsplitters RecursiveCharacterTextSplitter (AnythingLLM)", chunkSize: 2048, chunkOverlap: 20, header: "<document_metadata> sourceDocument/published" },
  chunks, vectors: vectorInfo,
  indexSha256: sha(JSON.stringify({ chunks: chunks.sha256, vectors: vectorInfo.sha256, model: modelInfo, prefixes: profile.prefixes })),
  builtAt: new Date().toISOString(), device,
};
writeFileSync(`${indexDir}manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ finished: true, indexSha256: manifest.indexSha256, seconds: Math.round((performance.now() - started) / 1000) }));
