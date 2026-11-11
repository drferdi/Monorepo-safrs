// Gaffer's clinical decisions K1-K7 of the dose audit (2026-10-24: "Ya lakukan"), applied to the knowledge SSOT.
// Run from the capsule root: node docs/verification/theoracle-eval-2026-10-24/dose-audit-k.mjs [--write]
// A note goes into konteks, which the index renders; catatan keeps the old value. K1b, K5 and K6 change nothing.
import { readFileSync, writeFileSync } from "node:fs";

const SSOT = "theoracle/ssot/sentrapedia-knowledge-ssot.json";
const NOTE = "Keputusan klinis Gaffer 2026-10-24";
const raw = readFileSync(SSOT, "utf8"), o = JSON.parse(raw);
if (JSON.stringify(o, null, 1) !== raw) throw new Error("the SSOT does not round-trip");
const entry = id => o.penyakit.find(e => e.id === id);
const row = (id, i, expect) => {
  const d = entry(id).dosis[i];
  for (const [k, v] of Object.entries(expect)) if (d[k] !== v) throw new Error(`${id} #${i} ${k} is "${d[k]}", not "${v}"`);
  return d;
};
const konteks = (d, note) => {
  const old = d.konteks;
  d.konteks = old ? `${old}; ${note}` : note;
  d.catatan = `${d.catatan ? `${d.catatan}; ` : ""}${NOTE}: konteks semula "${old}".`;
};

// K1: PPK IDI 2017 prints 3,2 mg/kgBB for artesunat; that is artemether's loading dose.
konteks(row("SP0193", 78, { obat: "Artesunat", dosis: "3,2mg /kg BB" }),
  "catatan klinis: 3,2 mg/kgBB adalah dosis awal artemether; dosis artesunat 2,4 mg/kgBB IV/IM. Teks pedoman dikutip apa adanya");
// K2: both PPK print "500-100 mg"; likely 500-1000 mg, not proven by any library source.
konteks(row("SP0216", 81, { obat: "Cefadroxil", dosis: "2 x 500-100 mg per hari" }),
  "catatan klinis: \"500-100 mg\" kemungkinan salah ketik di pedoman (500-1000 mg)");
// K3: Permenkes 1.5-2 mg/kgBB/hari against 20 mg/kgBB/hari in PPK IDI 2017 and KMK 1186/2022.
konteks(row("SP0053", 27, { obat: "cefixime", dosis: "1.5-2 mg/kgbb" }),
  "catatan klinis: PPK IDI 2017 dan KMK 1186/2022 menulis 20 mg/kgBB/hari");
// K4: ISO "2050 mg/kg" for infants up to 14 days; the same text caps it at 50 mg/kgBB and the other ISO row reads 20-50.
const k4 = row("SP0267", 20, { obat: "ceftriaxone" });
if (!k4.dosis.includes("sekali sehari 2050 mg/kg bb")) throw new Error("SP0267 #20: K4 text not found");
const k4old = k4.dosis;
k4.dosis = k4.dosis.replace("sekali sehari 2050 mg/kg bb", "sekali sehari 20-50 mg/kg bb");
k4.catatan = `${k4.catatan ? `${k4.catatan}; ` : ""}${NOTE}: dosis semula "${k4old}" (tanda hubung hilang pada "2050").`;
// K7: SP0225 has no dose row left and no therapy text.
const k7 = entry("SP0225").status;
if (k7.terapi !== "dosis_tanpa_frekuensi" || k7.n_pernyataan_dosis !== 0) throw new Error("SP0225: status is not what the audit saw");
k7.terapi = "tanpa_dosis";

o._meta.catatan += ` ${NOTE}: K1-K4 dan K7 diterapkan (catatan klinis di 'konteks' SP0193, SP0216, SP0053; ceftriaxone ISO 20-50 mg/kg di SP0267; status SP0225 'tanpa_dosis').`;
const out = JSON.stringify(o, null, 1);
if (JSON.stringify(JSON.parse(out), null, 1) !== out) throw new Error("the new SSOT does not round-trip");
if (process.argv.includes("--write")) writeFileSync(SSOT, out);
console.log("ok", process.argv.includes("--write") ? "written" : "checked");
