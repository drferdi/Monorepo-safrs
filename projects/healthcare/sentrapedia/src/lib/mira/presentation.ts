import { validCase, validResult, type MiraResult, type MiraAnalysis } from "./contract";
import type { CaseState } from "./types";
import { oracleSource, oracleDiseases, type Disease } from "../oracle";
import { newId, type Message } from "../workspace";
import type { ModeId } from "../drafts";
import { freshReview, type ReviewItem } from "../workflow";
import { validOracleGrounding } from "../oracle-grounding-types";

export function oracleCitations(grounding: unknown): string {
  if (!validOracleGrounding(grounding)) return "";
  return "\n\n---\n\n## Referensi Oracle II\n\nReferensi yang dipilih sebelum analisis:\n\n" + grounding.evidence.map(item => `- ${item.source.filename}, halaman PDF ${item.source.pdfPage} [${item.evidenceId}]\n  ${item.text}\n  Sumber: ${item.source.driveUrl}`).join("\n\n");
}

export function oracleSourceLinks(message: Pick<Message, "sourceText">) {
  try {
    const source: unknown = JSON.parse(message.sourceText ?? "null");
    if (!source || typeof source !== "object" || !("grounding" in source) || !validOracleGrounding(source.grounding)) return [];
    return source.grounding.evidence.map(item => ({ id: item.evidenceId, label: `${item.source.filename}, halaman PDF ${item.source.pdfPage}`, url: item.source.driveUrl }));
  } catch { return []; }
}

export function hasMiraSource(message: Pick<Message, "sourceText">): boolean {
  if (!message.sourceText) return false;
  try {
    const source: unknown = JSON.parse(message.sourceText);
    return !!source && typeof source === "object" && "kind" in source && source.kind === "MIRA" && "contractVersion" in source && source.contractVersion === "1";
  } catch { return false; }
}

// The clinician sees the case as entered, with trace and time; engine metadata stays in the stored source.
export function sourceForDisplay(message: Pick<Message, "sourceText">): string | undefined {
  if (!hasMiraSource(message)) return message.sourceText;
  const source = JSON.parse(message.sourceText!) as { case?: unknown; traceId?: unknown; createdAt?: unknown; grounding?: unknown };
  return JSON.stringify({ case: source.case, traceId: source.traceId, createdAt: source.createdAt, ...(validOracleGrounding(source.grounding) ? { grounding: source.grounding } : {}) }, null, 2);
}

export type MiraFocus = "workup" | "refer" | "icd10";
export const referralSectionTitle = "Draft Rujukan";
export const icd10SectionTitle = "Kode ICD-10";
export function miraFocus(mode: ModeId): MiraFocus | undefined { return mode === "workup" || mode === "refer" || mode === "icd10" ? mode : undefined; }

export const diagnosisSectionTitles = ["Ringkasan Gejala", "Differential Diagnosis", "Diagnosis", "Penunjang", "Terapi Farmakologi", "Edukasi"];
// Field labels inside the sections, rendered as small headings by the clinical document view.
export const diagnosisFieldLabels = new Set(["Keluhan utama", "Pasien", "Anamnesis", "Tanda vital", "Pemeriksaan fisik", "Hasil pemeriksaan", "Kondisi yang diketahui", "Alergi", "Obat yang sedang digunakan", "Data yang perlu dilengkapi", "Pertanyaan lanjutan", "Alternatif", "Jangan terlewat", "Kemungkinan utama", "Temuan terkait", "Rencana awal", "Definisi", "Gejala khas", "Kriteria diagnosis", "Pemeriksaan penunjang", "Pemeriksaan fisik yang disarankan", "Kemampuan fasilitas", "Terapi", "Segera kembali atau dirujuk bila", "Rujukan", "Kandidat lain", "Terapi referensi", "DDI", "Kontraindikasi", "Bidang belum terisi", "Jejak analisis", "Keputusan", "Diagnosis kerja", "Ringkasan klinis", "Pemeriksaan yang disarankan"]);
export const diagnosisReferenceMarker = "Referensi penyakit terkait";

const recorded = (text: string) => text.split(/\r?\n/).map(line => `  ${line}`).join("\n");
const vitalLabels: Record<string, string> = { systolic: "Sistolik (mmHg)", diastolic: "Diastolik (mmHg)", heartRate: "Nadi (/menit)", respiratoryRate: "Napas (/menit)", temperature: "Suhu (°C)", spo2: "SpO₂ (%)", gcs: "GCS" };

function referenceIncludes(sourceCode: string, code: string): boolean {
  if (!/^[A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?$/.test(code)) return false;
  return sourceCode.toUpperCase().split(",").some(value => {
    const token = value.trim();
    const range = /^([A-Z]\d{2})-([A-Z]\d{2})$/.exec(token);
    return range ? code.slice(0, 3) >= range[1] && code.slice(0, 3) <= range[2] : code === token || code.startsWith(token + ".");
  });
}

export function miraDraft(result: MiraResult, traceId: string, createdAt: string, caseData?: CaseState, focus?: MiraFocus): string {
  // Bullets only where there are several points; a single point stays a plain line.
  const points = (items: string[], indent = "") => items.length > 1 ? items.map(item => `${indent}- ${item}`).join("\n") : items.length ? `${indent}${items[0]}` : "";
  const list = (items: string[] | undefined) => points((items ?? []).map(item => recorded(item).trimStart()));
  const field = (label: string, body: string) => body ? `${label}\n${body}` : "";
  const join = (parts: string[]) => parts.filter(Boolean).join("\n\n");
  const actions = (kinds: string[]) => list(result.nextBestActions.filter(a => kinds.includes(a.kind)).map(a => `${a.item} — ${a.reason}`));
  const reasons = (label: string, items: string[]) => items.length > 1 ? [`  ${label}:`, points(items, "  ")] : items.length ? [`  ${label}: ${items[0]}`] : [];
  const diagnoses = (key: keyof MiraResult["differential"]) => result.differential[key].map((d, _, group) => {
    const evidence = result.evidence.filter(e => e.icd10.toUpperCase() === d.icd10.toUpperCase());
    return [`${group.length > 1 ? "- " : ""}${d.label} (${d.icd10})`, ...reasons("Mendukung", evidence.flatMap(e => e.supporting)), ...reasons("Menyangkal", evidence.flatMap(e => e.opposing))].join("\n");
  }).join("\n\n");
  const therapy = result.therapy?.regimen.length ? result.therapy : undefined;
  const regimen = therapy && join([
    `Untuk ${therapy.forDiagnosis.label} (${therapy.forDiagnosis.icd10})`,
    points(therapy.regimen.map(r => [r.drug, r.dose, r.route, r.duration].filter(Boolean).join(" ") + (r.note ? ` (${r.note})` : ""))),
    field("DDI", points(therapy.interactions)),
    field("Kontraindikasi", points(therapy.contraindications)),
  ]);

  const listedCodes = new Set(Object.values(result.differential).flat().map(d => d.icd10.toUpperCase()));
  const extra = result.evidence.filter(e => !listedCodes.has(e.icd10.toUpperCase()));
  const references = oracleDiseases.filter(d => [...listedCodes].some(code => referenceIncludes(d.kode, code)));
  // Narratives follow the most likely group that has database records: likely, then alternatives, then cannotMiss.
  const primary = (["likely", "alternatives", "cannotMiss"] as const).map(key => references.filter(d => result.differential[key].some(item => referenceIncludes(d.kode, item.icd10.toUpperCase())))).find(group => group.length) ?? [];
  const others = references.filter(d => !primary.includes(d));
  const narrative = (diseases: Disease[], fields: [label: string, name: "definisi" | "gejala" | "diagnosis" | "terapi" | "rujukan"][]) => diseases.map(d => [`### ${d.nama} (${d.kode})`, ...fields.map(([label, name]) => field(label, name === "gejala" ? d.gejala.map(item => `- ${item}`).join("\n") : d[name]))].join("\n\n")).join("\n\n");
  const tests = actions(["test"]);
  const demographics = [caseData?.demographics.ageYears == null ? "" : `${caseData.demographics.ageYears} tahun`, caseData?.demographics.sex === "M" ? "Laki-laki" : caseData?.demographics.sex === "F" ? "Perempuan" : "", caseData?.demographics.pregnant === undefined ? "" : `Hamil: ${caseData.demographics.pregnant ? "Ya" : "Tidak"}`].filter(Boolean).join(" · ");
  const disposition = result.disposition ? `${result.disposition.decision === "refer" ? "Rujuk" : "Tangani di FKTP"} · ${{ routine: "rutin", urgent: "segera", emergency: "gawat darurat" }[result.disposition.urgency]}` : "";

  const vitals = list(caseData ? Object.entries(caseData.vitals).map(([key, value]) => `${vitalLabels[key] ?? key}: ${value}`) : []);
  const exam = list(caseData?.physicalExam);
  const results = list(caseData?.results.map(r => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ""}${r.flag ? ` (${r.flag})` : ""}`));
  const referral: [string, string] = [referralSectionTitle, join([
    field("Keputusan", disposition),
    field("Diagnosis kerja", diagnoses("likely")),
    field("Ringkasan klinis", join([field("Keluhan utama", caseData ? recorded(caseData.chiefComplaint) : ""), field("Pasien", demographics), field("Tanda vital", vitals), field("Pemeriksaan fisik", exam), field("Hasil pemeriksaan", results)])),
    field("Pemeriksaan yang disarankan", tests),
    narrative(primary, [["Segera kembali atau dirujuk bila", "rujukan"]]),
  ])];
  const codes = (key: keyof MiraResult["differential"]) => points(result.differential[key].map(d => `${d.icd10} — ${d.label}`));
  const coding: [string, string] = [icd10SectionTitle, join([field("Diagnosis kerja", codes("likely")), field("Alternatif", codes("alternatives")), field("Jangan terlewat", codes("cannotMiss"))]) || "Belum ada kode diagnosis dari data yang ada."];

  const parts: [string, string][] = [
    ["Ringkasan Gejala", join([
      field("Keluhan utama", caseData ? recorded(caseData.chiefComplaint) : ""),
      field("Pasien", demographics),
      field("Anamnesis", join([caseData?.anamnesis.freeText ? recorded(caseData.anamnesis.freeText) : "", ...(caseData?.anamnesis.qa ?? []).map(qa => `${recorded(qa.question)}\n${recorded(qa.answer)}`)])),
      field("Tanda vital", vitals),
      field("Pemeriksaan fisik", exam),
      field("Hasil pemeriksaan", results),
      field("Kondisi yang diketahui", list(caseData?.knownConditions)),
      field("Alergi", list(caseData?.allergies)),
      field("Obat yang sedang digunakan", list(caseData?.currentMedications)),
      field("Data yang perlu dilengkapi", list(result.missingInformation)),
      field("Pertanyaan lanjutan", actions(["question"])),
    ])],
    ["Differential Diagnosis", join([field("Alternatif", diagnoses("alternatives")), field("Jangan terlewat", diagnoses("cannotMiss"))]) || "Tidak ada diagnosis banding."],
    ["Diagnosis", join([
      field("Kemungkinan utama", diagnoses("likely") || "Belum dapat ditetapkan dari data yang ada."),
      ...extra.map(e => field("Temuan terkait", [e.icd10, ...reasons("Mendukung", e.supporting), ...reasons("Menyangkal", e.opposing)].join("\n"))),
      field("Rencana awal", disposition),
      narrative(primary, [["Definisi", "definisi"], ["Gejala khas", "gejala"], ["Kriteria diagnosis", "diagnosis"]]),
    ])],
    ["Penunjang", join([
      tests ? "Perlu" : "Tidak perlu saat ini.",
      field("Pemeriksaan penunjang", tests),
      field("Pemeriksaan fisik yang disarankan", actions(["exam"])),
      field("Kemampuan fasilitas", list(caseData?.facilityCapabilities)),
    ])],
    ["Terapi Farmakologi", regimen || narrative(primary, [["Terapi", "terapi"]]) || "Belum ada data terapi untuk diagnosis ini."],
    ["Edukasi", join([
      narrative(primary, [["Segera kembali atau dirujuk bila", "rujukan"]]) || "Belum ada data edukasi untuk diagnosis ini.",
      diagnosisReferenceMarker,
      regimen ? field("Terapi referensi", narrative(primary, [["Terapi", "terapi"]])) : "",
      field("Kandidat lain", narrative(others, [["Definisi", "definisi"], ["Gejala khas", "gejala"], ["Kriteria diagnosis", "diagnosis"], ["Terapi", "terapi"], ["Rujukan", "rujukan"]])),
      references.map(d => `- ${d.nama} (${d.kode}) · kode hasil analisis: ${[...listedCodes].filter(code => referenceIncludes(d.kode, code)).join(", ")} · ${oracleSource.file} record ${d.id}`).join("\n"),
      `SHA-256 sumber: ${oracleSource.hash}`,
      field("Bidang belum terisi", list(result.unfilled.map(u => `${u.field}: ${u.reason}`))),
      field("Jejak analisis", `Trace: ${traceId}\nWaktu: ${createdAt}\nBiaya (USD): ${result.meta.costUsd ?? "-"}`),
    ])],
  ];
  return ["# Analisis kasus", ...(listedCodes.size ? [] : ["Belum ada kandidat diagnosis dari keluhan ini. Tambahkan anamnesis atau pemeriksaan untuk analisis yang lebih tajam."]), (focus === "workup" ? [parts[3], ...parts.filter((_, i) => i !== 3)] : focus === "refer" ? [referral, ...parts] : focus === "icd10" ? [coding, ...parts] : parts).map(([title, body]) => `## ${title}\n\n${body}`).join("\n\n---\n\n")].join("\n\n");
}

export function diagnosisContent(message: Pick<Message, "content" | "originalContent" | "sourceText"> & Partial<Pick<Message, "mode">>): string {
  // Untouched analysis drafts always show in the current format; edited drafts stay as written.
  if (!hasMiraSource(message) || message.content !== message.originalContent || !message.content.startsWith("# Analisis kasus\n")) return message.content;
  try {
    const source: unknown = JSON.parse(message.sourceText!);
    if (!source || typeof source !== "object" || !("case" in source) || !("result" in source) || !("traceId" in source) || !("createdAt" in source) || !validCase(source.case) || !validResult(source.result) || typeof source.traceId !== "string" || typeof source.createdAt !== "string") return message.content;
    return miraDraft(source.result, source.traceId, source.createdAt, source.case, message.mode ? miraFocus(message.mode) : undefined) + oracleCitations("grounding" in source ? source.grounding : undefined);
  } catch { return message.content; }
}

export function miraMessage(analysis: MiraAnalysis, reviewDefaults?: ReviewItem[], mode: ModeId = "ddx"): Message {
  const content = miraDraft(analysis.result, analysis.traceId, analysis.createdAt, analysis.case, miraFocus(mode)) + oracleCitations(analysis.grounding);
  return { id: newId(), role: "assistant", mode, content, originalContent: content, createdAt: analysis.createdAt, reviewStatus: "draft", reviewItems: freshReview(reviewDefaults), sourceText: JSON.stringify({ kind: "MIRA", contractVersion: "1", ...analysis, oracleSource, review: "belum ditinjau" }, null, 2) };
}
