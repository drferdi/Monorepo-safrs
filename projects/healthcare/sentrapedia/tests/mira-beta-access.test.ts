import { describe, expect, it } from "vitest";
import { createMiraGateway } from "../src/lib/mira/gateway";
import type { MiraResult } from "../src/lib/mira/contract";

// Closed beta (Gaffer, 2026-10-19): the workspace runs behind Cloudflare Tunnel and Access at one public https origin,
// and 10-20 invited clinicians may analyse at the same time. Without these options the gateway keeps its local-only,
// one-analysis-at-a-time behaviour.
const caseData = { demographics: { ageYears: 30, sex: "unknown" }, chiefComplaint: "Keluhan fiktif untuk uji beta", anamnesis: { freeText: "Contoh sintetis" }, vitals: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [], allergies: [], facilityCapabilities: [] };
const result: MiraResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Nama keluaran uji", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test-only", model: "mock", costUsd: 0 } };
const body = () => JSON.stringify({ case: caseData, synthetic: true });
const BETA = "https://beta.sentrapedia.com";
const post = (url: string, headers: Record<string, string>) => new Request(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: body() });
const local = () => post("http://localhost:3104/api/mira", { Origin: "http://localhost:3104" });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe("beta public origin", () => {
  it("accepts the configured https origin whether Next sees the public or the internal URL", async () => {
    const gateway = createMiraGateway({ log: () => undefined, token: "test", publicOrigin: BETA, fetchFn: async () => Response.json(result) });
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "beta.sentrapedia.com", Origin: BETA }))).status).toBe(200);
    expect((await gateway.step(post(`${BETA}/api/mira`, { Host: "beta.sentrapedia.com", Origin: BETA }))).status).toBe(200);
    // A tunnel that rewrites Host to the local service still carries the browser's Origin.
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "localhost:3000", Origin: BETA }))).status).toBe(200);
  });
  it("keeps the local workspace working when a public origin is configured", async () => {
    const gateway = createMiraGateway({ log: () => undefined, token: "test", publicOrigin: BETA, fetchFn: async () => Response.json(result) });
    expect((await gateway.step(local())).status).toBe(200);
  });
  it("refuses the public origin when none is configured", async () => {
    let calls = 0; const gateway = createMiraGateway({ log: () => undefined, token: "test", fetchFn: async () => { calls++; return Response.json(result); } });
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "beta.sentrapedia.com", Origin: BETA }))).status).toBe(403);
    expect(calls).toBe(0);
  });
  it("refuses other origins and other hosts without any network call", async () => {
    let calls = 0; const gateway = createMiraGateway({ log: () => undefined, token: "test", publicOrigin: BETA, fetchFn: async () => { calls++; return Response.json(result); } });
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "beta.sentrapedia.com", Origin: "https://evil.test" }))).status).toBe(403);
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "evil.test", Origin: BETA }))).status).toBe(403);
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "beta.sentrapedia.com" }))).status).toBe(403);
    expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "beta.sentrapedia.com", Origin: "http://beta.sentrapedia.com" }))).status).toBe(403);
    expect(calls).toBe(0);
  });
  it("ignores a public origin that is not a bare https origin", async () => {
    for (const publicOrigin of ["http://beta.sentrapedia.com", "https://beta.sentrapedia.com/app", "https://user@beta.sentrapedia.com", "not a url", ""]) {
      const gateway = createMiraGateway({ log: () => undefined, token: "test", publicOrigin, fetchFn: async () => Response.json(result) });
      expect((await gateway.step(post("http://localhost:3000/api/mira", { Host: "beta.sentrapedia.com", Origin: publicOrigin || BETA }))).status).toBe(403);
    }
  });
});

describe("beta concurrency", () => {
  function hanging() {
    const releases: (() => void)[] = [];
    const fetchFn = (async () => { await new Promise<void>(resolve => releases.push(resolve)); return Response.json(result); }) as typeof fetch;
    return { fetchFn, releases };
  }
  it("runs one analysis at a time by default", async () => {
    const { fetchFn, releases } = hanging(); const gateway = createMiraGateway({ log: () => undefined, token: "test", fetchFn });
    const first = gateway.step(local()); await tick();
    const second = await gateway.step(local()); expect(second.status).toBe(429); expect((await second.json()).error.code).toBe("BUSY");
    releases.forEach(release => release()); expect((await first).status).toBe(200);
  });
  it("runs up to maxConcurrent analyses together and frees a slot when one ends", async () => {
    const { fetchFn, releases } = hanging(); const gateway = createMiraGateway({ log: () => undefined, token: "test", maxConcurrent: 2, fetchFn });
    const first = gateway.step(local()); const second = gateway.step(local()); await tick();
    expect(releases).toHaveLength(2);
    expect((await gateway.step(local())).status).toBe(429);
    releases[0](); expect((await first).status).toBe(200);
    const third = gateway.step(local()); await tick(); expect(releases).toHaveLength(3);
    releases[1](); releases[2](); expect((await second).status).toBe(200); expect((await third).status).toBe(200);
  });
  it("frees the slot when an analysis fails", async () => {
    let calls = 0; const gateway = createMiraGateway({ log: () => undefined, token: "test", maxConcurrent: 1, fetchFn: async () => { calls++; throw new Error("down"); } });
    expect((await gateway.step(local())).status).toBe(502);
    expect((await gateway.step(local())).status).toBe(502);
    expect(calls).toBe(2);
  });
  it("falls back to one for an invalid maxConcurrent", async () => {
    for (const maxConcurrent of [0, -1, 2.5, Number.NaN, 99]) {
      const { fetchFn, releases } = hanging(); const gateway = createMiraGateway({ log: () => undefined, token: "test", maxConcurrent, fetchFn });
      const first = gateway.step(local()); await tick();
      expect((await gateway.step(local())).status).toBe(429);
      releases.forEach(release => release()); await first;
    }
  });
});
