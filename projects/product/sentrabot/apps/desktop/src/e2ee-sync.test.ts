import { describe, expect, it, vi } from "vitest";

describe("encrypted sync upload", () => {
  it("uploads only an encrypted object through the Control Plane", async () => {
    const { uploadEncryptedSyncObject } = await import("./e2ee-sync.js");
    const request = vi.fn().mockResolvedValue(undefined);

    await uploadEncryptedSyncObject({
      transport: { request },
      syncKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      deviceId: "device-1",
      objectId: "opaque-object-1",
      objectType: "conversation",
      version: 1,
      plaintext: "private chat",
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        path: "/v1/sync/objects/opaque-object-1",
        body: expect.objectContaining({
          deviceId: "device-1",
          objectType: "conversation",
          version: 1,
        }),
      }),
    );
    expect(request.mock.calls[0]?.[0].body.ciphertext).not.toContain("private chat");
  });

  it("decrypts downloaded sync objects only on the local device", async () => {
    const { encryptSyncObject } = await import("./e2ee.js");
    const { downloadEncryptedSyncObjects } = await import("./e2ee-sync.js");
    const syncKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const ciphertext = encryptSyncObject(
      {
        objectId: "opaque-object-1",
        objectType: "conversation",
        version: 1,
        plaintext: "private chat",
      },
      syncKey,
    );
    const request = vi.fn().mockResolvedValue({
      objects: [
        {
          opaqueObjectId: "opaque-object-1",
          objectType: "conversation",
          version: 1,
          ciphertext,
          tombstonedAt: null,
          cursor: "1",
        },
      ],
    });

    const objects = await downloadEncryptedSyncObjects({
      transport: { request },
      syncKey,
      deviceId: "device-1",
    });

    expect(objects).toEqual([
      expect.objectContaining({
        objectId: "opaque-object-1",
        plaintext: "private chat",
        cursor: "1",
      }),
    ]);
    expect(request).toHaveBeenCalledWith({
      method: "GET",
      path: "/v1/sync/objects?deviceId=device-1",
    });
  });
});
