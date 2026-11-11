// Applies the dose-audit proposals Gaffer approved on 2026-10-24 (M1-M7, H, N-0001; B and K stay open) to the knowledge SSOT.
// Run from the capsule root: node docs/verification/theoracle-eval-2026-10-24/dose-audit-apply.mjs [candidates.json] [--write]
// (default dose-audit-candidates.json; round 2, the seven mechanical changes of the re-audit, is dose-audit-candidates-2.json).
// Without --write it only checks. It stops at the first row that no longer holds the value the audit saw.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const HERE = "docs/verification/theoracle-eval-2026-10-24";
const SSOT = "theoracle/ssot/sentrapedia-knowledge-ssot.json";
const NOTE = "Audit dosis 2026-10-24";
const write = process.argv.includes("--write");

const raw = readFileSync(SSOT, "utf8");
const o = JSON.parse(raw);
const cand = JSON.parse(readFileSync(process.argv.slice(2).find(a => a.endsWith(".json")) ?? `${HERE}/dose-audit-candidates.json`, "utf8"));
// Round 3 names its own ids (R3-, R3H-); rounds 1 and 2 use the audit groups.
const APPROVED = new RegExp(cand.approved ?? "^(?:M[1-7]|H|N)-");
const stop = msg => { console.error(`STOP: ${msg}`); process.exit(1); };
if (JSON.stringify(o, null, 1) !== raw) stop("the SSOT does not round-trip before the change");
if (createHash("sha256").update(raw).digest("hex") !== cand.ssot.sha256) stop("the SSOT is not the file the audit read");

// The source a quote is checked against: the entry's own therapy text or a library PDF (chunks joined per file).
const pdf = new Map();
for (const line of readFileSync("theoracle/index/chunks.jsonl", "utf8").split("\n")) {
  if (!line) continue;
  const c = JSON.parse(line), file = String(c.chunkSource).split(/[\\/]/).pop();
  if (file.endsWith(".pdf")) pdf.set(file, (pdf.get(file) ?? "") + "\n" + c.text.replace(/^<document_metadata>[\s\S]*?<\/document_metadata>\n\n/, ""));
}
// Whitespace, case and dash style ignored ("200- 400" in the PDF is "200-400").
const key = v => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, "");
const entry = new Map(o.penyakit.map(e => [e.id, e]));
// Where the audit found the quote: a PDF, a key of the entry's text, or another entry's text (SP0173 #1 is SP0174's line).
const sourcesOf = (e, ev = {}) => [ev.file && pdf.get(ev.file), ev.key && e.terapi_teks?.[ev.key], ...Object.values(e.terapi_teks ?? {}), ...Object.values(entry.get(ev.id)?.terapi_teks ?? {})].filter(Boolean);
// The audit read "kiprofloksasin" in the catalogue text as siprofloksasin (M2, SP0053 #15).
const READ_AS = { "SP0053#15": "kiprofloksasin" };

const props = cand.proposals.filter(p => APPROVED.test(p.pid));
const edits = props.filter(p => p.class === "mekanis"), deletions = props.filter(p => p.class === "hapus");
const additions = (cand.newRows ?? []).filter(n => APPROVED.test(n.pid));

// 1. Field changes; old values per row go to catatan once all fields of the row are done.
const changed = new Map();
for (const p of edits) {
  const d = entry.get(p.id)?.dosis?.[p.i];
  if (!d || String(d[p.field]) !== p.old) stop(`${p.pid} ${p.id} #${p.i} ${p.field} is "${d?.[p.field]}", not "${p.old}"`);
  d[p.field] = p.new;
  (changed.get(d) ?? changed.set(d, { p, olds: [] }).get(d)).olds.push(`${p.field} semula "${p.old}"`);
}
const verified = { quoteInSource: 0, valueInQuote: 0 };
for (const [d, { p, olds }] of changed) {
  const e = entry.get(p.id), ps = edits.filter(q => q.id === p.id && q.i === p.i);
  if (ps.some(q => q.field === "kutipan")) {
    const ev = ps.find(q => q.field === "kutipan").evidence;
    if (!sourcesOf(e, ev).some(t => key(t).includes(key(d.kutipan)))) stop(`${p.pid} ${p.id} #${p.i}: the new quote is not in its source`);
    verified.quoteInSource++;
  }
  for (const q of ps.filter(q => q.field !== "kutipan")) {
    const v = key(READ_AS[`${q.id}#${q.i}`] ?? q.new);
    // A drug name may stand just before the quote in the entry's own text (round 3).
    if (!key(d.kutipan).includes(v) && !(q.field === "obat" && sourcesOf(e).some(t => key(t).includes(v)))) stop(`${q.pid} ${q.id} #${q.i}: "${q.new}" is not in the row's quote`);
    verified.valueInQuote++;
  }
  const c = String(d.catatan ?? "");
  d.catatan = `${c}${c ? "; " : ""}${NOTE}: ${olds.join(", ")}; disetujui Gaffer.`;
}

// 2. Deletions, per entry from the highest index down; each removed row is kept verbatim.
const removed = [];
const byEntry = new Map();
for (const p of deletions) (byEntry.get(p.id) ?? byEntry.set(p.id, []).get(p.id)).push(p);
for (const [id, ps] of byEntry) {
  const e = entry.get(id);
  for (const p of ps.sort((a, b) => b.i - a.i)) {
    if (JSON.stringify(e.dosis[p.i]) !== JSON.stringify(p.old)) stop(`${p.pid} ${id} #${p.i} is not the row the audit saw`);
    removed.push({ pid: p.pid, id, nama: e.nama, i: p.i, row: e.dosis.splice(p.i, 1)[0] });
  }
}

// 3. New rows from the entry's own therapy text.
for (const n of additions) {
  const e = entry.get(n.id);
  if (!key(e.terapi_teks?.[n.terapi_teks]).includes(key(n.row.kutipan))) stop(`${n.pid}: the quote is not in ${n.id} ${n.terapi_teks}`);
  e.dosis.push({ ...n.row });
}

// 4. Counts as the SSOT keeps them: statements, and distinct drug names (case ignored).
const statusChanged = [];
for (const e of o.penyakit) {
  const n = e.dosis.length, drugs = new Set(e.dosis.map(d => String(d.obat).toLowerCase().trim())).size;
  if (e.status.n_pernyataan_dosis !== n || e.status.n_obat_berdosis !== drugs) {
    statusChanged.push(`${e.id} ${e.status.n_pernyataan_dosis}/${e.status.n_obat_berdosis} -> ${n}/${drugs}`);
    e.status.n_pernyataan_dosis = n;
    e.status.n_obat_berdosis = drugs;
  }
}
o._meta.catatan += ` ${NOTE}${cand.round ? `, putaran ${cand.round}` : ""} (disetujui Gaffer): ${[
  `${edits.length} perbaikan mekanis pada ${changed.size} baris`,
  removed.length && `${removed.length} baris ekstraksi otomatis yang bukan dosis obat dihapus (salinan di ${HERE}/dose-audit-removed.json)`,
  additions.length && `${additions.length} baris baru dari teks terapi`,
].filter(Boolean).join(", ")}; nilai lama tercatat di 'catatan' baris.`;

const out = JSON.stringify(o, null, 1);
if (JSON.stringify(JSON.parse(out), null, 1) !== out) stop("the new SSOT does not round-trip");
const sum = k => o.penyakit.reduce((s, e) => s + e.status[k], 0);
console.log(JSON.stringify({
  write, edits: edits.length, rowsEdited: changed.size, verified, removed: removed.length, added: additions.length,
  entriesWithNewCounts: statusChanged.length, rows: o.penyakit.reduce((s, e) => s + e.dosis.length, 0),
  n_pernyataan_dosis: sum("n_pernyataan_dosis"), n_obat_berdosis: sum("n_obat_berdosis"),
  sha256: createHash("sha256").update(out).digest("hex"),
}, null, 1));
if (write) {
  // Each round adds its rows to the file of the rounds before.
  const file = `${HERE}/dose-audit-removed.json`, before = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { rows: [] };
  if (removed.length) writeFileSync(file, JSON.stringify({ applied: "2026-10-24", approvedBy: "Gaffer", rows: [...before.rows, ...removed.sort((a, b) => a.pid.localeCompare(b.pid)).map(r => ({ ...r, ssotBefore: cand.ssot.sha256 }))] }, null, 1));
  writeFileSync(SSOT, out);
}
