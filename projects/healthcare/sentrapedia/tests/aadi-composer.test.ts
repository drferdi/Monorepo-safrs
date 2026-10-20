import { describe, expect, it } from "vitest";
import { composerCase, composerUsesAadi, composerAadiMessages, emptyCaseFields, invalidCaseField, readCaseFields } from "../src/lib/aadi/composer";
import { emptyCase, type AadiAnalysis } from "../src/lib/aadi/contract";
import { validCase } from "../src/lib/aadi/contract";
import { hasAadiSource } from "../src/lib/aadi/presentation";

describe("main clinical composer", () => {
  it("labels only structured AADI source snapshots as AADI drafts", () => {
    expect(hasAadiSource({ sourceText: JSON.stringify({ kind: "AADI", contractVersion: "1" }) })).toBe(true);
    for (const sourceText of [undefined, "AADI", "{broken", JSON.stringify({ kind: "AADI", contractVersion: "2" }), JSON.stringify({ kind: "local" })]) expect(hasAadiSource({ sourceText })).toBe(false);
  });
  it("routes built-in Ask and DDx to AADI, preserving explicit personal/local documents", () => {
    expect(composerUsesAadi("question", false)).toBe(true);
    expect(composerUsesAadi("ddx", false)).toBe(true);
    for (const mode of ["clinic", "scribe", "ap", "education"] as const) expect(composerUsesAadi(mode, false)).toBe(false);
    expect(composerUsesAadi("question", true)).toBe(false);
    for (const mode of ["workup", "refer", "icd10"] as const) { expect(composerUsesAadi(mode, false)).toBe(true); expect(composerUsesAadi(mode, true)).toBe(false); }
  });
  it("stages the exact complaint and recorded context, without patient name or identifier", () => {
    const data = composerCase("nyeri kepala menetap 2 hari", "Riwayat HT", { name: "Private name", id: "private-id", age: "67", sex: "Male", notes: "Belum ada pemfis" });
    expect(data.chiefComplaint).toBe("nyeri kepala menetap 2 hari");
    expect(data.demographics).toEqual({ ageYears: 67, sex: "M" });
    expect(data.anamnesis.freeText).toContain("Riwayat HT");
    expect(data.anamnesis.freeText).toContain("Belum ada pemfis");
    expect(JSON.stringify(data)).not.toContain("Private name");
    expect(JSON.stringify(data)).not.toContain("private-id");
    expect(data.vitals).toEqual({});
    expect(data.allergies).toEqual([]);
    expect(data.knownConditions).toEqual([]);
    expect(validCase(data)).toBe(true);
  });
  it("does not infer invalid demographics or negative findings from missing data", () => {
    for (const age of ["", "unknown", "-1", "131", "67 tahun"]) expect(composerCase("keluhan", "", { age, sex: "Not specified", notes: "" }).demographics).toEqual({ ageYears: null, sex: "unknown" });
    expect(composerCase("keluhan", "").anamnesis).toEqual({});
    expect(composerCase("keluhan", "", { age: "30", sex: "Female", notes: "" }).demographics.sex).toBe("F");
  });
  it("adds the actual prompt and full AADI source as a draft with unchecked review", () => {
    const analysis: AadiAnalysis = { case: { ...emptyCase(), chiefComplaint: "keluhan" }, traceId: "live-trace", createdAt: "2026-10-09T00:00:00Z", result: { contractVersion: "1", status: "ok", differential: { likely: [], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: ["Tanda vital belum tersedia"], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0.01 } } };
    const messages = composerAadiMessages(analysis, "pertanyaan asli", "question");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("pertanyaan asli");
    expect(messages[1].content).toContain("# LAPORAN ANALISIS KASUS KLINIS");
    expect(messages[1].content).not.toContain("Analisis AADI");
    expect(messages[1].content).not.toContain("Model:");
    expect(messages[1].content).not.toContain("Versi:");
    expect(messages[1].content).not.toContain("Clinical question brief");
    expect(messages[1].reviewStatus).toBe("draft");
    expect(messages[1].reviewItems?.every(item => !item.checked)).toBe(true);
    expect(JSON.parse(messages[1].sourceText!).case).toEqual(analysis.case);
    expect(JSON.parse(messages[1].sourceText!).result).toEqual(analysis.result);
    expect(JSON.parse(messages[1].sourceText!).result.meta).toEqual(analysis.result.meta);
    expect(messages[1].mode).toBe("question");
  });
});

describe("composer case strip", () => {
  it("reads labelled age, sex and vitals from the typed text", () => {
    expect(readCaseFields("Laki-laki 45 tahun, nyeri kepala hebat di belakang sejak 2 jam, mual, TD 170/100")).toEqual({ age: "45", sex: "M", bp: "170/100" });
    expect(readCaseFields("perempuan 30 th, demam sejak 3 hari, S 38,5 N 110x/menit RR 24 SpO2 94%")).toEqual({ age: "30", sex: "F", temperature: "38,5", heartRate: "110", respiratoryRate: "24", spo2: "94" });
    expect(readCaseFields("Pasien usia 67, nadi 98, suhu 37.8, sat 97")).toEqual({ age: "67", heartRate: "98", temperature: "37.8", spo2: "97" });
    expect(readCaseFields("S: nyeri kepala. O: TD: 120 / 80, N: 88")).toEqual({ bp: "120/80", heartRate: "88" });
  });
  it("never reads a duration, an unlabelled number or an implausible value as a finding", () => {
    for (const text of ["sesak napas 5 hari, batuk sejak 2 tahun", "nyeri dada 3 tahun lalu", "keluhan selama 10 tahun", "demam 39", "TD 80/120", "N 300", "SpO2 120", "S 12 jam", "Nyeri 98"]) expect(readCaseFields(text)).toEqual({});
  });
  it("sends readable strip values in the structured case and lets them win over the saved patient", () => {
    const fields = { ...emptyCaseFields(), age: "45", sex: "M", bp: "170/100", heartRate: "98", temperature: "38,5", respiratoryRate: "22", spo2: "95" };
    const data = composerCase("nyeri kepala", "", { age: "60", sex: "Female", notes: "" }, fields);
    expect(data.demographics).toEqual({ ageYears: 45, sex: "M" });
    expect(data.vitals).toEqual({ systolic: 170, diastolic: 100, heartRate: 98, temperature: 38.5, respiratoryRate: 22, spo2: 95 });
    expect(data.chiefComplaint).toBe("nyeri kepala");
    expect(validCase(data)).toBe(true);
  });
  it("keeps the patient's values for empty fields and sends nothing for unreadable ones", () => {
    const data = composerCase("keluhan", "", { age: "60", sex: "Female", notes: "" }, { ...emptyCaseFields(), bp: "170", heartRate: "abc", spo2: "40" });
    expect(data.demographics).toEqual({ ageYears: 60, sex: "F" });
    expect(data.vitals).toEqual({});
    expect(invalidCaseField("bp", "170")).toBe(true);
    expect(invalidCaseField("spo2", "40")).toBe(true);
    expect(invalidCaseField("temperature", "37,2")).toBe(false);
    expect(invalidCaseField("age", "")).toBe(false);
  });
});
