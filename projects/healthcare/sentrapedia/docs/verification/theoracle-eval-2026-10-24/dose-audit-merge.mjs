// Round 3 of the dose audit: merges the row-by-row readings of the re-audit (2026-10-24) into one candidates file for
// dose-audit-apply.mjs. Run from the capsule root:
//   node docs/verification/theoracle-eval-2026-10-24/dose-audit-merge.mjs <readings dir> <out candidates.json>
// <readings dir> holds b1, b2, b4, b5 (<name>.jsonl the rows read, <name>.decisions.jsonl one decision per row) and
// hand.decisions.jsonl. Every new value must be written in the row's quote (an obat may also be in the text just before it).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [dir, out] = process.argv.slice(2);
const { ssot, doseLines } = await import(pathToFileURL(process.cwd().replace(/\\/g, "/") + "/scripts/knowledge-ssot.mjs").href);
const jsonl = f => readFileSync(`${dir}/${f}`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const key = v => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, "");
const row = k => { const [id, i] = k.split("#"); return ssot.penyakit.find(e => e.id === id)?.dosis?.[+i]; };
const kindOf = d => String(d.catatan).startsWith("Diekstrak otomatis") ? "auto" : String(d.sumber).startsWith("rujukan silang") ? "rujukan" : "manual";

const edits = new Map(), deletions = new Map(), review = [], rejected = [];
// Renames not taken from the readers (2026-10-24): the drug was chosen by its frequency where two drugs share the dose
// (SP0053#13, SP0068#0), a combination named for one component's dose (SP0215), the epilepsy titration table read out of
// order (SP0075), and doses from study reports, which would enter the index as guidance.
const NOT_RENAMED = /^(?:SP0053#13|SP0068#0|SP0215#2[4-7]|SP0075#\d+)$/;
const STUDY = /\b(?:penelitian|studi|study|trial|uji klinis|dilaporkan|melaporkan)\b/i;
const addEdit = (k, field, value, by, alasan, context = "") => {
  const d = row(k), id = `${k}#${field}`;
  if (String(d[field] ?? "") === value) return;
  if (field === "obat" && by !== "hand" && (NOT_RENAMED.test(k) || STUDY.test(d.kutipan))) return review.push({ k, field, values: [value], why: `${by}: rename held back (${alasan})` });
  // A row whose quote is replaced is checked against the new quote.
  const quote = edits.get(`${k}#kutipan`)?.new ?? d.kutipan;
  const text = field === "obat" ? key(quote) + "|" + key(context) : key(quote);
  if (value && field !== "kutipan" && !text.includes(key(value))) return rejected.push({ k, field, value, by, why: "not in the quote" });
  const prev = edits.get(id);
  if (prev && prev.by !== "hand" && by !== "hand" && prev.new !== value) { edits.delete(id); return review.push({ k, field, values: [prev.new, value], why: "two readings differ" }); }
  if (!prev || by === "hand") edits.set(id, { key: k, field, old: String(d[field] ?? ""), new: value, by, alasan });
};
for (const name of ["b1", "b2", "b4", "b5"]) {
  const rows = jsonl(`${name}.jsonl`), decisions = jsonl(`${name}.decisions.jsonl`);
  const ctx = new Map(rows.map(r => [r.key, r.sebelum ?? ""]));
  if (decisions.length !== rows.length || decisions.some((x, n) => x.key !== rows[n].key)) throw new Error(`${name}: decisions do not match the rows read`);
  for (const x of decisions) {
    const d = row(x.key);
    if (x.lain) review.push({ k: x.key, why: `${name}: ${x.lain}` });
    if (x.action === "hapus") {
      if (kindOf(d) !== "auto") review.push({ k: x.key, why: `${name}: delete proposed for a ${kindOf(d)} row (${x.alasan})` });
      else deletions.set(x.key, { by: name, alasan: x.alasan });
    } else if (x.action === "obat") addEdit(x.key, "obat", x.obat, name, x.alasan, ctx.get(x.key));
    else if (x.action === "ubah") for (const [field, value] of Object.entries(x.ubah ?? {})) {
      if (!["dosis", "frekuensi", "durasi", "rute"].includes(field)) rejected.push({ k: x.key, field, value, by: name, why: "field not allowed" });
      else addEdit(x.key, field, value, name, x.alasan);
    } else if (x.action === "biarkan") review.push({ k: x.key, why: `${name}: ${x.alasan}` });
    else if (x.action !== "benar") throw new Error(`${name} ${x.key}: unknown action ${x.action}`);
  }
}
for (const x of jsonl("hand.decisions.jsonl").sort((a, b) => (b.field === "kutipan") - (a.field === "kutipan"))) {
  if (x.action === "hapus") deletions.set(x.key, { by: "hand", alasan: x.alasan });
  else addEdit(x.key, x.field, x.new, "hand", x.alasan);
}
// A row that goes is not edited.
for (const [id, e] of edits) if (deletions.has(e.key)) edits.delete(id);

const sorted = (m, f) => [...m.values()].sort((a, b) => f(a).localeCompare(f(b), "en", { numeric: true }));
let n = 0;
const proposals = [
  ...sorted(edits, e => `${e.key}#${e.field}`).map(e => {
    const [id, i] = e.key.split("#"), d = row(e.key);
    return { pid: `R3-${String(++n).padStart(4, "0")}`, id, i: +i, field: e.field, old: e.old, new: e.new, class: "mekanis", rule: `dibaca_${e.by}`, rendered: doseLines({ dosis: [d] }).length === 1, kind: kindOf(d), alasan: e.alasan };
  }),
  ...[...deletions].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })).map(([k, x]) => {
    const [id, i] = k.split("#"), d = row(k);
    return { pid: `R3H-${String(++n).padStart(4, "0")}`, id, i: +i, field: "(baris)", old: d, class: "hapus", rule: `dibaca_${x.by}`, rendered: doseLines({ dosis: [d] }).length === 1, kind: kindOf(d), alasan: x.alasan };
  }),
];
const raw = readFileSync("theoracle/ssot/sentrapedia-knowledge-ssot.json");
const count = f => proposals.filter(f).length;
const summary = { edits: count(p => p.class === "mekanis"), byField: Object.fromEntries(["obat", "dosis", "frekuensi", "durasi", "rute", "populasi", "kutipan"].map(f => [f, count(p => p.field === f)])),
  deletions: count(p => p.class === "hapus"), deletionsRendered: count(p => p.class === "hapus" && p.rendered), review: review.length, rejected: rejected.length };
writeFileSync(out, JSON.stringify({ generated: "2026-10-24", round: 3, approved: "^R3H?-", ssot: { sha256: createHash("sha256").update(raw).digest("hex") }, summary, proposals, review, rejected }, null, 1));
console.log(JSON.stringify(summary));
