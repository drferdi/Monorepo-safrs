import { createHash, randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import {
  type AdapterContext,
  type AgentHomeStore,
  type ArtifactStore,
  type ConnectorCatalogItem,
  type JobPublisher,
  type MemoryStore,
  runContinueJob,
  runJobKey,
  type SandboxProvider,
} from "@sentrabot/adapter-kit";
import {
  archiveBot,
  buildModelConnectPlaintext,
  type ComposioProvider,
  type ConnectorRegistry,
  checkpointAndRecordComputerWorkspace,
  createVoiceProvider,
  deletePushToken,
  deploymentAutoReviewDefault,
  destroyBot,
  type EncryptedSecretStore,
  hasActiveComputerControl,
  isAutoReviewCheckerConfigured,
  isScratchpadStatus,
  listPiCatalog,
  listScratchpadItems,
  McpOAuthBroker,
  type MemoryProviderResolver,
  mapScratchpadItem,
  modelCredentialDto,
  type PiOAuthLogins,
  planLiveConnectionSync,
  prepareApiInstall,
  prepareMemoryProviderConnection,
  probeOpenAiCompatibleModels,
  type RemoteConnectorDependencies,
  sanitizeComposioError,
  savePushToken,
  scriptedCatalogEntry,
  serializeModelSecret,
  toComputerRef,
  toStringRecord,
  verifyMcpInstall,
} from "@sentrabot/adapters";
import type { Auth } from "@sentrabot/auth";
import { type Actor, type Me, OPENAI_COMPATIBLE_PROVIDER_ID } from "@sentrabot/contracts";
import { ACTIVE_RUN_STATUSES, AttachmentValidationError, containsSecret } from "@sentrabot/core";
import {
  appendEventInTransaction,
  createGroupRepos,
  createRepos,
  createThreadMessageInTransaction,
  findDefaultModelCredential,
  findDefaultVoiceCredential,
  findWorkspaceMemoryConfig,
  IsolationError,
  lockOwnedGroup,
  newestModelCredentialOrder,
  newestVoiceCredentialOrder,
  Prisma,
  type PrismaClient,
  type ThreadEvents,
  touchGroupUpdatedAt,
} from "@sentrabot/db";
import { createAgentSkillsService } from "./agent-skills.js";
import { createOwnedArtifact, getOwnedArtifact, getWorkspaceArtifact } from "./artifacts.js";
import { createAuthed, createOs } from "./authed.js";
import { chooseFocus, markAppConnected, startOnboarding } from "./onboarding.js";
import { computerContext } from "./route-context.js";
import { createComputerRoutes } from "./routes/computer.js";
import { createMcpRoutes } from "./routes/mcp.js";
import { createPhoneRoutes } from "./routes/phone.js";
import { createRoutineRoutes, listRoutinesDto } from "./routes/routines.js";
import { listWorkspaceRuns } from "./runs.js";
import { queryWorkspaceSearch } from "./search.js";
import { withSerializableRetry } from "./serializable-retry.js";
import {
  applyServerUpdate,
  checkServerUpdate,
  readServerUpdateStatus,
  type UpdaterProxyConfig,
  UpdaterProxyError,
} from "./server-update.js";
import { assertTeachingSendAllowed, createTaughtSkillsService } from "./taught-skills.js";
import { loadAllMessages, loadMessagePage } from "./thread-message-pages.js";
import {
  resolveThreadTarget,
  sendThreadMessage,
  setThreadUnreadState,
  stopThreadRuns,
  threadHead,
  threadSnapshot,
} from "./thread-target.js";
import {
  listVoiceCatalog,
  loadDefaultVoiceCredential,
  loadVoiceCredential,
  persistVoiceCredential,
  prepareVoice,
  toVoiceCredential,
  toVoiceStatus,
  voiceContext,
} from "./voice.js";

const THREAD_MESSAGE_PAGE_SIZE = 100;
const EXPORT_MESSAGE_PAGE_SIZE = 500;

async function reconcilePendingConnections(
  prisma: PrismaClient,
  owner: Pick<Actor, "workspaceId" | "userId">,
  connectorId: string,
  connectedProviders: string[],
): Promise<void> {
  const connectedProviderKeys = new Set(
    connectedProviders.map((provider) => provider.trim().toLowerCase()),
  );
  const rows = (
    await prisma.connection.findMany({
      where: {
        workspaceId: owner.workspaceId,
        userId: owner.userId,
        connectorId,
        status: { in: ["pending", "connected"] },
      },
      select: { id: true, provider: true, displayName: true, status: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
  ).filter((row: { provider: string }) =>
    connectedProviderKeys.has(row.provider.trim().toLowerCase()),
  );
  const sync = planLiveConnectionSync(rows, connectedProviders);
  const updates = [
    ...(sync.connectIds.length > 0
      ? [
          prisma.connection.updateMany({
            where: {
              id: { in: sync.connectIds },
              workspaceId: owner.workspaceId,
              userId: owner.userId,
              status: "pending",
            },
            data: { status: "connected" },
          }),
        ]
      : []),
    ...(sync.revokeIds.length > 0
      ? [
          prisma.connection.updateMany({
            where: {
              id: { in: sync.revokeIds },
              workspaceId: owner.workspaceId,
              userId: owner.userId,
              status: "pending",
            },
            data: { status: "revoked" },
          }),
        ]
      : []),
  ];
  if (updates.length > 0) await prisma.$transaction(updates);
}

function connectionContext(
  actor: Pick<Actor, "workspaceId" | "userId">,
  operationId: string,
  signal?: AbortSignal,
): AdapterContext {
  return {
    operationId,
    traceId: operationId,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    signal: signal ?? new AbortController().signal,
  };
}

export interface RouterDeps {
  prisma: PrismaClient;
  events: ThreadEvents;
  auth: Auth;
  jobs: JobPublisher;
  sandbox: SandboxProvider;
  memory: MemoryStore;
  memoryProviders: MemoryProviderResolver;
  home: AgentHomeStore;
  secrets: EncryptedSecretStore;
  oauthLogins: PiOAuthLogins;
  composio?: ComposioProvider;
  mcpOAuth?: McpOAuthBroker;
  connectors: ConnectorRegistry;
  remoteConnectors?: RemoteConnectorDependencies;
  artifacts: ArtifactStore;
  dataDir: string;
  /** Present when the phone messaging surface is enabled. */
  phone?: { enabled: boolean };
  /** Present when the WhatsApp Cloud API channel is enabled. */
  whatsapp?: { enabled: boolean; businessPhoneE164: string | null };
  env: {
    defaultProvider: string;
    defaultModel: string;
    deploymentModelKey?: string;
    webOrigin: string;
    screenProxySecret: string;
    sandboxProvider: string;
    gitSha?: string;
    updaterUrl?: string;
    updaterToken?: string;
    imageTag?: string;
  };
}

export function createRouter(deps: RouterDeps) {
  const os = createOs();
  const repos = createRepos(deps.prisma);
  const mcpOAuth = deps.mcpOAuth ?? new McpOAuthBroker(deps.prisma, deps.secrets);
  const groupRepos = createGroupRepos(deps.prisma);
  const taughtSkills = createTaughtSkillsService({
    prisma: deps.prisma,
    events: deps.events,
    jobs: deps.jobs,
    sandbox: deps.sandbox,
    home: deps.home,
    dataDir: deps.dataDir,
  });
  const agentSkills = createAgentSkillsService(deps.prisma);

  const authed = createAuthed(os);

  return os.router({
    health: os.health.handler(async () => ({ ok: true as const, version: "0.1.0" })),
    me: authed.me.handler(async ({ context }): Promise<Me> => meDto(deps, context.actor)),
    preferences: {
      update: authed.preferences.update.handler(async ({ context, input }): Promise<Me> => {
        await deps.prisma.user.update({
          where: { id: context.actor.userId },
          data: { avatarStyle: input.avatarStyle },
        });
        return meDto(deps, context.actor);
      }),
    },
    bootstrap: authed.bootstrap.handler(async ({ context, input }) => {
      const actor = context.actor;
      const [me, bots, botSections, archivedBots, archivedGroups] = await Promise.all([
        meDto(deps, actor),
        repos.listBots(actor),
        repos.listBotSections(actor),
        repos.listBots(actor, { archived: true }),
        groupRepos.listGroups(actor, { archived: true }),
      ]);
      const active = bots.find((bot) => bot.id === input.botId) ?? bots[0];
      const [thread, routines] = active
        ? await Promise.all([
            resolveThreadTarget(deps.prisma, actor, { botId: active.id }).then((target) =>
              threadSnapshot(deps, target),
            ),
            listRoutinesDto(deps, actor, active.id),
          ])
        : [null, []];
      return { me, bots, botSections, archivedBots, archivedGroups, thread, routines };
    }),
    deployment: {
      get: authed.deployment.get.handler(async ({ context }) => {
        if (!context.actor.isDeploymentOwner) throw new ORPCError("FORBIDDEN");
        return deploymentDto(deps.prisma, deps.env.sandboxProvider);
      }),
      update: authed.deployment.update.handler(async ({ context, input }) => {
        if (!context.actor.isDeploymentOwner) throw new ORPCError("FORBIDDEN");
        if (input.computerHost === "this-mac" && deps.env.sandboxProvider !== "docker") {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "This Mac mode is only available when SANDBOX_PROVIDER=docker on a personal local app.",
          });
        }
        await deps.prisma.deploymentSettings.upsert({
          where: { id: "default" },
          create: {
            id: "default",
            ownerUserId: context.actor.userId,
            signupsEnabled: input.signupsEnabled ?? true,
            signupAllowlist: (input.signupAllowlist ?? []).join(","),
            signupPolicyInitialized: true,
            computerHost: input.computerHost ?? undefined,
          },
          update: {
            ...(input.signupsEnabled === undefined ? {} : { signupsEnabled: input.signupsEnabled }),
            ...(input.signupAllowlist ? { signupAllowlist: input.signupAllowlist.join(",") } : {}),
            ...(input.signupsEnabled === undefined && input.signupAllowlist === undefined
              ? {}
              : { signupPolicyInitialized: true }),
            ...(input.computerHost === undefined ? {} : { computerHost: input.computerHost }),
          },
        });
        return deploymentDto(deps.prisma, deps.env.sandboxProvider);
      }),
    },
    updater: {
      status: authed.updater.status.handler(async ({ context }) => {
        if (!context.actor.isDeploymentOwner) throw new ORPCError("FORBIDDEN");
        return readServerUpdateStatus(updaterConfig(deps));
      }),
      check: authed.updater.check.handler(async ({ context, input }) => {
        if (!context.actor.isDeploymentOwner) throw new ORPCError("FORBIDDEN");
        try {
          return await checkServerUpdate(updaterConfig(deps), input);
        } catch (error) {
          mapUpdaterError(error);
        }
      }),
      apply: authed.updater.apply.handler(async ({ context, input }) => {
        if (!context.actor.isDeploymentOwner) throw new ORPCError("FORBIDDEN");
        try {
          return await applyServerUpdate(updaterConfig(deps), input);
        } catch (error) {
          mapUpdaterError(error);
        }
      }),
    },
    models: {
      list: authed.models.list.handler(async () => [...listPiCatalog(), scriptedCatalogEntry]),
      credentials: authed.models.credentials.handler(async ({ context }) => {
        const rows = await deps.prisma.userModelCredential.findMany({
          where: { userId: context.actor.userId, workspaceId: context.actor.workspaceId },
          orderBy: newestModelCredentialOrder,
        });
        const compatibleRows = rows.filter((row) => row.provider === OPENAI_COMPATIBLE_PROVIDER_ID);
        const secrets = compatibleRows.length
          ? await deps.prisma.secret.findMany({
              where: {
                id: { in: compatibleRows.map((row) => row.secretId) },
                userId: context.actor.userId,
                workspaceId: context.actor.workspaceId,
              },
              select: { id: true, ciphertext: true },
            })
          : [];
        const ciphertextById = new Map(secrets.map((secret) => [secret.id, secret.ciphertext]));
        return rows.map((row) => {
          const ciphertext = ciphertextById.get(row.secretId);
          if (!ciphertext) return modelCredentialDto(row);
          try {
            return modelCredentialDto(row, deps.secrets.load(ciphertext, row.secretId));
          } catch {
            return modelCredentialDto(row);
          }
        });
      }),
      connect: authed.models.connect.handler(async ({ context, input }) => {
        let plaintext: string;
        try {
          plaintext = buildModelConnectPlaintext(input);
        } catch (error) {
          throw new ORPCError("BAD_REQUEST", {
            message: error instanceof Error ? error.message : "Invalid model connection",
          });
        }
        return persistModelCredential(deps, context.actor, {
          provider: input.provider,
          plaintext,
          label: input.label,
          modelId: input.modelId,
          signal: context.signal,
        });
      }),
      probeOpenAiCompatible: authed.models.probeOpenAiCompatible.handler(
        async ({ context, input }) => {
          try {
            const models = await probeOpenAiCompatibleModels(input, fetch, context.signal);
            return { models };
          } catch (error) {
            throw new ORPCError("BAD_REQUEST", {
              message: error instanceof Error ? error.message : "Could not list models",
            });
          }
        },
      ),
      beginOAuth: authed.models.beginOAuth.handler(async ({ context, input }) => {
        return deps.oauthLogins.begin({
          userId: context.actor.userId,
          workspaceId: context.actor.workspaceId,
          provider: input.provider,
          modelId: input.modelId,
          label: input.label,
          signal: context.signal,
        });
      }),
      submitOAuthCode: authed.models.submitOAuthCode.handler(async ({ context, input }) => {
        return deps.oauthLogins.submit(input.loginId, context.actor, input.code);
      }),
      completeOAuth: authed.models.completeOAuth.handler(async ({ context, input }) => {
        const result = await deps.oauthLogins.complete(input.loginId, {
          userId: context.actor.userId,
          workspaceId: context.actor.workspaceId,
        });
        return result.status === "connected" ? { status: "ready" as const } : result;
      }),
      finishOAuth: authed.models.finishOAuth.handler(async ({ context, input }) => {
        throwIfAborted(context.signal);
        const result = await deps.oauthLogins.finish(
          input.loginId,
          context.actor,
          async (login) => {
            return persistModelCredential(deps, context.actor, {
              provider: login.provider,
              plaintext: serializeModelSecret({ kind: "oauth", credential: login.credential }),
              label: login.label ?? "ChatGPT Plus/Pro",
              modelId: login.modelId,
              signal: login.signal,
            });
          },
        );
        if (result.status === "pending") {
          throw new ORPCError("CONFLICT", { message: "Sign-in has not finished yet." });
        }
        if (result.status === "error") {
          throw new ORPCError("NOT_FOUND", { message: result.error });
        }
        return result.value;
      }),
      cancelOAuth: authed.models.cancelOAuth.handler(async ({ context, input }) => {
        await deps.oauthLogins.cancel(input.loginId, context.actor);
        return { ok: true as const };
      }),
      setDefault: authed.models.setDefault.handler(async ({ context, input }) => {
        await withSerializableRetry(() =>
          deps.prisma.$transaction(
            async (tx) => {
              const credential = await tx.userModelCredential.findFirst({
                where: {
                  userId: context.actor.userId,
                  workspaceId: context.actor.workspaceId,
                  provider: input.provider,
                },
                orderBy: newestModelCredentialOrder,
              });
              if (!credential) {
                throw new ORPCError("NOT_FOUND", {
                  message: `No model credential is connected for ${input.provider} in this workspace.`,
                });
              }
              await tx.userModelCredential.updateMany({
                where: {
                  userId: context.actor.userId,
                  workspaceId: context.actor.workspaceId,
                },
                data: { isDefault: false },
              });
              await tx.userModelCredential.update({
                where: { id: credential.id },
                data: { defaultModel: input.modelId, isDefault: true },
              });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          ),
        );
        return { ok: true as const };
      }),
    },
    bots: {
      list: authed.bots.list.handler(async ({ context }) => repos.listBots(context.actor)),
      listArchived: authed.bots.listArchived.handler(async ({ context }) =>
        repos.listBots(context.actor, { archived: true }),
      ),
      get: authed.bots.get.handler(async ({ context, input }) => {
        const found = (await repos.listBots(context.actor)).find((bot) => bot.id === input.botId);
        if (!found) throw new IsolationError();
        return found;
      }),
      create: authed.bots.create.handler(async ({ context, input }) =>
        repos.createBot(context.actor, input),
      ),
      duplicate: authed.bots.duplicate.handler(async ({ context, input }) => {
        const source = await repos.getBot(context.actor, input.botId);
        const duplicate = await repos.createBot(context.actor, {
          name: duplicateBotName(source.name),
          title: source.title,
          description: source.description,
          instructions: source.instructions,
          notifyOnFinish: source.notifyOnFinish,
          color: source.color,
          computerMode: source.computer?.scope === "dedicated" ? "dedicated" : "team",
          modelProvider: source.modelProvider,
          modelId: source.modelId,
          thinkingLevel: source.thinkingLevel,
        });
        const assignments = await deps.prisma.botMcpServer.findMany({
          where: {
            botId: source.id,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        if (assignments.length) {
          await deps.prisma.botMcpServer.createMany({
            data: assignments.map((assignment) => ({
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
              botId: duplicate.id,
              serverId: assignment.serverId,
              allowAllTools: assignment.allowAllTools,
              allowedTools: assignment.allowedTools as Prisma.InputJsonValue,
            })),
          });
        }
        return duplicate;
      }),
      reorder: authed.bots.reorder.handler(async ({ context, input }) => {
        await repos.reorderBots(context.actor, input.botIds);
        return { ok: true as const };
      }),
      update: authed.bots.update.handler(async ({ context, input }) => {
        const existing = await repos.getBot(context.actor, input.botId);
        if (input.sectionId) {
          const section = await deps.prisma.botSection.findFirst({
            where: {
              id: input.sectionId,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
            select: { id: true },
          });
          if (!section) throw new IsolationError();
        }
        if (input.modelProvider && input.modelId) {
          const credential = await deps.prisma.userModelCredential.findFirst({
            where: {
              userId: context.actor.userId,
              workspaceId: context.actor.workspaceId,
              provider: input.modelProvider,
            },
            orderBy: newestModelCredentialOrder,
          });
          if (!credential) {
            throw new ORPCError("BAD_REQUEST", { message: "Connect that model provider first" });
          }
          const knownModels = [...listPiCatalog(), scriptedCatalogEntry];
          const inCatalog = knownModels.some(
            (item) => item.provider === input.modelProvider && item.id === input.modelId,
          );
          if (!inCatalog && credential.defaultModel !== input.modelId) {
            throw new ORPCError("BAD_REQUEST", { message: "Unknown model for that provider" });
          }
        }
        const thinkingLevel = input.thinkingLevel;
        if (input.thinkingLevel) {
          const provider =
            input.modelProvider !== undefined ? input.modelProvider : existing.modelProvider;
          const modelId = input.modelId !== undefined ? input.modelId : existing.modelId;
          const me = await meDto(deps, context.actor);
          const effectiveProvider = provider ?? me.defaultProvider;
          const effectiveModelId = modelId ?? me.defaultModel;
          if (effectiveProvider && effectiveModelId) {
            const entry = listPiCatalog().find(
              (item) => item.provider === effectiveProvider && item.id === effectiveModelId,
            );
            const allowed = entry?.thinkingLevels;
            if (allowed && !allowed.includes(input.thinkingLevel)) {
              throw new ORPCError("BAD_REQUEST", {
                message: `Thinking level must be one of: ${allowed.join(", ")}`,
              });
            }
          }
        }
        await deps.prisma.bot.update({
          where: { id: input.botId },
          data: {
            name: input.name,
            title: input.title,
            description: input.description,
            instructions: input.instructions,
            notifyOnFinish: input.notifyOnFinish,
            color: input.color,
            pinned: input.pinned,
            memoryScope: input.memoryScope,
            sectionId: input.sectionId,
            voiceId: input.voiceId,
            autoSpeak: input.autoSpeak,
            ...(input.modelProvider !== undefined
              ? { modelProvider: input.modelProvider, modelId: input.modelId ?? null }
              : {}),
            ...(input.thinkingLevel !== undefined ? { thinkingLevel } : {}),
          },
        });
        const bots = await repos.listBots(context.actor);
        const bot = bots.find((b) => b.id === input.botId);
        if (!bot) throw new IsolationError();
        return bot;
      }),
      setComputer: authed.bots.setComputer.handler(async ({ context, input }) => {
        const bot = await repos.getBot(context.actor, input.botId);
        if (!bot.computer) throw new IsolationError();
        const currentMode = bot.computer.scope === "dedicated" ? "dedicated" : "team";
        if (currentMode === input.mode) {
          return repos.setBotComputer(context.actor, bot.id, input.mode);
        }
        const claimed = await deps.prisma.bot.updateMany({
          where: { id: bot.id, computerSwitching: false },
          data: { computerSwitching: true },
        });
        if (claimed.count !== 1) throw new ORPCError("CONFLICT");
        try {
          const active = await deps.prisma.run.findFirst({
            where: { botId: bot.id, status: { in: [...ACTIVE_RUN_STATUSES] } },
            select: { id: true },
          });
          if (active) {
            throw new ORPCError("BAD_REQUEST", { message: "Stop the bot first" });
          }
          if (bot.computer.controlBotId === bot.id && hasActiveComputerControl(bot.computer)) {
            throw new ORPCError("BAD_REQUEST", { message: "Release the computer first" });
          }
          if (bot.computer.scope === "dedicated" && bot.computer.providerRef) {
            const ctx = computerContext(context.actor, bot.id, "computer.switch");
            const ref = toComputerRef(bot.computer);
            if (bot.computer.state === "running") {
              await checkpointAndRecordComputerWorkspace(deps, bot.computer, ref, ctx);
              await deps.sandbox.stop(ref, ctx);
            }
            await deps.prisma.computerExecutionLease.deleteMany({
              where: { computerId: bot.computer.id, botId: bot.id },
            });
            await deps.prisma.computer.update({
              where: { id: bot.computer.id },
              data: {
                state: "stopped",
                controlHolder: "none",
                controlLeaseId: null,
                controlLeaseExpiresAt: null,
                controlBotId: null,
                controlRunId: null,
                executionRunId: null,
                executionBotId: null,
                executionLeaseExpiresAt: null,
              },
            });
          }
          return await repos.setBotComputer(context.actor, bot.id, input.mode);
        } finally {
          await deps.prisma.bot.updateMany({
            where: { id: bot.id },
            data: { computerSwitching: false },
          });
        }
      }),
      archive: authed.bots.archive.handler(async ({ context, input }) => {
        const bot = await repos.getBot(context.actor, input.botId, { includeArchived: true });
        await archiveBot(
          {
            prisma: deps.prisma,
            sandbox: deps.sandbox,
            home: deps.home,
            jobs: deps.jobs,
            artifacts: deps.artifacts,
            dataDir: deps.dataDir,
          },
          bot,
          computerContext(context.actor, bot.id, "archive"),
        );
        return { ok: true as const };
      }),
      restore: authed.bots.restore.handler(async ({ context, input }) => {
        const bot = await repos.getBot(context.actor, input.botId, { includeArchived: true });
        if (!bot.archivedAt) return { ok: true as const };
        await deps.prisma.bot.update({ where: { id: bot.id }, data: { archivedAt: null } });
        return { ok: true as const };
      }),
      remove: authed.bots.remove.handler(async ({ context, input }) => {
        const bot = await repos.getBot(context.actor, input.botId, { includeArchived: true });
        await destroyBot(
          {
            prisma: deps.prisma,
            sandbox: deps.sandbox,
            home: deps.home,
            jobs: deps.jobs,
            artifacts: deps.artifacts,
            dataDir: deps.dataDir,
          },
          bot,
          {
            operationId: "destroy",
            traceId: "destroy",
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            signal: new AbortController().signal,
          },
          { deleteMemories: input.deleteMemories },
        );
        return { ok: true as const };
      }),
      rotateWebhookSecret: authed.bots.rotateWebhookSecret.handler(async ({ context, input }) => {
        const bot = await repos.getBot(context.actor, input.botId);
        const plaintext = randomBytes(32).toString("base64url");
        const stored = await deps.secrets.put(plaintext, {
          operationId: "bots.rotateWebhookSecret",
          traceId: "bots.rotateWebhookSecret",
          workspaceId: context.actor.workspaceId,
          userId: context.actor.userId,
          signal: context.signal ?? new AbortController().signal,
        });
        await deps.prisma.$transaction(async (tx) => {
          const previousSecretId = bot.webhookSecretId;
          await tx.secret.create({
            data: {
              id: stored.id,
              userId: context.actor.userId,
              workspaceId: context.actor.workspaceId,
              kind: "webhook",
              ciphertext: stored.ciphertext,
            },
          });
          await tx.bot.update({
            where: { id: bot.id },
            data: { webhookSecretId: stored.id },
          });
          if (previousSecretId) {
            await tx.secret.deleteMany({
              where: {
                id: previousSecretId,
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
                kind: "webhook",
              },
            });
          }
        });
        return {
          secret: plaintext,
          path: `/api/v1/bots/${bot.id}/webhook`,
          webhookConfigured: true as const,
        };
      }),
    },
    groups: {
      create: authed.groups.create.handler(async ({ context, input }) =>
        groupRepos.createGroup(context.actor, input),
      ),
      list: authed.groups.list.handler(async ({ context }) => groupRepos.listGroups(context.actor)),
      listArchived: authed.groups.listArchived.handler(async ({ context }) =>
        groupRepos.listGroups(context.actor, { archived: true }),
      ),
      get: authed.groups.get.handler(async ({ context, input }) => {
        const group = await groupRepos.getGroup(context.actor, input.groupId);
        return {
          ...groupRepos.mapGroup(group),
          messages: (
            await loadMessagePage(
              deps.prisma,
              group.thread!.id,
              undefined,
              THREAD_MESSAGE_PAGE_SIZE,
            )
          ).messages,
        };
      }),
      duplicate: authed.groups.duplicate.handler(async ({ context, input }) => {
        const source = await groupRepos.getGroup(context.actor, input.groupId);
        return groupRepos.createGroup(context.actor, {
          name: duplicateBotName(source.name),
          botIds: source.members.map((member) => member.bot.id),
        });
      }),
      update: authed.groups.update.handler(async ({ context, input }) => {
        if (input.sectionId) {
          const section = await deps.prisma.botSection.findFirst({
            where: {
              id: input.sectionId,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
            select: { id: true },
          });
          if (!section) throw new IsolationError();
        }
        const updated = await groupRepos.updateGroup(context.actor, input);
        await Promise.all(
          updated.cancelledRunIds.map((runId) =>
            deps.jobs.cancel(runJobKey(runId)).catch(() => undefined),
          ),
        );
        return updated.group;
      }),
      archive: authed.groups.archive.handler(async ({ context, input }) => {
        const archived = await groupRepos.archiveGroup(context.actor, input.groupId);
        await Promise.all(
          archived.cancelledRunIds.map((runId) =>
            deps.jobs.cancel(runJobKey(runId)).catch(() => undefined),
          ),
        );
        await Promise.all(
          archived.computers.map(async (computer) => {
            if (!computer.providerRef || !computer.executionBotId) return;
            await deps.sandbox
              .releaseScreen?.(toComputerRef(computer), {
                operationId: "stop",
                traceId: "stop",
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
                botId: computer.executionBotId,
                signal: new AbortController().signal,
              })
              .catch(() => undefined);
          }),
        );
        return { ok: true as const };
      }),
      restore: authed.groups.restore.handler(async ({ context, input }) => {
        await groupRepos.restoreGroup(context.actor, input.groupId);
        return { ok: true as const };
      }),
      remove: authed.groups.remove.handler(async ({ context, input }) => {
        const removed = await groupRepos.removeGroup(context.actor, input.groupId);
        const cleanup = await Promise.allSettled(
          removed.artifactStorageKeys.map((storageKey) =>
            deps.artifacts.remove(
              storageKey,
              computerContext(context.actor, removed.contextBotId, `group-remove:${input.groupId}`),
            ),
          ),
        );
        for (const result of cleanup) {
          if (result.status === "rejected") console.error("group artifact cleanup", result.reason);
        }
        return { ok: true as const };
      }),
    },
    botSections: {
      list: authed.botSections.list.handler(async ({ context }) =>
        repos.listBotSections(context.actor),
      ),
      create: authed.botSections.create.handler(async ({ context, input }) =>
        repos.createBotSection(context.actor, input),
      ),
    },
    threads: {
      head: authed.threads.head.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        return threadHead(deps.prisma, target);
      }),
      get: authed.threads.get.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        return threadSnapshot(deps, target);
      }),
      messages: authed.threads.messages.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        return loadMessagePage(
          deps.prisma,
          target.threadId,
          input.before,
          THREAD_MESSAGE_PAGE_SIZE,
          input.around,
        );
      }),
      subscribe: authed.threads.subscribe.handler(async function* ({ context, input }) {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        for await (const event of deps.events.follow(
          target.threadId,
          input.cursor,
          context.signal,
        )) {
          yield event;
        }
      }),
      send: authed.threads.send.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        if (target.kind === "bot") {
          await assertTeachingSendAllowed(deps.prisma, context.actor.workspaceId, target.botId);
        }
        return sendThreadMessage(deps, context.actor, target, input);
      }),
      stop: authed.threads.stop.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        await stopThreadRuns(deps, context.actor, target);
        return { ok: true as const };
      }),
      clear: authed.threads.clear.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        const contextBotId = target.kind === "bot" ? target.botId : target.memberBotIds[0];
        if (!contextBotId) throw new IsolationError();
        const { cancelledRunIds, historyCompactionGeneration } = await deps.events.clearThread({
          workspaceId: context.actor.workspaceId,
          threadId: target.threadId,
          botId: contextBotId,
          ...(target.kind === "group" ? { groupId: target.groupId } : {}),
        });
        const [configuredMemory] = await Promise.all([
          target.kind === "bot"
            ? deps.memoryProviders.resolve(context.actor.workspaceId).catch((error) => {
                console.error("semantic memory resolution after thread clear failed", error);
                return null;
              })
            : Promise.resolve(null),
          Promise.all(
            cancelledRunIds.map((runId) =>
              deps.jobs.cancel(runJobKey(runId)).catch(() => undefined),
            ),
          ),
        ]);
        // Durable memories remain in their workspace/private containers. Clear only removes
        // conversation-derived summaries from the previous generation; including the new
        // generation also covers a compaction job that began just after the clear committed.
        if (configuredMemory && target.kind === "bot") {
          // Best effort: the conversation rows are already deleted, so failing the clear here
          // would help nothing — a failed purge only leaves stale summaries recallable.
          try {
            const purged = await configuredMemory.provider.purgeHistory(
              {
                botId: target.botId,
                generations: [
                  Math.max(0, historyCompactionGeneration - 1),
                  historyCompactionGeneration,
                ],
              },
              computerContext(context.actor, target.botId, `thread-clear:${target.threadId}`),
            );
            if (!purged.ok) {
              console.error("semantic memory purge after thread clear failed", purged.error);
            }
          } catch (error) {
            console.error("semantic memory purge after thread clear failed", error);
          }
        }
        return { ok: true as const };
      }),
      followUp: authed.threads.followUp.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        if (target.kind === "bot") {
          await assertTeachingSendAllowed(deps.prisma, context.actor.workspaceId, target.botId);
          const sent = await deps.events.sendUserMessage({
            workspaceId: context.actor.workspaceId,
            threadId: target.threadId,
            botId: target.botId,
            userId: context.actor.userId,
            blocks: [{ kind: "text", text: input.text }],
            prompt: input.text,
            trigger: "follow_up",
            onlyIfIdle: true,
          });
          if (sent.runId) {
            await deps.jobs.enqueue(runContinueJob(sent.runId)).catch((error) => {
              console.error("follow-up enqueue", error);
            });
          }
          return { ok: true as const };
        }
        const committed = await deps.prisma.$transaction(async (tx) => {
          await lockOwnedGroup(tx, context.actor, target.groupId);
          const group = await tx.chatGroup.findFirst({
            where: {
              id: target.groupId,
              archivedAt: null,
              thread: { id: target.threadId },
            },
            include: { members: { orderBy: { createdAt: "asc" } } },
          });
          const botId = group?.members[0]?.botId;
          if (!botId) throw new IsolationError();
          const blocks = [{ kind: "text" as const, text: input.text }];
          const message = await createThreadMessageInTransaction(tx, {
            threadId: target.threadId,
            role: "user",
            blocks,
          });
          const active = await tx.run.findFirst({
            where: {
              threadId: target.threadId,
              status: { in: ["running", "queued", "leased"] },
            },
            select: { id: true },
          });
          let run: { id: string } | null = null;
          if (!active) {
            const task = await tx.task.create({
              data: {
                workspaceId: context.actor.workspaceId,
                botId,
                threadId: target.threadId,
                userId: context.actor.userId,
                prompt: input.text,
                status: "queued",
              },
            });
            run = await tx.run.create({
              data: {
                workspaceId: context.actor.workspaceId,
                botId,
                threadId: target.threadId,
                taskId: task.id,
                userId: context.actor.userId,
                status: "queued",
                trigger: "follow_up",
                sourceMessageId: message.id,
              },
              select: { id: true },
            });
            await tx.message.update({ where: { id: message.id }, data: { runId: run.id } });
          }
          const event = await appendEventInTransaction(tx, {
            workspaceId: context.actor.workspaceId,
            threadId: target.threadId,
            botId,
            type: "thread.message.created",
            runId: run?.id,
            payload: { messageId: message.id, role: "user", blocks },
          });
          await touchGroupUpdatedAt(tx, target.groupId);
          return { runId: run?.id, eventSeq: event.seq };
        });
        await deps.events.notify(target.threadId, committed.eventSeq).catch((error) => {
          console.error("group follow-up realtime notification", error);
        });
        if (committed.runId) {
          await deps.jobs.enqueue(runContinueJob(committed.runId)).catch((error) => {
            console.error("group follow-up enqueue", error);
          });
        }
        return { ok: true as const };
      }),
      answer: authed.threads.answer.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        const answered = await deps.events.answerRunInput({
          workspaceId: context.actor.workspaceId,
          threadId: target.threadId,
          runId: input.runId,
          messageId: input.messageId,
          answeredByUserId: context.actor.userId,
          answer: input.answer,
        });
        if (!answered) {
          throw new ORPCError("CONFLICT", {
            message: "This prompt is no longer awaiting an answer",
          });
        }
        await deps.jobs.enqueue(runContinueJob(input.runId)).catch((error) => {
          // The answer and queued run are durable; the reconciler repairs a missed immediate wake.
          console.error("thread answer enqueue", error);
        });
        return { ok: true as const };
      }),
      markRead: authed.threads.markRead.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        await setThreadUnreadState(deps.prisma, context.actor, target, false);
        return { ok: true as const };
      }),
      markUnread: authed.threads.markUnread.handler(async ({ context, input }) => {
        const target = await resolveThreadTarget(deps.prisma, context.actor, input);
        await setThreadUnreadState(deps.prisma, context.actor, target, true);
        return { ok: true as const };
      }),
    },
    computer: createComputerRoutes(deps, authed, repos, taughtSkills),
    memory: {
      list: authed.memory.list.handler(async ({ context, input }) => {
        const docs = await deps.prisma.memoryDocument.findMany({
          where: {
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            ...(input.botId ? { botId: input.botId } : {}),
            ...(input.scope ? { scope: input.scope } : {}),
          },
        });
        return docs.map((doc) => ({
          id: doc.id,
          scope: doc.scope as "bot" | "user",
          botId: doc.botId,
          path: doc.path,
          content: doc.content,
          revision: doc.revision,
          updatedAt: doc.updatedAt.toISOString(),
        }));
      }),
      update: authed.memory.update.handler(async ({ context, input }) => {
        const doc = await deps.prisma.memoryDocument.findFirst({
          where: {
            id: input.documentId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        if (!doc) throw new IsolationError();
        const updated = await deps.memory.commit(
          {
            scope: doc.scope as "bot" | "user",
            botId: doc.botId ?? undefined,
            path: doc.path,
            content: input.content,
          },
          {
            operationId: "mem",
            traceId: "mem",
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            signal: new AbortController().signal,
          },
        );
        return {
          id: updated.id,
          scope: doc.scope as "bot" | "user",
          botId: doc.botId,
          path: updated.path,
          content: updated.content,
          revision: updated.revision,
          updatedAt: new Date().toISOString(),
        };
      }),
      exportMarkdown: authed.memory.exportMarkdown.handler(async ({ context, input }) => {
        const docs = await deps.prisma.memoryDocument.findMany({
          where: {
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            ...(input.botId ? { botId: input.botId } : {}),
          },
        });
        return docs.map((d) => `# ${d.path}\n\n${d.content}`).join("\n\n");
      }),
      providerConfig: authed.memory.providerConfig.handler(async ({ context }) => {
        const config = await findWorkspaceMemoryConfig(deps.prisma, context.actor.workspaceId);
        return config ? serializeWorkspaceMemoryConfig(config) : null;
      }),
      connectProvider: authed.memory.connectProvider.handler(async ({ context, input }) =>
        persistMemoryProviderConfig(deps, context.actor, input),
      ),
      setDefaultScope: authed.memory.setDefaultScope.handler(async ({ context, input }) =>
        updateMemoryProviderDefaultScope(deps, context.actor, input.defaultMemoryScope),
      ),
      disconnectProvider: authed.memory.disconnectProvider.handler(async ({ context }) => {
        await requireWorkspaceOwner(deps.prisma, context.actor);
        await withSerializableRetry(() =>
          deps.prisma.$transaction(
            async (tx) => {
              const existing = await findWorkspaceMemoryConfig(tx, context.actor.workspaceId);
              if (!existing) return;
              await tx.workspaceMemoryConfig.delete({ where: { id: existing.id } });
              await tx.secret.deleteMany({ where: { id: existing.secretId } });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          ),
        );
        return { ok: true as const };
      }),
    },
    routines: createRoutineRoutes(deps, authed, repos, agentSkills),
    scratchpad: {
      list: authed.scratchpad.list.handler(async ({ context, input }) => {
        await repos.getBot(context.actor, input.botId);
        return listScratchpadItems(
          { prisma: deps.prisma },
          {
            workspaceId: context.actor.workspaceId,
            botId: input.botId,
            status: input.status,
            includeDone: input.includeDone ?? false,
          },
        );
      }),
      create: authed.scratchpad.create.handler(async ({ context, input }) => {
        await repos.getBot(context.actor, input.botId);
        const row = await deps.prisma.scratchpadItem.create({
          data: {
            workspaceId: context.actor.workspaceId,
            botId: input.botId,
            userId: context.actor.userId,
            title: input.title.trim(),
            status: input.status,
            notes: input.notes.trim(),
          },
        });
        return mapScratchpadItem(row);
      }),
      update: authed.scratchpad.update.handler(async ({ context, input }) => {
        const existing = await deps.prisma.scratchpadItem.findFirst({
          where: {
            id: input.itemId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        if (!existing) throw new IsolationError();
        if (input.status !== undefined && !isScratchpadStatus(input.status)) {
          throw new ORPCError("BAD_REQUEST", { message: "Invalid scratchpad status." });
        }
        const row = await deps.prisma.scratchpadItem.update({
          where: { id: existing.id },
          data: {
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
          },
        });
        return mapScratchpadItem(row);
      }),
      remove: authed.scratchpad.remove.handler(async ({ context, input }) => {
        const existing = await deps.prisma.scratchpadItem.findFirst({
          where: {
            id: input.itemId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        if (!existing) throw new IsolationError();
        await deps.prisma.scratchpadItem.delete({ where: { id: existing.id } });
        return { ok: true as const };
      }),
    },
    skills: {
      list: authed.skills.list.handler(async ({ context, input }) => {
        await repos.getBot(context.actor, input.botId);
        return taughtSkills.list(context.actor, input.botId);
      }),
      get: authed.skills.get.handler(async ({ context, input }) =>
        taughtSkills.get(context.actor, input.skillId),
      ),
      start: authed.skills.start.handler(async ({ context, input }) => {
        await repos.getBot(context.actor, input.botId);
        return taughtSkills.start(context.actor, input.botId, input.goal);
      }),
      appendEvent: authed.skills.appendEvent.handler(async ({ context, input }) =>
        taughtSkills.appendEvent(context.actor, input.skillId, input.event),
      ),
      snapshot: authed.skills.snapshot.handler(async ({ context, input }) =>
        taughtSkills.snapshot(context.actor, input.skillId),
      ),
      stop: authed.skills.stop.handler(async ({ context, input }) =>
        taughtSkills.stop(context.actor, input.skillId),
      ),
      updateDraft: authed.skills.updateDraft.handler(async ({ context, input }) =>
        taughtSkills.updateDraft(context.actor, input.skillId, {
          name: input.name,
          playbook: input.playbook,
        }),
      ),
      save: authed.skills.save.handler(async ({ context, input }) =>
        taughtSkills.save(context.actor, input.skillId, input.name),
      ),
      testRun: authed.skills.testRun.handler(async ({ context, input }) =>
        taughtSkills.testRun(context.actor, input.skillId, input.prompt),
      ),
      remove: authed.skills.remove.handler(async ({ context, input }) =>
        taughtSkills.remove(context.actor, input.skillId),
      ),
    },
    agentSkills: {
      list: authed.agentSkills.list.handler(async ({ context }) => agentSkills.list(context.actor)),
      get: authed.agentSkills.get.handler(async ({ context, input }) =>
        agentSkills.get(context.actor, input),
      ),
      create: authed.agentSkills.create.handler(async ({ context, input }) =>
        agentSkills.create(context.actor, input),
      ),
      update: authed.agentSkills.update.handler(async ({ context, input }) =>
        agentSkills.update(context.actor, input),
      ),
      remove: authed.agentSkills.remove.handler(async ({ context, input }) =>
        agentSkills.remove(context.actor, input.skillId),
      ),
    },
    capabilities: {
      list: authed.capabilities.list.handler(async ({ context }) => {
        const rows = await deps.prisma.capabilityInstall.findMany({
          where: { workspaceId: context.actor.workspaceId, userId: context.actor.userId },
        });
        return rows.map((row) => ({
          id: row.id,
          kind: row.kind as "skill" | "plugin" | "mcp" | "api" | "connection",
          name: row.name,
          source: row.source,
          version: row.version,
          digest: row.digest,
          secretConfigured: Boolean(row.secretId),
          config: row.config as Record<string, unknown>,
          createdAt: row.createdAt.toISOString(),
        }));
      }),
      install: authed.capabilities.install.handler(async ({ context, input }) => {
        let source = input.source.trim();
        let config = input.config;
        const credential = input.credential?.trim() || undefined;
        if (
          credential &&
          credential.length >= 8 &&
          (source.includes(credential) || containsSecret(config, [credential]))
        ) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Put credentials only in the encrypted credential field",
          });
        }
        if (JSON.stringify(config).length > 2_000_000) {
          throw new ORPCError("BAD_REQUEST", { message: "Capability configuration is too large" });
        }
        if (credential && input.kind !== "mcp" && input.kind !== "api") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Credentials are only accepted for MCP and API tool sources",
          });
        }
        try {
          if (input.kind === "mcp") {
            if (config.preset === "treg") {
              source = "https://treg.to/mcp/";
              config = { ...config, preset: "treg", auth: { type: "bearer" } };
            }
            const verified = await verifyMcpInstall({
              source,
              config,
              credential,
              signal: context.signal,
              remote: deps.remoteConnectors,
            });
            config = verified.config;
          }
          if (input.kind === "api") {
            const prepared = await prepareApiInstall({
              source,
              config,
              credential,
              signal: context.signal,
              remote: deps.remoteConnectors,
            });
            source = prepared.source;
            config = prepared.config;
          }
        } catch (error) {
          const message = sanitizeComposioError(error);
          throw new ORPCError("BAD_REQUEST", {
            message: credential ? message.split(credential).join("[redacted]") : message,
          });
        }
        const stored = credential
          ? await deps.secrets.put(credential, {
              operationId: "capabilities.install",
              traceId: "capabilities.install",
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
              signal: context.signal ?? new AbortController().signal,
            })
          : undefined;
        const digest = `sha256:${createHash("sha256")
          .update(JSON.stringify({ kind: input.kind, source, config }))
          .digest("hex")}`;
        const row = await deps.prisma.$transaction(async (tx) => {
          if (stored) {
            await tx.secret.create({
              data: {
                id: stored.id,
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
                kind: "connector",
                ciphertext: stored.ciphertext,
              },
            });
          }
          return tx.capabilityInstall.create({
            data: {
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
              kind: input.kind,
              name: input.name.trim(),
              source,
              secretId: stored?.id,
              config: config as Prisma.InputJsonValue,
              digest,
              version: "1.0.0",
            },
          });
        });
        return {
          id: row.id,
          kind: row.kind as "skill" | "plugin" | "mcp" | "api" | "connection",
          name: row.name,
          source: row.source,
          version: row.version,
          digest: row.digest,
          secretConfigured: Boolean(row.secretId),
          config: row.config as Record<string, unknown>,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      remove: authed.capabilities.remove.handler(async ({ context, input }) => {
        await deps.prisma.$transaction(async (tx) => {
          const existing = await tx.capabilityInstall.findFirst({
            where: {
              id: input.id,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
          });
          if (!existing) return;
          await tx.capabilityInstall.delete({ where: { id: existing.id } });
          if (existing.secretId) {
            const shared = await tx.capabilityInstall.count({
              where: { secretId: existing.secretId },
            });
            if (shared === 0) {
              await tx.secret.deleteMany({
                where: {
                  id: existing.secretId,
                  workspaceId: context.actor.workspaceId,
                  userId: context.actor.userId,
                },
              });
            }
          }
        });
        return { ok: true as const };
      }),
    },
    mcp: createMcpRoutes(deps, authed, mcpOAuth),
    onboarding: {
      start: authed.onboarding.start.handler(async ({ context, input }) => {
        await startOnboarding(
          { prisma: deps.prisma, events: deps.events, composio: deps.composio },
          context.actor,
          input.botId,
        );
        return { ok: true as const };
      }),
      choose: authed.onboarding.choose.handler(async ({ context, input }) => {
        await chooseFocus(
          { prisma: deps.prisma, events: deps.events, composio: deps.composio },
          context.actor,
          input.botId,
          input.optionId,
        );
        return { ok: true as const };
      }),
      appConnected: authed.onboarding.appConnected.handler(async ({ context, input }) => {
        await markAppConnected(
          { prisma: deps.prisma, events: deps.events, composio: deps.composio },
          context.actor,
          input.botId,
          input.provider,
        );
        return { ok: true as const };
      }),
    },
    connections: {
      catalog: authed.connections.catalog.handler(async ({ context, input }) => {
        const adapterContext = connectionContext(
          context.actor,
          "connections.catalog",
          context.signal,
        );
        const providers = input.connectorId
          ? [deps.connectors.managed(input.connectorId)].filter(
              (provider): provider is NonNullable<typeof provider> => Boolean(provider),
            )
          : deps.connectors.managedProviders();
        const catalogs = await Promise.all(
          providers.map(async (provider): Promise<ConnectorCatalogItem[]> => {
            try {
              const items = await provider.catalog(adapterContext, input.query);
              const nowConnected = items.filter((item) => item.connected).map((item) => item.slug);
              if (nowConnected.length > 0) {
                await reconcilePendingConnections(
                  deps.prisma,
                  context.actor,
                  provider.describe().id,
                  nowConnected,
                ).catch((error) => {
                  console.error(
                    `${provider.describe().id} pending-connection reconciliation failed`,
                    error,
                  );
                });
              }
              return items;
            } catch {
              return [];
            }
          }),
        );
        return catalogs.flat();
      }),
      list: authed.connections.list.handler(async ({ context }) => {
        const rows = await deps.prisma.connection.findMany({
          where: { workspaceId: context.actor.workspaceId, userId: context.actor.userId },
        });
        return rows.map((row) => ({
          id: row.id,
          connectorId: row.connectorId,
          provider: row.provider,
          displayName: row.displayName,
          status: row.status as "pending" | "connected" | "revoked" | "error",
          capabilities: [],
          createdAt: row.createdAt.toISOString(),
        }));
      }),
      begin: authed.connections.begin.handler(async ({ context, input }) => {
        const connector = deps.connectors.managed(input.connectorId);
        if (!connector) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Connector ${input.connectorId} is not configured`,
          });
        }
        const row = await deps.prisma.connection.create({
          data: {
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            connectorId: input.connectorId,
            provider: input.provider,
            displayName: input.displayName,
            status: "pending",
          },
        });
        try {
          const auth = await connector.begin(
            { provider: input.provider, redirectUrl: `${deps.env.webOrigin}/app` },
            connectionContext(context.actor, "connections.begin", context.signal),
          );
          await deps.prisma.connection.update({
            where: { id: row.id },
            data: {
              status: auth.authorizationUrl ? "pending" : "connected",
              providerRef: auth.state || null,
              metadata: { state: auth.state },
            },
          });
          return { connectionId: row.id, authorizationUrl: auth.authorizationUrl };
        } catch (error) {
          await deps.prisma.connection.update({
            where: { id: row.id },
            data: { status: "error" },
          });
          throw new ORPCError("BAD_REQUEST", { message: sanitizeComposioError(error) });
        }
      }),
      complete: authed.connections.complete.handler(async ({ context, input }) => {
        const existing = await deps.prisma.connection.findFirst({
          where: {
            id: input.connectionId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        if (!existing) throw new IsolationError();
        const connector = deps.connectors.managed(existing.connectorId);
        if (!connector) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Connector ${existing.connectorId} is not configured`,
          });
        }
        let row = existing;
        if (existing.status !== "connected") {
          if (input.code) {
            const state = existing.providerRef ?? existing.provider;
            try {
              await connector.complete(
                { state, code: input.code },
                connectionContext(context.actor, "connections.complete", context.signal),
              );
            } catch (error) {
              throw new ORPCError("BAD_REQUEST", { message: sanitizeComposioError(error) });
            }
          }
          const ready = await connector.connectionReady(
            connectionContext(context.actor, "connections.complete", context.signal),
            existing.provider,
          );
          if (ready) {
            row = await deps.prisma.connection.update({
              where: { id: existing.id },
              data: { status: "connected" },
            });
          }
        }
        return {
          id: row.id,
          connectorId: row.connectorId,
          provider: row.provider,
          displayName: row.displayName,
          status: row.status as "pending" | "connected" | "revoked" | "error",
          capabilities: [],
          createdAt: row.createdAt.toISOString(),
        };
      }),
      revoke: authed.connections.revoke.handler(async ({ context, input }) => {
        const row = await deps.prisma.connection.findFirst({
          where: {
            id: input.connectionId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        if (row) {
          const connector = deps.connectors.managed(row.connectorId);
          if (!connector) {
            throw new ORPCError("BAD_REQUEST", {
              message: `Connector ${row.connectorId} is not configured`,
            });
          }
          try {
            await connector.revoke(
              row.provider,
              connectionContext(context.actor, "connections.revoke", context.signal),
            );
          } catch (error) {
            throw new ORPCError("BAD_REQUEST", { message: sanitizeComposioError(error) });
          }
        }
        await deps.prisma.connection.updateMany({
          where: {
            id: input.connectionId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
          data: { status: "revoked" },
        });
        return { ok: true as const };
      }),
    },
    phone: createPhoneRoutes(deps, authed),
    approvalRules: {
      list: authed.approvalRules.list.handler(async ({ context }) => {
        const rows = await deps.prisma.actionApprovalRule.findMany({
          where: {
            workspaceId: context.actor.workspaceId,
            createdByUserId: context.actor.userId,
          },
          orderBy: { createdAt: "asc" },
        });
        return rows.map((row) => ({
          id: row.id,
          effect: row.effect as "always_allow" | "require_approval",
          matchKind: row.matchKind as "tool" | "connector" | "category",
          matchValue: row.matchValue,
          createdAt: row.createdAt.toISOString(),
        }));
      }),
      set: authed.approvalRules.set.handler(async ({ context, input }) => {
        const row = await deps.prisma.actionApprovalRule.upsert({
          where: {
            workspaceId_createdByUserId_effect_matchKind_matchValue: {
              workspaceId: context.actor.workspaceId,
              createdByUserId: context.actor.userId,
              effect: input.effect,
              matchKind: input.matchKind,
              matchValue: input.matchValue,
            },
          },
          create: {
            workspaceId: context.actor.workspaceId,
            createdByUserId: context.actor.userId,
            effect: input.effect,
            matchKind: input.matchKind,
            matchValue: input.matchValue,
          },
          update: {},
        });
        return {
          id: row.id,
          effect: row.effect as "always_allow" | "require_approval",
          matchKind: row.matchKind as "tool" | "connector" | "category",
          matchValue: row.matchValue,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      remove: authed.approvalRules.remove.handler(async ({ context, input }) => {
        await deps.prisma.actionApprovalRule.deleteMany({
          where: {
            id: input.id,
            workspaceId: context.actor.workspaceId,
            createdByUserId: context.actor.userId,
          },
        });
        return { ok: true as const };
      }),
    },
    autoReview: {
      get: authed.autoReview.get.handler(async ({ context }) => {
        return loadAutoReviewSettings(deps, context.actor);
      }),
      set: authed.autoReview.set.handler(async ({ context, input }) => {
        await deps.prisma.actionAutoReviewPreference.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
          },
          create: {
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            enabled: input.enabled,
          },
          update: { enabled: input.enabled },
        });
        return loadAutoReviewSettings(deps, context.actor);
      }),
    },
    artifacts: {
      list: authed.artifacts.list.handler(async ({ context, input }) => {
        await repos.getBot(context.actor, input.botId);
        const rows = await deps.prisma.artifact.findMany({
          where: {
            botId: input.botId,
            groupId: null,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
        });
        return rows.map((row) => ({
          id: row.id,
          botId: row.botId,
          groupId: row.groupId,
          runId: row.runId,
          name: row.name,
          mimeType: row.mimeType,
          size: row.size,
          createdAt: row.createdAt.toISOString(),
        }));
      }),
      create: authed.artifacts.create.handler(async ({ context, input }) => {
        const botId = input.botId
          ? (await repos.getBot(context.actor, input.botId)).id
          : (await groupRepos.getGroupTarget(context.actor, input.groupId!)).members[0]?.bot.id;
        if (!botId) throw new IsolationError();
        try {
          return await createOwnedArtifact(deps, context.actor, { ...input, botId });
        } catch (error) {
          if (error instanceof AttachmentValidationError) {
            throw new ORPCError("BAD_REQUEST", { message: error.message });
          }
          throw error;
        }
      }),
      get: authed.artifacts.get.handler(async ({ context, input }) => {
        if (input.groupId) {
          const group = await groupRepos.getGroupTarget(context.actor, input.groupId);
          const contextBotId = group.members[0]?.bot.id;
          if (!contextBotId) throw new IsolationError();
          return getWorkspaceArtifact(deps, context.actor, {
            artifactId: input.artifactId,
            groupId: input.groupId,
            contextBotId,
          });
        }
        await repos.getBot(context.actor, input.botId!);
        try {
          return await getOwnedArtifact(deps, context.actor, {
            botId: input.botId!,
            artifactId: input.artifactId,
          });
        } catch (error) {
          if (error instanceof IsolationError) throw error;
          throw error;
        }
      }),
    },
    usage: {
      list: authed.usage.list.handler(async ({ context }) => {
        const rows = await deps.prisma.usageRecord.findMany({
          where: { workspaceId: context.actor.workspaceId, userId: context.actor.userId },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        return rows.map((row) => ({
          id: row.id,
          botId: row.botId,
          runId: row.runId,
          provider: row.provider,
          model: row.model,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
          createdAt: row.createdAt.toISOString(),
        }));
      }),
      summary: authed.usage.summary.handler(async ({ context }) => {
        const result = await deps.prisma.usageRecord.aggregate({
          where: { workspaceId: context.actor.workspaceId, userId: context.actor.userId },
          _sum: { inputTokens: true, outputTokens: true },
          _count: { _all: true },
        });
        return {
          inputTokens: result._sum.inputTokens ?? 0,
          outputTokens: result._sum.outputTokens ?? 0,
          runs: result._count._all,
        };
      }),
    },
    export: {
      bot: authed.export.bot.handler(async ({ context, input }) => {
        const bot = await repos.getBot(context.actor, input.botId);
        if (!bot.thread || !bot.computer) throw new IsolationError();
        const homeKey = bot.computer.homeKey;
        const exportContext = {
          operationId: "export",
          traceId: "export",
          workspaceId: context.actor.workspaceId,
          userId: context.actor.userId,
          signal: new AbortController().signal,
        };
        const [memory, routines, files, history] = await Promise.all([
          deps.prisma.memoryDocument.findMany({
            where: { botId: input.botId, workspaceId: context.actor.workspaceId },
          }),
          deps.prisma.routine.findMany({
            where: { botId: input.botId, workspaceId: context.actor.workspaceId },
          }),
          (async () => {
            const exported: Array<{ path: string; content: string }> = [];
            for await (const file of deps.home.exportHome(homeKey, exportContext)) {
              exported.push({
                path: file.path,
                content: new TextDecoder().decode(file.content),
              });
            }
            return exported;
          })(),
          loadAllMessages(deps.prisma, bot.thread.id, EXPORT_MESSAGE_PAGE_SIZE),
        ]);
        return {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          bot: {
            name: bot.name,
            title: bot.title,
            description: bot.description,
            instructions: bot.instructions,
          },
          memory: memory.map((m) => ({ path: m.path, content: m.content })),
          routines: routines.map((r) => ({
            name: r.name,
            prompt: r.prompt,
            crons: r.crons,
            timezone: r.timezone,
          })),
          files,
          history,
        };
      }),
    },
    notifications: {
      registerPush: authed.notifications.registerPush.handler(async ({ context, input }) => {
        await savePushToken(deps.dataDir, context.actor.userId, input.token);
        return { ok: true as const };
      }),
      unregisterPush: authed.notifications.unregisterPush.handler(async ({ context }) => {
        await deletePushToken(deps.dataDir, context.actor.userId);
        return { ok: true as const };
      }),
    },
    search: {
      query: authed.search.query.handler(async ({ context, input }) => ({
        hits: await queryWorkspaceSearch(deps.prisma, context.actor, input.q),
      })),
    },
    runs: {
      list: authed.runs.list.handler(async ({ context, input }) => ({
        runs: await listWorkspaceRuns(deps.prisma, context.actor, input.filter),
      })),
    },
    voice: {
      catalog: authed.voice.catalog.handler(async () => listVoiceCatalog()),
      status: authed.voice.status.handler(async ({ context }) => {
        const cred = await findDefaultVoiceCredential(deps.prisma, context.actor);
        return toVoiceStatus(cred);
      }),
      credentials: authed.voice.credentials.handler(async ({ context }) => {
        const rows = await deps.prisma.userVoiceCredential.findMany({
          where: { userId: context.actor.userId, workspaceId: context.actor.workspaceId },
          orderBy: newestVoiceCredentialOrder,
        });
        return rows.map(toVoiceCredential);
      }),
      connect: authed.voice.connect.handler(async ({ context, input }) =>
        persistVoiceCredential(deps, context.actor, {
          provider: input.provider,
          plaintext: input.apiKey,
          voiceId: input.voiceId,
          signal: context.signal,
        }),
      ),
      setVoice: authed.voice.setVoice.handler(async ({ context, input }) => {
        const cred = await withSerializableRetry(() =>
          deps.prisma.$transaction(
            async (tx) => {
              const found = input.provider
                ? await tx.userVoiceCredential.findUnique({
                    where: {
                      userId_workspaceId_provider: {
                        userId: context.actor.userId,
                        workspaceId: context.actor.workspaceId,
                        provider: input.provider,
                      },
                    },
                  })
                : await tx.userVoiceCredential.findFirst({
                    where: {
                      userId: context.actor.userId,
                      workspaceId: context.actor.workspaceId,
                      isDefault: true,
                    },
                    orderBy: newestVoiceCredentialOrder,
                  });
              if (!found) {
                throw new ORPCError("BAD_REQUEST", { message: "Connect a voice provider first." });
              }
              // Picking a voice also makes its provider the one speak/transcribe use.
              await tx.userVoiceCredential.updateMany({
                where: {
                  userId: context.actor.userId,
                  workspaceId: context.actor.workspaceId,
                  id: { not: found.id },
                },
                data: { isDefault: false },
              });
              return tx.userVoiceCredential.update({
                where: { id: found.id },
                data: { voiceId: input.voiceId, isDefault: true },
              });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          ),
        );
        return toVoiceStatus(cred);
      }),
      voices: authed.voice.voices.handler(async ({ context, input }) => {
        const loaded = await loadDefaultVoiceCredential(deps, context.actor);
        if (!loaded) return [];
        const providerId = input.provider ?? loaded.cred.provider;
        const row =
          providerId === loaded.cred.provider
            ? loaded
            : await loadVoiceCredential(deps, context.actor, providerId);
        if (!row) return [];
        return createVoiceProvider(row.cred.provider).listVoices(
          row.apiKey,
          voiceContext(context.actor, context.signal),
        );
      }),
      prepare: authed.voice.prepare.handler(async ({ context, input }) =>
        prepareVoice(deps, context.actor, input),
      ),
    },
  });
}

function updaterConfig(deps: RouterDeps): UpdaterProxyConfig {
  return {
    url: deps.env.updaterUrl ?? null,
    token: deps.env.updaterToken ?? null,
    gitSha: deps.env.gitSha,
    imageTag: deps.env.imageTag ?? null,
  };
}

function mapUpdaterError(error: unknown): never {
  if (error instanceof UpdaterProxyError) {
    if (error.status === 401 || error.status === 403) {
      throw new ORPCError("FORBIDDEN", { message: error.message });
    }
    if (error.status >= 500) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: error.message });
    }
    throw new ORPCError("BAD_REQUEST", { message: error.message });
  }
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: error instanceof Error ? error.message : "Update failed.",
  });
}

async function loadAutoReviewSettings(deps: RouterDeps, actor: Actor) {
  const [preference, credentials] = await Promise.all([
    deps.prisma.actionAutoReviewPreference.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
        },
      },
      select: { enabled: true },
    }),
    deps.prisma.userModelCredential.findMany({
      where: { userId: actor.userId, workspaceId: actor.workspaceId },
      select: { provider: true },
    }),
  ]);
  const providers = new Set(credentials.map((row) => row.provider));
  const enabled = preference?.enabled ?? deploymentAutoReviewDefault(process.env);
  const checkerAvailable = isAutoReviewCheckerConfigured({
    hasUserCredentialForProvider: (provider) => providers.has(provider),
  });
  return { enabled, checkerAvailable };
}

async function meDto(deps: RouterDeps, actor: Actor): Promise<Me> {
  const [user, cred, settings] = await Promise.all([
    deps.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } }),
    findDefaultModelCredential(deps.prisma, actor),
    deps.prisma.deploymentSettings.findUnique({ where: { id: "default" } }),
  ]);
  const hasDeployment = Boolean(
    settings?.deploymentModelCredentialCipher || deps.env.deploymentModelKey,
  );
  return {
    userId: actor.userId,
    email: user.email,
    name: user.name,
    workspaceId: actor.workspaceId,
    isDeploymentOwner: actor.isDeploymentOwner,
    needsModel: !cred && !hasDeployment,
    defaultProvider: cred?.provider ?? settings?.defaultModelProvider ?? deps.env.defaultProvider,
    defaultModel: cred?.defaultModel ?? settings?.defaultModelId ?? deps.env.defaultModel,
    computerHost: computerHostFor(settings?.computerHost, deps.env.sandboxProvider),
    canChooseHostComputer: actor.isDeploymentOwner && deps.env.sandboxProvider === "docker",
    sandboxProvider: deps.env.sandboxProvider,
    avatarStyle:
      user.avatarStyle === "organic" ? "organic" : user.avatarStyle === "robot" ? "robot" : "clay",
  };
}

async function deploymentDto(prisma: PrismaClient, sandboxProvider: string) {
  const settings = await prisma.deploymentSettings.findUnique({ where: { id: "default" } });
  return {
    ownerUserId: settings?.ownerUserId ?? null,
    signupsEnabled: settings?.signupsEnabled ?? true,
    signupAllowlist: settings?.signupAllowlist
      ? settings.signupAllowlist.split(",").filter(Boolean)
      : [],
    hasDeploymentModelCredential: Boolean(settings?.deploymentModelCredentialCipher),
    defaultProvider: settings?.defaultModelProvider ?? null,
    defaultModel: settings?.defaultModelId ?? null,
    computerHost: computerHostFor(settings?.computerHost, sandboxProvider),
    canChooseHostComputer: sandboxProvider === "docker",
    sandboxProvider,
  };
}

function computerHostFor(
  stored: string | null | undefined,
  sandboxProvider: string,
): "docker" | "this-mac" | null {
  if (sandboxProvider === "desktop") return "this-mac";
  if (sandboxProvider !== "docker") return null;
  if (stored === "this-mac" || stored === "docker") return stored;
  return null;
}

async function persistModelCredential(
  deps: RouterDeps,
  actor: Actor,
  input: {
    provider: string;
    plaintext: string;
    label?: string;
    modelId?: string;
    signal?: AbortSignal;
  },
) {
  throwIfAborted(input.signal);
  const stored = await deps.secrets.put(input.plaintext, {
    operationId: "cred",
    traceId: "cred",
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    signal: input.signal ?? new AbortController().signal,
  });
  throwIfAborted(input.signal);
  const cred = await withSerializableRetry(() =>
    deps.prisma.$transaction(
      async (tx) => {
        throwIfAborted(input.signal);
        const existing = await tx.userModelCredential.findFirst({
          where: {
            userId: actor.userId,
            workspaceId: actor.workspaceId,
            provider: input.provider,
          },
          orderBy: newestModelCredentialOrder,
        });
        throwIfAborted(input.signal);
        const secret = await tx.secret.create({
          data: {
            id: stored.id,
            userId: actor.userId,
            workspaceId: actor.workspaceId,
            kind: "model",
            ciphertext: stored.ciphertext,
          },
        });
        throwIfAborted(input.signal);
        await tx.userModelCredential.updateMany({
          where: { userId: actor.userId, workspaceId: actor.workspaceId },
          data: { isDefault: false },
        });
        throwIfAborted(input.signal);
        if (!existing) {
          const created = await tx.userModelCredential.create({
            data: {
              userId: actor.userId,
              workspaceId: actor.workspaceId,
              provider: input.provider,
              label: input.label ?? input.provider,
              secretId: secret.id,
              isDefault: true,
              defaultModel: input.modelId ?? deps.env.defaultModel,
            },
          });
          throwIfAborted(input.signal);
          return created;
        }
        const updated = await tx.userModelCredential.update({
          where: { id: existing.id },
          data: {
            label: input.label ?? input.provider,
            secretId: secret.id,
            isDefault: true,
            defaultModel: input.modelId ?? deps.env.defaultModel,
          },
        });
        throwIfAborted(input.signal);
        const sharedSecret = await tx.userModelCredential.count({
          where: { id: { not: existing.id }, secretId: existing.secretId },
        });
        throwIfAborted(input.signal);
        if (sharedSecret === 0) {
          await tx.secret.deleteMany({ where: { id: existing.secretId } });
          throwIfAborted(input.signal);
        }
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  return modelCredentialDto(cred, input.plaintext);
}

async function requireWorkspaceOwner(prisma: PrismaClient, actor: Actor): Promise<void> {
  const member = await prisma.member.findFirst({
    where: {
      organizationId: actor.workspaceId,
      userId: actor.userId,
    },
    select: { role: true },
  });
  const roles = member?.role.split(",").map((role) => role.trim());
  if (!roles?.includes("owner")) throw new ORPCError("FORBIDDEN");
}

export async function persistMemoryProviderConfig(
  deps: RouterDeps,
  actor: Actor,
  input: {
    provider: string;
    settings: Record<string, string>;
    credentials: Record<string, string>;
    defaultMemoryScope: "isolated" | "shared";
  },
) {
  await requireWorkspaceOwner(deps.prisma, actor);
  const prepared = await prepareMemoryProviderConnection(input).catch((error: unknown) => {
    throw new ORPCError("BAD_REQUEST", {
      message: error instanceof Error ? error.message : "Memory provider connection failed",
    });
  });
  const stored = await deps.secrets.put(JSON.stringify(prepared.credentials), {
    operationId: "memory-provider-config",
    traceId: "memory-provider-config",
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    signal: new AbortController().signal,
  });
  const config = await withSerializableRetry(() =>
    deps.prisma.$transaction(
      async (tx) => {
        const existing = await findWorkspaceMemoryConfig(tx, actor.workspaceId);
        const secret = await tx.secret.create({
          data: {
            id: stored.id,
            userId: actor.userId,
            workspaceId: actor.workspaceId,
            kind: "memory-provider",
            ciphertext: stored.ciphertext,
          },
        });
        const updated = await tx.workspaceMemoryConfig.upsert({
          where: { workspaceId: actor.workspaceId },
          create: {
            workspaceId: actor.workspaceId,
            userId: actor.userId,
            provider: prepared.provider,
            settings: prepared.settings,
            secretId: secret.id,
            defaultMemoryScope: input.defaultMemoryScope,
          },
          update: {
            userId: actor.userId,
            provider: prepared.provider,
            settings: prepared.settings,
            secretId: secret.id,
            defaultMemoryScope: input.defaultMemoryScope,
          },
        });
        if (existing && existing.secretId !== secret.id) {
          await tx.secret.deleteMany({ where: { id: existing.secretId } });
        }
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  return serializeWorkspaceMemoryConfig(config);
}

export async function updateMemoryProviderDefaultScope(
  deps: RouterDeps,
  actor: Actor,
  defaultMemoryScope: "isolated" | "shared",
) {
  await requireWorkspaceOwner(deps.prisma, actor);
  const existing = await findWorkspaceMemoryConfig(deps.prisma, actor.workspaceId);
  if (!existing) throw new ORPCError("NOT_FOUND");
  const updated = await deps.prisma.workspaceMemoryConfig.update({
    where: { id: existing.id },
    data: { defaultMemoryScope },
  });
  return serializeWorkspaceMemoryConfig(updated);
}

function serializeWorkspaceMemoryConfig(config: {
  provider: string;
  settings: unknown;
  defaultMemoryScope: string;
  updatedAt: Date;
}) {
  return {
    provider: config.provider,
    settings: toStringRecord(config.settings),
    defaultMemoryScope: config.defaultMemoryScope as "isolated" | "shared",
    updatedAt: config.updatedAt.toISOString(),
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new Error("Request cancelled");
}

function duplicateBotName(name: string) {
  return `${name.slice(0, 75)} copy`;
}
