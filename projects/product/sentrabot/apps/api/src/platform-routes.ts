import { type SyncObjectType, SyncObjectTypeSchema } from "@sentrabot/contracts";
import { type Context, Hono } from "hono";

export interface PlatformActor {
  userId: string;
  workspaceId: string;
}

export interface PlatformRouteDependencies {
  authenticate(request: Request): Promise<PlatformActor | null>;
  isTrustedDevice(input: { actor: PlatformActor; deviceId: string }): Promise<boolean>;
  listDevices?(actor: PlatformActor): Promise<Array<{ deviceId: string; publicKey: string }>>;
  runtimeStatus?(actor: PlatformActor): Promise<{ online: boolean }>;
  registerDevice(input: {
    actor: PlatformActor;
    deviceId: string;
    publicKey: string;
  }): Promise<void>;
  revokeDevice?(input: { actor: PlatformActor; deviceId: string }): Promise<void>;
  publishKeyEnvelope?(input: {
    actor: PlatformActor;
    senderDeviceId: string;
    recipientDeviceId: string;
    version: number;
    ciphertext: string;
  }): Promise<void>;
  listKeyEnvelopes?(input: { actor: PlatformActor; deviceId: string }): Promise<unknown[]>;
  registerRuntime(input: {
    actor: PlatformActor;
    deviceId: string;
    runtimeId: string;
  }): Promise<void>;
  isTrustedRuntime(input: {
    actor: PlatformActor;
    deviceId: string;
    runtimeId: string;
  }): Promise<boolean>;
  canAcknowledgeE2eeMigration?(input: {
    actor: PlatformActor;
    runtimeId: string;
    executionEpoch: number;
  }): Promise<boolean>;
  acknowledgeE2eeMigration?(input: { actor: PlatformActor }): Promise<void>;
  exportLegacyPrivateState?(actor: PlatformActor): Promise<unknown[]>;
  putSyncObject(input: {
    deviceId: string;
    userId: string;
    objectId: string;
    objectType: SyncObjectType;
    version: number;
    ciphertext: string;
  }): Promise<void>;
  listSyncObjects(input: { userId: string; cursor?: bigint }): Promise<
    Array<{
      opaqueObjectId: string;
      objectType: string;
      version: number;
      ciphertext: string;
      tombstonedAt: Date | null;
      cursorSeq: bigint;
    }>
  >;
  deleteSyncObject(input: { userId: string; objectId: string }): Promise<void>;
  acquireRuntimeLease(input: {
    deviceId: string;
    workspaceId: string;
    runtimeId: string;
  }): Promise<{
    workspaceId: string;
    activeRuntimeId: string;
    executionEpoch: number;
    leaseExpiresAt: string;
  }>;
  renewRuntimeLease(input: { deviceId: string; workspaceId: string; runtimeId: string }): Promise<{
    workspaceId: string;
    activeRuntimeId: string;
    executionEpoch: number;
    leaseExpiresAt: string;
  }>;
  releaseRuntimeLease(input: {
    deviceId: string;
    workspaceId: string;
    runtimeId: string;
  }): Promise<void>;
  heartbeatRuntime(input: {
    actor: PlatformActor;
    deviceId: string;
    runtimeId: string;
  }): Promise<void>;
}

export function createPlatformRoutes(dependencies: PlatformRouteDependencies): Hono {
  const app = new Hono();
  app.get("/v1/control-plane/identity", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    return context.json({ workspaceId: actor.workspaceId });
  });
  app.get("/v1/devices", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    if (!dependencies.listDevices) return context.json({ error: "Not configured" }, 503);
    return context.json({ devices: await dependencies.listDevices(actor) });
  });
  app.get("/v1/runtimes/status", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    if (!dependencies.runtimeStatus) return context.json({ error: "Not configured" }, 503);
    return context.json(await dependencies.runtimeStatus(actor));
  });
  app.post("/v1/devices/register", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isRegisterDevice(body)) return context.json({ error: "Invalid device registration" }, 400);
    await dependencies.registerDevice({ actor, ...body });
    return context.body(null, 204);
  });
  app.post("/v1/runtimes/register", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isRegisterRuntime(body))
      return context.json({ error: "Invalid runtime registration" }, 400);
    if (!(await dependencies.isTrustedDevice({ actor, deviceId: body.deviceId }))) {
      return context.json({ error: "Untrusted device" }, 403);
    }
    await dependencies.registerRuntime({ actor, ...body });
    return context.body(null, 204);
  });
  app.post("/v1/workspaces/privacy/e2ee-ready", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isMigrationAcknowledgement(body))
      return context.json({ error: "Invalid runtime acknowledgement" }, 400);
    if (!(await dependencies.isTrustedRuntime({ actor, ...body })))
      return context.json({ error: "Untrusted runtime" }, 403);
    if (!dependencies.acknowledgeE2eeMigration || !dependencies.canAcknowledgeE2eeMigration)
      return context.json({ error: "Not configured" }, 503);
    if (!(await dependencies.canAcknowledgeE2eeMigration({ actor, ...body })))
      return context.json({ error: "Desktop Runtime offline" }, 409);
    await dependencies.acknowledgeE2eeMigration({ actor });
    return context.body(null, 204);
  });
  app.post("/v1/workspaces/privacy/legacy-export", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isMigrationAcknowledgement(body))
      return context.json({ error: "Invalid runtime acknowledgement" }, 400);
    if (!(await dependencies.isTrustedRuntime({ actor, ...body })))
      return context.json({ error: "Untrusted runtime" }, 403);
    if (!dependencies.canAcknowledgeE2eeMigration || !dependencies.exportLegacyPrivateState)
      return context.json({ error: "Not configured" }, 503);
    if (!(await dependencies.canAcknowledgeE2eeMigration({ actor, ...body })))
      return context.json({ error: "Desktop Runtime offline" }, 409);
    context.header("Cache-Control", "no-store");
    return context.json({ objects: await dependencies.exportLegacyPrivateState(actor) });
  });
  app.post("/v1/devices/:deviceId/revoke", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    if (!dependencies.revokeDevice) return context.json({ error: "Not configured" }, 503);
    await dependencies.revokeDevice({ actor, deviceId: context.req.param("deviceId") });
    return context.body(null, 204);
  });
  app.post("/v1/key-envelopes", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    if (!dependencies.publishKeyEnvelope) return context.json({ error: "Not configured" }, 503);
    const body = await context.req.json().catch(() => null);
    if (!isKeyEnvelope(body)) return context.json({ error: "Invalid key envelope" }, 400);
    if (!(await dependencies.isTrustedDevice({ actor, deviceId: body.senderDeviceId }))) {
      return context.json({ error: "Untrusted device" }, 403);
    }
    await dependencies.publishKeyEnvelope({ actor, ...body });
    return context.body(null, 204);
  });
  app.get("/v1/key-envelopes", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    if (!dependencies.listKeyEnvelopes) return context.json({ error: "Not configured" }, 503);
    const deviceId = context.req.query("deviceId");
    if (!deviceId || !(await dependencies.isTrustedDevice({ actor, deviceId }))) {
      return context.json({ error: "Untrusted device" }, 403);
    }
    return context.json({ envelopes: await dependencies.listKeyEnvelopes({ actor, deviceId }) });
  });
  app.put("/v1/sync/objects/:objectId", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isPutSyncObject(body)) return context.json({ error: "Invalid sync object metadata" }, 400);
    if (!(await dependencies.isTrustedDevice({ actor, deviceId: body.deviceId }))) {
      return context.json({ error: "Untrusted device" }, 403);
    }
    await dependencies.putSyncObject({
      ...body,
      userId: actor.userId,
      objectId: context.req.param("objectId"),
    });
    return context.body(null, 204);
  });
  app.get("/v1/sync/objects", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const deviceId = context.req.query("deviceId");
    if (!deviceId || !(await dependencies.isTrustedDevice({ actor, deviceId })))
      return context.json({ error: "Untrusted device" }, 403);
    const cursor = parseCursor(context.req.query("cursor"));
    if (cursor === null) return context.json({ error: "Invalid cursor" }, 400);
    const objects = await dependencies.listSyncObjects({ userId: actor.userId, cursor });
    return context.json({
      objects: objects.flatMap((object) => {
        const objectType = SyncObjectTypeSchema.safeParse(object.objectType);
        if (!objectType.success) return [];
        return [
          {
            opaqueObjectId: object.opaqueObjectId,
            objectType: objectType.data,
            version: object.version,
            ciphertext: object.ciphertext,
            tombstonedAt: object.tombstonedAt?.toISOString() ?? null,
            cursor: object.cursorSeq.toString(),
          },
        ];
      }),
    });
  });
  app.delete("/v1/sync/objects/:objectId", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const deviceId = context.req.query("deviceId");
    if (!deviceId || !(await dependencies.isTrustedDevice({ actor, deviceId })))
      return context.json({ error: "Untrusted device" }, 403);
    await dependencies.deleteSyncObject({
      userId: actor.userId,
      objectId: context.req.param("objectId"),
    });
    return context.body(null, 204);
  });
  app.post("/v1/runtime-leases/acquire", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isAcquireLease(body)) return context.json({ error: "Invalid runtime lease request" }, 400);
    if (body.workspaceId !== actor.workspaceId) {
      return context.json({ error: "Workspace access denied" }, 403);
    }
    if (!(await dependencies.isTrustedDevice({ actor, deviceId: body.deviceId }))) {
      return context.json({ error: "Untrusted device" }, 403);
    }
    if (!(await dependencies.isTrustedRuntime({ actor, ...body }))) {
      return context.json({ error: "Untrusted runtime" }, 403);
    }
    return context.json(await dependencies.acquireRuntimeLease(body));
  });
  app.post("/v1/runtime-leases/renew", async (context) => {
    const body = await authorizeRuntimeLeaseRequest(context, dependencies);
    if (body instanceof Response) return body;
    return context.json(await dependencies.renewRuntimeLease(body));
  });
  app.post("/v1/runtime-leases/release", async (context) => {
    const body = await authorizeRuntimeLeaseRequest(context, dependencies);
    if (body instanceof Response) return body;
    await dependencies.releaseRuntimeLease(body);
    return context.body(null, 204);
  });
  app.post("/v1/runtimes/:runtimeId/heartbeat", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isHeartbeat(body)) return context.json({ error: "Invalid heartbeat" }, 400);
    const runtimeId = context.req.param("runtimeId");
    if (!(await dependencies.isTrustedRuntime({ actor, deviceId: body.deviceId, runtimeId }))) {
      return context.json({ error: "Untrusted runtime" }, 403);
    }
    await dependencies.heartbeatRuntime({ actor, deviceId: body.deviceId, runtimeId });
    return context.body(null, 204);
  });
  return app;
}

async function authorizeRuntimeLeaseRequest(
  context: Context,
  dependencies: PlatformRouteDependencies,
) {
  const actor = await dependencies.authenticate(context.req.raw);
  if (!actor) return context.json({ error: "Unauthorized" }, 401);
  const body = await context.req.json().catch(() => null);
  if (!isAcquireLease(body)) return context.json({ error: "Invalid runtime lease request" }, 400);
  if (body.workspaceId !== actor.workspaceId)
    return context.json({ error: "Workspace access denied" }, 403);
  if (!(await dependencies.isTrustedDevice({ actor, deviceId: body.deviceId })))
    return context.json({ error: "Untrusted device" }, 403);
  if (!(await dependencies.isTrustedRuntime({ actor, ...body })))
    return context.json({ error: "Untrusted runtime" }, 403);
  return body;
}

function isRegisterDevice(value: unknown): value is { deviceId: string; publicKey: string } {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.deviceId === "string" &&
    input.deviceId.length > 0 &&
    typeof input.publicKey === "string" &&
    input.publicKey.length > 0
  );
}

function isRegisterRuntime(value: unknown): value is { deviceId: string; runtimeId: string } {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.deviceId === "string" &&
    input.deviceId.length > 0 &&
    typeof input.runtimeId === "string" &&
    input.runtimeId.length > 0
  );
}

function isMigrationAcknowledgement(value: unknown): value is {
  deviceId: string;
  runtimeId: string;
  executionEpoch: number;
} {
  if (!isRegisterRuntime(value)) return false;
  const epoch = (value as Record<string, unknown>).executionEpoch;
  return typeof epoch === "number" && Number.isInteger(epoch) && epoch >= 0;
}

function isHeartbeat(value: unknown): value is { deviceId: string } {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.deviceId === "string" && input.deviceId.length > 0;
}

function isKeyEnvelope(value: unknown): value is {
  senderDeviceId: string;
  recipientDeviceId: string;
  version: number;
  ciphertext: string;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.senderDeviceId === "string" &&
    input.senderDeviceId.length > 0 &&
    typeof input.recipientDeviceId === "string" &&
    input.recipientDeviceId.length > 0 &&
    typeof input.version === "number" &&
    Number.isInteger(input.version) &&
    input.version > 0 &&
    typeof input.ciphertext === "string" &&
    input.ciphertext.length > 0
  );
}

function parseCursor(value: string | undefined): bigint | undefined | null {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) return null;
  return BigInt(value);
}

function isAcquireLease(value: unknown): value is {
  deviceId: string;
  workspaceId: string;
  runtimeId: string;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.deviceId === "string" &&
    input.deviceId.length > 0 &&
    typeof input.workspaceId === "string" &&
    input.workspaceId.length > 0 &&
    typeof input.runtimeId === "string" &&
    input.runtimeId.length > 0
  );
}

function isPutSyncObject(value: unknown): value is {
  deviceId: string;
  objectType: SyncObjectType;
  version: number;
  ciphertext: string;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.deviceId === "string" &&
    input.deviceId.length > 0 &&
    SyncObjectTypeSchema.safeParse(input.objectType).success &&
    typeof input.version === "number" &&
    Number.isInteger(input.version) &&
    input.version > 0 &&
    typeof input.ciphertext === "string" &&
    input.ciphertext.length > 0
  );
}
