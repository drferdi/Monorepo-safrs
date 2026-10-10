import { describe, expect, it } from "vitest";
import { selectedMiraModel, miraServiceVersion } from "../src/lib/mira/model-profile";
import { createMiraGateway } from "../src/lib/mira/gateway";
import { emptyCase } from "../src/lib/mira/contract";
import { ORACLE_GROUNDING_CAPABILITY, OracleGroundingError, type OracleGroundingBundle } from "../src/lib/oracle-grounding-types";

const version = (plan = selectedMiraModel, assess = selectedMiraModel) => `mira-service/test+contract=1+provider=openrouter+data=synthetic-only+plan=${plan}+assess=${assess}+experimental`;
const input = () => new Request("http://127.0.0.1:3104/api/mira", { method: "POST", headers: { Origin: "http://127.0.0.1:3104", "Content-Type": "application/json" }, body: JSON.stringify({ case: { ...emptyCase(), chiefComplaint: "Kasus fiktif untuk uji" }, synthetic: true }) });
const result = { contractVersion: "1", status: "ok", differential: { likely: [], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: ["Input kurang"], nextBestActions: [], disposition: null, unfilled: [], meta: { version: version(), model: `${selectedMiraModel}+${selectedMiraModel}`, costUsd: 0.006 } };
const grounding: OracleGroundingBundle = { version: ORACLE_GROUNDING_CAPABILITY, corpus: { name: "Oracle II", databaseSha256: "a".repeat(64), retrievedAt: "2026-10-10T12:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "P001-001", text: "Kutipan Oracle II", retrievalKind: "candidate", retrievalRank: 1, source: { fileNo: "001", filename: "001_PNPK.pdf", documentSha256: "c".repeat(64), pdfPage: 17, pageTextSha256: "d".repeat(64), driveUrl: "https://example.test/source" }, extraction: { candidateId: "P001-001", category: "diagnosis", sourceCharOffset: 10, sourceCharEnd: 28, reviewStatus: "SOURCE_TEXT_EXACT_SEMANTIC_REVIEW_REQUIRED", requiresVisualReview: false } }] };

describe("approved Gemini Flash profile", () => {
  it("requires advertised grounding capability before retrieval or inference", async () => {
    let retrievals = 0;
    const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", retrieveGrounding: () => { retrievals++; return grounding; }, fetchFn: async () => Response.json({ status: "ok", contractVersion: "1", version: version(), capabilities: [] }) });
    const response = await gateway.step(input());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "GROUNDING_REQUIRED" } });
    expect(retrievals).toBe(0);
  });
  it("retrieves before inference and forwards the exact bundle separately from the unchanged case", async () => {
    const events: string[] = [];
    let posted: RequestInit | undefined;
    const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", retrieveGrounding: caseData => { events.push("retrieve"); expect(caseData.chiefComplaint).toBe("Kasus fiktif untuk uji"); return grounding; }, fetchFn: async (url, init) => {
      if (String(url).endsWith("healthz")) return Response.json({ status: "ok", contractVersion: "1", version: version(), capabilities: [ORACLE_GROUNDING_CAPABILITY] });
      events.push("inference"); posted = init; return Response.json(result);
    } });
    const response = await gateway.step(input());
    const forwarded = JSON.parse(String(posted?.body));
    expect(events).toEqual(["retrieve", "inference"]);
    expect(forwarded.case.chiefComplaint).toBe("Kasus fiktif untuk uji");
    expect(forwarded.grounding).toEqual(grounding);
    expect(await response.json()).toMatchObject({ grounding });
  });
  it("reports an actionable Oracle no-match and makes no inference call", async () => {
    let calls = 0;
    const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", retrieveGrounding: () => { throw new OracleGroundingError("ORACLE_NO_MATCH", "Oracle II tidak menemukan referensi leksikal untuk keluhan ini. Analisis tidak dijalankan."); }, fetchFn: async () => { calls++; return Response.json({ status: "ok", contractVersion: "1", version: version(), capabilities: [ORACLE_GROUNDING_CAPABILITY] }); } });
    const response = await gateway.step(input());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "ORACLE_NO_MATCH" } });
    expect(calls).toBe(1);
  });
  it("distinguishes upstream timeout, budget and policy errors without exposing raw messages", async () => {
    for (const [code, status] of [["TIMEOUT", 504], ["BUDGET_EXHAUSTED", 429], ["STEP_BUDGET_EXCEEDED", 429], ["PROVIDER_POLICY", 503], ["MODEL_ERROR", 502], ["MODEL_OUTPUT_INVALID", 502], ["CONTRACT_MISMATCH", 502], ["API_ERRORS", 503], ["UNKNOWN", 503]] as const) {
      const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn: async url => Response.json(String(url).endsWith("healthz") ? { status: "ok", contractVersion: "1", version: version() } : { ...result, status: "unavailable", error: { code, message: "private raw provider message" } }) });
      const response = await gateway.step(input());
      const body = await response.json();
      expect(response.status).toBe(status);
      expect(body.error.code).toBe(code === "UNKNOWN" ? "UNAVAILABLE" : code);
      expect(body).not.toHaveProperty("result");
      expect(JSON.stringify(body)).not.toContain("private raw provider message");
      expect(JSON.stringify(body)).not.toContain("MIRA");
    }
  });
  it("pins an explicit Flash release and both stages with synthetic-only OpenRouter", () => {
    expect(selectedMiraModel).toBe("google/gemini-2.5-flash");
    expect(miraServiceVersion(version(), selectedMiraModel)).toBe(true);
    for (const value of [version("other/model"), version(selectedMiraModel, "other/model"), version().replace("synthetic-only", "openrouter-zdr"), version().replace("provider=openrouter", "provider=openai"), `${version()}+assess=${selectedMiraModel}`, "unknown"]) expect(miraServiceVersion(value, selectedMiraModel)).toBe(false);
  });
  it("reports the selected paid profile and its configured response cost limit", async () => {
    const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn: async () => Response.json({ status: "ok", contractVersion: "1", version: version() }) });
    expect(await (await gateway.health()).json()).toMatchObject({ modelReady: true, configured: true, freeOnly: false, model: selectedMiraModel, maxCostUsd: 0.1 });
  });
  it("blocks mixed, old or unknown profiles before forwarding a case", async () => {
    for (const value of [version("apodex/apodex-1.1-mini:free"), version("deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4.1-flash"), version(selectedMiraModel, "other/model"), "unknown"]) {
      let calls = 0;
      const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn: async () => { calls++; return Response.json({ status: "ok", contractVersion: "1", version: value }); } });
      expect((await gateway.step(input())).status).toBe(503);
      expect(calls).toBe(1);
    }
  });
  it("accepts a validated paid result without a client model override", async () => {
    let posted: RequestInit | undefined;
    const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn: async (url, init) => { if (String(url).endsWith("healthz")) return Response.json({ status: "ok", contractVersion: "1", version: version() }); posted = init; return Response.json(result); } });
    const response = await gateway.step(input());
    expect(response.status).toBe(200);
    expect((await response.json()).result.meta.costUsd).toBe(0.006);
    expect(new Headers(posted?.headers).has("X-MIRA-Plan-Model")).toBe(false);
    expect(new Headers(posted?.headers).get("X-MIRA-Case-Origin")).toBe("synthetic");
  });
  it("rejects missing, negative or over-limit cost and inconsistent result models", async () => {
    for (const meta of [{ ...result.meta, costUsd: null }, { ...result.meta, costUsd: -0.1 }, { ...result.meta, costUsd: 0.11 }, { ...result.meta, model: "other/model+other/model" }, { ...result.meta, version: version("other/model") }]) {
      const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn: async url => Response.json(String(url).endsWith("healthz") ? { status: "ok", contractVersion: "1", version: version() } : { ...result, meta }) });
      const response = await gateway.step(input());
      expect(response.status).toBe(502);
      expect(await response.json()).not.toHaveProperty("result");
    }
  });
});
