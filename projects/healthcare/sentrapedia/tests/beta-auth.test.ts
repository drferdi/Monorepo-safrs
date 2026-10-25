import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthConfig } from "../src/lib/auth/config";
import { createBetaAccess, accessFailure } from "../src/lib/auth/access";
import type { BetaUser } from "../src/lib/auth/policy";

// Synthetic key-shaped inputs only: these never authenticate against a provider.
const environment = { NODE_ENV: "test", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("auth.example.test$").toString("base64")}`, CLERK_SECRET_KEY: "sk_test_fixture_not_a_real_key" };
const consent = { version: "sentrapedia-beta-v2", acceptedAt: "2026-10-24T00:00:00.000Z" };
const user = (metadata: Record<string, unknown> = { sentrapediaBetaConsent: consent }): BetaUser => ({ id: "user_a", emailVerified: true, privateMetadata: metadata });
function setup(initial = user(), sessionId: string | null = "user_a") {
  let current = initial;
  const writes: unknown[] = [];
  const access = createBetaAccess({
    config: resolveAuthConfig(environment),
    session: async () => sessionId,
    user: async (id) => { if (id !== current.id) throw new Error("Wrong principal"); return current; },
    writeConsent: async (id, record) => { writes.push({ id, record }); current = { ...current, privateMetadata: { ...current.privateMetadata, sentrapediaBetaConsent: record } }; },
    now: () => new Date("2026-10-24T01:02:03.000Z"),
  });
  return { access, writes, current: () => current };
}
const request = (body: unknown = { version: "sentrapedia-beta-v2", accepted: true }, origin = "http://127.0.0.1:3101") => new Request("http://127.0.0.1:3101/api/onboarding/consent", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
afterEach(() => vi.useRealTimers());

describe("closed-beta configuration", () => {
  it("never turns absent keys into anonymous admission", () => {
    expect(resolveAuthConfig({})).toEqual({ mode: "unavailable" });
    expect(resolveAuthConfig({ ...environment, CLERK_SECRET_KEY: "" })).toEqual({ mode: "unavailable" });
    expect(resolveAuthConfig(environment).mode).toBe("clerk");
  });
  it("requires matching test/live key families and a production https origin", () => {
    expect(resolveAuthConfig({ ...environment, CLERK_SECRET_KEY: "sk_live_fixture_not_a_real_key" }).mode).toBe("unavailable");
    expect(resolveAuthConfig({ ...environment, NODE_ENV: "production" }).mode).toBe("unavailable");
    const live = { ...environment, NODE_ENV: "production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace("pk_test_", "pk_live_"), CLERK_SECRET_KEY: "sk_live_fixture_not_a_real_key" };
    for (const origin of [undefined, "http://beta.example.test", "https://beta.example.test/path", "https://user@beta.example.test", "https://beta.example.test?x=1"]) expect(resolveAuthConfig({ ...live, SENTRAPEDIA_PUBLIC_ORIGIN: origin }).mode).toBe("unavailable");
    expect(resolveAuthConfig({ ...live, SENTRAPEDIA_PUBLIC_ORIGIN: "https://beta.example.test" }).mode).toBe("clerk");
  });
  it("allows explicit local development only on loopback without a public origin", () => {
    const local = { NODE_ENV: "development", SENTRAPEDIA_AUTH_MODE: "local", SENTRAPEDIA_HOST: "127.0.0.1" };
    expect(resolveAuthConfig(local)).toEqual({ mode: "local", userId: "local-development" });
    for (const change of [{ NODE_ENV: "production" }, { SENTRAPEDIA_PUBLIC_ORIGIN: "https://beta.example.test" }, { SENTRAPEDIA_HOST: "0.0.0.0" }, { SENTRAPEDIA_HOST: "evil.test" }]) expect(resolveAuthConfig({ ...local, ...change }).mode).toBe("unavailable");
    expect(resolveAuthConfig({ ...environment, SENTRAPEDIA_AUTH_MODE: "unknown" }).mode).toBe("unavailable");
  });
});

describe("server-owned access decisions", () => {
  it("admits only the verified session principal with current consent", async () => {
    expect(await setup().access.resolve()).toEqual({ status: "allowed", userId: "user_a" });
    expect(await setup(user(), null).access.resolve()).toEqual({ status: "signed-out" });
    expect(await setup({ ...user(), emailVerified: false }).access.resolve()).toEqual({ status: "disabled" });
    expect(await setup(user(), "user_b").access.resolve()).toEqual({ status: "unavailable" });
  });
  it("keeps explicit legacy consent inspection without blocking normal user access", async () => {
    for (const value of [undefined, null, false, {}, { ...consent, version: "old" }, { ...consent, acceptedAt: "invalid" }]) {
      const { access } = setup(user({ sentrapediaBetaConsent: value }));
      expect(await access.resolve(true)).toEqual({ status: "consent-required" });
      expect(await access.resolve()).toEqual({ status: "allowed", userId: "user_a" });
    }
  });
  it("a disabled or malformed suspension flag cannot be bypassed by onboarding", async () => {
    for (const value of [null, false, {}, { disabled: true }, { disabled: "false" }]) {
      const { access, writes } = setup(user({ sentrapediaBetaConsent: consent, sentrapediaBetaAccess: value }));
      expect(await access.resolve(false)).toEqual({ status: "disabled" });
      expect((await access.consent(request())).status).toBe(403);
      expect(writes).toEqual([]);
    }
    expect((await setup(user({ sentrapediaBetaConsent: consent, sentrapediaBetaAccess: { disabled: false } })).access.resolve()).status).toBe("allowed");
  });
  it("ignores client-editable metadata as an approval or consent source", async () => {
    const profile = { ...user({}), unsafeMetadata: { approved: true, sentrapediaBetaConsent: consent }, publicMetadata: { sentrapediaBetaConsent: consent } };
    expect(await setup(profile).access.resolve(true)).toEqual({ status: "consent-required" });
  });
  it("fails closed when the provider returns a different user or fails", async () => {
    const config = resolveAuthConfig(environment);
    const make = (lookup: () => Promise<BetaUser>) => createBetaAccess({ config, session: async () => "user_a", user: lookup, writeConsent: async () => undefined });
    expect(await make(async () => ({ ...user(), id: "user_b" })).resolve()).toEqual({ status: "unavailable" });
    expect(await make(async () => { throw new Error("private provider response"); }).resolve()).toEqual({ status: "unavailable" });
  });
  it("bounds a hung session or user lookup to five seconds", async () => {
    vi.useFakeTimers();
    const never = () => new Promise<never>(() => undefined);
    for (const sessionHangs of [true, false]) {
      const access = createBetaAccess({ config: resolveAuthConfig(environment), session: sessionHangs ? never : async () => "user_a", user: never, writeConsent: async () => undefined });
      const pending = access.resolve();
      await vi.advanceTimersByTimeAsync(5001);
      expect(await pending).toEqual({ status: "unavailable" });
    }
  });
  it("unconfigured mode does not even query a provider", async () => {
    let calls = 0;
    const access = createBetaAccess({ config: resolveAuthConfig({}), session: async () => { calls++; return "user_a"; }, user: async () => user(), writeConsent: async () => undefined });
    expect(await access.resolve()).toEqual({ status: "unavailable" });
    expect(calls).toBe(0);
    expect((await access.consent(request())).status).toBe(503);
  });
});

describe("consent mutation", () => {
  it("rejects delayed trailing bytes and handles rejected cancellation without writing", async () => {
    const { access, writes } = setup(user({}));
    const prefix = JSON.stringify({ version: "sentrapedia-beta-v2", accepted: true });
    const encoder = new TextEncoder();
    const streams = [
      new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(prefix)); queueMicrotask(() => { controller.enqueue(encoder.encode("trailing-invalid")); controller.close(); }); } }),
      new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1025)); }, cancel() { return Promise.reject(new Error("private cancellation details")); } }),
    ];
    for (const stream of streams) {
      const incoming = new Request("http://127.0.0.1:3101/api/onboarding/consent", { method: "POST", headers: { Origin: "http://127.0.0.1:3101", "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
      expect((await access.consent(incoming)).status).toBe(400);
    }
    expect(writes).toEqual([]);
  });
  it("rejects oversized input without waiting for an uncooperative stream cancellation", async () => {
    vi.useFakeTimers();
    const { access, writes } = setup(user({}));
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1025)); }, cancel() { return new Promise(() => undefined); } });
    const incoming = new Request("http://127.0.0.1:3101/api/onboarding/consent", { method: "POST", headers: { Origin: "http://127.0.0.1:3101", "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    let response: Response | undefined;
    const pending = access.consent(incoming).then(value => { response = value; });
    await vi.advanceTimersByTimeAsync(5001);
    expect(response?.status).toBe(400); await pending; expect(writes).toEqual([]);
  });
  it("rejects a timed-out stream even when its unterminated prefix is valid acceptance JSON", async () => {
    vi.useFakeTimers();
    const { access, writes } = setup(user({}));
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify({ version: "sentrapedia-beta-v2", accepted: true }))); } });
    const incoming = new Request("http://127.0.0.1:3101/api/onboarding/consent", { method: "POST", headers: { Origin: "http://127.0.0.1:3101", "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    const pending = access.consent(incoming);
    await vi.advanceTimersByTimeAsync(5001);
    expect((await pending).status).toBe(400); expect(writes).toEqual([]);
  });
  it("records only the authenticated user's server-stamped consent and retains unrelated metadata", async () => {
    const { access, current, writes } = setup(user({ unrelated: { keep: true }, sentrapediaBetaAccess: { disabled: false } }));
    expect((await access.resolve(true)).status).toBe("consent-required");
    const response = await access.consent(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
    expect(writes).toEqual([{ id: "user_a", record: { version: "sentrapedia-beta-v2", acceptedAt: "2026-10-24T01:02:03.000Z" } }]);
    expect(current().privateMetadata.unrelated).toEqual({ keep: true });
    expect(current().privateMetadata.sentrapediaBetaAccess).toEqual({ disabled: false });
    expect((await access.resolve()).status).toBe("allowed");
  });
  it("rejects forged subjects, missing acknowledgement and stale policy without writing", async () => {
    const { access, writes } = setup(user({}));
    for (const value of [{}, { version: "sentrapedia-beta-v2", accepted: false }, { version: "old", accepted: true }, { version: "sentrapedia-beta-v2", accepted: true, userId: "user_b" }, { version: "sentrapedia-beta-v2", accepted: true, acceptedAt: "2026-10-24T01:02:03.000Z" }]) expect((await access.consent(request(value))).status).toBe(400);
    expect(writes).toEqual([]);
  });
  it("requires exact trusted origin, not a forwarded-host assertion", async () => {
    const { access, writes } = setup(user({}));
    for (const origin of ["https://evil.test", "null", "http://127.0.0.1:9999", "http://127.0.0.1:3101/"]) {
      const incoming = request(undefined, origin);
      incoming.headers.set("x-forwarded-host", "127.0.0.1:3101");
      expect((await access.consent(incoming)).status).toBe(403);
    }
    const noOrigin = request(); noOrigin.headers.delete("origin");
    expect((await access.consent(noOrigin)).status).toBe(403);
    expect(writes).toEqual([]);
  });
  it("admits the explicitly configured tunnel origin while rejecting a forged public host", async () => {
    const access = createBetaAccess({ config: resolveAuthConfig({ ...environment, SENTRAPEDIA_PUBLIC_ORIGIN: "https://beta.example.test" }), session: async () => "user_a", user: async () => user({}), writeConsent: async () => undefined });
    expect((await access.consent(request(undefined, "https://beta.example.test"))).status).toBe(200);
    expect((await access.consent(request(undefined, "https://evil.test"))).status).toBe(403);
  });
  it("refuses oversized, malformed and wrong-content-type bodies", async () => {
    const { access, writes } = setup(user({}));
    expect((await access.consent(request({ text: "x".repeat(1025) }))).status).toBe(400);
    for (const [body, type] of [["{broken", "application/json"], ["{}", "text/plain"]]) {
      const incoming = new Request("http://127.0.0.1:3101/api/onboarding/consent", { method: "POST", headers: { Origin: "http://127.0.0.1:3101", "Content-Type": type }, body });
      expect((await access.consent(incoming)).status).toBe(400);
    }
    expect(writes).toEqual([]);
  });
  it("a provider write failure never reports acceptance", async () => {
    const access = createBetaAccess({ config: resolveAuthConfig(environment), session: async () => "user_a", user: async () => user({}), writeConsent: async () => { throw new Error("sensitive details"); } });
    const response = await access.consent(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("sensitive details");
  });
  it("maps denials to bounded non-cacheable AADI-compatible JSON", async () => {
    for (const [status, code] of [["signed-out", 401], ["disabled", 403], ["consent-required", 403], ["unavailable", 503]] as const) {
      const response = accessFailure({ status });
      expect(response.status).toBe(code);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toMatchObject({ status: "error", error: { code: expect.any(String), message: expect.any(String) } });
    }
  });
});
