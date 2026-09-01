import { describe, expect, it, vi } from "vitest";

describe("desktop E2EE pairing", () => {
  it("publishes a recipient-specific encrypted sync-key envelope", async () => {
    const { createDeviceKeypair, decryptEnvelope } = await import("./e2ee.js");
    const { publishPairingEnvelope } = await import("./e2ee-pairing.js");
    const recipient = createDeviceKeypair();
    const request = vi.fn().mockResolvedValue(undefined);

    await publishPairingEnvelope({
      transport: { request },
      senderDeviceId: "desktop-sender",
      recipient: { deviceId: "desktop-recipient", publicKey: recipient.publicKey },
      syncKey: "local-sync-key",
      version: 1,
    });

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      path: "/v1/key-envelopes",
      body: expect.objectContaining({
        senderDeviceId: "desktop-sender",
        recipientDeviceId: "desktop-recipient",
        version: 1,
      }),
    });
    const ciphertext = request.mock.calls[0]?.[0].body.ciphertext;
    expect(ciphertext).not.toContain("local-sync-key");
    expect(decryptEnvelope(JSON.parse(ciphertext), recipient.privateKey)).toBe("local-sync-key");
  });
});
