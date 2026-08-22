import { z } from "zod";
import {
  type ExecutionRequest,
  executionRequestSchema,
} from "./execution-contract.js";

export const scheduledRoutineSchema = z.strictObject({
  routineId: z.string().min(1).max(128),
  workspaceId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  botId: z.string().min(1).max(128),
  prompt: z.string().trim().min(1).max(20_000),
  provider: z.string().min(1).max(128),
  model: z.string().min(1).max(256),
});

export type ScheduledRoutine = z.infer<typeof scheduledRoutineSchema>;

export function routineToExecutionRequest(
  routine: ScheduledRoutine,
  requestId: string,
): ExecutionRequest {
  return executionRequestSchema.parse({
    requestId,
    workspaceId: routine.workspaceId,
    userId: routine.userId,
    botId: routine.botId,
    prompt: routine.prompt,
    provider: routine.provider,
    model: routine.model,
  });
}

export function createRoutineScheduler(input: {
  enqueue: (request: ExecutionRequest) => Promise<void>;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());
  return async (routineInput: unknown) => {
    const routine = scheduledRoutineSchema.parse(routineInput);
    const requestId = `routine:${routine.routineId}:${now().toISOString()}`;
    const request = routineToExecutionRequest(routine, requestId);
    await input.enqueue(request);
    return request;
  };
}
