// Reads theoracle/ssot/sentrapedia-knowledge-ssot.json, the single knowledge source (2026-10-21), and renders the
// sections both derived files share. Nothing clinical is written by hand anywhere else.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { root } from "./theoracle-model.mjs";

export const ssotPath = "theoracle/ssot/sentrapedia-knowledge-ssot.json";
export const ssotBytes = readFileSync(root + ssotPath);
export const ssot = JSON.parse(ssotBytes.toString("utf8"));
export const sha256 = data => createHash("sha256").update(data).digest("hex");

const LABELS = { daftar_kki: "Daftar KKI", katalog_skdi: "Katalog SKDI 4A", oracle_ii: "Oracle II / PNPK", index_md: "Dokumen index", ppk_idi_2017: "PPK IDI 2017" };
const DOCUMENTS = { katalog_skdi: "katalog", oracle_ii: "PNPK", index_md: "index_md", ppk_idi_2017: "PPK IDI 2017" };
const clean = text => String(text ?? "").replace(/\r\n?/g, "\n").trim();

// "[PPK IDI 2017 · fasyankes-primer-idi-2017.pdf, hlm. 341] ..."; sources with identical text share one paragraph.
export function therapyText(entry) {
  const bySource = new Map();
  for (const [key, text] of Object.entries(entry.terapi_teks ?? {})) {
    const [base, note] = key.split(/ (?=\()/);
    const doc = entry.dokumen.find(d => d.jenis === DOCUMENTS[base]);
    const where = doc ? ` · ${doc.file}${typeof doc.halaman === "number" && doc.jenis !== "PNPK" ? `, hlm. ${doc.halaman}` : ""}` : "";
    const label = `${LABELS[base] ?? base}${note ? ` ${note}` : ""}${where}`;
    if (clean(text)) bySource.set(clean(text), [...(bySource.get(clean(text)) ?? []), label]);
  }
  return [...bySource].map(([text, labels]) => `[${labels.join("; ")}]\n${text}`).join("\n\n");
}

// One line per dose statement, with every non-empty field the SSOT carries for it.
const DOSE_FIELDS = ["obat", "dosis", "frekuensi", "durasi", "rute", "populasi", "sumber", "halaman", "kelas"];
export const doseLines = entry => entry.dosis.map(s => "- " + DOSE_FIELDS.filter(k => clean(s[k])).map(k => `${k}: ${clean(s[k])}`).join("; "));

export const list = value => (Array.isArray(value) ? value : [value]).map(clean).filter(Boolean);
export { clean };
