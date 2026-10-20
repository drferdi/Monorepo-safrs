// The physical exam in Gaffer's format (2026-10-21), shared by part 4 of the AADI report and the SOAP note's
// "Pemeriksaan Fisik": A. every vital sign with its value or "Belum tersedia", the signs outside the usual range in
// words, then the exam lines; B. the further exams with their purpose; C. a conclusion. Pulse, pressure and breathing
// are judged for adults only. Local and deterministic: it names vital-sign findings, never a diagnosis.

export const headacheWords = /nyeri kepala|sakit kepala|kepala (?:terasa )?(?:sakit|nyeri|pusing)|cephal|headache|migr[ae]in/i;

// The further exams with their purpose, for a headache case and for any other complaint.
export const furtherExams = {
  headache: [["Kesadaran dan neurologis", "Menilai tingkat kesadaran dan kemungkinan komplikasi neurologis."], ["Tanda rangsang meningeal", "Menilai kemungkinan iritasi meningeal bila terdapat indikasi klinis."], ["Kepala dan leher", "Menilai rentang gerak, nyeri tekan, dan ketegangan otot."], ["Mata dan funduskopi", "Mengidentifikasi kelainan okular sesuai indikasi dan kompetensi pemeriksa."]],
  general: [["Keadaan umum dan kesadaran", "Menilai kondisi umum dan tingkat kesadaran."], ["Pemeriksaan terarah", "Mencari temuan yang sesuai dengan keluhan utama."], ["Sistem terkait", "Menyaring diagnosis yang tidak boleh terlewat."]],
};

export interface ExamVitals { systolic?: number; diastolic?: number; heartRate?: number; temperature?: number; respiratoryRate?: number; spo2?: number; gcs?: number }

/** A markdown table; a cell holds one line, and a "|" in case text is escaped. */
const cell = (text: string) => text.replace(/\s*\r?\n\s*/g, " ").replace(/\|/g, "\\|").trim() || "—";
export const table = (head: string[], rows: string[][]) => [head.map(cell), head.map(() => "---"), ...rows.map(row => row.map(cell))].map(row => `| ${row.join(" | ")} |`).join("\n");
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const sentence = (items: string[]) => items.length > 1 ? `${items.slice(0, -1).join(", ")} disertai ${items[items.length - 1]}` : items.join("");
const series = (items: string[]) => items.length > 2 ? `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}` : items.join(" dan ");

/** `findings` is the exam text under "Temuan klinis" (lines or bullets); `examined` says the doctor recorded an exam. */
export function physicalExamText({ vitals: v, adult, findings, exams, examined }: { vitals: ExamVitals; adult: boolean; findings: string; exams: string[][]; examined: boolean }): string {
  const decimalComma = (n: number) => String(n).replace(".", ",");
  const vitalRows: [name: string, value: string, short: string][] = [
    ["Tekanan darah", v.systolic != null ? `${v.systolic}${v.diastolic != null ? `/${v.diastolic}` : ""} mmHg` : "", "tekanan darah"],
    ["Frekuensi nadi", v.heartRate != null ? `${v.heartRate} kali/menit` : "", "frekuensi nadi"],
    ["Suhu tubuh", v.temperature != null ? `${decimalComma(v.temperature)}°C` : "", "suhu tubuh"],
    ["Frekuensi napas", v.respiratoryRate != null ? `${v.respiratoryRate} kali/menit` : "", "frekuensi napas"],
    ["Saturasi oksigen (SpO₂)", v.spo2 != null ? `${v.spo2}%` : "", "SpO₂"],
    ...(v.gcs != null ? [["GCS", String(v.gcs), "GCS"] as [string, string, string]] : []),
  ];
  const missing = vitalRows.filter(([, value]) => !value).map(([, , short]) => short);
  const { temperature: t, heartRate: hr, systolic: sys, diastolic: dia, respiratoryRate: rr, spo2 } = v;
  // [the finding with its value, the word for the conclusion]
  const signs = ([
    [t != null && t >= 37.5, `demam (${vitalRows[2][1]})`, t != null && t >= 39 ? "demam tinggi" : "demam"],
    [t != null && t < 36, `suhu rendah (${vitalRows[2][1]})`, "suhu rendah"],
    [adult && hr != null && hr > 100, `takikardia (${vitalRows[1][1]})`, "takikardia"],
    [adult && hr != null && hr < 60, `bradikardia (${vitalRows[1][1]})`, "bradikardia"],
    [adult && sys != null && sys < 90, `hipotensi (${vitalRows[0][1]})`, "hipotensi"],
    [adult && ((sys ?? 0) >= 140 || (dia ?? 0) >= 90), `tekanan darah tinggi (${vitalRows[0][1]})`, "tekanan darah tinggi"],
    [adult && rr != null && rr > 20, `takipnea (${vitalRows[3][1]})`, "takipnea"],
    [spo2 != null && spo2 < 95, `saturasi oksigen rendah (${vitalRows[4][1]})`, "saturasi oksigen rendah"],
  ] as const).filter(([on]) => on);
  const rows = [...exams, ...(missing.length ? [["Tanda vital lengkap", `Melengkapi ${series([...missing, "pemantauan hemodinamik"])}.`]] : [])].map(([name, purpose]) => [`**${name}**`, purpose]);
  return [
    "#### A. Hasil Pemeriksaan",
    `**Tanda Vital**\n\n${table(["Parameter", "Hasil"], vitalRows.map(([name, value]) => [name, value || "Belum tersedia"]))}`,
    `**Temuan klinis:** ${signs.length ? `${capital(sentence(signs.map(([, finding]) => finding)))}.` : findings ? "" : "belum tersedia."}`.trim(),
    findings,
    "#### B. Pemeriksaan Lanjutan yang Diperlukan",
    table(["Pemeriksaan", "Tujuan Klinis"], rows),
    "#### C. Kesimpulan Pemeriksaan Fisik",
    `${signs.length ? `Pasien menunjukkan **${sentence(signs.map(([, , word]) => word))}**. ` : ""}Pemeriksaan fisik tambahan diperlukan untuk menilai kondisi umum, status neurologis, dan kemungkinan tanda kegawatan.`,
    !missing.length && examined ? "" : "**Status:** Pemeriksaan fisik belum lengkap. Penilaian tanda bahaya perlu diprioritaskan.",
  ].filter(Boolean).join("\n\n");
}

/** The exam as P-Care takes it: part A's vital signs as "Parameter: hasil" (measured ones only) and its exam lines. */
export function physicalExamPlain(text: string): string {
  if (!text.startsWith("#### A.")) return text;
  const end = text.indexOf("#### B.");
  return text.slice(0, end < 0 ? undefined : end).split("\n").map(line => line.trim())
    .filter(line => line && !line.startsWith("####") && !/^\*\*(?:Tanda Vital|Temuan klinis:)\*\*$/.test(line) && !/^\|\s*(?:Parameter|-{3})/.test(line) && !/\|\s*Belum tersedia\s*\|$/.test(line))
    .map(line => line.startsWith("|") ? line.slice(1, -1).split("|").map(part => part.trim()).join(": ") : line.replace(/\*\*/g, "")).join("\n");
}
