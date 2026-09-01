import { describe, expect, it } from "vitest";

describe("desktop E2EE envelopes", () => {
  it("decrypts only with the recipient local private key", async () => {
    const { createDeviceKeypair, decryptEnvelope, encryptForDevice } = await import("./e2ee.js");
    const recipient = createDeviceKeypair();
    const envelope = encryptForDevice("private bot state", recipient.publicKey);

    expect(decryptEnvelope(envelope, recipient.privateKey)).toBe("private bot state");
  });

  it("requires the recovery key to restore a locally generated sync key", async () => {
    const { createRecoveryEnvelope, createRecoveryKey, createSyncKey, recoverSyncKey } =
      await import("./e2ee.js");
    const syncKey = createSyncKey();
    const recoveryKey = createRecoveryKey();
    const envelope = createRecoveryEnvelope(syncKey, recoveryKey);

    expect(recoverSyncKey(envelope, recoveryKey)).toBe(syncKey);
    expect(() => recoverSyncKey(envelope, createRecoveryKey())).toThrow();
  });

  it("binds an encrypted sync object to its opaque identity and version", async () => {
    const { createSyncKey, decryptSyncObject, encryptSyncObject } = await import("./e2ee.js");
    const syncKey = createSyncKey();
    const encrypted = encryptSyncObject(
      {
        objectId: "opaque-object-1",
        objectType: "conversation",
        version: 1,
        plaintext: "private chat",
      },
      syncKey,
    );

    expect(
      decryptSyncObject(
        {
          objectId: "opaque-object-1",
          objectType: "conversation",
          version: 1,
          ciphertext: encrypted,
        },
        syncKey,
      ),
    ).toBe("private chat");
    expect(() =>
      decryptSyncObject(
        {
          objectId: "opaque-object-1",
          objectType: "conversation",
          version: 2,
          ciphertext: encrypted,
        },
        syncKey,
      ),
    ).toThrow();
  });

  it("keeps the ciphertext stable for an idempotent upload of the same object version", async () => {
    const { createSyncKey, encryptSyncObject } = await import("./e2ee.js");
    const input = {
      objectId: "opaque-object-1",
      objectType: "conversation",
      version: 1,
      plaintext: "private chat",
    };
    const syncKey = createSyncKey();

    expect(encryptSyncObject(input, syncKey)).toBe(encryptSyncObject(input, syncKey));
  });
});
