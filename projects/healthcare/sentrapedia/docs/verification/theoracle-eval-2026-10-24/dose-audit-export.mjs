// node export.mjs <run.json> <candidates.json out> <tables.md out>
// Turns the audit run into the candidate file the apply step reads (one id per proposal) and the report tables.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [runFile, outJson, outMd] = process.argv.slice(2);
const run = JSON.parse(readFileSync(runFile, "utf8"));

// Rows read by hand during the audit (2026-10-24); each quote was checked against the entry's own text.
const HAND = [
  { id: "SP0013", i: 11, field: "obat", old: "besi", new: "asam folat", class: "mekanis", rule: "a_obat_dibaca_manual", note: 'kutipan: "60 mg besi elemental dan 250 μg asam folat"; 250 μg is the folic acid' },
  { id: "SP0314", i: 41, field: "dosis", old: "50 mg", new: "50 mg/kgBB", class: "baca_manual", rule: "a_baris_dibaca_manual", note: 'Permenkes 5/2014 hal. 311 text: "Amoksisilin 50 mg/\\n kgBB dosis dibagi 3 kali/ hari selama 10 hari"; the row also carries "dosis tunggal" (Penicillin G benzatin) as frekuensi and a quote cut at "50 mg/"' },
];
// Step 5: an entry left without a dose line once the H rows go, whose own therapy text holds a dose.
const NEW = [
  { pid: "N-0001", id: "SP0286", terapi_teks: "kmk_1186_2022 (hal. 467)", row: { obat: "Adrenalin 1/1000", dosis: "0,3ml", frekuensi: "", durasi: "", rute: "SK", populasi: "", kutipan: "-Adrenalin 1/1000 0,3ml SK", sumber: "KMK 1186/2022 PPK", halaman: "467", konteks: "Alternatif pada serangan sedang dan berat (bagan tata laksana)", catatan: "Diambil dari teks terapi entri ini (terapi_teks \"kmk_1186_2022 (hal. 467)\"), 2026-10-24; disetujui Gaffer." } },
];
const GROUP = {
  b_tanda_hubung_hilang: "M1", a_obat_potongan: "M2", a_obat_potongan_angka: "M2", a_obat_dibaca_manual: "M2", a_obat_dari_kutipan: "M3",
  b_per_kg_hilang: "M4", b_dosis_maksimum_sebagai_dosis: "M5", f_frekuensi_rentang_terpotong: "M6", f_frekuensi_satuan_terpotong: "M6",
  b_angka_ribuan_terpotong: "M7", a_baris_dibaca_manual: "B", bukan_obat: "H",
};
const { ssot, doseLines } = await import(pathToFileURL(process.cwd().replace(/\\/g, "/") + "/scripts/knowledge-ssot.mjs").href);
const all = [...run.proposals, ...HAND.map(({ note, ...h }) => {
  const e = ssot.penyakit.find(x => x.id === h.id), d = e.dosis[h.i];
  if (String(d[h.field]) !== h.old) throw new Error(`${h.id} #${h.i} ${h.field} is "${d[h.field]}", not "${h.old}"`);
  return { ...h, nama: e.nama, rendered: doseLines({ dosis: [d] }).length === 1, kind: String(d.catatan).startsWith("Diekstrak otomatis") ? "auto" : "manual", sumber: d.sumber, evidence: { where: "teks_sendiri", kutipan: d.kutipan }, catatan_audit: note };
})];
const order = p => `${p.class === "mekanis" ? 0 : p.class === "baca_manual" ? 1 : 2}${GROUP[p.rule] ?? "Z"}${p.id}${String(p.i).padStart(4, "0")}${p.field}`;
all.sort((a, b) => order(a).localeCompare(order(b)));
const counters = {};
for (const p of all) {
  const g = p.class === "mekanis" ? GROUP[p.rule] : p.class === "hapus" ? "H" : "B";
  counters[g] = (counters[g] ?? 0) + 1;
  p.pid = `${g}-${String(counters[g]).padStart(4, "0")}`;
}
const squash = v => String(v).replace(/\s+/g, " ");
for (const n of NEW) {
  const e = ssot.penyakit.find(x => x.id === n.id);
  if (!squash(e.terapi_teks[n.terapi_teks]).includes(n.row.kutipan)) throw new Error(`${n.pid}: quote not in ${n.id} ${n.terapi_teks}`);
  n.nama = e.nama;
}
// Two mechanical changes of one field of one row would collide in the apply step.
const seen = new Map(), clashes = [];
for (const p of all.filter(p => p.class === "mekanis" && p.field !== "(baris)")) {
  const k = `${p.id}#${p.i}#${p.field}`;
  if (seen.has(k)) clashes.push([seen.get(k), p.pid]); else seen.set(k, p.pid);
}

// One line per flagged row: "SP0020#2" -> "manual,rendered,<where/match>: code, code".
const flaggedCompact = Object.fromEntries(run.flagged.map(r => [`${r.id}#${r.i}`, `${r.kind},${r.rendered ? "rendered" : "not rendered"},${r.loc.where}${r.loc.match ? "/" + r.loc.match : ""}: ${r.flags.map(f => f.code).join(", ")}`]));
// A delete candidate carries the whole row (old) already; the rest of its record would only repeat it.
for (const p of all) if (p.class === "hapus") { delete p.evidence; delete p.nama; delete p.sumber; delete p.new; }
writeFileSync(outJson, JSON.stringify({
  generated: "2026-10-24", ssot: run.summary.ssot, script: "dose-audit.mjs (read-only)",
  classes: { mekanis: "reading of the row's own quote, applied only with Gaffer's approval", baca_manual: "needs a person to read the quote or the source", hapus: "auto-extracted row that is not a drug dose (statistic, lab value, equipment)" },
  groups: { M1: "lost dash, proven by the source PDF", M2: "drug name was a fragment of the quote's word", M3: "drug name taken from the one drug the quote names before the dose", M4: "per-kg dose stored as an absolute dose", M5: "a maximum stored as the dose", M6: "frequency cut (range start or 'seminggu')", M7: "number cut at a thousands space", B: "read by hand", H: "delete candidate", N: "new row from the entry's own therapy text (step 5)" },
  counts: { ...counters, N: NEW.length }, clashes, proposals: all, newRows: NEW, conflicts: run.conflicts, noDose: run.noDose, flagged: flaggedCompact,
}, null, 1));

// Tables for the report.
const s = v => String(v ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|");
const cut = (v, n) => { const t = s(v); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const lines = [];
const table = (title, ps, withQuote = true) => {
  lines.push(`\n#### ${title} (${ps.length})\n`, `| ID | Entry, row | Field | Now | Proposed | ${withQuote ? "Quote |" : ""}`, `|---|---|---|---|---|${withQuote ? "---|" : ""}`);
  for (const p of ps) lines.push(`| ${p.pid} | ${p.id} #${p.i}${p.rendered ? "" : " (not rendered)"} | ${p.field} | ${cut(p.old, 60)} | ${cut(p.new, 80)} | ${withQuote ? cut(p.evidence?.kutipan, 140) + " |" : ""}`);
};
for (const g of ["M1", "M2", "M3", "M4", "M5", "M6", "M7"]) table(g, all.filter(p => p.pid.startsWith(g + "-")));
table("B (read by hand)", all.filter(p => p.pid.startsWith("B-")));
writeFileSync(outMd, lines.join("\n") + "\n");
console.log(JSON.stringify({ counters, clashes, total: all.length }));
