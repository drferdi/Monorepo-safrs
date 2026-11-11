import { describe, expect, it, vi } from "vitest";

describe("legacy E2EE migration", () => {
  it("encrypts every legacy object locally before acknowledging migration", async () => {
    const { migrateLegacyStateToE2ee } = await import("./e2ee-migration.js");
    const request = vi.fn().mockImplementation(async (input) => {
      if (input.path === "/v1/workspaces/privacy/legacy-export") {
        return {
          objects: [
            {
              objectId: "legacy:bot:bot-1",
              objectType: "bot",
              version: 1,
              plaintext: "private bot",
            },
          ],
        };
      }
    });

    await migrateLegacyStateToE2ee({
      transport: { request },
      syncKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      deviceId: "device-1",
      runtimeId: "runtime-1",
      executionEpoch: 1,
    });

    const upload = request.mock.calls.find((call) => call[0].method === "PUT")?.[0];
    expect(upload.body.ciphertext).not.toContain("private bot");
    expect(request).toHaveBeenLastCalledWith({
      method: "POST",
      path: "/v1/workspaces/privacy/e2ee-ready",
      body: { deviceId: "device-1", runtimeId: "runtime-1", executionEpoch: 1 },
    });
  });
});
