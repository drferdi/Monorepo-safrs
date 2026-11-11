import { type SyncObjectType, SyncObjectTypeSchema } from "@sentrabot/contracts";
import type { ControlPlaneTransport } from "./control-plane-transport.js";
import { decryptSyncObject, encryptSyncObject } from "./e2ee.js";

export async function uploadEncryptedSyncObject(input: {
  transport: Pick<ControlPlaneTransport, "request">;
  syncKey: string;
  deviceId: string;
  objectId: string;
  objectType: SyncObjectType;
  version: number;
  plaintext: string;
}): Promise<void> {
  const ciphertext = encryptSyncObject(input, input.syncKey);
  await input.transport.request<void>({
    method: "PUT",
    path: `/v1/sync/objects/${encodeURIComponent(input.objectId)}`,
    body: {
      deviceId: input.deviceId,
      objectType: input.objectType,
      version: input.version,
      ciphertext,
    },
  });
}

export async function downloadEncryptedSyncObjects(input: {
  transport: Pick<ControlPlaneTransport, "request">;
  syncKey: string;
  deviceId: string;
  cursor?: string;
}): Promise<
  Array<{
    objectId: string;
    objectType: SyncObjectType;
    version: number;
    plaintext: string | null;
    tombstonedAt: string | null;
    cursor: string;
  }>
> {
  const query = new URLSearchParams({ deviceId: input.deviceId });
  if (input.cursor) query.set("cursor", input.cursor);
  const response = await input.transport.request<{
    objects: Array<{
      opaqueObjectId: string;
      objectType: unknown;
      version: number;
      ciphertext: string;
      tombstonedAt: string | null;
      cursor: string;
    }>;
  }>({ method: "GET", path: `/v1/sync/objects?${query.toString()}` });
  return response.objects.map((object) => {
    const objectType = SyncObjectTypeSchema.parse(object.objectType);
    return {
      objectId: object.opaqueObjectId,
      objectType,
      version: object.version,
      plaintext: object.tombstonedAt
        ? null
        : decryptSyncObject(
            {
              objectId: object.opaqueObjectId,
              objectType,
              version: object.version,
              ciphertext: object.ciphertext,
            },
            input.syncKey,
          ),
      tombstonedAt: object.tombstonedAt,
      cursor: object.cursor,
    };
  });
}
