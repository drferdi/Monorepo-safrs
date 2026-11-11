// Tests for the build, deploy and TheOracle scripts. Each script runs as written: either from a temporary
// capsule (a byte-identical copy of the script next to stub siblings) or with a temporary working directory,
// so nothing here runs `next build`, loads the 1.2 GB model, calls a paid model or leaves the machine.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sha = data => createHash("sha256").update(data).digest("hex");

async function run(script, args = [], options = {}) {
  const child = spawn(process.execPath, [script, ...args], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], ...options });
  let stdout = "", stderr = "";
  child.stdout.on("data", data => { stdout += data.toString(); });
  child.stderr.on("data", data => { stderr += data.toString(); });
  const [code] = await once(child, "exit");
  return { code, stdout, stderr };
}
function write(root, file, content = "") {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}
function withCapsule(prefix, body) {
  return async () => {
    const root = mkdtempSync(join(tmpdir(), `sentrapedia-${prefix}-`));
    try { await body(root); } finally { rmSync(root, { recursive: true, force: true }); }
  };
}
const copyScripts = (root, names) => { for (const name of names) write(root, `scripts/${name}`, readFileSync(resolve("scripts", name))); };

// deploy-dry-run.mjs: the deploy gate, run with the temporary capsule as its working directory.
const deployInputs = [...readFileSync(resolve("scripts/deploy-dry-run.mjs"), "utf8").match(/const required = \[([^\]]+)\]/)[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
function deployFixture(root, { platforms = ["linux-x64"], dependency = "1.0.0" } = {}) {
  for (const file of deployInputs) if (file !== ".next/static") write(root, file, file === ".next/BUILD_ID" ? "build-fixture\n" : "");
  mkdirSync(join(root, ".next/static"), { recursive: true });
  write(root, "package.json", JSON.stringify({ name: "deploy-fixture", dependencies: { next: dependency } }));
  for (const platform of platforms) {
    const [os, arch] = platform.split("-");
    mkdirSync(join(root, `.next/standalone/node_modules/onnxruntime-node/bin/napi-v6/${os}/${arch}`), { recursive: true });
    mkdirSync(join(root, `.next/standalone/node_modules/@img/sharp-${platform}`), { recursive: true });
  }
}
const deploy = root => run(resolve("scripts/deploy-dry-run.mjs"), [], { cwd: root });

test("deploy dry-run accepts a public build without the private TheOracle index and says so", withCapsule("deploy", async root => {
  deployFixture(root);
  for (const file of ["manifest.json", "vectors.f32", "chunks.jsonl"]) rmSync(join(root, ".next/standalone/theoracle/index", file), { force: true });
  const { code, stdout, stderr } = await deploy(root);
  assert.equal(code, 0, stderr);
  assert.match(stderr, /TheOracle database not installed/);
  assert.equal(JSON.parse(stdout).status, "PASS");
}));

test("deploy dry-run passes a complete linux-x64 build and validates its traces", withCapsule("deploy", async root => {
  deployFixture(root);
  write(root, ".next/server/app/page.js");
  write(root, ".next/server/app/page.js.nft.json", JSON.stringify({ files: ["./page.js", "../../BUILD_ID"] }));
  write(root, ".next/cache/ignored.nft.json", "not json: the cache folder is skipped");
  const { code, stdout, stderr } = await deploy(root);
  assert.equal(code, 0, stderr);
  assert.equal(stderr, "");
  const report = JSON.parse(stdout);
  assert.equal(report.status, "PASS");
  assert.equal(report.project, "deploy-fixture");
  assert.equal(report.buildId, "build-fixture");
  assert.equal(report.tracesValidated, 1);
  assert.deepEqual(report.nativePlatforms, ["linux-x64"]);
}));

test("deploy dry-run refuses a missing deploy input", withCapsule("deploy-missing", async root => {
  const { code, stderr } = await deploy(root);
  assert.equal(code, 1);
  assert.match(stderr, /Missing deploy input: package-lock\.json\. Run npm ci and npm run build first\./);
  deployFixture(root);
  for (const file of [".next/standalone/scripts/run-system.mjs", ".next/standalone/theoracle/model/onnx-community/embeddinggemma-300m-ONNX/onnx/model.onnx_data"]) {
    rmSync(join(root, file));
    const result = await deploy(root);
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes(`Missing deploy input: ${file}.`), result.stderr);
    write(root, file);
  }
}));

test("deploy dry-run refuses a build trace that leaves the capsule or names a missing file", withCapsule("deploy-trace", async root => {
  deployFixture(root);
  write(root, ".next/server/page.js.nft.json", JSON.stringify({ files: ["../../../outside.js"] }));
  let result = await deploy(root);
  assert.equal(result.code, 1);
  assert.ok(result.stderr.includes("Build trace escapes capsule: ../../../outside.js"), result.stderr);
  write(root, ".next/server/page.js.nft.json", JSON.stringify({ files: ["./gone.js"] }));
  result = await deploy(root);
  assert.equal(result.code, 1);
  assert.ok(result.stderr.includes("Missing traced dependency: ./gone.js"), result.stderr);
}));

test("deploy dry-run needs onnxruntime and sharp binaries for one shared platform and warns when it is not linux-x64", withCapsule("deploy-native", async root => {
  deployFixture(root, { platforms: [] });
  mkdirSync(join(root, ".next/standalone/node_modules/onnxruntime-node/bin/napi-v6/linux/x64"), { recursive: true });
  mkdirSync(join(root, ".next/standalone/node_modules/@img/sharp-win32-x64"), { recursive: true });
  mkdirSync(join(root, ".next/standalone/node_modules/@img/sharp-libvips-linux-x64"), { recursive: true });
  let result = await deploy(root);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /no matching onnxruntime-node and sharp native binaries/);
  mkdirSync(join(root, ".next/standalone/node_modules/onnxruntime-node/bin/napi-v6/win32/x64"), { recursive: true });
  result = await deploy(root);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).nativePlatforms, ["win32-x64"]);
  assert.match(result.stderr, /Warning: this standalone build carries native binaries for win32-x64 only/);
}));

test("deploy dry-run refuses a workspace, file or link dependency", withCapsule("deploy-dependency", async root => {
  for (const dependency of ["workspace:*", "file:../next", "link:../next"]) {
    deployFixture(root, { dependency });
    const { code, stderr } = await deploy(root);
    assert.equal(code, 1);
    assert.match(stderr, /Non-registry dependency: next/);
  }
}));

// build-system.mjs: a copy runs in a temporary capsule whose node_modules/next is a stub that only writes build output.
const standaloneScripts = ["run-system.mjs", "aadi-runtime.mjs", "aadi-profile.json", "install-aadi.mjs"];
function buildFixture(root, nextExitCode = 0) {
  copyScripts(root, ["build-system.mjs", ...standaloneScripts]);
  write(root, "node_modules/next/package.json", JSON.stringify({ type: "commonjs" }));
  write(root, "node_modules/next/dist/bin/next", `const { mkdirSync, writeFileSync } = require("node:fs");
if (process.argv[2] !== "build") process.exit(9);
mkdirSync(".next/standalone", { recursive: true }); mkdirSync(".next/static/chunks", { recursive: true });
writeFileSync(".next/standalone/server.js", ""); writeFileSync(".next/standalone/package.json", "{}"); writeFileSync(".next/static/chunks/app.js", "");
process.exit(${nextExitCode});`);
  for (const file of ["aadi/service/app.py", "aadi/requirements.lock", "aadi/SOURCE.json", "aadi/managed_child.py", "aadi/service/__pycache__/app.cpython-312.pyc", "aadi/.pytest_cache/v/cache/nodeids"]) write(root, file);
  for (const file of ["index/manifest.json", "index/vectors.f32", "index/chunks.jsonl", "index/vectors.partial.f32", "index/vectors.partial.json", "model/onnx-community/embeddinggemma-300m-ONNX/onnx/model.onnx_data", "model/onnx-community/embeddinggemma-300m-ONNX/onnx/model.onnx_data.partial"]) write(root, `theoracle/${file}`);
  write(root, "theoracle/ssot/sentrapedia-knowledge-ssot.json");
  write(root, "public/logo.svg");
}

test("standalone build copies AADI, the TheOracle index and model, the launcher and public files, and leaves caches and partial downloads out", withCapsule("build", async root => {
  buildFixture(root);
  // Started from another directory: next build and every copy must still use the capsule.
  const { code, stdout, stderr } = await run(join(root, "scripts/build-system.mjs"), [], { cwd: tmpdir() });
  assert.equal(code, 0, stderr);
  assert.match(stdout, /standalone output mencakup engine AADI/);
  const output = join(root, ".next/standalone");
  for (const file of ["aadi/service/app.py", "aadi/managed_child.py", ...standaloneScripts.map(name => `scripts/${name}`), "theoracle/index/vectors.f32", "theoracle/model/onnx-community/embeddinggemma-300m-ONNX/onnx/model.onnx_data", ".next/static/chunks/app.js", "public/logo.svg"]) {
    assert.ok(existsSync(join(output, file)), `${file} is copied`);
  }
  for (const file of ["aadi/service/__pycache__", "aadi/.pytest_cache", "theoracle/index/vectors.partial.f32", "theoracle/index/vectors.partial.json", "theoracle/model/onnx-community/embeddinggemma-300m-ONNX/onnx/model.onnx_data.partial", "theoracle/ssot", "scripts/build-system.mjs"]) {
    assert.ok(!existsSync(join(output, file)), `${file} is left out`);
  }
  // Every standalone file the deploy gate requires is produced by the build.
  for (const file of deployInputs.filter(name => name.startsWith(".next/standalone/"))) assert.ok(existsSync(join(root, file)), `${file} exists after the build`);
  // The copied launcher and installer resolve all their imports inside the standalone output.
  const launcher = await run(join(output, "scripts/run-system.mjs"), ["bogus"]);
  assert.equal(launcher.code, 1);
  assert.equal(launcher.stderr.trim(), "Gunakan dev, start, standalone, atau check.");
  const installer = await run(join(output, "scripts/install-aadi.mjs"), [], { env: { ...process.env, SENTRAPEDIA_SKIP_AADI: "1" } });
  assert.equal(installer.code, 0, installer.stderr);
  assert.match(installer.stderr, /instalasi AADI dilewati/);
}));

test("standalone build stops with the next build exit code and copies nothing", withCapsule("build-fail", async root => {
  buildFixture(root, 3);
  const { code } = await run(join(root, "scripts/build-system.mjs"));
  assert.equal(code, 3);
  assert.ok(!existsSync(join(root, ".next/standalone/scripts")));
  assert.ok(!existsSync(join(root, ".next/standalone/aadi")));
}));

// Public code without the index, installed with SENTRAPEDIA_SKIP_MODEL=1: the build still finishes and names both gaps.
test("standalone build without the TheOracle index and model warns once for each and copies neither", withCapsule("build-bare", async root => {
  buildFixture(root);
  rmSync(join(root, "theoracle"), { recursive: true, force: true });
  const { code, stdout, stderr } = await run(join(root, "scripts/build-system.mjs"));
  assert.equal(code, 0, stderr);
  assert.match(stderr, /database TheOracle tidak terpasang/);
  assert.match(stderr, /model embedding TheOracle tidak terpasang/);
  assert.match(stdout, /engine AADI, dan unified launcher/);
  assert.ok(!existsSync(join(root, ".next/standalone/theoracle")));
}));

// build-theoracle-index.mjs: a copy runs next to a stub model profile and a stub @huggingface/transformers whose
// embedding of a text is [length, STUB_ROUND (default 1), 0, ...]. Rows are 12 bytes, so vectors.f32 is small enough
// that Node 24 reads it into its shared buffer pool (measured: 20,000 bytes pooled, 65,535 not).
const dims = 3;
const stubModel = { id: "stub/model", revision: "r1", dtype: "fp32", dims, files: { "config.json": { size: 11, sha256: sha("stub-config") } } };
function indexFixture(root, texts) {
  copyScripts(root, ["build-theoracle-index.mjs"]);
  write(root, "theoracle/model/stub/model/config.json", "stub-config");
  write(root, "scripts/theoracle-model.mjs", `import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const modelDir = root + "theoracle/model/";
export const indexDir = root + "theoracle/index/";
export const profile = { ...${JSON.stringify(stubModel)}, maxTokens: 8, pooling: "stub", prefixes: { query: "q: ", document: "d: " } };
export const fileSha256 = async path => createHash("sha256").update(readFileSync(path)).digest("hex");`);
  write(root, "node_modules/@huggingface/transformers/package.json", JSON.stringify({ name: "@huggingface/transformers", type: "module", main: "index.js" }));
  write(root, "node_modules/@huggingface/transformers/index.js", `export const env = { version: "stub-1" };
const tokenizer = async texts => texts;
tokenizer.encode = text => text.split(" ");
export const AutoTokenizer = { from_pretrained: async () => tokenizer };
export const AutoModel = { from_pretrained: async () => async texts => ({ sentence_embedding: { tolist: () => texts.map(text => [text.length, Number(process.env.STUB_ROUND ?? 1), ...Array(${dims - 2}).fill(0)]) } }) };`);
  write(root, "theoracle/index/chunks.jsonl", texts.map(text => JSON.stringify({ id: text, text })).join("\n") + "\n");
}
const readVectors = root => { const bytes = readFileSync(join(root, "theoracle/index/vectors.f32")); return Array.from(new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))); };
const unit = (length, round) => [length, round, ...Array(dims - 2).fill(0)].map(value => Math.fround(value / Math.hypot(length, round)));
const indexSha = manifest => sha(JSON.stringify({ chunks: manifest.chunks.sha256, vectors: manifest.vectors.sha256, model: manifest.model, prefixes: manifest.prefixes }));

test("index build writes one normalised row per chunk in chunk order and a manifest that pins chunks, vectors and model", withCapsule("index", async root => {
  const texts = ["alpha beta gamma delta epsilon zeta eta theta iota", "b", "cc"];
  indexFixture(root, texts);
  const { code, stdout, stderr } = await run(join(root, "scripts/build-theoracle-index.mjs"));
  assert.equal(code, 0, stderr);
  assert.equal(JSON.parse(stdout.trim().split("\n").at(-1)).finished, true);
  assert.deepEqual(readVectors(root), texts.flatMap(text => unit(`d: ${text}`.length, 1)));
  const manifest = JSON.parse(readFileSync(join(root, "theoracle/index/manifest.json"), "utf8"));
  // The first text is ten tokens with the prefix, over the stub's eight-token limit.
  assert.deepEqual(manifest.chunks, { count: 3, sha256: sha(readFileSync(join(root, "theoracle/index/chunks.jsonl"))), truncated: 1 });
  assert.equal(manifest.vectors.sha256, sha(readFileSync(join(root, "theoracle/index/vectors.f32"))));
  assert.deepEqual(manifest.model, stubModel);
  assert.deepEqual(manifest.prefixes, { query: "q: ", document: "d: " });
  assert.equal(manifest.runtime.version, "stub-1");
  assert.equal(manifest.indexSha256, indexSha(manifest));
  assert.ok(!existsSync(join(root, "theoracle/index/vectors.partial.f32")) && !existsSync(join(root, "theoracle/index/vectors.partial.json")));
}));

test("index build --append keeps the existing rows and embeds only the new chunks", withCapsule("index-append", async root => {
  indexFixture(root, ["one", "two"]);
  assert.equal((await run(join(root, "scripts/build-theoracle-index.mjs"))).code, 0);
  writeFileSync(join(root, "theoracle/index/chunks.jsonl"), ["one", "two", "three"].map(text => JSON.stringify({ id: text, text })).join("\n") + "\n");
  const { code, stderr } = await run(join(root, "scripts/build-theoracle-index.mjs"), ["--append"], { env: { ...process.env, STUB_ROUND: "2" } });
  assert.equal(code, 0, stderr);
  assert.deepEqual(readVectors(root), [...unit("d: one".length, 1), ...unit("d: two".length, 1), ...unit("d: three".length, 2)]);
  assert.equal(JSON.parse(readFileSync(join(root, "theoracle/index/manifest.json"), "utf8")).chunks.count, 3);
}));

test("an interrupted index build resumes from its partial vectors and embeds only the rows still missing", withCapsule("index-resume", async root => {
  indexFixture(root, ["one", "two three"]);
  // "one" is the shorter text, so it is embedded first; the partial file already holds a marker row for it.
  writeFileSync(join(root, "theoracle/index/vectors.partial.f32"), Buffer.from(new Float32Array([0, 0, 1, 0, 0, 0]).buffer));
  writeFileSync(join(root, "theoracle/index/vectors.partial.json"), JSON.stringify({ done: 1, total: 2 }));
  const { code, stderr } = await run(join(root, "scripts/build-theoracle-index.mjs"));
  assert.equal(code, 0, stderr);
  assert.deepEqual(readVectors(root), [0, 0, 1, ...unit("d: two three".length, 1)]);
  assert.ok(!existsSync(join(root, "theoracle/index/vectors.partial.f32")) && !existsSync(join(root, "theoracle/index/vectors.partial.json")));
}));

test("index build refuses a model file that does not match its pinned hash and writes nothing", withCapsule("index-model", async root => {
  indexFixture(root, ["one"]);
  writeFileSync(join(root, "theoracle/model/stub/model/config.json"), "changed");
  const { code, stderr } = await run(join(root, "scripts/build-theoracle-index.mjs"));
  assert.equal(code, 1);
  assert.match(stderr, /Model file config\.json does not match its pinned hash/);
  assert.ok(!existsSync(join(root, "theoracle/index/vectors.f32")) && !existsSync(join(root, "theoracle/index/manifest.json")));
}));

test("the installed TheOracle index matches its manifest the way the index build computes it", { skip: !(existsSync("theoracle/index/manifest.json") && existsSync("theoracle/index/vectors.f32")) && "no installed TheOracle index here (public code, or npm run knowledge:install not run)" }, () => {
  const manifest = JSON.parse(readFileSync(resolve("theoracle/index/manifest.json"), "utf8"));
  const chunks = readFileSync(resolve("theoracle/index/chunks.jsonl"));
  const vectors = readFileSync(resolve("theoracle/index/vectors.f32"));
  assert.equal(sha(chunks), manifest.chunks.sha256);
  assert.equal(chunks.toString("utf8").trim().split("\n").length, manifest.chunks.count);
  assert.equal(sha(vectors), manifest.vectors.sha256);
  assert.equal(vectors.byteLength, manifest.chunks.count * manifest.model.dims * 4);
  assert.equal(manifest.indexSha256, indexSha(manifest));
});

// install-theoracle-index.mjs: the pinned vector artefact replaced the Git LFS object (Gaffer, 2026-10-25). Only
// the paths that stop before any request are exercised here; nothing in this file reaches the network.
function installerFixture(root, { manifest, vectors } = {}) {
  copyScripts(root, ["install-theoracle-index.mjs", "theoracle-index.mjs"]);
  write(root, "scripts/theoracle-model.mjs", `import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../", import.meta.url));
export const indexDir = root + "theoracle/index/";
export const modelDir = root + "theoracle/model/";
export const fileSha256 = async path => createHash("sha256").update(readFileSync(path)).digest("hex");`);
  mkdirSync(join(root, "theoracle/index"), { recursive: true });
  if (vectors !== undefined) write(root, "theoracle/index/vectors.f32", vectors);
  if (manifest !== undefined) write(root, "theoracle/index/manifest.json", JSON.stringify(manifest));
}
const installer = (root, env = {}, cwd = root) => run(join(root, "scripts/install-theoracle-index.mjs"), [], { cwd, env: { ...process.env, SENTRAPEDIA_INDEX_TOKEN: "", GH_TOKEN: "", GITHUB_TOKEN: "", ...env } });
const pinned = vectors => ({ indexSha256: "a".repeat(64), vectors: { sha256: sha(vectors) } });

test("the index installer leaves an index that already matches its manifest alone", withCapsule("install-index", async root => {
  installerFixture(root, { vectors: "rows", manifest: pinned("rows") });
  const { code, stdout } = await installer(root);
  assert.equal(code, 0);
  assert.match(stdout, /sudah sesuai manifest/);
}));

test("the index installer says so and succeeds where there is no manifest, and skips on SENTRAPEDIA_SKIP_INDEX", withCapsule("install-index-none", async root => {
  installerFixture(root);
  const absent = await installer(root);
  assert.equal(absent.code, 0);
  assert.match(absent.stderr, /tidak ada theoracle\/index\/manifest\.json/);
  installerFixture(root, { vectors: "rows", manifest: pinned("other") });
  const skipped = await installer(root, { SENTRAPEDIA_SKIP_INDEX: "1" });
  assert.equal(skipped.code, 0);
  assert.match(skipped.stderr, /SENTRAPEDIA_SKIP_INDEX=1/);
}));

test("the index installer fails with a named token when the vectors are missing or stale", withCapsule("install-index-token", async root => {
  installerFixture(root, { manifest: pinned("rows") });
  const missing = await installer(root);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /SENTRAPEDIA_INDEX_TOKEN/);
  installerFixture(root, { vectors: "stale", manifest: pinned("rows") });
  const stale = await installer(root);
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /SENTRAPEDIA_INDEX_TOKEN/);
}));

test("both index commands stop with the capsule folder spelled out when run from elsewhere", withCapsule("install-index-cwd", async root => {
  installerFixture(root, { vectors: "rows", manifest: pinned("rows") });
  copyScripts(root, ["publish-theoracle-index.mjs"]);
  const elsewhere = tmpdir();
  const install = await installer(root, {}, elsewhere);
  assert.equal(install.code, 1);
  assert.match(install.stderr, /Jalankan perintah ini dari folder capsule Sentrapedia/);
  assert.match(install.stderr, /npm run knowledge:install/);
  assert.ok(install.stderr.includes(root), "names the capsule folder to cd into");
  const publish = await run(join(root, "scripts/publish-theoracle-index.mjs"), ["--yes"], { cwd: elsewhere });
  assert.equal(publish.code, 1);
  assert.match(publish.stderr, /npm run knowledge:publish -- --yes/);
}));

test("the index publisher refuses to upload without --yes", withCapsule("publish-index", async root => {
  installerFixture(root, { vectors: "rows", manifest: pinned("rows") });
  copyScripts(root, ["publish-theoracle-index.mjs"]);
  const { code, stderr } = await run(join(root, "scripts/publish-theoracle-index.mjs"), [], { cwd: root });
  assert.equal(code, 1);
  assert.match(stderr, /re-run with --yes/);
}));

// eval-theoracle-pipeline.mjs: runs in a temporary working directory against a local stub of /api/aadi.
test("pipeline eval needs a base URL and a label", async () => {
  const { code, stderr } = await run(resolve("scripts/eval-theoracle-pipeline.mjs"), [], { cwd: tmpdir() });
  assert.equal(code, 1);
  assert.match(stderr, /usage: node scripts\/eval-theoracle-pipeline\.mjs/);
});

test("pipeline eval scores ICD-10, dose support and the gate, skips term queries, waits out a per-minute limit and stops at an exhausted budget", withCapsule("eval", async root => {
  write(root, "aadi/service/data/icd10.json", JSON.stringify({ icd10: [{ kode: "A01", nama_en: "Typhoid and paratyphoid fevers" }, { kode: "A01.0", nama_en: "Typhoid fever" }] }));
  write(root, "set/eval-set.json", JSON.stringify({ queries: [
    { id: "q1", query: "demam tifoid", gold: ["tifoid.md"] },
    { id: "q2", query: "kata kunci", gold: ["x.md"], term: "seftriakson" },
    { id: "q3", query: "tanpa gold" },
    { id: "q4", query: "anggaran habis", gold: ["y.md"] },
    { id: "q5", query: "tidak pernah dikirim", gold: ["z.md"] },
  ] }));
  write(root, "set/gold-icd10.json", JSON.stringify({ labels: { q1: ["A01"] } }));
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", data => { body += data; });
    request.on("end", () => {
      requests.push({ url: request.url, origin: request.headers.origin, body: JSON.parse(body) });
      response.setHeader("Content-Type", "application/json");
      // The first call meets the per-minute limit once; the runner waits for Retry-After and resends it.
      if (requests.length === 1) { response.statusCode = 429; response.setHeader("Retry-After", "1"); response.end(JSON.stringify({ error: { code: "RATE_LIMITED" } })); return; }
      if (requests.length > 2) { response.statusCode = 429; response.end(JSON.stringify({ error: { code: "BUDGET_EXHAUSTED" } })); return; }
      response.end(JSON.stringify({
        result: { differential: { likely: [{ icd10: "A01.0", label: "Typhoid fever" }] }, therapy: { regimen: [{ drug: "Seftriakson", dose: "2 g" }] }, meta: { costUsd: 0.0123 } },
        evidenceGate: { drugs: [{ drug: "Seftriakson", dose: "2 g", status: "verified", evidenceIds: ["e1"] }, { drug: "Kloramfenikol", dose: "500 mg", status: "doseRemoved", evidenceIds: [] }] },
        therapyGrounding: { evidence: [{ evidenceId: "e1", text: "Seftriakson 2 g IV sekali sehari", source: { title: "tifoid.md" } }] },
        pipeline: { path: "targeted", stages: [{ stage: "retrieve_tx", ok: true, ms: 40 }, { stage: "aadi_tx", ok: true, ms: 900 }] },
      }));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const { code, stdout, stderr } = await run(resolve("scripts/eval-theoracle-pipeline.mjs"), [base, "targeted", "set"], { cwd: root });
    assert.equal(code, 0, stderr);
    assert.deepEqual(requests.map(request => request.body.case.chiefComplaint), ["demam tifoid", "demam tifoid", "anggaran habis"]);
    assert.equal(requests[0].url, "/api/aadi");
    assert.equal(requests[0].origin, base);
    const summary = JSON.parse(stdout);
    assert.equal(summary.cases, 2);
    assert.equal(summary.ok, 1);
    assert.deepEqual(summary.icd10, { valid: 1, nameMatch: 1, correctTop1VsDraftGold: 1 });
    assert.deepEqual(summary.dose, { written: 2, supportedByPassages: 1, supportedRate: 0.5, displayed: 1, verified: 1, doseRemoved: 1, removed: 0 });
    assert.equal(summary.retrievalSuccess, 1);
    assert.equal(summary.costUsd, 0.0123);
    assert.equal(summary.rateLimitRetries, 1);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
    const saved = JSON.parse(readFileSync(join(root, `docs/verification/theoracle-eval-${today}/pipeline-${today}-targeted.json`), "utf8"));
    assert.deepEqual(saved.summary, summary);
    assert.deepEqual(saved.rows[1], { id: "q4", ok: false, status: 429, code: "BUDGET_EXHAUSTED", ms: saved.rows[1].ms });
    assert.deepEqual(saved.rows[0].verifiedEvidence, [{ drug: "Seftriakson", dose: "2 g", passages: [{ id: "e1", title: "tifoid.md", text: "Seftriakson 2 g IV sekali sehari" }] }]);
  } finally {
    server.close();
  }
}));

// npm.mjs: npm is resolved by the shell and always runs in the capsule, whatever the caller's directory.
test("npm wrapper runs npm in the capsule and passes its exit code on", async () => {
  const prefix = await run(resolve("scripts/npm.mjs"), ["prefix"], { cwd: tmpdir() });
  assert.equal(prefix.code, 0, prefix.stderr);
  assert.equal(prefix.stdout.trim(), resolve("."));
  const missing = await run(resolve("scripts/npm.mjs"), ["run", "no-such-script"], { cwd: tmpdir() });
  assert.notEqual(missing.code, 0);
});

// benchmark-theoracle-grounding.mjs transpiles the retriever into a scratch folder; a local module it leaves out
// stops the run with ERR_MODULE_NOT_FOUND before any retrieval (as ./guards did from 9c6e921c until it was added).
test("benchmark compiles every local module the retriever imports", () => {
  const compiled = [...readFileSync(resolve("scripts/benchmark-theoracle-grounding.mjs"), "utf8").match(/for \(const name of \[([^\]]+)\]\)/)[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert.ok(compiled.includes("theoracle-grounding"));
  for (const name of compiled) {
    for (const [, local] of readFileSync(resolve("src/lib", `${name}.ts`), "utf8").matchAll(/^import (?!type )[^;]*from "\.\/([^"]+)"/gm)) {
      assert.ok(compiled.includes(local), `${name}.ts imports ./${local}, which the benchmark does not compile`);
    }
  }
});

// knowledge-ssot.mjs: a cross-referenced dose ("rujukan silang") is another disease's dose, so its catatan stays on the line.
test("dose lines keep the catatan of a cross-referenced dose only", async () => {
  const { doseLines } = await import(pathToFileURL(resolve("scripts/knowledge-ssot.mjs")).href);
  const lines = doseLines({ dosis: [
    { obat: "obat fiktif", dosis: "10 mg", sumber: "rujukan silang (dosis obat dari entri Penyakit Fiktif): ", catatan: "Dosis umum obat ini dari penyakit lain; bukan regimen khusus. Verifikasi." },
    { obat: "obat fiktif", dosis: "20 mg", sumber: "PNPK (fiktif.pdf)", catatan: "Diekstrak otomatis dari naskah PNPK; cek kutipan." },
  ] });
  assert.equal(lines[0], "- obat: obat fiktif; dosis: 10 mg; sumber: rujukan silang (dosis obat dari entri Penyakit Fiktif):; catatan: Dosis umum obat ini dari penyakit lain; bukan regimen khusus. Verifikasi.");
  assert.equal(lines[1], "- obat: obat fiktif; dosis: 20 mg; sumber: PNPK (fiktif.pdf)");
});

// Dose audit options B-E (Gaffer, 2026-10-23): konteks and kutipan are rendered on one line, auto-extracted statistics are
// not doses, identical statements from several sources become one line, and kelas (gone in v0.6) is not a field.
test("dose lines render konteks and kutipan, drop non-drug rows and merge identical statements", async () => {
  const { doseLines } = await import(pathToFileURL(resolve("scripts/knowledge-ssot.mjs")).href);
  const auto = "Diekstrak otomatis dari naskah PNPK; cek kutipan.";
  const lines = doseLines({ dosis: [
    { obat: "obat fiktif", dosis: "5 mg", konteks: "fase awal", sumber: "Sumber A", halaman: 12, kutipan: "obat fiktif 5 mg\nsetiap 8 jam", kelas: "x" },
    { obat: "obat fiktif", dosis: "5 mg", konteks: "fase awal", sumber: "Sumber B", halaman: "30", kutipan: "obat fiktif 5 mg setiap 8 jam" },
    { obat: "Sensitivitas", dosis: "95%", sumber: "Sumber A", kutipan: "Sensitivitas 95%", catatan: auto },
    { obat: "Kadar urea", dosis: "150 mg", sumber: "Sumber A", kutipan: "Kadar urea 150 mg", catatan: auto },
    { obat: "Normal", dosis: "100 mg", sumber: "Sumber A", kutipan: "Normal 100 mg", catatan: auto },
    { obat: "Sekitar", dosis: "10%", sumber: "Sumber manual", kutipan: "Sekitar 10%" },
    { obat: "obat fiktif", dosis: "5 mg", konteks: "fase awal", sumber: "rujukan silang (dosis obat dari entri Penyakit Fiktif): Sumber C", kutipan: "obat fiktif 5 mg setiap 8 jam", catatan: "Dosis umum obat ini dari penyakit lain; bukan regimen khusus." },
  ] });
  assert.deepEqual(lines, [
    "- obat: obat fiktif; dosis: 5 mg; konteks: fase awal; sumber: Sumber A / Sumber B; halaman: 12 / 30; kutipan: obat fiktif 5 mg setiap 8 jam",
    "- obat: Sekitar; dosis: 10%; sumber: Sumber manual; kutipan: Sekitar 10%",
    "- obat: obat fiktif; dosis: 5 mg; konteks: fase awal; sumber: rujukan silang (dosis obat dari entri Penyakit Fiktif): Sumber C; kutipan: obat fiktif 5 mg setiap 8 jam; catatan: Dosis umum obat ini dari penyakit lain; bukan regimen khusus.",
  ]);
});
