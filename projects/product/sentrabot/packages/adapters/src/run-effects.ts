import { runLog } from "@sentrabot/core";
import { completeExternalEffect } from "./approval-effect.js";
import type { ExecutorDeps } from "./executor.js";

export async function recordEffect(
  deps: ExecutorDeps,
  run: { id: string; workspaceId: string; threadId: string; botId: string },
  kind: string,
  executionId: string,
  request: Record<string, unknown>,
) {
  const existing = await deps.prisma.externalEffect.findUnique({
    where: { idempotencyKey: executionId },
  });
  if (existing) {
    await deps.events.append({
      workspaceId: run.workspaceId,
      threadId: run.threadId,
      botId: run.botId,
      type: "effect.reconciled",
      runId: run.id,
      payload: { executionId, kind },
    });
    runLog("run.effect.recorded", {
      runId: run.id,
      kind,
      idempotencyKey: executionId,
      status: existing.status,
    });
    return { duplicate: true, effect: existing };
  }
  const effect = await deps.prisma.externalEffect.create({
    data: {
      workspaceId: run.workspaceId,
      runId: run.id,
      kind,
      idempotencyKey: executionId,
      status: "intended",
      request: request as never,
    },
  });
  runLog("run.effect.recorded", {
    runId: run.id,
    kind,
    idempotencyKey: executionId,
    status: effect.status,
  });
  return { duplicate: false, effect };
}

export async function completeEffect(
  deps: ExecutorDeps,
  effectId: string,
  expectedStatus: "intended" | "executing",
  result: unknown,
) {
  const storedResult =
    result &&
    typeof result === "object" &&
    (result as { kind?: unknown }).kind === "agent_tool_result" &&
    "details" in result
      ? (result as { details: unknown }).details
      : result;
  return completeExternalEffect(deps.prisma, effectId, expectedStatus, storedResult as never);
}

export function uncertainEffectError(toolName: string): Error {
  return new Error(
    `tool ${toolName} has an earlier execution with an uncertain outcome; it may already have completed, so verify the destination before retrying`,
  );
}
