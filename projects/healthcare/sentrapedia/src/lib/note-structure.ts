export const noteFields = ["concern", "history", "background", "medications", "allergies", "examination", "assessment", "plan", "followup", "investigations", "differential", "supporting", "onset", "character", "associated", "modifiers", "negatives", "caller", "goals", "pending", "recipient", "request", "previous", "outcomes", "comparison", "sources"] as const;
export type NoteField = typeof noteFields[number];

const aliases: Record<string, NoteField> = {
  "chief concern": "concern", "chief complaint": "concern", "cc": "concern", "concern": "concern", "keluhan": "concern", "keluhan utama": "concern", "situation": "concern", "situasi": "concern", "reason for referral": "concern",
  "hpi": "history", "history of present illness": "history", "history": "history", "riwayat penyakit sekarang": "history", "anamnesis": "history", "interval history": "history",
  "background": "background", "pmh": "background", "past medical history": "background", "riwayat": "background", "riwayat penyakit dahulu": "background", "latar belakang": "background",
  "medications": "medications", "medicines": "medications", "obat": "medications", "allergies": "allergies", "allergy": "allergies", "alergi": "allergies",
  "examination": "examination", "exam": "examination", "pe": "examination", "objective": "examination", "pemeriksaan": "examination", "pemeriksaan fisik": "examination",
  "assessment": "assessment", "assesment": "assessment", "asesmen": "assessment", "diagnosis": "assessment", "active conditions": "assessment", "problem list": "assessment",
  "plan": "plan", "management": "plan", "rencana": "plan", "tatalaksana": "plan", "recommendation": "plan", "rekomendasi": "plan", "advice": "plan", "education": "plan", "edukasi": "plan",
  "follow-up": "followup", "follow up": "followup", "followup": "followup", "tindak lanjut": "followup", "kontrol": "followup",
  "investigations": "investigations", "tests": "investigations", "labs": "investigations", "pemeriksaan penunjang": "investigations",
  "ddx": "differential", "differential": "differential", "differential diagnosis": "differential", "diagnosis banding": "differential", "supporting findings": "supporting", "temuan pendukung": "supporting",
  "onset": "onset", "duration": "onset", "durasi": "onset", "character": "character", "severity": "character", "karakter": "character", "associated symptoms": "associated", "gejala penyerta": "associated",
  "modifiers": "modifiers", "aggravating factors": "modifiers", "relieving factors": "modifiers", "faktor pencetus": "modifiers", "pertinent negatives": "negatives", "negatif relevan": "negatives",
  "caller": "caller", "penelepon": "caller", "goals": "goals", "care goals": "goals", "target": "goals", "pending": "pending", "pending results": "pending", "tertunda": "pending",
  "recipient": "recipient", "penerima": "recipient", "requested service": "request", "request": "request", "permintaan": "request", "previous treatments": "previous", "previous treatment": "previous", "terapi sebelumnya": "previous",
  "outcomes": "outcomes", "luaran": "outcomes", "comparison": "comparison", "comparator": "comparison", "pembanding": "comparison", "sources": "sources", "source": "sources", "sumber": "sources",
};

export interface StructuredNote { fields: Partial<Record<NoteField, string>>; patientStatements: string; clinicianStatements: string; recognized: boolean }

export function structureNote(text: string): StructuredNote {
  const buckets: Partial<Record<NoteField, string[]>> = {};
  const patient: string[] = [];
  const clinician: string[] = [];
  let current: NoteField | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { current = undefined; continue; }
    const speaker = line.match(/^(patient|pasien|clinician|doctor|dokter)\s*:\s*(.*)$/i);
    const content = speaker ? speaker[2] : line;
    if (speaker) current = undefined;
    if (speaker && /^(patient|pasien)$/i.test(speaker[1])) { patient.push(content); continue; }
    const label = content.match(/^([\p{L}\s/-]+)\s*:\s*(.*)$/u);
    const field = label ? aliases[label[1].trim().toLowerCase()] : undefined;
    if (field && label) {
      current = field;
      (buckets[field] ??= []).push(label[2]);
    } else if (speaker) { clinician.push(content); }
    else if (current && !content.includes(":")) { (buckets[current] ??= []).push(content); }
  }
  const fields: StructuredNote["fields"] = {};
  for (const key of noteFields) { const value = buckets[key]?.join("\n").trim(); if (value) fields[key] = value; }
  return { fields, patientStatements: patient.join("\n"), clinicianStatements: clinician.join("\n"), recognized: Object.keys(fields).length > 0 || patient.length > 0 || clinician.length > 0 };
}
