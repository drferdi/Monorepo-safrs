import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type {
  JobPublisher,
  ManagedConnectorProvider,
  MessagingProvider,
  RealtimeFanout,
  SandboxProvider,
} from "@sentrabot/adapter-kit";
import {
  applyPhoneOutboundStatus,
  type ComposioProvider,
  type ConnectorRegistry,
  composeAgentRuntime,
  createJobReconciler,
  type createRunExecutor,
  createRunSecretWriter,
  type DestinationEmulator,
  destroyBot,
  EncryptedSecretStore,
  GraphileJobPublisher,
  InMemoryJobQueue,
  InMemoryRealtimeFanout,
  isComposioEnabled,
  isPhoneSurfaceEnabled,
  isPipedreamEnabled,
  isWhatsAppEnabled,
  OpenAiManagedProvider,
  PiOAuthLogins,
  PipedreamConnector,
  PostgresRealtimeFanout,
  parseSendBlueInbound,
  parseWhatsAppInbound,
  pipedreamConfigFromEnv,
  pushTokenPath,
  type RemoteConnectorDependencies,
  SendBlueMessagingProvider,
  sendBlueConfigFromEnv,
  verifyWhatsAppSignature,
  WhatsAppMessagingProvider,
  whatsAppConfigFromEnv,
  XenditCheckoutProvider,
} from "@sentrabot/adapters";
import { blockedAuthPaths, createAuth } from "@sentrabot/auth";
import { normalizePhoneLocale, signupPolicyFromEnv } from "@sentrabot/core";
import {
  acknowledgeWorkspaceE2eeMigration,
  acquireRuntimeLease,
  applyVerifiedPaymentEvent,
  beginCheckout,
  canDeliverRelay,
  createDb,
  createPlatformDatabase,
  createPlatformRuntimeDatabase,
  createThreadEvents,
  exportLegacyPrivateState,
  finalizeManagedAiUsage,
  findPaymentTargetByProviderReference,
  getManagedAiBudgetRatio,
  getPlatformRuntimeStatus,
  heartbeatPlatformRuntime,
  isTrustedPlatformDevice,
  isTrustedPlatformRuntime,
  listEncryptedSyncObjects,
  listKeyEnvelopesForDevice,
  listTrustedPlatformDevices,
  type PrismaClient,
  provisionPhoneIdentity,
  publishKeyEnvelope,
  putEncryptedSyncObject,
  registerPlatformDevice,
  registerPlatformRuntime,
  releaseManagedAiUsage,
  releaseRuntimeLease,
  renewRuntimeLease,
  requireMembership,
  reserveManagedAiUsage,
  revokePlatformDevice,
  tombstoneEncryptedSyncObject,
} from "@sentrabot/db";
import { MarkdownMemoryStore } from "@sentrabot/memory";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBillingRoutes } from "./billing-routes.js";
import { type AppEnv, loadEnv } from "./env.js";
import { createManagedAiRoutes } from "./managed-ai.js";
import {
  calculateOpenAiCostMicros,
  estimateOpenAiCostMicros,
  openAiPriceVersion,
} from "./managed-ai-pricing.js";
import { createPhoneInboundHandler } from "./phone-inbound.js";
import { createPhoneTranscriber, ingestPhoneMedia } from "./phone-media.js";
import { mountPhoneWebhookRoutes } from "./phone-webhook.js";
import { createPlatformRoutes } from "./platform-routes.js";
import { createRelayRoutes } from "./relay-routes.js";
import { createRouter } from "./router.js";
import { mountVoiceHttpRoutes } from "./voice.js";
import { mountWebhookHttpRoutes } from "./webhook.js";
import { completeWhatsAppPairing } from "./whatsapp-pairing.js";
import { mountWhatsAppWebhookRoutes } from "./whatsapp-webhook.js";
import { mountXenditWebhookRoutes } from "./xendit-webhook.js";

export interface AppHandles {
  app: Hono;
  prisma: PrismaClient;
  jobs: JobPublisher;
  sandbox: SandboxProvider;
  connector: DestinationEmulator;
  composio?: ComposioProvider;
  connectors: ConnectorRegistry;
  messaging?: MessagingProvider;
  executor: ReturnType<typeof createRunExecutor>;
  stop: () => Promise<void>;
}

export async function createApp(
  overrides: Partial<AppEnv> & {
    prisma?: PrismaClient;
    realtime?: RealtimeFanout;
    composio?: ComposioProvider;
    pipedream?: ManagedConnectorProvider;
    messaging?: MessagingProvider;
    remoteConnectors?: RemoteConnectorDependencies;
  } = {},
): Promise<AppHandles> {
  const {
    prisma: prismaOverride,
    realtime: realtimeOverride,
    composio: composioOverride,
    pipedream: pipedreamOverride,
    messaging: messagingOverride,
    remoteConnectors,
    ...envOverrides
  } = overrides;
  const env = { ...loadEnv(process.env), ...envOverrides };
  const created = prismaOverride
    ? { prisma: prismaOverride, pool: undefined }
    : createDb(env.databaseUrl);
  const { prisma } = created;
  created.pool?.on("error", () => undefined);
  const realtime =
    realtimeOverride ??
    (created.pool
      ? new PostgresRealtimeFanout({
          connectionString: env.realtimeDatabaseUrl,
          publisher: created.pool,
        })
      : new InMemoryRealtimeFanout());
  const secrets = new EncryptedSecretStore(env.encryptionKey);
  const events = createThreadEvents(prisma, realtime, {
    runSecretWriter: createRunSecretWriter(secrets),
  });
  const environmentSignupPolicy = signupPolicyFromEnv(env);
  const deploymentSettings = await prisma.deploymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      signupsEnabled: environmentSignupPolicy.enabled,
      signupAllowlist: environmentSignupPolicy.allowlist.join(","),
      signupPolicyInitialized: true,
    },
    update: {},
  });
  if (!deploymentSettings.signupPolicyInitialized) {
    // Older versions created this row with schema defaults even though auth
    // still enforced the environment policy. Copy that effective policy once
    // so upgrades preserve behavior before Settings becomes authoritative.
    await prisma.deploymentSettings.updateMany({
      where: { id: "default", signupPolicyInitialized: false },
      data: {
        signupsEnabled: environmentSignupPolicy.enabled,
        signupAllowlist: environmentSignupPolicy.allowlist.join(","),
        signupPolicyInitialized: true,
      },
    });
  }

  const jobKind = env.wakeupDriver;
  const inMemoryJobs = jobKind === "memory" ? new InMemoryJobQueue() : undefined;
  const jobs = inMemoryJobs ?? new GraphileJobPublisher(env.databaseUrl);
  const oauthLogins = new PiOAuthLogins();
  const memory = new MarkdownMemoryStore(prisma);
  const pipedreamConfig = pipedreamConfigFromEnv(env);
  const pipedream =
    pipedreamOverride ??
    (isPipedreamEnabled(pipedreamConfig) ? new PipedreamConnector(pipedreamConfig) : undefined);
  const sendBlueConfig = sendBlueConfigFromEnv(env);
  const messaging =
    messagingOverride ??
    (isPhoneSurfaceEnabled(sendBlueConfig, env.deploymentModelKey)
      ? new SendBlueMessagingProvider(sendBlueConfig)
      : undefined);
  const whatsAppConfig = whatsAppConfigFromEnv(env);
  // Pairing binds real users (their own model credentials), so WhatsApp does
  // not require the deployment model key; only unknown-number provisioning
  // does, and that is gated separately below.
  const whatsappMessaging = isWhatsAppEnabled(whatsAppConfig)
    ? new WhatsAppMessagingProvider(whatsAppConfig)
    : undefined;
  const phoneLocale = normalizePhoneLocale(env.phoneLocale);
  const phoneTranscriber = createPhoneTranscriber({
    provider: env.phoneTranscribeProvider,
    apiKey: env.phoneTranscribeApiKey,
  });
  const composition = await composeAgentRuntime({
    prisma,
    events,
    secrets,
    jobs,
    workerId: "api",
    dataDir: env.dataDir,
    agentRuntime: env.agentRuntime,
    sandboxProvider: env.sandboxProvider,
    sandbox: {
      supervisorUrl: env.sandboxSupervisorUrl,
      supervisorToken: env.sandboxSupervisorToken,
      e2bApiKey: env.e2bApiKey,
      daytonaApiKey: env.daytonaApiKey,
      daytonaApiUrl: env.daytonaApiUrl,
      daytonaTarget: env.daytonaTarget,
      boxApiKey: env.boxApiKey,
      boxApiUrl: env.boxApiUrl,
      dataDir: env.dataDir,
    },
    deploymentModelKey: env.deploymentModelKey,
    composio: {
      enabled: isComposioEnabled(env.composioApiKey),
      apiKey: env.composioApiKey,
      override: composioOverride,
    },
    pipedream,
    mcp: {
      stdioEnabled: env.mcpStdioEnabled,
      allowedCommands: env.mcpStdioAllowedCommands,
    },
    remoteConnectors,
    memory,
    messaging,
    whatsappMessaging,
    phoneLocale,
  });
  const { sandbox, home, artifacts, stack, connector, executor, jobHandlers } = composition;
  const auth = createAuth(prisma, {
    secret: env.authSecret,
    baseURL: env.authUrl,
    webOrigin: env.webOrigin,
    signupsEnabled: env.signupsEnabled,
    signupAllowlist: env.signupAllowlist,
    extraOrigins: [
      "sentrabot://",
      "exp://",
      "exp://*",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
    ],
    beforeDeleteUser: async (userId) => {
      const bots = await prisma.bot.findMany({
        where: { userId },
        select: { id: true, workspaceId: true, name: true, archivedAt: true },
      });
      await Promise.all(
        bots.map((bot) =>
          destroyBot(
            { prisma, sandbox, home, jobs, artifacts, dataDir: env.dataDir },
            bot,
            {
              operationId: `account-delete:${userId}`,
              traceId: `account-delete:${userId}`,
              workspaceId: bot.workspaceId,
              userId,
              botId: bot.id,
              signal: new AbortController().signal,
            },
            { deleteMemories: true },
          ),
        ),
      );
      await rm(pushTokenPath(env.dataDir, userId), { force: true }).catch(() => undefined);
    },
  });
  if (inMemoryJobs) {
    await inMemoryJobs.start(jobHandlers);
  }
  const reconciler = inMemoryJobs ? createJobReconciler({ prisma, jobs }) : undefined;
  reconciler?.start();

  const router = createRouter({
    prisma,
    events,
    auth,
    jobs,
    sandbox,
    memory,
    memoryProviders: composition.memoryProviders,
    home,
    secrets,
    oauthLogins,
    mcpOAuth: composition.mcpOAuth,
    composio: stack.composio,
    connectors: stack.connector,
    remoteConnectors,
    artifacts,
    dataDir: env.dataDir,
    phone: { enabled: Boolean(messaging) },
    whatsapp: {
      enabled: Boolean(whatsappMessaging),
      businessPhoneE164: env.whatsappBusinessPhoneE164 ?? null,
    },
    env: {
      defaultProvider: env.defaultProvider,
      defaultModel: env.defaultModel,
      deploymentModelKey: env.deploymentModelKey,
      webOrigin: env.webOrigin,
      screenProxySecret: env.screenProxySecret,
      sandboxProvider: env.sandboxProvider,
      gitSha: env.gitSha,
      updaterUrl: env.updaterUrl,
      updaterToken: env.updaterToken,
      imageTag: env.imageTag,
    },
  });
  const rpc = new RPCHandler(router, {
    clientInterceptors: [onError((error, { path }) => logUnexpectedRpcError(error, path))],
  });
  const app = new Hono();
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return env.webOrigin;
        return isTrustedOrigin(origin, env) ? origin : "";
      },
      credentials: true,
    }),
  );
  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const path = new URL(c.req.url).pathname.replace("/api/auth", "");
    if (blockedAuthPaths.some((blocked) => path.startsWith(blocked))) {
      return c.json({ error: "Not available in version 1" }, 404);
    }
    return auth.handler(c.req.raw);
  });
  const platformRuntimeDb = createPlatformRuntimeDatabase(prisma);
  const platformDb = createPlatformDatabase(prisma);
  // The ciphertext relay is part of the frozen hybrid control-plane work: no client consumes
  // it yet, and threads.subscribe is the one activity stream. Mount it only on explicit opt-in.
  if (env.controlPlaneRelay) {
    app.route(
      "/",
      createRelayRoutes({
        authenticate: async (request) => {
          const session = await auth.api.getSession({ headers: sessionHeaders(request) });
          if (!session?.user) return null;
          return requireMembership(prisma, session.user.id).catch(() => null);
        },
        isTrustedDevice: (input) => isTrustedPlatformDevice(platformRuntimeDb, input),
        isTrustedRuntime: (input) => isTrustedPlatformRuntime(platformRuntimeDb, input),
        canDeliver: (input) =>
          canDeliverRelay(prisma, { ...input, now: new Date(), heartbeatMaxAgeMs: 30_000 }),
        publish: (topic, payload) => realtime.publish(topic, payload),
        subscribe: (topic, onMessage) => realtime.subscribe(topic, onMessage),
      }),
    );
  }
  if (env.openaiApiKey && env.managedAiFreeBudgetMicros) {
    const provider = new OpenAiManagedProvider({ apiKey: env.openaiApiKey });
    app.route(
      "/",
      createManagedAiRoutes({
        authenticate: async (request) => {
          const session = await auth.api.getSession({ headers: sessionHeaders(request) });
          if (!session?.user) return null;
          return requireMembership(prisma, session.user.id).catch(() => null);
        },
        isTrustedRuntime: (input) => isTrustedPlatformRuntime(platformRuntimeDb, input),
        getBudgetRatio: (input) =>
          getManagedAiBudgetRatio(prisma, {
            actor: input.actor,
            now: new Date(),
            monthlyBudgetMicros: env.managedAiFreeBudgetMicros!,
          }),
        reserveUsage: (input) => reserveManagedAiUsage(prisma, input),
        finalizeUsage: (input) => finalizeManagedAiUsage(prisma, input),
        releaseUsage: (input) => releaseManagedAiUsage(prisma, input),
        estimateCostMicros: estimateOpenAiCostMicros,
        calculateActualCostMicros: calculateOpenAiCostMicros,
        now: () => new Date(),
        provider,
        providerId: "openai",
        priceVersion: openAiPriceVersion,
      }),
    );
  }
  if (env.xenditApiKey) {
    const checkoutProvider = new XenditCheckoutProvider({ apiKey: env.xenditApiKey });
    app.route(
      "/",
      createBillingRoutes({
        authenticate: async (request) => {
          const session = await auth.api.getSession({ headers: sessionHeaders(request) });
          if (!session?.user) return null;
          return requireMembership(prisma, session.user.id).catch(() => null);
        },
        beginCheckout: (input) => beginCheckout(prisma, input),
        createCheckout: (input) => checkoutProvider.createCheckout(input),
        newReference: randomUUID,
        successReturnUrl: `${env.webOrigin}/billing/success`,
        cancelReturnUrl: `${env.webOrigin}/billing/cancel`,
      }),
    );
  }
  app.route(
    "/",
    createPlatformRoutes({
      authenticate: async (request) => {
        const session = await auth.api.getSession({ headers: sessionHeaders(request) });
        if (!session?.user) return null;
        return requireMembership(prisma, session.user.id).catch(() => null);
      },
      isTrustedDevice: (input) => isTrustedPlatformDevice(platformRuntimeDb, input),
      listDevices: (actor) => listTrustedPlatformDevices(prisma, actor),
      runtimeStatus: (actor) =>
        getPlatformRuntimeStatus(prisma, {
          actor,
          now: new Date(),
          heartbeatMaxAgeMs: 30_000,
        }),
      registerDevice: (input) => registerPlatformDevice(platformRuntimeDb, input),
      registerRuntime: (input) => registerPlatformRuntime(platformRuntimeDb, input),
      isTrustedRuntime: (input) => isTrustedPlatformRuntime(platformRuntimeDb, input),
      canAcknowledgeE2eeMigration: (input) =>
        canDeliverRelay(prisma, { ...input, now: new Date(), heartbeatMaxAgeMs: 30_000 }),
      revokeDevice: (input) => revokePlatformDevice(prisma, { ...input, now: new Date() }),
      publishKeyEnvelope: (input) => publishKeyEnvelope(prisma, input),
      listKeyEnvelopes: (input) => listKeyEnvelopesForDevice(prisma, input),
      putSyncObject: (input) => putEncryptedSyncObject(prisma, input),
      listSyncObjects: (input) => listEncryptedSyncObjects(prisma, input),
      deleteSyncObject: async (input) => {
        await tombstoneEncryptedSyncObject(prisma, { ...input, now: new Date() });
      },
      acquireRuntimeLease: async (input) => {
        const lease = await acquireRuntimeLease(platformDb, {
          workspaceId: input.workspaceId,
          runtimeId: input.runtimeId,
          now: new Date(),
          leaseDurationMs: 30_000,
        });
        return { ...lease, leaseExpiresAt: lease.leaseExpiresAt.toISOString() };
      },
      renewRuntimeLease: async (input) => {
        const lease = await renewRuntimeLease(platformDb, {
          workspaceId: input.workspaceId,
          runtimeId: input.runtimeId,
          now: new Date(),
          leaseDurationMs: 30_000,
        });
        return { ...lease, leaseExpiresAt: lease.leaseExpiresAt.toISOString() };
      },
      releaseRuntimeLease: (input) =>
        releaseRuntimeLease(platformDb, {
          workspaceId: input.workspaceId,
          runtimeId: input.runtimeId,
          now: new Date(),
        }),
      heartbeatRuntime: (input) =>
        heartbeatPlatformRuntime(platformRuntimeDb, { ...input, now: new Date() }),
      acknowledgeE2eeMigration: ({ actor }) =>
        acknowledgeWorkspaceE2eeMigration(prisma, {
          workspaceId: actor.workspaceId,
          now: new Date(),
        }),
      exportLegacyPrivateState: (actor) => exportLegacyPrivateState(prisma, actor),
    }),
  );
  if (env.xenditCallbackToken) {
    mountXenditWebhookRoutes(app, {
      callbackToken: env.xenditCallbackToken,
      resolvePaymentTarget: (reference) => findPaymentTargetByProviderReference(prisma, reference),
      applyVerifiedPayment: (input) => applyVerifiedPaymentEvent(platformDb, input),
    });
  }
  app.use("/rpc/*", async (c, next) => {
    const session = await auth.api.getSession({ headers: sessionHeaders(c.req.raw) });
    const actor = session?.user
      ? await requireMembership(prisma, session.user.id).catch(() => null)
      : null;
    const { matched, response } = await rpc.handle(c.req.raw, {
      prefix: "/rpc",
      context: { actor, signal: c.req.raw.signal },
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
  });
  mountVoiceHttpRoutes(app, { prisma, secrets }, async (c) => {
    const session = await auth.api.getSession({ headers: sessionHeaders(c.req.raw) });
    if (!session?.user) return null;
    return requireMembership(prisma, session.user.id).catch(() => null);
  });
  mountWebhookHttpRoutes(app, { prisma, secrets, events, jobs });
  // The phone webhook only exists when the messaging surface is enabled.
  if (messaging && env.sendblueSigningSecret) {
    mountPhoneWebhookRoutes(app, {
      signingSecret: env.sendblueSigningSecret,
      signingHeader: "sb-signing-secret",
      parseInbound: parseSendBlueInbound,
      handleStatus: (event) => applyPhoneOutboundStatus(prisma, event),
      handle: createPhoneInboundHandler({
        prisma,
        events,
        jobs,
        provision: (phoneE164, policyEnv) => provisionPhoneIdentity(prisma, phoneE164, policyEnv),
        signupPolicy: {
          signupsEnabled: env.signupsEnabled,
          signupAllowlist: env.signupAllowlist,
        },
        lineNumber: env.sendbluePhoneNumber ?? "",
        locale: phoneLocale,
        typing: (toNumber) => {
          // Keep the raw phone number out of trace ids — those reach logs
          // and telemetry, a different trust boundary than the database.
          const operationId = `phone.typing:${randomUUID()}`;
          return (
            messaging.sendTypingIndicator?.(
              { to: toNumber },
              {
                operationId,
                traceId: operationId,
                workspaceId: "",
                userId: "",
                // Cosmetic side call: bound it so a stalled vendor response
                // can never pin the webhook handler's event loop slot.
                signal: AbortSignal.timeout(2000),
              },
            ) ?? Promise.resolve()
          );
        },
      }),
    });
  }

  // The WhatsApp webhook only exists when the Cloud API channel is enabled.
  if (whatsappMessaging) {
    mountWhatsAppWebhookRoutes(app, {
      verifyToken: whatsAppConfig.verifyToken,
      verifySignature: (rawBody, signatureHeader) =>
        verifyWhatsAppSignature(rawBody, signatureHeader, whatsAppConfig.appSecret),
      parseInbound: parseWhatsAppInbound,
      locale: phoneLocale,
      completePairing: (code, phoneE164) => completeWhatsAppPairing(prisma, code, phoneE164),
      sendReply: async (toE164, body) => {
        const operationId = `whatsapp.pair-reply:${randomUUID()}`;
        await whatsappMessaging.sendDirect(
          { to: toE164, body },
          {
            operationId,
            traceId: operationId,
            workspaceId: "",
            userId: "",
            signal: AbortSignal.timeout(10_000),
          },
        );
      },
      handle: createPhoneInboundHandler({
        prisma,
        events,
        jobs,
        provision: env.deploymentModelKey
          ? (phoneE164, policyEnv) =>
              provisionPhoneIdentity(prisma, phoneE164, policyEnv, { provider: "whatsapp" })
          : () => {
              // Unknown-number provisioning needs the deployment model key
              // (synthetic users have no per-user credential). Paired users
              // never hit this path.
              throw new Error("WhatsApp provisioning requires a deployment model key");
            },
        signupPolicy: {
          signupsEnabled: env.signupsEnabled,
          signupAllowlist: env.signupAllowlist,
        },
        lineNumber: env.whatsappBusinessPhoneE164 ?? "",
        locale: phoneLocale,
        ingestMedia: (owner, media) =>
          ingestPhoneMedia(
            {
              prisma,
              artifacts,
              fetchMedia: (mediaId, mediaContext) =>
                whatsappMessaging.fetchMedia!(mediaId, mediaContext),
              transcribe: phoneTranscriber,
              locale: phoneLocale,
            },
            owner,
            media,
          ),
      }),
    });
  }

  app.get("/health", (c) =>
    c.json({
      ok: true,
      runtime: env.agentRuntime,
      sandbox: env.sandboxProvider,
      composio: Boolean(stack.composio),
      pipedream: Boolean(pipedream),
      phone: Boolean(messaging),
      whatsapp: Boolean(whatsappMessaging),
      jobs: jobKind,
      realtime: realtime.describe().id,
      revision: env.gitSha ?? null,
    }),
  );

  return {
    app,
    prisma,
    jobs,
    sandbox,
    connector,
    composio: stack.composio,
    connectors: stack.connector,
    messaging,
    executor,
    stop: async () => {
      oauthLogins.abortAll();
      await reconciler?.stop();
      await jobs.close();
      await realtime.close();
      await composition.stop();
      await prisma.$disconnect().catch(() => undefined);
      await created.pool?.end().catch(() => undefined);
    },
  };
}

function isTrustedOrigin(origin: string, env: AppEnv) {
  if (!origin) return true;
  if (origin === env.webOrigin || origin === env.apiUrl || origin === env.authUrl) return true;
  if (origin.startsWith("sentrabot://") || origin.startsWith("exp://")) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function sessionHeaders(request: Request) {
  const headers = new Headers(request.headers);
  const authz = headers.get("authorization");
  if (authz?.toLowerCase().startsWith("bearer ") && !headers.get("cookie")) {
    headers.set("cookie", `better-auth.session_token=${authz.slice(7).trim()}`);
  }
  return headers;
}

/**
 * An ORPCError is a decision the router made (BAD_REQUEST, UNAUTHORIZED, ...) and reaches the
 * caller intact. Everything else is flattened into an opaque "Internal server error", so
 * unless it is logged here the only record of what actually broke is gone.
 *
 * The cause chain matters as much as the message: undici and most SDKs report a bare
 * "fetch failed" and keep the host and errno one level down.
 */
export function logUnexpectedRpcError(error: unknown, path: readonly string[]): void {
  if (error instanceof ORPCError) return;
  const where = `rpc ${path.join("/")} failed`;
  if (!(error instanceof Error)) {
    console.error(where, String(error));
    return;
  }
  const chain: string[] = [];
  for (let current: unknown = error; current instanceof Error && chain.length < 4; ) {
    chain.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  console.error(where, chain.join(" <- "), error.stack ?? "");
}
