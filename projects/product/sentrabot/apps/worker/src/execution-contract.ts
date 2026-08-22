import { z } from "zod";

export const executionRequestSchema = z.strictObject({
  requestId: z.string().min(1).max(128),
  workspaceId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  botId: z.string().min(1).max(128),
  prompt: z.string().trim().min(1).max(20_000),
  provider: z.string().min(1).max(128),
  model: z.string().min(1).max(256),
});

export type ExecutionRequest = z.infer<typeof executionRequestSchema>;

export type ExecutionResult = {
  requestId: string;
  status: "completed" | "failed";
  output?: string;
  error?: string;
};

export type ExecutionRuntime = {
  run: (request: ExecutionRequest) => Promise<string>;
};

export function createIdempotentExecutor(runtime: ExecutionRuntime) {
  const completed = new Map<string, Promise<ExecutionResult>>();

  return async function execute(input: unknown): Promise<ExecutionResult> {
    const request = executionRequestSchema.parse(input);
    const existing = completed.get(request.requestId);
    if (existing) return existing;

    const result = runtime
      .run(request)
      .then((output) => ({
        requestId: request.requestId,
        status: "completed" as const,
        output,
      }))
      .catch((error: unknown) => ({
        requestId: request.requestId,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Execution failed",
      }));
    completed.set(request.requestId, result);
    return result;
  };
}
