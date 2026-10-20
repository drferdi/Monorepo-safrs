import { validCase, validResult, type AadiResult, type AadiAnalysis } from "./contract";
import type { CaseState, DifferentialStatus } from "./types";
import { referenceIncludes, theOracleSource, theOracleDiseases, type Disease } from "../theoracle";
import { newId, type Message } from "../workspace";
import { documentSections } from "../studio";
import type { ModeId } from "../drafts";
import { freshReview, type ReviewItem } from "../workflow";
import { validTheOracleGrounding, type TheOracleGroundingBundle } from "../theoracle-grounding-types";
import { applyTherapyGate, gateEvidence, unstrength, validGate, type EvidenceGateReport, type GateStatus } from "../theoracle-evidence-gate";

const gateLine: Record<GateStatus, string> = { verified: "dosis terverifikasi", doseRemoved: "dosis tidak ditemukan di Oracle, cek pedoman", removed: "tidak ditampilkan, indikasi tidak terverifikasi di Oracle" };
const passages = (bundle: TheOracleGroundingBundle) => bundle.evidence.map(item => `- ${item.source.title} [${item.evidenceId}] · kemiripan ${item.similarity}\n  ${item.text}`).join("\n\n");

export function theOracleCitations(grounding: unknown, therapyGrounding?: unknown, gate?: unknown): string {
  if (!validTheOracleGrounding(grounding)) return "";
  const therapy = validTheOracleGrounding(therapyGrounding) ? "\n\nReferensi terapi (dicari memakai diagnosis):\n\n" + passages(therapyGrounding) : "";
  // A verified dose names the guideline it matched; the evidence IDs stay in the stored source.
  const evidence = [grounding, ...(validTheOracleGrounding(therapyGrounding) ? [therapyGrounding] : [])].flatMap(bundle => bundle.evidence);
  const sources = (ids: string[]) => [...new Set(evidence.filter(item => ids.includes(item.evidenceId)).map(item => readableSource(item.source.title)))].join(", ");
  const verification = validGate(gate) ? `\n\n### ${therapyCheckTitle}\n\n` + [gate.reason, ...gate.drugs.map(d => `- ${d.status === "verified" ? d.drug : unstrength(d.drug)}: ${gateLine[d.status]}${d.status === "verified" && sources(d.evidenceIds) ? ` (${sources(d.evidenceIds)})` : ""}`)].filter(Boolean).join("\n") : "";
  // Appended to part 9, which always comes last and ends after the marker, so both sit in its
  // "Referensi dan jejak analisis" fold rather than in parts of their own (Gaffer, 2026-10-20).
  return `\n\n### ${theOracleReferencesTitle}\n\nReferensi yang dipilih sebelum analisis:\n\n` + passages(grounding) + therapy + verification;
}

// The fold text split around the guideline passages, which show as compact titles; null when it has none.
export function splitQuotes(text: string): [string, string, string] | null {
  const start = text.search(new RegExp(`^### ${theOracleReferencesTitle}$`, "m"));
  if (start < 0) return null;
  const body = text.indexOf("\n", start) + 1, end = text.indexOf(`\n\n### ${therapyCheckTitle}\n`, body);
  return [text.slice(0, body), text.slice(body, end < 0 ? undefined : end), end < 0 ? "" : text.slice(end)];
}

// Plain names for the two folds after the report (Gaffer, 2026-10-20: "carikan terms lain").
export const theOracleReferencesTitle = "Kutipan pedoman";
export const therapyCheckTitle = "Cek dosis obat";
// Answers edited before 2026-10-20 keep the passages as a part of their own under this title.
export const legacyTheOracleReferencesTitle = "Referensi TheOracle";
// "infeksi-dengue-pada-dewasa.md" reads as "Infeksi dengue pada dewasa".
export const readableSource = (file: string) => { const name = file.replace(/\.(md|pdf)$/i, "").replace(/[-_]+/g, " ").trim(); return name.charAt(0).toUpperCase() + name.slice(1); };
export interface TheOracleReferenceItem { id: string; title: string; similarity: string; text: string }
// The passages of the "Kutipan pedoman" section, diagnosis then therapy, each passage once; the document text stays as written.
export function theOracleReferenceItems(body: string): TheOracleReferenceItem[] {
  const items = [...body.matchAll(/^- (.+) \[([^\]\n]+)\] · kemiripan ([\d.]+)\r?\n {2}(.*)$/gm)].map(([, title, id, similarity, text]) => ({ id, title, similarity, text: text.trim() }));
  return items.filter((item, index) => items.findIndex(other => other.id === item.id) === index);
}

export function theOracleSourceLinks(message: Pick<Message, "sourceText">) {
  try {
    const source: unknown = JSON.parse(message.sourceText ?? "null");
    if (!source || typeof source !== "object" || !("grounding" in source) || !validTheOracleGrounding(source.grounding)) return [];
    const bundles = [source.grounding, ...("therapyGrounding" in source && validTheOracleGrounding(source.therapyGrounding) ? [source.therapyGrounding] : [])];
    // Diagnosis and therapy retrieval can return the same passage; it is listed once.
    const links = bundles.flatMap(bundle => bundle.evidence.map(item => ({ id: item.evidenceId, label: item.source.title, text: item.text })));
    return links.filter((link, index) => links.findIndex(other => other.id === link.id) === index);
  } catch { return []; }
}

export function hasAadiSource(message: Pick<Message, "sourceText">): boolean {
  if (!message.sourceText) return false;
  try {
    const source: unknown = JSON.parse(message.sourceText);
    return !!source && typeof source === "object" && "kind" in source && source.kind === "AADI" && "contractVersion" in source && source.contractVersion === "1";
  } catch { return false; }
}

// The clinician sees the case as entered, with trace and time; engine metadata stays in the stored source.
export function sourceForDisplay(message: Pick<Message, "sourceText">): string | undefined {
  if (!hasAadiSource(message)) return message.sourceText;
  const source = JSON.parse(message.sourceText!) as { case?: unknown; traceId?: unknown; createdAt?: unknown; grounding?: unknown; therapyGrounding?: unknown };
  return JSON.stringify({ case: source.case, traceId: source.traceId, createdAt: source.createdAt, ...(validTheOracleGrounding(source.grounding) ? { grounding: source.grounding } : {}), ...(validTheOracleGrounding(source.therapyGrounding) ? { therapyGrounding: source.therapyGrounding } : {}) }, null, 2);
}

export type AadiFocus = "workup" | "refer" | "icd10";
export const referralSectionTitle = "Draft Rujukan";
export const icd10SectionTitle = "Kode ICD-10";
export function aadiFocus(mode: ModeId): AadiFocus | undefined { return mode === "workup" || mode === "refer" || mode === "icd10" ? mode : undefined; }

// The nine parts of the clinical report (Gaffer, 2026-10-20: "ini sangat penting"); answers drafted before it used the legacy titles.
export const diagnosisSectionTitles = ["1. Ringkasan kasus", "2. Skrining kegawatan", "3. Anamnesis terarah", "4. Pemeriksaan fisik", "5. Asesmen dan diagnosis banding", "6. Rencana pemeriksaan penunjang", "7. Rencana tata laksana", "8. Edukasi dan tindak lanjut", "9. Referensi dan status verifikasi"];
// The doctor's five answers above part 1 (Gaffer, 2026-10-20, design C1 "Setuju semua"); every line comes from fields
// the report already shows below, in the same wording.
export const doctorSummaryTitle = "Ringkasan untuk dokter";
export const legacyDiagnosisSectionTitles = ["Ringkasan Kasus", "Ringkasan Gejala", "Differential Diagnosis", "Diagnosis", "Penunjang", "Terapi Farmakologi", "Edukasi"];
export const reportTitle = "# LAPORAN ANALISIS KASUS KLINIS";
// Field labels inside the sections, rendered as small headings by the clinical document view.
export const diagnosisFieldLabels = new Set(["Keluhan utama", "Pasien", "Anamnesis", "Tanda vital", "Pemeriksaan fisik", "Hasil pemeriksaan", "Kondisi yang diketahui", "Alergi", "Obat yang sedang digunakan", "Data yang perlu dilengkapi", "Pertanyaan lanjutan", "Alternatif", "Jangan terlewat", "Kemungkinan utama", "Temuan terkait", "Rencana awal", "Definisi", "Gejala khas", "Kriteria diagnosis", "Pemeriksaan penunjang", "Pemeriksaan fisik yang disarankan", "Kemampuan fasilitas", "Terapi", "Segera kembali atau dirujuk bila", "Rujukan", "Kandidat lain", "Terapi referensi", "DDI", "Kontraindikasi", "Bidang belum terisi", "Jejak analisis", "Keputusan", "Diagnosis kerja", "Ringkasan klinis", "Pemeriksaan yang disarankan"]);
export const diagnosisReferenceMarker = "Referensi penyakit terkait";

const recorded = (text: string) => text.split(/\r?\n/).map(line => `  ${line}`).join("\n");
const vitalLabels: Record<string, string> = { systolic: "Sistolik (mmHg)", diastolic: "Diastolik (mmHg)", heartRate: "Nadi (/menit)", respiratoryRate: "Napas (/menit)", temperature: "Suhu (°C)", spo2: "SpO₂ (%)", gcs: "GCS" };
const statusLabels: Record<DifferentialStatus, string> = { unconfirmed: "Belum terkonfirmasi", supported: "Didukung data, belum terkonfirmasi", unlikely: "Kurang mungkin", screenNow: "Perlu disaring segera", screenIfIndicated: "Perlu disaring sesuai temuan" };
const groupStatus = { likely: "Kandidat utama, belum terkonfirmasi", alternatives: "Belum terkonfirmasi", cannotMiss: "Perlu disaring segera" } as const;
const links = {
  cg150: "[NICE CG150](https://www.nice.org.uk/guidance/cg150/chapter/recommendations)",
  ng228: "[NICE NG228](https://www.nice.org.uk/guidance/ng228/chapter/Recommendations)",
  ichd3: "[ICHD-3](https://ichd-3.org/wp-content/uploads/2018/01/The-International-Classification-of-Headache-Disorders-3rd-Edition-2018)",
};

// The template lists of a headache case (Gaffer's 2026-10-20 example) and of any other complaint.
const headachePack = {
  complaint: "nyeri kepala",
  redFlags: ["Nyeri mendadak yang mencapai intensitas maksimal dalam 1–5 menit (*thunderclap headache*).", "Demam, kaku kuduk, atau penurunan kesadaran.", "Defisit neurologis baru, kejang, atau gangguan penglihatan.", "Trauma kepala, perubahan bermakna pola nyeri, atau nyeri yang dipicu aktivitas/mengejan."],
  emergency: `**Jika dicurigai perdarahan subaraknoid, rujuk segera ke IGD.** ${links.cg150}`,
  history: [["Onset", "Kapan mulai? Mendadak atau bertahap? Berapa lama hingga nyeri maksimal?"], ["Pola", "Serangan pertama atau berulang; durasi setiap episode; frekuensi per bulan"], ["Karakteristik", "Berdenyut, menekan/mengikat, terbakar, atau seperti tersengat"], ["Intensitas dan dampak", "Skala nyeri 0–10; gangguan aktivitas dan tidur"], ["Lokasi dan penjalaran", "Unilateral/bilateral; menjalar dari leher atau ke area lain"], ["Gejala penyerta", "Mual, muntah, fotofobia, fonofobia, demam, kaku kuduk, atau kelainan neurologis"], ["Pencetus", "Aktivitas fisik, batuk/mengejan, perubahan posisi, atau gerakan leher"], ["Riwayat relevan", "Trauma, penyakit penyerta, kehamilan/pascapersalinan, serta riwayat nyeri kepala"], ["Obat dan alergi", "Analgesik beserta frekuensi penggunaan, antikoagulan, obat lain, dan alergi"]],
  exam: ["Tanda vital, termasuk tekanan darah dan suhu.", "Tingkat kesadaran dan pemeriksaan neurologis terarah.", "Tanda rangsang meningeal sesuai indikasi.", "Pemeriksaan kepala dan leher: rentang gerak, nyeri tekan, serta ketegangan otot.", "Pemeriksaan mata/funduskopi sesuai indikasi dan kompetensi pemeriksa."],
  workup: [`Bila dicurigai perdarahan subaraknoid, evaluasi rumah sakit mencakup pertimbangan CT kepala nonkontras segera sesuai penilaian klinis. ${links.ng228}`],
  diary: "Bila keluhan berulang, gunakan catatan nyeri kepala untuk mendokumentasikan pola, pencetus, obat, dan respons.",
};
const generalPack: typeof headachePack = {
  complaint: "keluhan",
  redFlags: ["Gangguan jalan napas, sesak berat, atau saturasi oksigen rendah.", "Tanda syok atau tanda vital yang tidak stabil.", "Penurunan kesadaran, kejang, atau defisit neurologis baru.", "Nyeri dada, nyeri hebat yang mendadak, atau perdarahan aktif.", "Demam tinggi dengan tanda sepsis, atau perburukan yang cepat."],
  emergency: "**Bila ada tanda kegawatan, stabilkan dan rujuk segera ke IGD.**",
  history: [["Onset", "Kapan mulai? Mendadak atau bertahap?"], ["Perjalanan dan pola", "Pertama kali atau berulang; durasi; frekuensi; memberat atau membaik"], ["Karakteristik", "Sifat, lokasi, penjalaran, dan intensitas keluhan"], ["Gejala penyerta", "Demam, gejala sistemik, dan keluhan organ terkait"], ["Pencetus dan pereda", "Aktivitas, posisi, makanan, obat, atau faktor lain"], ["Riwayat relevan", "Penyakit penyerta, trauma, kehamilan/pascapersalinan, dan riwayat keluhan serupa"], ["Obat dan alergi", "Obat yang digunakan beserta frekuensinya, antikoagulan, dan alergi"]],
  exam: ["Tanda vital, termasuk tekanan darah, nadi, napas, suhu, dan saturasi oksigen.", "Keadaan umum dan tingkat kesadaran.", "Pemeriksaan fisik terarah sesuai keluhan utama.", "Pemeriksaan sistem terkait untuk menyaring diagnosis yang tidak boleh terlewat."],
  workup: [],
  diary: "Bila keluhan berulang, catat pola, pencetus, obat, dan respons terhadap pengobatan.",
};
const headacheCodes = /^(?:R51|G43|G44|I60|G03|G00)/;
const headacheWords = /nyeri kepala|sakit kepala|kepala (?:terasa )?(?:sakit|nyeri|pusing)|cephal|headache|migr[ae]in/i;

/** A markdown table; a cell holds one line, and a "|" in case text is escaped. */
const cell = (text: string) => text.replace(/\s*\r?\n\s*/g, " ").replace(/\|/g, "\\|").trim() || "—";
const table = (head: string[], rows: string[][]) => [head.map(cell), head.map(() => "---"), ...rows.map(row => row.map(cell))].map(row => `| ${row.join(" | ")} |`).join("\n");
const bullets = (items: string[]) => items.map(item => `- ${item}`).join("\n");

export function aadiDraft(result: AadiResult, traceId: string, createdAt: string, caseData?: CaseState, focus?: AadiFocus, gate?: EvidenceGateReport): string {
  // Bullets only where there are several points; a single point stays a plain line.
  const points = (items: string[], indent = "") => items.length > 1 ? items.map(item => `${indent}- ${item}`).join("\n") : items.length ? `${indent}${items[0]}` : "";
  const list = (items: string[] | undefined) => points((items ?? []).map(item => recorded(item).trimStart()));
  const field = (label: string, body: string) => body ? `${label}\n${body}` : "";
  const bold = (label: string, body: string) => body ? `**${label}**\n${body}` : "";
  const join = (parts: string[]) => parts.filter(Boolean).join("\n\n");
  const actionsOf = (kind: string) => result.nextBestActions.filter(a => a.kind === kind);
  const actions = (kinds: string[]) => list(result.nextBestActions.filter(a => kinds.includes(a.kind)).map(a => `${a.item} — ${a.reason}`));
  const reasons = (label: string, items: string[]) => items.length > 1 ? [`  ${label}:`, points(items, "  ")] : items.length ? [`  ${label}: ${items[0]}`] : [];
  const evidenceOf = (code: string) => result.evidence.filter(e => e.icd10.toUpperCase() === code.toUpperCase());
  const diagnoses = (key: keyof AadiResult["differential"]) => result.differential[key].map((d, _, group) => {
    const evidence = evidenceOf(d.icd10);
    return [`${group.length > 1 ? "- " : ""}${d.label} (${d.icd10})`, ...reasons("Mendukung", evidence.flatMap(e => e.supporting)), ...reasons("Menyangkal", evidence.flatMap(e => e.opposing))].join("\n");
  }).join("\n\n");
  const therapy = result.therapy?.regimen.length ? result.therapy : undefined;
  const regimen = therapy && join([
    `Untuk ${therapy.forDiagnosis.label} (${therapy.forDiagnosis.icd10})`,
    points(therapy.regimen.map(r => [r.drug, r.dose || "dosis: cek pedoman", r.route, r.duration].filter(Boolean).join(" ") + (r.note ? ` (${r.note})` : ""))),
    field("DDI", points(therapy.interactions)),
    field("Kontraindikasi", points(therapy.contraindications)),
  ]);

  const listedCodes = new Set(Object.values(result.differential).flat().map(d => d.icd10.toUpperCase()));
  const extra = result.evidence.filter(e => !listedCodes.has(e.icd10.toUpperCase()));
  const references = theOracleDiseases.filter(d => [...listedCodes].some(code => referenceIncludes(d.kode, code)));
  // Narratives follow the most likely group that has database records: likely, then alternatives, then cannotMiss.
  const primary = (["likely", "alternatives", "cannotMiss"] as const).map(key => references.filter(d => result.differential[key].some(item => referenceIncludes(d.kode, item.icd10.toUpperCase())))).find(group => group.length) ?? [];
  const others = references.filter(d => !primary.includes(d));
  const narrative = (diseases: Disease[], fields: [label: string, name: "definisi" | "gejala" | "diagnosis" | "terapi" | "rujukan"][]) => diseases.map(d => [`### ${d.nama} (${d.kode})`, ...fields.map(([label, name]) => field(label, name === "gejala" ? d.gejala.map(item => `- ${item}`).join("\n") : d[name]))].join("\n\n")).join("\n\n");
  const tests = actions(["test"]);
  // Oracle's Indonesian name where a record has exactly this code (a "G44" record never renames G44.2); else AADI's label.
  const named = (d: { icd10: string; label: string }) => `${theOracleDiseases.find(r => r.kode.toUpperCase() === d.icd10.toUpperCase())?.nama ?? d.label} (${d.icd10})`;
  const demographics = [caseData?.demographics.ageYears == null ? "" : `${caseData.demographics.ageYears} tahun`, caseData?.demographics.sex === "M" ? "Laki-laki" : caseData?.demographics.sex === "F" ? "Perempuan" : "", caseData?.demographics.pregnant === undefined ? "" : `Hamil: ${caseData.demographics.pregnant ? "Ya" : "Tidak"}`].filter(Boolean).join(" · ");
  const disposition = result.disposition ? `${result.disposition.decision === "refer" ? "Rujuk" : "Tangani di FKTP"} · ${{ routine: "rutin", urgent: "segera", emergency: "gawat darurat" }[result.disposition.urgency]}` : "";

  const vitalItems = caseData ? Object.entries(caseData.vitals).map(([key, value]) => `${vitalLabels[key] ?? key}: ${value}`) : [];
  const resultItems = caseData?.results.map(r => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ""}${r.flag ? ` (${r.flag})` : ""}`) ?? [];
  const vitals = list(vitalItems), exam = list(caseData?.physicalExam), results = list(resultItems);
  const referral: [string, string] = [referralSectionTitle, join([
    field("Keputusan", disposition),
    field("Diagnosis kerja", diagnoses("likely")),
    field("Ringkasan klinis", join([field("Keluhan utama", caseData ? recorded(caseData.chiefComplaint) : ""), field("Pasien", demographics), field("Tanda vital", vitals), field("Pemeriksaan fisik", exam), field("Hasil pemeriksaan", results)])),
    field("Pemeriksaan yang disarankan", tests),
    narrative(primary, [["Segera kembali atau dirujuk bila", "rujukan"]]),
  ])];
  const codes = (key: keyof AadiResult["differential"]) => points(result.differential[key].map(d => `${d.icd10} — ${d.label}`));
  const coding: [string, string] = [icd10SectionTitle, listedCodes.size ? join([field("Diagnosis kerja", codes("likely")), field("Alternatif", codes("alternatives")), field("Jangan terlewat", codes("cannotMiss")), "Kode belum final; ditetapkan setelah asesmen dokter."]) : "Belum ada kode diagnosis dari data yang ada."];

  // Headache cases get the headache lists; any other complaint gets the general ones.
  const complaintText = [caseData?.chiefComplaint ?? "", caseData?.anamnesis.freeText ?? ""].join(" ");
  const headache = headacheWords.test(complaintText) || [...listedCodes].some(code => headacheCodes.test(code));
  const pack = headache ? headachePack : generalPack;
  const likely = result.differential.likely;
  const candidates = likely.map(named).join("; ");
  // The composer labels the patient's saved notes "Catatan kasus" inside the history; they show as their own row.
  const [historyText, patientNotes = ""] = (caseData?.anamnesis.freeText ?? "").split(/(?:^|\n\n)Catatan kasus\n/);
  const anamnesis = [historyText.replace(/^Konteks Encounter\n/, "").trim(), ...(caseData?.anamnesis.qa ?? []).map(qa => `${qa.question.trim()}: ${qa.answer.trim()}`)].filter(Boolean).join("; ");
  const findings = [vitalItems.length ? `Tanda vital: ${vitalItems.join("; ")}` : "", ...(caseData?.physicalExam ?? [])].filter(Boolean);
  const incomplete = result.missingInformation.length > 0;
  const historyRows = [...actionsOf("question").map(a => [a.item, a.reason]), ...result.missingInformation.map(item => [item, "Belum tercatat; dapat mengubah asesmen"])];
  const discriminators = (code: string) => {
    const evidence = evidenceOf(code), supporting = evidence.flatMap(e => e.supporting), opposing = evidence.flatMap(e => e.opposing);
    return [supporting.length ? `Mendukung: ${supporting.join("; ")}` : "", opposing.length ? `Menyangkal: ${opposing.join("; ")}` : ""].filter(Boolean).join(". ") || "Belum tersedia";
  };
  // AADI's discriminators are what to look for, not recorded findings (Gaffer, 2026-10-20: "Ya, awali 'cari:'").
  const toSeek = (text: string) => /^cari:/i.test(text) ? text : `cari: ${text}`;
  const differentialRows = (["likely", "alternatives", "cannotMiss"] as const).flatMap(key => result.differential[key].map(d => [named(d), d.discriminators?.trim() ? toSeek(d.discriminators.trim()) : discriminators(d.icd10), d.status ? statusLabels[d.status] : groupStatus[key]]));
  const extraRows = extra.map(e => [`Temuan terkait (${e.icd10})`, discriminators(e.icd10), "Di luar diagnosis banding"]);
  const verified = gate?.drugs.filter(d => d.status === "verified").length ?? 0;
  const gateStatus = !gate ? "Belum dapat dinilai" : gate.therapyRemoved ? "Terapi tidak ditampilkan" : `${verified} dari ${gate.drugs.length} obat dosisnya terverifikasi`;
  const headacheUse = headache ? "" : " (relevan bila keluhan berupa nyeri kepala)";

  const parts: [string, string][] = [
    [diagnosisSectionTitles[0], table(["Komponen", "Keterangan"], [
      ["Keluhan utama", caseData?.chiefComplaint.trim() || "Belum tersedia"],
      ["Identitas klinis", demographics || "Usia, jenis kelamin, dan status kehamilan/pascapersalinan belum tersedia"],
      ["Riwayat penyakit sekarang", anamnesis || `Onset, durasi, frekuensi, karakter ${pack.complaint}, dan gejala penyerta belum tersedia`],
      ...(patientNotes.trim() ? [["Catatan pasien", patientNotes.trim()]] : []),
      ["Pemeriksaan fisik", findings.join("; ") || "Belum tersedia"],
      ...(resultItems.length ? [["Hasil pemeriksaan", resultItems.join("; ")]] : []),
      ...(caseData?.knownConditions.length ? [["Kondisi yang diketahui", caseData.knownConditions.join("; ")]] : []),
      ...(caseData?.allergies.length ? [["Alergi", caseData.allergies.join("; ")]] : []),
      ...(caseData?.currentMedications.length ? [["Obat yang sedang digunakan", caseData.currentMedications.join("; ")]] : []),
      ["Asesmen awal", candidates ? `Kandidat AADI: ${candidates}; belum terkonfirmasi` : `${headache ? "Nyeri kepala" : "Keluhan"} dengan penyebab belum ditentukan`],
      ["Keterbatasan", incomplete ? "Data belum memadai untuk menetapkan diagnosis spesifik dan terapi individual" : "Draf dari data yang dimasukkan; memerlukan asesmen dokter"],
    ])],
    [diagnosisSectionTitles[1], join([
      "**Status tanda bahaya: belum dinilai.** Data yang belum tersedia tidak boleh dicatat sebagai temuan negatif.",
      `Prioritaskan penilaian terhadap:\n${bullets(generalPack.redFlags)}`,
      headache ? `Khusus nyeri kepala:\n${bullets(headachePack.redFlags)}` : "",
      `Tanda tersebut memerlukan evaluasi segera dan pertimbangan pemeriksaan lanjutan atau rujukan. ${generalPack.emergency}${headache ? ` ${headachePack.emergency}` : ""}`,
      bold("Diagnosis yang tidak boleh terlewat menurut AADI:", bullets(result.differential.cannotMiss.map(d => `${d.label} (${d.icd10})`))),
      disposition ? `**Saran disposisi AADI:** ${disposition}` : "",
    ])],
    // Parts 3 and 4 come from what AADI asks for in this case; the template list stands in only when it asks for nothing.
    [diagnosisSectionTitles[2], historyRows.length
      ? table(["Data yang perlu dilengkapi", "Alasan"], historyRows)
      : `Aspek yang perlu dilengkapi (AADI belum memberi data untuk kasus ini):\n\n${table(["Aspek", "Data yang perlu dilengkapi"], pack.history)}`],
    [diagnosisSectionTitles[3], join([
      findings.length ? bold("Temuan aktual:", bullets(findings)) : "**Temuan aktual: belum tersedia.**",
      actionsOf("exam").length ? bold("Pemeriksaan terarah dari AADI:", bullets(actionsOf("exam").map(a => `${a.item} — ${a.reason}`))) : `Pemeriksaan yang perlu didokumentasikan:\n${bullets(pack.exam)}`,
    ])],
    [diagnosisSectionTitles[4], join([
      `**Diagnosis kerja sementara:** ${candidates ? `kandidat AADI ${candidates}, belum terkonfirmasi.` : "belum dapat ditetapkan dari data yang ada."}`,
      differentialRows.length || extraRows.length ? table(["Diagnosis banding", "Data pembeda yang perlu dicari", "Status"], [...differentialRows, ...extraRows]) : "",
      `**Catatan penalaran:** ${result.reasoningNote?.trim() || "belum tersedia untuk analisis ini."}`,
      `**Kode ICD-10:** ${likely.length ? `${likely.map(d => d.icd10).join(", ")} (kandidat); belum final, ditetapkan setelah asesmen dokter.` : "ditentukan setelah asesmen dokter; kode diagnosis spesifik pada draf awal belum dapat dianggap final."}`,
      primary.length ? diagnosisReferenceMarker : "",
      narrative(primary, [["Definisi", "definisi"], ["Gejala khas", "gejala"], ["Kriteria diagnosis", "diagnosis"]]),
    ])],
    [diagnosisSectionTitles[5], join([
      `**Keputusan: berdasarkan hasil anamnesis, pemeriksaan fisik, dan skrining tanda bahaya.**${tests ? "" : " AADI belum mengusulkan pemeriksaan penunjang."}`,
      tests ? table(["Pemeriksaan", "Indikasi klinis", "Pertimbangan AADI"], actionsOf("test").map(a => [a.item, a.indication?.trim() || "Belum tersedia; tuliskan indikasi klinisnya", a.reason])) : "",
      bullets(["Pemeriksaan darah rutin tidak otomatis ditetapkan sebagai pemeriksaan wajib; tuliskan indikasi klinisnya.", ...pack.workup, "Dokumentasikan alasan pemeriksaan, hasil, dan implikasinya terhadap keputusan klinis."]),
      caseData?.facilityCapabilities.length ? `**Kemampuan fasilitas:** ${caseData.facilityCapabilities.join(", ")}` : "",
    ])],
    [diagnosisSectionTitles[6], join([
      `**Status: belum difinalisasi${incomplete ? " karena data klinis belum lengkap" : " sebelum diverifikasi dokter"}.**`,
      regimen ? "**Usulan terapi dari AADI:**" : primary.length ? "**Terapi referensi Oracle:**" : "",
      gate?.therapyRemoved ? join([`Terapi tidak ditampilkan: ${gate.reason}`, regimen || narrative(primary, [["Terapi", "terapi"]])]) : regimen || narrative(primary, [["Terapi", "terapi"]]) || "Belum ada data terapi untuk diagnosis ini.",
      `**Catatan terapi draf awal:** ${therapy ? `${therapy.regimen.map(r => r.drug).join(", ")} tercantum sebagai usulan. ` : ""}Dosis individual, interval, batas harian, interaksi obat, dan kontraindikasi perlu diverifikasi sebelum dijadikan instruksi pengobatan. Kutipan dosis tunggal tidak memverifikasi keseluruhan regimen.`,
      table(["Komponen", "Dokumentasi"], [["Penanganan awal", "Ditentukan berdasarkan kondisi pasien dan hasil skrining kegawatan"], ["Terapi farmakologis", "Nama obat, indikasi, dosis, rute, interval, durasi, dan batas dosis"], ["Pemeriksaan keamanan", "Usia/berat badan, alergi, fungsi hati/ginjal, kehamilan, obat penyerta"], ["Interaksi dan kontraindikasi", "Cantumkan sumber verifikasi dan relevansinya pada pasien"], ["Evaluasi respons", "Skala keluhan, fungsi, efek samping, dan waktu evaluasi ulang"]]),
      regimen && primary.length ? diagnosisReferenceMarker : "",
      regimen ? field("Terapi referensi", narrative(primary, [["Terapi", "terapi"]])) : "",
    ])],
    [diagnosisSectionTitles[7], join([
      bullets([`Jelaskan bahwa penyebab ${pack.complaint} masih dalam evaluasi.`, "Berikan instruksi tanda bahaya dan tempat mencari pertolongan.", pack.diary, "Tentukan jadwal kontrol serta kriteria kembali lebih cepat berdasarkan hasil asesmen."]),
      narrative(primary, [["Segera kembali atau dirujuk bila", "rujukan"]]),
    ])],
    [diagnosisSectionTitles[8], join([
      table(["Sumber", "Penggunaan", "Status"], [
        [links.cg150, `Asesmen nyeri kepala dan tanda bahaya${headacheUse}`, "Rujukan tetap laporan"],
        [links.ng228, `Kecurigaan perdarahan subaraknoid dan rujukan${headacheUse}`, "Rujukan tetap laporan"],
        [links.ichd3, `Klasifikasi dan karakteristik nyeri kepala${headacheUse}`, "Rujukan tetap laporan"],
        [`Kutipan pedoman Oracle, bila ada (di "Referensi dan jejak analisis")`, "Bahan pendukung dari draf awal", "Dokumen lengkap belum diperiksa"],
        ["Database penyakit Oracle", "Definisi, kriteria, terapi, dan rujukan kandidat", references.length ? `${references.length} catatan cocok dengan kode hasil analisis` : "Tidak ada catatan yang cocok"],
        [`${therapyCheckTitle} (Oracle)`, "Dosis dan indikasi usulan terapi", gateStatus],
      ]),
      // Gaffer's wording, 2026-10-20; it replaces the audit note and the reviewer block.
      "Penelusuran referensi dan penalaran diagnostik disusun secara sistematis dengan mengintegrasikan bukti ilmiah, pedoman praktik klinis, dan temuan pasien. Alur analisis mencakup identifikasi tanda bahaya, evaluasi diagnosis banding, serta penilaian kesesuaian pemeriksaan dan terapi untuk mendukung pengambilan keputusan klinis yang terarah dan dapat ditelusuri.",
      diagnosisReferenceMarker,
      field("Kandidat lain", narrative(others, [["Definisi", "definisi"], ["Gejala khas", "gejala"], ["Kriteria diagnosis", "diagnosis"], ["Terapi", "terapi"], ["Rujukan", "rujukan"]])),
      references.map(d => `- ${d.nama} (${d.kode}) · kode hasil analisis: ${[...listedCodes].filter(code => referenceIncludes(d.kode, code)).join(", ")} · ${theOracleSource.file} record ${d.id}`).join("\n"),
      `SHA-256 sumber: ${theOracleSource.hash}`,
      field("Bidang belum terisi", list(result.unfilled.map(u => `${u.field}: ${u.reason}`))),
      field("Jejak analisis", `Trace: ${traceId}\nWaktu: ${createdAt}\nBiaya (USD): ${result.meta.costUsd ?? "-"}`),
    ])],
  ];
  const gateText = gate?.therapyRemoved ? `Terapi tidak ditampilkan: ${gate.reason}` : "";
  const therapyLine = therapy && !gate?.therapyRemoved ? `${therapy.regimen.map(r => [r.drug, r.dose || "dosis: cek pedoman", r.route, r.duration].filter(Boolean).join(" ")).join("; ")} — untuk ${named(therapy.forDiagnosis)}` : "";
  const checks = [...actionsOf("test").slice(0, 2), ...actionsOf("exam").slice(0, 2)].map(a => a.item);
  const summary: [string, string] = [doctorSummaryTitle, [
    `**Perlu disaring segera:** ${result.differential.cannotMiss.length ? `${result.differential.cannotMiss.map(named).join("; ")}. ` : ""}Status tanda bahaya: belum dinilai (bagian 2).`,
    `**Diagnosis kerja (kandidat, belum terkonfirmasi):** ${candidates || "belum dapat ditetapkan dari data yang ada."}`,
    `**Periksa:** ${checks.length ? checks.join("; ") : "lihat bagian 3 dan 4."}`,
    `**Terapi usulan:** ${gateText || therapyLine || "lihat bagian 7."}`,
    `**Rujuk:** ${disposition || "belum dinilai."}`,
  ].join("\n\n")];
  // The doctor's summary comes first, then the mode's focus; every part keeps its number.
  const ordered = focus === "workup" ? [parts[5], ...parts.filter((_, i) => i !== 5)] : focus === "refer" ? [referral, ...parts] : focus === "icd10" ? [coding, ...parts] : parts;
  return [reportTitle, "**Draf analisis AADI (Augmented Artificial Intelligence Diagnosis Integration) • Untuk tinjauan dokter**", ...(listedCodes.size ? [] : ["Belum ada kandidat diagnosis dari keluhan ini. Tambahkan anamnesis atau pemeriksaan untuk analisis yang lebih tajam."]), [summary, ...ordered].map(([title, body]) => `## ${title}\n\n${body}`).join("\n\n---\n\n")].join("\n\n");
}

// What the answer card offers to copy (design D1, D2), read from the summary as currently written, so an edit is copied as edited.
export function summaryCopies(content: string): { summary: string; codes: { code: string; text: string }[]; therapy: string } | null {
  const body = documentSections(content).find(section => section.title === doctorSummaryTitle)?.body.trim();
  if (!body) return null;
  const lines = body.split(/\n+/).map(line => line.replace(/\*\*/g, "").trim()).filter(Boolean);
  const codes = lines.filter(line => /^(?:Perlu disaring segera|Diagnosis kerja)/.test(line)).flatMap(line => [...line.slice(line.indexOf(":") + 1).matchAll(/([^;.]+?) \(([A-Z]\d{2}(?:\.\d{1,2})?)\)/g)].map(([, name, code]) => ({ code, text: `${code} — ${name.trim()}` })));
  const therapy = lines.find(line => line.startsWith("Terapi usulan:"))?.slice("Terapi usulan:".length).trim() ?? "";
  return { summary: [doctorSummaryTitle, ...lines].join("\n"), codes: codes.filter((item, index) => codes.findIndex(other => other.code === item.code) === index), therapy: /^lihat bagian/.test(therapy) ? "" : therapy };
}

// A referral letter prefilled from the analysis (design D4): labelled lines the local referral draft understands; the
// destination and request stay for the doctor. Nothing is inferred beyond what the case and AADI's candidates say.
export function referralPrompt(message: Pick<Message, "sourceText">): string {
  if (!hasAadiSource(message)) return "";
  const source: unknown = JSON.parse(message.sourceText!);
  if (!source || typeof source !== "object" || !("case" in source) || !("result" in source) || !validCase(source.case) || !validResult(source.result)) return "";
  const data = source.case, likely = source.result.differential.likely.map(d => `${d.label} (${d.icd10})`).join("; ");
  const [history, notes = ""] = (data.anamnesis.freeText ?? "").split(/(?:^|\n\n)Catatan kasus\n/);
  const person = [data.demographics.ageYears == null ? "" : `${data.demographics.ageYears} tahun`, data.demographics.sex === "M" ? "laki-laki" : data.demographics.sex === "F" ? "perempuan" : ""].filter(Boolean).join(", ");
  const story = [person, history.replace(/^Konteks Encounter\n/, "").trim(), notes.trim()].filter(Boolean).join(". ").replace(/\s*\n\s*/g, " ");
  const exam = [...Object.entries(data.vitals).map(([key, value]) => `${vitalLabels[key] ?? key} ${value}`), ...data.physicalExam, ...data.results.map(r => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ""}`)].join("; ");
  return [
    `Keluhan utama: ${data.chiefComplaint.trim()}${likely ? `. Diagnosis kerja (kandidat AADI, belum terkonfirmasi): ${likely}` : ""}`,
    story ? `Riwayat penyakit sekarang: ${story}` : "",
    exam ? `Pemeriksaan fisik: ${exam}` : "",
    data.currentMedications.length ? `Terapi sebelumnya: ${data.currentMedications.join("; ")}` : "",
    "Permintaan: ",
    "Penerima: ",
  ].filter(Boolean).join("\n");
}

type ContentSource = Pick<Message, "content" | "originalContent" | "sourceText"> & Partial<Pick<Message, "mode">>;
// Every render asks for each card's view; parsing the source and re-running the gate once per unchanged message is enough.
const derived = new WeakMap<ContentSource, { content: string; originalContent?: string; sourceText?: string; mode?: string; view: string }>();

export function diagnosisContent(message: ContentSource): string {
  const hit = derived.get(message);
  if (hit && hit.content === message.content && hit.originalContent === message.originalContent && hit.sourceText === message.sourceText && hit.mode === message.mode) return hit.view;
  const view = deriveContent(message);
  derived.set(message, { content: message.content, originalContent: message.originalContent, sourceText: message.sourceText, mode: message.mode, view });
  return view;
}

function deriveContent(message: ContentSource): string {
  // Untouched analysis drafts always show in the current format; edited drafts stay as written.
  if (!hasAadiSource(message) || message.content !== message.originalContent || ![`${reportTitle}\n`, "# Analisis kasus\n"].some(title => message.content.startsWith(title))) return message.content;
  try {
    const source: unknown = JSON.parse(message.sourceText!);
    if (!source || typeof source !== "object" || !("case" in source) || !("result" in source) || !("traceId" in source) || !("createdAt" in source) || !validCase(source.case) || !validResult(source.result) || typeof source.traceId !== "string" || typeof source.createdAt !== "string") return message.content;
    const grounding = "grounding" in source ? source.grounding : undefined;
    const therapyGrounding = "therapyGrounding" in source ? source.therapyGrounding : undefined;
    const stored = "evidenceGate" in source && validGate(source.evidenceGate) ? source.evidenceGate : undefined;
    // Saved therapy is gated again with the current gate against its stored bundle, as the gateway does: a draft saved before
    // the gate holds the model's doses unchecked, and an earlier gate may have verified a dose a later one rejects.
    const { result, gate } = applyTherapyGate(source.result, gateEvidence(therapyGrounding, grounding), stored);
    return aadiDraft(result, source.traceId, source.createdAt, source.case, message.mode ? aadiFocus(message.mode) : undefined, gate) + theOracleCitations(grounding, therapyGrounding, gate);
  } catch { return message.content; }
}

export function aadiMessage(analysis: AadiAnalysis, reviewDefaults?: ReviewItem[], mode: ModeId = "ddx"): Message {
  const content = aadiDraft(analysis.result, analysis.traceId, analysis.createdAt, analysis.case, aadiFocus(mode), analysis.evidenceGate) + theOracleCitations(analysis.grounding, analysis.therapyGrounding, analysis.evidenceGate);
  return { id: newId(), role: "assistant", mode, content, originalContent: content, createdAt: analysis.createdAt, reviewStatus: "draft", reviewItems: freshReview(reviewDefaults), sourceText: JSON.stringify({ kind: "AADI", contractVersion: "1", ...analysis, theOracleSource, review: "belum ditinjau" }) };
}
