import { describe, expect, it } from "vitest";
import { gateTherapy, unstrength } from "../src/lib/theoracle-evidence-gate";
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
  });
  it("keeps verifying one tablet per dose, a monthly quantity, or a strength also written as a dose", () => {
    expect(status("Amoxicillin", "3x500mg", "Amoksisilin 500 mg 3 x 1 tablet selama 5 hari.")).toBe("verified");
    expect(status("Diazepam", "1x2mg", "diazepam 1. tab 2 mg 30 tab/bulan. 2. tab 5 mg 30 tab/bulan.")).toBe("verified");
    expect(status("Paracetamol", "3x500mg", "Parasetamol tablet 500 mg, 2 tablet 3 kali sehari pada dewasa; anak 500 mg dosis tunggal.")).toBe("verified");
  });
});
