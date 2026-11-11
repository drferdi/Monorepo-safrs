import { describe, expect, it, vi } from "vitest";
import type { PlatformDatabase, PlatformDeviceDatabase } from "./platform.js";

describe("platform control-plane repositories", () => {
  it("records a verified payment and entitlement outbox event exactly once", async () => {
    const { applyVerifiedPaymentEvent } = await import("./platform.js");
    const paymentEvent = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "payment-event-1" }),
    };
    const subscription = { upsert: vi.fn().mockResolvedValue({ id: "subscription-1" }) };
    const outboxEvent = { create: vi.fn().mockResolvedValue({ id: "outbox-1" }) };
    const db = {
      $transaction: async (operation: (tx: any) => Promise<void>) =>
        operation({
          runtimeLease: { findUnique: vi.fn(), upsert: vi.fn() },
          entitlementState: { upsert: vi.fn() },
          outboxEvent,
          paymentEvent,
          subscription,
        }),
    };

    await applyVerifiedPaymentEvent(db as any, {
      provider: "xendit",
      providerEventId: "payment-1",
      userId: "user-1",
      workspaceId: "workspace-1",
      lifecycle: "paid",
      now: new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(paymentEvent.create).toHaveBeenCalledOnce();
    expect(subscription.upsert).toHaveBeenCalledOnce();
    expect(outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dedupeKey: "xendit:payment-1" }) }),
    );
  });

  it("expires but retains a released lease so the next owner receives a newer epoch", async () => {
    const { releaseRuntimeLease } = await import("./platform.js");
    const upsert = vi.fn().mockResolvedValue({
      workspaceId: "workspace-1",
      activeRuntimeId: "runtime-1",
      executionEpoch: 4,
      leaseExpiresAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    const db: PlatformDatabase = {
      $transaction: async (operation) =>
        operation({
          runtimeLease: {
            findUnique: vi.fn().mockResolvedValue({
              workspaceId: "workspace-1",
              activeRuntimeId: "runtime-1",
              executionEpoch: 4,
              leaseExpiresAt: new Date("2026-09-01T00:01:00.000Z"),
            }),
            upsert,
          },
          entitlementState: { upsert: vi.fn() },
          outboxEvent: { create: vi.fn() },
          paymentEvent: { findUnique: vi.fn(), create: vi.fn() },
          subscription: { upsert: vi.fn() },
        }),
    };

    await releaseRuntimeLease(db, {
      workspaceId: "workspace-1",
      runtimeId: "runtime-1",
      now: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ executionEpoch: 4 }) }),
    );
  });

  it("does not allow an authenticated account to replace an existing device public key", async () => {
    const { registerPlatformDevice } = await import("./platform.js");
    const db: PlatformDeviceDatabase = {
      device: {
        findUnique: vi.fn().mockResolvedValue({
          id: "device-1",
          userId: "user-1",
          workspaceId: "workspace-1",
          publicKey: "original-key",
          revokedAt: null,
        }),
        create: vi.fn(),
      },
    };

    await expect(
      registerPlatformDevice(db, {
        actor: { userId: "user-1", workspaceId: "workspace-1" },
        deviceId: "device-1",
        publicKey: "replacement-key",
      }),
    ).rejects.toThrow("Device identity cannot be replaced");
    expect(db.device.create).not.toHaveBeenCalled();
  });

  it("does not publish a sync-key envelope to another account's device", async () => {
    const { publishKeyEnvelope } = await import("./platform.js");
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({
        id: "device-sender",
        userId: "user-1",
        workspaceId: "workspace-1",
        publicKey: "sender-key",
        revokedAt: null,
      })
      .mockResolvedValueOnce({
        id: "device-recipient",
        userId: "user-2",
        workspaceId: "workspace-1",
        publicKey: "recipient-key",
        revokedAt: null,
      });
    const create = vi.fn();

    await expect(
      publishKeyEnvelope(
        {
          device: { findUnique },
          keyEnvelope: { findUnique: vi.fn(), create },
        } as any,
        {
          actor: { userId: "user-1", workspaceId: "workspace-1" },
          senderDeviceId: "device-sender",
          recipientDeviceId: "device-recipient",
          version: 1,
          ciphertext: "opaque-ciphertext",
        },
      ),
    ).rejects.toThrow("Key envelope devices are not trusted in this workspace");
    expect(create).not.toHaveBeenCalled();
  });

  it("reports offline when the current runtime heartbeat is stale", async () => {
    const { getPlatformRuntimeStatus } = await import("./platform.js");
    const status = await getPlatformRuntimeStatus(
      {
        runtimeLease: {
          findUnique: vi.fn().mockResolvedValue({
            workspaceId: "workspace-1",
            activeRuntimeId: "runtime-1",
            leaseExpiresAt: new Date("2026-09-02T00:01:00.000Z"),
          }),
        },
        runtime: {
          findUnique: vi.fn().mockResolvedValue({
            id: "runtime-1",
            deviceId: "device-1",
            workspaceId: "workspace-1",
            lastHeartbeat: new Date("2026-09-01T23:59:00.000Z"),
          }),
        },
        device: {
          findUnique: vi.fn().mockResolvedValue({
            id: "device-1",
            userId: "user-1",
            workspaceId: "workspace-1",
            revokedAt: null,
          }),
        },
      } as any,
      {
        actor: { userId: "user-1", workspaceId: "workspace-1" },
        now: new Date("2026-09-02T00:00:00.000Z"),
        heartbeatMaxAgeMs: 30_000,
      },
    );

    expect(status).toEqual({ online: false });
  });

  it("does not deliver a relay to a revoked runtime device", async () => {
    const { canDeliverRelay } = await import("./platform.js");
    const allowed = await canDeliverRelay(
      {
        runtimeLease: {
          findUnique: vi.fn().mockResolvedValue({
            workspaceId: "workspace-1",
            activeRuntimeId: "runtime-1",
            executionEpoch: 2,
            leaseExpiresAt: new Date("2026-09-02T00:01:00.000Z"),
          }),
        },
        runtime: {
          findUnique: vi.fn().mockResolvedValue({
            id: "runtime-1",
            deviceId: "device-1",
            workspaceId: "workspace-1",
            lastHeartbeat: new Date("2026-09-02T00:00:00.000Z"),
          }),
        },
        device: {
          findUnique: vi.fn().mockResolvedValue({
            id: "device-1",
            userId: "user-1",
            workspaceId: "workspace-1",
            revokedAt: new Date("2026-09-01T23:59:00.000Z"),
          }),
        },
      } as any,
      {
        actor: { userId: "user-1", workspaceId: "workspace-1" },
        runtimeId: "runtime-1",
        executionEpoch: 2,
        now: new Date("2026-09-02T00:00:00.000Z"),
        heartbeatMaxAgeMs: 30_000,
      },
    );

    expect(allowed).toBe(false);
  });

  it("calculates the current monthly Managed AI budget ratio from durable cost rows", async () => {
    const { getManagedAiBudgetRatio } = await import("./platform.js");
    const ratio = await getManagedAiBudgetRatio(
      {
        usageLedger: {
          aggregate: vi.fn().mockResolvedValue({ _sum: { actualCostMicros: 600n } }),
        },
        usageReservation: {
          aggregate: vi.fn().mockResolvedValue({ _sum: { estimatedCostMicros: 200n } }),
        },
      } as any,
      {
        actor: { userId: "user-1", workspaceId: "workspace-1" },
        now: new Date("2026-09-15T00:00:00.000Z"),
        monthlyBudgetMicros: 1_000n,
      },
    );

    expect(ratio).toBe(0.8);
  });

  it("increments the epoch when a different runtime takes an expired lease", async () => {
    const { acquireRuntimeLease } = await import("./platform.js");
    const now = new Date("2026-09-01T00:00:00.000Z");
    const db: PlatformDatabase = {
      $transaction: async (operation) =>
        operation({
          runtimeLease: {
            findUnique: vi.fn().mockResolvedValue({
              workspaceId: "workspace-1",
              activeRuntimeId: "runtime-a",
              executionEpoch: 1,
              leaseExpiresAt: new Date("2026-08-31T23:59:59.000Z"),
            }),
            upsert: vi.fn().mockResolvedValue({
              workspaceId: "workspace-1",
              activeRuntimeId: "runtime-b",
              executionEpoch: 2,
              leaseExpiresAt: new Date("2026-09-01T00:01:00.000Z"),
            }),
          },
          entitlementState: { upsert: vi.fn() },
          outboxEvent: { create: vi.fn() },
          paymentEvent: { findUnique: vi.fn(), create: vi.fn() },
          subscription: { upsert: vi.fn() },
        }),
    };

    await expect(
      acquireRuntimeLease(db, {
        workspaceId: "workspace-1",
        runtimeId: "runtime-b",
        now,
        leaseDurationMs: 60_000,
      }),
    ).resolves.toMatchObject({ executionEpoch: 2, activeRuntimeId: "runtime-b" });
  });

  it("writes the entitlement state and its outbox event in one transaction", async () => {
    const { applyEntitlementEvent } = await import("./platform.js");
    const entitlementState = { upsert: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }) };
    const outboxEvent = { create: vi.fn().mockResolvedValue({ id: "outbox-1" }) };
    const db: PlatformDatabase = {
      $transaction: async (operation) =>
        operation({
          runtimeLease: { findUnique: vi.fn(), upsert: vi.fn() },
          entitlementState,
          outboxEvent,
          paymentEvent: { findUnique: vi.fn(), create: vi.fn() },
          subscription: { upsert: vi.fn() },
        }),
    };

    await applyEntitlementEvent(db, {
      workspaceId: "workspace-1",
      planCode: "plus",
      state: "active_plus",
      eventId: "xendit-event-1",
      occurredAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(entitlementState.upsert).toHaveBeenCalledTimes(1);
    expect(outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dedupeKey: "xendit-event-1",
          type: "entitlement.changed",
        }),
      }),
    );
  });

  it("finalizes a reserved AI request into metadata-only usage", async () => {
    const { finalizeManagedAiUsage } = await import("./platform.js");
    let ledgerData: Record<string, unknown> | undefined;
    const usageLedger = {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        ledgerData = data;
        return Promise.resolve({ id: "ledger-1" });
      }),
    };
    const usageReservation = {
      findUnique: vi.fn().mockResolvedValue({
        id: "reservation-1",
        userId: "user-1",
        workspaceId: "workspace-1",
        status: "reserved",
      }),
      update: vi.fn().mockResolvedValue({ id: "reservation-1" }),
    };
    const db = {
      $transaction: async (operation: (tx: any) => Promise<void>) =>
        operation({ usageReservation, usageLedger }),
    };

    await finalizeManagedAiUsage(db as any, {
      actor: { userId: "user-1", workspaceId: "workspace-1" },
      reservationId: "reservation-1",
      provider: "openai",
      model: "luna",
      inputTokens: 12,
      outputTokens: 8,
      cachedInputTokens: 2,
      actualCostMicros: 42n,
      priceVersion: "2026-09-01",
      now: new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(usageLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reservationId: "reservation-1",
        provider: "openai",
        model: "luna",
        inputTokens: 12,
        outputTokens: 8,
        cachedInputTokens: 2,
        actualCostMicros: 42n,
        priceVersion: "2026-09-01",
      }),
    });
    expect(ledgerData).toBeDefined();
    expect(ledgerData!).not.toHaveProperty("prompt");
    expect(ledgerData!).not.toHaveProperty("response");
  });

  it("releases only the caller's still-reserved AI usage", async () => {
    const { releaseManagedAiUsage } = await import("./platform.js");
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });

    await releaseManagedAiUsage({ usageReservation: { updateMany } } as any, {
      actor: { userId: "user-1", workspaceId: "workspace-1" },
      reservationId: "reservation-1",
      now: new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "reservation-1",
        userId: "user-1",
        workspaceId: "workspace-1",
        status: "reserved",
      }),
      data: { status: "released", finalizedAt: new Date("2026-09-02T00:00:00.000Z") },
    });
  });
});
