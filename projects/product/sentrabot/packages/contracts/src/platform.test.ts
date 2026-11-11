import { describe, expect, it } from "vitest";

describe("hybrid platform contracts", () => {
  it("accepts recipient-specific encrypted key envelopes without semantic labels", async () => {
    const { KeyEnvelopeSchema } = await import("./platform.js");
    expect(
      KeyEnvelopeSchema.safeParse({
        envelopeId: "envelope-1",
        workspaceId: "workspace-1",
        senderDeviceId: "device-1",
        recipientDeviceId: "device-2",
        version: 1,
        ciphertext: "ciphertext",
        createdAt: "2026-09-02T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("accepts only versioned E2EE envelope metadata", async () => {
    const { E2eeEnvelopeSchema } = await import("./platform.js");
    expect(
      E2eeEnvelopeSchema.safeParse({
        version: 1,
        ephemeralPublicKey: "key",
        iv: "iv",
        ciphertext: "ciphertext",
        authTag: "tag",
      }).success,
    ).toBe(true);
  });

  it("accepts a relay envelope that contains ciphertext and operational metadata only", async () => {
    const { RelayEnvelopeSchema } = await import("./platform.js");
    const envelope = RelayEnvelopeSchema.parse({
      envelopeId: "envelope-1",
      workspaceId: "workspace-1",
      runtimeId: "runtime-1",
      executionEpoch: 7,
      senderDeviceId: "device-1",
      sequence: 3,
      ciphertext: "ZW5jcnlwdGVk",
      signature: "c2lnbmF0dXJl",
      createdAt: "2026-09-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:05:00.000Z",
    });

    expect(envelope.ciphertext).toBe("ZW5jcnlwdGVk");
    expect(envelope).not.toHaveProperty("prompt");
  });

  it("rejects semantic sync object types that could expose private content", async () => {
    const { SyncObjectTypeSchema } = await import("./platform.js");
    expect(() => SyncObjectTypeSchema.parse("payroll-bot")).toThrow();
  });

  it("parses a runtime lease with a nonnegative execution epoch", async () => {
    const { RuntimeLeaseSchema } = await import("./platform.js");

    expect(
      RuntimeLeaseSchema.parse({
        workspaceId: "workspace-1",
        activeRuntimeId: "runtime-1",
        executionEpoch: 0,
        leaseExpiresAt: "2026-09-01T00:05:00.000Z",
      }).executionEpoch,
    ).toBe(0);
  });
});
