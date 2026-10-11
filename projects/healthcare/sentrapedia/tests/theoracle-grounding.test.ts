import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyCase } from "../src/lib/mira/contract";
import { validTheOracleGrounding } from "../src/lib/theoracle-grounding-types";
import {
  THEORACLE_GROUNDING_CAPABILITY,
  TheOracleGroundingError,
  retrieveTheOracleGrounding,
  type TheOracleManifest,
} from "../src/lib/theoracle-grounding";

const scratch: string[] = [];
const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const header = (title: string) => `<document_metadata>\nsourceDocument: ${title}\npublished: 10/11/2026\n</document_metadata>\n\n`;
const chunk = (id: string, title: string, body: string, vector: number[]) => ({ id, title, docSource: "Kemenkes uji", origin: "oracle-ii-knowledge-base", text: header(title) + body, textSha256: sha256(header(title) + body), vector });
const fixtureChunks = [
  chunk("A1", "PNPK Pneumonia.md", "Batuk dan   demam\npada pneumonia.", [1, 0, 0]),
  chunk("A2", "PNPK Pneumonia.md", "Amoksisilin 3 x 500 mg selama 5 hari.", [0.9, 0.1, 0]),
  chunk("A3", "PNPK Pneumonia.md", "Bagian ketiga yang tidak boleh lolos.", [0.85, 0.15, 0]),
  chunk("C1", "Kontak.md", "Hubungi 081234567890 untuk konsultasi.", [0.95, 0.05, 0]),
  chunk("B1", "PNPK Tuberkulosis.md", "Batuk lebih dari dua minggu.", [0.2, 0.98, 0]),
  chunk("D1", "PPK Fasyankes Primer.pdf", "Penatalaksanaan pneumonia: amoksisilin 3 x 500 mg.", [0, 0.3, 1]),
  chunk("D2", "PPK Fasyankes Primer.pdf", "Terapi 500 mg, hubungi 081234567890.", [0, 0, 1]),
];

function fixtureIndex(tamper = false): string {
  const directory = mkdtempSync(path.join(tmpdir(), "sentrapedia-theoracle-"));
  scratch.push(directory);
  const chunks = fixtureChunks.map(item => JSON.stringify({ id: item.id, title: item.title, docSource: item.docSource, origin: item.origin, text: item.text, textSha256: item.textSha256 })).join("\n") + "\n";
  const vectors = Buffer.from(Float32Array.from(fixtureChunks.flatMap(item => { const norm = Math.hypot(...item.vector); return item.vector.map(value => value / norm); })).buffer);
  const manifest: TheOracleManifest = {
    model: { id: "fixture/model", revision: "f".repeat(40), dtype: "fp32", dims: 3, files: {} },
    prefixes: { query: "task: search result | query: ", document: "title: none | text: " },
    maxTokens: 2048,
    chunks: { count: fixtureChunks.length, sha256: sha256(chunks) },
    vectors: { sha256: sha256(vectors) },
    indexSha256: "d".repeat(64),
  };
  writeFileSync(path.join(directory, "chunks.jsonl"), chunks);
  writeFileSync(path.join(directory, "vectors.f32"), tamper ? Buffer.concat([vectors.subarray(4), Buffer.alloc(4)]) : vectors);
  writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  return directory;
}

function fakeEmbedder(calls: string[]) {
  return async () => async (text: string) => { calls.push(text); return Float32Array.from([1, 0, 0]); };
}

const caseFor = (complaint: string) => ({ ...emptyCase(), chiefComplaint: complaint });

afterEach(() => {
  while (scratch.length) rmSync(scratch.pop()!, { recursive: true, force: true });
});

describe("TheOracle vector grounding", () => {
  it("returns a frozen bundle with model, index and per-passage provenance", async () => {
    const calls: string[] = [];
    const bundle = await retrieveTheOracleGrounding(caseFor("batuk demam"), { indexDir: fixtureIndex(), embedder: fakeEmbedder(calls), now: () => new Date("2026-10-11T00:00:00.000Z") });
    expect(validTheOracleGrounding(bundle)).toBe(true);
    expect(bundle.version).toBe(THEORACLE_GROUNDING_CAPABILITY);
    expect(bundle.corpus).toMatchObject({ name: "TheOracle", indexSha256: "d".repeat(64), embeddingModel: { id: "fixture/model", revision: "f".repeat(40), dtype: "fp32", dims: 3 }, retrievedAt: "2026-10-11T00:00:00.000Z" });
    expect(calls).toEqual(["task: search result | query: batuk demam", "task: search result | query: batuk demam\npenatalaksanaan terapi dosis obat"]);
    expect(bundle.queryDigest).toBe(sha256("batuk demam"));
    expect(bundle.evidence[0]).toEqual({ evidenceId: "A1", text: "Batuk dan demam pada pneumonia.", retrievalRank: 1, similarity: 1, source: { title: "PNPK Pneumonia.md", docSource: "Kemenkes uji", origin: "oracle-ii-knowledge-base", textSha256: fixtureChunks[0].textSha256 } });
    expect(bundle.evidence[1].text).toBe("Amoksisilin 3 x 500 mg selama 5 hari.");
    expect(JSON.stringify(bundle)).not.toMatch(/url|chunkSource|document_metadata/i);
    expect(Object.isFrozen(bundle) && Object.isFrozen(bundle.evidence) && Object.isFrozen(bundle.evidence[0].source) && Object.isFrozen(bundle.corpus.embeddingModel)).toBe(true);
  });

  it("keeps at most two passages per document and skips sources that trip the MIRA privacy guard", async () => {
    const bundle = await retrieveTheOracleGrounding(caseFor("batuk"), { indexDir: fixtureIndex(), embedder: fakeEmbedder([]) });
    expect(bundle.evidence.map(item => item.evidenceId)).toEqual(["A1", "A2", "B1", "D1"]);
    expect(bundle.evidence.map(item => item.retrievalRank)).toEqual([1, 2, 3, 4]);
  });

  it("adds the best treatment passage that states a dose, from any guideline, in place of the lowest-ranked match", async () => {
    const therapyEmbedder = async () => async (text: string) => Float32Array.from(text.endsWith("dosis obat") ? [0, 0, 1] : [1, 0, 0]);
    const indexDir = fixtureIndex();
    const bundle = await retrieveTheOracleGrounding(caseFor("batuk"), { indexDir, embedder: therapyEmbedder });
    expect(validTheOracleGrounding(bundle)).toBe(true);
    expect(bundle.evidence.map(item => item.evidenceId)).toEqual(["A1", "A2", "B1", "D1"]);
    expect(bundle.evidence.map(item => item.retrievalRank)).toEqual([1, 2, 3, 4]);
    expect((await retrieveTheOracleGrounding(caseFor("batuk"), { indexDir, embedder: therapyEmbedder, limit: 3 })).evidence.map(item => item.evidenceId)).toEqual(["A1", "A2", "D1"]);
  });

  it("clamps the evidence limit", async () => {
    const indexDir = fixtureIndex();
    expect((await retrieveTheOracleGrounding(caseFor("batuk"), { indexDir, embedder: fakeEmbedder([]), limit: 1 })).evidence).toHaveLength(1);
    expect((await retrieveTheOracleGrounding(caseFor("batuk"), { indexDir, embedder: fakeEmbedder([]), limit: 99 })).evidence.length).toBeLessThanOrEqual(6);
  });

  it("refuses an empty query before embedding", async () => {
    const calls: string[] = [];
    await expect(retrieveTheOracleGrounding(caseFor("  -- "), { indexDir: fixtureIndex(), embedder: fakeEmbedder(calls) })).rejects.toMatchObject({ code: "THEORACLE_QUERY_EMPTY" });
    expect(calls).toEqual([]);
  });

  it("refuses an index whose files do not match the manifest", async () => {
    await expect(retrieveTheOracleGrounding(caseFor("batuk"), { indexDir: fixtureIndex(true), embedder: fakeEmbedder([]) })).rejects.toMatchObject({ code: "THEORACLE_UNAVAILABLE" });
  });

  it("reports a local embedding failure as unavailable", async () => {
    const failing = async () => async (): Promise<Float32Array> => { throw new Error("onnx failure"); };
    const error: unknown = await retrieveTheOracleGrounding(caseFor("batuk"), { indexDir: fixtureIndex(), embedder: failing }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TheOracleGroundingError);
    expect(error).toMatchObject({ code: "THEORACLE_UNAVAILABLE" });
  });

  it("answers from the real TheOracle index with the pinned local model without modifying it", async () => {
    const indexDir = path.join(process.cwd(), "theoracle", "index");
    const before = sha256(readFileSync(path.join(indexDir, "vectors.f32")));
    const manifest = JSON.parse(readFileSync(path.join(indexDir, "manifest.json"), "utf8")) as TheOracleManifest;
    const bundle = await retrieveTheOracleGrounding(caseFor("malaria demam menggigil"));
    expect(validTheOracleGrounding(bundle)).toBe(true);
    expect(bundle.corpus.indexSha256).toBe(manifest.indexSha256);
    expect(bundle.corpus.embeddingModel).toEqual({ id: manifest.model.id, revision: manifest.model.revision, dtype: manifest.model.dtype, dims: manifest.model.dims });
    expect(bundle.evidence.some(item => /malaria/i.test(item.source.title + item.text))).toBe(true);
    expect(sha256(readFileSync(path.join(indexDir, "vectors.f32")))).toBe(before);
  }, 180_000);
});
