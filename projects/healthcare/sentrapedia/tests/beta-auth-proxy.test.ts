import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import proxy from "../src/proxy";
const external = vi.hoisted(() => ({ initialize: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: () => external.initialize }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("SENTRAPEDIA_AUTH_MODE", "clerk"); vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SENTRAPEDIA_PUBLIC_ORIGIN", "https://beta.example.test");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", `pk_test_${Buffer.from("auth.example.test$").toString("base64")}`);
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture_not_a_real_key");
  external.initialize.mockReset();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const event = {} as NextFetchEvent;
describe("bounded identity initialization", () => {
  it("returns non-cacheable JSON unavailable when Clerk middleware never resolves", async () => {
    external.initialize.mockImplementation(() => new Promise(() => undefined));
    let response: Response | undefined;
    const pending = Promise.resolve(proxy(new NextRequest("https://beta.example.test/api/aadi", { method: "POST" }), event)).then(value => { response = value as Response; });
    await vi.advanceTimersByTimeAsync(5001);
    expect(response?.status).toBe(503);
    await pending;
    expect(response!.headers.get("cache-control")).toBe("no-store");
    expect(await response!.json()).toMatchObject({ status: "error", error: { code: "AUTH_UNAVAILABLE" } });
  });
  it("redacts middleware exceptions rather than returning a framework error body", async () => {
    external.initialize.mockRejectedValue(new Error("private provider details"));
    const response = await proxy(new NextRequest("https://beta.example.test/api/onboarding/consent", { method: "POST" }), event) as Response;
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private provider details");
  });
  it("retains the session-free readiness bypass during an identity outage", async () => {
    external.initialize.mockImplementation(() => new Promise(() => undefined));
    const response = await proxy(new NextRequest("https://beta.example.test/api/aadi"), event) as Response;
    expect(response.headers.get("x-middleware-next")).toBe("1"); expect(external.initialize).not.toHaveBeenCalled();
  });
});
