import type { AIProvider, AIResponse, AIUsage, ManagedAiModelClass } from "@sentrabot/adapter-kit";
import { type ManagedAiComplexity, routeManagedAi } from "@sentrabot/core";
import { Hono } from "hono";

const MAX_MANAGED_AI_INPUT_CHARACTERS = 8_000;
const MAX_MANAGED_AI_OUTPUT_TOKENS = 2_048;

export interface ManagedAiActor {
  userId: string;
  workspaceId: string;
}

export interface ManagedAiRouteDependencies {
  authenticate(request: Request): Promise<ManagedAiActor | null>;
  isTrustedRuntime(input: {
    actor: ManagedAiActor;
    deviceId: string;
    runtimeId: string;
  }): Promise<boolean>;
  getBudgetRatio(input: { actor: ManagedAiActor }): Promise<number>;
  reserveUsage(input: {
    actor: ManagedAiActor;
    idempotencyKey: string;
    capability: "managed_ai";
    estimatedCostMicros: bigint;
    expiresAt: Date;
  }): Promise<{ reservationId: string }>;
  finalizeUsage(input: {
    actor: ManagedAiActor;
    reservationId: string;
    provider: string;
    model: ManagedAiModelClass;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    actualCostMicros: bigint;
    priceVersion: string;
    now: Date;
  }): Promise<void>;
  releaseUsage(input: { actor: ManagedAiActor; reservationId: string; now: Date }): Promise<void>;
  estimateCostMicros(model: ManagedAiModelClass): bigint;
  calculateActualCostMicros(input: { model: ManagedAiModelClass; usage: AIUsage }): bigint;
  providerId: string;
  priceVersion: string;
  now(): Date;
  provider: AIProvider;
}

export function createManagedAiRoutes(dependencies: ManagedAiRouteDependencies): Hono {
  const app = new Hono();
  app.post("/v1/managed-ai/responses", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const body = await context.req.json().catch(() => null);
    if (!isManagedAiRequest(body))
      return context.json({ error: "Invalid managed AI request" }, 400);
    if (
      !(await dependencies.isTrustedRuntime({
        actor,
        deviceId: body.deviceId,
        runtimeId: body.runtimeId,
      }))
    ) {
      return context.json({ error: "Untrusted runtime" }, 403);
    }

    const route = routeManagedAi({
      complexity: body.complexity,
      consumedRatio: await dependencies.getBudgetRatio({ actor }),
    });
    const now = dependencies.now();
    const reservation = await dependencies.reserveUsage({
      actor,
      idempotencyKey: body.idempotencyKey,
      capability: "managed_ai",
      estimatedCostMicros: dependencies.estimateCostMicros(route.modelClass),
      expiresAt: new Date(now.getTime() + 5 * 60_000),
    });
    let response: AIResponse;
    try {
      response = await dependencies.provider.generate({
        modelClass: route.modelClass,
        input: body.input,
        instructions: body.instructions,
        maxOutputTokens: MAX_MANAGED_AI_OUTPUT_TOKENS,
      });
    } catch {
      await dependencies.releaseUsage({
        actor,
        reservationId: reservation.reservationId,
        now: dependencies.now(),
      });
      return context.json({ error: "Managed AI temporarily unavailable" }, 502);
    }
    await dependencies.finalizeUsage({
      actor,
      reservationId: reservation.reservationId,
      provider: dependencies.providerId,
      model: route.modelClass,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cachedInputTokens: response.usage.cachedInputTokens ?? 0,
      actualCostMicros: dependencies.calculateActualCostMicros({
        model: route.modelClass,
        usage: response.usage,
      }),
      priceVersion: dependencies.priceVersion,
      now: dependencies.now(),
    });
    return context.json({ outputText: response.outputText });
  });
  return app;
}

function isManagedAiRequest(value: unknown): value is {
  deviceId: string;
  runtimeId: string;
  idempotencyKey: string;
  complexity: ManagedAiComplexity;
  input: string;
  instructions?: string;
} {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.deviceId === "string" &&
    typeof input.runtimeId === "string" &&
    typeof input.idempotencyKey === "string" &&
    typeof input.input === "string" &&
    input.input.length <= MAX_MANAGED_AI_INPUT_CHARACTERS &&
    (input.instructions === undefined || typeof input.instructions === "string") &&
    (input.complexity === "simple" ||
      input.complexity === "standard" ||
      input.complexity === "complex")
  );
}
