import { Hono } from "hono";
import {
  hasValidSupervisorToken,
  isSafeComputerPath,
  supervisorRequestSchema,
} from "./contract.js";
import {
  createIsolatedDockerExecutor,
  type DockerExecutor,
} from "./docker-policy.js";

export type SupervisorEnvironment = {
  SUPERVISOR_TOKEN: string;
  ready?: boolean;
  docker?: DockerExecutor;
};

export function createSupervisorApp(getEnv: () => SupervisorEnvironment) {
  const app = new Hono();

  app.get("/health", (context) =>
    context.json({ ok: true as const, service: "sandbox-supervisor" }),
  );
  app.get("/ready", (context) => {
    const ready = getEnv().ready ?? false;
    return context.json(
      { ok: ready as true, service: "sandbox-supervisor" },
      ready ? 200 : 503,
    );
  });
  app.post("/computers/:computerId/operations", async (context) => {
    const env = getEnv();
    if (
      !hasValidSupervisorToken(
        context.req.header("authorization"),
        env.SUPERVISOR_TOKEN,
      )
    )
      return context.json({ error: "Unauthorized" }, 401);
    const computerId = context.req.param("computerId");
    if (!isSafeComputerPath(computerId))
      return context.json({ error: "Invalid computer id" }, 400);
    const parsed = supervisorRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!parsed.success || parsed.data.actor.computerId !== computerId)
      return context.json({ error: "Invalid request" }, 400);
    if (parsed.data.operation.operation === "boot") {
      if (!env.docker)
        return context.json(
          {
            error: "Docker executor is disabled",
            requestId: parsed.data.requestId,
          },
          503,
        );
      const result = await createIsolatedDockerExecutor(env.docker).boot({
        computerId,
        botId: parsed.data.actor.botId,
        workspaceId: parsed.data.actor.workspaceId,
        image: "ghcr.io/sentra/sentrabot-sandbox:0.1.0",
        workspacePath: `/srv/sentrabot/workspaces/${parsed.data.actor.workspaceId}`,
      });
      return context.json(
        {
          ok: true as const,
          requestId: parsed.data.requestId,
          containerId: result.containerId,
        },
        202,
      );
    }
    return context.json(
      {
        error: "Supervisor operation is not enabled",
        requestId: parsed.data.requestId,
      },
      501,
    );
  });
  return app;
}
