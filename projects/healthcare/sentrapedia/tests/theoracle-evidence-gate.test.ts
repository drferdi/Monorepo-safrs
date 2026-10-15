import { describe, expect, it } from "vitest";
import { gateEvidence, gateTherapy, unstrength } from "../src/lib/theoracle-evidence-gate";
import { THEORACLE_GROUNDING_CAPABILITY, type TheOracleGroundingBundle } from "../src/lib/theoracle-grounding-types";
import type { MiraTherapy } from "../src/lib/mira/contract";

// A plain string is a passage from a pneumonia document; { title, text } sets the document title.
const bundle = (...items: (string | { title: string; text: string })[]): TheOracleGroundingBundle => ({
  version: THEORACLE_GROUNDING_CAPABILITY,
  corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "m/x", revision: "e".repeat(40), dtype: "fp32", dims: 3 }, retrievedAt: "2026-10-11T00:00:00.000Z", reviewProvenance: "fixture" },
  queryDigest: "b".repeat(64),
  evidence: items.map((item, i) => ({ evidenceId: `E${i + 1}`, text: typeof item === "string" ? item : item.text, retrievalRank: i + 1, similarity: 0.5, source: { title: typeof item === "string" ? `pneumonia-${i + 1}.md` : item.title, docSource: "uji", origin: "fixture", textSha256: "c".repeat(64) } })),
});
const therapy = (regimen: MiraTherapy["regimen"], extra: Partial<MiraTherapy> = {}): MiraTherapy => ({ forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, regimen, interactions: [], contraindications: [], ...extra });
const drug = (name: string, dose: string) => ({ drug: name, dose, route: "PO", duration: "5 hari", note: "" });
const pneumonia = { icd10: "J18.9", label: "Pneumonia" };

describe("clinical evidence gate", () => {
  it("verifies an English-spelled drug and its strength against an Indonesian passage", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), bundle("Pneumonia: amoksisilin 500 mg 3 kali sehari selama 5 hari."), pneumonia);
    expect(out?.regimen[0].dose).toBe("3x500mg");
    expect(report.drugs).toEqual([{ drug: "Amoxicillin", dose: "3x500mg", status: "verified", evidenceIds: ["E1"] }]);
  });
  it("reads an English ch as the Indonesian k", () => {
    const { report } = gateTherapy(therapy([drug("Chlorpheniramine", "3x4mg"), drug("Chloramphenicol", "4x500mg")]), bundle("Pneumonia: klorfeniramin maleat 3 x 4 mg; kloramfenikol 4 x 500 mg."), pneumonia);
    expect(report.drugs.map(d => d.status)).toEqual(["verified", "verified"]);
  });
  it("verifies a targeted dose from a diagnosis passage, each passage once", () => {
    const tx = bundle("Pneumonia: amoksisilin diberikan oral.");
    const dx = bundle("Pneumonia: amoksisilin diberikan oral.", "Pneumonia: amoksisilin 500 mg 3 kali sehari.");
    const merged = gateEvidence(tx, dx);
    expect(merged?.evidence.map(e => e.evidenceId)).toEqual(["E1", "E2"]);
    expect(gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), tx, pneumonia).report.drugs[0].status).toBe("doseRemoved");
    expect(gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), merged, pneumonia).report.drugs[0]).toMatchObject({ status: "verified", evidenceIds: ["E2"] });
    expect(gateEvidence(undefined, dx)).toBe(dx);
    expect(gateEvidence(tx, { nope: true })).toBe(tx);
  });
  it("takes a strength only from the drug's own item, not from another drug in the same passage", () => {
    const listed = bundle("Pneumonia, kombinasi KDT: a. amoksisilin 500 mg b. azitromisin 250 mg");
    expect(gateTherapy(therapy([drug("Amoxicillin", "3x500mg"), drug("Azitromisin", "1x500mg")]), listed, pneumonia).report.drugs.map(d => d.status)).toEqual(["verified", "doseRemoved"]);
    const bulleted = bundle("Pneumonia:\n- Amoksisilin 500 mg 3 kali sehari\n- Azitromisin 250 mg 1 kali sehari");
    expect(gateTherapy(therapy([drug("Amoxicillin", "3x250mg")]), bulleted, pneumonia).report.drugs[0].status).toBe("doseRemoved");
  });
  it("keeps a strength listed after a long restriction or a numbered form of the same drug", () => {
    const fornas = bundle({ title: "fornas-2025.pdf", text: "Pneumonia: fosfomisin trometamol untuk sistitis non komplikata pada wanita atau profilaksis pada tindakan Transrectal Prostat Biopsy (TR-PB) 1. granula 3 g  3 metenamin" });
    expect(gateTherapy(therapy([drug("Fosfomisin trometamol", "1x3g")]), fornas, pneumonia).report.drugs[0].status).toBe("verified");
  });
  it("still reads tablet content after the next drug of a combination", () => {
    const mpff = bundle("Pneumonia: Diosmin 450 mg + Hesperidin 50 mg 3 x 2 tablet selama 4 hari.");
    expect(gateTherapy(therapy([drug("Diosmin", "3x450mg")]), mpff, pneumonia).report.drugs[0].status).toBe("doseRemoved");
  });
  it("verifies a single strength inside a source range of the same unit", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Betahistin mesilat", "3x6mg", "Pneumonia: Betahistin mesilat 3 x 6-12 mg oral.")).toBe("verified");
    expect(one("Sertraline", "1x25mg", "Pneumonia: Sertralin 1 x 25-50 mg/hari oral.")).toBe("verified");
    expect(one("Furosemid", "1x30mg", "Pneumonia: furosemid injeksi 20 s/d 40 mg bolus.")).toBe("verified");
  });
  it("does not stretch a source range to another value, unit, per-kg form or a model range", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Betahistin", "3x16mg", "Pneumonia: Betahistin 3 x 6-12 mg.")).toBe("doseRemoved");
    expect(one("Betahistin", "3x6mg", "Pneumonia: Betahistin 3 x 6-12 mcg.")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x40mg", "Pneumonia: amoksisilin 25-50 mg/kgBB/hari.")).toBe("doseRemoved");
    expect(one("Betahistin", "3x6mg", "Pneumonia: Betahistin 6 tablet, lalu 12 mg.")).toBe("doseRemoved");
    expect(one("Betahistin", "3x6-8mg", "Pneumonia: Betahistin 3 x 6-12 mg.")).toBe("doseRemoved");
  });
  it("never reads a decimal comma as thousands or applies a multiplier to one end only", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Digoksin", "1x250mg", "Pneumonia: digoksin 0,125-0,250 mg sekali sehari.")).toBe("doseRemoved");
    expect(one("Digoksin", "1x0,125mg", "Pneumonia: digoksin 0,125-0,250 mg sekali sehari.")).toBe("verified");
    expect(one("Amoxicillin", "3x0,500mg", "Pneumonia: amoksisilin 250-750 mg.")).toBe("doseRemoved");
    expect(one("Benzatin penisilin", "1x600.000IU", "Pneumonia: benzatin penisilin 1,2-2,4 juta IU IM.")).toBe("doseRemoved");
    expect(one("Benzatin penisilin", "1x2.400IU", "Pneumonia: benzatin penisilin 1,2-2,4 juta IU IM.")).toBe("doseRemoved");
    expect(one("Benzatin penisilin", "1x1.800.000IU", "Pneumonia: benzatin penisilin 1,2-2,4 juta IU IM.")).toBe("verified");
  });
  it("takes a range only as the drug's own first strength, after its full name, at any item letter case", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Parasetamol", "3x300mg", "Pneumonia: parasetamol 500 mg; ibuprofen 200-400 mg.")).toBe("doseRemoved");
    expect(one("Isosorbid dinitrat", "1x40mg", "Pneumonia: isosorbid dinitrat 5 mg SL; isosorbid mononitrat 30-60 mg.")).toBe("doseRemoved");
    expect(one("Zidovudin", "2x150mg", "Pneumonia, KDT: A. zidovudin 300 mg B. lamivudin 150 mg")).toBe("doseRemoved");
  });
  it("ends a drug's window where a clause names something else, whatever the salt order", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Parasetamol", "3x300mg", "Pneumonia: parasetamol bila demam; ibuprofen 200-400 mg.")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x400mg", "Pneumonia: parasetamol bila demam; ibuprofen 400 mg.")).toBe("doseRemoved");
    expect(one("Diklofenak natrium", "1x25mg", "Pneumonia: diklofenak natrium 50 mg; natrium bikarbonat 25 mg.")).toBe("doseRemoved");
    expect(one("Diklofenak natrium", "1x25mg", "Pneumonia: diklofenak natrium 50 mg, natrium bikarbonat 20-40 mg.")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x500mg", "Pneumonia: amoksisilin 1 g, klaritromisin 500 mg.")).toBe("doseRemoved");
    expect(one("Diklofenak natrium", "2x50mg", "Pneumonia: natrium diklofenak 50 mg 2 kali sehari.")).toBe("verified");
    expect(one("Amoxicillin clavulanate", "3x500mg", "Pneumonia: amoksisilin 500 mg + asam klavulanat 125 mg 3 kali sehari.")).toBe("verified");
    expect(one("Parasetamol", "3x250mg", "Pneumonia: parasetamol dewasa 500 mg; anak 250 mg.")).toBe("verified");
  });
  it("ends a drug's window at a combination partner or another drug after any clause start", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Tenofovir", "1x600mg", "Pneumonia: tenofovir 300 mg + lamivudin 300 mg + efavirenz 600 mg")).toBe("doseRemoved");
    expect(one("Zidovudin", "2x150mg", "Pneumonia: zidovudin 300 mg/lamivudin 150 mg")).toBe("doseRemoved");
    expect(one("Diosmin", "2x50mg", "Pneumonia: Diosmin 450 mg + Hesperidin 50 mg")).toBe("doseRemoved");
    expect(one("Seftriakson", "1x200mg", "Pneumonia: seftriakson 1 g IV, dilanjutkan sefiksim 200 mg")).toBe("doseRemoved");
    expect(one("Metronidazol", "3x250mg", "Pneumonia: metronidazol 500 mg, kemudian sefiksim 250 mg")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x250mg", "Pneumonia: amoksisilin 1 g, injeksi seftriakson 250 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x300mg", "Pneumonia: parasetamol bila demam; dewasa: ibuprofen 200-400 mg")).toBe("doseRemoved");
    expect(one("Rifampisin", "1x300mg", "Pneumonia: rifampisin 450 mg, INH 300 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x400mg", "Pneumonia: parasetamol 500 mg, dan ibuprofen 400 mg")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x500mg", "Pneumonia: amoksisilin 1 g\nklaritromisin 500 mg")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x500mg", "Pneumonia: amoksisilin 1 g. klaritromisin 500 mg")).toBe("doseRemoved");
    expect(one("Isosorbid dinitrat", "1x20mg", "Pneumonia: isosorbid mononitrat 20 mg dan isosorbid dinitrat 5 mg")).toBe("doseRemoved");
    expect(one("Isosorbid dinitrat", "1x5mg", "Pneumonia: isosorbid mononitrat 20 mg dan isosorbid dinitrat 5 mg")).toBe("verified");
    expect(one("Diosmin hesperidin", "2x500mg", "Pneumonia: Diosmin 450 mg + Hesperidin 50 mg (500 mg) 2 x sehari")).toBe("doseRemoved"); // after the partner (fails safe)
    for (const text of ["parasetamol, untuk dewasa 500 mg", "parasetamol, pada dewasa 500 mg", "parasetamol. Pemberian awal 500 mg", "parasetamol, pagi hari 500 mg"]) expect(one("Parasetamol", "3x500mg", `Pneumonia: ${text}`)).toBe("verified");
  });
  it("never takes a number of a slash group, a partner's strength or a strength after another drug name", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    const fornas = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle({ title: "fornas-2025.pdf", text }), pneumonia).report.drugs[0].status;
    expect(one("Tenofovir", "1x600mg", "Pneumonia: tenofovir/lamivudin/efavirenz 300/300/600 mg")).toBe("doseRemoved");
    expect(one("Zidovudin", "2x150mg", "Pneumonia: zidovudin 300 mg/150 mg lamivudin")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x125mg", "Pneumonia: amoksisilin sirup 125 mg/5 mL")).toBe("verified");
    expect(one("Parasetamol/Ibuprofen", "3x400mg", "Pneumonia: parasetamol 500 mg; ibuprofen 400 mg")).toBe("doseRemoved");
    expect(one("Diosmin", "2x100mg", "Pneumonia: Diosmin 450 mg + Hesperidin 50 mg atau 100 mg")).toBe("doseRemoved");
    expect(one("Kotrimoksazol", "2x80mg", "Pneumonia: kotrimoksazol 2 x 480 mg (trimetoprim 80 mg)")).toBe("doseRemoved");
    expect(one("Metronidazol", "3x250mg", "Pneumonia: metronidazol 500 mg (atau tinidazol 250 mg)")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x400mg", "Pneumonia: parasetamol 500 mg atau ibuprofen 400 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x400mg", "Pneumonia: parasetamol dan ibuprofen 400 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x300mg", "Pneumonia: parasetamol atau ibuprofen 200-400 mg")).toBe("doseRemoved");
    expect(one("Kalium klorida", "1x25mmol", "Pneumonia: kalium klorida 20 mmol; natrium 25 mmol")).toBe("doseRemoved");
    expect(one("Amoxicillin", "3x400mg", "Pneumonia: amoksisilin 500 mg ibuprofen 400 mg")).toBe("doseRemoved");
    expect(fornas("Pilokarpin", "2x0,25%", "Pneumonia: 9 pilokarpin 1. tts mata 2% 2 btl/bulan. 10 timolol Dapat diberikan di FPKTP. 1. tts mata 0,25% 2 btl/bulan.")).toBe("doseRemoved");
    expect(fornas("Travoprost", "1x0,004%", "Pneumonia: 11 travoprost Hanya untuk pasien yang tidak memberikan respons dengan timolol. 1. tts mata 0,004% 1 btl/bulan.")).toBe("verified");
    expect(one("Kloksasilin", "4x500mg", "Pneumonia: Kloksasilin/Dikloksasilin 4 x 250-500 mg oral")).toBe("doseRemoved"); // a slash alternative may have its own dose (fails safe)
    expect(one("Karbogliserin", "3x2-3 tetes", "Pneumonia: (Karbogliserin / Gliserin 10% atau tetes telinga Natrium Dokusat 0.5%) 3 x 2-3 tetes sehari")).toBe("verified");
    for (const text of ["seftriakson, untuk pasien rawat inap: 1-2 g", "seftriakson, mula-mula 2 g", "seftriakson, nyeri ringan-sedang, 2 g"]) expect(one("Seftriakson", "1x2g", `Pneumonia: ${text}`)).toBe("verified");
  });
  it("takes a strength only for the drug named last before it; any unknown name fails safe", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    const fornas = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle({ title: "fornas-2025.pdf", text }), pneumonia).report.drugs[0].status;
    expect(one("Rifampisin", "1x300mg", "Pneumonia: rifampisin, INH 300 mg")).toBe("doseRemoved");
    expect(one("Zidovudin", "2x150mg", "Pneumonia: zidovudin bila Hb normal, lamivudin 150 mg")).toBe("doseRemoved");
    expect(one("Metformin", "1x5mg", "Pneumonia: metformin, bila gagal glibenklamid 5 mg")).toBe("doseRemoved");
    expect(one("Metformin", "1x5mg", "Pneumonia: metformin 500 mg dengan glibenklamid 5 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x50mg", "Pneumonia: parasetamol 500 mg dengan kafein 50 mg")).toBe("doseRemoved");
    expect(one("Simvastatin", "1x40mg", "Pneumonia: simvastatin malam hari, atorvastatin 40 mg")).toBe("doseRemoved");
    expect(one("Ambroksol", "3x15mg", "Pneumonia: ambroksol atau dekstrometorfan 15 mg")).toBe("doseRemoved");
    expect(one("Magnesium sulfat", "1x1g", "Pneumonia: magnesium sulfat loading, kalsium glukonat 1 g bila toksik")).toBe("doseRemoved");
    expect(one("Isosorbid dinitrat", "1x0,4mg", "Pneumonia: isosorbid dinitrat/nitrogliserin 0,4 mg SL")).toBe("doseRemoved");
    expect(one("Salbutamol", "4 puff", "Pneumonia: salbutamol 2 puff atau ipratropium 4 puff")).toBe("doseRemoved");
    expect(one("Seftriakson", "1x2g", "Pneumonia: seftriakson (diberikan bila alergi penisilin) 2 g IV")).toBe("doseRemoved"); // a bracket naming another drug (fails safe)
    expect(one("Metformin", "1x2.000mg", "Pneumonia: metformin 500 mg, dinaikkan hingga 2.000 mg/hari")).toBe("verified");
    expect(fornas("Budesonid", "1x0,25mg/mL", "Pneumonia: 2 budesonid 1. serb ih 200 mcg/dosis* Asma persisten berat: 2 tbg/bulan. Untuk rumatan asma (tidak untuk serangan asma akut). 2. cairan ih 0,25 mg/mL")).toBe("verified");
  });
  it("reads a bracket, a partner, a short name, a vitamin code, a FORNAS form and a column table without leaking", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    const fornas = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle({ title: "fornas-2025.pdf", text }), pneumonia).report.drugs[0].status;
    expect(one("Parasetamol", "3x400mg", "Pneumonia: parasetamol (atau ibuprofen) 400 mg")).toBe("doseRemoved");
    expect(one("Isoniazid", "1x10mg", "Pneumonia: isoniazid (bersama piridoksin) 10 mg/hari")).toBe("doseRemoved");
    expect(one("Diazepam", "0,2mg/kgBB", "Pneumonia: diazepam (alternatif midazolam) 0,2 mg/kgBB")).toBe("doseRemoved");
    expect(one("Chlorpheniramine", "3x4mg", "Pneumonia: klorfeniramin maleat (CTM) 3 x 4 mg")).toBe("verified");
    expect(one("Parasetamol/Ibuprofen", "3x400mg", "Pneumonia: parasetamol, ibuprofen 400 mg")).toBe("doseRemoved");
    expect(one("Rifampisin + INH", "1x300mg", "Pneumonia: rifampisin, INH 300 mg")).toBe("doseRemoved");
    expect(one("Vitamin B12", "1x10mg", "Pneumonia: vitamin B6 10 mg")).toBe("doseRemoved");
    expect(one("Vitamin K", "1x500mg", "Pneumonia: vitamin K 1 mg, vitamin C 500 mg")).toBe("doseRemoved");
    expect(one("Vitamin K", "1x1mg", "Pneumonia: vitamin K 1 mg, vitamin C 500 mg")).toBe("verified");
    expect(one("Parasetamol", "3x50mg", "Pneumonia: parasetamol untuk demam; nyeri berat tramadol: 1. dewasa 50 mg")).toBe("doseRemoved");
    expect(fornas("Parasetamol", "3x400mg", "Pneumonia: parasetamol 1. tab 500 mg. Ibuprofen 1. tab 400 mg")).toBe("doseRemoved");
    expect(one("Ibuprofen", "3x500mg", "Pneumonia: Parasetamol Ibuprofen 500 mg 400 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x500mg", "Pneumonia: Parasetamol, demam ringan, 500 mg")).toBe("verified");
    expect(one("Kotrimoksazol", "2x960mg", "Pneumonia: kotrimoksazol forte 960 mg")).toBe("verified");
    expect(one("Zinc", "1x10mg", "Pneumonia: Suplementasi Zinc (khusus anak): 10 mg/hari (< 6 bulan)")).toBe("verified");
    expect(one("Rifampisin", "1x300mg", "Pneumonia: rifampisin (atau INH) 300 mg")).toBe("doseRemoved");
    expect(one("Kaptopril", "1x25mg", "Pneumonia: kaptopril (+HCT) 25 mg")).toBe("doseRemoved");
    expect(one("Lisinopril", "1x12,5mg", "Pneumonia: lisinopril (dengan HCT) 12,5 mg")).toBe("doseRemoved");
    expect(one("Efavirenz", "1x300mg", "Pneumonia: efavirenz dosis anak (TDF) 300 mg")).toBe("doseRemoved");
    expect(one("Parasetamol/Ibuprofen", "3x400mg", "Pneumonia: parasetamol dan ibuprofen 400 mg")).toBe("doseRemoved");
    expect(one("Vitamin K", "1x500mg", "Pneumonia: vitamin k 1 mg, vitamin c 500 mg")).toBe("doseRemoved");
    expect(one("Vitamin B1", "1x10mg", "Pneumonia: vitamin B1 100 mg, B6 10 mg, B12 1000 mcg")).toBe("doseRemoved");
    expect(one("Vitamin B1", "1x100mg", "Pneumonia: vitamin B1 100 mg, B6 10 mg, B12 1000 mcg")).toBe("verified");
    expect(one("Ibuprofen", "3x500mg", "Pneumonia:\n| | Parasetamol | Ibuprofen |\n| Dewasa | 500 mg | 400 mg |")).toBe("doseRemoved");
    expect(one("Ibuprofen", "3x500mg", "Pneumonia:\nParasetamol | Ibuprofen\n500 mg | 400 mg")).toBe("doseRemoved");
    expect(one("Parasetamol", "3x500mg", "Pneumonia: Berikan parasetamol 500 mg 1 tablet 3 x sehari")).toBe("verified");
    expect(one("Amoxicillin", "3x500mg", "Pneumonia: Kombinasi amoksisilin 500 mg 1 kapsul")).toBe("verified");
    expect(one("Penisilin G", "1x1,2 juta IU", "Pneumonia: penisilin G 1,2 juta IU")).toBe("verified");
  });
  it("does not take a daily total as the amount of each of several doses", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin 1 mg per hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "1x1mg", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("verified");
    expect(one("Kolkisin", "1mg 3 kali sehari", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "1mg x 3", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin 1 x 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin dosis harian 0,5-1,5 mg.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin sehari 0,5-1,5 mg.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin 0,5-1,5 mg dibagi dalam 3 dosis.")).toBe("doseRemoved");
    expect(one("Kolkisin", "1x3mg", "Pneumonia: kolkisin 3 mg sekali sehari.")).toBe("verified");
    expect(one("Kolkisin", "1mg tiap 8 jam", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "1mg q8h", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "1mg tid", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("doseRemoved");
    expect(one("Kolkisin", "1mg tiap 24 jam", "Pneumonia: kolkisin 0,5-1,5 mg/hari.")).toBe("verified");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin 0,5-1,5 mg dalam 24 jam.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x1mg", "Pneumonia: kolkisin 0,5-1,5 mg/hr.")).toBe("doseRemoved");
    expect(one("Kolkisin", "3x0,5mg", "Pneumonia: kolkisin 3 kali sehari 0,5 mg.")).toBe("verified");
    expect(one("Parasetamol", "3x500mg", "Pneumonia: parasetamol 500 mg sehari 3 kali.")).toBe("verified");
    expect(one("Amoxicillin", "3x500mg", "Pneumonia: amoksisilin 500 mg/8 jam.")).toBe("verified");
    expect(one("Amoxicillin clavulanate", "3x250-500mg", "Pneumonia: amoksisilin dan asam klavulanat: dewasa 3x250-500 mg/hari.")).toBe("doseRemoved"); // "X dan Y <dose>" may be Y's dose (fails safe)
    expect(one("Karbogliserin", "3x2-3 tetes", "Pneumonia: karbogliserin 10% 3 x 2-3 tetes sehari.")).toBe("verified");
  });
  it("does not cut a drug's window at a single-letter unit", () => {
    const one = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
    expect(one("Seftriakson", "1x2g", "Pneumonia: seftriakson 2 g. Diberikan IV sekali sehari.")).toBe("verified");
    expect(one("Seftriakson", "1x2g", "Pneumonia: seftriakson IV (2 g) sekali sehari.")).toBe("verified");
  });
  it("blanks a strength written before the drug name (fails safe)", () => {
    const { report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), bundle("Pneumonia: berikan 500 mg amoksisilin 3 kali sehari."), pneumonia);
    expect(report.drugs[0].status).toBe("doseRemoved");
  });
  it("reads ODHA as HIV and the catalog's K64 for haemorrhoids coded I84", () => {
    const hiv = { icd10: "Z21", label: "Asymptomatic human immunodeficiency virus [HIV] infection status" };
    const art = bundle({ title: "panduan-praktik-klinis.pdf", text: "Terapi ODHA: Efavirenz (EFV) 600 mg sekali sehari." });
    expect(gateTherapy(therapy([drug("Efavirenz", "1x600mg")], { forDiagnosis: hiv }), art, hiv).report.drugs[0].status).toBe("verified");
    const piles = { icd10: "I84.9", label: "Haemorrhoids, unspecified" };
    const note = bundle({ title: "ambeien.md", text: "Ambeien derajat 1-2: Diosmin 500 mg 2 x sehari." });
    expect(gateTherapy(therapy([drug("Diosmin", "2x500mg")], { forDiagnosis: piles }), note, piles).report.drugs[0].status).toBe("verified");
  });
  it("blanks a dose whose strength is not in a passage naming the drug", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), bundle("Amoksisilin 250 mg untuk anak."), pneumonia);
    expect(out?.regimen[0]).toMatchObject({ drug: "Amoxicillin", dose: "" });
    expect(report.drugs[0].status).toBe("doseRemoved");
  });
  it("removes a drug that no passage names, and its contraindications", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg"), drug("Levofloxacin", "1x750mg")], { contraindications: ["Levofloxacin: anak", "Amoxicillin: alergi penisilin"] }), bundle("Amoksisilin 500 mg. Kontraindikasi amoksisilin: alergi penisilin."), pneumonia);
    expect(out?.regimen.map(r => r.drug)).toEqual(["Amoxicillin"]);
    expect(out?.contraindications).toEqual(["Amoxicillin: alergi penisilin"]);
    expect(report.drugs[1]).toMatchObject({ drug: "Levofloxacin", status: "removed" });
  });
  it("marks a contraindication no passage supports", () => {
    const { therapy: out } = gateTherapy(therapy([drug("Paracetamol", "3x500mg")], { contraindications: ["Paracetamol: gangguan hati berat"], interactions: ["Paracetamol dengan warfarin: INR naik"] }), bundle("Parasetamol 500 mg bila demam."), pneumonia);
    expect(out?.contraindications).toEqual(["Paracetamol: gangguan hati berat (belum terverifikasi)"]);
    expect(out?.interactions).toEqual(["Paracetamol dengan warfarin: INR naik (belum terverifikasi)"]);
  });
  it("removes therapy written for another diagnosis category", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")], { forDiagnosis: { icd10: "J02.9", label: "Pharyngitis" } }), bundle("Amoksisilin 500 mg."), pneumonia);
    expect(out).toBeUndefined();
    expect(report).toMatchObject({ therapyRemoved: true, reason: "Terapi ditulis untuk diagnosis lain (J02.9), bukan J18.9." });
  });
  it("removes all therapy when there is no evidence bundle", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), undefined, pneumonia);
    expect(out).toBeUndefined();
    expect(report).toMatchObject({ therapyRemoved: true, reason: "Referensi TheOracle untuk terapi tidak tersedia; dosis tidak ditampilkan." });
  });
  it("accepts a gram strength written as gram", () => {
    const { report } = gateTherapy(therapy([drug("Ceftriaxone", "1x2g")]), bundle("Seftriakson 2 gram IV dosis tunggal."), pneumonia);
    expect(report.drugs[0].status).toBe("verified");
  });
});

describe("clinical evidence gate fix round 1", () => {
  it("doses a drug whose name and strength sit in different passages as doseRemoved", () => {
    const { report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), bundle("Amoksisilin untuk pneumonia anak.", "Dosis 500 mg tiap hari untuk anak lain."), pneumonia);
    expect(report.drugs[0]).toMatchObject({ status: "doseRemoved", evidenceIds: ["E1"] });
  });
  it("keeps a therapy whose ICD-10 category matches the requested code", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")], { forDiagnosis: { icd10: "J18", label: "Pneumonia" } }), bundle("Amoksisilin 500 mg 3 kali sehari."), pneumonia);
    expect(out?.regimen[0].dose).toBe("3x500mg");
    expect(report.therapyRemoved).toBe(false);
  });
  it("removes all therapy with a reason when no drug is verified or dosed", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Levofloxacin", "1x750mg")]), bundle("Amoksisilin 500 mg."), pneumonia);
    expect(out).toBeUndefined();
    expect(report).toMatchObject({ therapyRemoved: true, reason: "Tidak ada obat yang indikasinya terverifikasi di TheOracle." });
  });
  it("keeps a drug-less warning with the unverified suffix and drops a warning that names only a removed drug", () => {
    const { therapy: out } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg"), drug("Levofloxacin", "1x750mg")], { interactions: ["Kehamilan trimester pertama", "Hindari NSAID"], contraindications: ["Levofloxacin: anak"] }), bundle("Amoksisilin 500 mg."), pneumonia);
    expect(out?.interactions).toEqual(["Kehamilan trimester pertama (belum terverifikasi)", "Hindari NSAID (belum terverifikasi)"]);
    expect(out?.contraindications).toEqual([]);
  });
  it("supports a safety item only when one passage names its drug, a safety term and its own specific words", () => {
    const { therapy: out } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")], { contraindications: ["Amoxicillin: gangguan hati berat", "Amoxicillin: alergi penisilin"] }), bundle("Amoksisilin 500 mg. Kontraindikasi amoksisilin: alergi penisilin."), pneumonia);
    expect(out?.contraindications).toEqual(["Amoxicillin: gangguan hati berat (belum terverifikasi)", "Amoxicillin: alergi penisilin"]);
  });
  it("does not verify a plain dose from a per-kg passage, but verifies a per-kg dose", () => {
    const plain = gateTherapy(therapy([drug("Amoxicillin", "3x10mg")]), bundle("Amoksisilin 10 mg/kgBB per hari."), pneumonia);
    expect(plain.report.drugs[0].status).toBe("doseRemoved");
    const perKg = gateTherapy(therapy([drug("Amoxicillin", "3x10mg/kg")]), bundle("Amoksisilin 10 mg/kgBB tiap 8 jam."), pneumonia);
    expect(perKg.report.drugs[0].status).toBe("verified");
    const daily = gateTherapy(therapy([drug("Amoxicillin", "3x10mg/kg")]), bundle("Amoksisilin 10 mg/kgBB per hari."), pneumonia);
    expect(daily.report.drugs[0].status).toBe("doseRemoved");
  });
});

describe("clinical evidence gate final fix", () => {
  const item = (name: string, dose: string, fields: Partial<MiraTherapy["regimen"][number]> = {}) => ({ ...drug(name, dose), ...fields });
  it("(a) blanks a doseRemoved drug's note that carries an unverified strength", () => {
    const { therapy: out, report } = gateTherapy(therapy([item("Kristaloid", "20ml/kg", { note: "dapat diulang sampai 40ml/kg dalam 1 jam" })]), bundle("Kristaloid untuk syok."), pneumonia);
    expect(report.drugs[0].status).toBe("doseRemoved");
    expect(out?.regimen[0]).toMatchObject({ dose: "", note: "" });
  });
  it("(a2) blanks a verified drug's note whose strength no passage naming the drug carries", () => {
    const { therapy: out } = gateTherapy(therapy([item("Amoxicillin", "3x500mg", { note: "anak 25 mg/kgBB/hari dibagi 3 dosis" })]), bundle("Amoksisilin 500 mg 3 kali sehari."), pneumonia);
    expect(out?.regimen[0]).toMatchObject({ dose: "3x500mg", note: "" });
  });
  it("(b) keeps a verified drug's note whose strength is in a passage naming the drug, and a note without a strength", () => {
    const { therapy: out } = gateTherapy(therapy([item("Amoxicillin", "3x500mg", { note: "1g bila berat badan besar" }), item("Paracetamol", "3x500mg", { note: "bila demam" })]), bundle("Amoksisilin 500 mg 3 kali sehari, 1 g bila berat. Parasetamol 500 mg."), pneumonia);
    expect(out?.regimen.map(r => r.note)).toEqual(["1g bila berat badan besar", "bila demam"]);
  });
  it("(c) strips an unverified strength from the displayed drug name but keeps the raw name in the report", () => {
    const { therapy: out, report } = gateTherapy(therapy([item("Parasetamol 500 mg", "3x1 tablet")]), bundle("Parasetamol bila demam."), pneumonia);
    expect(out?.regimen[0]).toMatchObject({ drug: "Parasetamol", dose: "" });
    expect(report.drugs[0]).toMatchObject({ drug: "Parasetamol 500 mg", dose: "3x1 tablet", status: "doseRemoved" });
    expect(gateTherapy(therapy([item("Furosemide 5–40 mg tablet", ""), item("Paracetamol 10 mg/kgBB", "")]), bundle("Furosemid tablet dan parasetamol."), pneumonia).therapy?.regimen.map(r => r.drug)).toEqual(["Furosemide tablet", "Paracetamol"]);
  });
  it("(c2) verifies a strength written in the drug name together with the dose", () => {
    const ok = gateTherapy(therapy([item("Parasetamol 500 mg", "3x1 tablet")]), bundle("Parasetamol 500 mg 3 kali sehari."), pneumonia);
    expect(ok.report.drugs[0].status).toBe("verified");
    expect(ok.therapy?.regimen[0].drug).toBe("Parasetamol 500 mg");
    const bad = gateTherapy(therapy([item("Amoxicillin 1000 mg", "3x500mg")]), bundle("Amoksisilin 500 mg 3 kali sehari."), pneumonia);
    expect(bad.report.drugs[0].status).toBe("doseRemoved");
    expect(bad.therapy?.regimen[0]).toMatchObject({ drug: "Amoxicillin", dose: "" });
  });
  it("(d) drops a safety item whose strength no passage naming a kept drug carries, and keeps a supported one", () => {
    const { therapy: out } = gateTherapy(therapy([drug("Paracetamol", "3x500mg")], { contraindications: ["Paracetamol: dosis di atas 4000 mg per hari"], interactions: ["Paracetamol 500 mg dengan warfarin: INR naik"] }), bundle("Parasetamol 500 mg bila demam."), pneumonia);
    expect(out?.contraindications).toEqual([]);
    expect(out?.interactions).toEqual(["Paracetamol 500 mg dengan warfarin: INR naik (belum terverifikasi)"]);
  });
  it("(e) applies the note rule to duration and route", () => {
    const { therapy: out } = gateTherapy(therapy([item("Amoxicillin", "3x500mg", { duration: "3x750mg selama 5 hari", route: "PO 250 mg sirup" }), item("Paracetamol", "3x500mg", { duration: "500 mg selama 3 hari" })]), bundle("Amoksisilin 500 mg 3 kali sehari. Parasetamol 500 mg."), pneumonia);
    expect(out?.regimen.map(r => [r.duration, r.route])).toEqual([["", ""], ["500 mg selama 3 hari", "PO"]]);
  });
  it("(f) treats a long-form unit in a note as a strength", () => {
    const { therapy: out } = gateTherapy(therapy([item("Paracetamol", "3x500mg", { note: "maksimal 4 gram per hari" })]), bundle("Parasetamol 500 mg bila demam."), pneumonia);
    expect(out?.regimen[0].note).toBe("");
  });
  it("(g) verifies a dose range only when both bounds appear in one passage naming the drug", () => {
    const upperOnly = gateTherapy(therapy([drug("Furosemide", "1x5-40mg")]), bundle("Furosemid 40 mg per hari."), pneumonia);
    expect(upperOnly.report.drugs[0].status).toBe("doseRemoved");
    for (const text of ["Furosemid 5-40 mg per hari.", "Furosemid 5 – 40 mg per hari.", "Furosemid mulai 5 mg, dapat dinaikkan sampai 40 mg."]) expect(gateTherapy(therapy([drug("Furosemide", "1x5–40 mg")]), bundle(text), pneumonia).report.drugs[0].status).toBe("verified");
    expect(gateTherapy(therapy([drug("Furosemide", "1x5-40mg")]), bundle("Furosemid 5-40 mg per hari."), pneumonia).report.drugs[0].status).toBe("verified");
  });
  it("(h) checks and strips both numbers of a combination strength such as 875/125 mg", () => {
    const partial = gateTherapy(therapy([item("Amoxicillin-clavulanate 875/125 mg", "2x1 tablet")]), bundle("Amoksisilin-klavulanat 125 mg."), pneumonia);
    expect(partial.report.drugs[0].status).toBe("doseRemoved");
    expect(partial.therapy?.regimen[0].drug).toBe("Amoxicillin-clavulanate");
    expect(gateTherapy(therapy([item("Amoxicillin-clavulanate", "2x875/125mg")]), bundle("Amoksisilin-klavulanat 875/125 mg 2 kali sehari."), pneumonia).report.drugs[0].status).toBe("verified");
  });
  it("gates mEq and mmol strengths in notes and safety items", () => {
    const kcl = { drug: "KCl", dose: "", route: "IV", duration: "", note: "maksimal 20 mEq/jam, 40 mmol/hari" };
    const kalium = { drug: "Kalium klorida", dose: "", route: "IV", duration: "", note: "maksimal 20 mEq/jam" };
    const blanked = gateTherapy(therapy([kalium], { contraindications: ["Kalium klorida: lebih dari 10 mEq/jam tanpa monitor"] }), bundle("Kalium klorida diberikan per infus pada hipokalemia."), pneumonia);
    expect(blanked.therapy?.regimen[0].note).toBe("");
    expect(blanked.therapy?.contraindications).toEqual([]);
    expect(gateTherapy(therapy([kalium]), bundle("Kalium klorida maksimal 20 mEq/jam per infus."), pneumonia).therapy?.regimen[0].note).toBe("maksimal 20 mEq/jam");
    expect(gateTherapy(therapy([{ ...kcl, drug: "Kalium klorida" }]), bundle("Kalium klorida, tekanan darah 120 mmHg."), pneumonia).therapy?.regimen[0].note).toBe("");
    expect(gateTherapy(therapy([{ ...kalium, note: "pantau bila TD di bawah 120 mmHg" }]), bundle("Kalium klorida per infus."), pneumonia).therapy?.regimen[0].note).toBe("pantau bila TD di bawah 120 mmHg");
  });
  it("reads thousands separators, so 1.200.000 IU is not verified by 200.000 IU", () => {
    const benzatin = drug("Benzatin penisilin", "1.200.000 IU IM");
    expect(gateTherapy(therapy([benzatin]), bundle("Benzatin penisilin 200.000 IU IM."), pneumonia).report.drugs[0].status).toBe("doseRemoved");
    expect(gateTherapy(therapy([benzatin]), bundle("Benzatin penisilin 400,000 IU atau 1.200.000 IU IM."), pneumonia).report.drugs[0].status).toBe("verified");
    expect(gateTherapy(therapy([benzatin]), bundle("Benzatin penisilin 1,200,000 IU IM."), pneumonia).report.drugs[0].status).toBe("verified");
  });
  it("gates ug and units strengths in notes", () => {
    const fentanil = { drug: "Fentanil", dose: "", route: "IV", duration: "", note: "maksimal 50 ug/jam" };
    expect(gateTherapy(therapy([fentanil]), bundle("Fentanil untuk nyeri berat."), pneumonia).therapy?.regimen[0].note).toBe("");
    expect(gateTherapy(therapy([{ ...fentanil, drug: "Insulin", note: "tambah 10 units" }]), bundle("Insulin subkutan."), pneumonia).therapy?.regimen[0].note).toBe("");
  });
  it("verifies drop and spray counts like any other strength", () => {
    const spray = drug("Oxymetazoline 0,05%", "1-2 semprotan");
    expect(gateTherapy(therapy([spray]), bundle("Oxymetazoline 0,05%: 1–2 semprotan pada nostril yang berdarah."), pneumonia).report.drugs[0].status).toBe("verified");
    expect(gateTherapy(therapy([spray]), bundle("Oxymetazoline 0,05%: 3 semprotan."), pneumonia).report.drugs[0].status).toBe("doseRemoved");
    expect(gateTherapy(therapy([drug("Carbamide peroxide 6,5%", "5-10 tetes 2x sehari")]), bundle("Carbamide peroxide 6,5% tetes telinga: 5–10 tetes, dua kali sehari."), pneumonia).report.drugs[0].status).toBe("verified");
    expect(gateTherapy(therapy([{ drug: "Salbutamol", dose: "", route: "inhalasi", duration: "", note: "boleh diulang 4 puff" }]), bundle("Salbutamol inhalasi 2 puff."), pneumonia).therapy?.regimen[0].note).toBe("");
  });
  it("strips every strength and its per-unit tails but keeps the drug names", () => {
    expect(["Benzatin penisilin 1.200.000 IU", "Ceftriaxone 50 mg/kg/24 jam", "Furosemid 40 mg/m2", "Dobutamin 5 mcg/kg/menit", "Amoxicillin 500 mg/clavulanate 125 mg", "Trimetoprim 80 mg/sulfametoksazol 400 mg tablet"].map(unstrength))
      .toEqual(["Benzatin penisilin", "Ceftriaxone", "Furosemid", "Dobutamin", "Amoxicillin/clavulanate", "Trimetoprim/sulfametoksazol tablet"]);
  });
  it("treats juta and ribu as part of a strength", () => {
    const benzatin = drug("Benzatin penisilin G 2,4 juta IU", "dosis tunggal IM");
    const wrong = gateTherapy(therapy([benzatin]), bundle("Benzatin penisilin G 1,2 juta unit IM."), pneumonia);
    expect(wrong.report.drugs[0].status).toBe("doseRemoved");
    expect(wrong.therapy?.regimen[0].drug).toBe("Benzatin penisilin G");
    expect(gateTherapy(therapy([benzatin]), bundle("Benzatin penisilin G 2,4  juta IU IM dosis tunggal."), pneumonia).report.drugs[0].status).toBe("verified");
  });
  it("verifies Greek mu micrograms and strips a strength without a dangling slash", () => {
    expect(gateTherapy(therapy([drug("Fentanil", "50 μg")]), bundle("Fentanil 50 mcg IV."), pneumonia).report.drugs[0].status).toBe("verified");
    const names = ["Parasetamol 120 mg/5 ml sirup", "Ceftriaxone 1 g/vial", "Ondansetron 4 mg / 8 mg"].map(name => gateTherapy(therapy([drug(name, "")]), bundle("Parasetamol sirup, ceftriaxone vial dan ondansetron tersedia."), pneumonia).therapy?.regimen[0].drug);
    expect(names).toEqual(["Parasetamol sirup", "Ceftriaxone", "Ondansetron"]);
  });
});

describe("clinical evidence gate: the dose passage names the diagnosis", () => {
  const versicolor = { icd10: "B36.0", label: "Pityriasis versicolor" };
  const forVersicolor = (regimen: MiraTherapy["regimen"]) => therapy(regimen, { forDiagnosis: versicolor });
  const azoleList = { title: "dermatovenereologi-perdoski-2021.pdf", text: "Triazol: flukonazol oral 50 mg per hari selama 14-30 hari; itrakonazol 100-200 mg; posakonazol 400 mg/12 jam. Alternatif amfoterisin B." };

  it("does not verify a dose from a passage about another disease (lay_terms-03)", () => {
    const { therapy: out, report } = gateTherapy(forVersicolor([drug("Flukonazol", "1x50mg")]), bundle(azoleList), versicolor);
    expect(out?.regimen[0]).toMatchObject({ drug: "Flukonazol", dose: "" });
    expect(report.drugs[0]).toMatchObject({ status: "doseRemoved", evidenceIds: ["E1"] });
  });
  it("does not let another passage that names the diagnosis carry the dose", () => {
    const { report } = gateTherapy(forVersicolor([drug("Flukonazol", "1x50mg")]), bundle(azoleList, { title: "dermatovenereologi-perdoski-2021.pdf", text: "Pitiriasis versikolor: ketokonazol krim, flukonazol oral." }), versicolor);
    expect(report.drugs[0]).toMatchObject({ status: "doseRemoved" });
  });
  it("verifies a dose from a passage that names the diagnosis in its text, title or a TheOracle catalog name", () => {
    const named = (item: { title: string; text: string }) => gateTherapy(forVersicolor([drug("Flukonazol", "1x50mg")]), bundle(item), versicolor).report.drugs[0].status;
    expect(named({ title: "perdoski.pdf", text: "Pitiriasis versikolor: flukonazol 50 mg/hari." })).toBe("verified");
    expect(named({ title: "pityriasis-versikolor.md", text: "Flukonazol 50 mg/hari selama 14 hari." })).toBe("verified");
    expect(named({ title: "perdoski.pdf", text: "Panu luas: flukonazol 50 mg/hari." })).toBe("verified");
  });
  it("counts an acronym in the diagnosis label but not a generic word", () => {
    const hiv = { icd10: "Z21", label: "Asymptomatic human immunodeficiency virus [HIV] infection status" };
    expect(gateTherapy(therapy([drug("Efavirenz", "1x600mg")], { forDiagnosis: hiv }), bundle({ title: "fornas-2025.pdf", text: "Antiretroviral untuk HIV: efavirenz 600 mg." }), hiv).report.drugs[0].status).toBe("verified");
    const oma = { icd10: "H66.9", label: "Otitis media akut, unspecified" };
    expect(gateTherapy(therapy([drug("Amoxicillin", "2x250mg")], { forDiagnosis: oma }), bundle({ title: "tonsilitis-2018.pdf", text: "Infeksi akut: amoksisilin 250 mg." }), oma).report.drugs[0].status).toBe("doseRemoved");
  });
  it("does not count a word shared by many catalog diseases or a function word", () => {
    const typhoid = { icd10: "A01.0", label: "Demam tifoid" };
    expect(gateTherapy(therapy([drug("Paracetamol", "3x500mg")], { forDiagnosis: typhoid }), bundle({ title: "kejang-demam.md", text: "Kejang demam pada anak: parasetamol 500 mg." }), typhoid).report.drugs[0].status).toBe("doseRemoved");
    expect(gateTherapy(therapy([drug("Paracetamol", "3x500mg")], { forDiagnosis: typhoid }), bundle({ title: "demam-tifoid.md", text: "Parasetamol 500 mg bila demam." }), typhoid).report.drugs[0].status).toBe("verified");
  });
  it("ignores Roman numerals, all-capital labels and English ICD qualifiers", () => {
    const status = (dx: { icd10: string; label: string }, name: string, dose: string, item: { title: string; text: string }) => gateTherapy(therapy([drug(name, dose)], { forDiagnosis: dx }), bundle(item), dx).report.drugs[0].status;
    expect(status({ icd10: "I10", label: "Hipertensi stage II" }, "Amlodipine", "1x10mg", { title: "gagal-jantung.md", text: "NYHA kelas II: amlodipin 10 mg." })).toBe("doseRemoved");
    expect(status({ icd10: "A01.0", label: "DEMAM TIFOID" }, "Paracetamol", "3x500mg", { title: "kejang-demam.md", text: "Kejang demam: parasetamol 500 mg." })).toBe("doseRemoved");
    expect(status({ icd10: "J18.9", label: "Community-acquired pneumonia" }, "Ceftriaxone", "1x2g", { title: "sepsis.pdf", text: "Hospital-acquired infection: seftriakson 2 gram." })).toBe("doseRemoved");
  });
  it("blanks a note strength carried only by a passage about another disease", () => {
    const { therapy: out } = gateTherapy(forVersicolor([{ ...drug("Flukonazol", "1x50mg"), note: "dosis maksimal 400 mg" }]), bundle(azoleList, { title: "panu.md", text: "Flukonazol untuk pitiriasis versikolor." }), versicolor);
    expect(out?.regimen[0].note).toBe("");
  });
});

describe("clinical evidence gate: tablet content is not a dose", () => {
  const status = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
  it("does not verify a per-tablet strength when the passage gives two or more tablets per dose", () => {
    const mpff = "Flebotropik oral: MPFF (Diosmin 450 mg + Hesperidin 50 mg) 3 x 2 tablet selama 4 hari pertama, lalu 2 x 2 tablet selama 3 hari berikutnya.";
    expect(status("Diosmin", "3x450mg", mpff)).toBe("doseRemoved");
    expect(status("Hesperidin", "3x50mg", mpff)).toBe("doseRemoved");
    expect(status("Paracetamol", "3x500mg", "Parasetamol 500 mg, 2 tablet 3 kali sehari.")).toBe("doseRemoved");
    for (const phrase of ["2 tablet, 3 kali sehari", "3 kali sehari 2 tablet", "2 tablet sekali minum", "2 kapsul sekaligus", "3 × 2 kaps", "3 x 2 tabs", "3 x 1-2 tablet"]) expect(status("Paracetamol", "3x500mg", `Parasetamol 500 mg ${phrase}.`), phrase).toBe("doseRemoved");
  });
  it("keeps verifying one tablet per dose, a monthly quantity, or a strength also written as a dose", () => {
    expect(status("Amoxicillin", "3x500mg", "Amoksisilin 500 mg 3 x 1 tablet selama 5 hari.")).toBe("verified");
    expect(status("Diazepam", "1x2mg", "diazepam 1. tab 2 mg 30 tab/bulan. 2. tab 5 mg 30 tab/bulan.")).toBe("verified");
    expect(status("Paracetamol", "3x500mg", "Parasetamol 500 mg; kemasan 12 tablet, 3 kali sehari.")).toBe("verified");
    expect(status("Paracetamol", "3x500mg", "Parasetamol tablet 500 mg, 2 tablet 3 kali sehari pada dewasa; anak 500 mg dosis tunggal.")).toBe("verified");
  });
});

describe("clinical evidence gate: tablet and capsule counts are doses", () => {
  const status = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
  const mpff = "Flebotropik oral: MPFF (Diosmin 450 mg + Hesperidin 50 mg) 3 x 2 tablet selama 4 hari pertama, lalu 2 x 2 tablet selama 3 hari berikutnya.";
  it("verifies a tablet count, including a range, against a passage that carries it", () => {
    expect(status("Antasida", "3x1-2 tablet", "Antasida oral 3 x 1-2 tablet atau 10-15 mL.")).toBe("verified");
    expect(status("Diosmin", "3x2tablet", mpff)).toBe("verified");
    expect(status("Diosmin", "3x450mg", mpff)).toBe("doseRemoved");
  });
  it("does not verify another count or another dosage form", () => {
    expect(status("Antasida", "3x2 tablet", "Antasida oral 3 x 1 tablet.")).toBe("doseRemoved");
    expect(status("Omeprazole", "1x1 kapsul", "Omeprazol 1 x 1 tablet sebelum makan.")).toBe("doseRemoved");
    expect(status("Parasetamol 500 mg", "3x2 tablet", "Parasetamol 500 mg 3 kali sehari.")).toBe("doseRemoved");
  });
  it("blanks a note with a tablet count no passage carries", () => {
    const { therapy: out } = gateTherapy(therapy([{ ...drug("Antasida", "3x1-2 tablet"), note: "maksimal 8 tablet sehari" }]), bundle("Antasida oral 3 x 1-2 tablet."), pneumonia);
    expect(out?.regimen[0]).toMatchObject({ dose: "3x1-2 tablet", note: "" });
  });
});

describe("clinical evidence gate: percent and bare U are strengths", () => {
  const status = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
  it("verifies a percent concentration, a percent range and a decimal written either way", () => {
    expect(status("Permetrin", "1x5%", "Permetrin krim 5% dioleskan ke seluruh tubuh.")).toBe("verified");
    expect(status("Permetrin", "1x5%", "Permetrin krim 1% dioleskan ke seluruh tubuh.")).toBe("doseRemoved");
    expect(status("Hydrocortisone", "1-2.5%", "Hidrokortison krim 1-2,5% dua kali sehari.")).toBe("verified");
    expect(status("Hydrocortisone", "1-2.5%", "Hidrokortison krim 1% dua kali sehari.")).toBe("doseRemoved");
    expect(status("Triamcinolone", "2-3x0.1%", "Triamsinolon pasta oral 0,1% 2-3 kali sehari.")).toBe("verified");
  });
  it("strips an unverified percent from the drug name and blanks it in a note", () => {
    const { therapy: out } = gateTherapy(therapy([{ ...drug("Permetrin krim 5%", "1x"), note: "ulang dengan krim 2,5% bila iritasi" }]), bundle("Permetrin krim untuk skabies."), pneumonia);
    expect(out?.regimen[0]).toMatchObject({ drug: "Permetrin krim", dose: "", note: "" });
    expect(unstrength("Lidokain gel 2%")).toBe("Lidokain gel");
  });
  it("reads a bare U as a unit like IU, but not a word starting with u", () => {
    expect(status("Insulin", "10 U", "Insulin basal mulai 10 IU malam hari.")).toBe("verified");
    expect(status("Insulin", "10 U", "Insulin basal mulai 8 unit malam hari.")).toBe("doseRemoved");
    expect(unstrength("Parasetamol 5 untuk anak")).toBe("Parasetamol 5 untuk anak");
    expect(status("Insulin", "10 U", "Insulin basal mulai 10 ug malam hari.")).toBe("doseRemoved");
    expect(status("Permetrin", "1x5 %", "Permetrin krim 5 % dioleskan ke seluruh tubuh.")).toBe("verified");
  });
  it("keeps a safety item whose percent is a threshold, marked unverified", () => {
    const { therapy: out } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")], { contraindications: ["Amoxicillin: hindari bila eGFR turun >50%"], interactions: ["Hindari pada luka bakar >20% luas permukaan tubuh"] }), bundle("Amoksisilin 500 mg 3 kali sehari."), pneumonia);
    expect(out?.contraindications).toEqual(["Amoxicillin: hindari bila eGFR turun >50% (belum terverifikasi)"]);
    expect(out?.interactions).toEqual(["Hindari pada luka bakar >20% luas permukaan tubuh (belum terverifikasi)"]);
  });
});

describe("clinical evidence gate: per-kg is decided for each strength", () => {
  const status = (dose: string, text: string) => gateTherapy(therapy([drug("Azithromycin", dose)]), bundle(text), pneumonia).report.drugs[0].status;
  it("verifies a per-kg dose and a plain cap written in one dose", () => {
    expect(status("1x10mg/kgBB, maks 500mg", "Azitromisin 10 mg/kgBB/hari dosis tunggal (maks 500 mg).")).toBe("verified");
    expect(status("1x10mg/kgBB, maks 500mg", "Azitromisin 10 mg/kgBB/hari dosis tunggal (maks 500 mg/kgBB).")).toBe("doseRemoved");
  });
  it("reads 'per kg' in a passage like '/kg'", () => {
    expect(status("1x10mg/kgBB", "Azitromisin 10 mg per kg BB per hari.")).toBe("verified");
    expect(status("1x500mg", "Azitromisin 500 mg per kg BB per hari.")).toBe("doseRemoved");
    expect(status("1x10 mg per kgBB", "Azitromisin 10 mg/kgBB/hari.")).toBe("verified");
    expect(status("1x10mg/kgBB", "Azitromisin 10 mg sekali sehari.")).toBe("doseRemoved");
    expect(status("1x500mg", "Azitromisin 500 mg per kali minum.")).toBe("verified");
  });
  it("finds per kg behind another per-unit tail, in the dose and in the passage", () => {
    expect(status("1x10 mg/hari/kgBB", "Azitromisin 10 mg/hari.")).toBe("doseRemoved");
    expect(status("1x10 mg/hari", "Azitromisin 10 mg/hari/kgBB.")).toBe("doseRemoved");
    expect(status("1x10 mg/hari/kgBB", "Azitromisin 10 mg/kgBB/hari.")).toBe("verified");
    expect(status("1x10mg/kgBB", "Azitromisin 10 mg per kilogram berat badan.")).toBe("verified");
    expect(status("1x10mg", "Azitromisin 10 mg per kilogram berat badan.")).toBe("doseRemoved");
  });
  it("gives both ends of a range the same per kg", () => {
    expect(status("10 mg - 15 mg/kgBB", "Azitromisin 10 mg tablet; anak 15 mg/kgBB.")).toBe("doseRemoved");
    expect(status("10 mg - 15 mg/kgBB", "Azitromisin 10 mg/kgBB - 15 mg/kgBB.")).toBe("verified");
  });
  it("keeps a plain strength in the drug name plain next to a per-kg dose", () => {
    expect(gateTherapy(therapy([drug("Azithromycin 500 mg", "10 mg/kgBB")]), bundle("Azitromisin 500 mg tablet; anak 10 mg/kgBB."), pneumonia).report.drugs[0].status).toBe("verified");
  });
});

describe("clinical evidence gate: a field drops only its unsupported clauses", () => {
  const amox = (fields: Partial<MiraTherapy["regimen"][number]>, text = "Amoksisilin 500 mg 3 kali sehari, 1 g bila berat.") => gateTherapy(therapy([{ ...drug("Amoxicillin", "3x500mg"), ...fields }]), bundle(text), pneumonia).therapy?.regimen[0];
  const PARTIAL = " (sebagian belum terverifikasi)";
  it("keeps the route when only a trailing strength clause is unsupported, and marks the cut", () => {
    expect(amox({ route: "IV, 1 g dalam 100 ml NaCl" })?.route).toBe("IV" + PARTIAL);
    expect(amox({ route: "IV\n2 g sehari" })?.route).toBe("IV" + PARTIAL);
  });
  it("keeps supported leading clauses and drops the unsupported tail", () => {
    expect(amox({ note: "1 g bila berat, maks 4 g/hari" })?.note).toBe("1 g bila berat" + PARTIAL);
    expect(amox({ duration: "5 hari. Lanjut 250 mg 3 hari" })?.duration).toBe("5 hari" + PARTIAL);
    expect(amox({ note: "1 g tiap 8 jam, maks. 4 g/hari" })?.note).toBe("1 g tiap 8 jam" + PARTIAL);
  });
  it("blanks a field when an unsupported clause comes first, so nothing is cut loose from it", () => {
    expect(amox({ route: "2 g dalam 100 ml; IV" })?.route).toBe("");
    expect(amox({ note: "Hindari bila CrCl <30 ml/menit, kurangi dosis" })?.note).toBe("");
    expect(amox({ note: "Anak 125 mg, 3 kali sehari; dewasa 500 mg" })?.note).toBe("");
  });
  it("blanks a field when a dropped clause is a condition or an exception", () => {
    expect(amox({ note: "jangan diberikan, kecuali 2 g dosis tunggal" })?.note).toBe("");
    expect(amox({ note: "1 g tiap 8 jam, maks 4 g/hari, hanya dewasa" })?.note).toBe("");
  });
  it("needs one passage for every strength shown, across clauses", () => {
    const twoPassages = gateTherapy(therapy([{ ...drug("Amoxicillin", "3x500mg"), note: "500 mg, 2 tablet" }]), bundle("Amoksisilin 500 mg 3 kali sehari.", "Amoksisilin 2 tablet."), pneumonia);
    expect(twoPassages.therapy?.regimen[0].note).toBe("");
    expect(amox({ note: "IV (1 g, lalu 2 g)" })?.note).toBe("");
    expect(amox({ note: "500 mg (maks. 4 g/hari)" })?.note).toBe("");
  });
  it("keeps the whole FORNAS budesonid duration, whose range is written with a Unicode minus", () => {
    const budesonid = { drug: "budesonid", dose: "", route: "inhalasi", duration: "Hari pertama maks 10 mL perhari, selanjutnya 4–8 mL perhari selama 5 hari.", note: "" };
    const fornas = "budesonid cairan ih 0,25 mg/mL Hari pertama maks 10 mL perhari, selanjutnya 4−8 mL perhari selama 5 hari. Pneumonia.";
    expect(gateTherapy(therapy([budesonid]), bundle(fornas), pneumonia).therapy?.regimen[0].duration).toBe(budesonid.duration);
    expect(gateTherapy(therapy([{ ...budesonid, duration: "Hari pertama maks 10 mL perhari, selanjutnya 4–9 mL perhari selama 5 hari." }]), bundle(fornas), pneumonia).therapy?.regimen[0].duration).toBe("Hari pertama maks 10 mL perhari" + PARTIAL);
  });
  it("does not split a decimal comma or point", () => {
    expect(amox({ route: "IV dalam NaCl 0,9%" })?.route).toBe("");
    expect(amox({ route: "IV dalam NaCl 0.9%" }, "Amoksisilin 500 mg 3 kali sehari dalam NaCl 0,9%.")?.route).toBe("IV dalam NaCl 0.9%");
  });
  it("keeps a supported field exactly as written", () => {
    expect(amox({ note: "PO, setelah makan. 1 g bila berat." })?.note).toBe("PO, setelah makan. 1 g bila berat.");
  });
});

describe("unstrength leaves a clean drug name", () => {
  it("drops brackets left empty or holding only a limit word, and tidies the rest", () => {
    expect(["Isoniazid (max 300 mg)", "Isoniazid 5 mg/kgBB (maks 300 mg/hari)", "Seftriakson (1 g)", "Prednison 1-2 mg/kgBB/hari (maks 60 mg)", "Salep mupirosin 2% (tube 5 g)"].map(unstrength))
      .toEqual(["Isoniazid", "Isoniazid", "Seftriakson", "Prednison", "Salep mupirosin (tube)"]);
  });
  it("drops a frequency glued to a stripped strength", () => {
    expect(["Parasetamol 3x500 mg", "Parasetamol 500mg x 3", "Parasetamol 500 mg 3x1 tablet", "Amoxicillin 2 x 500 mg"].map(unstrength)).toEqual(["Parasetamol", "Parasetamol", "Parasetamol", "Amoxicillin"]);
  });
  it("reads 'per kg', 'kg BB' and 'berat badan' as part of the strength", () => {
    expect(["Paracetamol 10 mg per kg", "Paracetamol 10 mg per kilogram berat badan", "Paracetamol 10 mg/kg BB", "Parasetamol 500 mg per hari"].map(unstrength)).toEqual(["Paracetamol", "Paracetamol", "Paracetamol", "Parasetamol"]);
  });
  it("tidies punctuation and a letter glued to the strength", () => {
    expect(["Amoksisilin 500 mg, 3 kali sehari", "Lidokain 2%-adrenalin", "Dekstrosa D5%", "Amoksisilin 500 mg -"].map(unstrength)).toEqual(["Amoksisilin, 3 kali sehari", "Lidokain-adrenalin", "Dekstrosa", "Amoksisilin"]);
  });
  it("keeps names without a strength, and letters that are not glued to one", () => {
    expect(["Vit. B12 1000 mcg", "Vitamin D 1000 IU", "Amoksisilin 500 mg per oral", "Antihistamin H1 generasi kedua (non-sedatif)", "Metronidazol (oral)", "Metronidazol 500 mg — 3x sehari"].map(unstrength))
      .toEqual(["Vit. B12", "Vitamin D", "Amoksisilin per oral", "Antihistamin H1 generasi kedua (non-sedatif)", "Metronidazol (oral)", "Metronidazol — 3x sehari"]);
  });
});

describe("unstrength never leaves or creates a strength", () => {
  // Review seeds: removing a bracket, a frequency or a wider span must not join a leftover number to a leftover unit.
  const seeds = ["Prednison 1-2 (maks 60 mg) mg/kg", "Amoksisilin 3 (500 mg) kapsul", "Obat 1.200.000 ( 2 ml ) IU", "Obat 2 (maks) tablet", "Parasetamol 1 500 mg x 2 tablet", "Obat 2 500 mg ×3 puff", "Parasetamol 2 10 mg x 3 mg", "Obat 2 D5% tablet", "Obat 3 3x500 mg tablet", "Parasetamol 2 500 mg per 5 ml tablet", "Obat 2 500 mg berat badan tablet", "Obat 2 [500 mg] tablet"];
  it("leaves no number followed by a dose unit", () => {
    for (const name of seeds) expect(unstrength(name), name).not.toMatch(/\d\s*(?:mg|ml|iu|g|%|tablet|kapsul|puff)\b|\d\s*%/i);
  });
  it("keeps a vitamin letter and strips only D before a percent", () => {
    expect(["Vitamin E400 IU", "Vitamin C500mg", "Dekstrosa D10%"].map(unstrength)).toEqual(["Vitamin E", "Vitamin C", "Dekstrosa"]);
  });
  it("tidies the remaining cosmetic leftovers", () => {
    expect(["Parasetamol 500 mg x 3 hari", "Isoniazid (maks 300 mg/hari, 5 mg/kg)", "Zinc (s/d 20 mg)", "Obat 500 mg x 3.5 mg"].map(unstrength)).toEqual(["Parasetamol", "Isoniazid", "Zinc", "Obat"]);
  });
});

describe("clinical evidence gate: a Unicode minus (U+2212) is a range dash", () => {
  const status = (name: string, dose: string, text: string) => gateTherapy(therapy([drug(name, dose)]), bundle(text), pneumonia).report.drugs[0].status;
  it("verifies a range the passage writes with U+2212, and still needs both ends", () => {
    expect(status("Amoxicillin", "3x250–500 mg", "Amoksisilin 250−500 mg 3 kali sehari.")).toBe("verified");
    expect(status("Amoxicillin", "3x250-1000 mg", "Amoksisilin 250−500 mg 3 kali sehari.")).toBe("doseRemoved");
    expect(status("Antasida", "3x1-2 tablet", "Antasida oral 3 x 1−2 tablet.")).toBe("verified");
    expect(status("Azithromycin", "10 mg - 15 mg/kgBB", "Azitromisin 10 mg/kgBB − 15 mg/kgBB.")).toBe("verified");
  });
  it("strips a U+2212 range from a drug name", () => {
    expect(unstrength("Amoksisilin 250−500 mg")).toBe("Amoksisilin");
  });
});

describe("clinical evidence gate: every range separator needs both ends", () => {
  const status = (dose: string, text: string) => gateTherapy(therapy([drug("Amoxicillin", dose)]), bundle(text), pneumonia).report.drugs[0].status;
  const upperOnly = "Amoksisilin 500 mg 3 kali sehari.";
  it("checks the first end of a range written with any dash, s/d, sampai, hingga or ~", () => {
    for (const dose of ["3x250−500 mg", "3x250—500 mg", "3x250‒500 mg", "3x250‐500 mg", "3x250 s/d 500 mg", "3x250 sampai 500 mg", "3x250 hingga 500 mg", "3x250~500 mg"]) expect(status(dose, upperOnly), dose).toBe("doseRemoved");
  });
  it("verifies such a range when the passage carries both ends", () => {
    expect(status("3x250 s/d 500 mg", "Amoksisilin 250 sampai 500 mg 3 kali sehari.")).toBe("verified");
    expect(status("3x250—500 mg", "Amoksisilin 250-500 mg 3 kali sehari.")).toBe("verified");
  });
  it("still reads a U+2212 tablet count as tablet content", () => {
    expect(status("3x500 mg", "Amoksisilin 500 mg 3 x 1−2 tablet.")).toBe("doseRemoved");
  });
  it("strips such a range whole from a drug name", () => {
    expect(["Amoksisilin 250—500 mg", "Amoksisilin 250 s/d 500 mg", "Amoksisilin 250 sampai 500 mg"].map(unstrength)).toEqual(["Amoksisilin", "Amoksisilin", "Amoksisilin"]);
  });
});
