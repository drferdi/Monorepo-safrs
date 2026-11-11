import { describe, expect, it, vi } from "vitest";

describe("desktop runtime lease", () => {
  it("fails closed when renewing the execution lease fails", async () => {
    const { DesktopRuntimeLease } = await import("./runtime-lease.js");
    const transport = {
      request: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ executionEpoch: 1, leaseExpiresAt: "2026-09-01T00:01:00.000Z" })
        .mockRejectedValueOnce(new Error("lease rejected")),
    };
    const runtime = new DesktopRuntimeLease({
      apiUrl: "https://api.example.test",
      deviceId: "device-1",
      runtimeId: "runtime-1",
      workspaceId: "workspace-1",
      publicKey: "public-key",
      transport,
    });

    await runtime.start();
    expect(runtime.canExecute()).toBe(true);
    await runtime.renew();

    expect(runtime.canExecute()).toBe(false);
    expect(runtime.state()).toEqual({ kind: "offline", reason: "lease rejected" });
  });
});
