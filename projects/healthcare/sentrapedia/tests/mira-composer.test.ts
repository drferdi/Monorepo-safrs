import { describe, expect, it } from "vitest";
import { composerCase, composerUsesMira, composerMiraMessages } from "../src/lib/mira/composer";
import { emptyCase, type MiraAnalysis } from "../src/lib/mira/contract";
import { validCase } from "../src/lib/mira/contract";
import { hasMiraSource } from "../src/lib/mira/presentation";

describe("main clinical composer", () => {
  it("labels only structured MIRA source snapshots as MIRA drafts", () => {
    expect(hasMiraSource({ sourceText: JSON.stringify({ kind: "MIRA", contractVersion: "1" }) })).toBe(true);
    for (const sourceText of [undefined, "MIRA", "{broken", JSON.stringify({ kind: "MIRA", contractVersion: "2" }), JSON.stringify({ kind: "local" })]) expect(hasMiraSource({ sourceText })).toBe(false);
  });
  it("routes built-in Ask and DDx to MIRA, preserving explicit personal/local documents", () => {
    expect(composerUsesMira("question", false)).toBe(true);
    expect(composerUsesMira("ddx", false)).toBe(true);
    for (const mode of ["clinic", "scribe", "ap", "education"] as const) expect(composerUsesMira(mode, false)).toBe(false);
    expect(composerUsesMira("question", true)).toBe(false);
    for (const mode of ["workup", "refer"] as const) { expect(composerUsesMira(mode, false)).toBe(true); expect(composerUsesMira(mode, true)).toBe(false); }
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
  it("adds the actual prompt and full MIRA source as a draft with unchecked review", () => {
    const analysis: MiraAnalysis = { case: { ...emptyCase(), chiefComplaint: "keluhan" }, traceId: "live-trace", createdAt: "2026-10-09T00:00:00Z", result: { contractVersion: "1", status: "ok", differential: { likely: [], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: ["Tanda vital belum tersedia"], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0.01 } } };
    const messages = composerMiraMessages(analysis, "pertanyaan asli", "question");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("pertanyaan asli");
    expect(messages[1].content).toContain("# Analisis kasus");
    expect(messages[1].content).not.toContain("Analisis MIRA");
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
