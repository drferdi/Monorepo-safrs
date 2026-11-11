import type { SyncObjectType } from "@sentrabot/contracts";
import type { ControlPlaneTransport } from "./control-plane-transport.js";
import { uploadEncryptedSyncObject } from "./e2ee-sync.js";

export async function migrateLegacyStateToE2ee(input: {
  transport: Pick<ControlPlaneTransport, "request">;
  syncKey: string;
  deviceId: string;
  runtimeId: string;
  executionEpoch: number;
}): Promise<void> {
  const authority = {
    deviceId: input.deviceId,
    runtimeId: input.runtimeId,
    executionEpoch: input.executionEpoch,
  };
  const snapshot = await input.transport.request<{
    objects: Array<{
      objectId: string;
      objectType: SyncObjectType;
      version: number;
      plaintext: string;
    }>;
  }>({ method: "POST", path: "/v1/workspaces/privacy/legacy-export", body: authority });
  for (const object of snapshot.objects) {
    await uploadEncryptedSyncObject({
      transport: input.transport,
      syncKey: input.syncKey,
      deviceId: input.deviceId,
      ...object,
    });
  }
  await input.transport.request<void>({
    method: "POST",
    path: "/v1/workspaces/privacy/e2ee-ready",
    body: authority,
  });
}
