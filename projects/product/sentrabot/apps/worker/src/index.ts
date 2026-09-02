import type { JobPublisher, JobWorkerHost } from "@sentrabot/adapter-kit";
import { loadRootEnv } from "@sentrabot/core/node/load-root-env";

loadRootEnv();

import {
  composeAgentRuntime,
  createJobReconciler,
  createPostgresReconciliationLeadership,
  createRunSecretWriter,
  EncryptedSecretStore,
  GraphileJobPublisher,
  GraphileJobWorkerHost,
  InMemoryJobQueue,
  isComposioEnabled,
  isPipedreamEnabled,
  PipedreamConnector,
  PostgresRealtimeFanout,
  pipedreamConfigFromEnv,
  resolveDeploymentModel,
  resolveSandboxProvider,
} from "@sentrabot/adapters";
import { resolveEncryptionKey, resolveSupervisorToken } from "@sentrabot/core";
import { createDb, createThreadEvents } from "@sentrabot/db";
import { MarkdownMemoryStore } from "@sentrabot/memory";
import { workerMessagingFromEnv } from "./messaging.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const { prisma, pool } = createDb(databaseUrl);
  const realtime = new PostgresRealtimeFanout({
    connectionString: process.env.REALTIME_DATABASE_URL ?? databaseUrl,
    publisher: pool,
  });
  const secrets = new EncryptedSecretStore(resolveEncryptionKey(process.env));
  const events = createThreadEvents(prisma, realtime, {
    runSecretWriter: createRunSecretWriter(secrets),
  });
  const dataDir = process.env.DATA_DIR ?? "./data";
  // Same resolver the API uses, so both processes agree on provider, model and key.
  const { key: deploymentModelKey } = resolveDeploymentModel();
  const sandboxProvider = resolveSandboxProvider(process.env);
  const pipedreamConfig = pipedreamConfigFromEnv({
    pipedreamClientId: process.env.PIPEDREAM_CLIENT_ID,
    pipedreamClientSecret: process.env.PIPEDREAM_CLIENT_SECRET,
    pipedreamProjectId: process.env.PIPEDREAM_PROJECT_ID,
    pipedreamEnvironment: process.env.PIPEDREAM_ENVIRONMENT,
    encryptionKey: resolveEncryptionKey(process.env),
  });
  const pipedream = isPipedreamEnabled(pipedreamConfig)
    ? new PipedreamConnector(pipedreamConfig)
    : undefined;
  // Same messaging decision as the API: run.continue and phone.deliver execute in this process.
  const { messaging, whatsappMessaging, phoneLocale } = workerMessagingFromEnv(
    process.env,
    deploymentModelKey,
  );
  const inMemoryJobs = process.env.WAKEUP_DRIVER === "memory" ? new InMemoryJobQueue() : undefined;
  const jobs: JobPublisher = inMemoryJobs ?? new GraphileJobPublisher(databaseUrl);
  const jobHost: JobWorkerHost = inMemoryJobs ?? new GraphileJobWorkerHost(databaseUrl);
  const composition = await composeAgentRuntime({
    prisma,
    events,
    secrets,
    jobs,
    workerId: process.pid.toString(),
    dataDir,
    agentRuntime: process.env.AGENT_RUNTIME ?? "",
    sandboxProvider,
    sandbox: {
      supervisorUrl: process.env.SANDBOX_SUPERVISOR_URL ?? "http://127.0.0.1:7091",
      supervisorToken:
        sandboxProvider === "docker" ? resolveSupervisorToken(process.env) : undefined,
      e2bApiKey: process.env.E2B_API_KEY,
      daytonaApiKey: process.env.DAYTONA_API_KEY,
      daytonaApiUrl: process.env.DAYTONA_API_URL,
      daytonaTarget: process.env.DAYTONA_TARGET,
      boxApiKey: process.env.BOX_API_KEY,
      boxApiUrl: process.env.BOX_API_URL ?? process.env.BOX_BASE_URL,
      dataDir,
    },
    deploymentModelKey,
    composio: {
      enabled: isComposioEnabled(process.env.COMPOSIO_API_KEY),
      apiKey: process.env.COMPOSIO_API_KEY,
    },
    pipedream,
    mcp: {
      stdioEnabled: process.env.MCP_STDIO_ENABLED === "true",
      allowedCommands: (process.env.MCP_STDIO_ALLOWED_COMMANDS ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    },
    memory: new MarkdownMemoryStore(prisma),
    messaging,
    whatsappMessaging,
    phoneLocale,
  });
  await jobHost.start(composition.jobHandlers);
  const reconciler = createJobReconciler({
    prisma,
    jobs,
    events,
    leadership: createPostgresReconciliationLeadership(pool),
  });
  reconciler.start();

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await reconciler.stop();
    await jobHost.stop();
    await jobs.close();
    await realtime.close();
    await composition.stop();
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  };
  process.once("SIGTERM", () => void stop());
  process.once("SIGINT", () => void stop());

  console.log("sentrabot worker ready");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
