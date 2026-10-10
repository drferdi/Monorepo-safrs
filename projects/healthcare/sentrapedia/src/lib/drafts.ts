import type { Patient } from "./workspace";
import { structureNote, type NoteField } from "./note-structure";

export const modeIds = ["question", "ddx", "ap", "clinic", "hpi", "telephone", "chronic", "handoff", "tasks", "avs", "education", "referral", "authorization", "scribe", "workup", "refer", "monitoring", "icd10"] as const;
export type ModeId = typeof modeIds[number];
export const modes: { id: ModeId; label: string; title: string; description: string; placeholder: string }[] = [
  { id: "hpi", label: "Anamnesis (HPI)", title: "History of present illness", description: "Susun riwayat Presenting Concern.", placeholder: "Jelaskan Onset, Duration, Course, dan Associated Symptoms..." },
  { id: "clinic", label: "Catatan Klinis (SOAP)", title: "Catatan Klinis", description: "Susun Catatan Klinis dari detail klinis yang diberikan.", placeholder: "Tambahkan History, Examination, Assessment, dan Plan..." },
  { id: "ddx", label: "Diagnosis Banding (DDx)", title: "Differential diagnosis", description: "Atur temuan dan susun lembar Differential Diagnosis.", placeholder: "Jelaskan Presentation, History, dan temuan utama..." },
  { id: "ap", label: "Asesmen dan Rencana (A&P)", title: "Assessment & plan", description: "Susun Assessment menjadi Plan terstruktur.", placeholder: "Masukkan Assessment dan usulan Management..." },
  { id: "scribe", label: "Catatan Scribe", title: "Scribed encounter note", description: "Susun transkrip Encounter menjadi draf yang dapat diedit.", placeholder: "Tempel percakapan Encounter atau mulai dikte..." },
  { id: "workup", label: "Pemeriksaan Penunjang", title: "Diagnostic workup", description: "Analisis kasus dengan pemeriksaan penunjang yang disarankan di bagian atas.", placeholder: "Jelaskan keluhan, temuan, dan pemeriksaan yang sudah ada..." },
  { id: "icd10", label: "Pengodean Diagnosis (ICD-10)", title: "Kode ICD-10", description: "Analisis kasus dengan kode ICD-10 diagnosis di bagian atas.", placeholder: "Jelaskan keluhan, temuan, dan diagnosis yang ingin dikodekan..." },
  { id: "chronic", label: "Catatan Penyakit Kronis", title: "Chronic care note", description: "Dokumentasikan Longitudinal Care dan Follow-up yang belum selesai.", placeholder: "Tuliskan kondisi, perubahan Interval, dan Care Goals..." },
  { id: "monitoring", label: "Pemantauan Klinis", title: "Rencana monitoring", description: "Susun rencana pemantauan: parameter, target, frekuensi, dan kriteria eskalasi.", placeholder: "Tuliskan masalah, parameter yang dipantau, target, dan frekuensinya..." },
  { id: "avs", label: "Ringkasan Kunjungan", title: "After-visit summary", description: "Susun ringkasan untuk Pasien yang akan ditinjau Clinician.", placeholder: "Masukkan pembahasan dan instruksi yang disepakati..." },
  { id: "education", label: "Edukasi Pasien", title: "Edukasi Pasien", description: "Atur informasi yang ingin dibagikan kepada Pasien.", placeholder: "Masukkan topik dan materi edukasi yang telah disetujui..." },
  { id: "telephone", label: "Catatan Konsultasi Telepon", title: "Telephone encounter", description: "Dokumentasikan percakapan telepon dan langkah yang disepakati.", placeholder: "Jelaskan percakapan, hal yang dibahas, dan langkah berikutnya..." },
  { id: "tasks", label: "Daftar Tugas Klinis", title: "Encounter task list", description: "Susun langkah yang diberikan menjadi daftar tugas dengan checklist.", placeholder: "Masukkan tugas Follow-up, satu per baris..." },
  { id: "referral", label: "Surat Rujukan", title: "Surat rujukan", description: "Susun surat rujukan dari informasi klinis yang diberikan.", placeholder: "Masukkan tujuan rujukan, alasan rujukan, dan temuan relevan..." },
  { id: "refer", label: "Telaah Rujukan", title: "Draft rujukan", description: "Analisis kasus dengan draf rujukan dan keputusan disposisi di bagian atas.", placeholder: "Jelaskan keluhan, temuan, dan alasan mempertimbangkan rujukan..." },
  { id: "handoff", label: "Serah Terima Klinis (SBAR)", title: "Clinical handoff", description: "Susun ringkasan Transfer of Care terstruktur.", placeholder: "Jelaskan Situation, Background, Assessment, dan tugas tertunda..." },
  { id: "question", label: "Pertanyaan Klinis (PICO)", title: "Clinical question brief", description: "Susun pertanyaan Clinical dan tentukan Evidence yang dibutuhkan.", placeholder: "Apa yang ingin Anda telaah hari ini?" },
  { id: "authorization", label: "Persetujuan Penjaminan (Prior Authorization)", title: "Prior authorization", description: "Susun permintaan penjaminan dengan detail pendukung.", placeholder: "Masukkan layanan, Clinical Indication, dan Previous Treatments..." },
];

export interface DraftInput { mode: ModeId; prompt: string; context: string; specialty: string; model: "Standard" | "Extended"; language: "English" | "Bahasa Indonesia"; patient?: Patient; instructions: string }

export function createDraft(input: DraftInput): string {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Tambahkan pertanyaan atau konteks Clinical terlebih dahulu.");
  const mode = modes.find((m) => m.id === input.mode)!;
  const id = input.language === "Bahasa Indonesia";
  const missing = id ? "Belum tersedia — lengkapi dan verifikasi oleh klinisi." : "Not provided — complete and verify with the clinician.";
  const sections: Record<ModeId, string[]> = {
    question: id ? ["Pertanyaan Clinical", "Populasi / konteks", "Intervention dan Comparator", "Luaran yang ingin diketahui", "Sumber dan tanggal pedoman yang perlu diverifikasi"] : ["Clinical question", "Population / setting", "Intervention and comparison", "Outcomes of interest", "Guideline sources and publication dates to verify"],
    ddx: id ? ["Temuan yang disampaikan", "Differential Diagnosis untuk ditinjau Clinician", "Temuan pendukung / penyangkal", "Informasi dan pemeriksaan yang belum tersedia", "Prioritas penilaian oleh klinisi"] : ["Supplied findings", "Candidate diagnoses to be entered by clinician", "Supporting / opposing findings", "Missing history and examination", "Clinician review priorities"],
    ap: id ? ["Assessment", "Problem list", "Investigations", "Management", "Follow-up"] : ["Assessment", "Problem list", "Investigations", "Management", "Follow-up"],
    clinic: id ? ["Keluhan Utama", "Riwayat Penyakit", "Riwayat Pengobatan / Alergi", "Pemeriksaan Fisik", "Assessment", "Tata Laksana"] : ["Chief concern", "History of present illness", "Relevant history / medications / allergies", "Examination", "Assessment", "Plan"],
    hpi: id ? ["Presenting history", "Onset dan Duration", "Location / Character / Severity", "Associated symptoms", "Aggravating / Relieving factors", "Pertinent negatives"] : ["Presenting history", "Onset and duration", "Location / character / severity", "Associated symptoms", "Aggravating / relieving factors", "Pertinent negatives"],
    telephone: id ? ["Ringkasan telepon", "Penelepon dan hubungan", "Keluhan yang dibahas", "Saran yang diberikan klinisi", "Tindak lanjut yang disepakati"] : ["Call summary", "Caller and relationship", "Concerns discussed", "Advice supplied by clinician", "Agreed follow-up"],
    chronic: id ? ["Interval history", "Active conditions", "Medication review", "Care goals", "Monitoring dan Follow-up"] : ["Interval history", "Active conditions", "Medication review", "Care goals", "Monitoring and follow-up"],
    handoff: id ? ["Situation", "Background", "Assessment", "Recommendation", "Hasil tertunda / penanggung jawab"] : ["Situation", "Background", "Assessment", "Recommendation", "Pending results / action owner"],
    tasks: [id ? "Daftar tugas" : "Tasks"],
    avs: id ? ["Kunjungan hari ini", "Yang dibahas", "Langkah yang disepakati", "Medications / Investigations yang dibahas", "Waktu dan cara tindak lanjut"] : ["Your visit today", "What we discussed", "Your agreed next steps", "Medicines / tests discussed", "When and how to follow up"],
    education: id ? ["Topik dan materi yang diberikan", "Penjelasan yang diberikan", "Informasi perawatan mandiri yang disepakati", "Pertanyaan untuk tindak lanjut"] : ["Topic and supplied teaching points", "What this means", "Agreed self-care information", "Questions to ask at follow-up"],
    referral: id ? ["Alasan rujukan", "Informasi Clinical relevan", "Temuan / Examination", "Previous management", "Masukan Specialist yang diminta"] : ["Reason for referral", "Relevant clinical information", "Findings / investigations", "Management to date", "Requested specialist input"],
    authorization: id ? ["Layanan yang diminta", "Clinical indication", "Previous treatments dan Response", "Dokumen pendukung", "Pernyataan klinisi / persyaratan penjamin"] : ["Requested service", "Clinical indication", "Previous treatments and response", "Supporting documentation", "Clinician attestation / insurer requirements"],
    workup: id ? ["Temuan yang disampaikan", "Pemeriksaan penunjang yang diusulkan"] : ["Supplied findings", "Proposed investigations"],
    refer: id ? ["Alasan rujukan", "Ringkasan klinis", "Pemeriksaan yang sudah dilakukan"] : ["Reason for referral", "Clinical summary", "Investigations done"],
    monitoring: id ? ["Masalah yang dipantau", "Parameter dan target", "Frekuensi dan cara pemantauan", "Kriteria eskalasi", "Penanggung jawab dan tindak lanjut"] : ["Problem monitored", "Parameters and targets", "Frequency and method", "Escalation criteria", "Owner and follow-up"],
    icd10: id ? ["Temuan yang disampaikan", "Diagnosis yang dikodekan"] : ["Supplied findings", "Diagnoses to code"],
    scribe: id ? ["Transkrip Encounter (verbatim)", "Chief concern", "History of present illness", "Examination findings yang disebutkan", "Assessment Clinician yang disebutkan", "Plan dan Follow-up yang disepakati"] : ["Visit transcript (verbatim)", "Chief concern", "History of present illness", "Examination findings stated", "Clinician assessment stated", "Agreed plan and follow-up"],
  };
  const note = structureNote(prompt);
  const mapping: Record<ModeId, NoteField[][]> = {
    question: [["concern"], ["history", "background"], ["comparison"], ["outcomes"], ["sources"]],
    ddx: [["concern", "history", "examination"], ["differential"], ["supporting"], [], ["pending"]],
    ap: [["assessment"], ["concern"], ["investigations"], ["plan"], ["followup"]],
    clinic: [["concern"], ["history"], ["background", "medications", "allergies"], ["examination"], ["assessment"], ["plan", "followup"]],
    hpi: [["history", "concern"], ["onset"], ["character"], ["associated"], ["modifiers"], ["negatives"]],
    telephone: [["history"], ["caller"], ["concern"], ["plan"], ["followup"]],
    chronic: [["history"], ["assessment"], ["medications"], ["goals"], ["plan", "followup"]],
    handoff: [["concern"], ["background", "history"], ["assessment"], ["plan"], ["pending"]],
    tasks: [[]],
    avs: [["concern", "history"], ["assessment"], ["plan"], ["medications", "investigations"], ["followup"]],
    education: [["concern"], ["assessment"], ["plan"], ["followup"]],
    referral: [["concern", "recipient"], ["history", "background"], ["examination", "investigations"], ["previous", "plan"], ["request"]],
    authorization: [["request"], ["assessment"], ["previous"], ["investigations", "background"], []],
    workup: [["concern", "history", "examination"], ["investigations"]],
    refer: [["concern", "request"], ["history", "examination"], ["investigations"]],
    monitoring: [["concern", "assessment"], ["investigations", "goals"], ["plan"], [], ["followup", "pending"]],
    icd10: [["concern", "history", "examination"], ["assessment", "differential"]],
    scribe: [[], ["concern"], ["history"], ["examination"], ["assessment"], ["plan", "followup"]],
  };
  const patientInfo = input.patient ? `${input.patient.name}${input.patient.age ? ` · ${input.patient.age} ${id ? "tahun" : "years"}` : ""} · ${id && input.patient.sex === "Not specified" ? "Sex belum diisi" : input.patient.sex}` : id ? "Pasien belum dipilih" : "No patient selected";
  const body = input.mode === "tasks" ? `## ${sections.tasks[0]}\n${prompt.split(/\n+/).filter(Boolean).map((line) => `- [ ] ${line.replace(/^[-*]\s*(\[[ x]\]\s*)?/, "")}`).join("\n")}` : sections[input.mode].map((title, index) => {
    let value = mapping[input.mode][index].map((key) => note.fields[key]).filter(Boolean).join("\n");
    if (input.mode === "scribe" && index === 0) value = prompt;
    if ((input.mode === "scribe" && index === 2) || (input.mode === "clinic" && index === 1)) value ||= note.patientStatements;
    if (input.mode === "question" && index === 0) value ||= prompt;
    if (!note.recognized && index === 0) value = prompt;
    return `## ${title}\n${value || missing}`;
  }).join("\n\n") + (note.recognized && input.mode !== "scribe" ? `\n\n## ${id ? "Teks sumber (verbatim)" : "Source text (verbatim)"}\n${prompt}` : "");
  const context = [input.patient?.notes, input.context].filter(Boolean).join("\n");
  return `# ${mode.title}\n\n${id ? "Draf lokal" : "Local draft"} · ${input.specialty} · ${input.model}\n${patientInfo}\n\n${body}${context ? `\n\n## ${id ? "Konteks tambahan" : "Additional context"}\n${context}` : ""}${input.instructions ? `\n\n## ${id ? "Preferensi penulisan" : "Writing preferences"}\n${input.instructions}` : ""}${input.model === "Extended" ? `\n\n## Review checklist\n${id ? "- [ ] Konfirmasi identitas dan detail Encounter\n- [ ] Rekonsiliasi Medications dan Allergies\n- [ ] Lengkapi bagian yang belum tersedia\n- [ ] Verifikasi interpretasi Clinical dan Follow-up" : "- [ ] Confirm identity and encounter details\n- [ ] Reconcile medicines and allergies\n- [ ] Complete missing sections\n- [ ] Verify clinical interpretation and follow-up"}` : ""}`;
}
