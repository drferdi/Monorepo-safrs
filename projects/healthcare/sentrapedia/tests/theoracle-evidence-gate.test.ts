import { describe, expect, it } from "vitest";
import { gateTherapy } from "../src/lib/theoracle-evidence-gate";
import { THEORACLE_GROUNDING_CAPABILITY, type TheOracleGroundingBundle } from "../src/lib/theoracle-grounding-types";
import type { MiraTherapy } from "../src/lib/mira/contract";

const bundle = (...texts: string[]): TheOracleGroundingBundle => ({
  version: THEORACLE_GROUNDING_CAPABILITY,
  corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "m/x", revision: "e".repeat(40), dtype: "fp32", dims: 3 }, retrievedAt: "2026-10-11T00:00:00.000Z", reviewProvenance: "fixture" },
  queryDigest: "b".repeat(64),
  evidence: texts.map((text, i) => ({ evidenceId: `E${i + 1}`, text, retrievalRank: i + 1, similarity: 0.5, source: { title: `doc${i + 1}.pdf`, docSource: "uji", origin: "fixture", textSha256: "c".repeat(64) } })),
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
    const perKg = gateTherapy(therapy([drug("Amoxicillin", "3x10mg/kg")]), bundle("Amoksisilin 10 mg/kgBB per hari."), pneumonia);
    expect(perKg.report.drugs[0].status).toBe("verified");
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
});
