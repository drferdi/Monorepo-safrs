import { ORPCError } from "@orpc/server";
import { buildMcpCredentialBlob, type McpOAuthBroker } from "@sentrabot/adapters";
import type { McpServer } from "@sentrabot/contracts";
import { IsolationError, type Prisma } from "@sentrabot/db";
import type { Authed } from "../authed.js";
import { buildMcpUpdateMaterial } from "../mcp-material.js";
import { computerContext } from "../route-context.js";
import type { RouterDeps } from "../router.js";

function mcpServerDto(
  row: {
    id: string;
    workspaceId: string;
    slug: string;
    name: string;
    description: string;
    transport: string;
    endpoint: string | null;
    command: string | null;
    args: unknown;
    env: unknown;
    headers: unknown;
    secretId: string | null;
    enabled: boolean;
    revision: number;
    createdAt: Date;
    updatedAt: Date;
  },
  oauthStatus: McpServer["oauthStatus"] = "none",
): McpServer {
  const args = Array.isArray(row.args)
    ? row.args.filter((item): item is string => typeof item === "string")
    : [];
  const envKeys =
    row.env && typeof row.env === "object" && !Array.isArray(row.env) ? Object.keys(row.env) : [];
  const headerKeys =
    row.headers && typeof row.headers === "object" && !Array.isArray(row.headers)
      ? Object.keys(row.headers)
      : [];
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    transport: row.transport as McpServer["transport"],
    endpoint: row.endpoint,
    command: row.command,
    args,
    envKeys,
    headerKeys,
    hasSecret: row.secretId !== null,
    oauthStatus,
    enabled: row.enabled,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mcpAssignmentDto(row: {
  id: string;
  botId: string;
  serverId: string;
  allowAllTools: boolean;
  allowedTools: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    botId: row.botId,
    serverId: row.serverId,
    allowAllTools: row.allowAllTools,
    allowedTools: Array.isArray(row.allowedTools)
      ? row.allowedTools.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createMcpRoutes(deps: RouterDeps, authed: Authed, mcpOAuth: McpOAuthBroker) {
  return {
    servers: {
      list: authed.mcp.servers.list.handler(async ({ context }) => {
        const rows = await deps.prisma.mcpServer.findMany({
          where: { workspaceId: context.actor.workspaceId, userId: context.actor.userId },
          orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        });
        const secretIds = rows.flatMap((row) => (row.secretId ? [row.secretId] : []));
        const secrets = secretIds.length
          ? await deps.prisma.secret.findMany({
              where: {
                id: { in: secretIds },
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
              },
              select: { id: true, ciphertext: true },
            })
          : [];
        const ciphertextById = new Map(secrets.map((secret) => [secret.id, secret.ciphertext]));
        return rows.map((row) =>
          mcpServerDto(
            row,
            mcpOAuth.statusForCiphertext(
              row.secretId ? ciphertextById.get(row.secretId) : undefined,
              row.secretId ?? undefined,
            ),
          ),
        );
      }),
      create: authed.mcp.servers.create.handler(async ({ context, input }) => {
        const secretPayload = buildMcpCredentialBlob(input);
        const stored = secretPayload
          ? await deps.secrets.put(
              secretPayload,
              computerContext(context.actor, "mcp", "mcp.create"),
            )
          : null;
        const row = await deps.prisma.$transaction(async (tx) => {
          if (stored) {
            await tx.secret.create({
              data: {
                id: stored.id,
                userId: context.actor.userId,
                workspaceId: context.actor.workspaceId,
                kind: "mcp",
                ciphertext: stored.ciphertext,
              },
            });
          }
          return tx.mcpServer.create({
            data: {
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
              slug: input.slug,
              name: input.name,
              description: input.description,
              transport: input.transport,
              endpoint: "endpoint" in input ? input.endpoint : null,
              command: "command" in input ? input.command : null,
              args: ("args" in input ? input.args : []) as Prisma.InputJsonValue,
              env: ("env" in input
                ? Object.fromEntries(Object.keys(input.env).map((key) => [key, true]))
                : {}) as Prisma.InputJsonValue,
              headers: ("headers" in input
                ? Object.fromEntries(Object.keys(input.headers).map((key) => [key, true]))
                : {}) as Prisma.InputJsonValue,
              secretId: stored?.id,
              enabled: input.enabled,
            },
          });
        });
        return mcpServerDto(row, await mcpOAuth.statusFor(row, context.actor));
      }),
      update: authed.mcp.servers.update.handler(async ({ context, input }) => {
        const config = input.config;
        const row = await deps.prisma.$transaction(async (tx) => {
          // Share the OAuth broker's per-server lock so a stale authorization
          // snapshot cannot overwrite a simultaneous credential edit.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('mcp-oauth-material'), hashtext(${input.id}))`;
          const existing = await tx.mcpServer.findFirst({
            where: {
              id: input.id,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
          });
          if (!existing) throw new IsolationError();
          const existingSecret = existing.secretId
            ? await tx.secret.findFirst({
                where: {
                  id: existing.secretId,
                  workspaceId: context.actor.workspaceId,
                  userId: context.actor.userId,
                },
              })
            : null;
          let existingMaterial: Record<string, unknown> = {};
          if (existingSecret) {
            try {
              const value = JSON.parse(
                deps.secrets.load(existingSecret.ciphertext, existingSecret.id),
              );
              if (value && typeof value === "object" && !Array.isArray(value))
                existingMaterial = value as Record<string, unknown>;
            } catch {
              /* Existing malformed secrets are replaced only when new credentials are supplied. */
            }
          }
          const nextEndpoint = "endpoint" in config ? config.endpoint : null;
          const update = buildMcpUpdateMaterial(existingMaterial, config, {
            clearOAuth: existing.endpoint !== nextEndpoint,
          });
          const stored =
            update.action === "store" && Object.keys(update.material).length > 0
              ? await deps.secrets.put(
                  JSON.stringify(update.material),
                  computerContext(context.actor, "mcp", "mcp.update"),
                )
              : null;
          const clearing = update.action === "store" && Object.keys(update.material).length === 0;
          const updated = await tx.mcpServer.update({
            where: { id: existing.id },
            data: {
              slug: config.slug,
              name: config.name,
              description: config.description,
              transport: config.transport,
              endpoint: nextEndpoint,
              command: "command" in config ? config.command : null,
              args: ("args" in config ? config.args : []) as Prisma.InputJsonValue,
              env: ("env" in config
                ? Object.fromEntries(Object.keys(config.env).map((key) => [key, true]))
                : {}) as Prisma.InputJsonValue,
              headers: ("headers" in config
                ? Object.fromEntries(Object.keys(config.headers).map((key) => [key, true]))
                : {}) as Prisma.InputJsonValue,
              enabled: config.enabled,
              revision: { increment: 1 },
              ...(stored ? { secretId: stored.id } : clearing ? { secretId: null } : {}),
            },
          });
          if (stored) {
            await tx.secret.create({
              data: {
                id: stored.id,
                userId: context.actor.userId,
                workspaceId: context.actor.workspaceId,
                kind: "mcp",
                ciphertext: stored.ciphertext,
              },
            });
            if (existing.secretId)
              await tx.secret.deleteMany({
                where: {
                  id: existing.secretId,
                  workspaceId: context.actor.workspaceId,
                  userId: context.actor.userId,
                },
              });
          } else if (clearing && existing.secretId) {
            await tx.secret.deleteMany({
              where: {
                id: existing.secretId,
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
              },
            });
          }
          return updated;
        });
        return mcpServerDto(row, await mcpOAuth.statusFor(row, context.actor));
      }),
      remove: authed.mcp.servers.remove.handler(async ({ context, input }) => {
        const server = await deps.prisma.mcpServer.findFirst({
          where: {
            id: input.id,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
          select: { id: true, secretId: true },
        });
        if (!server) throw new IsolationError();
        // Assignments cascade; the encrypted credential must go with the server.
        await deps.prisma.$transaction([
          deps.prisma.mcpServer.delete({ where: { id: server.id } }),
          ...(server.secretId
            ? [
                deps.prisma.secret.deleteMany({
                  where: {
                    id: server.secretId,
                    workspaceId: context.actor.workspaceId,
                    userId: context.actor.userId,
                  },
                }),
              ]
            : []),
        ]);
        return { ok: true as const };
      }),
    },
    assignments: {
      all: authed.mcp.assignments.all.handler(async ({ context }) => {
        const rows = await deps.prisma.botMcpServer.findMany({
          where: {
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
            bot: { archivedAt: null },
          },
          orderBy: { createdAt: "asc" },
        });
        return rows.map(mcpAssignmentDto);
      }),
      list: authed.mcp.assignments.list.handler(async ({ context, input }) => {
        const bot = await deps.prisma.bot.findFirst({
          where: {
            id: input.botId,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
          select: { id: true },
        });
        if (!bot) throw new IsolationError();
        const rows = await deps.prisma.botMcpServer.findMany({
          where: {
            botId: bot.id,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          },
          orderBy: { createdAt: "asc" },
        });
        return rows.map(mcpAssignmentDto);
      }),
      approve: authed.mcp.assignments.approve.handler(async ({ context, input }) => {
        const row = await deps.prisma.$transaction(async (tx) => {
          const [bot, server] = await Promise.all([
            tx.bot.findFirst({
              where: {
                id: input.botId,
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
              },
              select: { id: true },
            }),
            tx.mcpServer.findFirst({
              where: {
                id: input.serverId,
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
                enabled: true,
              },
              select: { id: true },
            }),
          ]);
          if (!bot || !server) throw new IsolationError();
          return tx.botMcpServer.upsert({
            where: { botId_serverId: { botId: bot.id, serverId: server.id } },
            create: {
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
              botId: bot.id,
              serverId: server.id,
              allowAllTools: true,
              allowedTools: [],
            },
            update: {},
          });
        });
        return mcpAssignmentDto(row);
      }),
      replace: authed.mcp.assignments.replace.handler(async ({ context, input }) => {
        const result = await deps.prisma.$transaction(async (tx) => {
          const bot = await tx.bot.findFirst({
            where: {
              id: input.botId,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
            select: { id: true },
          });
          if (!bot) throw new IsolationError();
          const servers = await tx.mcpServer.findMany({
            where: {
              id: { in: input.assignments.map((assignment) => assignment.serverId) },
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
            select: { id: true },
          });
          if (servers.length !== input.assignments.length) throw new IsolationError();
          await tx.botMcpServer.deleteMany({
            where: {
              botId: bot.id,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
          });
          if (input.assignments.length)
            await tx.botMcpServer.createMany({
              data: input.assignments.map((assignment) => ({
                workspaceId: context.actor.workspaceId,
                userId: context.actor.userId,
                botId: bot.id,
                serverId: assignment.serverId,
                allowAllTools: assignment.allowAllTools,
                allowedTools: assignment.allowedTools as Prisma.InputJsonValue,
              })),
            });
          return tx.botMcpServer.findMany({
            where: {
              botId: bot.id,
              workspaceId: context.actor.workspaceId,
              userId: context.actor.userId,
            },
            orderBy: { createdAt: "asc" },
          });
        });
        return result.map(mcpAssignmentDto);
      }),
    },
    oauth: {
      begin: authed.mcp.oauth.begin.handler(async ({ context, input }) => {
        try {
          const expectedRedirect = new URL("/mcp/oauth/callback", deps.env.webOrigin).toString();
          if (new URL(input.redirectUri).toString() !== expectedRedirect) {
            throw new Error("MCP OAuth redirect URI is not allowed");
          }
          return await mcpOAuth.begin({
            ...input,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          });
        } catch (error) {
          throw new ORPCError("BAD_REQUEST", {
            message: error instanceof Error ? error.message : "Could not start MCP OAuth",
          });
        }
      }),
      complete: authed.mcp.oauth.complete.handler(async ({ context, input }) => {
        try {
          await mcpOAuth.complete({
            ...input,
            workspaceId: context.actor.workspaceId,
            userId: context.actor.userId,
          });
          return { ok: true as const };
        } catch (error) {
          throw new ORPCError("BAD_REQUEST", {
            message: error instanceof Error ? error.message : "Could not complete MCP OAuth",
          });
        }
      }),
      disconnect: authed.mcp.oauth.disconnect.handler(async ({ context, input }) => {
        await mcpOAuth.disconnect({
          ...input,
          workspaceId: context.actor.workspaceId,
          userId: context.actor.userId,
        });
        return { ok: true as const };
      }),
    },
  };
}
