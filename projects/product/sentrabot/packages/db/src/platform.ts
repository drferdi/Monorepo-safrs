import type { Db } from "./client.js";

export interface RuntimeLeaseRecord {
  workspaceId: string;
  activeRuntimeId: string;
  executionEpoch: number;
  leaseExpiresAt: Date;
}

export interface AcquireRuntimeLeaseInput {
  workspaceId: string;
  runtimeId: string;
  now: Date;
  leaseDurationMs: number;
}

export interface EntitlementEventInput {
  workspaceId: string;
  planCode: string;
  state: string;
  eventId: string;
  occurredAt: Date;
}

export interface VerifiedPaymentEventInput {
  provider: string;
  providerEventId: string;
  userId: string;
  workspaceId: string;
  lifecycle: "paid" | "renewal_failed";
  now: Date;
}

export interface PlatformActor {
  userId: string;
  workspaceId: string;
}

interface PlatformDeviceRecord {
  id: string;
  userId: string;
  workspaceId: string;
  publicKey: string;
  revokedAt: Date | null;
}

export interface PlatformDeviceDatabase {
  device: {
    findUnique(input: { where: { id: string } }): Promise<PlatformDeviceRecord | null>;
    create(input: {
      data: { id: string; userId: string; workspaceId: string; publicKey: string };
    }): Promise<PlatformDeviceRecord>;
  };
}

export async function registerPlatformDevice(
  db: PlatformDeviceDatabase,
  input: { actor: PlatformActor; deviceId: string; publicKey: string },
): Promise<void> {
  const current = await db.device.findUnique({ where: { id: input.deviceId } });
  if (current) {
    if (current.userId !== input.actor.userId || current.workspaceId !== input.actor.workspaceId)
      throw new Error("Device is already owned by another account");
    if (current.revokedAt) throw new Error("Device has been revoked");
    if (current.publicKey !== input.publicKey)
      throw new Error("Device identity cannot be replaced");
    return;
  }
  await db.device.create({
    data: {
      id: input.deviceId,
      userId: input.actor.userId,
      workspaceId: input.actor.workspaceId,
      publicKey: input.publicKey,
    },
  });
}

export async function isTrustedPlatformDevice(
  db: PlatformDeviceDatabase,
  input: { actor: PlatformActor; deviceId: string },
): Promise<boolean> {
  const device = await db.device.findUnique({ where: { id: input.deviceId } });
  return Boolean(
    device &&
      !device.revokedAt &&
      device.userId === input.actor.userId &&
      device.workspaceId === input.actor.workspaceId,
  );
}

export async function listTrustedPlatformDevices(db: Db, actor: PlatformActor) {
  const devices = await db.device.findMany({
    where: {
      userId: actor.userId,
      workspaceId: actor.workspaceId,
      revokedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, publicKey: true },
  });
  return devices.map((device) => ({ deviceId: device.id, publicKey: device.publicKey }));
}

export async function revokePlatformDevice(
  db: Db,
  input: { actor: PlatformActor; deviceId: string; now: Date },
): Promise<void> {
  await db.device.updateMany({
    where: {
      id: input.deviceId,
      userId: input.actor.userId,
      workspaceId: input.actor.workspaceId,
      revokedAt: null,
    },
    data: { revokedAt: input.now },
  });
}

export async function publishKeyEnvelope(
  db: Db,
  input: {
    actor: PlatformActor;
    senderDeviceId: string;
    recipientDeviceId: string;
    version: number;
    ciphertext: string;
  },
): Promise<void> {
  const sender = await db.device.findUnique({ where: { id: input.senderDeviceId } });
  const recipient = await db.device.findUnique({ where: { id: input.recipientDeviceId } });
  if (
    !sender ||
    sender.revokedAt ||
    sender.userId !== input.actor.userId ||
    sender.workspaceId !== input.actor.workspaceId ||
    !recipient ||
    recipient.revokedAt ||
    recipient.userId !== input.actor.userId ||
    recipient.workspaceId !== input.actor.workspaceId
  ) {
    throw new Error("Key envelope devices are not trusted in this workspace");
  }
  const existing = await db.keyEnvelope.findUnique({
    where: {
      senderDeviceId_recipientDeviceId_version: {
        senderDeviceId: input.senderDeviceId,
        recipientDeviceId: input.recipientDeviceId,
        version: input.version,
      },
    },
  });
  if (existing) {
    if (existing.ciphertext !== input.ciphertext) throw new Error("Key envelope version conflicts");
    return;
  }
  await db.keyEnvelope.create({
    data: {
      workspaceId: input.actor.workspaceId,
      senderDeviceId: input.senderDeviceId,
      recipientDeviceId: input.recipientDeviceId,
      version: input.version,
      ciphertext: input.ciphertext,
    },
  });
}

export async function listKeyEnvelopesForDevice(
  db: Db,
  input: { actor: PlatformActor; deviceId: string },
) {
  return db.keyEnvelope.findMany({
    where: { workspaceId: input.actor.workspaceId, recipientDeviceId: input.deviceId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderDeviceId: true,
      recipientDeviceId: true,
      version: true,
      ciphertext: true,
      createdAt: true,
    },
  });
}

export async function reserveManagedAiUsage(
  db: Db,
  input: {
    actor: PlatformActor;
    idempotencyKey: string;
    capability: string;
    estimatedCostMicros: bigint;
    expiresAt: Date;
  },
): Promise<{ reservationId: string }> {
  return db.$transaction(async (tx) => {
    const current = await tx.usageReservation.findUnique({
      where: {
        workspaceId_idempotencyKey: {
          workspaceId: input.actor.workspaceId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (current) {
      if (current.userId !== input.actor.userId)
        throw new Error("Usage reservation is not owned by user");
      return { reservationId: current.id };
    }
    const reservation = await tx.usageReservation.create({
      data: {
        userId: input.actor.userId,
        workspaceId: input.actor.workspaceId,
        idempotencyKey: input.idempotencyKey,
        capability: input.capability,
        estimatedCostMicros: input.estimatedCostMicros,
        status: "reserved",
        expiresAt: input.expiresAt,
      },
    });
    return { reservationId: reservation.id };
  });
}

export async function finalizeManagedAiUsage(
  db: Db,
  input: {
    actor: PlatformActor;
    reservationId: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    actualCostMicros: bigint;
    priceVersion: string;
    now: Date;
  },
): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.usageReservation.findUnique({
      where: { id: input.reservationId },
    });
    if (
      !reservation ||
      reservation.userId !== input.actor.userId ||
      reservation.workspaceId !== input.actor.workspaceId
    ) {
      throw new Error("Usage reservation is not available to this runtime");
    }
    if (reservation.status === "finalized") return;
    if (reservation.status !== "reserved") throw new Error("Usage reservation is not active");
    await tx.usageLedger.create({
      data: {
        userId: input.actor.userId,
        workspaceId: input.actor.workspaceId,
        reservationId: reservation.id,
        provider: input.provider,
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cachedInputTokens: input.cachedInputTokens,
        actualCostMicros: input.actualCostMicros,
        priceVersion: input.priceVersion,
      },
    });
    await tx.usageReservation.update({
      where: { id: reservation.id },
      data: { status: "finalized", finalizedAt: input.now },
    });
  });
}

export async function releaseManagedAiUsage(
  db: Db,
  input: { actor: PlatformActor; reservationId: string; now: Date },
): Promise<void> {
  await db.usageReservation.updateMany({
    where: {
      id: input.reservationId,
      userId: input.actor.userId,
      workspaceId: input.actor.workspaceId,
      status: "reserved",
    },
    data: { status: "released", finalizedAt: input.now },
  });
}

export async function getManagedAiBudgetRatio(
  db: Pick<Db, "usageLedger" | "usageReservation">,
  input: { actor: PlatformActor; now: Date; monthlyBudgetMicros: bigint },
): Promise<number> {
  if (input.monthlyBudgetMicros <= 0n) throw new Error("Managed AI budget must be positive");
  const monthStart = new Date(
    Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const [finalized, reserved] = await Promise.all([
    db.usageLedger.aggregate({
      where: {
        userId: input.actor.userId,
        workspaceId: input.actor.workspaceId,
        createdAt: { gte: monthStart },
      },
      _sum: { actualCostMicros: true },
    }),
    db.usageReservation.aggregate({
      where: {
        userId: input.actor.userId,
        workspaceId: input.actor.workspaceId,
        status: "reserved",
        expiresAt: { gt: input.now },
      },
      _sum: { estimatedCostMicros: true },
    }),
  ]);
  const consumed =
    (finalized._sum.actualCostMicros ?? 0n) + (reserved._sum.estimatedCostMicros ?? 0n);
  return Number(consumed) / Number(input.monthlyBudgetMicros);
}

export function createPlatformDeviceDatabase(db: Db): PlatformDeviceDatabase {
  return {
    device: {
      findUnique: (input) => db.device.findUnique({ where: input.where }),
      create: (input) => db.device.create({ data: input.data }),
    },
  };
}

interface PlatformRuntimeRecord {
  id: string;
  deviceId: string;
  workspaceId: string;
  lastHeartbeat?: Date | null;
}

export interface PlatformRuntimeDatabase extends PlatformDeviceDatabase {
  runtime: {
    findUnique(input: { where: { id: string } }): Promise<PlatformRuntimeRecord | null>;
    create(input: {
      data: { id: string; deviceId: string; workspaceId: string };
    }): Promise<PlatformRuntimeRecord>;
    update(input: {
      where: { id: string };
      data: { lastHeartbeat: Date };
    }): Promise<PlatformRuntimeRecord>;
  };
}

export async function registerPlatformRuntime(
  db: PlatformRuntimeDatabase,
  input: { actor: PlatformActor; deviceId: string; runtimeId: string },
): Promise<void> {
  if (!(await isTrustedPlatformDevice(db, input))) throw new Error("Untrusted device");
  const current = await db.runtime.findUnique({ where: { id: input.runtimeId } });
  if (current) {
    if (current.deviceId !== input.deviceId || current.workspaceId !== input.actor.workspaceId)
      throw new Error("Runtime is already registered elsewhere");
    return;
  }
  await db.runtime.create({
    data: { id: input.runtimeId, deviceId: input.deviceId, workspaceId: input.actor.workspaceId },
  });
}

export async function isTrustedPlatformRuntime(
  db: PlatformRuntimeDatabase,
  input: { actor: PlatformActor; deviceId: string; runtimeId: string },
): Promise<boolean> {
  const runtime = await db.runtime.findUnique({ where: { id: input.runtimeId } });
  return Boolean(
    runtime &&
      runtime.deviceId === input.deviceId &&
      runtime.workspaceId === input.actor.workspaceId &&
      (await isTrustedPlatformDevice(db, input)),
  );
}

export async function heartbeatPlatformRuntime(
  db: PlatformRuntimeDatabase,
  input: { actor: PlatformActor; deviceId: string; runtimeId: string; now: Date },
): Promise<void> {
  if (!(await isTrustedPlatformRuntime(db, input))) throw new Error("Untrusted runtime");
  await db.runtime.update({ where: { id: input.runtimeId }, data: { lastHeartbeat: input.now } });
}

export async function getPlatformRuntimeStatus(
  db: Pick<Db, "device" | "runtime" | "runtimeLease">,
  input: { actor: PlatformActor; now: Date; heartbeatMaxAgeMs: number },
): Promise<{ online: boolean }> {
  const lease = await db.runtimeLease.findUnique({
    where: { workspaceId: input.actor.workspaceId },
  });
  if (!lease || lease.leaseExpiresAt <= input.now) return { online: false };
  const runtime = await db.runtime.findUnique({ where: { id: lease.activeRuntimeId } });
  if (
    !runtime ||
    runtime.workspaceId !== input.actor.workspaceId ||
    !runtime.lastHeartbeat ||
    runtime.lastHeartbeat.getTime() < input.now.getTime() - input.heartbeatMaxAgeMs
  ) {
    return { online: false };
  }
  const device = await db.device.findUnique({ where: { id: runtime.deviceId } });
  return {
    online: Boolean(
      device &&
        !device.revokedAt &&
        device.userId === input.actor.userId &&
        device.workspaceId === input.actor.workspaceId,
    ),
  };
}

export async function canDeliverRelay(
  db: Pick<Db, "device" | "runtime" | "runtimeLease">,
  input: {
    actor: PlatformActor;
    runtimeId: string;
    executionEpoch: number;
    now: Date;
    heartbeatMaxAgeMs: number;
  },
): Promise<boolean> {
  const lease = await db.runtimeLease.findUnique({
    where: { workspaceId: input.actor.workspaceId },
  });
  if (
    !lease ||
    lease.activeRuntimeId !== input.runtimeId ||
    lease.executionEpoch !== input.executionEpoch ||
    lease.leaseExpiresAt <= input.now
  ) {
    return false;
  }
  const runtime = await db.runtime.findUnique({ where: { id: input.runtimeId } });
  if (
    !runtime ||
    runtime.workspaceId !== input.actor.workspaceId ||
    !runtime.lastHeartbeat ||
    runtime.lastHeartbeat.getTime() < input.now.getTime() - input.heartbeatMaxAgeMs
  ) {
    return false;
  }
  const device = await db.device.findUnique({ where: { id: runtime.deviceId } });
  return Boolean(
    device &&
      !device.revokedAt &&
      device.userId === input.actor.userId &&
      device.workspaceId === input.actor.workspaceId,
  );
}

export function createPlatformRuntimeDatabase(db: Db): PlatformRuntimeDatabase {
  return {
    ...createPlatformDeviceDatabase(db),
    runtime: {
      findUnique: (input) => db.runtime.findUnique({ where: input.where }),
      create: (input) => db.runtime.create({ data: input.data }),
      update: (input) => db.runtime.update(input),
    },
  };
}

export async function putEncryptedSyncObject(
  db: Db,
  input: {
    userId: string;
    objectId: string;
    objectType: string;
    version: number;
    ciphertext: string;
  },
): Promise<void> {
  const current = await db.syncObjectIndex.findUnique({
    where: { userId_opaqueObjectId: { userId: input.userId, opaqueObjectId: input.objectId } },
  });
  if (current) {
    if (input.version < current.version) throw new Error("Sync object version is stale");
    if (input.version === current.version && input.ciphertext !== current.ciphertext)
      throw new Error("Sync object version conflicts with stored ciphertext");
    if (input.version === current.version) return;
  }
  await db.syncObjectIndex.upsert({
    where: { userId_opaqueObjectId: { userId: input.userId, opaqueObjectId: input.objectId } },
    create: {
      userId: input.userId,
      opaqueObjectId: input.objectId,
      objectType: input.objectType,
      version: input.version,
      ciphertextLocator: input.objectId,
      ciphertext: input.ciphertext,
    },
    update: {
      objectType: input.objectType,
      version: input.version,
      ciphertextLocator: input.objectId,
      ciphertext: input.ciphertext,
      tombstonedAt: null,
    },
  });
}

export async function listEncryptedSyncObjects(db: Db, input: { userId: string; cursor?: bigint }) {
  return db.syncObjectIndex.findMany({
    where: {
      userId: input.userId,
      ...(input.cursor ? { cursorSeq: { gt: input.cursor } } : {}),
    },
    orderBy: { cursorSeq: "asc" },
    take: 100,
  });
}

export async function tombstoneEncryptedSyncObject(
  db: Db,
  input: { userId: string; objectId: string; now: Date },
): Promise<boolean> {
  const result = await db.syncObjectIndex.updateMany({
    where: { userId: input.userId, opaqueObjectId: input.objectId, tombstonedAt: null },
    data: { tombstonedAt: input.now },
  });
  return result.count === 1;
}

export async function findPaymentTargetByProviderReference(db: Db, providerReference: string) {
  return db.subscription.findUnique({
    where: { providerReference },
    select: { userId: true, workspaceId: true },
  });
}

export async function beginCheckout(
  db: Db,
  input: { userId: string; workspaceId: string; provider: string; providerReference: string },
): Promise<void> {
  await db.subscription.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      planCode: "plus",
      state: "checkout_pending",
      provider: input.provider,
      providerReference: input.providerReference,
    },
    update: {
      planCode: "plus",
      state: "checkout_pending",
      provider: input.provider,
      providerReference: input.providerReference,
      graceEndsAt: null,
    },
  });
}

interface PlatformTransaction {
  runtimeLease: {
    findUnique(input: { where: { workspaceId: string } }): Promise<RuntimeLeaseRecord | null>;
    upsert(input: {
      where: { workspaceId: string };
      create: RuntimeLeaseRecord;
      update: Omit<RuntimeLeaseRecord, "workspaceId">;
    }): Promise<RuntimeLeaseRecord>;
  };
  entitlementState: {
    upsert(input: {
      where: { workspaceId: string };
      create: { workspaceId: string; planCode: string; state: string; version: number };
      update: { planCode: string; state: string; version: { increment: number } };
    }): Promise<{ workspaceId: string }>;
  };
  outboxEvent: {
    create(input: {
      data: {
        dedupeKey: string;
        type: string;
        payload: { workspaceId: string; versionedAt: string };
      };
    }): Promise<{ id: string }>;
  };
  paymentEvent: {
    findUnique(input: {
      where: { provider_providerEventId: { provider: string; providerEventId: string } };
    }): Promise<{
      id: string;
    } | null>;
    create(input: {
      data: {
        provider: string;
        providerEventId: string;
        userId: string;
        workspaceId: string;
        lifecycle: string;
        verifiedAt: Date;
      };
    }): Promise<{ id: string }>;
  };
  subscription: {
    upsert(input: {
      where: { workspaceId: string };
      create: {
        userId: string;
        workspaceId: string;
        planCode: string;
        state: string;
        provider: string;
      };
      update: { planCode: string; state: string; graceEndsAt: Date | null };
    }): Promise<{ id: string }>;
  };
}

export interface PlatformDatabase {
  $transaction<T>(operation: (tx: PlatformTransaction) => Promise<T>): Promise<T>;
}

export function createPlatformDatabase(db: Db): PlatformDatabase {
  return {
    $transaction: (operation) =>
      db.$transaction((tx) =>
        operation({
          runtimeLease: {
            findUnique: (input) => tx.runtimeLease.findUnique({ where: input.where }),
            upsert: (input) => tx.runtimeLease.upsert(input),
          },
          entitlementState: {
            upsert: (input) => tx.entitlementState.upsert(input),
          },
          outboxEvent: {
            create: (input) => tx.outboxEvent.create(input),
          },
          paymentEvent: {
            findUnique: (input) => tx.paymentEvent.findUnique({ where: input.where }),
            create: (input) => tx.paymentEvent.create(input),
          },
          subscription: {
            upsert: (input) => tx.subscription.upsert(input),
          },
        }),
      ),
  };
}

export async function applyVerifiedPaymentEvent(
  db: PlatformDatabase,
  input: VerifiedPaymentEventInput,
): Promise<{ applied: boolean }> {
  return db.$transaction(async (tx) => {
    const existing = await tx.paymentEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: input.provider,
          providerEventId: input.providerEventId,
        },
      },
    });
    if (existing) return { applied: false };
    const paid = input.lifecycle === "paid";
    await tx.paymentEvent.create({
      data: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        userId: input.userId,
        workspaceId: input.workspaceId,
        lifecycle: input.lifecycle,
        verifiedAt: input.now,
      },
    });
    await tx.subscription.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        planCode: "plus",
        state: paid ? "active_plus" : "grace_period",
        provider: input.provider,
      },
      update: {
        planCode: "plus",
        state: paid ? "active_plus" : "grace_period",
        graceEndsAt: paid ? null : addSevenCalendarDays(input.now),
      },
    });
    await tx.entitlementState.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        workspaceId: input.workspaceId,
        planCode: paid ? "plus" : "free",
        state: paid ? "active_plus" : "grace_period",
        version: 1,
      },
      update: {
        planCode: paid ? "plus" : "free",
        state: paid ? "active_plus" : "grace_period",
        version: { increment: 1 },
      },
    });
    await tx.outboxEvent.create({
      data: {
        dedupeKey: `${input.provider}:${input.providerEventId}`,
        type: "entitlement.changed",
        payload: { workspaceId: input.workspaceId, versionedAt: input.now.toISOString() },
      },
    });
    return { applied: true };
  });
}

export async function acquireRuntimeLease(
  db: PlatformDatabase,
  input: AcquireRuntimeLeaseInput,
): Promise<RuntimeLeaseRecord> {
  return db.$transaction(async (tx) => {
    const current = await tx.runtimeLease.findUnique({ where: { workspaceId: input.workspaceId } });
    const isCurrentRuntime = current?.activeRuntimeId === input.runtimeId;
    const isLeaseValid = current !== null && current.leaseExpiresAt > input.now;
    if (isLeaseValid && !isCurrentRuntime)
      throw new Error("Runtime lease is held by another runtime");

    const executionEpoch =
      current === null ? 1 : isCurrentRuntime ? current.executionEpoch : current.executionEpoch + 1;
    const leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs);
    return tx.runtimeLease.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        workspaceId: input.workspaceId,
        activeRuntimeId: input.runtimeId,
        executionEpoch,
        leaseExpiresAt,
      },
      update: { activeRuntimeId: input.runtimeId, executionEpoch, leaseExpiresAt },
    });
  });
}

export async function renewRuntimeLease(
  db: PlatformDatabase,
  input: AcquireRuntimeLeaseInput,
): Promise<RuntimeLeaseRecord> {
  return db.$transaction(async (tx) => {
    const current = await tx.runtimeLease.findUnique({ where: { workspaceId: input.workspaceId } });
    if (
      !current ||
      current.activeRuntimeId !== input.runtimeId ||
      current.leaseExpiresAt <= input.now
    )
      throw new Error("Runtime does not hold an active lease");
    const leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs);
    return tx.runtimeLease.upsert({
      where: { workspaceId: input.workspaceId },
      create: { ...current, leaseExpiresAt },
      update: { ...current, leaseExpiresAt },
    });
  });
}

export async function releaseRuntimeLease(
  db: PlatformDatabase,
  input: Pick<AcquireRuntimeLeaseInput, "workspaceId" | "runtimeId" | "now">,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const current = await tx.runtimeLease.findUnique({ where: { workspaceId: input.workspaceId } });
    if (!current || current.activeRuntimeId !== input.runtimeId) return;
    await tx.runtimeLease.upsert({
      where: { workspaceId: input.workspaceId },
      create: { ...current, leaseExpiresAt: input.now },
      update: { ...current, leaseExpiresAt: input.now },
    });
  });
}

export async function applyEntitlementEvent(
  db: PlatformDatabase,
  input: EntitlementEventInput,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.entitlementState.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        workspaceId: input.workspaceId,
        planCode: input.planCode,
        state: input.state,
        version: 1,
      },
      update: { planCode: input.planCode, state: input.state, version: { increment: 1 } },
    });
    await tx.outboxEvent.create({
      data: {
        dedupeKey: input.eventId,
        type: "entitlement.changed",
        payload: { workspaceId: input.workspaceId, versionedAt: input.occurredAt.toISOString() },
      },
    });
  });
}

function addSevenCalendarDays(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + 7);
  return result;
}
