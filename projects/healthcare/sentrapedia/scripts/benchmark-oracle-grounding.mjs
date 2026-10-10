import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Compile the actual retriever into a disposable directory; no substitute SQL benchmark.
const scratch = mkdtempSync(path.join(tmpdir(), "oracle-grounding-benchmark-"));
const databasePath = path.resolve("oracle-ii/sentra_clinical_core_source_reparsed.sqlite");
const hash = () => createHash("sha256").update(readFileSync(databasePath)).digest("hex");
try {
  for (const name of ["oracle-grounding-types", "oracle-grounding"]) {
    const source = readFileSync(path.resolve(`src/lib/${name}.ts`), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    writeFileSync(path.join(scratch, `${name}.mjs`), compiled.replaceAll('"./oracle-grounding-types"', '"./oracle-grounding-types.mjs"'));
  }
  const { retrieveOracleGrounding } = await import(pathToFileURL(path.join(scratch, "oracle-grounding.mjs")).href);
  const before = hash();
  const results = [];
  for (const complaint of ["malaria demam", "batuk demam pneumonia", "diabetes hiperglikemia", "hipertensi tekanan darah tinggi", "nyeri abdomen apendisitis"]) {
    const caseData = { chiefComplaint: complaint, anamnesis: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [] };
    const start = performance.now();
    const bundle = retrieveOracleGrounding(caseData, { databasePath });
    const firstMs = performance.now() - start;
    const samples = [];
    for (let run = 0; run < 30; run++) {
      const tick = performance.now();
      retrieveOracleGrounding(caseData, { databasePath });
      samples.push(performance.now() - tick);
    }
    samples.sort((a, b) => a - b);
    const round = value => Math.round(value * 1000) / 1000;
    results.push({ complaint, passages: bundle.evidence.length, kinds: [...new Set(bundle.evidence.map(item => item.retrievalKind))], firstMs: round(firstMs), warmMedianMs: round(samples[15]), warmP95Ms: round(samples[28]), warmMaxMs: round(samples[29]) });
  }
  const after = hash();
  if (after !== before) throw new Error("Corpus changed during benchmark");
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, scope: "Actual Oracle II retrieval only; excludes model inference and HTTP latency", samplesPerComplaint: 30, corpusSha256: after, corpusUnchanged: true, results }, null, 2));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
