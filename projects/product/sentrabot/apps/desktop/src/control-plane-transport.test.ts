import { describe, expect, it, vi } from "vitest";

describe("desktop Control Plane transport", () => {
  it("uses the authenticated desktop session and rejects non-success responses", async () => {
    const { ControlPlaneTransport } = await import("./control-plane-transport.js");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ executionEpoch: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("", { status: 403 }));
    const transport = new ControlPlaneTransport({
      baseUrl: "https://app.sentrabot.test",
      fetch,
    });

    await expect(
      transport.request({
        method: "POST",
        path: "/v1/runtime-leases/acquire",
        body: { runtimeId: "runtime-1" },
      }),
    ).resolves.toEqual({ executionEpoch: 2 });
    await expect(
      transport.request({ method: "POST", path: "/v1/runtimes/runtime-1/heartbeat" }),
    ).rejects.toThrow("Control Plane request failed: 403");
    expect(fetch).toHaveBeenCalledWith(
      "https://app.sentrabot.test/v1/runtime-leases/acquire",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
