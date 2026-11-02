import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/webhooks/clerk/route";

const state = vi.hoisted(() => ({ event: null as null | { type: string; data: Record<string, unknown> }, verifyError: false, configured: true, purged: [] as string[], purgeFails: false }));
vi.mock("@clerk/backend/webhooks", () => ({ verifyWebhook: async () => { if (state.verifyError || !state.event) throw new Error("No matching signature found"); return state.event; } }));
vi.mock("../src/lib/sync/db", () => ({ syncConfigured: () => state.configured }));
vi.mock("../src/lib/sync/store", () => ({ purgePrincipal: async (id: string) => { if (state.purgeFails) throw new Error("connection refused"); state.purged.push(id); return 1; } }));

const incoming = (body = "{}") => new Request("https://beta.example.test/api/webhooks/clerk", { method: "POST", headers: { "content-type": "application/json", "content-length": String(body.length), "svix-id": "msg_1", "svix-timestamp": "1", "svix-signature": "v1,fixture" }, body });
beforeEach(() => { vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "whsec_fixture_not_a_real_secret"); state.event = null; state.verifyError = false; state.configured = true; state.purged = []; state.purgeFails = false; });
afterEach(() => vi.unstubAllEnvs());

describe("clerk webhook", () => {
  it("answers unavailable, without reading the body, when no signing secret is configured", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
    state.event = { type: "user.deleted", data: { id: "user_a", deleted: true } };
    const response = await POST(incoming());
    expect(response.status).toBe(503);
    expect(state.purged).toEqual([]);
  });
  it("rejects a request whose signature does not verify, and never purges on it", async () => {
    state.verifyError = true;
    const response = await POST(incoming());
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("No matching signature");
    expect(state.purged).toEqual([]);
  });
  it("refuses an oversized payload before verification", async () => {
    const request = new Request("https://beta.example.test/api/webhooks/clerk", { method: "POST", headers: { "content-length": "70000" }, body: "{}" });
    expect((await POST(request)).status).toBe(413);
  });
  it("purges the deleted user's rows and reports the count", async () => {
    state.event = { type: "user.deleted", data: { id: "user_a", deleted: true } };
    const response = await POST(incoming());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", handled: true, purged: 1 });
    expect(state.purged).toEqual(["user_a"]);
  });
  it("acknowledges other events and malformed ids without touching the database", async () => {
    state.event = { type: "user.created", data: { id: "user_a" } };
    expect(await (await POST(incoming())).json()).toEqual({ status: "ok", handled: false });
    state.event = { type: "user.deleted", data: { id: "'; drop table profile; --", deleted: true } };
    expect((await POST(incoming())).status).toBe(400);
    expect(state.purged).toEqual([]);
  });
  it("acknowledges a deletion on an instance without sync, and asks for a retry when the purge fails", async () => {
    state.event = { type: "user.deleted", data: { id: "user_a", deleted: true } };
    state.configured = false;
    expect(await (await POST(incoming())).json()).toEqual({ status: "ok", handled: true, purged: 0 });
    state.configured = true; state.purgeFails = true;
    const response = await POST(incoming());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("connection refused");
  });
});
