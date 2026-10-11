import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CaseState } from "./mira/types";
import {
  THEORACLE_GROUNDING_CAPABILITY,
  TheOracleGroundingError,
  type TheOracleGroundingBundle,
  type TheOracleGroundingEvidence,
} from "./theoracle-grounding-types";

export { THEORACLE_GROUNDING_CAPABILITY, TheOracleGroundingError } from "./theoracle-grounding-types";
export type { TheOracleCitationSource, TheOracleEmbeddingModel, TheOracleGroundingBundle, TheOracleGroundingEvidence } from "./theoracle-grounding-types";
const MAX_EVIDENCE = 6;
const MAX_PER_DOCUMENT = 2;
const MAX_TEXT_LENGTH = 2_400;
const REVIEW_PROVENANCE = "Gaffer stated on 2026-10-11 that Gaffer reviewed and approved the TheOracle corpus; per-chunk review fields are not recorded.";

export interface TheOracleManifest {
  model: { id: string; revision: string; dtype: string; dims: number; files: Record<string, { size: number; sha256: string }> };
  prefixes: { query: string; document: string };
  maxTokens: number;
  chunks: { count: number; sha256: string };
  vectors: { sha256: string };
  indexSha256: string;
}
interface Chunk { id: string; title: string; docSource: string; origin: string; text: string; textSha256: string }
type Embed = (text: string) => Promise<Float32Array>;
interface LoadedIndex { manifest: TheOracleManifest; chunks: Chunk[]; vectors: Float32Array; embed: Embed }
interface RetrieveOptions { indexDir?: string; modelDir?: string; limit?: number; now?: () => Date; embedder?: (manifest: TheOracleManifest, modelDir: string) => Promise<Embed> }

const loaded = new Map<string, Promise<LoadedIndex>>();
const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const fileSha256 = (file: string) => new Promise<string>((done, fail) => {
  const hash = createHash("sha256");
  createReadStream(file).on("error", fail).on("data", chunk => hash.update(chunk)).on("end", () => done(hash.digest("hex")));
});
const unavailable = (message: string) => new TheOracleGroundingError("THEORACLE_UNAVAILABLE", message);

// The query is embedded on this machine with the exact model recorded in the manifest; case text never leaves the process.
async function localEmbedder(manifest: TheOracleManifest, modelDir: string): Promise<Embed> {
  for (const [name, expected] of Object.entries(manifest.model.files)) {
    if (await fileSha256(path.join(modelDir, manifest.model.id, name)) !== expected.sha256) throw unavailable("Model embedding TheOracle tidak cocok dengan manifest. Analisis tidak dijalankan.");
  }
  const { AutoModel, AutoTokenizer, env } = await import("@huggingface/transformers");
  env.allowRemoteModels = false;
  env.localModelPath = modelDir + path.sep;
  const tokenizer = await AutoTokenizer.from_pretrained(manifest.model.id);
  const model = await AutoModel.from_pretrained(manifest.model.id, { dtype: manifest.model.dtype as "fp32", device: "cpu" });
  return async text => {
    const inputs = await tokenizer([text], { padding: true, truncation: true, max_length: manifest.maxTokens });
    const [row] = (await model(inputs)).sentence_embedding.tolist() as number[][];
    const norm = Math.hypot(...row) || 1;
    return Float32Array.from(row, value => value / norm);
  };
}

async function loadIndex(indexDir: string, modelDir: string, embedder: NonNullable<RetrieveOptions["embedder"]>): Promise<LoadedIndex> {
  try {
    const manifest = JSON.parse(await readFile(path.join(indexDir, "manifest.json"), "utf8")) as TheOracleManifest;
    const [chunkBytes, vectorBytes] = await Promise.all([readFile(path.join(indexDir, "chunks.jsonl")), readFile(path.join(indexDir, "vectors.f32"))]);
    if (sha256(chunkBytes) !== manifest.chunks.sha256 || sha256(vectorBytes) !== manifest.vectors.sha256) throw unavailable("Integritas index TheOracle tidak dapat diverifikasi. Analisis tidak dijalankan.");
    const chunks = chunkBytes.toString("utf8").trim().split("\n").map(line => JSON.parse(line) as Chunk);
    const vectors = new Float32Array(vectorBytes.buffer, vectorBytes.byteOffset, vectorBytes.byteLength / 4);
    if (chunks.length !== manifest.chunks.count || vectors.length !== chunks.length * manifest.model.dims) throw unavailable("Ukuran index TheOracle tidak sesuai manifest. Analisis tidak dijalankan.");
    return { manifest, chunks, vectors, embed: await embedder(manifest, modelDir) };
  } catch (error) {
    if (error instanceof TheOracleGroundingError) throw error;
    throw unavailable("TheOracle tidak dapat dibuka atau dibaca. Analisis tidak dijalankan.");
  }
}

// Match the local MIRA privacy guard; public-source matches are skipped, not rewritten.
function sourceTriggersMiraPrivacy(item: Omit<TheOracleGroundingEvidence, "retrievalRank">): boolean {
  const value = JSON.stringify(item);
  if ([/\b\d{16}\b/, /\b\d{13}\b/, /\b08\d{8,11}\b/, /\+?62\d{9,12}\b/, /\b(?:\+62|62|0)[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/].some(pattern => pattern.test(value))) return true;
  return [...value.matchAll(/\b(?:tn\.|ny\.|nn\.|an\.|sdr\.|sdri\.|bpk\.|bapak|ibu|dr\.)\s*([a-z]+)/gi)].some(match => /^[A-Z][a-z]+/.test(match[1]));
}

function queryText(caseData: CaseState): string {
  return [
    caseData.chiefComplaint,
    caseData.anamnesis.freeText,
    ...(caseData.anamnesis.qa ?? []).flatMap(item => [item.question, item.answer]),
    ...caseData.physicalExam,
    ...caseData.results.flatMap(item => [item.name, String(item.value)]),
    ...caseData.currentMedications,
    ...caseData.knownConditions,
  ].filter(Boolean).join("\n").trim();
}

const evidenceText = (text: string) => text.replace(/^<document_metadata>[\s\S]*?<\/document_metadata>/, "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

function freezeBundle(bundle: TheOracleGroundingBundle): TheOracleGroundingBundle {
  for (const item of bundle.evidence) { Object.freeze(item.source); Object.freeze(item); }
  Object.freeze(bundle.evidence); Object.freeze(bundle.corpus.embeddingModel); Object.freeze(bundle.corpus);
  return Object.freeze(bundle);
}

export async function retrieveTheOracleGrounding(caseData: CaseState, options: RetrieveOptions = {}): Promise<TheOracleGroundingBundle> {
  const query = queryText(caseData);
  if (!/[\p{L}\p{N}]/u.test(query)) throw new TheOracleGroundingError("THEORACLE_QUERY_EMPTY", "Keluhan belum memiliki istilah klinis yang dapat dicari di TheOracle.");
  const indexDir = options.indexDir ?? path.join(process.cwd(), "theoracle", "index");
  const modelDir = options.modelDir ?? path.join(process.cwd(), "theoracle", "model");
  const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? MAX_EVIDENCE), MAX_EVIDENCE));
  if (!loaded.has(indexDir)) loaded.set(indexDir, loadIndex(indexDir, modelDir, options.embedder ?? localEmbedder).catch(error => { loaded.delete(indexDir); throw error; }));
  const { manifest, chunks, vectors, embed } = await loaded.get(indexDir)!;
  let q: Float32Array;
  try { q = await embed(manifest.prefixes.query + query); } catch { throw unavailable("Embedding lokal TheOracle gagal. Analisis tidak dijalankan."); }
  const dims = manifest.model.dims;
  const scores = new Float32Array(chunks.length);
  for (let i = 0; i < chunks.length; i++) { let s = 0; const offset = i * dims; for (let k = 0; k < dims; k++) s += q[k] * vectors[offset + k]; scores[i] = s; }
  const ranked = [...scores.keys()].sort((a, b) => scores[b] - scores[a]);
  const selected: Omit<TheOracleGroundingEvidence, "retrievalRank">[] = [];
  const perDocument = new Map<string, number>();
  for (const i of ranked) {
    if (selected.length >= limit) break;
    const chunk = chunks[i];
    if ((perDocument.get(chunk.title) ?? 0) >= MAX_PER_DOCUMENT) continue;
    const item = { evidenceId: chunk.id, text: evidenceText(chunk.text), similarity: Math.round(scores[i] * 10_000) / 10_000, source: { title: chunk.title, docSource: chunk.docSource, origin: chunk.origin, textSha256: chunk.textSha256 } };
    if (!item.text || sourceTriggersMiraPrivacy(item)) continue;
    perDocument.set(chunk.title, (perDocument.get(chunk.title) ?? 0) + 1);
    selected.push(item);
  }
  if (!selected.length) throw new TheOracleGroundingError("THEORACLE_NO_MATCH", "TheOracle tidak menemukan referensi untuk keluhan ini. Analisis tidak dijalankan.");
  return freezeBundle({
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: {
      name: "TheOracle",
      indexSha256: manifest.indexSha256,
      embeddingModel: { id: manifest.model.id, revision: manifest.model.revision, dtype: manifest.model.dtype, dims },
      retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
      reviewProvenance: REVIEW_PROVENANCE,
    },
    queryDigest: sha256(query),
    evidence: selected.map((item, index) => ({ ...item, retrievalRank: index + 1 })),
  });
}
