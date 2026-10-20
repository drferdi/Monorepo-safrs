// Normal physical-exam templates (docs/specs/2026-10-21-normal-exam-templates.md; Gaffer, 2026-10-21): the doctor writes
// abnormal findings only, and every other routine status-generalis line is filled from the template for the patient's
// group. Deterministic: a measurement is never generated, and no diagnosis, code or treatment is ever written.
import type { CaseFields } from "./aadi/composer";
import type { ReviewStatus } from "./workspace";
import { structureNote } from "./note-structure";

export const autoNormalMarker = "[otomatis normal]";
export type ExamGroup = "adult" | "child" | "infant" | "pregnant" | "postpartum";
type Policy = "normal" | "measure" | "notExamined";
// A cell is the group's text ("" for a measure line), null when the line is absent for the group, or a pair when the
// group has its own policy (the breast line).
type Cell = string | null | [Policy, string];
interface ExamLine { id: string; label: string; policy: Policy; cells: Partial<Record<ExamGroup, Cell>>; aliases?: string[]; terms?: string[]; unit?: string; empty?: string; female?: true }

const measure = (id: string, label: string, aliases: string[], unit?: string, cells: ExamLine["cells"] = { adult: "" }): ExamLine => ({ id, label, policy: "measure", cells, aliases, unit });
const onlyAdult = { adult: "", child: null, pregnant: null, postpartum: null };

// Section 6 of the spec, in status-generalis order. Draft text for clinical review; change it only after that review.
const examLines: ExamLine[] = [
  { id: "general.condition", label: "Keadaan umum", policy: "normal", cells: { adult: "Baik", child: "Baik, aktif" }, aliases: ["ku"], terms: ["keadaan umum", "KU", "lemah", "lemas", "sakit ringan", "sakit sedang", "sakit berat", "letargis", "rewel"] },
  { id: "general.consciousness", label: "Kesadaran", policy: "normal", cells: { adult: "Compos mentis" }, terms: ["kesadaran", "apatis", "somnolen", "sopor", "koma", "delirium", "gelisah", "GCS"] },
  measure("vitals.bp", "Tekanan darah", ["td", "tensi"], " mmHg"),
  measure("vitals.hr", "Nadi", ["hr", "frekuensi nadi"], " /menit"),
  measure("vitals.rr", "Napas", ["rr", "frekuensi napas", "respirasi"], " /menit"),
  measure("vitals.temp", "Suhu", ["temp"], " °C"),
  measure("vitals.spo2", "SpO₂", ["spo2", "saturasi"], "%"),
  measure("anthro.weight", "Berat badan", ["bb"], " kg"),
  measure("anthro.height", "Tinggi badan / panjang badan", ["tinggi badan", "panjang badan", "tb", "pb"], " cm"),
  measure("anthro.bmi", "IMT", ["bmi"], " kg/m²", onlyAdult),
  measure("anthro.waist", "Lingkar perut", ["lingkar pinggang", "lp"], " cm", onlyAdult),
  measure("anthro.headCirc", "Lingkar kepala", ["lk"], " cm", { adult: null, infant: "" }),
  { ...measure("anthro.nutrition", "Status gizi", [], undefined, { adult: null, child: "" }), empty: "belum dinilai" },
  { id: "head", label: "Kepala", policy: "normal", cells: { adult: "Normocephal" }, terms: ["kepala", "normocephal", "mikrosefal", "makrosefal", "deformitas kepala", "hematoma"] },
  measure("head.fontanelle", "Ubun-ubun besar", ["ubun-ubun", "uub", "fontanel"], undefined, { adult: null, infant: "" }),
  { id: "eyes", label: "Mata", policy: "normal", cells: { adult: "Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+)", child: "Konjungtiva anemis (-/-), sklera ikterik (-/-), mata cekung (-), pupil isokor, refleks cahaya (+/+)" }, terms: ["mata", "konjungtiva", "anemis", "sklera", "ikterik", "pupil", "anisokor", "refleks cahaya", "mata cekung"] },
  { id: "ent", label: "Telinga, hidung, tenggorok", policy: "normal", cells: { adult: "Sekret telinga (-/-), sekret hidung (-), faring hiperemis (-), tonsil tidak hiperemis, detritus (-)" }, aliases: ["tht", "telinga", "hidung", "tenggorok", "tenggorokan", "faring"], terms: ["telinga", "otore", "hidung", "rinore", "epistaksis", "tenggorok", "faring", "tonsil", "detritus"] },
  { id: "mouth", label: "Mulut", policy: "normal", cells: { adult: "Mukosa bibir lembap, sianosis (-)" }, terms: ["mulut", "mukosa", "bibir", "sianosis", "stomatitis", "sariawan", "lidah"] },
  { id: "neck", label: "Leher", policy: "normal", cells: { adult: "Pembesaran KGB (-), pembesaran tiroid (-)" }, terms: ["leher", "KGB", "kelenjar getah bening", "limfadenopati", "tiroid", "struma", "JVP"] },
  { id: "chest.lungs", label: "Paru", policy: "normal", cells: { adult: "Gerak napas simetris, retraksi (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-)", child: "Gerak napas simetris, tarikan dinding dada ke dalam (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-)" }, aliases: ["paru-paru", "pulmo"], terms: ["paru", "sesak", "retraksi", "tarikan dinding dada", "vesikuler", "ronki", "rhonki", "wheezing", "mengi", "stridor", "redup", "hipersonor"] },
  { id: "chest.heart", label: "Jantung", policy: "normal", cells: { adult: "Bunyi jantung I-II reguler, murmur (-), gallop (-)" }, aliases: ["cor"], terms: ["jantung", "bunyi jantung", "BJ", "murmur", "gallop", "iktus", "ireguler"] },
  { id: "breast", label: "Payudara", policy: "normal", female: true, cells: { adult: ["notExamined", "Tidak diperiksa"], child: null, pregnant: "Massa (-), retraksi puting (-)", postpartum: "Massa (-), puting lecet (-), bendungan ASI (-)" }, aliases: ["mammae"], terms: ["payudara", "mammae", "massa payudara", "puting", "areola", "ASI", "lecet", "bendungan"] },
  { id: "abdomen", label: "Abdomen", policy: "normal", cells: { adult: "Supel, bising usus (+) normal, nyeri tekan (-), hepar dan lien tidak teraba", pregnant: "Membesar (hamil), nyeri tekan (-)", postpartum: "Supel, nyeri tekan (-)" }, aliases: ["perut"], terms: ["abdomen", "perut", "supel", "distensi", "kembung", "nyeri tekan", "defans", "bising usus", "hepar", "lien", "hepatomegali", "splenomegali", "asites", "McBurney", "Murphy"] },
  measure("obstetric.fundus", "Tinggi fundus uteri", ["tfu", "tinggi fundus", "fundus uteri"], " cm", { adult: null, pregnant: "", postpartum: "" }),
  measure("obstetric.leopold", "Leopold I-IV", ["leopold"], undefined, { adult: null, pregnant: "" }),
  measure("obstetric.fhr", "Denyut jantung janin", ["djj"], " /menit", { adult: null, pregnant: "" }),
  measure("obstetric.contractions", "Kontraksi (his)", ["his", "kontraksi"], undefined, { adult: null, pregnant: "" }),
  { id: "obstetric.vaginal", label: "Pemeriksaan dalam", policy: "notExamined", cells: { adult: null, pregnant: "Tidak dilakukan" }, aliases: ["vt"], terms: ["pemeriksaan dalam", "VT", "pembukaan", "portio", "ketuban"] },
  measure("postpartum.uterus", "Kontraksi uterus", ["kontraksi", "uterus"], undefined, { adult: null, postpartum: "" }),
  measure("postpartum.lochia", "Lokia", ["lochia", "lokhia"], undefined, { adult: null, postpartum: "" }),
  measure("postpartum.perineum", "Perineum", [], undefined, { adult: null, postpartum: "" }),
  { id: "genitalia", label: "Genitalia", policy: "notExamined", cells: { adult: "Tidak diperiksa" }, aliases: ["genital"], terms: ["genitalia", "genital", "vulva", "vagina", "penis", "skrotum", "testis", "keputihan", "duh"] },
  { id: "anorectal", label: "Anus dan rektum", policy: "notExamined", cells: { adult: "Tidak diperiksa" }, aliases: ["anus", "rektum", "colok dubur"], terms: ["anus", "rektum", "rektal", "colok dubur", "hemoroid"] },
  { id: "extremities", label: "Ekstremitas", policy: "normal", cells: { adult: "Akral hangat, CRT < 2 detik, edema (-/-)", child: "Akral hangat, CRT < 2 detik", pregnant: "Akral hangat, CRT < 2 detik, edema tungkai (-/-)", postpartum: "Akral hangat, CRT < 2 detik, edema tungkai (-/-), nyeri betis (-/-)" }, aliases: ["extremitas", "akral"], terms: ["ekstremitas", "akral", "dingin", "CRT", "edema", "bengkak", "sianosis perifer", "betis", "nyeri betis"] },
  { id: "skin", label: "Kulit", policy: "normal", cells: { adult: "Ruam (-)", child: "Ruam (-), turgor kulit kembali cepat" }, terms: ["kulit", "ruam", "eritema", "makula", "papul", "vesikel", "pustul", "ptekie", "turgor"] },
  { id: "neuro", label: "Status neurologis", policy: "notExamined", cells: { adult: "Tidak diperiksa" }, aliases: ["neurologis", "neuro"], terms: ["neurologis", "kaku kuduk", "meningeal", "parese", "paresis", "hemiparese", "refleks", "kejang", "Babinski", "defisit"] },
];

const chains: Record<ExamGroup, ExamGroup[]> = { adult: ["adult"], child: ["child", "adult"], infant: ["infant", "child", "adult"], pregnant: ["pregnant", "adult"], postpartum: ["postpartum", "adult"] };
const groupLabel: Record<ExamGroup, string> = { adult: "Dewasa", child: "Anak", infant: "Bayi", pregnant: "Hamil", postpartum: "Nifas" };
const key = (label: string) => label.trim().toLowerCase().replace(/\s+/g, " ");
// One label can name two lines ("Kontraksi"): the one present for the patient's group is used.
const byLabel = new Map<string, ExamLine[]>();
for (const line of examLines) for (const name of [line.label, ...line.aliases ?? []]) byLabel.set(key(name), [...byLabel.get(key(name)) ?? [], line]);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (terms: string[], text: string) => terms.length > 0 && new RegExp(String.raw`(?<!\p{L})(?:${terms.map(escape).join("|")})(?!\p{L})`, "iu").test(text);

function cell(line: ExamLine, patient: ExamPatient): Cell {
  if (line.female && patient.sex !== "F") return null;
  for (const group of chains[patient.group]) { const value = line.cells[group]; if (value !== undefined) return value; }
  return null;
}

export interface ExamPatient { group: ExamGroup; sex: "M" | "F"; months: number; age: string; weeks?: number; day?: number }

/** A labelled "Hamil:" or "Nifas:" answer; empty, "tidak" or "-" is no answer. */
function answer(text: string, label: "hamil" | "nifas"): string | undefined {
  const value = new RegExp(String.raw`^[ \t]*${label}[ \t]*:[ \t]*(.*)$`, "im").exec(text)?.[1].trim();
  return value && !/^(?:tidak|tdk|bukan|no)\b|^[-–—]/i.test(value) ? value : undefined;
}

/** The patient's group from the typed text, the strip values read from it and the saved patient; undefined until both
 *  age and sex are known. Months count only on an "Usia:"/"Umur:" line, so "batuk 2 bulan" stays a duration. */
export function examPatient(text: string, fields: Partial<CaseFields>, hints: { age?: string; sex?: "M" | "F" }): ExamPatient | undefined {
  const monthsTyped = /\b(?:usia|umur)\s*:?\s*(\d{1,2})\s*(?:bulan|bln)\b/i.exec(text)?.[1];
  const years = fields.age?.trim() || hints.age;
  const sex = fields.sex === "M" || fields.sex === "F" ? fields.sex : hints.sex;
  if ((!monthsTyped && !(years && /^\d{1,3}$/.test(years))) || !sex) return undefined;
  const months = monthsTyped ? Number(monthsTyped) : Number(years) * 12;
  const pregnant = answer(text, "hamil"), postpartum = answer(text, "nifas");
  const weeks = pregnant && /(\d{1,2})\s*(?:minggu|mgg|mg)\b/i.exec(pregnant)?.[1];
  const day = postpartum && /hari\s*ke-?\s*(\d{1,2})|(\d{1,2})\s*hari/i.exec(postpartum);
  // A delivered patient is postpartum even if the "Hamil:" line was left in.
  const group: ExamGroup = sex === "F" && postpartum ? "postpartum" : sex === "F" && pregnant ? "pregnant" : months < 24 ? "infant" : months < 216 ? "child" : "adult";
  return { group, sex, months, age: monthsTyped ? `${months} bulan` : `${years} tahun`, weeks: group === "pregnant" && weeks ? Number(weeks) : undefined, day: group === "postpartum" && day ? Number(day[1] ?? day[2]) : undefined };
}

const measured: [string, keyof CaseFields][] = [["vitals.bp", "bp"], ["vitals.hr", "heartRate"], ["vitals.rr", "respiratoryRate"], ["vitals.temp", "temperature"], ["vitals.spo2", "spo2"]];
const decimal = (value: string | undefined) => { const found = value && /\d+(?:[.,]\d+)?/.exec(value)?.[0]; return found ? Number(found.replace(",", ".")) : undefined; };
const comma = (value: number) => String(value).replace(".", ",");

/** What the doctor typed for each line (labelled lines, then the strip's vitals), the lines consumed, and the exam text. */
function readExam(text: string, fields: Partial<CaseFields>, patient: ExamPatient) {
  const typed = new Map<string, string>(), stray: string[] = [], consumed = new Set<number>();
  text.split(/\r?\n/).forEach((raw, index) => {
    const match = /^\s*([^:\n]{1,40}?)\s*:\s*(.*)$/.exec(raw);
    if (!match) return;
    if (/^(?:hamil|nifas)$/i.test(match[1].trim())) { consumed.add(index); return; }
    const candidates = byLabel.get(key(match[1]));
    if (!candidates) return;
    consumed.add(index);
    const value = match[2].trim();
    if (!value) return;
    const line = candidates.find((item) => cell(item, patient) !== null);
    // A finding for a line the group does not have stays in the record, under the doctor's findings.
    if (!line) { stray.push(`${match[1].trim()}: ${value}`); return; }
    typed.set(line.id, typed.has(line.id) ? `${typed.get(line.id)}; ${value}` : value);
  });
  for (const [id, field] of measured) { const value = fields[field]?.trim(); if (value && !typed.has(id)) typed.set(id, value); }
  const note = structureNote(text);
  const rest = text.split(/\r?\n/).filter((_, index) => !consumed.has(index)).join("\n").trim();
  // Fully unlabelled text cannot be told apart from the exam, so all of it guards against a contradicting default.
  const scanned = note.recognized ? note.fields.examination ?? "" : rest;
  return { typed, stray, consumed, rest, finding: note.fields.examination, scanned };
}

function bmi(typed: Map<string, string>): number | undefined {
  const weight = decimal(typed.get("anthro.weight")), height = decimal(typed.get("anthro.height"));
  return weight && height ? Math.round(weight / (height / 100) ** 2 * 10) / 10 : undefined;
}

/** The assembled "Pemeriksaan Fisik" section, or undefined until age and sex are known (the placeholder stays).
 *  `rest` is the text without the lines the section consumed; `labelled` is true when the doctor labelled exam lines. */
export function normalExam(text: string, fields: Partial<CaseFields>, hints: { age?: string; sex?: "M" | "F" }): { text: string; rest: string; labelled: boolean } | undefined {
  const patient = examPatient(text, fields, hints);
  if (!patient) return undefined;
  const { typed, stray, consumed, rest, finding, scanned } = readExam(text, fields, patient);
  const derived = bmi(typed);
  if (derived && !typed.has("anthro.bmi")) typed.set("anthro.bmi", comma(derived));
  const out = [finding && `Temuan dokter: ${finding}`, ...stray].filter(Boolean) as string[];
  for (const line of examLines) {
    const value = cell(line, patient);
    if (value === null) continue;
    const [policy, base] = Array.isArray(value) ? value : [line.policy, value];
    const entry = typed.get(line.id);
    const shown = entry ? (line.unit && /^\d+(?:[.,]\d+)?(?:\/\d+)?$/.test(entry) ? entry + line.unit : entry)
      : mentions(line.terms ?? [], scanned) ? (finding ? "lihat temuan dokter" : "lihat catatan dokter")
      : policy === "normal" ? `${base} ${autoNormalMarker}` : policy === "measure" ? line.empty ?? "belum diukur" : base;
    out.push(`${line.label}: ${shown}`);
  }
  return { text: out.join("\n"), rest, labelled: [...consumed].length > 0 };
}

/** Warnings for typed values against the section 7 ranges. UI only: never written into the record, never a diagnosis. */
export function examFlags(text: string, fields: Partial<CaseFields>, patient: ExamPatient): string[] {
  const { typed } = readExam(text, fields, patient);
  const flags: string[] = [];
  const add = (condition: boolean, flag: string) => { if (condition) flags.push(flag); };
  const value = (id: string) => decimal(typed.get(id));
  const years = patient.months / 12, adult = years >= 18;
  const bp = /(\d{2,3})\s*\/\s*(\d{2,3})/.exec(typed.get("vitals.bp") ?? "");
  if (bp) {
    const [s, d] = [Number(bp[1]), Number(bp[2])], shown = `TD ${s}/${d} mmHg`;
    if (patient.group === "pregnant") add(s >= 140 || d >= 90, `${shown}: ${s >= 160 || d >= 110 ? "≥ 160/110" : "≥ 140/90"} pada kehamilan`);
    else if (patient.group === "postpartum") add(s >= 140 || d >= 90, `${shown}: ≥ 140/90 pada masa nifas`);
    else if (adult) {
      if (s >= 140 || d >= 90) flags.push(`${shown}: ≥ 140/90 (PERHI 2021)`);
      else if (s >= 130 || d >= 85) flags.push(`${shown}: rentang normal-tinggi 130-139/85-89 (PERHI 2021)`);
      add(s < 90 || d < 60, `${shown}: < 90/60`);
    }
  }
  const temp = value("vitals.temp");
  if (temp !== undefined) {
    if (patient.group === "postpartum" && temp >= 38) flags.push(`Suhu ${comma(temp)} °C: ≥ 38,0 pada masa nifas`);
    else add(temp >= 37.5, `Suhu ${comma(temp)} °C: ≥ 37,5`);
    add(temp < 36, `Suhu ${comma(temp)} °C: < 36,0`);
  }
  const spo2 = value("vitals.spo2");
  if (spo2 !== undefined) add(spo2 < 95, `SpO₂ ${spo2}%: < 95%`);
  const hr = value("vitals.hr");
  const hrBand = adult ? [60, 100] : patient.months < 12 ? [100, 190] : patient.months < 36 ? [98, 140] : patient.months < 72 ? [80, 120] : patient.months < 144 ? [75, 118] : [60, 100];
  if (hr !== undefined) add(hr < hrBand[0] || hr > hrBand[1], `Nadi ${hr} /menit: di luar ${hrBand[0]}-${hrBand[1]}`);
  const rr = value("vitals.rr");
  if (rr !== undefined) {
    const fast = patient.months < 2 ? 60 : patient.months < 12 ? 50 : patient.months < 60 ? 40 : undefined;
    const band = adult ? [12, 20] : patient.months >= 144 ? [12, 20] : patient.months >= 72 ? [18, 25] : undefined;
    if (fast !== undefined) add(rr >= fast, `Napas ${rr} /menit: ≥ ${fast}, napas cepat (MTBS)`);
    else if (band) add(rr < band[0] || rr > band[1], `Napas ${rr} /menit: di luar ${band[0]}-${band[1]}`);
  }
  if (patient.group === "pregnant") {
    const fhr = value("obstetric.fhr"), fundus = value("obstetric.fundus");
    if (fhr !== undefined) add(fhr < 120 || fhr > 160, `DJJ ${fhr} /menit: di luar 120-160`);
    if (fundus !== undefined && patient.weeks !== undefined && patient.weeks >= 20) add(Math.abs(fundus - patient.weeks) > 2, `TFU ${comma(fundus)} cm: selisih > 2 cm dari usia kehamilan ${patient.weeks} minggu`);
  }
  if (patient.group === "adult") {
    const index = value("anthro.bmi") ?? bmi(typed);
    if (index !== undefined) {
      const rule = index < 18.5 ? "< 18,5" : index >= 30 ? "≥ 30" : index >= 25 ? "≥ 25" : index >= 23 ? "≥ 23" : undefined;
      add(rule !== undefined, `IMT ${comma(index)}: ${rule} (Asia-Pasifik, KMK 509/2025)`);
    }
    const waist = value("anthro.waist"), limit = patient.sex === "M" ? 90 : 80;
    if (waist !== undefined) add(waist > limit, `Lingkar perut ${comma(waist)} cm: > ${limit} (KMK 509/2025)`);
  }
  return flags;
}

/** The exam lines the doctor labelled ("Paru: ronki (+/+)"), as the SOAP view's row O lists them. */
export function examEntries(text: string, patient: ExamPatient): string[] {
  const { typed, stray } = readExam(text, {}, patient);
  return [...examLines.filter((line) => typed.has(line.id)).map((line) => `${line.label}: ${typed.get(line.id)}`), ...stray];
}

/** The template the patient gets, as the composer shows it ("Hamil 32 minggu · P · 28 tahun"). */
export function examGroupLabel(patient: ExamPatient): string {
  const group = patient.weeks !== undefined ? `Hamil ${patient.weeks} minggu` : patient.day !== undefined ? `Nifas hari ke-${patient.day}` : groupLabel[patient.group];
  return `${group} · ${patient.sex === "F" ? "P" : "L"} · ${patient.age}`;
}

/** Which of the "Hamil:" and "Nifas:" lines the text does not have yet. */
export function missingPregnancyLines(text: string): ("Hamil" | "Nifas")[] {
  return (["Hamil", "Nifas"] as const).filter((label) => !new RegExp(String.raw`^[ \t]*${label}[ \t]*:`, "im").test(text));
}

/** The labels of the lines the template filled ("Keadaan umum", "Paru"), in document order. */
export function autoNormalLabels(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line.endsWith(autoNormalMarker)).map((line) => line.slice(0, line.indexOf(":")).trim());
}

/** The text as every output shows it: the marker hides once the doctor marks the draft Ditinjau or Final (decision D10).
 *  The stored text keeps it, so it shows again when the draft returns to Draf. */
export function reviewedText(text: string, status?: ReviewStatus): string {
  return status === "reviewed" || status === "final" ? text.replace(/ ?\[otomatis normal\]/g, "") : text;
}
