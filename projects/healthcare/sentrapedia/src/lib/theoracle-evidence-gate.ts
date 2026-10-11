import type { MiraTherapy } from "./mira/contract";
import type { TheOracleGroundingBundle } from "./theoracle-grounding-types";

export type GateStatus = "verified" | "doseRemoved" | "removed";
export interface GateDrug { drug: string; dose: string; status: GateStatus; evidenceIds: string[] }
export interface EvidenceGateReport { forDiagnosis: { icd10: string; label: string }; therapyRemoved: boolean; reason: string; drugs: GateDrug[] }

const UNVERIFIED = " (belum terverifikasi)";
const UNIT: Record<string, string> = { mg: "(?:mg|miligram)", mcg: "(?:mcg|µg|mikrogram)", "µg": "(?:mcg|µg|mikrogram)", g: "(?:g|gram)", iu: "(?:iu|ui|unit)", ml: "(?:ml|mililiter)" };
const SAFETY_TERM = /kontraindikasi|interaksi|hindari|jangan diberikan/;

// English and Indonesian spellings of generic names converge: amoxicillin and amoksisilin -> amoksisilin.
function spell(word: string): string {
  return word.replace(/ph/g, "f").replace(/th/g, "t").replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/y/g, "i").replace(/(.)\1+/g, "$1").replace(/(.{4,})e$/, "$1");
}
const tokens = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/).filter(Boolean).map(spell);
const names = (drug: string) => tokens(drug).filter(word => word.length >= 4);
const mentions = (passage: string[], drug: string) => { const wanted = names(drug); return wanted.length > 0 && wanted.every(word => passage.includes(word)); };
const strengths = (dose: string) => {
  const tail = /\/\s*kg/.test(dose.toLowerCase()) ? "(?=\\s*\\/\\s*kg)" : "(?!\\s*\\/\\s*kg)";
  return [...dose.toLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(mcg|µg|mg|g|iu|ml)\b/g)].map(m => new RegExp(`(?<![\\d.,])${m[1].replace(/[.,]/, "[.,]")}\\s*${UNIT[m[2]]}\\b${tail}`, "i"));
};

export function gateTherapy(therapy: MiraTherapy, bundle: TheOracleGroundingBundle | undefined, diagnosis: { icd10: string; label: string } | undefined): { therapy: MiraTherapy | undefined; report: EvidenceGateReport } {
  const forDiagnosis = therapy.forDiagnosis;
  const removed = (reason: string) => ({ therapy: undefined, report: { forDiagnosis, therapyRemoved: true, reason, drugs: therapy.regimen.map((r): GateDrug => ({ drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] })) } });
  if (!bundle?.evidence.length) return removed("Referensi TheOracle untuk terapi tidak tersedia; dosis tidak ditampilkan.");
  if (!diagnosis || forDiagnosis.icd10.trim().toUpperCase().slice(0, 3) !== diagnosis.icd10.trim().toUpperCase().slice(0, 3)) return removed(`Terapi ditulis untuk diagnosis lain (${forDiagnosis.icd10}), bukan ${diagnosis?.icd10 ?? "diagnosis kerja"}.`);
  const passages = bundle.evidence.map(item => ({ id: item.evidenceId, text: item.text, words: tokens(item.text) }));
  const drugs = therapy.regimen.map((r): GateDrug => {
    const naming = passages.filter(p => mentions(p.words, r.drug));
    if (!naming.length) return { drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] };
    const patterns = strengths(r.dose);
    const dosing = patterns.length ? naming.filter(p => patterns.every(pattern => pattern.test(p.text))) : [];
    return dosing.length ? { drug: r.drug, dose: r.dose, status: "verified", evidenceIds: dosing.map(p => p.id) } : { drug: r.drug, dose: r.dose, status: "doseRemoved", evidenceIds: naming.map(p => p.id) };
  });
  const kept = therapy.regimen.filter((_, i) => drugs[i].status !== "removed");
  const safety = (items: string[]) => items.flatMap(item => {
    const words = tokens(item);
    const named = therapy.regimen.filter(r => mentions(words, r.drug));
    const keptNamed = kept.filter(r => named.includes(r));
    if (named.length && !keptNamed.length) return [];
    const specific = words.filter(w => w.length >= 5 && !named.some(r => tokens(r.drug).includes(w)));
    const supported = keptNamed.length > 0 && passages.some(p => keptNamed.every(r => mentions(p.words, r.drug)) && SAFETY_TERM.test(p.text.toLowerCase()) && specific.some(w => p.words.includes(w)));
    return [supported ? item : item + UNVERIFIED];
  });
  const gated: MiraTherapy = { forDiagnosis, regimen: kept.map(r => drugs[therapy.regimen.indexOf(r)].status === "verified" ? r : { ...r, dose: "" }), interactions: safety(therapy.interactions), contraindications: safety(therapy.contraindications) };
  const reason = kept.length ? "" : "Tidak ada obat yang indikasinya terverifikasi di TheOracle.";
  return { therapy: kept.length ? gated : undefined, report: { forDiagnosis, therapyRemoved: !kept.length, reason, drugs } };
}
