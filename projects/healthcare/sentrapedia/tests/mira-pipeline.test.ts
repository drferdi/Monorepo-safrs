import { describe, expect, it } from "vitest";
import { selectedMiraModel } from "../src/lib/mira/model-profile";
import { createMiraGateway, type StageLog } from "../src/lib/mira/gateway";
import { emptyCase } from "../src/lib/mira/contract";
import { THEORACLE_GROUNDING_CAPABILITY, TheOracleGroundingError, type TheOracleGroundingBundle } from "../src/lib/theoracle-grounding-types";

const version = `mira-service/test+contract=1+provider=openrouter+data=synthetic-only+plan=${selectedMiraModel}+assess=${selectedMiraModel}+experimental`;
const meta = { version, model: `${selectedMiraModel}+${selectedMiraModel}`, costUsd: 0.01 };
const input = () => new Request("http://127.0.0.1:3104/api/mira", { method: "POST", headers: { Origin: "http://127.0.0.1:3104", "Content-Type": "application/json" }, body: JSON.stringify({ case: { ...emptyCase(), chiefComplaint: "Batuk demam fiktif" }, synthetic: true }) });
const bundle = (text: string): TheOracleGroundingBundle => ({ version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-11T12:00:00.000Z", reviewProvenance: "fixture" }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "E1", text, retrievalRank: 1, similarity: 0.6, source: { title: "ppk.pdf", docSource: "uji", origin: "fixture", textSha256: "c".repeat(64) } }] });
const diagnosisResult = (likely: { icd10: string; label: string; confidenceTier: string }[]) => ({ contractVersion: "1", status: "ok", differential: { likely, alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta });
const pneumonia = { icd10: "J18.9", label: "Pneumonia", confidenceTier: "low" };
const therapy = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, regimen: [{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }, { drug: "Levofloxacin", dose: "1x750mg", route: "PO", duration: "5 hari", note: "" }], interactions: [], contraindications: [] };

function service(options: { capabilities?: string[]; likely?: typeof pneumonia[]; therapyStatus?: "ok" | "unavailable"; withTherapy?: boolean } = {}) {
  const posts: { path: string; body: Record<string, unknown> }[] = [];
  const fetchFn: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/healthz") return Response.json({ status: "ok", contractVersion: "1", version, capabilities: options.capabilities ?? [THEORACLE_GROUNDING_CAPABILITY, "theoracle-targeted-therapy-v1"] });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    posts.push({ path, body });
    if (path === "/v1/therapy/step") return Response.json(options.therapyStatus === "unavailable" ? { contractVersion: "1", status: "unavailable", error: { code: "MODEL_ERROR", message: "x" }, meta } : { contractVersion: "1", status: "ok", therapy, meta });
    return Response.json({ ...diagnosisResult(options.likely ?? [pneumonia]), ...(options.withTherapy ? { therapy } : {}) });
  };
  return { fetchFn, posts };
}
const gatewayWith = (fetchFn: typeof fetch, extra: Record<string, unknown> = {}) => {
  const logs: StageLog[] = [];
  const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn, targetedTherapy: true, log: entry => logs.push(entry),
    retrieveGrounding: async () => bundle("Batuk dan demam."), retrieveTherapyGrounding: async (_case, diagnosis) => { expect(diagnosis).toEqual({ icd10: "J18.9", label: "Pneumonia" }); return bundle("Pneumonia: amoksisilin 500 mg 3 kali sehari."); }, ...extra });
  return { gateway, logs };
};

describe("targeted therapy pipeline", () => {
  it("runs diagnosis, targeted retrieval, therapy and the gate in order, with one log line per stage", async () => {
    const { fetchFn, posts } = service();
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step", "/v1/therapy/step"]);
    expect(posts[0].body.omitTherapy).toBe(true);
    expect(posts[1].body.diagnosis).toEqual({ icd10: "J18.9", label: "Pneumonia" });
    expect(body.result.therapy.regimen).toEqual([{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }]);
    expect(body.evidenceGate.drugs.map((d: { status: string }) => d.status)).toEqual(["verified", "removed"]);
    expect(body.therapyGrounding.evidence[0].evidenceId).toBe("E1");
    expect(body.pipeline.path).toBe("targeted");
    expect(logs.map(l => l.stage)).toEqual(["retrieve_dx", "mira_dx", "retrieve_tx", "mira_tx", "gate"]);
    expect(JSON.stringify(logs)).not.toContain("Batuk");
  });
  it("makes no therapy call when targeted retrieval fails, and returns the diagnosis", async () => {
    const { fetchFn, posts } = service();
    const { gateway, logs } = gatewayWith(fetchFn, { retrieveTherapyGrounding: async () => { throw new TheOracleGroundingError("THEORACLE_NO_MATCH", "x"); } });
    const response = await gateway.step(input());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.result.therapy).toBeUndefined();
    expect(body.result.differential.likely[0].icd10).toBe("J18.9");
    expect(logs.find(l => l.stage === "retrieve_tx")).toMatchObject({ ok: false, code: "THEORACLE_NO_MATCH" });
  });
  it("skips therapy when the diagnosis step has no likely diagnosis", async () => {
    const { fetchFn, posts } = service({ likely: [] });
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.result.therapy).toBeUndefined();
    expect(logs.map(l => l.stage)).toEqual(["retrieve_dx", "mira_dx"]);
  });
  it("returns the diagnosis without therapy when the therapy step is unavailable", async () => {
    const { fetchFn } = service({ therapyStatus: "unavailable" });
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(body.result.therapy).toBeUndefined();
    expect(logs.find(l => l.stage === "mira_tx")).toMatchObject({ ok: false, code: "MODEL_ERROR" });
  });
  it("falls back to the current path when MIRA lacks the capability, and still gates its therapy", async () => {
    const { fetchFn, posts } = service({ capabilities: [THEORACLE_GROUNDING_CAPABILITY], withTherapy: true });
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(posts).toHaveLength(1);
    expect(posts[0].body.omitTherapy).toBeUndefined();
    expect(body.pipeline.path).toBe("legacy");
    expect(logs.find(l => l.stage === "route")).toMatchObject({ ok: false, code: "TARGETED_UNAVAILABLE" });
    expect(body.evidenceGate.therapyRemoved).toBe(true);
    expect(body.result.therapy).toBeUndefined();
  });
  it("with the flag off, keeps the current single call and gates its therapy against the complaint bundle", async () => {
    const { fetchFn, posts } = service({ withTherapy: true });
    const { gateway } = gatewayWith(fetchFn, { targetedTherapy: false, retrieveGrounding: async () => bundle("Amoksisilin 500 mg untuk pneumonia.") });
    const body = await (await gateway.step(input())).json();
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.pipeline.path).toBe("legacy");
    expect(body.result.therapy.regimen.map((r: { drug: string }) => r.drug)).toEqual(["Amoxicillin"]);
  });
  it("treats an ok therapy reply without a therapy key as a CONTRACT failure in the mira_tx stage", async () => {
    const { fetchFn: base } = service();
    const fetchFn: typeof fetch = async (url, init) => new URL(String(url)).pathname === "/v1/therapy/step" ? Response.json({ contractVersion: "1", status: "ok", meta }) : base(url, init);
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(body.result.therapy).toBeUndefined();
    expect(body.evidenceGate).toBeUndefined();
    expect(logs.find(l => l.stage === "mira_tx")).toMatchObject({ ok: false, code: "CONTRACT" });
  });
  it("records a contract failure once in mira_tx when the therapy cost exceeds the limit", async () => {
    const { fetchFn: base } = service();
    const fetchFn: typeof fetch = async (url, init) => new URL(String(url)).pathname === "/v1/therapy/step" ? Response.json({ contractVersion: "1", status: "ok", therapy, meta: { ...meta, costUsd: 5 } }) : base(url, init);
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(body.result.therapy).toBeUndefined();
    expect(body.therapyGrounding).toBeUndefined();
    expect(logs.find(l => l.stage === "mira_tx")).toMatchObject({ ok: false, code: "CONTRACT" });
    expect(logs.map(l => l.stage)).toEqual(["retrieve_dx", "mira_dx", "retrieve_tx", "mira_tx"]);
  });
  it("records a targeted retrieval that exceeds the limit and returns the diagnosis without therapy", async () => {
    const { fetchFn, posts } = service();
    const { gateway, logs } = gatewayWith(fetchFn, { retrievalTimeoutMs: 20, retrieveTherapyGrounding: () => new Promise<never>(() => undefined) });
    const response = await gateway.step(input());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.result.therapy).toBeUndefined();
    expect(logs.find(l => l.stage === "retrieve_tx")).toMatchObject({ ok: false, code: "THEORACLE_UNAVAILABLE" });
  });
  it("applies no retrieval time limit on the legacy path", async () => {
    const { fetchFn } = service();
    const { gateway, logs } = gatewayWith(fetchFn, { targetedTherapy: false, retrievalTimeoutMs: 5, retrieveGrounding: async () => { await new Promise(resolve => setTimeout(resolve, 60)); return bundle("Batuk dan demam."); } });
    const response = await gateway.step(input());
    expect(response.status).toBe(200);
    expect(logs.find(l => l.stage === "retrieve_dx")).toMatchObject({ ok: true });
  });
  it("answers ABORTED (499) when the request is aborted, even if a pending retrieval then rejects with a grounding error", async () => {
    const { fetchFn } = service();
    const abort = new AbortController();
    let rejectRetrieval: (error: Error) => void = () => undefined;
    const pending = new Promise<never>((_, reject) => { rejectRetrieval = reject; });
    let started: () => void = () => undefined;
    const retrievalStarted = new Promise<void>(resolve => { started = resolve; });
    const { gateway } = gatewayWith(fetchFn, { retrieveTherapyGrounding: () => { started(); return pending; } });
    const request = new Request("http://127.0.0.1:3104/api/mira", { method: "POST", headers: { Origin: "http://127.0.0.1:3104", "Content-Type": "application/json" }, body: JSON.stringify({ case: { ...emptyCase(), chiefComplaint: "Batuk demam fiktif" }, synthetic: true }), signal: abort.signal });
    const responsePromise = gateway.step(request);
    await retrievalStarted;
    abort.abort();
    rejectRetrieval(new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "x"));
    const response = await responsePromise;
    expect(response.status).toBe(499);
    expect((await response.json()).error.code).toBe("ABORTED");
  });
});
