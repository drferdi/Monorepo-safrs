import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { oracleCategories, oracleDiseases, oracleSource, searchDiseases, relatedDiseases } from "../lib/oracle";
import { createMiraGateway } from "../lib/mira/gateway";
import { containsIdentity, validCase, validResult, type MiraResult } from "../lib/mira/contract";
import { miraDraft, miraMessage } from "../lib/mira/presentation";
import { initialWorkspace, newEncounter, restoreWorkspace, workspaceReducer } from "../lib/workspace";
import requestSchema from "../lib/mira/request.schema.json";
import responseSchema from "../lib/mira/response.schema.json";
import { SUPPORTED_KEYWORDS, type JsonSchema } from "../lib/mira/validate-json";

const caseData = { demographics: { ageYears: 30, sex: "unknown" }, chiefComplaint: "Keluhan fiktif untuk uji integrasi", anamnesis: { freeText: "Contoh sintetis" }, vitals: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [], allergies: [], facilityCapabilities: [] };
const result: MiraResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Nama keluaran uji", confidenceTier: "low" }], alternatives: [], cannotMiss: [{ icd10: "C92.0", label: "Kondisi di luar Oracle", confidenceTier: "unknown" }] }, evidence: [{ icd10: "J00", supporting: ["Alasan dari layanan"], opposing: ["Data belum lengkap"] }], missingInformation: ["Pemfis belum tersedia"], nextBestActions: [{ kind: "exam", item: "Lengkapi pemfis", reason: "Data kurang" }], disposition: null, unfilled: [{ field: "disposition", reason: "Belum cukup data" }], meta: { version: "test-only", model: "mock", costUsd: 0 } };
const therapy = { forDiagnosis: { icd10: "J00", label: "Nama keluaran uji" }, regimen: [{ drug: "Ceftriaxone", dose: "1x500mg", route: "IM", duration: "dosis tunggal", note: "1g bila >=150kg" }, { drug: "Azithromycin", dose: "1x1g", route: "PO", duration: "dosis tunggal", note: "" }], interactions: ["Azithromycin dengan warfarin: risiko perdarahan"], contraindications: ["Ceftriaxone: alergi sefalosporin"] };
const request = (body: unknown = { case: caseData, synthetic: true }, origin = "http://localhost:3104") => new Request("http://localhost:3104/api/mira", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("Oracle local catalog", () => {
  it("ties provenance to the exact original source bytes", () => { expect(createHash("sha256").update(readFileSync("oracle/sentrapedia.json")).digest("hex")).toBe(oracleSource.hash); });
  it("uses all actual categories and preserves repeated codes", () => { expect(oracleDiseases).toHaveLength(144); expect(oracleCategories).toHaveLength(15); expect(oracleCategories).toContain("Pernapasan Bawah"); expect(relatedDiseases("A09")).toHaveLength(2); expect(relatedDiseases("C92.0")).toEqual([]); });
  it("searches name, code and category with no clinical ranking", () => { expect(searchDiseases("pneumonia", "all").length).toBeGreaterThan(0); expect(searchDiseases("J00", "all")[0].id).toBe(1); expect(searchDiseases("", "Saluran Cerna").every(d => d.kategori === "Saluran Cerna")).toBe(true); expect(searchDiseases("zzzz", "all")).toEqual([]); expect(oracleSource.hash).toHaveLength(64); });
});
describe("MIRA contract and presentation", () => {
  it("supports every keyword of the localized contract snapshots", () => {
    function inspect(schema: JsonSchema) { for (const [key, value] of Object.entries(schema)) { expect(SUPPORTED_KEYWORDS.has(key)).toBe(true); if (key === "properties" || key === "$defs") Object.values(value as Record<string, JsonSchema>).forEach(inspect); if (key === "items") inspect(value as JsonSchema); } }
    inspect(requestSchema); inspect(responseSchema);
    expect(createHash("sha256").update(readFileSync("lib/mira/request.schema.json")).digest("hex")).toBe("84eba75c9810b794d1875dde77fc204dd5515b879056a8b47c60eef398e607dc");
    expect(createHash("sha256").update(readFileSync("lib/mira/response.schema.json")).digest("hex")).toBe("b5048ad8fa750886dd7780435e1e09aabfb8299bbb1b49d0f1ca753154aef171");
  });
  it("preserves repeated and otherwise unlisted service evidence", () => {
    const draft = miraDraft({ ...result, evidence: [...result.evidence, { icd10: "J00", supporting: ["Pendukung tambahan"], opposing: [] }, { icd10: "R50", supporting: [], opposing: ["Alasan tambahan terpisah"] }] }, "trace", "time");
    expect(draft).toContain("Pendukung tambahan"); expect(draft).toContain("Alasan tambahan terpisah"); expect(draft).toContain("R50");
  });
  it("accepts contract v1 and rejects extra identities and malformed output", () => { expect(validCase(caseData)).toBe(true); expect(validCase({ ...caseData, nama: "Extra" })).toBe(false); expect(validResult(result)).toBe(true); expect(validResult({ ...result, differential: [] })).toBe(false); });
  it("accepts the optional therapy block and rejects a malformed one", () => { expect(validResult({ ...result, therapy })).toBe(true); expect(validResult({ ...result, therapy: { ...therapy, regimen: [{ drug: "Ceftriaxone" }] } })).toBe(false); });
  it("blocks identifiers without exposing matched text", () => { for (const s of ["nik: 1234567890123456", "bpjs: 1234567890123", "nama: Test Person", "test@example.com", "+6281234567890", "RM: abc123", "alamat: Jalan contoh"]) expect(containsIdentity(s)).toBe(true); expect(containsIdentity(JSON.stringify(caseData))).toBe(false); });
  it("keeps outside-catalog diagnoses and supporting/opposing evidence in the draft", () => { const draft = miraDraft(result, "trace-test", "2026-10-09T00:00:00Z"); for (const phrase of ["C92.0", "Alasan dari layanan", "Data belum lengkap", "Belum cukup data", "trace-test"]) expect(draft).toContain(phrase); });
  it("preserves the analysis and resets review when restored as a workspace draft", () => {
    if (!validCase(caseData)) throw new Error("Invalid test fixture");
    const message = miraMessage({ case: caseData, result, traceId: "test-trace", createdAt: "2026-10-09T00:00:00Z" });
    const encounter = newEncounter();
    let state = workspaceReducer(initialWorkspace, { type: "encounter.add", encounter });
    state = workspaceReducer(state, { type: "message.add", encounterId: encounter.id, messages: [message] });
    const restored = restoreWorkspace(JSON.stringify(state)).encounters.find(e => e.id === encounter.id)!.messages[0];
    expect(restored.reviewStatus).toBe("draft"); expect(restored.reviewItems?.every(i => !i.checked)).toBe(true);
    expect(JSON.parse(restored.sourceText!).case).toEqual(caseData); expect(JSON.parse(restored.sourceText!).result).toEqual(result);
    expect(restored.content).toContain("C92.0"); expect(restored.originalContent).toBe(restored.content);
  });
  it("rejects incomplete result rows and excessive case length", () => { expect(validCase({ ...caseData, results: [{ name: "", value: "" }] })).toBe(false); expect(validCase({ ...caseData, chiefComplaint: "x".repeat(24001) })).toBe(false); });
});
describe("server gateway", () => {
  it("accepts the public loopback Host when Next uses an internal localhost URL", async () => {
    const gateway = createMiraGateway({ token: "test", fetchFn: async () => Response.json(result) });
    const req = new Request("http://localhost:3105/api/mira", { method: "POST", headers: { Host: "127.0.0.1:3105", Origin: "http://127.0.0.1:3105", "Content-Type": "application/json" }, body: JSON.stringify({ case: caseData, synthetic: true }) });
    expect((await gateway.step(req)).status).toBe(200);
    const bad = new Request(request(), { headers: { Host: "external.test:3104", Origin: "http://external.test:3104" } }); expect((await gateway.step(bad)).status).toBe(403);
  });
  it("rejects non-local caller and non-local service configuration", async () => {
    let calls = 0; const gateway = createMiraGateway({ baseUrl: "http://external.test", token: "test", fetchFn: async () => { calls++; return Response.json(result); } });
    expect((await gateway.step(request())).status).toBe(503);
    const remote = new Request("http://external.test/api/mira", { method: "POST", headers: { Origin: "http://external.test" }, body: JSON.stringify({ case: caseData, synthetic: true }) });
    expect((await gateway.step(remote)).status).toBe(403); expect(calls).toBe(0);
  });
  it("rejects oversized bodies without invoking inference", async () => { let calls = 0; const gateway = createMiraGateway({ token: "test", fetchFn: async () => { calls++; return Response.json(result); } }); expect((await gateway.step(request({ case: caseData, synthetic: true, junk: "x".repeat(33000) }))).status).toBe(400); expect(calls).toBe(0); });
  it("propagates cancellation to the service request", async () => {
    const abort = new AbortController(); let observed = false;
    const gateway = createMiraGateway({ token: "test", fetchFn: async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => { observed = true; reject(new Error("cancel")); }); }) });
    const req = new Request(request(), { signal: abort.signal }); const pending = gateway.step(req);
    await new Promise(resolve => setTimeout(resolve, 1)); abort.abort();
    expect((await pending).status).toBe(499); expect(observed).toBe(true);
  });
  it("checks health without inference or credentials", async () => { let called = ""; const gateway = createMiraGateway({ fetchFn: async (url) => { called = String(url); return Response.json({ status: "ok", contractVersion: "1" }); } }); const body = await (await gateway.health()).json(); expect(body.reachable).toBe(true); expect(body.configured).toBe(false); expect(called).toContain("/healthz"); });
  it("refuses missing token, hostile origin and PII without any network call", async () => { let calls = 0; const gateway = createMiraGateway({ fetchFn: async () => { calls++; return Response.json(result); } }); expect((await gateway.step(request())).status).toBe(503); expect((await gateway.step(request(undefined, "http://other.test"))).status).toBe(403); expect((await gateway.step(request({ case: { ...caseData, chiefComplaint: "nama: Test Person" }, synthetic: true }))).status).toBe(400); expect(calls).toBe(0); });
  it("posts a synthetic case with server token and returns validated output", async () => { let sent: RequestInit | undefined; const gateway = createMiraGateway({ token: "test-server-token", fetchFn: async (_url, init) => { sent = init; return Response.json(result); } }); const response = await gateway.step(request()); expect(response.status).toBe(200); const body = await response.json(); expect(body.result.differential.cannotMiss[0].icd10).toBe("C92.0"); expect(body.traceId).toBeTruthy(); const headers = new Headers(sent?.headers); expect(headers.get("Authorization")).toBe("Bearer test-server-token"); expect(headers.get("X-MIRA-Case-Origin")).toBe("synthetic"); expect(JSON.stringify(body)).not.toContain("test-server-token"); });
  it("rejects malformed input/response and sanitizes upstream failures", async () => { const bad = createMiraGateway({ token: "test", fetchFn: async () => Response.json({ token: "never-show" }) }); expect((await bad.step(request({ case: {}, synthetic: true }))).status).toBe(400); expect((await bad.step(request({ case: caseData, synthetic: false }))).status).toBe(400); expect((await bad.step(request())).status).toBe(502); const fail = createMiraGateway({ token: "test", fetchFn: async () => new Response("secret-upstream", { status: 401 }) }); expect(JSON.stringify(await (await fail.step(request())).json())).not.toContain("secret-upstream"); });
  it("times out and holds a single active request", async () => { const gateway = createMiraGateway({ token: "test", timeoutMs: 10, fetchFn: async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))); }) }); const first = gateway.step(request()); await new Promise(resolve => setTimeout(resolve, 1)); expect((await gateway.step(request())).status).toBe(429); expect((await first).status).toBe(504); });
});
