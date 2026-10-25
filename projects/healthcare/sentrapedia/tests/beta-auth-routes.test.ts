import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBetaAccess } from "../src/lib/auth/access";
import { resolveAuthConfig } from "../src/lib/auth/config";
import { GET, POST } from "../src/app/api/aadi/route";

const state = vi.hoisted(() => ({ session: null as string | null, metadata: {} as Record<string, unknown>, steps: [] as Request[], identityReads: 0, unavailable: false, failLookup: false }));
const fixtureConfig = () => resolveAuthConfig({ NODE_ENV: "test", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("auth.example.test$").toString("base64")}`, CLERK_SECRET_KEY: "sk_test_fixture_not_a_real_key" });
vi.mock("../src/lib/auth/server", () => ({ getBetaAccess: () => createBetaAccess({
  config: state.unavailable ? { mode: "unavailable" } : fixtureConfig(),
  session: async () => { state.identityReads++; return state.session; },
  user: async (id) => { if (state.failLookup) throw new Error("Private provider error"); return { id, emailVerified: true, privateMetadata: state.metadata }; },
  writeConsent: async (_id, consent) => { state.metadata = { ...state.metadata, sentrapediaBetaConsent: consent }; },
}) }));
vi.mock("../src/lib/aadi/gateway", () => ({ createAadiGateway: () => ({
  health: async () => Response.json({ reachable: true, modelReady: true, groundingReady: true, configured: true, model: "mock", maxCostUsd: 0 }),
  step: async (request: Request) => { state.steps.push(request); return Response.json({ status: "ok", marker: "analysis-boundary" }); },
}) }));
vi.mock("../src/lib/theoracle-grounding", () => ({ retrieveTheOracleGrounding: async () => undefined, retrieveTheOracleTherapyGrounding: async () => undefined, warmTheOracleGrounding: async () => undefined }));

const incoming = () => new Request("http://127.0.0.1:3101/api/aadi", { method: "POST", headers: { Origin: "http://127.0.0.1:3101", "Content-Type": "application/json" }, body: JSON.stringify({ case: "fixture" }) });
const accepted = { version: "sentrapedia-beta-v2", acceptedAt: "2026-10-24T00:00:00.000Z" };
beforeEach(() => { state.session = null; state.metadata = {}; state.steps = []; state.identityReads = 0; state.unavailable = false; state.failLookup = false; });

describe("analysis route authorization", () => {
  it("rejects a signed-out direct POST before any gateway work", async () => {
    const response = await POST(incoming());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ status: "error", error: { code: "AUTH_REQUIRED" } });
    expect(state.steps).toEqual([]);
  });
  it("admits verified users without extra consent but rejects disabled accounts", async () => {
    state.session = "user_a";
    expect((await POST(incoming())).status).toBe(200);
    state.steps = [];
    state.metadata = { sentrapediaBetaConsent: accepted, sentrapediaBetaAccess: { disabled: true } };
    expect((await POST(incoming())).status).toBe(403);
    expect(state.steps).toEqual([]);
  });
  it("forwards an authorized request unmodified to the existing gateway", async () => {
    state.session = "user_a"; state.metadata = { sentrapediaBetaConsent: accepted };
    const request = incoming(); const response = await POST(request);
    expect(response.status).toBe(200);
    expect(state.steps).toEqual([request]);
    expect(await state.steps[0].json()).toEqual({ case: "fixture" });
  });
  it("returns a generic unavailable error, never clinical work, when identity is unavailable", async () => {
    state.unavailable = true;
    expect((await POST(incoming())).status).toBe(503);
    state.unavailable = false; state.session = "user_a"; state.failLookup = true;
    const response = await POST(incoming());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Private provider error");
    expect(state.steps).toEqual([]);
  });
  it("keeps readiness available without an identity session or analysis call", async () => {
    state.unavailable = true;
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reachable: true, configured: true });
    expect(state.identityReads).toBe(0);
    expect(state.steps).toEqual([]);
  });
  it("the onboarding route retains body/origin validation and cannot accept a forged subject", async () => {
    const { POST: consentPost } = await import("../src/app/api/onboarding/consent/route");
    state.session = "user_a";
    const body = { version: "sentrapedia-beta-v2", accepted: true, userId: "user_b" };
    const request = new Request("http://127.0.0.1:3101/api/onboarding/consent", { method: "POST", headers: { Origin: "http://127.0.0.1:3101", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await consentPost(request)).status).toBe(400);
    expect(state.metadata).toEqual({});
  });
});
