// Derives the Pustaka Klinis catalogue (oracle/sentrapedia.json, the shape src/lib/theoracle.ts reads) from the SSOT
// and writes the catalogue's SHA-256 into theOracleSource in src/lib/theoracle.ts. Usage: node scripts/build-oracle-catalog.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { clean, doseLines, list, sha256, ssot, ssotBytes, ssotPath, therapyText } from "./knowledge-ssot.mjs";
import { root } from "./theoracle-model.mjs";

// An entry without a category takes the chapter of its first ICD-10 code; guideline topics are not diseases.
const CHAPTERS = { A: "Infeksi", B: "Infeksi", C: "Neoplasma/Darah", D: "Neoplasma/Darah", E: "Endokrin-Metabolik", F: "Jiwa", G: "Saraf", H: "Mata/THT", I: "Kardiovaskular", J: "Respirasi", K: "Pencernaan", L: "Kulit", M: "Muskuloskeletal", N: "Ginjal-Urogenital", O: "Kehamilan", P: "Neonatus/Kongenital", Q: "Neonatus/Kongenital", R: "Gejala", S: "Cedera", T: "Cedera", Z: "Lain" };
const UNCATEGORISED = "Belum dikategorikan";
const diseases = ssot.penyakit.filter(entry => entry.jenis !== "topik pedoman").map(entry => ({
  id: Number(entry.id.replace(/\D/g, "")), nama: entry.nama, kategori: entry.kategori ?? CHAPTERS[entry.icd10[0]?.[0]] ?? UNCATEGORISED, kode: entry.icd10.join(", "),
  definisi: clean(entry.definisi), gejala: list(entry.gejala), diagnosis: clean(entry.diagnosis),
  terapi: [therapyText(entry), entry.dosis.length ? `Dosis:\n${doseLines(entry).join("\n")}` : ""].filter(Boolean).join("\n\n"), rujukan: clean(entry.rujukan),
}));
const categories = [...new Set(diseases.map(d => d.kategori))].sort((a, b) => a.localeCompare(b, "id")).map(name => ({ id: name, name, kode: "", desc: "" }));
const catalog = {
  metadata: {
    name: "Sentrapedia Clinical Knowledge Database", version: ssot._meta.versi, total_diseases: diseases.length, total_categories: categories.length,
    description: `Derived from ${ssotPath} by npm run knowledge:build; do not edit by hand. ${ssot._meta.catatan}`, ssotSha256: sha256(ssotBytes),
    stats: [], nationalSources: [], professionalSources: [], internationalSources: [], exported_at: ssot._meta.dibangun,
  },
  categories, diseases,
};
const bytes = JSON.stringify(catalog, null, 2) + "\n";
writeFileSync(`${root}oracle/sentrapedia.json`, bytes);
const loader = `${root}src/lib/theoracle.ts`;
const source = readFileSync(loader, "utf8");
const hashed = source.replace(/(file: "oracle\/sentrapedia\.json", hash: ")[0-9a-f]{64}"/, `$1${sha256(bytes)}"`);
if (hashed === source && !source.includes(sha256(bytes))) throw new Error("theOracleSource hash not found in src/lib/theoracle.ts");
writeFileSync(loader, hashed);
console.log(JSON.stringify({ diseases: diseases.length, categories: categories.length, sha256: sha256(bytes) }));
