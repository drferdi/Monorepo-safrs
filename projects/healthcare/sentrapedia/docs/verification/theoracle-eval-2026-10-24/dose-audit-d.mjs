// Gaffer's clinical decision D-obat (2026-10-24), applied to the knowledge SSOT.
// Run from the capsule root: node docs/verification/theoracle-eval-2026-10-24/dose-audit-d.mjs [--write]
// PPK IDI 2017 offers two alternatives for the 3,2 mg/kgBB initial dose before referral ("Artemisinin atau
// Artesunat"). Row 78 named only the second while carrying the dose that belongs to the first, and its kutipan
// started mid-sentence, so the entry contradicted its own rendered Rujukan section. The restored quote is taken
// from that rujukan text rather than retyped, so it cannot drift from the SSOT's own wording.
import { readFileSync, writeFileSync } from "node:fs";

const SSOT = "theoracle/ssot/sentrapedia-knowledge-ssot.json";
const NOTE = "Keputusan klinis Gaffer 2026-10-24 (D-obat)";
const raw = readFileSync(SSOT, "utf8"), o = JSON.parse(raw);
if (JSON.stringify(o, null, 1) !== raw) throw new Error("the SSOT does not round-trip");

const entry = o.penyakit.find(e => e.id === "SP0193");
const d = entry.dosis[78];
const expect = {
  obat: "Artesunat",
  dosis: "3,2mg /kg BB",
  kutipan: "Artesunat per Intra Muskular atau Intra Vena\ndengan dosis awal 3,2mg /kg BB.",
};
for (const [k, v] of Object.entries(expect)) if (d[k] !== v) throw new Error(`SP0193 #78 ${k} is "${d[k]}", not "${v}"`);

const start = entry.rujukan.indexOf("Malaria berat");
if (start < 0) throw new Error("SP0193 rujukan does not hold the sentence");
const kutipan = entry.rujukan.slice(start).trim();
if (!kutipan.includes("Artemisinin atau") || !kutipan.endsWith("3,2mg /kg BB.")) {
  throw new Error("SP0193 rujukan sentence is not the one the report read");
}

const oldObat = d.obat, oldKutipan = d.kutipan.replace(/\n/g, " ");
d.obat = "Artemisinin atau Artesunat";
d.kutipan = kutipan;
d.catatan = `${d.catatan ? `${d.catatan}; ` : ""}${NOTE}: obat semula "${oldObat}", kutipan semula "${oldKutipan}" (kalimat pedoman menawarkan dua alternatif dan 3,2 mg/kgBB melekat pada yang pertama).`;

o._meta.catatan += ` ${NOTE}: SP0193 #78 obat menjadi "Artemisinin atau Artesunat" dan kutipannya dipulihkan ke kalimat utuh PPK IDI 2017.`;
const out = JSON.stringify(o, null, 1);
if (JSON.stringify(JSON.parse(out), null, 1) !== out) throw new Error("the new SSOT does not round-trip");
if (process.argv.includes("--write")) writeFileSync(SSOT, out);
console.log("ok", process.argv.includes("--write") ? "written" : "checked");
