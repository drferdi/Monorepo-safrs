import { ORPCError } from "@orpc/server";
import { routineJobKey, routineWakeupJob, runContinueJob } from "@sentrabot/adapter-kit";
import type { Actor } from "@sentrabot/contracts";
import {
  expandSkillReferencesInPrompt,
  hasMixedOneShotSchedule,
  isOneShotRoutineCrons,
  nextCronDateAcrossStrict,
} from "@sentrabot/core";
import { type createRepos, IsolationError } from "@sentrabot/db";
import type { AgentSkillsService } from "../agent-skills.js";
import type { Authed } from "../authed.js";
import type { RouterDeps } from "../router.js";

export function createRoutineRoutes(
  deps: RouterDeps,
  authed: Authed,
  repos: ReturnType<typeof createRepos>,
  agentSkills: AgentSkillsService,
) {
  return {
    list: authed.routines.list.handler(async ({ context, input }) => {
      await repos.getBot(context.actor, input.botId);
      return listRoutinesDto(deps, context.actor, input.botId);
    }),
    create: authed.routines.create.handler(async ({ context, input }) => {
      if (hasMixedOneShotSchedule(input.crons)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "A one-time schedule can't be combined with other schedules.",
        });
      }
      if (input.active && isOneShotRoutineCrons(input.crons)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "One-shot schedules must be created from chat.",
        });
      }
      const bot = await repos.getBot(context.actor, input.botId);
      // Validate every recurring cron even when inactive; @once and webhook-only have no next date.
      let nextRunAt: Date | null = null;
      if (input.crons.length > 0 && !isOneShotRoutineCrons(input.crons)) {
        const computedNextRunAt = nextRoutineDate(input.crons, input.timezone);
        nextRunAt = input.active ? computedNextRunAt : null;
      }
      const row = await deps.prisma.routine.create({
        data: {
          workspaceId: context.actor.workspaceId,
          botId: input.botId,
          userId: context.actor.userId,
          name: input.name,
          prompt: input.prompt,
          crons: input.crons,
          timezone: input.timezone,
          notify: input.notify,
          active: input.active,
          webhookEnabled: input.webhookEnabled,
          nextRunAt,
        },
      });
      if (bot.thread) {
        await deps.events.append({
          workspaceId: context.actor.workspaceId,
          threadId: bot.thread.id,
          botId: bot.id,
          type: "routine.created",
          payload: { name: row.name },
        });
      }
      if (row.active && row.nextRunAt) {
        await deps.jobs.enqueue(routineWakeupJob(row.id, row.nextRunAt));
      }
      return mapRoutine(row);
    }),
    update: authed.routines.update.handler(async ({ context, input }) => {
      const existing = await deps.prisma.routine.findFirst({
        where: {
          id: input.routineId,
          workspaceId: context.actor.workspaceId,
          userId: context.actor.userId,
        },
      });
      if (!existing) throw new IsolationError();
      const active = input.active ?? existing.active;
      const crons = input.crons ?? existing.crons;
      const timezone = input.timezone ?? existing.timezone;
      const webhookEnabled = input.webhookEnabled ?? existing.webhookEnabled;
      if (crons.length === 0 && !webhookEnabled) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Add a schedule or webhook trigger",
        });
      }
      if (hasMixedOneShotSchedule(crons)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "A one-time schedule can't be combined with other schedules.",
        });
      }
      if (active && isOneShotRoutineCrons(crons)) {
        if (!isOneShotRoutineCrons(existing.crons)) {
          throw new ORPCError("BAD_REQUEST", {
            message: "One-shot schedules must be created from chat.",
          });
        }
        if (!existing.nextRunAt && existing.lastRunAt) {
          throw new ORPCError("BAD_REQUEST", {
            message: "This one-shot already ran.",
          });
        }
      }
      const scheduleChanged =
        (!existing.active && active) ||
        (input.crons !== undefined &&
          JSON.stringify(input.crons) !== JSON.stringify(existing.crons)) ||
        (input.timezone !== undefined && input.timezone !== existing.timezone);
      const recalculatedNextRunAt =
        crons.length > 0 &&
        !isOneShotRoutineCrons(crons) &&
        (scheduleChanged || (active && !existing.nextRunAt))
          ? nextRoutineDate(crons, timezone)
          : null;
      let armedOneShotAt: Date | null = null;
      if (active && isOneShotRoutineCrons(crons) && !existing.nextRunAt && !existing.lastRunAt) {
        if (!input.runAt) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Add a run time for this one-shot.",
          });
        }
        const parsed = new Date(input.runAt);
        if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Run time must be in the future.",
          });
        }
        armedOneShotAt = parsed;
      } else if (input.runAt !== undefined) {
        throw new ORPCError("BAD_REQUEST", {
          message: "A run time is only for one-shots that have not run yet.",
        });
      }
      const nextRunAt = !active
        ? null
        : crons.length === 0
          ? null
          : isOneShotRoutineCrons(crons)
            ? (armedOneShotAt ?? existing.nextRunAt)
            : (recalculatedNextRunAt ?? existing.nextRunAt);
      const row = await deps.prisma.routine.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          prompt: input.prompt,
          crons: input.crons,
          timezone: input.timezone,
          active: input.active,
          notify: input.notify,
          webhookEnabled: input.webhookEnabled,
          nextRunAt,
        },
      });
      const bot = await repos.getBot(context.actor, row.botId);
      if (bot.thread) {
        await deps.events.append({
          workspaceId: context.actor.workspaceId,
          threadId: bot.thread.id,
          botId: bot.id,
          type: "routine.updated",
          payload: { routineId: row.id, active: row.active },
        });
      }
      const scheduleNeedsSync =
        existing.active !== row.active ||
        scheduleChanged ||
        (!existing.nextRunAt && !!row.nextRunAt);
      if (scheduleNeedsSync) {
        if (row.active && row.nextRunAt) {
          await deps.jobs.enqueue(routineWakeupJob(row.id, row.nextRunAt));
        } else {
          await deps.jobs.cancel(routineJobKey(row.id));
        }
      }
      return mapRoutine(row);
    }),
    remove: authed.routines.remove.handler(async ({ context, input }) => {
      const existing = await deps.prisma.routine.findFirst({
        where: { id: input.routineId, workspaceId: context.actor.workspaceId },
      });
      if (!existing) throw new IsolationError();
      await deps.prisma.routine.delete({ where: { id: existing.id } });
      await deps.jobs.cancel(routineJobKey(existing.id));
      return { ok: true as const };
    }),
    testRun: authed.routines.testRun.handler(async ({ context, input }) => {
      const routine = await deps.prisma.routine.findFirst({
        where: {
          id: input.routineId,
          workspaceId: context.actor.workspaceId,
          userId: context.actor.userId,
        },
      });
      if (!routine) throw new IsolationError();
      const bot = await repos.getBot(context.actor, routine.botId);
      if (!bot.thread) throw new IsolationError();
      const threadId = bot.thread.id;
      const nonce = input.clientNonce ? `routine-test:${input.clientNonce}` : undefined;
      if (nonce) {
        const existing = await deps.prisma.run.findFirst({
          where: { threadId, clientNonce: nonce },
          select: { id: true },
        });
        if (existing) return { runId: existing.id };
      }
      const skillRecords = await agentSkills.listWithContent(context.actor);
      const prompt = expandSkillReferencesInPrompt(routine.prompt, skillRecords);
      let run: { id: string };
      try {
        // Task + run must commit together so a nonce collision cannot leave an orphan queued Task.
        run = await deps.prisma.$transaction(async (tx) => {
          if (nonce) {
            const existing = await tx.run.findFirst({
              where: { threadId, clientNonce: nonce },
              select: { id: true },
            });
            if (existing) return existing;
          }
          const task = await tx.task.create({
            data: {
              workspaceId: context.actor.workspaceId,
              botId: bot.id,
              threadId,
              userId: context.actor.userId,
              prompt,
              status: "queued",
            },
          });
          return tx.run.create({
            data: {
              workspaceId: context.actor.workspaceId,
              botId: bot.id,
              threadId,
              taskId: task.id,
              userId: context.actor.userId,
              status: "queued",
              trigger: "routine",
              routineId: routine.id,
              clientNonce: nonce,
            },
            select: { id: true },
          });
        });
      } catch (error) {
        if (nonce) {
          const existing = await deps.prisma.run.findFirst({
            where: { threadId, clientNonce: nonce },
            select: { id: true },
          });
          if (existing) return { runId: existing.id };
        }
        throw error;
      }
      // Keep enqueue outside the nonce-collision catch. The queued run is durable;
      // log enqueue failures and still return success — the reconciler repairs a missed wake.
      await deps.jobs.enqueue(runContinueJob(run.id)).catch((error) => {
        console.error("routine testRun enqueue", error);
      });
      return { runId: run.id };
    }),
  };
}

export function nextRoutineDate(crons: string[], timezone: string): Date {
  let next: Date | null;
  try {
    next = nextCronDateAcrossStrict(crons, new Date(), timezone);
  } catch {
    throw new ORPCError("BAD_REQUEST", { message: "Enter a valid cron expression." });
  }
  if (!next) throw new ORPCError("BAD_REQUEST", { message: "Enter a valid cron expression." });
  return next;
}

export function mapRoutine(row: {
  id: string;
  botId: string;
  name: string;
  prompt: string;
  crons: string[];
  timezone: string;
  active: boolean;
  notify: boolean;
  webhookEnabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    botId: row.botId,
    name: row.name,
    prompt: row.prompt,
    crons: row.crons,
    timezone: row.timezone,
    active: row.active,
    notify: row.notify,
    webhookEnabled: row.webhookEnabled,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRoutinesDto(deps: RouterDeps, actor: Actor, botId: string) {
  const rows = await deps.prisma.routine.findMany({
    where: { botId, workspaceId: actor.workspaceId },
  });
  return rows.map(mapRoutine);
}
