// Appends reviewed markdown documents from theoracle/sources/tatalaksana to theoracle/index/chunks.jsonl,
// one chunk per "## " section with the title and intro repeated, so a drug and its dose stay in one passage
// that also names the disease. Idempotent; then run: node scripts/build-theoracle-index.mjs --append
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { indexDir, root } from "./theoracle-model.mjs";

const sourceDir = "theoracle/sources/tatalaksana/";
const sha = text => createHash("sha256").update(text).digest("hex");
const uuid = hex => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
const existing = new Set(readFileSync(`${indexDir}chunks.jsonl`, "utf8").trim().split("\n").map(line => JSON.parse(line).id));
// New chunks carry the time they were added (Asia/Jakarta, the format the corpus already uses); existing chunks are skipped above.
const published = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
const added = [];
for (const file of readdirSync(root + sourceDir).filter(name => name.endsWith(".md")).sort()) {
  const [head, ...sections] = readFileSync(root + sourceDir + file, "utf8").replace(/\r\n/g, "\n").trim().split(/\n(?=## )/);
  sections.forEach((section, i) => {
    const text = `<document_metadata>\nsourceDocument: ${file}\npublished: ${published}\n</document_metadata>\n\n${head}\n\n${section}`;
    if (text.length > 2048) throw new Error(`${file} section ${i + 1} is ${text.length} chars; split it below 2048.`);
    const id = uuid(sha(`${file}#${i}`));
    if (existing.has(id)) return;
    added.push({ id, url: sourceDir + file, title: file, docAuthor: "Unknown", description: "Unknown", docSource: "Tatalaksana reviewed and approved by Gaffer", chunkSource: "", published, wordCount: text.split(/\s+/).length, token_count_estimate: Math.ceil(text.length / 4), text, origin: "sentrapedia-tatalaksana", textSha256: sha(text) });
  });
}
if (added.length) appendFileSync(`${indexDir}chunks.jsonl`, added.map(chunk => JSON.stringify(chunk)).join("\n") + "\n");
console.log(JSON.stringify({ added: added.length, documents: new Set(added.map(chunk => chunk.title)).size }));
