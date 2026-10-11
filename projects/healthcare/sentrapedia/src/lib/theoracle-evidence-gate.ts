import type { MiraTherapy } from "./mira/contract";
import type { TheOracleGroundingBundle } from "./theoracle-grounding-types";

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
const UNITS = { mg: "(?:mg|miligram)", mcg: "(?:mcg|µg|μg|mikrogram)", g: "(?:g|gram)", iu: "(?:iu|ui|unit)", ml: "(?:ml|mililiter)", meq: "(?:meq)", mmol: "(?:mmol)" };
const UNIT: Record<string, string> = { ...UNITS, "µg": UNITS.mcg, "μg": UNITS.mcg, mikrogram: UNITS.mcg, miligram: UNITS.mg, gram: UNITS.g, ui: UNITS.iu, unit: UNITS.iu, mililiter: UNITS.ml };
// A strength, or a pair such as 5-40 mg (range) or 875/125 mg (combination) whose numbers share one unit; "2,4 juta IU" keeps its multiplier.
const STRENGTH = /(?:(\d+(?:[.,]\d+)?)\s*[-–/]\s*)?(\d+(?:[.,]\d+)?(?:\s*(?:juta|ribu))?)\s*(mikrogram|miligram|mililiter|gram|unit|mmol|meq|mcg|µg|μg|mg|ui|iu|ml|g)\b/gi;
const SAFETY_TERM = /kontraindikasi|interaksi|hindari|jangan diberikan/;

// English and Indonesian spellings of generic names converge: amoxicillin and amoksisilin -> amoksisilin.
function spell(word: string): string {
  return word.replace(/ph/g, "f").replace(/th/g, "t").replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/y/g, "i").replace(/(.)\1+/g, "$1").replace(/(.{4,})e$/, "$1");
}
const tokens = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/).filter(Boolean).map(spell);
const names = (drug: string) => tokens(drug).filter(word => word.length >= 4);
const mentions = (passage: string[], drug: string) => { const wanted = names(drug); return wanted.length > 0 && wanted.every(word => passage.includes(word)); };
const number = (value: string) => value.replace(/[.,]/, "[.,]").replace(/\s+/, "\\s*");
// Each number of a pair needs its own match: the first stands alone or opens the same pair.
const strengths = (dose: string) => {
  const tail = /\/\s*kg/.test(dose.toLowerCase()) ? "(?=\\s*\\/\\s*kg)" : "(?!\\s*\\/\\s*kg)";
  return [...dose.toLowerCase().matchAll(STRENGTH)].flatMap(m => [...(m[1] ? [`${number(m[1])}(?:\\s*[-–/]\\s*${number(m[2])})?`] : []), number(m[2])].map(value => new RegExp(`(?<![\\d.,])${value}\\s*${UNIT[m[3]]}\\b${tail}`, "i")));
};
// Strips a strength and any "/5 ml", "/vial" or "/kgBB" tail so no number or unit is left behind.
export const unstrength = (text: string) => text.replace(new RegExp(`${STRENGTH.source}(?:\\s*\\/\\s*(?:\\d[\\d.,]*\\s*)?[a-z]+)?`, "gi"), "").replace(/\s+/g, " ").trim();

export function gateTherapy(therapy: MiraTherapy, bundle: TheOracleGroundingBundle | undefined, diagnosis: { icd10: string; label: string } | undefined): { therapy: MiraTherapy | undefined; report: EvidenceGateReport } {
  const forDiagnosis = therapy.forDiagnosis;
  const removed = (reason: string) => ({ therapy: undefined, report: { forDiagnosis, therapyRemoved: true, reason, drugs: therapy.regimen.map((r): GateDrug => ({ drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] })) } });
  if (!bundle?.evidence.length) return removed("Referensi TheOracle untuk terapi tidak tersedia; dosis tidak ditampilkan.");
  if (!diagnosis || forDiagnosis.icd10.trim().toUpperCase().slice(0, 3) !== diagnosis.icd10.trim().toUpperCase().slice(0, 3)) return removed(`Terapi ditulis untuk diagnosis lain (${forDiagnosis.icd10}), bukan ${diagnosis?.icd10 ?? "diagnosis kerja"}.`);
  const passages = bundle.evidence.map(item => ({ id: item.evidenceId, text: item.text, words: tokens(item.text) }));
  const naming = (drug: string) => passages.filter(p => mentions(p.words, drug));
  // A strength outside `dose` is shown only when one passage naming the drug carries all of it.
  const carried = (text: string, among: { text: string }[]) => { const patterns = strengths(text); return !patterns.length || among.some(p => patterns.every(pattern => pattern.test(p.text))); };
  const drugs = therapy.regimen.map((r): GateDrug => {
    const named = naming(r.drug);
    if (!named.length) return { drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] };
    const patterns = strengths(r.dose + " " + r.drug);
    const dosing = patterns.length ? named.filter(p => patterns.every(pattern => pattern.test(p.text))) : [];
    return dosing.length ? { drug: r.drug, dose: r.dose, status: "verified", evidenceIds: dosing.map(p => p.id) } : { drug: r.drug, dose: r.dose, status: "doseRemoved", evidenceIds: named.map(p => p.id) };
  });
  const kept = therapy.regimen.filter((_, i) => drugs[i].status !== "removed");
  const shown = (r: MiraTherapy["regimen"][number]) => {
    const named = naming(r.drug); const text = (field: string) => carried(field, named) ? field : "";
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
