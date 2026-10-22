// Writes theoracle/index/chunks.jsonl as two layers (2026-10-21):
// 1. the SSOT: one document per entry, split like the manifest's chunker (2048 characters, 20 overlap, separators
//    paragraph > line > word > character) with the disease name in every chunk;
// 2. the guideline library: every chunk of the current chunks.jsonl whose title is a PDF, carried over unchanged,
//    except titles that are not Indonesian clinical guidance.
// Deterministic: the same SSOT and library give the same bytes. Usage: node scripts/build-theoracle-chunks.mjs [output file]
// Then embed with: node scripts/build-theoracle-index.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { clean, doseLines, list, sha256, ssot, ssotPath, therapyText } from "./knowledge-ssot.mjs";
import { indexDir } from "./theoracle-model.mjs";

const CHUNK_SIZE = 2048, OVERLAP = 20;
// Library PDFs that are not Indonesian clinical guidance (aviation medicine, curricula, competence and service standards,
// a pathology case-report collection, forensics, sports nutrition, a classification table): left out of the index
// (2026-10-21, 2026-10-22). peran-patologi-klinik-unair.pdf stays in: without the clinical pathology texts
// lab-interpretation recall drops (benchmark 2026-10-22, columns C and D).
// The library is read from the current chunks.jsonl, so a title dropped here comes back only from git history.
const EXCLUDED_LIBRARY_PDFS = new Set([
  "faa-aviation-medical-examiners.pdf",
  "patologi-klinik-anatomik-unair.pdf",
  "standar-pelayanan-patologi-anatomik.pdf",
  "kurikulum-mikrobiologi-klinik-2022.pdf",
  "standar-kompetensi-dokter-indonesia.pdf",
  "gizi-olahraga-pdsko.pdf",
  "forensik-medikolegal-2020.pdf",
  "pelayanan-kesehatan-bergerak.pdf",
  "standar-pelayanan-kedokteran-nuklir-2009.pdf",
  "klasifikasi-diagnosis-pak-2021.pdf",
]);
const uuid = hex => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

// Recursive character splitting: pieces that fit are merged up to size, keeping trailing pieces of at most OVERLAP characters.
function split(text, size, [sep, ...rest] = ["\n\n", "\n", " ", ""]) {
  const chunks = [];
  let window = [];
  const length = parts => parts.join(sep).length;
  for (const piece of (sep ? text.split(sep) : [...text]).filter(Boolean)) {
    if (piece.length > size) { if (window.length) chunks.push(window.join(sep)); window = []; chunks.push(...split(piece, size, rest)); continue; }
    if (window.length && length([...window, piece]) > size) {
      chunks.push(window.join(sep));
      while (window.length && (length(window) > OVERLAP || length([...window, piece]) > size)) window.shift();
    }
    window.push(piece);
  }
  if (window.length) chunks.push(window.join(sep));
  return chunks;
}

const section = (title, body) => body ? `## ${title}\n${body}` : "";
function documentText(entry) {
  const facts = [entry.alias.length && `Alias: ${entry.alias.join("; ")}`, entry.icd10.length && `ICD-10: ${entry.icd10.join(", ")}`, entry.kompetensi && `Kompetensi: ${entry.kompetensi}`].filter(Boolean).join("\n");
  return [facts, section("Definisi", clean(entry.definisi)), section("Gejala", list(entry.gejala).map(g => `- ${g}`).join("\n")), section("Diagnosis", clean(entry.diagnosis)),
    section("Terapi", therapyText(entry)), section("Dosis", doseLines(entry).join("\n")), section("Rujukan", clean(entry.rujukan)), section("Edukasi", list(entry.edukasi ?? []).join("\n"))].filter(Boolean).join("\n\n");
}

const published = ssot._meta.dibangun;
const docSource = `${ssot._meta.nama} ${ssot._meta.versi}`;
const ssotRows = ssot.penyakit.flatMap(entry => {
  const head = `<document_metadata>\nsourceDocument: ${entry.id} ${entry.nama}\npublished: ${published}\n</document_metadata>\n\n# ${entry.nama}\n`;
  return split(documentText(entry), CHUNK_SIZE - head.length).map((body, i) => {
    const text = head + body;
    return { id: uuid(sha256(`${entry.id}#${i}`)), url: `${ssotPath}#${entry.id}`, title: entry.nama, docAuthor: "Unknown", description: "Unknown", docSource, chunkSource: "", published, wordCount: text.split(/\s+/).length, token_count_estimate: Math.ceil(text.length / 4), text, origin: "ssot", textSha256: sha256(text) };
  });
});
// Library lines are copied as read, so their ids, text and hashes stay byte-identical.
const library = readFileSync(`${indexDir}chunks.jsonl`, "utf8").trim().split("\n").filter(line => {
  const { title } = JSON.parse(line);
  return title.endsWith(".pdf") && !EXCLUDED_LIBRARY_PDFS.has(title);
});
const out = process.argv[2] ?? `${indexDir}chunks.jsonl`;
writeFileSync(out, [...ssotRows.map(row => JSON.stringify(row)), ...library].join("\n") + "\n");
console.log(JSON.stringify({ entries: ssot.penyakit.length, ssotChunks: ssotRows.length, libraryChunks: library.length, chunks: ssotRows.length + library.length, longest: Math.max(...ssotRows.map(row => row.text.length)), out }));
