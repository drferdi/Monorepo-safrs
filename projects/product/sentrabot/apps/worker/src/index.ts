import { Hono } from "hono";
import {
  hasValidWorkerToken,
  workerControlRequestSchema,
} from "./control-contract.js";
import {
  createIdempotentExecutor,
  type ExecutionRuntime,
} from "./execution-contract.js";

export type WorkerEnvironment = {
  WORKER_CONTROL_TOKEN: string;
};

export function createWorkerControlApp(getEnv: () => WorkerEnvironment) {
  const app = new Hono();

  app.get("/health", (context) =>
    context.json({ ok: true as const, service: "worker" }),
  );
  app.post("/control/computer", async (context) => {
    if (!hasValidWorkerToken(context.req.raw, getEnv().WORKER_CONTROL_TOKEN)) {
      return context.json({ error: "Unauthorized" }, 401);
    }

    const parsed = workerControlRequestSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json({ error: "Invalid request" }, 400);
    }

    return context.json({
      ok: true as const,
      requestId: parsed.data.requestId,
      operation: parsed.data.operation.operation,
    });
  });

  return app;
}

export function createWorkerExecutor(runtime: ExecutionRuntime) {
  return createIdempotentExecutor(runtime);
}
