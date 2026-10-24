import { describe, expect, it } from "vitest";
import { readCaseFields } from "../src/lib/aadi/composer";
import { createDraft, type ModeId } from "../src/lib/drafts";
import { pcareCopies } from "../src/lib/aadi/presentation";

// Fictional cases only (spec section 10).
const draft = (mode: ModeId, prompt: string, language: "Bahasa Indonesia" | "English" = "Bahasa Indonesia") => createDraft({ mode, prompt, context: "", specialty: "Umum", model: "Standard", language, instructions: "", caseFields: readCaseFields(prompt) });

// Gaffer, 2026-10-21: "Evaluasi dan perbaiki juga untuk section lain" (Penyakit Kronis, SBAR, then the Rencana and Komunikasi tabs).
describe("the other Indonesian notes in the numbered format", () => {
  it("writes the SBAR handoff with the vital signs as one line under Penilaian", () => {
    const prompt = "Perempuan 45 tahun sesak sejak tadi pagi, riwayat asma sejak kecil, TD 130/80, N 110, RR 28, SpO2 92%, wheezing (+/+), sudah nebulisasi salbutamol 1x, mohon observasi tiap 1 jam, menunggu hasil rontgen toraks";
    expect(draft("handoff", prompt)).toBe([
      "# SERAH TERIMA KLINIS (SBAR)", "",
      "**Pasien:** Perempuan, 45 tahun",
      "**Status:** Draf serah terima • Menunggu validasi dokter", "",
      "## 1. Situasi (S)", "", "Sesak sejak tadi pagi.", "",
      "## 2. Latar Belakang (B)", "", "- Riwayat asma sejak kecil", "- Sudah nebulisasi salbutamol 1x", "",
      "## 3. Penilaian (A)", "", "- Wheezing (+/+)", "Tanda vital: TD 130/80 mmHg, N 110 x/menit, RR 28 x/menit, SpO₂ 92%", "",
      "## 4. Rekomendasi (R)", "", "- Mohon observasi tiap 1 jam", "",
      "## 5. Hasil Tertunda / Penanggung Jawab", "", "- Menunggu hasil rontgen toraks", "",
      "## Teks sumber (verbatim)", prompt,
    ].join("\n"));
  });

  it("sorts a chronic-care visit into conditions, results, medicines, targets and follow-up, and lists what is empty", () => {
    const text = draft("chronic", "Laki-laki 60 tahun kontrol hipertensi dan DM tipe 2, keluhan pusing kadang, TD 150/90, N 84, GDS 210, obat amlodipin 10 mg 1x1, metformin 500 mg 3x1, kontrol 1 bulan lagi, cek HbA1c");
    expect(text).toContain("## 1. Kondisi Kronis\n\n- Kontrol hipertensi dan DM tipe 2\n");
    expect(text).toContain("## 2. Riwayat Interval\n\nKeluhan pusing kadang.\n");
    expect(text).toContain("## 3. Tanda Vital dan Hasil Pemantauan\n\n- GDS 210\nTanda vital: TD 150/90 mmHg, N 84 x/menit\n");
    expect(text).toContain("## 4. Tinjauan Obat\n\n- Obat amlodipin 10 mg 1x1\n- Metformin 500 mg 3x1\n");
    expect(text).toContain("## 5. Pemantauan dan Tindak Lanjut\n\n- Kontrol 1 bulan lagi\n- Cek HbA1c\n");
    expect(text).toContain("**Belum diisi:**\n- Target terapi\n");
  });

  it("keeps the task list's checkboxes under the same header", () => {
    expect(draft("tasks", "Cek GDS besok pagi\n- Telepon keluarga pasien")).toBe("# DAFTAR TUGAS KLINIS\n\n**Pasien:** —\n**Status:** Draf daftar tugas • Menunggu validasi dokter\n\n## 1. Daftar Tugas\n\n- [ ] Cek GDS besok pagi\n- [ ] Telepon keluarga pasien");
  });

  it("keeps the A&P titles the P-Care copy reads", () => {
    const prompt = "Hipertensi tidak terkontrol, amlodipin 10 mg 1x1, cek ureum kreatinin, kontrol 2 minggu";
    const text = draft("ap", prompt);
    expect(text).toContain("## 1. Assessment\n\nHipertensi tidak terkontrol.\n");
    expect(text).toContain("## 2. Pemeriksaan Penunjang\n\n- Cek ureum kreatinin\n");
    expect(text).toContain("## 3. Tata Laksana\n\n- Amlodipin 10 mg 1x1\n");
    expect(text).toContain("## 4. Tindak Lanjut\n\n- Kontrol 2 minggu\n");
    expect(pcareCopies({ sourceText: `Input\n${prompt}`, mode: "ap" }, text).map((item) => item.label)).toEqual(["Diagnosa (teks)", "Terapi"]);
  });

  it("sorts a referral, a monitoring plan, education, a visit summary and a telephone note by their own words", () => {
    const referral = draft("referral", "Laki-laki 55 tahun nyeri dada kiri 2 jam, riwayat HT, TD 160/100, N 100, EKG ST elevasi, sudah diberi aspirin 160 mg, rujuk ke RSUD poli jantung, mohon tatalaksana lanjut");
    expect(referral).toContain("## 1. Tujuan Rujukan\n\n- Rujuk ke RSUD poli jantung\n\n## 2. Alasan Rujukan\n\nNyeri dada kiri 2 jam.\n");
    expect(referral).toContain("## 4. Pemeriksaan\n\n- EKG ST elevasi\nTanda vital: TD 160/100 mmHg, N 100 x/menit\n");
    expect(referral).toContain("## 6. Permintaan\n\n- Mohon tatalaksana lanjut\n");
    expect(draft("monitoring", "Pasien DBD hari ke-4, pantau trombosit dan hematokrit tiap 12 jam, bila akral dingin segera lapor dokter jaga")).toContain("Kriteria Eskalasi\n\n- Bila akral dingin segera lapor dokter jaga\n");
    expect(draft("education", "Hipertensi, kurangi garam, segera datang bila nyeri kepala hebat")).toContain("## 1. Topik Edukasi\n\nHipertensi.\n\n## 2. Perawatan Mandiri\n\n- Kurangi garam\n");
    expect(draft("avs", "Batuk pilek 3 hari, paracetamol 500 mg 3x1 bila demam")).toContain("Obat dan Pemeriksaan\n\n- Paracetamol 500 mg 3x1 bila demam\n");
    expect(draft("telephone", "Ibu pasien menelepon, anak demam 2 hari, disarankan kompres")).toContain("## 1. Penelepon dan Hubungan\n\n- Ibu pasien menelepon\n\n## 2. Keluhan yang Dibahas\n\nAnak demam 2 hari.\n\n## 3. Saran yang Diberikan\n\n- Disarankan kompres\n");
  });

  it("leaves English drafts as they were", () => {
    expect(draft("handoff", "Short of breath since this morning", "English")).toContain("# Clinical handoff\n\nLocal draft · Umum · Standard\n");
  });
});
