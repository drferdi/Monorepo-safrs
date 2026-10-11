import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Compile the actual retriever into a disposable directory and score it on the eval set: the
// production query embedding (local CPU), cosine search, per-document cap and privacy filter.
// Inside the capsule so the compiled module resolves @huggingface/transformers from node_modules.
const cache = path.resolve("node_modules/.cache"); mkdirSync(cache, { recursive: true });
const scratch = mkdtempSync(path.join(cache, "theoracle-grounding-benchmark-"));
const indexDir = path.resolve("theoracle/index");
const evalSet = path.resolve("docs/verification/theoracle-eval-2026-10-11/eval-set.json");
const hash = () => createHash("sha256").update(readFileSync(path.join(indexDir, "vectors.f32"))).update(readFileSync(path.join(indexDir, "chunks.jsonl"))).digest("hex");
const pct = (values, p) => { const sorted = [...values].sort((a, b) => a - b); return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] * 10) / 10; };
try {
  for (const name of ["theoracle-grounding-types", "theoracle-grounding"]) {
    const source = readFileSync(path.resolve(`src/lib/${name}.ts`), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    writeFileSync(path.join(scratch, `${name}.mjs`), compiled.replaceAll('"./theoracle-grounding-types"', '"./theoracle-grounding-types.mjs"'));
  }
  const { retrieveTheOracleGrounding } = await import(pathToFileURL(path.join(scratch, "theoracle-grounding.mjs")).href);
  const caseFor = complaint => ({ chiefComplaint: complaint, anamnesis: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [] });
  const before = hash();
  const rssBefore = process.memoryUsage().rss;
  const coldStart = performance.now();
  const first = await retrieveTheOracleGrounding(caseFor("malaria demam"), { indexDir });
  const coldStartMs = Math.round(performance.now() - coldStart);
  const { queries } = JSON.parse(readFileSync(evalSet, "utf8"));
  const rows = [], latency = [];
  for (const item of queries) {
    const tick = performance.now();
    const bundle = await retrieveTheOracleGrounding(caseFor(item.query), { indexDir, limit: 5 });
    latency.push(performance.now() - tick);
    const hit = item.term ? bundle.evidence.some(e => e.text.toLowerCase().includes(item.term.toLowerCase())) : bundle.evidence.some(e => item.gold.includes(e.source.title));
    rows.push({ category: item.category, subtype: item.subtype, hit });
  }
  const recall = {};
  for (const key of [...new Set(rows.map(r => r.category)), ...new Set(rows.filter(r => r.subtype).map(r => `exact_terms.${r.subtype}`)), "overall"]) {
    const group = rows.filter(r => key === "overall" || r.category === key || `exact_terms.${r.subtype}` === key);
    recall[key] = { hits: group.filter(r => r.hit).length, total: group.length, recallAt5: Math.round(group.filter(r => r.hit).length / group.length * 1000) / 1000 };
  }
  const after = hash();
  if (after !== before) throw new Error("Index changed during benchmark");
  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(), node: process.version,
    scope: "Actual TheOracle retrieval (local CPU query embedding + cosine search + caps); excludes MIRA model inference and HTTP latency",
    indexSha256: first.corpus.indexSha256, embeddingModel: first.corpus.embeddingModel, indexUnchanged: true,
    coldStartMs, rssGrowthMb: Math.round((process.memoryUsage().rss - rssBefore) / 1048576),
    warmLatencyMs: { median: pct(latency, 0.5), p95: pct(latency, 0.95), max: pct(latency, 1) },
    recallAt5: recall,
  }, null, 2));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
