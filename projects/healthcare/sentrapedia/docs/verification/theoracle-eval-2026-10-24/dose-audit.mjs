// Read-only audit of every dose row in the knowledge SSOT (2026-10-24). Run from the capsule root:
//   node <this file> <output json>
// Reads the SSOT, theoracle/index/chunks.jsonl and the builder's doseLines; writes only <output json>.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/") + "/";
const ssotFile = root + "theoracle/ssot/sentrapedia-knowledge-ssot.json";
const { ssot, doseLines } = await import(pathToFileURL(root + "scripts/knowledge-ssot.mjs").href);
const out = process.argv[2];
const P = ssot.penyakit;

// ---------- text helpers ----------
const DASHES = /[‐-―−]/g;
const nfc = s => String(s ?? "").normalize("NFKC").replace(/­/g, "").replace(DASHES, "-");
const ws = s => nfc(s).toLowerCase().replace(/\s+/g, " ").trim();
const key = s => nfc(s).toLowerCase().replace(/\s+/g, "");
// A hyphen at a line end dropped, as the SSOT extraction did ("200-\n400" -> "200400", "hati-\nhati" -> "hatihati").
const keyDehyph = s => nfc(s).toLowerCase().replace(/([\p{L}\d])-[ \t]*\r?\n\s*(?=[\p{L}\d])/gu, "$1").replace(/\s+/g, "");
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const decimal = s => ws(s).replace(/(\d),(\d)/g, "$1.$2");
const numbers = s => [...decimal(s).replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2").matchAll(/\d+(?:\.\d+)?/g)].map(m => m[0]);
const hasNumber = (text, n) => new RegExp(`(?<![\\d.])${esc(n)}(?![\\d]|\\.\\d)`).test(decimal(text).replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2"));
const wordRe = w => new RegExp(`(?<![\\p{L}\\d])${esc(w)}(?![\\p{L}\\d])`, "u");
const group = s => String(s).replace(/\s*\(.*$/, "").trim();
const kind = d => String(d.sumber).startsWith("rujukan silang") ? "rujukan" : String(d.catatan).startsWith("Diekstrak otomatis") ? "auto" : "manual";
const flat = s => nfc(s).replace(/\s+/g, " ").trim();
const tokensOf = s => ws(s).match(/[\p{L}\d]+(?:[.,]\d+)*/gu) ?? [];

// ---------- corpus ----------
const ssotBytes = readFileSync(ssotFile, "utf8");
const roundTrip = { identical: JSON.stringify(JSON.parse(ssotBytes), null, 1) === ssotBytes, trailingNewline: ssotBytes.endsWith("\n"), crlf: ssotBytes.includes("\r\n"), sha256: createHash("sha256").update(ssotBytes).digest("hex") };
const body = t => t.replace(/^<document_metadata>[\s\S]*?<\/document_metadata>\n\n/, "");
const chunks = readFileSync(root + "theoracle/index/chunks.jsonl", "utf8").trim().split("\n").map(l => JSON.parse(l));
const pdf = new Map();
for (const c of chunks) if (c.origin !== "ssot") (pdf.get(c.title) ?? pdf.set(c.title, { parts: [] }).get(c.title)).parts.push(body(c.text));
for (const doc of pdf.values()) { doc.text = nfc(doc.parts.join("\n")); doc.ws = ws(doc.text); doc.key = key(doc.text); doc.keyDehyph = keyDehyph(doc.text); }
const PNPK_IN_LIBRARY = {
  "053_PNPK_2019_Tata_Laksana_Penyakit_Paru_Obstruktif.pdf": "penyakit-paru-obstruktif-2019.pdf",
  "016_PNPK_2023_Tata_Laksana_Pneumonia_Pada_Dewasa.pdf": "pneumonia-dewasa-2023.pdf",
  "023_PNPK_2023_Tata_Laksana_Retinopati_Diabetika.pdf": "retinopati-diabetika-2023.pdf",
  "078_PNPK_2017_Tata_Laksana_Sepsis.pdf": "sepsis-2017.pdf",
  "041_PNPK_2021_Tata_Laksana_Sepsis_Pada_Anak.pdf": "sepsis-anak-2021.pdf",
  "030_PNPK_2022_Tata_Laksana_Rinosinusitis_Kronik.pdf": "rinosinusitis-kronik-2022.pdf",
  "013_PEDOMAN_NASIONAL_PELAYANAN_KLINIS_TATA_LAKSANA_SIROSIS_HATI_PADA_DEWASA.pdf": "sirosis-hati-dewasa-2025.pdf",
  "009_PEDOMAN_NASIONAL_PELAYANAN_KLINIS_TATA_LAKSANA_SKIZOFRENIA.pdf": "skizofrenia-2025.pdf",
  "040_PNPK_2021_Tata_Laksana_Skoliosis_Idiopatik_Remaja.pdf": "skoliosis-idiopatik-remaja-2021.pdf",
  "047_PNPK_2019_Tata_Laksana_Stroke.pdf": "stroke-2019.pdf",
  "024_PNPK_2022_Tata_Laksana_Stunting.pdf": "stunting-2022.pdf",
  "011_PEDOMAN_NASIONAL_PELAYANAN_KLINIS_TATALAKSANA_ULKUS_KORNEA_BAKTERI.pdf": "ulkus-kornea-bakteri-2025.pdf",
  "071_PNPK_2018_Tata_Laksana_Thalasemia.pdf": "thalasemia-2018.pdf",
  "066_PNPK_2018_Tata_Laksana_Tindakan_Resusitasi_Stabilitasi_dan_Tranpor_Bayi_Berat_Lahir_R.pdf": "resusitasi-bblr-2018.pdf",
  "069_PNPK_2018_Tata_Laksana_Tonsilitis.pdf": "tonsilitis-2018.pdf",
  "079_PNPK_2017_Tata_Laksana_Trauma.pdf": "trauma-2017.pdf",
  "055_PNPK_2019_Tata_Laksana_Tuberkolosis.pdf": "tuberkulosis-2019.pdf",
  "042_PNPK_2020_Tata_Laksana_Tumor_Otak.pdf": "tumor-otak-2020.pdf",
};
// For a cross-referenced row, the part after "): " names the original source.
const ownSumber = d => String(d.sumber).replace(/^rujukan silang \([^)]*\):\s*/, "");
const sourcePdf = d => {
  const s = ownSumber(d);
  if (/^PPK FKTP \(IDI2017\)/.test(s)) return "fasyankes-primer-idi-2017.pdf";
  if (/^PPK FKTP \(KMK1936\)/.test(s)) return "fktp-kmk-2022.pdf";
  if (/^PPK Perdoski 2017/.test(s)) return "dermatovenereologi-perdoski-2017.pdf";
  const m = s.match(/^PNPK \(([^)]+)\)/);
  return m ? PNPK_IN_LIBRARY[m[1]] ?? null : null;
};
const TEXT_KEY = [[/^KMK 1186\/2022/, "kmk_1186_2022"], [/^Permenkes 5\/2014/, "ppk_permenkes_5_2014"], [/^katalog SKDI/, "katalog_skdi"],
  [/^Oracle II/, "oracle_ii"], [/^dokumen index/, "index_md"], [/^Daftar KKI/, "daftar_kki"], [/^PNPK/, "pnpk_"], [/^PPK FKTP \(IDI2017\)/, "ppk_idi_2017"], [/^PPK FKTP \(KMK1936\)/, "kmk_1936_2022"]];
const textKeyOf = d => TEXT_KEY.find(([re]) => re.test(ownSumber(d)))?.[1] ?? null;
// Where the quote can be checked at all: an own text of the entry for its source, a library PDF, or neither.
// A PNPK therapy text in the SSOT is one section of the PNPK, so a PNPK quote is checkable only against a library PDF.
const checkable = (e, d) => !!sourcePdf(d) || (!!textKeyOf(d) && textKeyOf(d) !== "pnpk_" && Object.keys(e.terapi_teks ?? {}).some(k => k.startsWith(textKeyOf(d))));

// ---------- drug lexicon (heuristic) ----------
const indo = w => w.toLowerCase().replace(/ph/g, "f").replace(/th/g, "t").replace(/ae|oe/g, "e").replace(/qu/g, "kw").replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/y/g, "i").replace(/e$/, "");
const firstWord = s => (ws(s).match(/[\p{L}\d][\p{L}\d-]*/u) ?? [""])[0].replace(/^\d+-/, "");
const allRows = P.flatMap(e => e.dosis.map((d, i) => ({ e, d, i })));
const curated = new Set(allRows.filter(({ d }) => kind(d) === "manual" && !/^PNPK/.test(d.sumber)).map(({ d }) => indo(firstWord(d.obat))).filter(w => w.length >= 4));
const fornas = new Set();
for (const f of ["fornas-2023.pdf", "fornas-2025.pdf"]) for (const m of (pdf.get(f)?.ws ?? "").matchAll(/[\p{L}][\p{L}-]{3,}/gu)) fornas.add(indo(m[0]));
const df = new Map();
for (const e of P) {
  const words = new Set(ws([e.definisi, ...(Array.isArray(e.gejala) ? e.gejala : [e.gejala]), e.diagnosis, e.rujukan].join(" ")).match(/[\p{L}][\p{L}-]{2,}/gu) ?? []);
  for (const w of words) df.set(w, (df.get(w) ?? 0) + 1);
}
const DRUG_WORDS = new Set("vitamin insulin oksigen asam natrium kalium kalsium magnesium zinc zink seng ferrous sulfas besi nacl dekstrosa dextrose glukosa albumin ringer oralit heparin morfin adrenalin epinefrin norepinefrin imunoglobulin vaksin toksoid serum antitoksin antibisa parasetamol asetaminofen aspirin salbutamol kodein tramadol ketamin propofol fentanil midazolam diazepam warfarin digoksin furosemid manitol dopamin dobutamin lidokain bupivakain atropin nalokson oksitosin misoprostol metformin glibenklamid amlodipin kaptopril isoniazid rifampisin pirazinamid etambutol streptomisin artesunat artemeter kina primakuin klorokuin dihidroartemisinin albendazol mebendazol pirantel prazikuantel ivermektin permetrin griseofulvin nistatin mikonazol ketokonazol flukonazol itrakonazol terbinafin asiklovir valasiklovir oseltamivir prednison deksametason hidrokortison metilprednisolon betametason ondansetron metoklopramid domperidon omeprazol lansoprazol ranitidin antasida sukralfat loperamid laktulosa bisakodil setirizin loratadin klorfeniramin difenhidramin ambroksol teofilin aminofilin budesonid flutikason ipratropium haloperidol risperidon olanzapin klorpromazin fluoksetin sertralin amitriptilin fenitoin karbamazepin valproat fenobarbital kolkisin alopurinol metotreksat sulfasalazin hidroksiklorokuin leflunomid dapson klofazimin tetrasiklin doksisiklin eritromisin azitromisin klaritromisin amoksisilin ampisilin penisilin kloramfenikol tiamfenikol siprofloksasin levofloksasin ofloksasin moksifloksasin seftriakson sefiksim sefadroksil sefotaksim seftazidim sefazolin gentamisin amikasin vankomisin meropenem metronidazol klindamisin nitrofurantoin kotrimoksazol trimetoprim sulfametoksazol spironolakton hidroklorotiazid bisoprolol propranolol nifedipin diltiazem nitrogliserin klopidogrel enoksaparin alteplase atorvastatin simvastatin hidroksizin pseudoefedrin".split(" ").map(indo));
const PROSE = new Set("sekitar sebanyak minggu angka pasien kebutuhan penurunan peningkatan mulai indonesia dari setelah kadar kgbb prevalensi insidens insidensi sensitivitas spesifisitas spesifitas anemia usia risiko berat aliran spuit tbsa terdapat hanya studi rendah sedang namun secara rekomendasi lebih asia penggunaan penyakit tingkat normal mortalitas gangguan hingga ikatan tinggi ringan asupan adanya sedangkan luka perdarahan hampir darah pertahankan infeksi kegagalan data gagal tidak stenosis amerika ureum nilai skor perbaikan nyeri feses serat bayi kelainan lesi penelitian umur apabila komposisi loss hasil kurang kreatinin konsumsi sebagian umumnya suplementasi riskesdas perempuan hematokrit insiden tiga lansia komplikasi child post pres kelompok naikkan kematian disfungsi hasilnya area menurut walaupun persentase menjadi kolesterol sindrom keberhasilan level posisi biasanya saat sejumlah hipertensi injury berdasarkan soetomo kimia sangat analisis spontaneous kaku palembang applicability pengeluaran definisi prognosis faktor tetap tekanan gunakan disarankan laju konsentrasi sebaliknya diperkirakan diet simptomatik hemoglobin intensitas kira ruam diuresis orang diabetes ulangi sasaran derajat utara satu diagram tetapi dinaikkan beberapa paru diagnosis surabaya panas listrik kontak fornas vomitus gram bolus lapisan ambil world individual pingsan test memerlukan kejadian volum alkohol hubungkan hiperglikemia edema buah susu sayur daging sebelum islam cara riwayat examination kecepatan dilaporkan kehamilan diketahui manifestasi lifestyle akut central sebuah grup serikat bone mual sero selain martin laki flare fase efficacy risk failure pembacaan aspirasi standard standar remaja survival malnutrisi jantung unilateral negara depresi false essential luaran parah hitung bulan tanpa ensefalopati oleh suplemen total agresif pengurangan gejala ekskresi kehilangan turunkan harga proteinuria kanulasi uremia meskipun efektifitas kultur penyebab medan stroke menengah estimasi membungkus resuscitation modulasi kotoran thailand malaysia filipina jawa bangka seattle jepang korea taiwan bali yogyakarta manado malang bandung belanda eropa afrika turki finlandia ekuador nairobi islandia jakarta frekuensi tidal sensasi mengantuk perubahan mengejan buang konservatif jarum hipoksemia infant requires menggunakan kriteria lanjutkan kontinu menyesuaikan ruptur lokal kebocoran ventilasi kapasitas spasme sustained suntikkan persiapan perkiraan pompa terendah keterangan gambar batu skala gawat arousal perokok corakan variabilitas hentikan case randomized comparative berkaitan kalau teruskan usahakan besar perbedaan dehidrasi kurus gemuk toleransi malformasi tercatat pusat alat ekuivalen misalnya sesuai serius mengancam vial south disease kemudian kronik harapan apakah indirek receptor waspada blokade telaah organization naik januari bengkak mayoritas mingguan continuous batang batuk nodul pembuluh partial jelas code fiksasi berbagai combined mungkin definitely perlu paling objective vision long hipotiroidisme koagulopati pneumonia henti difference mean predicted terdiri high slow rapid late intermediate study fluid keadaan laboratorium water rasio supportive khusus sedikit para direkomendasikan tulang probabilitas helmi interpretasi kesembuhan didapatkan ditemukan relative pria adalah indikasinya massa reference batasi patensi indikasi persen akses batas down triple antara mukosa severe cold coma jenis passive pulse syok dialami moderat keberadaan penambahan positive tips left resolusi rekurensi gradient metabolit substrat extended jangan sekolah obstruksi fresh inhibisi emboli retensi baca kepatuhan terjadi biaya batasan pemakaian carilah acute spesialis klem tumbuhnya biakan steroid insert energi keluhan normalisasi klasik tumor kalsifikasi ekstensi tinjau kemungkinan".split(" "));
// Lab values, scores and genes: the whole first word, optionally with digits ("HbA1c", "SpO2", "IKZF1").
const LAB_OR_STAT = /^(?:hba1c|hba|hb|spo|sao|scvo|fio|pao|paco|ldl|hdl|tsh|ft|e?egfr|lfg|crp|esr|led|cd|inr|aptt|gcs|ph|bmi|imt|vas|nyha|mmhg|map|cvp|lvef|ef|ikzf|notch|abcb|ttgo|gdpp|gdp|gds|dlco|crcl|mchc|ct|grade)\d*c?$/;
PROSE.delete("steroid");
const prose = w => PROSE.has(w) || ((df.get(w) ?? 0) >= 8);
const SUFFIX = /(?:sin|misin|oksasin|siklin|azol|olol|pril|sartan|statin|prazol|dipin|silin|vir|tidin|zepam|oksetin|amid|mab|nib|parin|lukast|tropin|kain|metason|solon|fenak|profen|nidazol|mektin|zin|kortison|platin|taksel|rubisin|tekan|tabin|grel|gliptin|glitazon|flozin|dronat|teplase|kinase|toin|barbital|triptilin|peridol|azepin|apin|idon|kuin|fen|mesin|faksin|feniramin|tadin|setron|pramid|sulfat|klorida|asetat|fosfat|karbonat|glukonat|fumarat|folinat|maleat|tartrat|sitrat|laktat|bikarbonat|kalsitriol|feron|poietin|plase)$/;
const SALT_OR_CLASS = new Set("sodium natrium hcl hidroklorida dihidroklorida klorida maleat sulfat sulfas fosfat asetat nitrat dinitrat trinitrat mononitrat mesilat antibiotik antibiotika analgetik analgesik antihistamin kortikosteroid steroid nsaid oains opioid antipiretik antijamur antifungal antivirus antiviral diuretik suplemen imunosupresan antikoagulan antiemetik antasid antispasmodik antispasmodic antipsikotik antidepresan bronkodilator mukolitik dekongestan laksatif kemoterapi sitoprotektor antitusif".split(" ").map(indo));
const lev = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
};
const KNOWN = [...new Set([...DRUG_WORDS, ...curated])].filter(w => w.length >= 7);
const nearCache = new Map();
const nearDrug = w => nearCache.get(w) ?? nearCache.set(w, KNOWN.some(k => lev(w, k) <= 2)).get(w);
// obat -> "obat" (drug list, curated rows or a drug-name ending) | "obat_lemah" (only in the FORNAS text) | "kelas" | "bukan_obat" | "tidak_pasti"
const drugClass = obat => {
  const w = firstWord(obat);
  if (!w) return "bukan_obat";
  if (LAB_OR_STAT.test(w)) return "bukan_obat";
  const iw = indo(w);
  if (SALT_OR_CLASS.has(iw)) return "kelas";
  if (DRUG_WORDS.has(iw) || curated.has(iw)) return "obat";
  if (prose(w)) return "bukan_obat";
  if (iw.length >= 7 && nearDrug(iw)) return "obat"; // a misspelt drug name ("amoxillin", "amiksisilin")
  if (SUFFIX.test(iw) && w.length >= 5) return "obat";
  if (fornas.has(iw) && w.length >= 4) return "obat_lemah";
  return "tidak_pasti";
};
const named = cls => cls === "obat" || cls === "obat_lemah" || cls === "kelas";
// Words that start or end a two-word drug name: their single-word expansion is not safe to apply mechanically.
const MULTI = /^(?:sulf\w*|ferro\w*|ferrous|selenium|natrium|sodium|kalium|kalsium|calcium|magnesium|asam|acid|zinc|zink|seng|vitamin|trimet\w*|kotrimoksazol|cotrimoxazole|amoxicillin\w*|amoksisilin\w*|piperasilin|piperacillin|tazobaktam|sulbaktam|klavulanat|clavulanat\w*|hyoscine|hiosin|butylbromid\w*|butilbromid\w*|aseponat|valerat|furoat|propionat|dipropionat|asetonid|hidroklorida|dihidroklorida|klorida|hcl|maleat|mesilat|\w*nitrat|isosorbid\w*|gliseril|levotiroksin|pseudo\w*|metil\w*|imm?unoglobulin|serum|antitoksin|vaksin|toksoid)$/i;
// A word glued to the drug name in the PDF text ("atauCiprofloxacin", "mgRopivakain").
const GLUE = /^(?:atau|dan|dengan|yaitu|seperti|mg|ml|g)(?=\p{Lu})/u;
const rawFlat = s => String(s ?? "").replace(/\s+/g, " ").trim();
// A regex for a field value inside the raw quote: spaces are any whitespace, dashes any dash, case ignored.
const valueRe = v => rawFlat(v).split(" ").map(p => esc(p).replace(/[-‐-―−]/g, "[-\\u2010-\\u2015\\u2212]")).join("\\s*");

// ---------- quote location ----------
const ownText = e => Object.entries(e.terapi_teks ?? {});
const otherTexts = P.map(e => [e.id, key(Object.values(e.terapi_teks ?? {}).join("\n")), keyDehyph(Object.values(e.terapi_teks ?? {}).join("\n"))]);
const HEADER = new Set(["kementerian", "kesehatan", "republik", "indonesia", "jdih", "kemkes", "go", "id"]);
// Bag of tokens in a window around the rarest token: table cells read in another order, running headers or page numbers in between.
function bagMatch(text, quote, dosis) {
  const docTokens = text._tokens ?? (text._tokens = tokensOf(text.s));
  const need = tokensOf(quote).filter(t => !HEADER.has(t) && !/^\d+\.$/.test(t));
  if (need.length < 3) return null;
  const counts = text._counts ?? (text._counts = docTokens.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map()));
  const anchor = [...new Set(need)].filter(t => counts.has(t)).sort((a, b) => counts.get(a) - counts.get(b))[0];
  if (!anchor) return null;
  const doseNums = new Set(numbers(dosis));
  const span = need.length * 2 + 12;
  let best = null;
  for (let p = docTokens.indexOf(anchor); p >= 0 && p < docTokens.length; p = docTokens.indexOf(anchor, p + 1)) {
    const win = docTokens.slice(Math.max(0, p - span), p + span);
    const bag = win.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map());
    const missing = [];
    for (const t of need) { const n = bag.get(t) ?? 0; if (n) bag.set(t, n - 1); else missing.push(t); }
    if (!best || missing.length < best.missing.length) {
      let j = 0; for (const t of win) if (j < need.length && t === need[j]) j++;
      best = { missing, inOrder: j === need.length, at: p };
    }
    if (!best.missing.length && best.inOrder) break;
  }
  if (!best) return null;
  const doseMissing = best.missing.some(t => doseNums.has(t.replace(",", ".")));
  return best.missing.length <= Math.max(1, Math.floor(need.length * 0.1)) && !doseMissing ? { inOrder: best.inOrder, missing: best.missing } : null;
}
const textObj = s => ({ s });
const textCache = new Map();
const cached = (id, s) => textCache.get(id) ?? textCache.set(id, textObj(s)).get(id);

function locate(e, d) {
  const q = d.kutipan, k = key(q), wq = ws(q);
  if (!k) return { where: "kosong" };
  const tk = textKeyOf(d);
  const own = ownText(e);
  const srcTexts = own.filter(([name]) => tk && name.startsWith(tk));
  const otherOwn = own.filter(([name]) => !(tk && name.startsWith(tk)));
  const pref = sourcePdf(d);
  const candidates = [
    ...srcTexts.map(([name, t]) => ({ where: "teks_sendiri", key: name, t: nfc(t), source: true })),
    ...(pref ? [{ where: "pdf", file: pref, t: pdf.get(pref).text, doc: pdf.get(pref), source: true }] : []),
    ...otherOwn.map(([name, t]) => ({ where: "teks_sendiri", key: name, t: nfc(t), source: false })),
    ...[...pdf.keys()].filter(f => f !== pref).map(f => ({ where: "pdf", file: f, t: pdf.get(f).text, doc: pdf.get(f), source: false })),
  ];
  for (const c of candidates) {
    const cw = c.doc?.ws ?? ws(c.t), ck = c.doc?.key ?? key(c.t);
    if (cw.includes(wq)) return { ...strip(c), match: "persis" };
    if (ck.includes(k)) return { ...strip(c), match: "spasi" };
  }
  for (const c of candidates) {
    const ckd = c.doc?.keyDehyph ?? keyDehyph(c.t);
    if (ckd.includes(k)) return { ...strip(c), match: "tanda_hubung" };
  }
  const other = otherTexts.find(([id, t, td]) => id !== e.id && (t.includes(k) || td.includes(k)));
  if (other) return { where: "teks_entri_lain", id: other[0], match: other[1].includes(k) ? "spasi" : "tanda_hubung", source: false };
  // Tables and running headers: only the row's own source, to stay tractable.
  for (const c of candidates.filter(c => c.source)) {
    const b = bagMatch(cached(c.file ?? `${e.id}|${c.key}`, c.t), q, d.dosis);
    if (b) return { ...strip(c), match: b.inOrder ? "urutan_dengan_sisipan" : "tabel_acak", missing: b.missing };
  }
  return { where: "tidak_ditemukan" };
}
const strip = ({ t, doc, ...rest }) => rest;
const textOf = (e, loc) => loc.where === "teks_sendiri" ? nfc(e.terapi_teks[loc.key]) : loc.where === "pdf" ? pdf.get(loc.file).text : loc.where === "teks_entri_lain" ? nfc(Object.values(P.find(x => x.id === loc.id).terapi_teks).join("\n")) : null;
// The original source span of a quote (whitespace and line-end hyphens allowed between characters).
function sourceSpan(text, quote) {
  const chars = [...key(quote)].slice(0, 500);
  const pattern = chars.map((c, i) => esc(c) + (i < chars.length - 1 ? (/[\p{L}\d]/u.test(c) && /[\p{L}\d]/u.test(chars[i + 1]) ? "(?:-[ \\t]*\\r?\\n)?\\s*" : "\\s*") : "")).join("");
  const m = text.match(new RegExp(pattern, "iu"));
  return m ? { at: m.index, original: m[0] } : null;
}

// ---------- checks ----------
const rows = [];
const proposals = [];
const flag = (row, code, detail = {}) => (row.flags ??= []).push({ code, ...detail });
const propose = (row, field, oldV, newV, cls, rule, evidence) => proposals.push({ id: row.id, nama: row.nama, i: row.i, field, old: oldV, new: newV, class: cls, rule, rendered: row.rendered, kind: row.kind, sumber: row.sumber, evidence });
const evidenceOf = row => ({ where: row.loc.where, file: row.loc.file, key: row.loc.key, id: row.loc.id, match: row.loc.match, kutipan: row.kutipan });

for (const { e, d, i } of allRows) {
  const row = { id: e.id, nama: e.nama, i, kind: kind(d), sumber: d.sumber, halaman: d.halaman, rendered: doseLines({ dosis: [d] }).length === 1,
    obat: d.obat, dosis: d.dosis, frekuensi: d.frekuensi, durasi: d.durasi, rute: d.rute, populasi: d.populasi, konteks: d.konteks, kutipan: d.kutipan, catatan: d.catatan };
  const ob = ws(d.obat), q = ws(d.kutipan);
  row.loc = locate(e, d);
  row.obatKelas = drugClass(d.obat);
  const raw = rawFlat(d.kutipan);
  const drug = named(row.obatKelas);

  // a. drug name
  if (!ob) flag(row, "a_obat_kosong");
  else if (!wordRe(ob).test(q)) {
    const m = raw.match(new RegExp(`([\\p{L}\\d]*(?:[/-][\\p{L}\\d]+)*[/-]?)(${valueRe(d.obat)})((?:[\\p{L}\\d]|[/-](?=[\\p{L}\\d]))*)`, "iu"));
    if (m) {
      const whole = m[0].replace(GLUE, "");
      const pre = whole.slice(0, Math.max(0, whole.length - m[2].length - m[3].length)), post = m[3];
      if (!pre && post.length <= 2 && !/\d/.test(post)) row.ejaan = whole; // "ranitidin" in "ranitidine", "mgRopivakain": same drug
      else {
        const cls = drugClass(whole);
        const multi = MULTI.test(firstWord(ob)) || MULTI.test(whole.replace(/[\d/-].*$/, "")) || /[/-]/.test(whole);
        row.kata_utuh = whole;
        if (cls === "obat" && !multi) { flag(row, "a_obat_potongan", { kata_utuh: whole }); propose(row, "obat", d.obat, whole, "mekanis", "a_obat_potongan", evidenceOf(row)); }
        else if (!pre && /^\d+$/.test(post) && /^vit(?:amin)?$/.test(firstWord(ob))) { flag(row, "a_obat_potongan", { kata_utuh: whole }); propose(row, "obat", d.obat, whole, "mekanis", "a_obat_potongan_angka", evidenceOf(row)); }
        else if (cls === "bukan_obat") flag(row, "a_obat_potongan_bukan_obat", { kata_utuh: whole });
        else flag(row, "a_obat_potongan_baca_manual", { kata_utuh: whole, kelas: cls });
      }
    } else if (row.kind === "manual" && /^merek /i.test(q)) row.isoMerek = true;
    else {
      const src = row.loc.match && row.loc.match !== "tabel_acak" ? textOf(e, row.loc) : null;
      const span = src ? sourceSpan(src, d.kutipan) : null;
      const before = span ? ws(src.slice(Math.max(0, span.at - 400), span.at)) : "";
      flag(row, before && wordRe(ob).test(before) ? "a_obat_di_konteks_sebelum_kutipan" : "a_obat_tidak_di_kutipan");
    }
  }
  // Drug names in the quote: only the strong ones count, so FORNAS prose ("perfusi") does not hide a non-drug row.
  row.obatDiKutipan = [...new Set(tokensOf(d.kutipan).filter(t => /\p{L}{4,}/u.test(t) && ["obat", "kelas"].includes(drugClass(t))))];
  if (ob && row.obatKelas === "bukan_obat" && !row.flags?.some(f => f.code.startsWith("a_obat_potongan"))) flag(row, row.obatDiKutipan.length ? "a_bukan_obat_kutipan_ada_obat" : "a_bukan_obat");
  if (ob && row.obatKelas === "kelas" && ob.split(/\s+/).length === 1) flag(row, "a_obat_garam_atau_kelas");

  // b. dose numbers
  const nums = numbers(d.dosis);
  // A number with a space as thousands separator cut at the space ("200 000–300 000 U" read as "000 U").
  if (/^0{3}(?!\d)/.test(rawFlat(d.dosis))) {
    const m = raw.match(new RegExp(`\\d{1,3}(?: \\d{3})+(?:\\s*[-\\u2013]\\s*\\d{1,3}(?: \\d{3})+)?\\s*${valueRe(rawFlat(d.dosis).replace(/^0{3}\s*/, ""))}(?:\\s*(?:\\/|per)\\s*(?:kg\\s*bb|kgbb|kg)(?:\\s*\\/\\s*\\p{L}+)*)?`, "iu"));
    flag(row, "b_angka_ribuan_terpotong");
    if (m) propose(row, "dosis", d.dosis, m[0], "mekanis", "b_angka_ribuan_terpotong", evidenceOf(row));
  }
  const missing = nums.filter(n => !hasNumber(d.kutipan, n));
  if (missing.length) flag(row, "b_angka_tidak_di_kutipan", { angka: missing });
  // Lost dash proven by the source: the quote matched only with line-end hyphens dropped between digits.
  if (row.loc.match === "tanda_hubung") {
    const src = textOf(e, row.loc), span = src && sourceSpan(src, d.kutipan);
    const joins = span ? [...span.original.matchAll(/([\d.,]*\d)-[ \t]*\r?\n\s*(\d[\d.,]*\d|\d)/g)].map(m => ({ merged: m[1] + m[2], fixed: `${m[1]}-${m[2]}` })) : [];
    const letterJoins = span ? [...span.original.matchAll(/(\p{L}+)-[ \t]*\r?\n\s*(\p{L}+)/gu)].map(m => `${m[1]}-${m[2]}`) : [];
    row.joins = { digits: joins, letters: letterJoins, span: span && flat(span.original).slice(0, 300) };
    let quote = String(d.kutipan), dose = String(d.dosis);
    for (const j of joins) {
      if (!quote.includes(j.merged)) continue;
      const inDose = dose.includes(j.merged);
      flag(row, inDose ? "b_tanda_hubung_hilang_dosis" : "b_tanda_hubung_hilang_kutipan", j);
      quote = quote.replace(j.merged, j.fixed);
      if (inDose) dose = dose.replace(j.merged, j.fixed);
    }
    const ev = { ...evidenceOf(row), sumber_asli: row.joins.span };
    if (dose !== d.dosis) propose(row, "dosis", d.dosis, dose, "mekanis", "b_tanda_hubung_hilang", ev);
    if (quote !== d.kutipan) propose(row, "kutipan", d.kutipan, quote, "mekanis", "b_tanda_hubung_hilang", ev);
    if (!joins.length && letterJoins.length) flag(row, "c_kutipan_tanda_hubung_kata", { kata: letterJoins });
  }
  // Joined numbers without a source to prove it: a number read as two ("2050 mg/kg"), checked against sister rows.
  for (const n of numbers(d.dosis).filter(n => /^\d{4,}$/.test(n))) {
    if (row.flags?.some(f => f.code === "b_tanda_hubung_hilang_dosis")) break;
    for (let s = 1; s < n.length; s++) {
      const a = n.slice(0, s), b = n.slice(s);
      if (b.startsWith("0") || Number(b) <= Number(a) || Number(b) > Number(a) * 10) continue;
      const re = new RegExp(`(?<![\\d.,])${a}\\s*-\\s*${b}(?![\\d])`);
      const sister = e.dosis.find(x => x !== d && indo(firstWord(x.obat)).slice(0, 6) === indo(firstWord(d.obat)).slice(0, 6) && (re.test(decimal(x.dosis)) || re.test(decimal(x.kutipan))));
      if (sister) { flag(row, "b_angka_tergabung_bukti_baris_lain", { angka: n, kemungkinan: `${a}-${b}`, baris_lain: `${sister.sumber}: ${flat(sister.dosis).slice(0, 160)}` }); break; }
      if (new RegExp(`(?<![\\d.,])${n}\\s*(?:mg|mcg|µg|iu|unit|g\\b|ml|%)`, "i").test(nfc(d.dosis))) { flag(row, "b_angka_tergabung_curiga", { angka: n, kemungkinan: `${a}-${b}` }); break; }
    }
  }
  // Per-kg dose stored as an absolute dose ("0,5mL/kg" kept as "0,5mL"); the dose must not sit inside a longer number.
  const doseAt = nums.length ? new RegExp(`(?<![\\d.,])${valueRe(d.dosis)}`, "i") : null;
  if (doseAt && !/kg|m2|m²/i.test(d.dosis) && !/^0{3}(?!\d)/.test(rawFlat(d.dosis))) {
    const m = raw.match(new RegExp(`${doseAt.source}(\\s*(?:\\/|per)\\s*(?:kg\\s*bb|kgbb|kg)(?:\\s*ideal)?(?:\\s*\\/\\s*\\p{L}+)*)`, "iu"));
    if (m) {
      flag(row, "b_per_kg_hilang", { akhiran: m[1] });
      if (drug) propose(row, "dosis", d.dosis, m[0], row.obatKelas === "obat" ? "mekanis" : "baca_manual", "b_per_kg_hilang", evidenceOf(row));
    }
  }
  // A maximum quoted as the dose.
  if (doseAt && !/maks|max|maksimal|maksimum|tidak melebihi/i.test([d.dosis, d.konteks, d.populasi, d.frekuensi].join(" "))) {
    const m = raw.match(new RegExp(`(?:maks(?:imal|imum)?\\.?|max(?:imum|imal)?\\.?|dosis maksimum|dosis maksimal|tidak (?:boleh )?(?:lebih dari|melebihi))\\s*:?\\s*\\(?\\s*${doseAt.source}`, "iu"));
    const first = raw.search(doseAt);
    // Only when the dose's first mention is the maximum ("flukonazol 800 mg/hari ... dosis maksimal 800 mg/hari" is a dose).
    if (m && first >= m.index && first < m.index + m[0].length) {
      flag(row, "b_dosis_maksimum_sebagai_dosis");
      const sisters = e.dosis.filter(x => x !== d && key(x.kutipan) === key(d.kutipan) && indo(firstWord(x.obat)) === indo(firstWord(d.obat)));
      if (drug) propose(row, "dosis", d.dosis, m[0].replace(/^\(\s*/, ""), sisters.length && row.obatKelas === "obat" ? "mekanis" : "baca_manual", "b_dosis_maksimum_sebagai_dosis", { ...evidenceOf(row), baris_dosis_lain: sisters.map(x => x.dosis) });
    }
  }
  // Frequency and duration: a range cut to its upper end, or "3 kali" without "seminggu". The occurrence nearest after the dose counts.
  const doseEnd = doseAt ? (raw.match(doseAt)?.index ?? -1) : -1;
  for (const f of ["frekuensi", "durasi"]) {
    const v = rawFlat(d[f]);
    if (!v) continue;
    const all = [...raw.matchAll(new RegExp(`(?<![\\p{L}\\d])${valueRe(v)}(?![\\p{L}])`, "giu"))];
    if (!all.length) { if (!key(d.kutipan).includes(key(v))) flag(row, `f_${f}_tidak_di_kutipan`); continue; }
    if (!drug) continue;
    const hit = all.find(m => m.index >= doseEnd) ?? all[all.length - 1];
    const before = raw.slice(0, hit.index), after = raw.slice(hit.index + hit[0].length);
    const range = before.match(/(\d+(?:[.,]\d+)?\s*[-‐-―−]\s*)$/);
    const unit = /(?:kali|x)$/i.test(v) && after.match(/^(\s*(?:seminggu|sehari|sebulan|per hari|per minggu|\/\s*hari|\/\s*minggu|perhari))/i);
    if (range && !/^\d+(?:[.,]\d+)?\s*[-‐-―−]/.test(v)) { flag(row, `f_${f}_rentang_terpotong`); propose(row, f, d[f], range[1] + hit[0] + (unit ? unit[1] : ""), row.obatKelas === "obat" ? "mekanis" : "baca_manual", `f_${f}_rentang_terpotong`, evidenceOf(row)); }
    else if (unit) { flag(row, `f_${f}_satuan_terpotong`); propose(row, f, d[f], hit[0] + unit[1], row.obatKelas === "obat" ? "mekanis" : "baca_manual", `f_${f}_satuan_terpotong`, evidenceOf(row)); }
  }

  // c. where the quote is
  if (row.loc.where === "tidak_ditemukan") flag(row, checkable(e, d) ? "c_kutipan_tidak_ditemukan" : "c_sumber_tidak_di_pustaka");
  else if (["urutan_dengan_sisipan", "tabel_acak"].includes(row.loc.match)) flag(row, "c_kutipan_tidak_persis", { match: row.loc.match });
  if (row.loc.match && !row.loc.source && row.kind !== "rujukan" && checkable(e, d)) flag(row, "d_kutipan_hanya_di_sumber_lain", { lokasi: row.loc.file ?? row.loc.key ?? row.loc.id });

  // d. source and page
  if (row.kind === "rujukan" && !String(d.catatan).trim()) flag(row, "d_rujukan_silang_tanpa_catatan");
  const jenis = /^KMK 1186\/2022/.test(d.sumber) ? "KMK 1186/2022 PPK" : /^Permenkes 5\/2014/.test(d.sumber) ? "Permenkes 5/2014 PPK" : null;
  if (jenis) {
    const doc = e.dokumen.find(x => x.jenis === jenis), h = Number(d.halaman);
    if (doc && Number.isFinite(h) && doc.halaman != null && (h < doc.halaman || h > (doc.halaman_akhir ?? doc.halaman))) flag(row, "d_halaman_di_luar_bab", { halaman: h, bab: `${doc.halaman}-${doc.halaman_akhir ?? doc.halaman}` });
  }
  rows.push(row);
}

// e. duplicates within an entry
const FIELDS = ["obat", "dosis", "frekuensi", "durasi", "rute", "populasi", "konteks", "sumber", "halaman", "kutipan", "catatan"];
for (const e of P) {
  const seen = new Map();
  for (const row of rows.filter(r => r.id === e.id)) {
    const k = JSON.stringify(FIELDS.map(f => String(e.dosis[row.i][f] ?? "")));
    if (seen.has(k)) { flag(row, "e_duplikat_persis", { sama_dengan_baris: seen.get(k) }); propose(row, "(baris)", e.dosis[row.i], null, "mekanis", "e_duplikat_persis", { sama_dengan_baris: seen.get(k) }); }
    else seen.set(k, row.i);
  }
}

// Non-drug auto rows. Delete candidate: the quote names no drug or drug class and reads as a statistic, a lab value or a
// target (the dose is a percentage, or the quote has no dosing word). Otherwise a real dose whose drug is outside the quote:
// read by hand.
const DOSING = /(?:berikan|diberikan|pemberian|dosis|mulai|dimulai|turunkan|naikkan|dinaikkan|ditingkatkan|tingkatkan|titrasi|injeksi|infus|oral|tablet|\btab\b|kapsul|sehari|\/\s*hari|per hari|\d\s*x\s*\d|\bi\.?\s?m\.?(?![\p{L}])|\bi\.?\s?v\.?(?![\p{L}])|intravena|intramuskular|subkutan|bolus|drip|regimen|rejimen)/iu;
const STAT_WORD = /^(?:prevalensi\w*|insiden\w*|sensitiv\w*|spesifi\w*|angka|mortalitas\w*|morbiditas|studi|penelitian|data|survei|riskesdas|sekitar|sebanyak|lebih|kurang|kadar|nilai|normal|target|skor|hasil\w*|jumlah|total|rerata|persentase|efektivitas|kejadian\w*|risiko|risk|spuit|jarum|ukuran|kateter|volume|kapasitas)$/i;
const LABISH = new Set("glukosa albumin cairan oksigen besi tablet alkohol nitrogen kalium natrium kalsium hemoglobin kreatinin protein lemak karbohidrat serat energi air endotoksin glaukoma".split(" ").map(indo));
const LAB_UNIT_AFTER =/^\s*(?:\/\s*(?:dl|l\b|ml\b|mnt|menit|min\b|24\s*jam|mm3|µl|ul)|\s*dl\b)/i;
for (const row of rows) {
  if (row.kind !== "auto") continue;
  if (!row.flags?.some(f => ["a_bukan_obat", "a_bukan_obat_kutipan_ada_obat", "a_obat_potongan_bukan_obat"].includes(f.code))) continue;
  const d = P.find(e => e.id === row.id).dosis[row.i];
  const raw = rawFlat(d.kutipan);
  const percentOnly = /^[\s\d.,<>≤≥~–-]*%[\s\d.,%–-]*$/.test(nfc(d.dosis)) || /^\d+(?:[.,]\d+)?\s*(?:sampai|hingga|-)\s*\d+(?:[.,]\d+)?\s*%$/.test(ws(d.dosis));
  const at = raw.search(new RegExp(`(?<![\\d.,])${valueRe(d.dosis)}`, "i"));
  const labUnit = /\/\s*(?:dl|l)\b/i.test(d.dosis) || (at >= 0 && LAB_UNIT_AFTER.test(raw.slice(at + rawFlat(d.dosis).length)));
  const clearlyNot = percentOnly || labUnit || STAT_WORD.test(firstWord(d.obat)) || LAB_OR_STAT.test(firstWord(d.obat));
  // One drug named in the quote, before the dose: that is the row's drug ("buli" in "Salbutamol nebulisasi 2.5-5 mg").
  // Only listed drug names (no spelling guess), never a lab or nutrition word, and only for a dose with a dosing unit.
  const strong = row.obatDiKutipan.filter(t => { const it = indo(t); return drugClass(t) === "obat" && !LABISH.has(it) && !prose(t) && !["larutan", "fiksed", "fixed"].includes(it) && (DRUG_WORDS.has(it) || curated.has(it) || (SUFFIX.test(it) && t.length >= 5)); });
  // ...and a single-word name: not the first half of a combination ("artemether-lumefantrine", "Amoksilin klavulanat").
  const name = strong.length === 1 ? raw.match(new RegExp(`(?<![\\p{L}\\d])${esc(strong[0])}(?![\\p{L}\\d])(?!\\s*[-/]\\s*\\p{L})(?!\\s+(?:klavulanat\\w*|clavulan\\w*|asetat|pamoat|sulfat|fosfat|natrium|sodium|hcl|hidroklorida|maleat|mesilat|lumefantrin\\w*|piperakuin|tazobaktam|sulbaktam|b\\b))`, "iu")) : null;
  const doseUnit = /\d\s*(?:mg|mcg|µg|μg|g|gram|gr|iu|unit|u|ml|tab|tablet|kapsul)\b/i.test(d.dosis) && !percentOnly && !labUnit;
  if (!row.obatDiKutipan.length && clearlyNot && !DOSING.test(raw)) propose(row, "(baris)", d, null, "hapus", "bukan_obat", { kutipan: row.kutipan });
  else if (name && doseUnit && at >= 0 && name.index < at && !MULTI.test(strong[0])) {
    // A threshold ("asetaminofen >3 g/hari") or a study report is not a regimen: read by hand.
    const threshold = /[<>≥≤]\s*$/.test(raw.slice(0, at)) || /\b(?:studi|penelitian|melaporkan|dilaporkan)\b/i.test(raw);
    flag(row, "a_obat_dari_kutipan", { obat: name[0] });
    propose(row, "obat", d.obat, name[0], threshold ? "baca_manual" : "mekanis", "a_obat_dari_kutipan", evidenceOf(row));
  }
  else flag(row, "a_bukan_obat_baca_manual", { obat_di_kutipan: row.obatDiKutipan });
}

// d (regimen). Same drug and population, two sources whose strengths never meet, inside one entry.
const stem = s => indo(firstWord(s)).replace(/(?:a|um|in)$/, "");
const strengths = d => {
  const out = new Set();
  for (const m of decimal(d.dosis).matchAll(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(mg|mcg|µg|μg|ug|g|gram|iu|unit|ml)\b(\s*\/\s*kg)?/gi)) {
    const u = m[3].toLowerCase(), f = { mg: 1, mcg: 1e-3, "µg": 1e-3, "μg": 1e-3, ug: 1e-3, g: 1e3, gram: 1e3, iu: 1, unit: 1, ml: 1 }[u];
    const tag = (["iu", "unit"].includes(u) ? "u" : u === "ml" ? "ml" : "mg") + (m[4] ? "/kg" : "");
    for (const v of [m[1], m[2]].filter(Boolean)) out.add(`${+(Number(v) * f).toPrecision(6)}|${tag}`);
  }
  return out;
};
const conflicts = [];
for (const e of P) {
  const groups = new Map();
  for (const row of rows.filter(r => r.id === e.id && r.rendered && r.kind !== "rujukan" && ["obat", "obat_lemah"].includes(r.obatKelas))) {
    const d = e.dosis[row.i], s = strengths(d);
    if (!s.size) continue;
    const pop = /anak|pediatri|bayi|neonat/i.test(`${d.populasi} ${d.konteks} ${d.kutipan}`) ? "anak" : "dewasa/umum";
    const k = `${stem(d.obat)}|${pop}`;
    const bySrc = groups.get(k) ?? groups.set(k, new Map()).get(k);
    const src = group(d.sumber);
    (bySrc.get(src) ?? bySrc.set(src, []).get(src)).push({ i: row.i, s, d });
  }
  for (const [k, bySrc] of groups) {
    const srcs = [...bySrc.entries()].map(([src, rs]) => [src, new Set(rs.flatMap(r => [...r.s])), rs]);
    for (let x = 0; x < srcs.length; x++) for (let y = x + 1; y < srcs.length; y++) {
      const [sa, A, ra] = srcs[x], [sb, B, rb] = srcs[y];
      const units = S => new Set([...S].map(v => v.split("|")[1]));
      if (![...units(A)].some(u => units(B).has(u)) || [...A].some(v => B.has(v))) continue;
      const fmt = r => `${r.d.obat} ${r.d.dosis}${r.d.frekuensi ? " " + r.d.frekuensi : ""} (#${r.i})`;
      conflicts.push({ id: e.id, nama: e.nama, obat: k, sumber_a: sa, dosis_a: ra.map(fmt), sumber_b: sb, dosis_b: rb.map(fmt) });
    }
  }
}

// 5. Entries with a therapy text that names a strength but no rendered dose line.
const STRENGTH = String.raw`\d+(?:[.,]\d+)?\s*(?:-\s*\d+(?:[.,]\d+)?\s*)?(?:mg|mcg|µg|μg|gram|g|iu|unit|ml|meq)\b`;
const noDose = [];
for (const e of P) {
  if (doseLines(e).length || !Object.keys(e.terapi_teks ?? {}).length) continue;
  const hits = ownText(e).flatMap(([k, t]) => [...nfc(t).matchAll(new RegExp(STRENGTH, "gi"))].map(m => ({ teks: k, kekuatan: m[0], kalimat: flat(nfc(t).slice(Math.max(0, m.index - 140), m.index + m[0].length + 80)) })));
  noDose.push({ id: e.id, nama: e.nama, n_baris_ssot: e.dosis.length, teks: Object.keys(e.terapi_teks), dosis_di_teks: hits });
}

// Read by hand: a quote whose spelling is not the drug's name.
for (const p of proposals) if (p.field === "obat" && /^kiprofloksasin$/i.test(p.new)) { p.new = "siprofloksasin"; p.catatan_audit = 'kutipan menulis "kiprofloksasin" (salah eja di teks katalog)'; }

// ---------- summary ----------
const flagged = rows.filter(r => r.flags?.length);
const count = (list, f) => list.reduce((m, r) => (m[f(r)] = (m[f(r)] ?? 0) + 1, m), {});
const byCode = {};
for (const r of flagged) for (const f of r.flags) {
  const c = byCode[f.code] ??= { rows: 0, rendered: 0, byKind: {} };
  c.rows++; if (r.rendered) c.rendered++;
  c.byKind[r.kind] = (c.byKind[r.kind] ?? 0) + 1;
}
const linesNow = P.reduce((n, e) => n + doseLines(e).length, 0);
const summary = {
  ssot: { ...roundTrip, entries: P.length, rows: rows.length, rendered: rows.filter(r => r.rendered).length, doseLines: linesNow, diseasesWithLine: P.filter(e => doseLines(e).length).length, n_pernyataan_dosis: P.reduce((n, e) => n + (e.status?.n_pernyataan_dosis ?? 0), 0) },
  rowsByKind: count(rows, r => r.kind),
  location: count(rows, r => `${r.loc.where}${r.loc.match ? "/" + r.loc.match : ""}`),
  obatKelas: count(rows, r => r.obatKelas),
  benign: { ejaan: rows.filter(r => r.ejaan).length, isoMerek: rows.filter(r => r.isoMerek).length },
  flaggedRows: flagged.length, flaggedRendered: flagged.filter(r => r.rendered).length, byCode,
  proposals: count(proposals, p => `${p.class}|${p.rule}`), conflicts: conflicts.length, noDoseEntries: noDose.length,
};
writeFileSync(out, JSON.stringify({ generated: "2026-10-24", summary, proposals, conflicts, noDose, flagged }, null, 1));
console.log(JSON.stringify(summary, null, 1));
