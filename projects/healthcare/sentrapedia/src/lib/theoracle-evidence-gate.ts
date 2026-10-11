import type { MiraTherapy } from "./mira/contract";
import type { TheOracleGroundingBundle } from "./theoracle-grounding-types";
import { referenceIncludes, theOracleDiseases } from "./theoracle";

export type GateStatus = "verified" | "doseRemoved" | "removed";
// `dose` (and `drug`) are the raw model strings, kept for audit only; never display them.
export interface GateDrug { drug: string; dose: string; status: GateStatus; evidenceIds: string[] }
export interface EvidenceGateReport { forDiagnosis: { icd10: string; label: string }; therapyRemoved: boolean; reason: string; drugs: GateDrug[] }

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const GATE_STATUSES: readonly unknown[] = ["verified", "doseRemoved", "removed"];
export function validGate(value: unknown): value is EvidenceGateReport {
  return isRecord(value) && isRecord(value.forDiagnosis) && typeof value.forDiagnosis.icd10 === "string" && typeof value.forDiagnosis.label === "string" && typeof value.therapyRemoved === "boolean" && typeof value.reason === "string" && Array.isArray(value.drugs)
    && value.drugs.every(d => isRecord(d) && typeof d.drug === "string" && typeof d.dose === "string" && GATE_STATUSES.includes(d.status) && Array.isArray(d.evidenceIds) && d.evidenceIds.every(id => typeof id === "string"));
}

const UNVERIFIED = " (belum terverifikasi)";
const UNITS = { mg: "(?:mg|miligram)", mcg: "(?:mcg|µg|μg|ug|mikrogram)", g: "(?:g|gram)", iu: "(?:iu|ui|units?)", ml: "(?:ml|mililiter)", meq: "(?:meq)", mmol: "(?:mmol)", tetes: "(?:tetes|gtt)", semprotan: "(?:semprotan|semprot|spray)", puff: "(?:puff)" };
// Drop, spray and puff counts are doses too: "1-2 semprotan" must appear in the passage like "500 mg".
const UNIT: Record<string, string> = { ...UNITS, gtt: UNITS.tetes, semprot: UNITS.semprotan, spray: UNITS.semprotan, "µg": UNITS.mcg, "μg": UNITS.mcg, ug: UNITS.mcg, mikrogram: UNITS.mcg, miligram: UNITS.mg, gram: UNITS.g, ui: UNITS.iu, unit: UNITS.iu, units: UNITS.iu, mililiter: UNITS.ml };
// 1.200.000 and 1,200,000 are one number (thousands separators); "2,4 juta IU" keeps its multiplier.
const NUMBER = String.raw`(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\s*(?:juta|ribu|million))?`;
// A strength, or a pair such as 5-40 mg (range) or 875/125 mg (combination) whose numbers share one unit.
const STRENGTH = new RegExp(String.raw`(?:(${NUMBER})\s*[-–/]\s*)?(${NUMBER})\s*(mikrogram|miligram|mililiter|semprotan|semprot|spray|puff|tetes|gtt|gram|units?|mmol|meq|mcg|µg|μg|ug|mg|ui|iu|ml|g)\b`, "gi");
// Per-unit tails such as "/5 ml", "/kg/24 jam" or "/m2"; a drug name after a slash is not one of them.
const PER = String.raw`(?:\s*\/\s*(?:\d[\d.,]*\s*)?(?:(?:ml|dl|l|vial|ampul|amp|tablet|tab|kapsul|kaps|kgbb|kg|m2|hari|dosis|kali|jam|menit|mnt|detik)\b|m²))*`;
const SAFETY_TERM = /kontraindikasi|interaksi|hindari|jangan diberikan/;
// Two or more tablets per dose ("3 x 2 tablet", "2 tablet, 3 kali", "3 kali sehari 2 tablet", "2 kapsul sekaligus"): a strength just before it is tablet content, not a dose.
const TABLETS = String.raw`(?:1\s*-\s*)?[2-9]\s*(?:tablet|tab|kapsul|kaps|kaplet)s?\b`;
const UNITS_PER_DOSE = new RegExp(String.raw`\d+\s*[x×]\s*${TABLETS}|(?:^|[^\d.,/])${TABLETS}[\s,;]*(?:\d+\s*(?:[x×]|kali)|sekaligus|sekali|per\s*kali|tiap\s*kali)|\d+\s*kali\s*sehari[\s,;]*${TABLETS}`, "i");
// A passage doses with a strength when one of its occurrences is not followed, within 80 characters, by a multi-tablet dose.
const doses = (pattern: RegExp, text: string) => [...text.matchAll(new RegExp(pattern.source, "gi"))].some(m => !UNITS_PER_DOSE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 80)));

// English and Indonesian spellings of generic names converge: amoxicillin and amoksisilin -> amoksisilin.
function spell(word: string): string {
  return word.replace(/ph/g, "f").replace(/th/g, "t").replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/y/g, "i").replace(/(.)\1+/g, "$1").replace(/(.{4,})e$/, "$1");
}
const tokens = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/).filter(Boolean).map(spell);
const names = (drug: string) => tokens(drug).filter(word => word.length >= 4);
const mentions = (passage: string[], drug: string) => { const wanted = names(drug); return wanted.length > 0 && wanted.every(word => passage.includes(word)); };
// Words that do not single out one disease: qualifiers, function words, and any word in three or more catalog names (demam, akut, jantung).
const catalogCounts = new Map<string, number>();
theOracleDiseases.forEach(d => new Set(tokens(d.nama)).forEach(word => catalogCounts.set(word, (catalogCounts.get(word) ?? 0) + 1)));
const GENERIC = new Set(["kronis", "infeksi", "tanpa", "dengan", "komplikasi", "lain", "lainnya", "pada", "anak", "dewasa", "umum", "tidak", "lokasi", "spesifik", "acute", "chronic", "disease", "infection", "syndrome", "disorder", "without", "complication", "unspecified", "specified", "other", "status", "type", "tipe", "primer", "sekunder", "adult", "child", "fever", "signs", "warning", "human", "virus", "organism", "origin", "site", "acquired", "upper", "lower", "tract", "essential", "primary", "secondary", "mild", "moderate", "severe", "recurrent", "bacterial", "viral", "elsewhere", "classified", "presumed", "nos", "nec"].map(spell));
// The distinctive words of the diagnosis label and of the TheOracle catalog names for its code.
// Short capitals such as HIV count too, but not Roman numerals (stage II) or the words of a label written all in capitals.
const diagnosisWords = (diagnosis: { icd10: string; label: string }) => new Set([diagnosis.label, ...theOracleDiseases.filter(d => referenceIncludes(d.kode, diagnosis.icd10.trim().toUpperCase())).map(d => d.nama)]
  .flatMap(name => [...tokens(name).filter(word => word.length >= 4 && (catalogCounts.get(word) ?? 0) < 3), ...(name === name.toUpperCase() ? [] : (name.match(/\b[A-Z]{2,}\b/g) ?? []).filter(word => !/^[IVXL]+$/.test(word)).flatMap(tokens))])
  .filter(word => !GENERIC.has(word)));
const number = (value: string) => value.replace(/[.,]/g, "[.,]").replace(/\s+/g, "\\s*");
// Each number of a pair needs its own match: the first stands alone or opens the same pair.
const strengths = (dose: string) => {
  const tail = /\/\s*kg/.test(dose.toLowerCase()) ? "(?=\\s*\\/\\s*kg)" : "(?!\\s*\\/\\s*kg)";
  return [...dose.toLowerCase().matchAll(STRENGTH)].flatMap(m => [...(m[1] ? [`${number(m[1])}(?:\\s*[-–/]\\s*${number(m[2])})?`] : []), number(m[2])].map(value => new RegExp(`(?<![\\d.,])${value}\\s*${UNIT[m[3]]}\\b${tail}`, "i")));
};
// Strips every strength with its per-unit tails; "Amoxicillin 500 mg/clavulanate 125 mg" -> "Amoxicillin/clavulanate".
export const unstrength = (text: string) => text.replace(new RegExp(STRENGTH.source + PER, "gi"), "").replace(/\s*\/\s*/g, "/").replace(/^\/+|\/+$/g, "").replace(/\s+/g, " ").trim();

export function gateTherapy(therapy: MiraTherapy, bundle: TheOracleGroundingBundle | undefined, diagnosis: { icd10: string; label: string } | undefined): { therapy: MiraTherapy | undefined; report: EvidenceGateReport } {
  const forDiagnosis = therapy.forDiagnosis;
  const removed = (reason: string) => ({ therapy: undefined, report: { forDiagnosis, therapyRemoved: true, reason, drugs: therapy.regimen.map((r): GateDrug => ({ drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] })) } });
  if (!bundle?.evidence.length) return removed("Referensi TheOracle untuk terapi tidak tersedia; dosis tidak ditampilkan.");
  if (!diagnosis || forDiagnosis.icd10.trim().toUpperCase().slice(0, 3) !== diagnosis.icd10.trim().toUpperCase().slice(0, 3)) return removed(`Terapi ditulis untuk diagnosis lain (${forDiagnosis.icd10}), bukan ${diagnosis?.icd10 ?? "diagnosis kerja"}.`);
  const named = diagnosisWords(diagnosis);
  const passages = bundle.evidence.map(item => { const words = tokens(item.text); return { id: item.evidenceId, text: item.text, words, about: [...tokens(item.source.title), ...words].some(word => named.has(word)) }; });
  const naming = (drug: string) => passages.filter(p => mentions(p.words, drug));
  // A strength counts only from a passage about the diagnosis: an azole list for cryptococcosis does not dose pityriasis versicolor.
  const dosingFor = (drug: string) => naming(drug).filter(p => p.about);
  // A strength outside `dose` is shown only when one passage naming the drug carries all of it.
  const carried = (text: string, among: { text: string }[]) => { const patterns = strengths(text); return !patterns.length || among.some(p => patterns.every(pattern => pattern.test(p.text))); };
  const drugs = therapy.regimen.map((r): GateDrug => {
    const named = naming(r.drug);
    if (!named.length) return { drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] };
    const patterns = strengths(r.dose + " " + r.drug);
    const dosing = patterns.length ? dosingFor(r.drug).filter(p => patterns.every(pattern => doses(pattern, p.text))) : [];
    return dosing.length ? { drug: r.drug, dose: r.dose, status: "verified", evidenceIds: dosing.map(p => p.id) } : { drug: r.drug, dose: r.dose, status: "doseRemoved", evidenceIds: named.map(p => p.id) };
  });
  const kept = therapy.regimen.filter((_, i) => drugs[i].status !== "removed");
  const shown = (r: MiraTherapy["regimen"][number]) => {
    const named = dosingFor(r.drug); const text = (field: string) => carried(field, named) ? field : "";
    return { ...(drugs[therapy.regimen.indexOf(r)].status === "verified" ? r : { ...r, drug: unstrength(r.drug), dose: "" }), route: text(r.route), duration: text(r.duration), note: text(r.note) };
  };
  const safety = (items: string[]) => items.flatMap(item => {
    const words = tokens(item);
    const named = therapy.regimen.filter(r => mentions(words, r.drug));
    const keptNamed = kept.filter(r => named.includes(r));
    if (named.length && !keptNamed.length) return [];
    if (!carried(item, passages.filter(p => (keptNamed.length ? keptNamed : kept).some(r => mentions(p.words, r.drug))))) return [];
    const specific = words.filter(w => w.length >= 5 && !named.some(r => tokens(r.drug).includes(w)));
    const supported = keptNamed.length > 0 && passages.some(p => keptNamed.every(r => mentions(p.words, r.drug)) && SAFETY_TERM.test(p.text.toLowerCase()) && specific.some(w => p.words.includes(w)));
    return [supported ? item : item + UNVERIFIED];
  });
  const gated: MiraTherapy = { forDiagnosis, regimen: kept.map(shown), interactions: safety(therapy.interactions), contraindications: safety(therapy.contraindications) };
  const reason = kept.length ? "" : "Tidak ada obat yang indikasinya terverifikasi di TheOracle.";
  return { therapy: kept.length ? gated : undefined, report: { forDiagnosis, therapyRemoved: !kept.length, reason, drugs } };
}
