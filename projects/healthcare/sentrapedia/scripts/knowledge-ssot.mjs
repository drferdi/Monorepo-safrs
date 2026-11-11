// Reads theoracle/ssot/sentrapedia-knowledge-ssot.json, the single knowledge source (2026-10-21), and renders the
// sections both derived files share. Nothing clinical is written by hand anywhere else.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { root } from "./theoracle-model.mjs";

export const ssotPath = "theoracle/ssot/sentrapedia-knowledge-ssot.json";
export const ssotBytes = readFileSync(root + ssotPath);
export const ssot = JSON.parse(ssotBytes.toString("utf8"));
export const sha256 = data => createHash("sha256").update(data).digest("hex");

const LABELS = { daftar_kki: "Daftar KKI", katalog_skdi: "Katalog SKDI 4A", oracle_ii: "Oracle II / PNPK", index_md: "Dokumen index", ppk_idi_2017: "PPK IDI 2017", kmk_1186_2022: "KMK 1186/2022", ppk_permenkes_5_2014: "Permenkes 5/2014", kmk_1936_2022: "KMK 1936/2022", ppk_bedah_toraks_2018: "PPK HBTKVI 2016-2018" };
// v0.5 keys carry the source and page: "pnpk_PNPK_2019_Tata_Laksana_Malaria (hal. 26)" reads "PNPK 2019 Tata Laksana Malaria (hal. 26)".
const sourceLabel = base => LABELS[base] ?? (base.startsWith("pnpk_") ? `PNPK ${base.slice(5).replace(/^PNPK_/, "").replaceAll("_", " ")}` : base);
const DOCUMENTS = { katalog_skdi: "katalog", oracle_ii: "PNPK", index_md: "index_md", ppk_idi_2017: "PPK IDI 2017" };
const clean = text => String(text ?? "").replace(/\r\n?/g, "\n").trim();

// Disease categories are the ICD-10 (WHO 2010) chapter of the entry's first code (Gaffer, 2026-10-24).
const CHAPTERS = [
  ["A00", "B99", "Infeksi dan Parasit"], ["C00", "D48", "Neoplasma"], ["D50", "D89", "Darah dan Imunologi"],
  ["E00", "E90", "Endokrin, Nutrisi, dan Metabolik"], ["F00", "F99", "Jiwa dan Perilaku"], ["G00", "G99", "Saraf"],
  ["H00", "H59", "Mata"], ["H60", "H95", "Telinga"], ["I00", "I99", "Kardiovaskular"], ["J00", "J99", "Pernapasan"],
  ["K00", "K93", "Pencernaan"], ["L00", "L99", "Kulit"], ["M00", "M99", "Muskuloskeletal"], ["N00", "N99", "Ginjal dan Saluran Kemih-Kelamin"],
  ["O00", "O99", "Kehamilan dan Persalinan"], ["P00", "P96", "Perinatal"], ["Q00", "Q99", "Kongenital"],
  ["R00", "R99", "Gejala dan Temuan Abnormal"], ["S00", "T98", "Cedera dan Keracunan"], ["U00", "U99", "Kode Khusus (COVID-19)"],
  ["V01", "Y98", "Penyebab Eksternal"], ["Z00", "Z99", "Faktor Status Kesehatan"],
];
export const chapter = code => {
  const block = String(code ?? "").trim().toUpperCase().slice(0, 3);
  return CHAPTERS.find(([first, last]) => block.length === 3 && block >= first && block <= last)?.[2];
};

// "[PPK IDI 2017 · fasyankes-primer-idi-2017.pdf, hlm. 341] ..."; sources with identical text share one paragraph.
export function therapyText(entry) {
  const bySource = new Map();
  for (const [key, text] of Object.entries(entry.terapi_teks ?? {})) {
    const [base, note] = key.split(/ (?=\()/);
    const doc = entry.dokumen.find(d => d.jenis === DOCUMENTS[base]);
    const where = doc ? ` · ${doc.file}${typeof doc.halaman === "number" && doc.jenis !== "PNPK" ? `, hlm. ${doc.halaman}` : ""}` : "";
    const label = `${sourceLabel(base)}${note ? ` ${note}` : ""}${where}`;
    if (clean(text)) bySource.set(clean(text), [...(bySource.get(clean(text)) ?? []), label]);
  }
  return [...bySource].map(([text, labels]) => `[${labels.join("; ")}]\n${text}`).join("\n\n");
}

// One line per dose statement, with every non-empty field the SSOT carries for it, each on one line ("6\njam" reads "6 jam").
const DOSE_FIELDS = ["obat", "dosis", "frekuensi", "durasi", "rute", "populasi", "konteks", "sumber", "halaman", "kutipan"];
const field = value => clean(value).replace(/\s+/g, " ");
// A cross-referenced dose ("rujukan silang", SSOT v0.6) is another disease's dose; its catatan says so and stays on the line.
const crossReferenced = s => field(s.sumber).startsWith("rujukan silang");
const doseFields = s => crossReferenced(s) ? [...DOSE_FIELDS, "catatan"] : DOSE_FIELDS;
// Auto-extracted rows whose "obat" is a statistic, a lab value or a sentence fragment, not a drug ("Sekitar 90%",
// "Sensitivitas 95%", "TBSA 25%", "Kadar urea 150 mg"; dose audit 2026-10-23; "Normal 100 mg", "Lebih dari 25%", 2026-10-24). Manual rows are kept whatever they say.
const NOT_A_DRUG = /^(?:sekitar|sebanyak|minggu|angka|pasien|penurunan|peningkatan|hbsag|hbeag|target|mulai|maksimal|indonesia|dari|setelah|kadar|kgbb|prevalensi|insidens|sensitivitas|spesifisitas|anemia|usia|risiko|berat|grade|spuit|tbsa|glukosa darah|normal|studi|lebih|kurang|volume|mortalitas|survival|data|tidak|nilai|skor|penelitian|hasil|jumlah|total|rerata|sebesar|hingga|kemudian|kelompok|stadium|derajat|ukuran|frekuensi|saturasi|tekanan|hemoglobin|kreatinin|leukosit)(?![\p{L}\d])/iu;
const isDose = s => !(field(s.catatan).startsWith("Diekstrak otomatis") && NOT_A_DRUG.test(field(s.obat)));
// Statements that say the same thing (every field but sumber and halaman) become one line listing each source and page;
// a cross-referenced statement never merges with the entry's own.
export const doseLines = entry => {
  const merged = new Map();
  for (const s of entry.dosis.filter(isDose)) {
    const key = JSON.stringify([crossReferenced(s), ...doseFields(s).filter(k => k !== "sumber" && k !== "halaman").map(k => field(s[k]))]);
    const line = merged.get(key) ?? merged.set(key, { s, sumber: [], halaman: [] }).get(key);
    for (const k of ["sumber", "halaman"]) if (field(s[k]) && !line[k].includes(field(s[k]))) line[k].push(field(s[k]));
  }
  return [...merged.values()].map(({ s, sumber, halaman }) => {
    const values = { ...s, sumber: sumber.join(" / "), halaman: halaman.join(" / ") };
    return "- " + doseFields(s).filter(k => field(values[k])).map(k => `${k}: ${field(values[k])}`).join("; ");
  });
};

export const list = value => (Array.isArray(value) ? value : [value]).map(clean).filter(Boolean);
export { clean };
