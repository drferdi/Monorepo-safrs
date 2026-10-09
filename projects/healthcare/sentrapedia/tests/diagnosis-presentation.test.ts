import { describe, expect, it } from "vitest";
import { emptyCase, type MiraResult } from "../src/lib/mira/contract";
import { diagnosisContent, diagnosisSectionTitles, miraDraft, miraMessage, referralSectionTitle, sourceForDisplay } from "../src/lib/mira/presentation";
import { documentSections, replaceSection } from "../src/lib/studio";
import { oracleDiseases, relatedDiseases } from "../src/lib/oracle";
import { revealAt, thinkingStepAt, thinkingStepMs, thinkingSteps, typingDurationMs, unfoldMs } from "../src/lib/typing";

const analysis = {
  case: { ...emptyCase(), chiefComplaint: "Keluhan sintetis", anamnesis: { freeText: "Gejala sintetis" }, currentMedications: ["Obat tercatat"], results: [{ name: "Tes sintetis", value: 3, unit: "unit" }] },
  result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Diagnosis sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [{ icd10: "X00", label: "Jangan terlewat sintetis", confidenceTier: "unknown" }] }, evidence: [{ icd10: "J00", supporting: ["Alasan sintetis"], opposing: ["Penyangkal sintetis"] }], missingInformation: ["Data kurang sintetis"], nextBestActions: [{ kind: "test", item: "Usulan tes sintetis", reason: "Alasan tes" }, { kind: "question", item: "Pertanyaan sintetis", reason: "Alasan tanya" }], disposition: null, unfilled: [{ field: "disposition", reason: "Belum cukup data" }], meta: { version: "test", model: "mock", costUsd: null } } satisfies MiraResult,
  traceId: "synthetic-trace", createdAt: "2026-10-09T00:00:00Z",
};
const section = (content: string, title: string) => documentSections(content).find(s => s.title === title)!.body.trim();
const withDifferential = (differential: MiraResult["differential"]) => ({ ...analysis, result: { ...analysis.result, differential } });

describe("six-section diagnosis presentation", () => {
  it("orders the requested sections and preserves recorded facts, uncertainty and provenance", () => {
    const message = miraMessage(analysis);
    expect(documentSections(message.content).map(s => s.title)).toEqual(["Ringkasan Gejala", "Differential Diagnosis", "Diagnosis", "Penunjang", "Terapi Farmakologi", "Edukasi"]);
    expect(diagnosisSectionTitles).toEqual(documentSections(message.content).map(s => s.title));
    for (const text of ["Keluhan sintetis", "Gejala sintetis", "Obat tercatat", "Tes sintetis", "Jangan terlewat sintetis", "Alasan sintetis", "Penyangkal sintetis", "Data kurang sintetis", "Usulan tes sintetis", "Pertanyaan sintetis", "Belum cukup data", "synthetic-trace", "SHA-256"]) expect(message.content).toContain(text);
    expect(JSON.parse(message.sourceText!).case).toEqual(analysis.case);
    expect(JSON.parse(message.sourceText!).result).toEqual(analysis.result);
  });
  it("keeps the symptom summary to what was recorded, without placeholder lines", () => {
    const summary = section(miraMessage(analysis).content, "Ringkasan Gejala");
    expect(summary).toContain("Keluhan sintetis");
    expect(summary).toContain("Data kurang sintetis");
    expect(summary).not.toContain("Belum tersedia");
    expect(summary).not.toContain("Tanda vital");
  });
  it("puts likely diagnoses under Diagnosis and the others under Differential Diagnosis", () => {
    const content = miraMessage(analysis).content;
    expect(section(content, "Diagnosis")).toContain("Diagnosis sintetis (J00)");
    expect(section(content, "Diagnosis")).not.toContain("Jangan terlewat sintetis");
    expect(section(content, "Differential Diagnosis")).toContain("Jangan terlewat sintetis (X00)");
    expect(section(content, "Differential Diagnosis")).not.toContain("Diagnosis sintetis (J00)");
  });
  it("states whether supporting tests are needed", () => {
    expect(section(miraMessage(analysis).content, "Penunjang")).toMatch(/^Perlu/);
    const none = { ...analysis, result: { ...analysis.result, nextBestActions: [] } };
    expect(section(miraMessage(none).content, "Penunjang")).toMatch(/^Tidak perlu saat ini/);
  });
  it("shows the complete database narratives for the likely diagnosis in their own sections", () => {
    const content = miraMessage(analysis).content;
    const disease = relatedDiseases("J00")[0];
    for (const text of [disease.definisi, ...disease.gejala, disease.diagnosis]) expect(section(content, "Diagnosis")).toContain(text);
    expect(section(content, "Terapi Farmakologi")).toContain(disease.terapi);
    expect(section(content, "Edukasi")).toContain(disease.rujukan);
    for (const title of ["Terapi Farmakologi", "Edukasi"]) expect(section(content, title)).not.toContain("Obat tercatat");
  });
  it("shows database narratives for the highest group that has one, not for every candidate", () => {
    const input = withDifferential({ likely: [{ icd10: "R10.3", label: "Nyeri perut bawah", confidenceTier: "low" }], alternatives: [{ icd10: "K35.8", label: "Appendicitis", confidenceTier: "low" }], cannotMiss: [{ icd10: "A06.0", label: "Amoebic dysentery", confidenceTier: "low" }] });
    expect(relatedDiseases("R10.3")).toHaveLength(0);
    const content = miraMessage(input).content;
    const appendicitis = oracleDiseases.find(d => d.kode === "K35")!, dysentery = oracleDiseases.find(d => d.kode === "A03-A09")!;
    expect(section(content, "Diagnosis")).toContain(appendicitis.definisi);
    expect(section(content, "Diagnosis")).not.toContain(dysentery.definisi);
    expect(section(content, "Terapi Farmakologi")).not.toContain(dysentery.terapi);
    expect(content).toContain(dysentery.terapi);
  });
  it("answers directly, without disclaimers or database bookkeeping in the visible sections", () => {
    const content = miraMessage(analysis).content;
    for (const phrase of ["ditinjau klinisi", "bukan resep", "narasi sumber", "diverifikasi", "keyakinan model", "Belum tersedia", "Cakupan kode"]) expect(content).not.toContain(phrase);
    const visible = content.slice(0, content.indexOf("Referensi penyakit terkait"));
    expect(visible).not.toMatch(/record \d+|SHA-256|Trace:/);
  });
  it("keeps every database record of other candidates in the collapsed references", () => {
    const repeated = withDifferential({ likely: [], alternatives: [{ icd10: "A09", label: "Alternatif sintetis", confidenceTier: "low" }], cannotMiss: [] });
    const content = miraMessage(repeated).content;
    for (const disease of relatedDiseases("A09")) { expect(content).toContain(`record ${disease.id}`); expect(content).toContain(disease.terapi); }
    const unmatched = withDifferential({ likely: [{ icd10: "C92.0", label: "Kandidat sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [] });
    const therapy = section(miraMessage(unmatched).content, "Terapi Farmakologi");
    expect(therapy).toBe("Belum ada data terapi untuk diagnosis ini.");
  });
  it("resolves explicit ranges, category coverage and comma-separated codes as labeled references", () => {
    for (const [code, sourceCode] of [["J02.9", "J02-J03"], ["J00.1", "J00"], ["R42", "H81-H83, R42"], ["G47.0", "G47.0, F51.0"]]) {
      const input = withDifferential({ likely: [{ icd10: code, label: "Kandidat sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [] });
      const content = miraMessage(input).content;
      const reference = oracleDiseases.find(d => d.kode === sourceCode)!;
      expect(content).toContain(`(${sourceCode}) · kode hasil analisis: ${code} · oracle/sentrapedia.json record ${reference.id}`);
      expect(section(content, "Terapi Farmakologi")).toContain(reference.terapi);
      expect(JSON.parse(miraMessage(input).sourceText!).result.differential.likely[0].icd10).toBe(code);
    }
  });
  it("distinguishes an empty analysis from absent database records", () => {
    const input = { ...withDifferential({ likely: [], alternatives: [], cannotMiss: [] }), result: { ...withDifferential({ likely: [], alternatives: [], cannotMiss: [] }).result, evidence: [] } };
    const message = miraMessage(input);
    expect(message.content.split("## Ringkasan Gejala")[0]).toContain("Belum ada kandidat diagnosis dari keluhan ini");
    expect(section(message.content, "Terapi Farmakologi")).toBe("Belum ada data terapi untuk diagnosis ini.");
  });
  it("re-renders untouched older drafts in the new format without mutating saved text or source", () => {
    const old = "# Analisis kasus\n\n## Ringkasan Kasus\n\nLama\n\n---\n\n## Gejala\n\nLama\n";
    const message = { ...miraMessage(analysis), content: old, originalContent: old };
    const before = JSON.stringify(message);
    expect(diagnosisContent(message)).toContain("## Ringkasan Gejala");
    expect(JSON.stringify(message)).toBe(before);
    expect(diagnosisContent({ ...message, content: old + "Catatan klinisi" })).toBe(old + "Catatan klinisi");
    expect(diagnosisContent({ ...message, sourceText: "invalid" })).toBe(old);
    expect(diagnosisContent({ ...message, sourceText: undefined })).toBe(old);
  });
  it("writes the pharmacological therapy as drug and compact dose per line, then DDI and contraindications", () => {
    const therapy = { forDiagnosis: { icd10: "J00", label: "Diagnosis sintetis" }, regimen: [{ drug: "Ceftriaxone", dose: "1x500mg", route: "IM", duration: "dosis tunggal", note: "1g bila >=150kg" }, { drug: "Azithromycin", dose: "1x1g", route: "PO", duration: "dosis tunggal", note: "" }], interactions: ["Azithromycin dengan warfarin: risiko perdarahan", "Ceftriaxone dengan kalsium IV: presipitasi"], contraindications: ["Ceftriaxone: alergi sefalosporin"] };
    const content = miraMessage({ ...analysis, result: { ...analysis.result, therapy } }).content;
    expect(section(content, "Terapi Farmakologi")).toBe("Untuk Diagnosis sintetis (J00)\n\n- Ceftriaxone 1x500mg IM dosis tunggal (1g bila >=150kg)\n- Azithromycin 1x1g PO dosis tunggal\n\nDDI\n- Azithromycin dengan warfarin: risiko perdarahan\n- Ceftriaxone dengan kalsium IV: presipitasi\n\nKontraindikasi\nCeftriaxone: alergi sefalosporin");
    const disease = relatedDiseases("J00")[0];
    expect(content.indexOf(disease.terapi)).toBeGreaterThan(content.indexOf("Referensi penyakit terkait"));
    const single = miraMessage({ ...analysis, result: { ...analysis.result, therapy: { ...therapy, regimen: [therapy.regimen[1]], interactions: [] } } }).content;
    expect(section(single, "Terapi Farmakologi")).toBe("Untuk Diagnosis sintetis (J00)\n\nAzithromycin 1x1g PO dosis tunggal\n\nKontraindikasi\nCeftriaxone: alergi sefalosporin");
  });
  it("uses bullets only where there are several points", () => {
    const many = { ...analysis, result: { ...analysis.result, missingInformation: ["Data satu", "Data dua"], evidence: [{ icd10: "J00", supporting: ["Pendukung satu", "Pendukung dua"], opposing: ["Penyangkal tunggal"] }] } };
    const content = miraMessage(many).content;
    expect(section(content, "Ringkasan Gejala")).toContain("Data yang perlu dilengkapi\n- Data satu\n- Data dua");
    expect(section(content, "Diagnosis")).toContain("Diagnosis sintetis (J00)\n  Mendukung:\n  - Pendukung satu\n  - Pendukung dua\n  Menyangkal: Penyangkal tunggal");
    const one = miraMessage(analysis).content;
    expect(section(one, "Ringkasan Gejala")).toContain("Data yang perlu dilengkapi\nData kurang sintetis");
    expect(section(one, "Ringkasan Gejala")).not.toContain("- Data kurang sintetis");
  });
  it("keeps section edits and separators intact without replacing later content", () => {
    const content = miraMessage(analysis).content;
    const edited = replaceSection(content, documentSections(content).find(s => s.title === "Terapi Farmakologi")!, "Catatan manual sintetis\n\n");
    expect(edited).toContain("Catatan manual sintetis\n\n---\n\n## Edukasi");
    expect(documentSections(edited)).toHaveLength(6);
  });
});

describe("typing reveal", () => {
  // 3000 characters type in 2000 ms: segment shares are 200, 1000 and 800 ms.
  const lengths = [300, 1500, 1200];
  it("types the title first, then unfolds each section before typing it", () => {
    expect(revealAt(lengths, 0)).toEqual({ visible: [0, 0, 0], active: 0, unfolding: false, done: false });
    expect(revealAt(lengths, 100)).toEqual({ visible: [150, 0, 0], active: 0, unfolding: false, done: false });
    expect(revealAt(lengths, 200 + unfoldMs / 2)).toEqual({ visible: [300, 0, 0], active: 1, unfolding: true, done: false });
    expect(revealAt(lengths, 200 + unfoldMs + 500)).toEqual({ visible: [300, 750, 0], active: 1, unfolding: false, done: false });
    expect(revealAt(lengths, 1200 + unfoldMs + 10)).toEqual({ visible: [300, 1500, 0], active: 2, unfolding: true, done: false });
    expect(revealAt(lengths, 2000 + 2 * unfoldMs)).toEqual({ visible: [300, 1500, 1200], active: 2, unfolding: false, done: true });
  });
  it("gives a short section enough time to be seen typing", () => {
    const short = revealAt([10, 5, 9000], 200 + unfoldMs + 100);
    expect(short.active).toBe(1);
    expect(short.visible[1]).toBeGreaterThan(0);
    expect(short.visible[1]).toBeLessThan(5);
  });
  it("finishes any answer within a few seconds", () => {
    for (const total of [200, 3000, 12000]) {
      expect(typingDurationMs(total)).toBeGreaterThanOrEqual(1500);
      expect(typingDurationMs(total)).toBeLessThanOrEqual(4000);
    }
    const six = [20, 400, 600, 900, 300, 500, 700];
    expect(revealAt(six, 4000 + 6 * unfoldMs + 7 * 200).done).toBe(true);
  });
});

describe("thinking steps", () => {
  it("lists the clinical steps in order and stops on the last one until the answer arrives", () => {
    expect(thinkingSteps).toEqual(["Permintaan klinis diterima", "Intensi klinis teridentifikasi", "Sentra Oracle aktif", "Konteks klinis pasien dihimpun", "Dokumen medis ditelaah", "Literatur dan pedoman klinis ditelusuri", "Temuan klinis dikorelasikan", "Bukti ilmiah sedang disintesis"]);
    expect(thinkingStepAt(0)).toBe(0);
    expect(thinkingStepAt(thinkingStepMs * 3 + 1)).toBe(3);
    expect(thinkingStepAt(60000)).toBe(thinkingSteps.length - 1);
    expect(thinkingStepMs * (thinkingSteps.length - 1)).toBeLessThanOrEqual(2500);
  });
});

describe("focus modes", () => {
  const titles = (content: string) => documentSections(content).map(s => s.title);
  it("puts Penunjang first for workup and keeps the default document unchanged", () => {
    const workup = miraMessage(analysis, undefined, "workup");
    expect(workup.mode).toBe("workup");
    expect(titles(workup.content)).toEqual(["Penunjang", "Ringkasan Gejala", "Differential Diagnosis", "Diagnosis", "Terapi Farmakologi", "Edukasi"]);
    expect(miraMessage(analysis).content).toBe(miraDraft(analysis.result, analysis.traceId, analysis.createdAt, analysis.case));
    expect(miraMessage(analysis).mode).toBe("ddx");
  });
  it("prepends a referral draft built from recorded data only", () => {
    const withRefer = { ...analysis, result: { ...analysis.result, disposition: { decision: "refer" as const, urgency: "urgent" as const } } };
    const refer = miraMessage(withRefer, undefined, "refer");
    expect(titles(refer.content)).toEqual([referralSectionTitle, ...diagnosisSectionTitles]);
    const body = section(refer.content, referralSectionTitle);
    expect(body).toContain("Keputusan\nRujuk · segera");
    expect(body).toContain("Diagnosis sintetis (J00)");
    expect(body).toContain("Keluhan sintetis");
    expect(body).toContain("Usulan tes sintetis");
    expect(section(miraMessage(analysis, undefined, "refer").content, referralSectionTitle)).not.toContain("Keputusan");
  });
  it("re-renders untouched focus drafts in focus order and leaves edited ones alone", () => {
    const refer = miraMessage(analysis, undefined, "refer");
    expect(titles(diagnosisContent(refer))[0]).toBe(referralSectionTitle);
    const edited = { ...refer, content: refer.content + "\nCatatan klinisi" };
    expect(diagnosisContent(edited)).toBe(edited.content);
  });
});

describe("source shown to the clinician", () => {
  it("shows the case input without naming the internal engine and keeps the stored source intact", () => {
    const message = miraMessage(analysis);
    const shown = sourceForDisplay(message);
    expect(shown).toContain("Keluhan sintetis");
    expect(shown).toContain("synthetic-trace");
    expect(shown).not.toMatch(/mira/i);
    expect(message.sourceText).toContain("\"kind\": \"MIRA\"");
    expect(sourceForDisplay({ sourceText: "Input\nteks lokal" })).toBe("Input\nteks lokal");
    expect(sourceForDisplay({})).toBeUndefined();
  });
});
