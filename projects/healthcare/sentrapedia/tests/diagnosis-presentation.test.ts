import { describe, expect, it, vi } from "vitest";
import { emptyCase, type AadiResult } from "../src/lib/aadi/contract";
import { diagnosisContent, hasAadiSource, diagnosisSectionTitles, doctorSummaryTitle, icd10SectionTitle, aadiDraft, aadiMessage, referralPrompt, referralSectionTitle, summaryCopies, reportTitle, sourceForDisplay, splitQuotes, theOracleCitations, theOracleReferenceItems, theOracleReferencesTitle } from "../src/lib/aadi/presentation";
import { documentSections, replaceSection } from "../src/lib/studio";
import { createDraft } from "../src/lib/drafts";
import { theOracleDiseases } from "../src/lib/theoracle";
import { revealAt, thinkingStepAt, thinkingStepMs, thinkingSteps, typingDurationMs, unfoldMs } from "../src/lib/typing";
import { theOracleSourceLinks } from "../src/lib/aadi/presentation";
import { THEORACLE_GROUNDING_CAPABILITY, type TheOracleGroundingBundle } from "../src/lib/theoracle-grounding-types";
import { initialWorkspace, workspaceReducer, loadWorkspace } from "../src/lib/workspace";
import { gateTherapy } from "../src/lib/theoracle-evidence-gate";
import { withCatalog } from "./private-data";

const withCode = (code: string) => theOracleDiseases.filter(d => d.kode.trim().toUpperCase() === code);
// Oracle's Indonesian name when the catalog has J00 exactly (the public sample catalog may not).
const j00 = `${withCode("J00")[0]?.nama ?? "Diagnosis sintetis"} (J00)`;

const analysis = {
  case: { ...emptyCase(), chiefComplaint: "Keluhan sintetis", anamnesis: { freeText: "Gejala sintetis" }, currentMedications: ["Obat tercatat"], results: [{ name: "Tes sintetis", value: 3, unit: "unit" }] },
  result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Diagnosis sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [{ icd10: "X00", label: "Jangan terlewat sintetis", confidenceTier: "unknown" }] }, evidence: [{ icd10: "J00", supporting: ["Alasan sintetis"], opposing: ["Penyangkal sintetis"] }], missingInformation: ["Data kurang sintetis"], nextBestActions: [{ kind: "test", item: "Usulan tes sintetis", reason: "Alasan tes" }, { kind: "question", item: "Pertanyaan sintetis", reason: "Alasan tanya" }], disposition: null, unfilled: [{ field: "disposition", reason: "Belum cukup data" }], meta: { version: "test", model: "mock", costUsd: null } } satisfies AadiResult,
  traceId: "synthetic-trace", createdAt: "2026-10-09T00:00:00Z",
};
const therapyTitle = "7. Rencana tata laksana";
const section = (content: string, title: string) => documentSections(content).find(s => s.title === title)!.body.trim();
const withDifferential = (differential: AadiResult["differential"]) => ({ ...analysis, result: { ...analysis.result, differential } });

describe("TheOracle citation persistence", () => {
  it("retains the exact retrieval snapshot through edits, reload and untouched regeneration", () => {
    const grounding: TheOracleGroundingBundle = { version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-11T00:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "chunk-1", text: "Malaria tanpa komplikasi diterapi dengan DHP sesuai berat badan.", retrievalRank: 1, similarity: 0.68, source: { title: "PNPK Malaria.md", docSource: "Kemenkes uji", origin: "oracle-ii-knowledge-base", textSha256: "c".repeat(64) } }] };
    const message = aadiMessage({ ...analysis, grounding });
    // The passages are a sub-part of part 9's "Referensi dan jejak analisis" fold, not a part of their own.
    expect(documentSections(message.content).map(section => section.title)).toEqual([doctorSummaryTitle, ...diagnosisSectionTitles]);
    const fold = section(message.content, "9. Referensi dan status verifikasi").split("Referensi penyakit terkait")[1];
    expect(fold).toContain(`### ${theOracleReferencesTitle}\n\nReferensi yang dipilih sebelum analisis:`);
    expect(diagnosisContent(message)).toBe(message.content);
    expect(JSON.parse(sourceForDisplay(message)!).grounding).toEqual(grounding);
    expect(theOracleSourceLinks(message)[0]).toEqual({ id: "chunk-1", label: "PNPK Malaria.md", text: grounding.evidence[0].text });
    expect(message.content).toContain("- PNPK Malaria.md [chunk-1] · kemiripan 0.68");
    const state = { ...initialWorkspace, encounters: [{ ...initialWorkspace.encounters[0], messages: [message] }] };
    const edited = workspaceReducer(state, { type: "message.edit", encounterId: state.encounters[0].id, messageId: message.id, content: message.content + "\nCatatan dokter" });
    const restored = loadWorkspace(JSON.stringify(edited)).workspace;
    const saved = restored!.encounters[0].messages[0];
    expect(saved.sourceText).toBe(message.sourceText);
    expect(diagnosisContent(saved)).toContain("Catatan dokter");
    expect(JSON.parse(saved.sourceText!).grounding).toEqual(grounding);
  });
  it("migrates answers saved under the MIRA name once, keeping the doctor's edited text", () => {
    const current = aadiMessage(analysis);
    const legacyText = current.content.replace(" (Augmented Artificial Intelligence Diagnosis Integration)", "").replaceAll("AADI", "MIRA");
    const legacy = { ...current, sourceText: current.sourceText!.replace('{"kind":"AADI",', '{"kind":"MIRA",'), content: legacyText, originalContent: legacyText };
    expect(hasAadiSource(legacy)).toBe(false);
    const state = { ...initialWorkspace, encounters: [{ ...initialWorkspace.encounters[0], messages: [legacy, { ...legacy, id: "edited-legacy" }] }] };
    const doctorText = `${legacyText}\nCatatan dokter: kandidat MIRA sesuai.`;
    const edited = workspaceReducer(state, { type: "message.edit", encounterId: state.encounters[0].id, messageId: "edited-legacy", content: doctorText });
    const restored = loadWorkspace(JSON.stringify(edited)).workspace;
    const [untouched, kept] = restored.encounters[0].messages;
    for (const message of [untouched, kept]) {
      expect(message.sourceText).toBe(current.sourceText);
      expect(hasAadiSource(message)).toBe(true);
      expect(message.originalContent).not.toContain("MIRA");
    }
    expect(untouched.content).toBe(untouched.originalContent);
    expect(diagnosisContent(untouched)).toBe(current.content);
    expect(kept.content).toBe(doctorText);
    expect(diagnosisContent(kept)).toBe(doctorText);
    expect(kept.revisions).toEqual(edited.encounters[0].messages[1].revisions);
    expect(loadWorkspace(JSON.stringify(restored)).workspace).toEqual(restored);
  });
  it("leaves legacy drafts readable without invented TheOracle provenance", () => {
    const message = aadiMessage(analysis);
    expect(theOracleSourceLinks(message)).toEqual([]);
    expect(diagnosisContent(message)).toBe(message.content);
    expect(sourceForDisplay(message)).not.toContain("grounding");
  });
});

describe("nine-part clinical report", () => {
  const content = aadiMessage(analysis).content;
  it("orders the nine parts and preserves recorded facts, uncertainty and provenance", () => {
    const message = aadiMessage(analysis);
    expect(message.content.startsWith(`${reportTitle}\n\n**Draf analisis AADI (Augmented Artificial Intelligence Diagnosis Integration) • Untuk tinjauan dokter**\n`)).toBe(true);
    expect(diagnosisSectionTitles).toEqual(["1. Ringkasan kasus", "2. Skrining kegawatan", "3. Anamnesis terarah", "4. Pemeriksaan fisik", "5. Asesmen dan diagnosis banding", "6. Rencana pemeriksaan penunjang", "7. Rencana tata laksana", "8. Edukasi dan tindak lanjut", "9. Referensi dan status verifikasi"]);
    expect(documentSections(message.content).map(s => s.title)).toEqual([doctorSummaryTitle, ...diagnosisSectionTitles]);
    for (const text of ["Keluhan sintetis", "Gejala sintetis", "Obat tercatat", "Tes sintetis", "Jangan terlewat sintetis", "Alasan sintetis", "Penyangkal sintetis", "Data kurang sintetis", "Usulan tes sintetis", "Pertanyaan sintetis", "Belum cukup data", "synthetic-trace", "SHA-256"]) expect(message.content).toContain(text);
    expect(JSON.parse(message.sourceText!).case).toEqual(analysis.case);
    expect(JSON.parse(message.sourceText!).result).toEqual(analysis.result);
  });
  it("summarises the case as a table and says what is not yet available", () => {
    const summary = section(content, "1. Ringkasan kasus");
    expect(summary).toMatch(/^\| Komponen \| Keterangan \|\n\| --- \| --- \|\n/);
    for (const row of ["| Keluhan utama | Keluhan sintetis |", "| Identitas klinis | Usia, jenis kelamin, dan status kehamilan/pascapersalinan belum tersedia |", "| Riwayat penyakit sekarang | Gejala sintetis |", "| Pemeriksaan fisik | Belum tersedia |", "| Hasil pemeriksaan | Tes sintetis: 3 unit |", `| Asesmen awal | Kandidat AADI: ${j00}; belum terkonfirmasi |`]) expect(summary).toContain(row);
    expect(summary).not.toContain("Alergi");
  });
  it("escapes a pipe and folds line breaks in case text, so a table row stays one row", () => {
    const piped = { ...analysis, case: { ...analysis.case, chiefComplaint: "Nyeri | dada\nsejak pagi" } };
    expect(section(aadiMessage(piped).content, "1. Ringkasan kasus")).toContain("| Keluhan utama | Nyeri \\| dada sejak pagi |");
  });
  it("keeps the AADI candidate as the working diagnosis, labelled unconfirmed, and gives every candidate a status", () => {
    const body = section(content, "5. Asesmen dan diagnosis banding");
    expect(body).toContain(`**Diagnosis kerja sementara:** kandidat AADI ${j00}, belum terkonfirmasi.`);
    expect(body).toContain(`| ${j00} | Mendukung: Alasan sintetis. Menyangkal: Penyangkal sintetis | Kandidat utama, belum terkonfirmasi |`);
    expect(body).toContain("| Jangan terlewat sintetis (X00) | Belum tersedia | Perlu disaring segera |");
    expect(body).toContain("**Catatan penalaran:** belum tersedia untuk analisis ini.");
    expect(body).toContain("**Kode ICD-10:** J00 (kandidat); belum final, ditetapkan setelah asesmen dokter.");
    expect(section(content, "2. Skrining kegawatan")).toContain("**Diagnosis yang tidak boleh terlewat menurut AADI:**\n- Jangan terlewat sintetis (X00)");
  });
  it("uses the engine's reasoning note, discriminators, status and test indication when it gives them", () => {
    const cannotMiss = [{ icd10: "X00", label: "Jangan terlewat sintetis", confidenceTier: "unknown" as const, discriminators: "Onset mendadak", status: "screenIfIndicated" as const }];
    const rich = { ...analysis, result: { ...analysis.result, reasoningNote: "Lokasi saja tidak cukup.", differential: { ...analysis.result.differential, cannotMiss }, nextBestActions: [{ kind: "test" as const, item: "Usulan tes sintetis", reason: "Alasan tes", indication: "Bila demam" }] } };
    const report = aadiMessage(rich).content;
    expect(section(report, "5. Asesmen dan diagnosis banding")).toContain("**Catatan penalaran:** Lokasi saja tidak cukup.");
    expect(section(report, "5. Asesmen dan diagnosis banding")).toContain("| Jangan terlewat sintetis (X00) | cari: Onset mendadak | Perlu disaring sesuai temuan |");
    const prefixed = { ...rich, result: { ...rich.result, differential: { ...rich.result.differential, cannotMiss: [{ ...cannotMiss[0], discriminators: "Cari: ronki basah halus" }] } } };
    expect(section(aadiMessage(prefixed).content, "5. Asesmen dan diagnosis banding")).toContain("| Jangan terlewat sintetis (X00) | Cari: ronki basah halus |");
    expect(section(content, "5. Asesmen dan diagnosis banding")).not.toContain("cari:");
    expect(section(report, "6. Rencana pemeriksaan penunjang")).toContain("| Usulan tes sintetis | Bila demam | Alasan tes |");
  });
  it("lists the proposed tests with their indication, or says none was proposed", () => {
    expect(section(content, "6. Rencana pemeriksaan penunjang")).toContain("| Pemeriksaan | Indikasi klinis | Pertimbangan AADI |\n| --- | --- | --- |\n| Usulan tes sintetis | Belum tersedia; tuliskan indikasi klinisnya | Alasan tes |");
    const none = section(aadiMessage({ ...analysis, result: { ...analysis.result, nextBestActions: [] } }).content, "6. Rencana pemeriksaan penunjang");
    expect(none).toContain("AADI belum mengusulkan pemeriksaan penunjang.");
    expect(none).not.toContain("| Pemeriksaan |");
  });
  // Gaffer, 2026-10-20 (option A): parts 3 and 4 come from AADI's data for the case, with the template only as a fallback.
  it("builds the directed history and examination from AADI's data for the case", () => {
    const exam = { kind: "exam" as const, item: "Pemeriksaan sintetis", reason: "Alasan periksa" };
    const report = aadiMessage({ ...analysis, result: { ...analysis.result, missingInformation: ["Data satu", "Data dua"], nextBestActions: [...analysis.result.nextBestActions, exam] } }).content;
    expect(section(report, "3. Anamnesis terarah")).toBe("| Data yang perlu dilengkapi | Alasan |\n| --- | --- |\n| Pertanyaan sintetis | Alasan tanya |\n| Data satu | Belum tercatat; dapat mengubah asesmen |\n| Data dua | Belum tercatat; dapat mengubah asesmen |");
    expect(section(report, "4. Pemeriksaan fisik")).toBe("**Temuan aktual: belum tersedia.**\n\n**Pemeriksaan terarah dari AADI:**\n- Pemeriksaan sintetis — Alasan periksa");
  });
  it("falls back to the template aspects when AADI asks for nothing", () => {
    const silent = aadiMessage({ ...analysis, result: { ...analysis.result, missingInformation: [], nextBestActions: [] } }).content;
    expect(section(silent, "3. Anamnesis terarah")).toMatch(/^Aspek yang perlu dilengkapi \(AADI belum memberi data untuk kasus ini\):\n\n\| Aspek \| Data yang perlu dilengkapi \|/);
    expect(section(silent, "3. Anamnesis terarah")).toContain("| Pencetus dan pereda | Aktivitas, posisi, makanan, obat, atau faktor lain |");
    expect(section(silent, "4. Pemeriksaan fisik")).toContain("Pemeriksaan yang perlu didokumentasikan:\n- Tanda vital, termasuk tekanan darah, nadi, napas, suhu, dan saturasi oksigen.");
  });
  it("screens general red flags in every case and adds the headache list only for a headache case", () => {
    expect(section(content, "2. Skrining kegawatan")).toContain("- Gangguan jalan napas, sesak berat, atau saturasi oksigen rendah.");
    expect(content).not.toContain("thunderclap");
    expect(section(content, "9. Referensi dan status verifikasi")).toContain("(relevan bila keluhan berupa nyeri kepala)");
    const headacheCase = { ...analysis, case: { ...analysis.case, chiefComplaint: "nyeri kepalam hebat bagian belakang" } };
    const headache = aadiMessage(headacheCase).content;
    expect(section(headache, "2. Skrining kegawatan")).toContain("- Gangguan jalan napas, sesak berat, atau saturasi oksigen rendah.");
    expect(section(headache, "2. Skrining kegawatan")).toContain("Khusus nyeri kepala:\n- Nyeri mendadak yang mencapai intensitas maksimal dalam 1–5 menit (*thunderclap headache*).");
    expect(section(headache, "2. Skrining kegawatan")).toContain("**Bila ada tanda kegawatan, stabilkan dan rujuk segera ke IGD.** **Jika dicurigai perdarahan subaraknoid, rujuk segera ke IGD.** [NICE CG150](https://www.nice.org.uk/guidance/cg150/chapter/recommendations)");
    const silent = aadiMessage({ ...headacheCase, result: { ...analysis.result, missingInformation: [], nextBestActions: [] } }).content;
    expect(section(silent, "3. Anamnesis terarah")).toContain("| Lokasi dan penjalaran | Unilateral/bilateral; menjalar dari leher atau ke area lain |");
    expect(section(headache, "4. Pemeriksaan fisik")).toContain("- Tanda rangsang meningeal sesuai indikasi.");
    expect(section(headache, "6. Rencana pemeriksaan penunjang")).toContain("[NICE NG228](https://www.nice.org.uk/guidance/ng228/chapter/Recommendations)");
    expect(section(headache, "9. Referensi dan status verifikasi")).not.toContain("relevan bila");
    expect(aadiMessage(withDifferential({ likely: [{ icd10: "G44.2", label: "Tension-type headache", confidenceTier: "low" }], alternatives: [], cannotMiss: [] })).content).toContain("thunderclap");
  });
  it("lists the fixed references with their links, the verification status and the method statement in part 9", () => {
    const body = section(content, "9. Referensi dan status verifikasi");
    for (const link of ["[NICE CG150](https://www.nice.org.uk/guidance/cg150/chapter/recommendations)", "[NICE NG228](https://www.nice.org.uk/guidance/ng228/chapter/Recommendations)", "[ICHD-3](https://ichd-3.org/wp-content/uploads/2018/01/The-International-Classification-of-Headache-Disorders-3rd-Edition-2018)"]) expect(body).toContain(link);
    expect(body).toContain("| Cek dosis obat (Oracle) | Dosis dan indikasi usulan terapi | Belum dapat dinilai |");
    expect(body).toContain("Penelusuran referensi dan penalaran diagnostik disusun secara sistematis dengan mengintegrasikan bukti ilmiah, pedoman praktik klinis, dan temuan pasien. Alur analisis mencakup identifikasi tanda bahaya, evaluasi diagnosis banding, serta penilaian kesesuaian pemeriksaan dan terapi untuk mendukung pengambilan keputusan klinis yang terarah dan dapat ditelusuri.");
    for (const old of ["Jejak audit internal", "Dokter peninjau", "Status akhir"]) expect(body).not.toContain(old);
  });
  it.skipIf(!withCatalog)("shows the database narratives for the likely diagnosis in their own parts", () => {
    const disease = withCode("J00")[0];
    for (const text of [disease.definisi, ...disease.gejala, disease.diagnosis]) expect(section(content, "5. Asesmen dan diagnosis banding")).toContain(text);
    expect(section(content, therapyTitle)).toContain(disease.terapi);
    expect(section(content, "8. Edukasi dan tindak lanjut")).toContain(disease.rujukan);
    for (const title of [therapyTitle, "8. Edukasi dan tindak lanjut"]) expect(section(content, title)).not.toContain("Obat tercatat");
  });
  it.skipIf(!withCatalog)("shows database narratives for the highest group that has one, not for every candidate", () => {
    const input = withDifferential({ likely: [{ icd10: "R10.3", label: "Nyeri perut bawah", confidenceTier: "low" }], alternatives: [{ icd10: "K35.8", label: "Appendicitis", confidenceTier: "low" }], cannotMiss: [{ icd10: "A06.0", label: "Amoebic dysentery", confidenceTier: "low" }] });
    expect(withCode("R10.3")).toHaveLength(0);
    const report = aadiMessage(input).content;
    const appendicitis = theOracleDiseases.find(d => d.kode === "K35")!, dysentery = theOracleDiseases.find(d => d.kode === "A03-A09")!;
    expect(section(report, "5. Asesmen dan diagnosis banding")).toContain(appendicitis.definisi);
    expect(section(report, "5. Asesmen dan diagnosis banding")).not.toContain(dysentery.definisi);
    expect(section(report, therapyTitle)).not.toContain(dysentery.terapi);
    expect(report).toContain(dysentery.terapi);
  });
  it("keeps database bookkeeping out of the visible text", () => {
    const visible = content.slice(0, content.indexOf("Referensi penyakit terkait"));
    expect(visible).not.toMatch(/record \d+|SHA-256|Trace:/);
  });
  it("keeps every database record of other candidates in the collapsed references", () => {
    const repeated = withDifferential({ likely: [], alternatives: [{ icd10: "A09", label: "Alternatif sintetis", confidenceTier: "low" }], cannotMiss: [] });
    const report = aadiMessage(repeated).content;
    for (const disease of withCode("A09")) { expect(report).toContain(`record ${disease.id}`); expect(report).toContain(disease.terapi); }
    const unmatched = withDifferential({ likely: [{ icd10: "C92.0", label: "Kandidat sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [] });
    expect(section(aadiMessage(unmatched).content, therapyTitle)).toContain("Belum ada data terapi untuk diagnosis ini.");
  });
  it.skipIf(!withCatalog)("resolves explicit ranges, category coverage and comma-separated codes as labeled references", () => {
    for (const [code, sourceCode] of [["J02.9", "J02-J03"], ["J00.1", "J00"], ["R42", "H81-H83, R42"], ["G47.0", "G47.0, F51.0"]]) {
      const input = withDifferential({ likely: [{ icd10: code, label: "Kandidat sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [] });
      const report = aadiMessage(input).content;
      const reference = theOracleDiseases.find(d => d.kode === sourceCode)!;
      expect(report).toContain(`(${sourceCode}) · kode hasil analisis: ${code} · oracle/sentrapedia.json record ${reference.id}`);
      expect(section(report, therapyTitle)).toContain(reference.terapi);
      expect(JSON.parse(aadiMessage(input).sourceText!).result.differential.likely[0].icd10).toBe(code);
    }
  });
  it("distinguishes an empty analysis from absent database records", () => {
    const input = { ...withDifferential({ likely: [], alternatives: [], cannotMiss: [] }), result: { ...withDifferential({ likely: [], alternatives: [], cannotMiss: [] }).result, evidence: [] } };
    const report = aadiMessage(input).content;
    expect(report.split("## 1. Ringkasan kasus")[0]).toContain("Belum ada kandidat diagnosis dari keluhan ini");
    expect(section(report, therapyTitle)).toContain("Belum ada data terapi untuk diagnosis ini.");
    expect(section(report, "5. Asesmen dan diagnosis banding")).toContain("**Diagnosis kerja sementara:** belum dapat ditetapkan dari data yang ada.");
    expect(section(report, "5. Asesmen dan diagnosis banding")).toContain("**Kode ICD-10:** ditentukan setelah asesmen dokter; kode diagnosis spesifik pada draf awal belum dapat dianggap final.");
  });
  it("stores the analysis source as compact JSON", () => {
    const message = aadiMessage(analysis);
    expect(message.sourceText).not.toContain("\n");
    expect(JSON.parse(message.sourceText!).traceId).toBe(analysis.traceId);
  });
  it("derives a message's view once per unchanged message, and again when the message changes", () => {
    const old = "# Analisis kasus\n\n## Ringkasan Kasus\n\nLama\n";
    const message = { ...aadiMessage(analysis), content: old, originalContent: old };
    const first = diagnosisContent(message);
    const parse = vi.spyOn(JSON, "parse");
    expect(diagnosisContent(message)).toBe(first);
    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
    message.content = old + "Catatan klinisi";
    expect(diagnosisContent(message)).toBe(old + "Catatan klinisi");
  });
  it("re-renders untouched older drafts as the report without mutating saved text or source", () => {
    const old = "# Analisis kasus\n\n## Ringkasan Gejala\n\nLama\n\n---\n\n## Diagnosis\n\nLama\n";
    const message = { ...aadiMessage(analysis), content: old, originalContent: old };
    const before = JSON.stringify(message);
    expect(diagnosisContent(message)).toBe(aadiMessage(analysis).content);
    expect(JSON.stringify(message)).toBe(before);
    expect(diagnosisContent({ ...message, content: old + "Catatan klinisi" })).toBe(old + "Catatan klinisi");
    expect(diagnosisContent({ ...message, sourceText: "invalid" })).toBe(old);
    expect(diagnosisContent({ ...message, sourceText: undefined })).toBe(old);
    const report = aadiMessage(analysis);
    expect(diagnosisContent(report)).toBe(report.content);
  });
  it.skipIf(!withCatalog)("writes the pharmacological therapy as drug and compact dose per line, then DDI and contraindications", () => {
    const therapy = { forDiagnosis: { icd10: "J00", label: "Diagnosis sintetis" }, regimen: [{ drug: "Ceftriaxone", dose: "1x500mg", route: "IM", duration: "dosis tunggal", note: "1g bila >=150kg" }, { drug: "Azithromycin", dose: "1x1g", route: "PO", duration: "dosis tunggal", note: "" }], interactions: ["Azithromycin dengan warfarin: risiko perdarahan", "Ceftriaxone dengan kalsium IV: presipitasi"], contraindications: ["Ceftriaxone: alergi sefalosporin"] };
    const body = section(aadiMessage({ ...analysis, result: { ...analysis.result, therapy } }).content, therapyTitle);
    expect(body).toContain("**Usulan terapi dari AADI:**\n\nUntuk Diagnosis sintetis (J00)\n\n- Ceftriaxone 1x500mg IM dosis tunggal (1g bila >=150kg)\n- Azithromycin 1x1g PO dosis tunggal\n\nDDI\n- Azithromycin dengan warfarin: risiko perdarahan\n- Ceftriaxone dengan kalsium IV: presipitasi\n\nKontraindikasi\nCeftriaxone: alergi sefalosporin");
    expect(body).toContain("**Catatan terapi draf awal:** Ceftriaxone, Azithromycin tercantum sebagai usulan.");
    const disease = withCode("J00")[0];
    expect(body.indexOf(disease.terapi)).toBeGreaterThan(body.indexOf("Referensi penyakit terkait"));
    const single = section(aadiMessage({ ...analysis, result: { ...analysis.result, therapy: { ...therapy, regimen: [therapy.regimen[1]], interactions: [] } } }).content, therapyTitle);
    expect(single).toContain("Untuk Diagnosis sintetis (J00)\n\nAzithromycin 1x1g PO dosis tunggal\n\nKontraindikasi\nCeftriaxone: alergi sefalosporin");
  });
  it("keeps section edits and separators intact without replacing later content", () => {
    const edited = replaceSection(content, documentSections(content).find(s => s.title === therapyTitle)!, "Catatan manual sintetis\n\n");
    expect(edited).toContain("Catatan manual sintetis\n\n---\n\n## 8. Edukasi dan tindak lanjut");
    expect(documentSections(edited)).toHaveLength(10);
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
    expect(thinkingSteps).toEqual(["Permintaan klinis diterima", "Intensi klinis teridentifikasi", "Oracle aktif", "Konteks klinis pasien dihimpun", "Dokumen medis ditelaah", "Literatur dan pedoman klinis ditelusuri", "Temuan klinis dikorelasikan", "Bukti ilmiah sedang disintesis"]);
    expect(thinkingStepAt(0)).toBe(0);
    expect(thinkingStepAt(thinkingStepMs * 3 + 1)).toBe(3);
    expect(thinkingStepAt(60000)).toBe(thinkingSteps.length - 1);
    expect(thinkingStepMs * (thinkingSteps.length - 1)).toBeLessThanOrEqual(2500);
  });
});

describe("focus modes", () => {
  const titles = (content: string) => documentSections(content).map(s => s.title);
  it("puts the test plan first for workup, keeping every part's number, and keeps the default document unchanged", () => {
    const workup = aadiMessage(analysis, undefined, "workup");
    expect(workup.mode).toBe("workup");
    expect(titles(workup.content)).toEqual([doctorSummaryTitle, diagnosisSectionTitles[5], ...diagnosisSectionTitles.filter((_, index) => index !== 5)]);
    expect(aadiMessage(analysis).content).toBe(aadiDraft(analysis.result, analysis.traceId, analysis.createdAt, analysis.case));
    expect(aadiMessage(analysis).mode).toBe("ddx");
  });
  it("prepends a referral draft built from recorded data only", () => {
    const withRefer = { ...analysis, result: { ...analysis.result, disposition: { decision: "refer" as const, urgency: "urgent" as const } } };
    const refer = aadiMessage(withRefer, undefined, "refer");
    expect(titles(refer.content)).toEqual([doctorSummaryTitle, referralSectionTitle, ...diagnosisSectionTitles]);
    const body = section(refer.content, referralSectionTitle);
    expect(body).toContain("Keputusan\nRujuk · segera");
    expect(body).toContain("Diagnosis sintetis (J00)");
    expect(body).toContain("Keluhan sintetis");
    expect(body).toContain("Usulan tes sintetis");
    expect(section(aadiMessage(analysis, undefined, "refer").content, referralSectionTitle)).not.toContain("Keputusan");
  });
  it("puts the ICD-10 codes first for icd10, grouped as the analysis returned them", () => {
    const icd10 = aadiMessage(analysis, undefined, "icd10");
    expect(icd10.mode).toBe("icd10");
    expect(titles(icd10.content)).toEqual([doctorSummaryTitle, icd10SectionTitle, ...diagnosisSectionTitles]);
    expect(section(icd10.content, icd10SectionTitle)).toBe("Diagnosis kerja\nJ00 — Diagnosis sintetis\n\nJangan terlewat\nX00 — Jangan terlewat sintetis\n\nKode belum final; ditetapkan setelah asesmen dokter.");
    expect(titles(diagnosisContent(icd10))[1]).toBe(icd10SectionTitle);
  });
  it("lists several codes in a group as bullets and says so when no code was returned", () => {
    const two = withDifferential({ likely: [{ icd10: "J00", label: "Diagnosis sintetis", confidenceTier: "low" }, { icd10: "J02.9", label: "Diagnosis sintetis dua", confidenceTier: "low" }], alternatives: [], cannotMiss: [] });
    expect(section(aadiMessage(two, undefined, "icd10").content, icd10SectionTitle)).toBe("Diagnosis kerja\n- J00 — Diagnosis sintetis\n- J02.9 — Diagnosis sintetis dua\n\nKode belum final; ditetapkan setelah asesmen dokter.");
    const none = withDifferential({ likely: [], alternatives: [], cannotMiss: [] });
    expect(section(aadiMessage(none, undefined, "icd10").content, icd10SectionTitle)).toBe("Belum ada kode diagnosis dari data yang ada.");
  });
  it("re-renders untouched focus drafts in focus order and leaves edited ones alone", () => {
    const refer = aadiMessage(analysis, undefined, "refer");
    expect(titles(diagnosisContent(refer))[1]).toBe(referralSectionTitle);
    const edited = { ...refer, content: refer.content + "\nCatatan klinisi" };
    expect(diagnosisContent(edited)).toBe(edited.content);
  });
});

describe("source shown to the clinician", () => {
  it("shows the case input without naming the internal engine and keeps the stored source intact", () => {
    const message = aadiMessage(analysis);
    const shown = sourceForDisplay(message);
    expect(shown).toContain("Keluhan sintetis");
    expect(shown).toContain("synthetic-trace");
    expect(shown).not.toMatch(/aadi/i);
    expect(message.sourceText).toContain("\"kind\":\"AADI\"");
    expect(sourceForDisplay({ sourceText: "Input\nteks lokal" })).toBe("Input\nteks lokal");
    expect(sourceForDisplay({})).toBeUndefined();
  });
});

describe("therapy verification presentation", () => {
  const grounding: TheOracleGroundingBundle = { version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-11T00:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "E1", text: "Pneumonia diterapi dengan amoksisilin.", retrievalRank: 1, similarity: 0.7, source: { title: "PNPK Pneumonia.md", docSource: "Kemenkes uji", origin: "oracle-ii-knowledge-base", textSha256: "c".repeat(64) } }] };
  it("shows a removed dose as 'dosis: cek pedoman' and lists therapy verification after the references", () => {
    const result = { ...analysis.result, therapy: { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, regimen: [{ drug: "Amoxicillin", dose: "", route: "PO", duration: "5 hari", note: "" }], interactions: [], contraindications: ["Amoxicillin: alergi penisilin (belum terverifikasi)"] } };
    const draft = aadiDraft(result, "trace", "2026-10-11T00:00:00.000Z");
    expect(draft).toContain("Amoxicillin dosis: cek pedoman PO 5 hari");
    const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: false, reason: "", drugs: [{ drug: "Amoxicillin", dose: "3x500mg", status: "doseRemoved", evidenceIds: ["E1"] }, { drug: "Levofloxacin", dose: "1x750mg", status: "removed", evidenceIds: [] }] };
    const citations = theOracleCitations(grounding, grounding, gate);
    expect(citations).toContain("\n\n### Cek dosis obat\n\n");
    expect(citations).not.toMatch(/^## /m);
    expect(citations).toContain("- Amoxicillin: dosis tidak ditemukan di Oracle, cek pedoman");
    expect(citations).toContain("- Levofloxacin: tidak ditampilkan, indikasi tidak terverifikasi di Oracle");
    expect(citations).toContain("Referensi terapi (dicari memakai diagnosis):");
    const strengthInName = { ...gate, drugs: [{ drug: "Parasetamol 500 mg", dose: "3x500mg", status: "doseRemoved", evidenceIds: ["E1"] }, { drug: "Amoksisilin 500 mg", dose: "3x500mg", status: "verified", evidenceIds: ["E1"] }] };
    expect(theOracleCitations(grounding, grounding, strengthInName)).toContain("- Parasetamol: dosis tidak ditemukan");
    expect(theOracleCitations(grounding, grounding, strengthInName)).toContain("- Amoksisilin 500 mg: dosis terverifikasi (PNPK Pneumonia)");
  });
  it("reads the reference section back as one item per passage, diagnosis first, a shared passage once", () => {
    const first = grounding.evidence[0];
    const therapy = { ...grounding, evidence: [first, { ...first, evidenceId: "T9", source: { ...first.source, title: "fornas-2025.pdf" }, text: "Parasetamol 3 x 500 mg", retrievalRank: 2 }] };
    const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: false, reason: "", drugs: [{ drug: "Parasetamol", dose: "3x500mg", status: "verified" as const, evidenceIds: ["T9"] }] };
    const [head, body, rest] = splitQuotes("Jejak analisis" + theOracleCitations(grounding, therapy, gate))!;
    expect(head).toBe(`Jejak analisis\n\n### ${theOracleReferencesTitle}\n`);
    expect(rest).toBe("\n\n### Cek dosis obat\n\n- Parasetamol: dosis terverifikasi (Fornas 2025)");
    expect(splitQuotes("Jejak analisis")).toBeNull();
    expect(theOracleReferenceItems(body)).toEqual([
      ...grounding.evidence.map(item => ({ id: item.evidenceId, title: item.source.title, similarity: String(item.similarity), text: item.text })),
      { id: "T9", title: "fornas-2025.pdf", similarity: String(first.similarity), text: "Parasetamol 3 x 500 mg" },
    ]);
    expect(theOracleReferenceItems("Teks tanpa referensi")).toEqual([]);
  });
  it("renders a draft saved before the evidence gate exactly as before", () => {
    expect(theOracleCitations(grounding)).toBe(theOracleCitations(grounding, undefined, undefined));
    expect(theOracleCitations(grounding)).not.toContain("Cek dosis obat");
  });
  it("explains inside the therapy section why therapy was removed, and leaves gate-less drafts unchanged", () => {
    const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: true, reason: "Tidak ada obat yang indikasinya terverifikasi di Oracle.", drugs: [{ drug: "Levofloxacin", dose: "1x750mg", status: "removed" as const, evidenceIds: [] }] };
    const withGate = aadiDraft(analysis.result, "trace", "2026-10-11T00:00:00.000Z", undefined, undefined, gate);
    const body = section(withGate, therapyTitle);
    expect(body).toContain("Terapi tidak ditampilkan: Tidak ada obat yang indikasinya terverifikasi di Oracle.");
    expect(body).not.toContain("Belum ada data terapi");
    const without = aadiDraft(analysis.result, "trace", "2026-10-11T00:00:00.000Z");
    expect(section(without, therapyTitle)).not.toContain("Terapi tidak ditampilkan");
    expect(without).toBe(aadiDraft(analysis.result, "trace", "2026-10-11T00:00:00.000Z", undefined, undefined, undefined));
    const message = aadiMessage({ ...analysis, grounding, evidenceGate: gate });
    expect(section(diagnosisContent(message), therapyTitle)).toContain("Terapi tidak ditampilkan: Tidak ada obat");
  });
  it("gates an untouched draft saved before the evidence gate at render, as the gateway would", () => {
    const pneumonia = { icd10: "J18.9", label: "Pneumonia" };
    const dosed = { ...grounding, evidence: [{ ...grounding.evidence[0], text: "Pneumonia: amoksisilin 500 mg 3 kali sehari; parasetamol bila demam." }] };
    const therapy = { forDiagnosis: pneumonia, regimen: [{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }, { drug: "Paracetamol", dose: "3x1000mg", route: "PO", duration: "", note: "" }, { drug: "Levofloxacin", dose: "1x750mg", route: "PO", duration: "", note: "" }], interactions: [], contraindications: [] };
    const result = { ...analysis.result, differential: { ...analysis.result.differential, likely: [{ ...pneumonia, confidenceTier: "low" as const }] }, therapy };
    const old = aadiMessage({ ...analysis, result, grounding: dosed });
    expect(old.content).toContain("1x750mg");
    const gated = gateTherapy(therapy, dosed, pneumonia);
    const now = aadiMessage({ ...analysis, result: { ...result, therapy: gated.therapy! }, grounding: dosed, evidenceGate: gated.report });
    expect(diagnosisContent(old)).toBe(now.content);
    expect(diagnosisContent(now)).toBe(now.content);
    const state = { ...initialWorkspace, encounters: [{ ...initialWorkspace.encounters[0], messages: [old] }] };
    const edited = workspaceReducer(state, { type: "message.edit", encounterId: state.encounters[0].id, messageId: old.id, content: diagnosisContent(old) + "\nCatatan dokter" }).encounters[0].messages[0];
    expect(diagnosisContent({ ...edited, content: edited.originalContent! })).toBe(now.content);
    expect(diagnosisContent({ ...edited, content: edited.revisions![0].content })).toBe(now.content);
    expect(diagnosisContent(old)).not.toMatch(/1x750mg|3x1000mg/);
    const unbundled = diagnosisContent(aadiMessage({ ...analysis, result }));
    expect(section(unbundled, therapyTitle)).toContain("Terapi tidak ditampilkan: Referensi Oracle untuk terapi tidak tersedia");
    expect(unbundled).not.toMatch(/3x500mg|1x750mg|3x1000mg/);
  });
  it("re-checks a dose that an earlier gate verified from a passage about another disease", () => {
    const versicolor = { icd10: "B36.0", label: "Pityriasis versicolor" };
    const azoles = { ...grounding, evidence: [{ ...grounding.evidence[0], text: "Triazol: flukonazol oral 50 mg per hari selama 14-30 hari; itrakonazol 100-200 mg.", source: { ...grounding.evidence[0].source, title: "dermatovenereologi-perdoski-2021.pdf" } }] };
    const therapy = { forDiagnosis: versicolor, regimen: [{ drug: "Flukonazol", dose: "1x50mg", route: "PO", duration: "14-30 hari", note: "" }], interactions: [], contraindications: [] };
    const result = { ...analysis.result, differential: { ...analysis.result.differential, likely: [{ ...versicolor, confidenceTier: "low" as const }] }, therapy };
    const earlier = { forDiagnosis: versicolor, therapyRemoved: false, reason: "", drugs: [{ drug: "Flukonazol", dose: "1x50mg", status: "verified" as const, evidenceIds: ["E1"] }] };
    const content = diagnosisContent(aadiMessage({ ...analysis, result, grounding: azoles, evidenceGate: earlier }));
    expect(content).not.toContain("1x50mg");
    expect(content).toContain("- Flukonazol: dosis tidak ditemukan di Oracle, cek pedoman");
  });
  it("keeps the therapy grounding in the saved source and its links", () => {
    const therapyGrounding = { ...grounding, evidence: [{ ...grounding.evidence[0], evidenceId: "T1", text: "Terapi pneumonia." }] };
    const message = aadiMessage({ ...analysis, grounding, therapyGrounding });
    expect(JSON.parse(sourceForDisplay(message)!).therapyGrounding).toEqual(therapyGrounding);
    expect(theOracleSourceLinks(message).map(link => link.id)).toEqual(["E1", "T1"]);
    expect(diagnosisContent(message)).toBe(message.content);
  });
  it("lists a passage found by both diagnosis and therapy retrieval once", () => {
    const therapyGrounding = { ...grounding, evidence: [grounding.evidence[0], { ...grounding.evidence[0], evidenceId: "T1", retrievalRank: 2, text: "Terapi pneumonia." }] };
    expect(theOracleSourceLinks(aadiMessage({ ...analysis, grounding, therapyGrounding })).map(link => link.id)).toEqual(["E1", "T1"]);
  });
});

describe("doctor's summary", () => {
  it("puts the five answers above part 1, from the fields the report shows below", () => {
    const summary = section(aadiMessage(analysis).content, doctorSummaryTitle);
    expect(summary).toBe([
      "**Perlu disaring segera:** Jangan terlewat sintetis (X00). Status tanda bahaya: belum dinilai (bagian 2).",
      `**Diagnosis kerja (kandidat, belum terkonfirmasi):** ${j00}`,
      "**Periksa:** Usulan tes sintetis",
      "**Terapi usulan:** lihat bagian 7.",
      "**Rujuk:** belum dinilai.",
    ].join("\n\n"));
  });
  it("names the regimen, or the gate's reason when therapy is withheld, and the disposition when given", () => {
    const therapy = { forDiagnosis: { icd10: "J00", label: "Diagnosis sintetis" }, regimen: [{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }, { drug: "Paracetamol", dose: "", route: "PO", duration: "", note: "" }], interactions: [], contraindications: [] };
    const given = { ...analysis.result, therapy, disposition: { decision: "refer" as const, urgency: "urgent" as const, reason: "Alasan" } };
    const shown = section(aadiDraft(given, "t", "2026-10-20T00:00:00Z", analysis.case), doctorSummaryTitle);
    expect(shown).toContain(`**Terapi usulan:** Amoxicillin 3x500mg PO 5 hari; Paracetamol dosis: cek pedoman PO — untuk ${j00}`);
    expect(shown).toContain("**Rujuk:** Rujuk · segera");
    const removed = section(aadiDraft(given, "t", "2026-10-20T00:00:00Z", analysis.case, undefined, { forDiagnosis: therapy.forDiagnosis, therapyRemoved: true, reason: "Alasan gate sintetis.", drugs: [] }), doctorSummaryTitle);
    expect(removed).toContain("**Terapi usulan:** Terapi tidak ditampilkan: Alasan gate sintetis.");
    const none = section(aadiDraft({ ...analysis.result, differential: { likely: [], alternatives: [], cannotMiss: [] }, nextBestActions: [] }, "t", "2026-10-20T00:00:00Z", analysis.case), doctorSummaryTitle);
    expect(none).toContain("**Perlu disaring segera:** Status tanda bahaya: belum dinilai (bagian 2).");
    expect(none).toContain("**Diagnosis kerja (kandidat, belum terkonfirmasi):** belum dapat ditetapkan dari data yang ada.");
    expect(none).toContain("**Periksa:** lihat bagian 3 dan 4.");
  });
  it("keeps a code without an exact catalog record under the engine's label", () => {
    expect(section(aadiMessage(analysis).content, "5. Asesmen dan diagnosis banding")).toContain("| Jangan terlewat sintetis (X00) |");
  });
  it("shows AADI's therapy before the documentation table in part 7, wording unchanged", () => {
    const therapy = { forDiagnosis: { icd10: "J00", label: "Diagnosis sintetis" }, regimen: [{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }], interactions: [], contraindications: [] };
    const body = section(aadiMessage({ ...analysis, result: { ...analysis.result, therapy } }).content, therapyTitle);
    expect(body.indexOf("**Usulan terapi dari AADI:**")).toBeLessThan(body.indexOf("| Komponen | Dokumentasi |"));
    expect(body.indexOf("**Catatan terapi draf awal:**")).toBeLessThan(body.indexOf("| Komponen | Dokumentasi |"));
  });
  it("shows the patient's saved notes as their own row, apart from the history", () => {
    const data = { ...analysis.case, anamnesis: { freeText: "Konteks Encounter\nRiwayat HT\n\nCatatan kasus\nPasien fiktif" } };
    const summary = section(aadiMessage({ ...analysis, case: data }).content, "1. Ringkasan kasus");
    expect(summary).toContain("| Riwayat penyakit sekarang | Riwayat HT |");
    expect(summary).toContain("| Catatan pasien | Pasien fiktif |");
    const notesOnly = section(aadiMessage({ ...analysis, case: { ...data, anamnesis: { freeText: "Catatan kasus\nPasien fiktif" } } }).content, "1. Ringkasan kasus");
    expect(notesOnly).toContain("| Catatan pasien | Pasien fiktif |");
    expect(notesOnly).not.toContain("| Riwayat penyakit sekarang | Pasien fiktif |");
  });
});

describe("copy and referral from an analysis", () => {
  const headache = { ...analysis,
    case: { ...emptyCase(), chiefComplaint: "Nyeri kepala hebat", demographics: { ageYears: 45, sex: "M" as const }, vitals: { systolic: 170, diastolic: 100 }, anamnesis: { freeText: "Konteks Encounter\nRiwayat HT\n\nCatatan kasus\nPasien fiktif" } },
    result: { ...analysis.result, differential: { likely: [{ icd10: "X01.2", label: "Kandidat sintetis", confidenceTier: "low" as const }], alternatives: [], cannotMiss: [{ icd10: "X60.9", label: "Gawat sintetis", confidenceTier: "low" as const }] }, nextBestActions: [], therapy: { forDiagnosis: { icd10: "X01.2", label: "Kandidat sintetis" }, regimen: [{ drug: "Parasetamol", dose: "3x500mg", route: "PO", duration: "", note: "" }], interactions: [], contraindications: [] } },
  };
  it("copies the summary as plain text, each code with its name, and the therapy line", () => {
    const copies = summaryCopies(aadiMessage(headache).content)!;
    expect(copies.summary.split("\n")[0]).toBe(doctorSummaryTitle);
    expect(copies.summary).not.toContain("**");
    expect(copies.summary).not.toMatch(/Trace|SHA-256|kemiripan/);
    expect(copies.codes).toEqual([{ code: "X60.9", text: "X60.9 — Gawat sintetis" }, { code: "X01.2", text: "X01.2 — Kandidat sintetis" }]);
    expect(copies.therapy).toBe("Parasetamol 3x500mg PO — untuk Kandidat sintetis (X01.2)");
    expect(summaryCopies(aadiMessage(analysis).content)!.therapy).toBe("");
    expect(summaryCopies("# Draf lokal\n\n## Catatan\n\nIsi")).toBeNull();
  });
  it("copies the summary as the doctor edited it", () => {
    const content = aadiMessage(headache).content.replace("X01.2 — ", "").replace("Kandidat sintetis (X01.2)", "Diagnosis dokter (X09)");
    expect(summaryCopies(content)!.codes.map(item => item.code)).toEqual(["X60.9", "X09"]);
  });
  it("prefills a referral letter from the case and AADI's candidates, leaving destination and request to the doctor", () => {
    const prompt = referralPrompt(aadiMessage(headache));
    expect(prompt.split("\n")).toEqual([
      "Keluhan utama: Nyeri kepala hebat. Diagnosis kerja (kandidat AADI, belum terkonfirmasi): Kandidat sintetis (X01.2)",
      "Riwayat penyakit sekarang: 45 tahun, laki-laki. Riwayat HT. Pasien fiktif",
      "Pemeriksaan fisik: Sistolik (mmHg) 170; Diastolik (mmHg) 100",
      "Permintaan: ",
      "Penerima: ",
    ]);
    const letter = createDraft({ mode: "referral", prompt, context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
    expect(letter).toContain("Nyeri kepala hebat. Diagnosis kerja (kandidat AADI, belum terkonfirmasi): Kandidat sintetis (X01.2)");
    expect(letter).toContain("Sistolik (mmHg) 170; Diastolik (mmHg) 100");
    expect(referralPrompt({ sourceText: undefined })).toBe("");
  });
});
