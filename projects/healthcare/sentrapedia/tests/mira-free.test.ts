import { describe, expect, it } from "vitest";
import { freeOpenRouterModel, freeServiceVersion } from "../src/lib/mira/free-profile";
import { createMiraGateway } from "../src/lib/mira/gateway";
import { emptyCase } from "../src/lib/mira/contract";

const version = (plan = freeOpenRouterModel, assess = freeOpenRouterModel, provider = "openrouter") => `mira-service/test+contract=1+provider=${provider}+data=synthetic-only+plan=${plan}+assess=${assess}+experimental`;
const input = () => new Request("http://127.0.0.1:3104/api/mira", { method: "POST", headers: { Origin: "http://127.0.0.1:3104", "Content-Type": "application/json" }, body: JSON.stringify({ case: { ...emptyCase(), chiefComplaint: "Kasus sintetis untuk uji" }, synthetic: true }) });
const response = { contractVersion: "1", status: "ok", differential: { likely: [], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: ["Input kurang"], nextBestActions: [], disposition: null, unfilled: [], meta: { version: version(), model: `${freeOpenRouterModel}+${freeOpenRouterModel}`, costUsd: 0 } };

describe("OpenRouter free-only MIRA profile", () => {
  it("requires both pinned free models, OpenRouter and synthetic-only policy", () => {
    expect(freeServiceVersion(version(), freeOpenRouterModel)).toBe(true);
    for (const v of [version("openai/gpt-4o"), version(freeOpenRouterModel, "openai/gpt-4o"), version(undefined, undefined, "openai"), version().replace("synthetic-only", "openrouter-zdr"), `${version()}+plan=openai/gpt-4o`, "unknown"]) expect(freeServiceVersion(v, freeOpenRouterModel)).toBe(false);
    expect(freeServiceVersion(version("openrouter/free", "openrouter/free"), "openrouter/free")).toBe(false);
  });
  it("reports reachable/configured separately from free-model readiness", async () => {
    const gateway = createMiraGateway({ freeModel: freeOpenRouterModel, fetchFn: async () => Response.json({ status: "ok", contractVersion: "1", version: version("paid/model") }) });
    expect(await (await gateway.health()).json()).toMatchObject({ reachable: true, configured: false, modelReady: false, model: freeOpenRouterModel, freeOnly: true });
  });
  it("never invokes inference if either stage is paid or the service version is unknown", async () => {
    for (const v of [version("paid/model"), version(freeOpenRouterModel, "paid/model"), "unknown"]) {
      const calls: string[] = []; const gateway = createMiraGateway({ token: "test-only-token", freeModel: freeOpenRouterModel, fetchFn: async url => { calls.push(String(url)); return Response.json({ status: "ok", contractVersion: "1", version: v }); } });
      expect((await gateway.step(input())).status).toBe(503); expect(calls).toHaveLength(1); expect(calls[0]).toContain("/healthz");
    }
  });
  it("accepts validated free output without forwarding a client model override", async () => {
    const calls: RequestInit[] = []; const gateway = createMiraGateway({ token: "test-only-token", freeModel: freeOpenRouterModel, fetchFn: async (url, init) => { calls.push(init!); return Response.json(String(url).endsWith("healthz") ? { status: "ok", contractVersion: "1", version: version() } : response); } });
    expect((await gateway.step(input())).status).toBe(200); expect(calls).toHaveLength(2); expect(new Headers(calls[1].headers).has("X-MIRA-Plan-Model")).toBe(false);
  });
  it("refuses nonzero or missing reported cost and inconsistent response models", async () => {
    for (const meta of [{ ...response.meta, costUsd: 0.1 }, { ...response.meta, costUsd: null }, { ...response.meta, model: "paid/model+paid/model" }, { ...response.meta, version: version("paid/model") }]) {
      const gateway = createMiraGateway({ token: "test-only-token", freeModel: freeOpenRouterModel, fetchFn: async url => Response.json(String(url).endsWith("healthz") ? { status: "ok", contractVersion: "1", version: version() } : { ...response, meta }) });
      const result = await gateway.step(input()); expect(result.status).toBe(502); expect(await result.json()).not.toHaveProperty("result");
    }
  });
});
