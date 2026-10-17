import { describe, expect, it } from "vitest";
import { requestMiraAnalysis } from "../src/lib/mira/client";
import { emptyCase } from "../src/lib/mira/contract";
import { THEORACLE_GROUNDING_CAPABILITY } from "../src/lib/theoracle-grounding-types";

const caseData = { ...emptyCase(), chiefComplaint: "Kasus fiktif untuk pengujian" };
const grounding = { version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-10T12:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "P001-001", text: "Kutipan TheOracle", retrievalRank: 1, similarity: 0.71, source: { title: "PNPK uji.md", docSource: "Kemenkes knowledge base", origin: "oracle-ii-knowledge-base", textSha256: "c".repeat(64) } }] } as const;
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
  it("keeps the server's error code on the thrown error so the UI can tell causes apart", async () => {
    const fetchFn = async () => Response.json({ error: { code: "NOT_CONFIGURED", message: "Layanan analisis belum dikonfigurasi." } }, { status: 503 });
    await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn })).rejects.toMatchObject({ code: "NOT_CONFIGURED", message: "Layanan analisis belum dikonfigurasi." });
    const bare = async () => Response.json({}, { status: 500 });
    await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn: bare })).rejects.toMatchObject({ code: undefined, message: "Analisis belum tersedia. Keluhan tetap tersedia." });
  });
  it("turns a lost connection or unreadable body into the service wording instead of the browser's", async () => {
    const offline: typeof fetch = async () => { throw new TypeError("Failed to fetch"); };
    const html: typeof fetch = async () => new Response("<html>gateway</html>", { status: 502 });
    for (const fetchFn of [offline, html]) await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn })).rejects.toThrow("Layanan analisis tidak dapat dihubungi atau respons tidak dapat dibaca.");
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
  it("keeps the optional therapy grounding and evidence gate, and rejects an invalid therapy grounding", async () => {
    const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: false, reason: "", drugs: [] };
    const ok = await requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async () => Response.json({ ...response, therapyGrounding: grounding, evidenceGate: gate }) });
    expect(ok.therapyGrounding).toEqual(grounding);
    expect(ok.evidenceGate).toEqual(gate);
    await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async () => Response.json({ ...response, therapyGrounding: { bad: true } }) })).rejects.toThrow("Respons analisis tidak dapat diverifikasi.");
    for (const evidenceGate of [{ bad: true }, null, { ...gate, drugs: "x" }, { ...gate, drugs: [{ drug: "A", dose: "", status: "unknown", evidenceIds: [] }] }]) await expect(requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async () => Response.json({ ...response, evidenceGate }) })).rejects.toThrow("Respons analisis tidak dapat diverifikasi.");
  });
});

describe("therapy that arrives without a gate report", () => {
  const headache = { icd10: "R51", label: "Sakit kepala", confidenceTier: "low" };
  const therapy = { forDiagnosis: { icd10: "R51", label: "Sakit kepala" }, regimen: [{ drug: "Paracetamol", dose: "3x500mg", route: "PO", duration: "3 hari", note: "" }], interactions: [], contraindications: [] };
  const withTherapy = (extra: Record<string, unknown> = {}) => ({ ...response, result: { ...response.result, differential: { ...response.result.differential, likely: [headache] }, therapy }, ...extra });
  const tx = { ...grounding, evidence: [{ ...grounding.evidence[0], text: "Sakit kepala: parasetamol 1 g bila nyeri." }] };
  const run = (data: unknown) => requestMiraAnalysis(caseData, { synthetic: true, fetchFn: async () => Response.json(data) });
  it("is gated on the client against its therapy bundle, keeping the diagnosis", async () => {
    const analysis = await run(withTherapy({ therapyGrounding: tx }));
    expect(analysis.result.differential.likely[0].icd10).toBe("R51");
    expect(analysis.result.therapy?.regimen[0]).toMatchObject({ drug: "Paracetamol", dose: "" });
    expect(analysis.evidenceGate?.drugs[0]).toMatchObject({ drug: "Paracetamol", status: "doseRemoved" });
  });
  it("loses its therapy when no passage names the drug, and says why", async () => {
    const analysis = await run(withTherapy());
    expect(analysis.result.therapy).toBeUndefined();
    expect(analysis.evidenceGate?.therapyRemoved).toBe(true);
  });
  it("falls back to the diagnosis bundle, and drops therapy written for another diagnosis", async () => {
    const supported = await run({ ...withTherapy(), grounding: tx });
    expect(supported.result.therapy?.regimen[0]).toMatchObject({ drug: "Paracetamol", dose: "" });
    const other = await run(withTherapy({ therapyGrounding: tx, result: { ...withTherapy().result, therapy: { ...therapy, forDiagnosis: { icd10: "J18.9", label: "Pneumonia" } } } }));
    expect(other.result.therapy).toBeUndefined();
    expect(other.evidenceGate?.therapyRemoved).toBe(true);
  });
  it("re-checks a server gate report with the one strict rule and downgrades a dose its evidence does not support", async () => {
    const evidenceGate = { forDiagnosis: therapy.forDiagnosis, therapyRemoved: false, reason: "", drugs: [{ drug: "Paracetamol", dose: "3x500mg", status: "verified", evidenceIds: ["P001-001"] }] };
    const analysis = await run(withTherapy({ therapyGrounding: tx, evidenceGate }));
    expect(analysis.result.therapy?.regimen[0]).toMatchObject({ drug: "Paracetamol", dose: "" });
    expect(analysis.evidenceGate).toEqual({ ...evidenceGate, drugs: [{ ...evidenceGate.drugs[0], status: "doseRemoved" }] });
  });
});
