import { describe, expect, it, vi } from "vitest";

describe("ciphertext relay", () => {
  it("rejects a command when its target runtime is offline", async () => {
    const { createRelayRoutes } = await import("./relay-routes.js");
    const publish = vi.fn();
    const app = createRelayRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      isTrustedRuntime: async () => true,
      canDeliver: async () => false,
      publish,
      subscribe: async () => async () => {},
    });
    const response = await app.request("/v1/relay/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        envelopeId: "envelope-1",
        workspaceId: "workspace-1",
        runtimeId: "runtime-1",
        executionEpoch: 1,
        senderDeviceId: "device-1",
        sequence: 1,
        ciphertext: "opaque-ciphertext",
        signature: "signature",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    });
    expect(response.status).toBe(409);
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not open a ciphertext event stream for an untrusted runtime", async () => {
    const { createRelayRoutes } = await import("./relay-routes.js");
    const subscribe = vi.fn();
    const app = createRelayRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      isTrustedRuntime: async () => false,
      canDeliver: async () => true,
      publish: vi.fn(),
      subscribe,
    });

    const response = await app.request("/v1/relay/events?deviceId=device-1&runtimeId=runtime-1");

    expect(response.status).toBe(403);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("streams the ciphertext envelope unchanged to its trusted runtime", async () => {
    const { createRelayRoutes } = await import("./relay-routes.js");
    const payload = JSON.stringify({
      envelopeId: "envelope-3",
      workspaceId: "workspace-1",
      runtimeId: "runtime-1",
      executionEpoch: 1,
      senderDeviceId: "device-1",
      sequence: 3,
      ciphertext: "opaque-ciphertext",
      signature: "signature",
      createdAt: "2026-09-02T00:00:00.000Z",
      expiresAt: "2026-09-02T00:01:00.000Z",
    });
    const app = createRelayRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      isTrustedRuntime: async () => true,
      canDeliver: async () => true,
      publish: vi.fn(),
      subscribe: async (_topic, onMessage) => {
        onMessage(payload);
        return async () => {};
      },
    });

    const response = await app.request("/v1/relay/events?deviceId=device-1&runtimeId=runtime-1");
    const reader = response.body!.getReader();
    const first = await reader.read();
    await reader.cancel();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(new TextDecoder().decode(first.value)).toContain(`data: ${payload}`);
  });

  it("rejects a relay that exceeds the live transport payload limit", async () => {
    const { createRelayRoutes } = await import("./relay-routes.js");
    const publish = vi.fn();
    const app = createRelayRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      isTrustedRuntime: async () => true,
      canDeliver: async () => true,
      publish,
      subscribe: async () => async () => {},
    });

    const response = await app.request("/v1/relay/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        envelopeId: "envelope-2",
        workspaceId: "workspace-1",
        runtimeId: "runtime-1",
        executionEpoch: 1,
        senderDeviceId: "device-1",
        sequence: 2,
        ciphertext: "x".repeat(8_000),
        signature: "signature",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    });

    expect(response.status).toBe(413);
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects an expired relay instead of delivering a stale command", async () => {
    const { createRelayRoutes } = await import("./relay-routes.js");
    const publish = vi.fn();
    const app = createRelayRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      isTrustedRuntime: async () => true,
      canDeliver: async () => true,
      publish,
      subscribe: async () => async () => {},
    });

    const response = await app.request("/v1/relay/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        envelopeId: "envelope-expired",
        workspaceId: "workspace-1",
        runtimeId: "runtime-1",
        executionEpoch: 1,
        senderDeviceId: "device-1",
        sequence: 1,
        ciphertext: "opaque-ciphertext",
        signature: "signature",
        createdAt: new Date(Date.now() - 120_000).toISOString(),
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    });

    expect(response.status).toBe(410);
    expect(publish).not.toHaveBeenCalled();
  });
});
