import type { Patient } from "./workspace";
import { structureNote, type NoteField } from "./note-structure";
import { missingField, missingFieldEnglish } from "./clinical-templates";
import { examTables, normalExam, rowLabel, templateNote } from "./normal-exam";
import type { CaseFields } from "./aadi/composer";

export const modeIds = ["question", "ddx", "ap", "clinic", "hpi", "telephone", "chronic", "handoff", "tasks", "avs", "education", "referral", "authorization", "scribe", "workup", "refer", "monitoring", "icd10"] as const;
export type ModeId = typeof modeIds[number];
export const draftModels = ["Standard", "Extended"] as const;
export const draftLanguages = ["English", "Bahasa Indonesia"] as const;
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

export interface DraftInput { mode: ModeId; prompt: string; context: string; specialty: string; model: typeof draftModels[number]; language: typeof draftLanguages[number]; patient?: Patient; instructions: string; caseFields?: Partial<CaseFields> }

// The labels readCaseFields (aadi/composer.ts) reads: sex words, an age in years, and labelled vital signs.
const demographicWords = [/\b(?:laki-laki|laki laki|lelaki|pria|perempuan|wanita)\b/gi, /\b(?:usia|umur)\s*:?\s*\d{1,3}(?:\s*(?:tahun|thn|th))?\b/gi, /(?<!\b(?:sejak|selama|sudah|lebih|kurang|hampir)\s+)\b\d{1,3}\s*(?:tahun|thn|th|yo)\b(?!\s+(?:lalu|yang lalu|terakhir))/gi];
const vitalWords = [/\b(?:TD|tekanan darah|tensi|BP)\s*[:=]?\s*\d{2,3}\s*\/\s*\d{2,3}(?:\s*mmHg)?/gi, /(?:\b(?:nadi|HR|frekuensi nadi)|\bN)\s*[:=]?\s*\d{2,3}(?:\s*(?:x\/?\s*(?:mnt|menit)|\/\s*(?:mnt|menit)))?(?![\d/]|\s*(?:hari|jam|minggu|bulan|tahun))/gi, /(?:\b(?:suhu|temp)|\b[ST])\s*[:=]?\s*\d{2}(?:[.,]\d)?(?:\s*°?\s*C\b)?(?![\d/]|\s*(?:hari|jam|minggu|bulan|tahun))/gi, /\b(?:RR|frekuensi napas|respirasi)\s*[:=]?\s*\d{1,2}(?:\s*x\/?\s*(?:mnt|menit))?/gi, /\b(?:SpO2|SpO₂|saturasi|sat)\s*[:=]?\s*\d{2,3}\s*%?/gi];
function complaintOnly(text: string, drop: { demographics: boolean; vitals: boolean }): string {
  const words = [...(drop.demographics ? demographicWords : []), ...(drop.vitals ? vitalWords : [])];
  const left = words.reduce((rest, pattern) => rest.replace(pattern, ""), text).split("\n").map(line => line.replace(/\s*([,;])(?:\s*[,;])+/g, "$1").replace(/^[\s,;.]+|[\s,;]+$/g, "").replace(/\s{2,}/g, " ")).filter(Boolean).join("\n");
  return left ? left.charAt(0).toUpperCase() + left.slice(1) : text;
}

// "demam 3 hari, nyeri kepala" reads "Demam sejak 3 hari disertai nyeri kepala.": a symptom with a duration takes "sejak",
// the rest follow "disertai". A leading "Laki-laki 45 tahun" the patient line could not take stays in front, unchanged.
// Text on several lines stays as written.
function complaintSentence(text: string): string {
  if (text.includes("\n")) return text;
  const all = text.split(/\s*,\s*/).filter(Boolean);
  const lead = all.length > 1 && /^(?:laki-laki|perempuan|pria|wanita|anak|bayi|usia|umur)\b/i.test(all[0]) ? `${all.shift()}, ` : "";
  const parts = all.map((part) => /\b(?:sejak|selama)\s+\d/i.test(part) ? part : part.replace(/^(.+?)\s+(\d+\s*(?:jam|hari|minggu|bulan|tahun))$/i, "$1 sejak $2"));
  const rest = parts.slice(1).map((part) => part.charAt(0).toLowerCase() + part.slice(1));
  const first = lead ? parts[0].charAt(0).toLowerCase() + parts[0].slice(1) : parts[0];
  const joined = lead + (rest.length ? `${first} disertai ${rest.length > 1 ? `${rest.slice(0, -1).join(", ")} dan ${rest[rest.length - 1]}` : rest[0]}` : first);
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}${/[.!?]$/.test(joined) ? "" : "."}`;
}
const missingNames: Record<string, string> = { "Keluhan Utama": "Keluhan utama", "Riwayat Penyakit": "Riwayat penyakit", "Riwayat Pengobatan / Alergi": "Riwayat pengobatan dan alergi", "Pemeriksaan Fisik": "Pemeriksaan fisik", Assessment: "Assessment / Diagnosis", "Tata Laksana": "Tata laksana", "Onset dan Durasi": "Onset dan durasi", "Lokasi / Sifat / Derajat": "Lokasi, sifat, dan derajat", "Gejala Penyerta": "Gejala penyerta", "Faktor Pemberat / Peringan": "Faktor pemberat dan peringan", "Negatif Pertinen": "Negatif pertinen" };

// An Indonesian note in Gaffer's format (2026-10-21): the patient and status on top, the filled parts numbered, then
// "Kelengkapan Dokumentasi" with what is still empty, any extra notes, and the closing status.
function numberedNote(heading: string, status: string, patient: string, filled: [string, string][], notes = ""): string {
  const empty = filled.filter(([, text]) => !text.trim()).map(([title]) => missingNames[title] ?? title);
  const completeness = [
    empty.length ? `**Belum diisi:**\n${empty.map((name) => `- ${name}`).join("\n")}` : "",
    notes,
    empty.length || notes ? "**Status akhir:** Belum lengkap — memerlukan verifikasi sebelum finalisasi catatan klinis." : "",
  ].filter(Boolean).join("\n\n");
  const numbered = [...filled.filter(([, text]) => text.trim()), ...(completeness ? [["Kelengkapan Dokumentasi", completeness] as [string, string]] : [])];
  return `# ${heading}\n\n**Pasien:** ${patient}\n**Status:** ${status}\n\n${numbered.map(([title, text], index) => `${title === "Kelengkapan Dokumentasi" ? "---\n\n" : ""}## ${index + 1}. ${title}\n\n${text}`).join("\n\n")}`;
}

// Free text for the HPI note, split at commas, ";" and "disertai": the first part is the complaint, a duration goes to
// onset, and words decide the rest (negatives, then aggravating/relieving, then character or site, else associated).
// Word matching only: nothing is inferred, and the source text stays under the note.
const durationWords = /\s*\b(?:(?:sejak|selama)\s+)?(?:\d+\s*(?:jam|hari|minggu|bulan|tahun)(?:\s+(?:yang\s+)?lalu)?|(?:sejak|selama)\s+(?:kemarin|semalam|tadi(?:\s+(?:pagi|siang|sore|malam))?))\b/i;
const negativeWords = /^(?:tidak|tanpa|tak|bukan|menyangkal|disangkal)\b|\(-\)$/i;
const modifierWords = /\b(?:memberat|membaik|berkurang|bertambah|dipicu|dicetuskan|setelah|saat|ketika|bila|jika)\b/i;
const characterWords = /\b(?:berdahak|dahak|kering|tajam|tumpul|menusuk|berdenyut|seperti|menjalar|hilang timbul|terus[- ]menerus|ringan|sedang|berat|skala|kanan|kiri|ulu hati)\b/i;
function hpiParts(text: string) {
  const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const parts = { complaint: "", onset: [] as string[], character: [] as string[], associated: [] as string[], modifiers: [] as string[], negatives: [] as string[] };
  for (const clause of text.split(/\s*(?:[,;\n]|\bdisertai\b)\s*/i).map((part) => part.trim().replace(/\.$/, "")).filter(Boolean)) {
    if (negativeWords.test(clause)) { parts.negatives.push(cap(clause)); continue; }
    const duration = durationWords.exec(clause)?.[0].trim();
    const symptom = duration ? clause.replace(durationWords, "").replace(/\s{2,}/g, " ").trim() : clause;
    const since = duration && /^\d/.test(duration) ? `sejak ${duration}` : duration;
    if (since && symptom) parts.onset.push(`${cap(symptom)}: ${since}`);
    if (!parts.complaint) parts.complaint = `${cap(symptom || clause)}${since ? ` ${since}` : ""}.`;
    else if (modifierWords.test(clause)) parts.modifiers.push(cap(clause));
    else if (characterWords.test(symptom) && !since) parts.character.push(cap(symptom));
    else if (symptom) parts.associated.push(cap(symptom));
  }
  return parts;
}

export function createDraft(input: DraftInput): string {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Tambahkan pertanyaan atau konteks Clinical terlebih dahulu.");
  const mode = modes.find((m) => m.id === input.mode)!;
  const id = input.language === "Bahasa Indonesia";
  const missing = `${id ? missingField : missingFieldEnglish}.`;
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
  // The Indonesian SOAP note fills its exam from the normal template once age and sex are known (normal-exam.ts).
  const sex = input.patient?.sex === "Male" ? "M" : input.patient?.sex === "Female" ? "F" : undefined;
  const exam = input.mode === "clinic" && id ? normalExam(prompt, input.caseFields ?? {}, { age: input.patient?.age.trim() || undefined, sex }) : undefined;
  const recognized = note.recognized || !!exam?.labelled;
  // The patient line names who the note is for: name, age and sex, from the chosen patient or the typed text (Gaffer,
  // 2026-10-21: "buatkan nama dan usia pasiennya").
  const sexWord = (value?: string) => value === "Male" || value === "M" ? "Laki-laki" : value === "Female" || value === "F" ? "Perempuan" : "";
  const age = input.patient?.age.trim() || input.caseFields?.age?.trim() || "", sexText = sexWord(input.patient?.sex) || sexWord(input.caseFields?.sex);
  const patientInfo = id ? `Pasien: ${[input.patient?.name || "—", age && `${age} tahun`, sexText].filter(Boolean).join(" · ")}`
    : input.patient ? `${input.patient.name}${input.patient.age ? ` · ${input.patient.age} years` : ""} · ${input.patient.sex}` : "No patient selected";
  const context = [input.patient?.notes, input.context].filter(Boolean).join("\n");
  const tail = `${context ? `\n\n## ${id ? "Konteks tambahan" : "Additional context"}\n${context}` : ""}${input.instructions ? `\n\n## ${id ? "Preferensi penulisan" : "Writing preferences"}\n${input.instructions}` : ""}${input.model === "Extended" ? `\n\n## Review checklist\n${id ? "- [ ] Konfirmasi identitas dan detail Encounter\n- [ ] Rekonsiliasi Medications dan Allergies\n- [ ] Lengkapi bagian yang belum tersedia\n- [ ] Verifikasi interpretasi Clinical dan Follow-up" : "- [ ] Confirm identity and encounter details\n- [ ] Reconcile medicines and allergies\n- [ ] Complete missing sections\n- [ ] Verify clinical interpretation and follow-up"}` : ""}`;
  const field = (keys: NoteField[]) => keys.map((key) => note.fields[key]).filter(Boolean).join("\n");
  // The demo patient's name is the word "Pasien" itself, which the label already says.
  const patientText = [input.patient?.name !== "Pasien" && input.patient?.name, sexText, age && `${age} tahun`].filter(Boolean).join(", ") || "—";
  // The Indonesian HPI note (Gaffer, 2026-10-21: "keluhan dipecah ke onset/durasi, gejala penyerta, dan negatif"):
  // labelled lines win, free text is split by hpiParts, and the typed text always stays under the note.
  if (input.mode === "hpi" && id) {
    const parts = hpiParts(complaintOnly(note.recognized ? field(["concern"]) || prompt : prompt, { demographics: !!(age || sexText), vitals: true }));
    const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
    const filled: [string, string][] = [
      ["Keluhan Utama", parts.complaint],
      ...(note.fields.history ? [["Riwayat Penyakit Sekarang", note.fields.history] as [string, string]] : []),
      ["Onset dan Durasi", field(["onset"]) || list(parts.onset)],
      ["Lokasi / Sifat / Derajat", field(["character"]) || list(parts.character)],
      ["Gejala Penyerta", field(["associated"]) || list(parts.associated)],
      ["Faktor Pemberat / Peringan", field(["modifiers"]) || list(parts.modifiers)],
      ["Negatif Pertinen", field(["negatives"]) || list(parts.negatives)],
    ];
    return `${numberedNote("ANAMNESIS (HPI)", "Draf anamnesis • Menunggu validasi dokter", patientText, filled)}\n\n## Teks sumber (verbatim)\n${prompt}${tail}`;
  }
  // The Indonesian SOAP note: its exam tables, and which findings came from the normal template.
  if (input.mode === "clinic" && id) {
    const complaint = note.recognized ? field(["concern"]) : exam?.labelled ? exam.rest : prompt;
    const filled: [string, string][] = [
      ["Keluhan Utama", complaint && complaintSentence(complaintOnly(complaint, { demographics: !!(age || sexText), vitals: !!exam }))],
      ["Riwayat Penyakit", field(["history"]) || note.patientStatements || ""],
      ["Riwayat Pengobatan / Alergi", field(["background", "medications", "allergies"])],
      ["Pemeriksaan Fisik", exam ? examTables(exam.rows, exam.extra, exam.adult) : field(["examination"])],
      ["Assessment", field(["assessment"])],
      ["Tata Laksana", field(["plan", "followup"])],
    ];
    const auto = exam ? exam.rows.filter((row) => row.auto).map((row) => rowLabel(row, exam.adult)).map((label) => label === "THT" ? label : label.toLowerCase()) : [];
    const autoList = auto.length > 2 ? `${auto.slice(0, -1).join(", ")}, dan ${auto[auto.length - 1]}` : auto.join(" dan ");
    const templatePart = auto.length ? `**${templateNote} — perlu validasi dokter:**\n\n${autoList.charAt(0).toUpperCase() + autoList.slice(1)}.\n\n*Catatan: Temuan yang berasal dari templat normal belum dapat dianggap sebagai hasil pemeriksaan aktual sampai dikonfirmasi oleh dokter.*` : "";
    return `${numberedNote("CATATAN KLINIS", "Draf pemeriksaan • Menunggu validasi dokter", patientText, filled, templatePart)}${recognized ? `\n\n## Teks sumber (verbatim)\n${prompt}` : ""}${tail}`;
  }
  const body = input.mode === "tasks" ? `## ${sections.tasks[0]}\n${prompt.split(/\n+/).filter(Boolean).map((line) => `- [ ] ${line.replace(/^[-*]\s*(\[[ x]\]\s*)?/, "")}`).join("\n")}` : sections[input.mode].map((title, index) => {
    let value = mapping[input.mode][index].map((key) => note.fields[key]).filter(Boolean).join("\n");
    if (input.mode === "scribe" && index === 0) value = prompt;
    if ((input.mode === "scribe" && index === 2) || (input.mode === "clinic" && index === 1)) value ||= note.patientStatements;
    if (input.mode === "question" && index === 0) value ||= prompt;
    if (!note.recognized && index === 0) value = exam?.labelled ? exam.rest : prompt;
    return `## ${title}\n${value || missing}`;
  }).join("\n\n") + (recognized && input.mode !== "scribe" ? `\n\n## ${id ? "Teks sumber (verbatim)" : "Source text (verbatim)"}\n${prompt}` : "");
  return `# ${mode.title}\n\n${id ? "Draf lokal" : "Local draft"} · ${input.specialty} · ${input.model}\n${patientInfo}\n\n${body}${tail}`;
}
