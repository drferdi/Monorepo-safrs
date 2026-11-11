import { describe, expect, it, vi } from "vitest";

describe("managed AI gateway", () => {
  it("persists usage metadata without private prompt or response", async () => {
    const { createManagedAiRoutes } = await import("./managed-ai.js");
    const reserveUsage = vi.fn().mockResolvedValue({ reservationId: "reservation-1" });
    const finalizeUsage = vi.fn().mockResolvedValue(undefined);
    const releaseUsage = vi.fn().mockResolvedValue(undefined);
    const app = createManagedAiRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedRuntime: async () => true,
      getBudgetRatio: async () => 0.8,
      reserveUsage,
      finalizeUsage,
      releaseUsage,
      estimateCostMicros: () => 100n,
      calculateActualCostMicros: () => 42n,
      providerId: "openai",
      priceVersion: "test",
      now: () => new Date("2026-09-02T00:00:00.000Z"),
      provider: {
        generate: async () => ({
          outputText: "private response",
          usage: { inputTokens: 3, outputTokens: 5 },
        }),
        stream: async function* () {},
      },
    });

    const response = await app.request("/v1/managed-ai/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: "device-1",
        runtimeId: "runtime-1",
        idempotencyKey: "request-1",
        complexity: "complex",
        input: "private prompt",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ outputText: "private response" });
    expect(reserveUsage).toHaveBeenCalledWith(
      expect.objectContaining({ capability: "managed_ai", estimatedCostMicros: 100n }),
    );
    expect(finalizeUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        model: "terra",
        inputTokens: 3,
        outputTokens: 5,
      }),
    );
    expect(finalizeUsage.mock.calls[0]?.[0]).not.toHaveProperty("input");
    expect(finalizeUsage.mock.calls[0]?.[0]).not.toHaveProperty("outputText");
  });

  it("releases an unused reservation when the provider fails", async () => {
    const { createManagedAiRoutes } = await import("./managed-ai.js");
    const releaseUsage = vi.fn().mockResolvedValue(undefined);
    const app = createManagedAiRoutes({
      authenticate: async () => ({ userId: "user-1", workspaceId: "workspace-1" }),
      isTrustedRuntime: async () => true,
      getBudgetRatio: async () => 0,
      reserveUsage: async () => ({ reservationId: "reservation-1" }),
      finalizeUsage: async () => undefined,
      releaseUsage,
      estimateCostMicros: () => 100n,
      calculateActualCostMicros: () => 0n,
      providerId: "openai",
      priceVersion: "test",
      now: () => new Date("2026-09-02T00:00:00.000Z"),
      provider: {
        generate: async () => {
          throw new Error("provider unavailable");
        },
        stream: async function* () {},
      },
    });

    const response = await app.request("/v1/managed-ai/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: "device-1",
        runtimeId: "runtime-1",
        idempotencyKey: "request-1",
        complexity: "simple",
        input: "private prompt",
      }),
    });

    expect(response.status).toBe(502);
    expect(releaseUsage).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: "reservation-1" }),
    );
  });
});
