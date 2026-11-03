import type { AadiResult } from "./contract";
import type { CaseState } from "./types";
import type { Message } from "../workspace";
import { aadiDraft, aadiFocus, caseHistory, differentialStatus, dispositionText, educationLines, regimenLine, storedCase, theOracleCitations, theOracleReferenceItems, vitalLabels, type AadiFocus, type TheOracleReferenceItem } from "./presentation";
import { applyTherapyGate, gateEvidence, unstrength, validGate, type EvidenceGateReport, type GateStatus } from "../theoracle-evidence-gate";

/** The stored engine result in Glass's differential shape; a view, never a second source of truth. */
export interface AnalysisView {
  focus?: AadiFocus;
  discussion: { facts: string[]; missing: string[]; note?: string };
  tiers: { key: "likely" | "alternatives" | "cannotMiss"; title: "Kemungkinan utama" | "Alternatif" | "Jangan terlewat"; items: { label: string; icd10: string; status: string; supporting: string[]; opposing: string[] }[] }[];
  nextSteps: { kind: "question" | "exam" | "test"; item: string; reason: string; indication?: string }[];
  therapy?: { forDiagnosis: string; lines: { text: string; status: GateStatus }[]; interactions: string[]; contraindications: string[]; disposition?: string; removed?: string };
  education: string[];
  citations: TheOracleReferenceItem[];
}

const tierTitles = { likely: "Kemungkinan utama", alternatives: "Alternatif", cannotMiss: "Jangan terlewat" } as const;

/** `null` for a local draft, a legacy answer without a stored result, or an AADI answer the doctor has edited: those
 *  render as the markdown they are, so an edit is never hidden behind stale structure. */
export function analysisView(message: Pick<Message, "sourceText" | "content" | "mode"> & Partial<Pick<Message, "originalContent">>): AnalysisView | null {
  const stored = storedCase(message);
  if (!stored) return null;
  const source = JSON.parse(message.sourceText!) as { traceId?: unknown; createdAt?: unknown; grounding?: unknown; therapyGrounding?: unknown; evidenceGate?: unknown };
  const focus = message.mode ? aadiFocus(message.mode) : undefined;
  const storedGate = validGate(source.evidenceGate) ? source.evidenceGate : undefined;
  const traceId = typeof source.traceId === "string" ? source.traceId : "", createdAt = typeof source.createdAt === "string" ? source.createdAt : "";
  const original = message.originalContent ?? aadiDraft(stored.result, traceId, createdAt, stored.data, focus, storedGate) + theOracleCitations(source.grounding, source.therapyGrounding, storedGate);
  if (message.content !== original) return null;
  const { result, gate } = applyTherapyGate(stored.result, gateEvidence(source.therapyGrounding, source.grounding), storedGate);
  return {
    ...(focus ? { focus } : {}),
    discussion: { facts: caseFacts(stored.data), missing: result.missingInformation, ...(result.reasoningNote?.trim() ? { note: result.reasoningNote.trim() } : {}) },
    tiers: (["likely", "alternatives", "cannotMiss"] as const).map((key) => ({ key, title: tierTitles[key], items: result.differential[key].map((d) => {
      const evidence = result.evidence.filter((e) => e.icd10.toUpperCase() === d.icd10.toUpperCase());
      return { label: d.label, icd10: d.icd10, status: differentialStatus(d, key), supporting: evidence.flatMap((e) => e.supporting), opposing: evidence.flatMap((e) => e.opposing) };
    }) })),
    nextSteps: result.nextBestActions.map((a) => ({ kind: a.kind, item: a.item, reason: a.reason, ...(a.indication ? { indication: a.indication } : {}) })),
    ...therapyView(result, gate),
    education: educationLines(result, stored.data),
    citations: theOracleReferenceItems(message.content),
  };
}

function therapyView(result: AadiResult, gate: EvidenceGateReport | undefined): Pick<AnalysisView, "therapy"> {
  const disposition = dispositionText(result);
  if (gate?.therapyRemoved) return { therapy: { forDiagnosis: `${gate.forDiagnosis.label} (${gate.forDiagnosis.icd10})`, lines: [], interactions: [], contraindications: [], ...(disposition ? { disposition } : {}), removed: gate.reason } };
  const therapy = result.therapy;
  if (!therapy?.regimen.length) return disposition ? { therapy: { forDiagnosis: "", lines: [], interactions: [], contraindications: [], disposition } } : {};
  const key = (drug: string) => unstrength(drug).toLowerCase();
  const regimen = (drug: string) => therapy.regimen.find((r) => key(r.drug) === key(drug));
  // The gate's report is the list: a drug whose dose it removed stays on it, named without the dose and marked for the
  // dose check. Without a report (a legacy answer) every line is marked unverified rather than trusted.
  const lines = gate
    ? gate.drugs.map((d) => { const r = regimen(d.drug); return { text: r ? regimenLine(d.status === "verified" ? r : { ...r, dose: "" }) : `${d.drug}, dosis: cek pedoman`, status: d.status }; })
    : therapy.regimen.map((r) => ({ text: regimenLine(r), status: "doseRemoved" as const }));
  return { therapy: {
    forDiagnosis: `${therapy.forDiagnosis.label} (${therapy.forDiagnosis.icd10})`,
    lines, interactions: therapy.interactions, contraindications: therapy.contraindications,
    ...(disposition ? { disposition } : {}),
  } };
}

function caseFacts(data: CaseState): string[] {
  const { history, notes } = caseHistory(data);
  const demographics = [data.demographics.ageYears == null ? "" : `${data.demographics.ageYears} tahun`, data.demographics.sex === "M" ? "Laki-laki" : data.demographics.sex === "F" ? "Perempuan" : "", data.demographics.pregnant === undefined ? "" : `Hamil: ${data.demographics.pregnant ? "Ya" : "Tidak"}`].filter(Boolean).join(" · ");
  const vitals = Object.entries(data.vitals).map(([k, v]) => `${vitalLabels[k] ?? k}: ${v}`).join("; ");
  const results = data.results.map((r) => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ""}${r.flag ? ` (${r.flag})` : ""}`).join("; ");
  const qa = (data.anamnesis.qa ?? []).map((item) => `${item.question.trim()}: ${item.answer.trim()}`);
  return [
    ["Keluhan utama", data.chiefComplaint.trim()], ["Pasien", demographics], ["Riwayat", [history, ...qa].filter(Boolean).join("; ")], ["Catatan pasien", notes],
    ["Tanda vital", vitals], ["Pemeriksaan fisik", data.physicalExam.join("; ")], ["Hasil pemeriksaan", results],
    ["Kondisi yang diketahui", data.knownConditions.join("; ")], ["Alergi", data.allergies.join("; ")], ["Obat yang sedang digunakan", data.currentMedications.join("; ")],
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
}
