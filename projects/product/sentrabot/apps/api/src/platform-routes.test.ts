import { describe, expect, it, vi } from "vitest";

describe("platform control-plane routes", () => {
  it("returns only the authenticated Control Plane identity", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
    } as any);

    const response = await app.request("/v1/control-plane/identity");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ workspaceId: "workspace-1" });
  });

  it("does not mark legacy state E2EE-ready from an untrusted runtime", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const acknowledgeE2eeMigration = vi.fn();
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedRuntime: async () => false,
      acknowledgeE2eeMigration,
    } as any);

    const response = await app.request("/v1/workspaces/privacy/e2ee-ready", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-1", runtimeId: "runtime-1", executionEpoch: 1 }),
    });

    expect(response.status).toBe(403);
    expect(acknowledgeE2eeMigration).not.toHaveBeenCalled();
  });

  it("does not mark legacy state E2EE-ready from a runtime without execution authority", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const acknowledgeE2eeMigration = vi.fn();
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedRuntime: async () => true,
      canAcknowledgeE2eeMigration: async () => false,
      acknowledgeE2eeMigration,
    } as any);

    const response = await app.request("/v1/workspaces/privacy/e2ee-ready", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-1", runtimeId: "runtime-1", executionEpoch: 1 }),
    });

    expect(response.status).toBe(409);
    expect(acknowledgeE2eeMigration).not.toHaveBeenCalled();
  });

  it("exports legacy private state only to a runtime holding the current epoch", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const exportLegacyPrivateState = vi
      .fn()
      .mockResolvedValue([
        { objectId: "legacy:bot:bot-1", objectType: "bot", version: 1, plaintext: "private" },
      ]);
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedRuntime: async () => true,
      canAcknowledgeE2eeMigration: async () => true,
      exportLegacyPrivateState,
    } as any);

    const response = await app.request("/v1/workspaces/privacy/legacy-export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-1", runtimeId: "runtime-1", executionEpoch: 1 }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ objects: expect.any(Array) });
    expect(exportLegacyPrivateState).toHaveBeenCalledWith({
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("allows a trusted device to publish an opaque key envelope for another trusted device", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const published: unknown[] = [];
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async () => undefined,
      revokeDevice: async () => undefined,
      registerRuntime: async () => undefined,
      isTrustedRuntime: async () => true,
      publishKeyEnvelope: async (input) => {
        published.push(input);
      },
      listKeyEnvelopes: async () => [],
      putSyncObject: async () => undefined,
      listSyncObjects: async () => [],
      deleteSyncObject: async () => undefined,
      acquireRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 1,
        leaseExpiresAt: "2026-09-02T00:01:00.000Z",
      }),
      renewRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 1,
        leaseExpiresAt: "2026-09-02T00:01:00.000Z",
      }),
      releaseRuntimeLease: async () => undefined,
      heartbeatRuntime: async () => undefined,
    });

    const response = await app.request("/v1/key-envelopes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        senderDeviceId: "device-1",
        recipientDeviceId: "device-2",
        version: 1,
        ciphertext: "ciphertext",
      }),
    });

    expect(response.status).toBe(204);
    expect(published).toHaveLength(1);
  });

  it("lists only the authenticated account's active device public keys for pairing", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const listDevices = vi
      .fn()
      .mockResolvedValue([{ deviceId: "device-1", publicKey: "public-key-1" }]);
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      listDevices,
    } as any);

    const response = await app.request("/v1/devices");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      devices: [{ deviceId: "device-1", publicKey: "public-key-1" }],
    });
    expect(listDevices).toHaveBeenCalledWith({ userId: "user-1", workspaceId: "workspace-1" });
  });

  it("returns only the authenticated workspace's runtime liveness", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const runtimeStatus = vi.fn().mockResolvedValue({ online: true });
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      runtimeStatus,
    } as any);

    const response = await app.request("/v1/runtimes/status");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ online: true });
    expect(runtimeStatus).toHaveBeenCalledWith({ userId: "user-1", workspaceId: "workspace-1" });
  });

  it("registers a device only for the authenticated account workspace", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const registrations: Array<{
      actor: { userId: string; workspaceId: string };
      deviceId: string;
    }> = [];
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async (input) => {
        registrations.push(input);
      },
      registerRuntime: async () => undefined,
      isTrustedRuntime: async () => true,
      putSyncObject: async () => undefined,
      acquireRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 1,
        leaseExpiresAt: "2026-09-01T00:01:00.000Z",
      }),
    });

    const response = await app.request("/v1/devices/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-1", publicKey: "public-key" }),
    });

    expect(response.status).toBe(204);
    expect(registrations).toEqual([
      {
        actor: { userId: "user-1", workspaceId: "workspace-1" },
        deviceId: "device-1",
        publicKey: "public-key",
      },
    ]);
  });

  it("does not acquire a lease until the runtime is registered to the trusted device", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const registrations: Array<{ deviceId: string; runtimeId: string }> = [];
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async () => undefined,
      registerRuntime: async (input) => {
        registrations.push(input);
      },
      isTrustedRuntime: async () => false,
      putSyncObject: async () => undefined,
      acquireRuntimeLease: async () => {
        throw new Error("unregistered runtime must not acquire a lease");
      },
    });

    const registration = await app.request("/v1/runtimes/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-1", runtimeId: "runtime-1" }),
    });

    expect(registration.status).toBe(204);
    expect(registrations).toEqual([
      {
        actor: { userId: "user-1", workspaceId: "workspace-1" },
        deviceId: "device-1",
        runtimeId: "runtime-1",
      },
    ]);
  });

  it("rejects a lease request outside the authenticated workspace", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const acquireRuntimeLease = async () => {
      throw new Error("must not acquire a lease outside the actor workspace");
    };
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async () => undefined,
      registerRuntime: async () => undefined,
      isTrustedRuntime: async () => true,
      putSyncObject: async () => undefined,
      acquireRuntimeLease,
    });

    const response = await app.request("/v1/runtime-leases/acquire", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: "device-1",
        workspaceId: "workspace-2",
        runtimeId: "runtime-1",
      }),
    });

    expect(response.status).toBe(403);
  });

  it("rejects semantic sync object types before persisting metadata", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async () => undefined,
      registerRuntime: async () => undefined,
      isTrustedRuntime: async () => true,
      putSyncObject: async () => undefined,
      acquireRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 1,
        leaseExpiresAt: "2026-09-01T00:01:00.000Z",
      }),
    });

    const response = await app.request("/v1/sync/objects/object-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: "device-1",
        objectType: "payroll",
        version: 1,
        ciphertext: "abc",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("returns the durable epoch when a trusted runtime acquires a lease", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async () => undefined,
      registerRuntime: async () => undefined,
      isTrustedRuntime: async () => true,
      putSyncObject: async () => undefined,
      acquireRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 2,
        leaseExpiresAt: "2026-09-01T00:01:00.000Z",
      }),
    });

    const response = await app.request("/v1/runtime-leases/acquire", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: "device-1",
        workspaceId: "workspace-1",
        runtimeId: "runtime-1",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ executionEpoch: 2 });
  });

  it("renews only the current runtime lease", async () => {
    const { createPlatformRoutes } = await import("./platform-routes.js");
    const app = createPlatformRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedDevice: async () => true,
      registerDevice: async () => undefined,
      registerRuntime: async () => undefined,
      isTrustedRuntime: async () => true,
      putSyncObject: async () => undefined,
      acquireRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 1,
        leaseExpiresAt: "2026-09-01T00:01:00.000Z",
      }),
      renewRuntimeLease: async () => ({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 1,
        leaseExpiresAt: "2026-09-01T00:02:00.000Z",
      }),
      releaseRuntimeLease: async () => undefined,
      heartbeatRuntime: async () => undefined,
    });

    const response = await app.request("/v1/runtime-leases/renew", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: "device-1",
        workspaceId: "workspace-1",
        runtimeId: "runtime-1",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ executionEpoch: 1 });
  });
});
