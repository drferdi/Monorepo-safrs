import { describe, expect, it } from "vitest";
import { caseGuide, guideItems, insertSection, soapView, vitalsLine } from "../src/lib/soap";
import { emptyCaseFields, readCaseFields, type CaseFields } from "../src/lib/aadi/composer";
import { missingField } from "../src/lib/clinical-templates";
import { createDraft } from "../src/lib/drafts";
import { structureNote } from "../src/lib/note-structure";

// The strip as the workspace fills it: values read from the text, nothing edited by hand.
const strip = (text: string): CaseFields => ({ ...emptyCaseFields(), ...readCaseFields(text) });
const filled = (text: string, fields = strip(text), hints = {}) => Object.fromEntries(caseGuide(text, fields, hints, "clinic").map((item) => [item.key, item.filled]));

describe("case guide", () => {
  it("lists six items for an analysis mode, eight for the SOAP note and none for other modes", () => {
    expect(guideItems("question")).toEqual(["concern", "age", "sex", "vitals", "history", "examination"]);
    expect(guideItems("icd10")).toEqual(guideItems("question"));
    expect(guideItems("clinic")).toEqual([...guideItems("question"), "assessment", "plan"]);
    expect(guideItems("education")).toEqual([]);
    expect(guideItems("referral")).toEqual([]);
  });

  it("reads a filled item from labelled text, the strip or the saved patient, never from an unlabelled number", () => {
    expect(filled("Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100")).toEqual({ concern: true, age: true, sex: true, vitals: true, history: false, examination: false, assessment: false, plan: false });
    expect(filled("Anamnesis: demam 3 hari")).toMatchObject({ concern: false, history: true });
    expect(filled("demam 39")).toEqual({ concern: true, age: false, sex: false, vitals: false, history: false, examination: false, assessment: false, plan: false });
    expect(filled("batuk", emptyCaseFields(), { patientAge: "30", patientSex: "F" })).toMatchObject({ age: true, sex: true });
    expect(filled("batuk", { ...emptyCaseFields(), heartRate: "400" })).toMatchObject({ vitals: false });
    expect(filled("Rencana: kontrol 3 hari")).toMatchObject({ plan: true, assessment: false });
  });

  it("pairs every item with the skeleton its chip inserts, and the skeleton is a label the drafts read", () => {
    const items = caseGuide("", emptyCaseFields(), {}, "clinic");
    const skeleton = (key: string) => items.find((item) => item.key === key)!.skeleton;
    expect(items.map((item) => [item.label, item.skeleton])).toEqual([["Keluhan utama", "Keluhan utama: "], ["Usia", "Usia: "], ["Jenis kelamin", "Jenis kelamin: "], ["Tanda vital", "Tanda vital: "], ["Anamnesis", "Anamnesis: "], ["Pemeriksaan fisik", "Pemeriksaan fisik: "], ["Asesmen", "Asesmen: "], ["Rencana", "Rencana: "]]);
    const read = { concern: "concern", vitals: "examination", history: "history", examination: "examination", assessment: "assessment", plan: "plan" } as const;
    for (const [key, field] of Object.entries(read)) expect(structureNote(`${skeleton(key)}x`).fields[field]).toBe("x");
    expect(readCaseFields(`${skeleton("age")}45`).age).toBe("45");
    expect(readCaseFields(`${skeleton("sex")}perempuan`).sex).toBe("F");
  });

  it("labels unlabelled text as the complaint when the first section is inserted, and leaves labelled or blank text as it is", () => {
    const first = insertSection("Laki-laki 45 tahun, nyeri kepala", "Pemeriksaan fisik: ");
    expect(first).toBe("Keluhan utama: Laki-laki 45 tahun, nyeri kepala\n\nPemeriksaan fisik: ");
    expect(insertSection(first, "Anamnesis: ")).toBe(`${first.trimEnd()}\n\nAnamnesis: `);
    expect(insertSection("", "Anamnesis: ")).toBe("Anamnesis: ");
    expect(filled(first)).toMatchObject({ concern: true });
    const draft = createDraft({ mode: "clinic", prompt: first, context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
    expect(draft).toContain("## Keluhan Utama\nLaki-laki 45 tahun, nyeri kepala");
  });
});

describe("SOAP view", () => {
  const rows = (text: string, fields = strip(text)) => Object.fromEntries(soapView(text, fields).map((row) => [row.key, row.text]));

  it("builds S/O/A/P from labelled text and the strip without inferring assessment or plan", () => {
    const view = soapView("Keluhan utama: demam 3 hari\nAnamnesis: menggigil\nPemeriksaan fisik: faring hiperemis\nAsesmen: dicatat dokter\nRencana: kontrol", strip("N 88"));
    expect(view.map((row) => row.label)).toEqual(["S — Subjektif", "O — Objektif", "A — Asesmen", "P — Rencana"]);
    expect(view.map((row) => row.text)).toEqual(["demam 3 hari\nmenggigil", "Nadi 88/mnt\nfaring hiperemis", "dicatat dokter", "kontrol"]);
  });

  it("marks an empty row with the clinician placeholder", () => {
    expect(rows("Keluhan utama: demam 3 hari")).toEqual({ S: "demam 3 hari", O: missingField, A: missingField, P: missingField });
  });

  it("puts a Tanda vital line into the objective row", () => {
    expect(rows("Keluhan utama: demam\nTanda vital: TD 120/80, N 88").O).toBe("TD 120/80 mmHg · Nadi 88/mnt\nTD 120/80, N 88");
  });

  it("keeps unlabelled free text as the subjective row", () => {
    expect(rows("Perempuan 30 tahun batuk berdahak 5 hari, demam")).toMatchObject({ S: "Perempuan 30 tahun batuk berdahak 5 hari, demam", A: missingField, P: missingField });
  });
});

describe("vitals line", () => {
  it("lists only readable strip values, in strip order, with units", () => {
    expect(vitalsLine({ ...emptyCaseFields(), spo2: "95", temperature: "38,5", bp: "170/100", heartRate: "98", respiratoryRate: "22" })).toBe("TD 170/100 mmHg · Nadi 98/mnt · Suhu 38,5 °C · RR 22/mnt · SpO₂ 95%");
    expect(vitalsLine({ ...emptyCaseFields(), bp: "80/120", heartRate: "98" })).toBe("Nadi 98/mnt");
    expect(vitalsLine(emptyCaseFields())).toBe("");
  });
});
