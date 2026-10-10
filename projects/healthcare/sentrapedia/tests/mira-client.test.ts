import { describe, expect, it } from "vitest";
import { requestMiraAnalysis } from "../src/lib/mira/client";
import { emptyCase } from "../src/lib/mira/contract";
import { ORACLE_GROUNDING_CAPABILITY } from "../src/lib/oracle-grounding-types";

const caseData = { ...emptyCase(), chiefComplaint: "Kasus fiktif untuk pengujian" };
const grounding = { version: ORACLE_GROUNDING_CAPABILITY, corpus: { name: "Oracle II", databaseSha256: "a".repeat(64), retrievedAt: "2026-10-10T12:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "P001-001", text: "Kutipan Oracle II", retrievalKind: "candidate", retrievalRank: 1, source: { fileNo: "001", filename: "001_PNPK.pdf", documentSha256: "c".repeat(64), pdfPage: 17, pageTextSha256: "d".repeat(64), driveUrl: "https://example.test/source" }, extraction: { candidateId: "P001-001", category: "diagnosis", sourceCharOffset: 10, sourceCharEnd: 28, reviewStatus: "SOURCE_TEXT_EXACT_SEMANTIC_REVIEW_REQUIRED", requiresVisualReview: false } }] } as const;
const response = { traceId: "test-trace", createdAt: "2026-10-09T00:00:00Z", grounding, result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "R51", label: "Hipotesis uji fiktif", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: ["Tanda vital belum tersedia"], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0.01 } } };

describe("direct main-composer analysis", () => {
  it("sends a confirmed fictional case once and returns validated diagnosis with its source snapshot", async () => {
    let calls = 0;
    const analysis = await requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async (url, init) => {
      calls++;
      expect(url).toBe("/api/mira");
      expect(JSON.parse(String(init?.body))).toEqual({ case: caseData, synthetic: true });
      return Response.json(response);
    } });
    expect(calls).toBe(1);
    expect(analysis.result.differential.likely[0].icd10).toBe("R51");
    expect(analysis.case).toEqual(caseData);
    expect(analysis.case).not.toBe(caseData);
    expect(analysis.traceId).toBe("test-trace");
    expect(analysis.grounding).toEqual(grounding);
  });
  it("never sends unconfirmed, invalid or identifiable input", async () => {
    let calls = 0;
    const fetchFn: typeof fetch = async () => { calls++; return Response.json(response); };
    for (const [data, synthetic] of [[caseData, false], [emptyCase(), true], [{ ...caseData, chiefComplaint: "nama: Identitas pribadi" }, true]] as const) await expect(requestMiraAnalysis(data, { synthetic, fetchFn })).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it("reports the safe server error without creating a local brief or retrying", async () => {
    let calls = 0;
    await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async () => { calls++; return Response.json({ error: { code: "TIMEOUT", message: "Analisis melewati batas waktu layanan." } }, { status: 504 }); } })).rejects.toThrow("Analisis melewati batas waktu layanan.");
    expect(calls).toBe(1);
  });
  it("rejects unavailable or malformed output and invalid trace dates", async () => {
    for (const data of [{ ...response, result: { ...response.result, status: "unavailable" } }, { ...response, createdAt: "invalid" }, { ...response, result: {} }, { ...response, grounding: { ...grounding, evidence: [] } }]) await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async () => Response.json(data) })).rejects.toThrow("Respons analisis tidak dapat diverifikasi.");
  });
  it("passes cancellation through without returning a draft", async () => {
    const controller = new AbortController();
    await expect(requestMiraAnalysis(caseData, { synthetic: true, signal: controller.signal, fetchFn: async (_url, init) => {
      expect(init?.signal).toBe(controller.signal);
      controller.abort();
      return Response.json(response);
    } })).rejects.toThrow();
  });
});
