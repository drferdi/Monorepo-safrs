import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { theOracleCategories, theOracleDiseases, theOracleSource, searchDiseases } from "../src/lib/theoracle";
import { createAadiGateway } from "../src/lib/aadi/gateway";
import { containsIdentity, validCase, validResult, type AadiResult } from "../src/lib/aadi/contract";
import { aadiDraft, aadiMessage } from "../src/lib/aadi/presentation";
import { initialWorkspace, newEncounter, workspaceReducer, loadWorkspace } from "../src/lib/workspace";
import requestSchema from "../src/lib/aadi/request.schema.json";
import responseSchema from "../src/lib/aadi/response.schema.json";
import { SUPPORTED_KEYWORDS, type JsonSchema } from "../src/lib/aadi/validate-json";
import { withCatalog } from "./private-data";

const withCode = (code: string) => theOracleDiseases.filter(d => d.kode.trim().toUpperCase() === code);

const caseData = { demographics: { ageYears: 30, sex: "unknown" }, chiefComplaint: "Keluhan fiktif untuk uji integrasi", anamnesis: { freeText: "Contoh sintetis" }, vitals: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [], allergies: [], facilityCapabilities: [] };
const result: AadiResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Nama keluaran uji", confidenceTier: "low" }], alternatives: [], cannotMiss: [{ icd10: "C92.0", label: "Kondisi di luar TheOracle", confidenceTier: "unknown" }] }, evidence: [{ icd10: "J00", supporting: ["Alasan dari layanan"], opposing: ["Data belum lengkap"] }], missingInformation: ["Pemfis belum tersedia"], nextBestActions: [{ kind: "exam", item: "Lengkapi pemfis", reason: "Data kurang" }], disposition: null, unfilled: [{ field: "disposition", reason: "Belum cukup data" }], meta: { version: "test-only", model: "mock", costUsd: 0 } };
const therapy = { forDiagnosis: { icd10: "J00", label: "Nama keluaran uji" }, regimen: [{ drug: "Ceftriaxone", dose: "1x500mg", route: "IM", duration: "dosis tunggal", note: "1g bila >=150kg" }, { drug: "Azithromycin", dose: "1x1g", route: "PO", duration: "dosis tunggal", note: "" }], interactions: ["Azithromycin dengan warfarin: risiko perdarahan"], contraindications: ["Ceftriaxone: alergi sefalosporin"] };
const request = (body: unknown = { case: caseData }, origin = "http://localhost:3104") => new Request("http://localhost:3104/api/aadi", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("TheOracle local catalog", () => {
  it.skipIf(!withCatalog)("ties provenance to the exact original source bytes", () => { expect(createHash("sha256").update(readFileSync("oracle/sentrapedia.json")).digest("hex")).toBe(theOracleSource.hash); });
  it.skipIf(!withCatalog)("uses all actual categories and preserves repeated codes", () => { expect(theOracleDiseases).toHaveLength(329); expect(theOracleCategories).toHaveLength(21); expect(theOracleCategories).toContain("Pernapasan"); expect(withCode("I10")).toHaveLength(2); expect(withCode("C92.0")).toEqual([]); });
  it.skipIf(!withCatalog)("searches name, code and category with no clinical ranking", () => { expect(searchDiseases("pneumonia", "all").length).toBeGreaterThan(0); expect(searchDiseases("J00", "all")[0].id).toBe(41); expect(searchDiseases("", "Pencernaan").every(d => d.kategori === "Pencernaan")).toBe(true); expect(searchDiseases("zzzz", "all")).toEqual([]); expect(theOracleSource.hash).toHaveLength(64); });
});
describe("AADI contract and presentation", () => {
  it("supports every keyword of the localized contract snapshots", () => {
    function inspect(schema: JsonSchema) { for (const [key, value] of Object.entries(schema)) { expect(SUPPORTED_KEYWORDS.has(key)).toBe(true); if (key === "properties" || key === "$defs") Object.values(value as Record<string, JsonSchema>).forEach(inspect); if (key === "items") inspect(value as JsonSchema); } }
    inspect(requestSchema); inspect(responseSchema);
    expect(createHash("sha256").update(readFileSync("src/lib/aadi/request.schema.json")).digest("hex")).toBe("9f4b3b79004249e814a14472b81410dd9c2600e89901e417aaf2fd89ecdf76f7");
    expect(createHash("sha256").update(readFileSync("src/lib/aadi/response.schema.json")).digest("hex")).toBe("e70b16bfba157b07d57afb0ee7489131fd4b8788ac5879539501fc30704a37ec");
  });
  it("preserves repeated and otherwise unlisted service evidence", () => {
    const draft = aadiDraft({ ...result, evidence: [...result.evidence, { icd10: "J00", supporting: ["Pendukung tambahan"], opposing: [] }, { icd10: "R50", supporting: [], opposing: ["Alasan tambahan terpisah"] }] }, "trace", "time");
    expect(draft).toContain("Pendukung tambahan"); expect(draft).toContain("Alasan tambahan terpisah"); expect(draft).toContain("R50");
  });
  it("accepts contract v1 and rejects extra identities and malformed output", () => { expect(validCase(caseData)).toBe(true); expect(validCase({ ...caseData, nama: "Extra" })).toBe(false); expect(validResult(result)).toBe(true); expect(validResult({ ...result, differential: [] })).toBe(false); });
  it("accepts the optional report fields, keeps answers without them valid, and rejects an unknown status", () => {
    const report = { ...result, reasoningNote: "Catatan sintetis.", differential: { ...result.differential, likely: result.differential.likely.map(d => ({ ...d, discriminators: "Data pembeda sintetis", status: "supported" as const })) }, nextBestActions: result.nextBestActions.map(a => ({ ...a, indication: "Indikasi sintetis" })) };
    expect(validResult(report)).toBe(true);
    expect(validResult(result)).toBe(true);
    expect(validResult({ ...report, differential: { ...report.differential, likely: [{ ...report.differential.likely[0], status: "confirmed" }] } })).toBe(false);
    expect(validResult({ ...report, reasoningNote: 3 })).toBe(false);
  });
  it("accepts the optional therapy block and rejects a malformed one", () => { expect(validResult({ ...result, therapy })).toBe(true); expect(validResult({ ...result, therapy: { ...therapy, regimen: [{ drug: "Ceftriaxone" }] } })).toBe(false); });
  it("blocks identifiers without exposing matched text", () => { for (const s of ["nik: 1234567890123456", "bpjs: 1234567890123", "nama: Test Person", "test@example.com", "+6281234567890", "RM: abc123", "alamat: Jalan contoh"]) expect(containsIdentity(s)).toBe(true); expect(containsIdentity(JSON.stringify(caseData))).toBe(false); });
  it("keeps outside-catalog diagnoses and supporting/opposing evidence in the draft", () => { const draft = aadiDraft(result, "trace-test", "2026-10-09T00:00:00Z"); for (const phrase of ["C92.0", "Alasan dari layanan", "Data belum lengkap", "Belum cukup data", "trace-test"]) expect(draft).toContain(phrase); });
  it("preserves the analysis and resets review when restored as a workspace draft", () => {
    if (!validCase(caseData)) throw new Error("Invalid test fixture");
    const message = aadiMessage({ case: caseData, result, traceId: "test-trace", createdAt: "2026-10-09T00:00:00Z" });
    const encounter = newEncounter();
    let state = workspaceReducer(initialWorkspace, { type: "encounter.add", encounter });
    state = workspaceReducer(state, { type: "message.add", encounterId: encounter.id, messages: [message] });
    const restored = loadWorkspace(JSON.stringify(state)).workspace.encounters.find(e => e.id === encounter.id)!.messages[0];
    expect(restored.reviewStatus).toBe("draft"); expect(restored.reviewItems?.every(i => !i.checked)).toBe(true);
    expect(JSON.parse(restored.sourceText!).case).toEqual(caseData); expect(JSON.parse(restored.sourceText!).result).toEqual(result);
    expect(restored.content).toContain("C92.0"); expect(restored.originalContent).toBe(restored.content);
  });
  it("rejects incomplete result rows and excessive case length", () => { expect(validCase({ ...caseData, results: [{ name: "", value: "" }] })).toBe(false); expect(validCase({ ...caseData, chiefComplaint: "x".repeat(24001) })).toBe(false); });
});
describe("server gateway", () => {
  it("accepts the public loopback Host when Next uses an internal localhost URL", async () => {
    const gateway = createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => Response.json(result) });
    const req = new Request("http://localhost:3105/api/aadi", { method: "POST", headers: { Host: "127.0.0.1:3105", Origin: "http://127.0.0.1:3105", "Content-Type": "application/json" }, body: JSON.stringify({ case: caseData }) });
    expect((await gateway.step(req)).status).toBe(200);
    const bad = new Request(request(), { headers: { Host: "external.test:3104", Origin: "http://external.test:3104" } }); expect((await gateway.step(bad)).status).toBe(403);
  });
  it("rejects non-local caller and non-local service configuration", async () => {
    let calls = 0; const gateway = createAadiGateway({ log: () => undefined, baseUrl: "http://external.test", token: "test", fetchFn: async () => { calls++; return Response.json(result); } });
    expect((await gateway.step(request())).status).toBe(503);
    const remote = new Request("http://external.test/api/aadi", { method: "POST", headers: { Origin: "http://external.test" }, body: JSON.stringify({ case: caseData }) });
    expect((await gateway.step(remote)).status).toBe(403); expect(calls).toBe(0);
  });
  it("rejects oversized bodies without invoking inference", async () => { let calls = 0; const gateway = createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => { calls++; return Response.json(result); } }); expect((await gateway.step(request({ case: caseData, junk: "x".repeat(33000) }))).status).toBe(400); expect(calls).toBe(0); });
  it("propagates cancellation to the service request", async () => {
    const abort = new AbortController(); let observed = false;
    const gateway = createAadiGateway({ log: () => undefined, token: "test", fetchFn: async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => { observed = true; reject(new Error("cancel")); }); }) });
    const req = new Request(request(), { signal: abort.signal }); const pending = gateway.step(req);
    await new Promise(resolve => setTimeout(resolve, 1)); abort.abort();
    expect((await pending).status).toBe(499); expect(observed).toBe(true);
  });
  it("checks health without inference or credentials", async () => { let called = ""; const gateway = createAadiGateway({ log: () => undefined, fetchFn: async (url) => { called = String(url); return Response.json({ status: "ok", contractVersion: "1" }); } }); const body = await (await gateway.health()).json(); expect(body.reachable).toBe(true); expect(body.configured).toBe(false); expect(called).toContain("/healthz"); });
  it("refuses missing token, hostile origin and PII without any network call", async () => { let calls = 0; const gateway = createAadiGateway({ log: () => undefined, fetchFn: async () => { calls++; return Response.json(result); } }); expect((await gateway.step(request())).status).toBe(503); expect((await gateway.step(request(undefined, "http://other.test"))).status).toBe(403); expect((await gateway.step(request({ case: { ...caseData, chiefComplaint: "nama: Test Person" } }))).status).toBe(400); expect(calls).toBe(0); });
  it("posts the case with server token and returns validated output", async () => { let sent: RequestInit | undefined; const gateway = createAadiGateway({ log: () => undefined, token: "test-server-token", fetchFn: async (_url, init) => { sent = init; return Response.json(result); } }); const response = await gateway.step(request()); expect(response.status).toBe(200); const body = await response.json(); expect(body.result.differential.cannotMiss[0].icd10).toBe("C92.0"); expect(body.traceId).toBeTruthy(); const headers = new Headers(sent?.headers); expect(headers.get("Authorization")).toBe("Bearer test-server-token"); expect(headers.has("X-AADI-Case-Origin")).toBe(false); expect(JSON.stringify(body)).not.toContain("test-server-token"); });
  it("rejects malformed input/response and sanitizes upstream failures", async () => { const bad = createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => Response.json({ token: "never-show" }) }); expect((await bad.step(request({ case: {} }))).status).toBe(400); expect((await bad.step(request({ case: caseData, synthetic: false }))).status).toBe(400); expect((await bad.step(request())).status).toBe(502); const fail = createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => new Response("secret-upstream", { status: 401 }) }); expect(JSON.stringify(await (await fail.step(request())).json())).not.toContain("secret-upstream"); });
  it("never names the internal engine in messages shown to the clinician", async () => {
    const message = async (gateway: ReturnType<typeof createAadiGateway>) => JSON.stringify(await (await gateway.step(request())).json());
    const texts = [
      await message(createAadiGateway({ log: () => undefined, fetchFn: async () => Response.json(result) })),
      await message(createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => { throw new Error("offline"); } })),
      await message(createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => new Response("down", { status: 503 }) })),
      await message(createAadiGateway({ log: () => undefined, token: "test", fetchFn: async () => Response.json({ contractVersion: "1" }) })),
      await message(createAadiGateway({ log: () => undefined, token: "test", timeoutMs: 5, fetchFn: async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))); }) })),
    ];
    for (const text of texts) expect(text).not.toMatch(/AADI/);
  });
  it("times out and holds a single active request", async () => { const gateway = createAadiGateway({ log: () => undefined, token: "test", timeoutMs: 10, fetchFn: async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))); }) }); const first = gateway.step(request()); await new Promise(resolve => setTimeout(resolve, 1)); expect((await gateway.step(request())).status).toBe(429); expect((await first).status).toBe(504); });
});
