import { describe, expect, it } from "vitest";

describe("desktop E2EE key store", () => {
  it("persists only OS-protected private key material", async () => {
    const { DeviceKeypairStore } = await import("./e2ee-store.js");
    let persisted: string | null = null;
    const store = new DeviceKeypairStore({
      protection: {
        isAvailable: () => true,
        encrypt: (value) => `protected:${Buffer.from(value).toString("base64")}`,
        decrypt: (value) => Buffer.from(value.replace("protected:", ""), "base64").toString("utf8"),
      },
      storage: {
        read: async () => persisted,
        write: async (value) => {
          persisted = value;
        },
      },
    });

    const keypair = await store.loadOrCreate();

    expect(persisted).toContain("protected:");
    expect(persisted).not.toContain(keypair.privateKey);
    await expect(store.loadOrCreate()).resolves.toEqual(keypair);
  });

  it("keeps the sync key OS-protected while preserving a recovery envelope", async () => {
    const { SyncKeyStore } = await import("./e2ee-store.js");
    let persisted: string | null = null;
    const store = new SyncKeyStore({
      protection: {
        isAvailable: () => true,
        encrypt: (value) => `protected:${Buffer.from(value).toString("base64")}`,
        decrypt: (value) => Buffer.from(value.replace("protected:", ""), "base64").toString("utf8"),
      },
      storage: {
        read: async () => persisted,
        write: async (value) => {
          persisted = value;
        },
      },
    });

    const initialized = await store.initialize();

    expect(persisted).toContain("protected:");
    expect(persisted).not.toContain(initialized.syncKey);
    expect(store.recover(initialized.recoveryEnvelope, initialized.recoveryKey)).toBe(
      initialized.syncKey,
    );
    await expect(store.load()).resolves.toBe(initialized.syncKey);
  });

  it("restores a replacement desktop's sync key from the recovery key", async () => {
    const { SyncKeyStore } = await import("./e2ee-store.js");
    const protection = {
      isAvailable: () => true,
      encrypt: (value: string) => `protected:${Buffer.from(value).toString("base64")}`,
      decrypt: (value: string) =>
        Buffer.from(value.replace("protected:", ""), "base64").toString("utf8"),
    };
    let sourceValue: string | null = null;
    const source = new SyncKeyStore({
      protection,
      storage: {
        read: async () => sourceValue,
        write: async (value) => {
          sourceValue = value;
        },
      },
    });
    const initialized = await source.initialize();
    let replacementValue: string | null = null;
    const replacement = new SyncKeyStore({
      protection,
      storage: {
        read: async () => replacementValue,
        write: async (value) => {
          replacementValue = value;
        },
      },
    });

    await replacement.restore(initialized.recoveryEnvelope, initialized.recoveryKey);

    expect(replacementValue).toContain("protected:");
    expect(replacementValue).not.toContain(initialized.syncKey);
    await expect(replacement.load()).resolves.toBe(initialized.syncKey);
  });
});
