import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import {
  type AdapterContext,
  computerControlExpireJobKey,
  type SandboxProvider,
} from "@sentrabot/adapter-kit";
import {
  acquireComputerExecutionLease,
  applyTeachingDesktopInput,
  ComputerBusyError,
  type ComputerExecutionLease,
  checkpointAndRecordComputerWorkspace,
  computerSupportsUpdate,
  displayBotWorkspacePath,
  enqueueTakeoverContinuation,
  expireComputerControl,
  hasActiveComputerControl,
  isSandboxGoneError,
  provisionComputer,
  releaseComputerExecutionLease,
  replaceComputer,
  resolveBotWorkspacePath,
  scheduleComputerControlExpiry,
  scheduleComputerSleep,
  screenLeaseIdForRun,
  takeoverLeaseMs,
  toComputerRef,
  touchRunningComputer,
} from "@sentrabot/adapters";
import type { Actor, ComputerStatus } from "@sentrabot/contracts";
import { ACTIVE_RUN_STATUSES } from "@sentrabot/core";
import { createRepos, IsolationError, type PrismaClient, parseComputerMode } from "@sentrabot/db";
import type { Authed } from "../authed.js";
import {
  executionBlocksUserTakeover,
  resolveBusyBotName,
  toComputerStatus,
} from "../computer-status.js";
import { computerContext } from "../route-context.js";
import type { RouterDeps } from "../router.js";
import { addScreenProxyCapability } from "../screen-proxy.js";
import type { createTaughtSkillsService } from "../taught-skills.js";

const MAX_COMPUTER_TEXT_FILE_BYTES = 2 * 1024 * 1024;

async function computerStatus(
  deps: RouterDeps,
  actor: Actor,
  botId: string,
): Promise<ComputerStatus> {
  const repos = createRepos(deps.prisma);
  let bot = await repos.getBot(actor, botId);
  if (await expireStaleComputerControl(deps, bot.computer)) {
    bot = await repos.getBot(actor, botId);
  }
  const busyBotName = await resolveBusyBotName(deps.prisma, {
    computerId: bot.computer?.id,
    botId,
    botName: bot.name,
  });
  return toComputerStatus(botId, bot.computer, busyBotName);
}

async function runComputerReplace(
  deps: RouterDeps,
  context: { actor: Actor },
  botId: string,
  mode: "recover" | "reset" | "update",
  operationId: string,
): Promise<ComputerStatus> {
  const repos = createRepos(deps.prisma);
  const bot = await repos.getBot(context.actor, botId);
  if (!bot.computer) throw new IsolationError();
  if (mode === "update" && !computerSupportsUpdate(bot.computer.kind)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Computer update is not available on this device",
    });
  }
  const manualRunId = `${mode}:${randomUUID()}`;
  let lease: ComputerExecutionLease | null;
  try {
    lease = await acquireComputerExecutionLease(deps.prisma, {
      computerId: bot.computer.id,
      runId: manualRunId,
      botId: bot.id,
    });
  } catch (error) {
    if (error instanceof ComputerBusyError) {
      throw new ORPCError("CONFLICT", { message: "Computer is busy" });
    }
    throw error;
  }
  try {
    await replaceComputer(deps, bot.computer.id, mode, {
      ...computerContext(context.actor, bot.id, operationId),
      screenLeaseId: screenLeaseIdForRun(lease, manualRunId),
    });
    scheduleComputerSleep(deps.jobs, bot.computer.id);
  } catch (error) {
    if (error instanceof ComputerBusyError) {
      throw new ORPCError("CONFLICT", { message: "Computer is busy" });
    }
    throw error;
  } finally {
    await releaseComputerExecutionLease(deps.prisma, lease);
  }
  return computerStatus(deps, context.actor, botId);
}

async function expireStaleComputerControl(
  deps: RouterDeps,
  computer:
    | (NonNullable<Parameters<typeof hasActiveComputerControl>[0]> & { id: string })
    | null
    | undefined,
): Promise<boolean> {
  const leaseId = computer?.controlLeaseId;
  if (!leaseId || hasActiveComputerControl(computer)) return false;
  await expireComputerControl(deps, computer.id, leaseId).catch(() => undefined);
  return true;
}

async function computerScreenContext(
  prisma: PrismaClient,
  actor: Actor,
  computerId: string,
  botId: string,
  operationId: string,
): Promise<AdapterContext> {
  const context = computerContext(actor, botId, operationId);
  const lease = await prisma.computerExecutionLease.findUnique({
    where: { computerId_botId: { computerId, botId } },
    select: { runId: true, fence: true, expiresAt: true },
  });
  if (!lease || lease.expiresAt.getTime() <= Date.now()) return context;
  return { ...context, screenLeaseId: screenLeaseIdForRun(lease, lease.runId) };
}

function withViewOnly(url: string, viewOnly: boolean) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("view_only", viewOnly ? "true" : "false");
    return parsed.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}view_only=${viewOnly ? "true" : "false"}`;
  }
}

export function createComputerRoutes(
  deps: RouterDeps,
  authed: Authed,
  repos: ReturnType<typeof createRepos>,
  taughtSkills: ReturnType<typeof createTaughtSkillsService>,
) {
  return {
    status: authed.computer.status.handler(async ({ context, input }) =>
      computerStatus(deps, context.actor, input.botId),
    ),
    boot: authed.computer.boot.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      if (!bot.computer) throw new IsolationError();
      if (bot.computer.state === "running" && bot.computer.providerRef) {
        scheduleComputerSleep(deps.jobs, bot.computer.id);
        return computerStatus(deps, context.actor, input.botId);
      }
      const ctx = computerContext(context.actor, bot.id, "boot");
      const manualRunId = `boot:${randomUUID()}`;
      let lease: ComputerExecutionLease | null;
      try {
        lease = await acquireComputerExecutionLease(deps.prisma, {
          computerId: bot.computer.id,
          runId: manualRunId,
          botId: bot.id,
        });
      } catch (error) {
        if (error instanceof ComputerBusyError) {
          throw new ORPCError("CONFLICT", { message: "Computer is busy" });
        }
        throw error;
      }
      try {
        await provisionComputer(deps, bot.computer.id, {
          ...ctx,
          screenLeaseId: screenLeaseIdForRun(lease, manualRunId),
        });
        scheduleComputerSleep(deps.jobs, bot.computer.id);
      } finally {
        await releaseComputerExecutionLease(deps.prisma, lease);
      }
      return computerStatus(deps, context.actor, input.botId);
    }),
    stop: authed.computer.stop.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      if (!bot.computer) throw new IsolationError();
      const controlLeaseId = bot.computer.controlLeaseId;
      const now = new Date();
      const claimed = await deps.prisma.computer.updateMany({
        where: {
          id: bot.computer.id,
          state: { not: "suspending" },
          executionLeases: {
            none: { botId: { not: bot.id }, expiresAt: { gt: now } },
          },
        },
        data: { state: "suspending" },
      });
      if (claimed.count !== 1) {
        throw new ORPCError("CONFLICT", {
          message: "Other Team bots are still using this computer",
        });
      }
      const otherRun = await deps.prisma.run.findFirst({
        where: {
          botId: { not: bot.id },
          status: { in: [...ACTIVE_RUN_STATUSES] },
          bot: { computerId: bot.computer.id },
        },
        select: { id: true },
      });
      if (otherRun) {
        await deps.prisma.computer.updateMany({
          where: { id: bot.computer.id, state: "suspending" },
          data: { state: bot.computer.state },
        });
        throw new ORPCError("CONFLICT", {
          message: "Other Team bots are still using this computer",
        });
      }
      await deps.prisma.computerExecutionLease.deleteMany({
        where: { computerId: bot.computer.id, botId: bot.id },
      });
      try {
        if (bot.computer.providerRef) {
          const ctx = computerContext(context.actor, bot.id, "stop");
          const ref = toComputerRef(bot.computer);
          await checkpointAndRecordComputerWorkspace(deps, bot.computer, ref, ctx);
          await deps.sandbox.stop(ref, ctx);
        }
        await deps.prisma.computer.update({
          where: { id: bot.computer.id },
          data: {
            state: "stopped",
            controlHolder: "none",
            controlLeaseId: null,
            controlLeaseExpiresAt: null,
            controlBotId: null,
            controlRunId: null,
          },
        });
      } catch (error) {
        await deps.prisma.computer
          .updateMany({
            where: { id: bot.computer.id, state: "suspending" },
            data: { state: "error" },
          })
          .catch(() => undefined);
        throw error;
      }
      await deps.jobs.cancel(
        computerControlExpireJobKey(bot.computer.id, controlLeaseId ?? undefined),
      );
      return computerStatus(deps, context.actor, input.botId);
    }),
    recover: authed.computer.recover.handler(async ({ context, input }) =>
      runComputerReplace(deps, context, input.botId, "recover", "recover"),
    ),
    reset: authed.computer.reset.handler(async ({ context, input }) =>
      runComputerReplace(deps, context, input.botId, "reset", "reset"),
    ),
    update: authed.computer.update.handler(async ({ context, input }) =>
      runComputerReplace(deps, context, input.botId, "update", "update"),
    ),
    takeover: authed.computer.takeover.handler(async ({ context, input }) => {
      let bot = await repos.getBot(context.actor, input.botId);
      if (!bot.computer?.providerRef || bot.computer.state !== "running") {
        throw new ORPCError("BAD_REQUEST", { message: "computer must be running" });
      }
      if (hasActiveComputerControl(bot.computer) && bot.computer.controlBotId === bot.id) {
        await scheduleComputerControlExpiry(
          deps.jobs,
          bot.computer.id,
          bot.computer.controlLeaseId!,
          bot.computer.controlLeaseExpiresAt!,
        );
        return {
          leaseId: bot.computer.controlLeaseId!,
          expiresAt: bot.computer.controlLeaseExpiresAt!.toISOString(),
        };
      }
      if (hasActiveComputerControl(bot.computer) && bot.computer.controlBotId !== bot.id) {
        const previousBotId = bot.computer.controlBotId!;
        await deps.sandbox.setScreenControl?.(
          toComputerRef(bot.computer),
          false,
          computerContext(context.actor, previousBotId, "screen.release"),
          bot.computer.controlLeaseId ?? undefined,
        );
        await deps.prisma.computer.updateMany({
          where: { id: bot.computer.id, controlLeaseId: bot.computer.controlLeaseId },
          data: {
            controlHolder: "none",
            controlLeaseId: null,
            controlLeaseExpiresAt: null,
            controlBotId: null,
            controlRunId: null,
          },
        });
        bot = await repos.getBot(context.actor, input.botId);
        if (!bot.computer) throw new IsolationError();
      }
      if (bot.computer.controlLeaseId) {
        await expireComputerControl(deps, bot.computer.id, bot.computer.controlLeaseId);
        bot = await repos.getBot(context.actor, input.botId);
      }
      if (!bot.computer) throw new IsolationError();

      const executionLease = await deps.prisma.computerExecutionLease.findUnique({
        where: { computerId_botId: { computerId: bot.computer.id, botId: bot.id } },
      });
      const executionRun = executionLease
        ? await deps.prisma.run.findUnique({
            where: { id: executionLease.runId },
            select: { botId: true, status: true },
          })
        : null;
      const waitingForTakeover =
        executionRun?.botId === bot.id && executionRun.status === "waiting_takeover";
      if (
        executionBlocksUserTakeover({
          hasLease: Boolean(executionLease),
          leaseExpiresAt: executionLease?.expiresAt,
          runStatus: executionRun?.status,
        })
      ) {
        throw new ORPCError("CONFLICT", { message: "Stop the bot first" });
      }
      const executionLeaseActive = Boolean(
        executionLease && executionLease.expiresAt.getTime() > Date.now(),
      );
      const executionRunActive = Boolean(
        executionRun && ACTIVE_RUN_STATUSES.some((status) => status === executionRun.status),
      );
      if (executionLease && !executionLeaseActive && !executionRunActive) {
        await deps.prisma.computerExecutionLease.deleteMany({
          where: { id: executionLease.id },
        });
      }

      const leaseId = randomUUID();
      const expiresAt = new Date(Date.now() + takeoverLeaseMs());
      const granted = await deps.prisma.computer.updateMany({
        where: {
          id: bot.computer.id,
          state: "running",
          controlHolder: { not: "user" },
          controlLeaseId: null,
        },
        data: {
          controlHolder: "user",
          controlLeaseId: leaseId,
          controlLeaseExpiresAt: expiresAt,
          controlBotId: bot.id,
          controlRunId: waitingForTakeover ? executionLease?.runId : null,
          state: "running",
        },
      });
      if (granted.count !== 1) {
        const current = await deps.prisma.computer.findUniqueOrThrow({
          where: { id: bot.computer.id },
        });
        if (!hasActiveComputerControl(current)) throw new ORPCError("CONFLICT");
        await scheduleComputerControlExpiry(
          deps.jobs,
          current.id,
          current.controlLeaseId!,
          current.controlLeaseExpiresAt!,
        );
        return {
          leaseId: current.controlLeaseId!,
          expiresAt: current.controlLeaseExpiresAt!.toISOString(),
        };
      }
      try {
        await scheduleComputerControlExpiry(deps.jobs, bot.computer.id, leaseId, expiresAt);
      } catch (error) {
        await deps.prisma.computer.updateMany({
          where: { id: bot.computer.id, controlLeaseId: leaseId },
          data: {
            controlHolder: "none",
            controlLeaseId: null,
            controlLeaseExpiresAt: null,
            controlBotId: null,
            controlRunId: null,
          },
        });
        throw error;
      }
      if (bot.thread) {
        await deps.events.append({
          workspaceId: context.actor.workspaceId,
          threadId: bot.thread.id,
          botId: bot.id,
          type: "computer.takeover.granted",
          payload: { leaseId, takeoverRequested: waitingForTakeover },
        });
      }
      scheduleComputerSleep(deps.jobs, bot.computer.id);
      return { leaseId, expiresAt: expiresAt.toISOString() };
    }),
    release: authed.computer.release.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      if (!bot.computer) throw new IsolationError();
      const controlBotId = bot.computer.controlBotId;
      const controlLeaseId = bot.computer.controlLeaseId;
      if (
        !hasActiveComputerControl(bot.computer) ||
        bot.computer.controlHolder !== "user" ||
        !controlBotId ||
        !controlLeaseId ||
        controlBotId !== bot.id
      ) {
        return { ok: true as const };
      }
      if (bot.computer.providerRef) {
        await deps.sandbox.setScreenControl?.(
          toComputerRef(bot.computer),
          false,
          computerContext(context.actor, controlBotId, "screen.release"),
          controlLeaseId,
        );
      }

      const released = await deps.events.finalizeComputerControlRelease({
        workspaceId: context.actor.workspaceId,
        computerId: bot.computer.id,
        botId: controlBotId,
        runId: bot.computer.controlRunId,
        leaseId: controlLeaseId,
        holder: "bot",
        reason: input.reason ?? "released",
      });
      if (!released) return { ok: true as const };
      // The lease-specific key makes this cancellation safe after a replacement takeover.
      await deps.jobs
        .cancel(computerControlExpireJobKey(bot.computer.id, controlLeaseId))
        .catch((error) => {
          // The expired job is harmless after the lease is cleared, so do not report a
          // failed release after the transaction has committed.
          console.error("computer control expiry cancellation", error);
        });

      await enqueueTakeoverContinuation(deps.jobs, released.runId);
      scheduleComputerSleep(deps.jobs, bot.computer.id);
      return { ok: true as const };
    }),
    input: authed.computer.input.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      const computer = bot.computer;
      if (!computer || !hasActiveComputerControl(computer) || computer.controlBotId !== bot.id) {
        await expireStaleComputerControl(deps, computer);
        throw new ORPCError("FORBIDDEN");
      }
      if (!computer.providerRef) return { ok: true as const };
      const mapped =
        input.kind === "key"
          ? { kind: "key" as const, key: String(input.payload.key ?? "") }
          : input.kind === "clipboard"
            ? { kind: "clipboard" as const, text: String(input.payload.text ?? "") }
            : input.kind === "scroll"
              ? {
                  kind: "scroll" as const,
                  direction: input.payload.direction === "up" ? ("up" as const) : ("down" as const),
                  amount: Number(input.payload.amount ?? 3),
                }
              : {
                  kind: "pointer" as const,
                  x: Number(input.payload.x ?? 0),
                  y: Number(input.payload.y ?? 0),
                  button: (input.payload.button as "left" | "right" | undefined) ?? "left",
                  type:
                    (input.payload.type as "move" | "down" | "up" | "click" | undefined) ?? "click",
                };
      const outcome = await taughtSkills.recordInput(context.actor, bot.id, mapped);
      if (outcome === "stale") return { ok: true as const };
      if (outcome !== "recorded") {
        await applyTeachingDesktopInput(
          deps.sandbox,
          computer,
          mapped,
          computerContext(context.actor, bot.id, "input"),
        );
      }
      await deps.prisma.computer.updateMany({
        where: { id: computer.id, state: "running" },
        data: { updatedAt: new Date() },
      });
      scheduleComputerSleep(deps.jobs, computer.id);
      return { ok: true as const };
    }),
    files: authed.computer.files.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      if (!bot.computer) throw new IsolationError();
      const computer = bot.computer;
      const computerMode = parseComputerMode(computer.scope);
      const ctx = computerContext(context.actor, bot.id, "files");
      const storedPath = resolveBotWorkspacePath(computerMode, bot.id, input.path);
      let entries: Awaited<ReturnType<SandboxProvider["listFiles"]>>;
      if (computer.state === "running" && computer.providerRef) {
        await deps.prisma.computer.updateMany({
          where: { id: computer.id, state: "running" },
          data: { updatedAt: new Date() },
        });
        scheduleComputerSleep(deps.jobs, computer.id);
        entries = await deps.sandbox.listFiles(toComputerRef(computer), storedPath, ctx);
      } else {
        entries = await deps.home.list(computer.homeKey, storedPath, ctx);
      }
      return entries.map((entry) => ({
        ...entry,
        path: displayBotWorkspacePath(computerMode, bot.id, input.path, entry.path),
      }));
    }),
    readFile: authed.computer.readFile.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      if (!bot.computer) throw new IsolationError();
      const computerMode = parseComputerMode(bot.computer.scope);
      const ctx = computerContext(context.actor, bot.id, "read");
      const storedPath = resolveBotWorkspacePath(computerMode, bot.id, input.path);
      let content: string;
      if (bot.computer.state === "running" && bot.computer.providerRef) {
        await deps.prisma.computer.updateMany({
          where: { id: bot.computer.id, state: "running" },
          data: { updatedAt: new Date() },
        });
        scheduleComputerSleep(deps.jobs, bot.computer.id);
        const bytes = await deps.sandbox.readFile(toComputerRef(bot.computer), storedPath, ctx, {
          maxBytes: MAX_COMPUTER_TEXT_FILE_BYTES,
        });
        content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else {
        try {
          content = await deps.home.readFile(bot.computer.homeKey, storedPath, ctx, {
            maxBytes: MAX_COMPUTER_TEXT_FILE_BYTES,
          });
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("agent home file exceeds ")) {
            throw new ORPCError("BAD_REQUEST", { message: "file is too large to preview" });
          }
          throw error;
        }
      }
      return { path: input.path, content };
    }),
    screenUrl: authed.computer.screenUrl.handler(async ({ context, input }) => {
      let bot = await repos.getBot(context.actor, input.botId);
      if (await expireStaleComputerControl(deps, bot.computer)) {
        bot = await repos.getBot(context.actor, input.botId);
      }
      if (
        !bot.computer?.providerRef ||
        (bot.computer.state !== "running" && bot.computer.state !== "booting")
      ) {
        return { url: null };
      }
      const computer = bot.computer;
      const session = await deps.sandbox
        .connectScreen(
          toComputerRef(computer),
          {
            view: "stream",
            interactive: hasActiveComputerControl(computer) && computer.controlBotId === bot.id,
            controlToken:
              computer.controlBotId === bot.id ? (computer.controlLeaseId ?? undefined) : undefined,
          },
          await computerScreenContext(deps.prisma, context.actor, computer.id, bot.id, "screen"),
        )
        .catch(async (error: unknown) => {
          if (!isSandboxGoneError(error)) throw error;
          // The provider killed this sandbox (idle timeout) while the row still says
          // running. Clear the dead ref so the UI offers a boot instead of 500ing.
          // Leave any active control lease alone — expireComputerControl owns that
          // release (provider screen-control, events, takeover continuation).
          console.error(`computer ${computer.id} sandbox ${computer.providerRef} is gone`, error);
          await deps.prisma.computer.updateMany({
            where: { id: computer.id, providerRef: computer.providerRef },
            data: { state: "stopped", providerRef: null },
          });
          return null;
        });
      if (!session?.url) return { url: null };
      scheduleComputerSleep(deps.jobs, bot.computer.id);
      const viewUrl = withViewOnly(
        session.url,
        !(hasActiveComputerControl(bot.computer) && bot.computer.controlBotId === bot.id),
      );
      return {
        url: addScreenProxyCapability(
          viewUrl,
          deps.env.screenProxySecret,
          deps.env.webOrigin,
          undefined,
          { proxyExternal: bot.computer.kind === "box" },
        ),
      };
    }),
    heartbeat: authed.computer.heartbeat.handler(async ({ context, input }) => {
      const bot = await repos.getBot(context.actor, input.botId);
      if (bot.computer?.state === "running" && bot.computer.providerRef) {
        await deps.prisma.computer.updateMany({
          where: { id: bot.computer.id, state: "running" },
          data: { updatedAt: new Date() },
        });
        await touchRunningComputer(
          { sandbox: deps.sandbox, jobs: deps.jobs },
          {
            id: bot.computer.id,
            homeKey: bot.computer.homeKey,
            providerRef: bot.computer.providerRef,
            kind: bot.computer.kind,
          },
        ).catch(() => undefined);
      }
      return { ok: true as const };
    }),
  };
}
