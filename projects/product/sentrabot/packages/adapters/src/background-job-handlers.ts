import type {
  AgentHomeStore,
  AgentRuntime,
  BackgroundJobHandlers,
  JobPublisher,
  MessagingProvider,
  SandboxProvider,
} from "@sentrabot/adapter-kit";
import { phoneDeliverJob } from "@sentrabot/adapter-kit";
import type { PhoneLocale } from "@sentrabot/core";
import type { PrismaClient, ThreadEvents } from "@sentrabot/db";
import { expireComputerControl } from "./computer-control.js";
import { scheduleComputerSleep, sleepComputerIfIdle } from "./computer-idle.js";
import type { createRunExecutor } from "./executor.js";
import { compactHistory } from "./history-compaction.js";
import type { MemoryProviderResolver } from "./memory-provider-factory.js";
import { deliverPhoneOutbound } from "./phone-delivery.js";
import type { EncryptedSecretStore } from "./secrets.js";
import { expireTaughtSkillTeaching } from "./teaching-session.js";

export function createBackgroundJobHandlers(deps: {
  executor: ReturnType<typeof createRunExecutor>;
  prisma: PrismaClient;
  sandbox: SandboxProvider;
  home: AgentHomeStore;
  jobs: JobPublisher;
  events: ThreadEvents;
  workerId: string;
  runtime: AgentRuntime;
  secretStore: EncryptedSecretStore;
  memoryProviders: MemoryProviderResolver;
  deploymentModelKey?: string;
  messaging?: MessagingProvider;
  whatsappMessaging?: MessagingProvider;
  phoneLocale?: PhoneLocale;
}): BackgroundJobHandlers {
  const primaryMessaging = () => deps.messaging ?? deps.whatsappMessaging;
  return {
    "run.continue": async (payload) => {
      await deps.executor.continueRun(payload.runId, deps.workerId);
      // Automatic phone mirror: once the run's bot messages are durable,
      // copy them into the outbox. Never let mirror failures fail the run.
      if (primaryMessaging()) {
        await deps.jobs.enqueue(phoneDeliverJob(payload.runId)).catch((error) => {
          console.error("phone.deliver enqueue error", error);
        });
      }
    },
    "phone.deliver": async (payload) => {
      const messaging = primaryMessaging();
      if (!messaging) return;
      await deliverPhoneOutbound(
        {
          prisma: deps.prisma,
          messaging,
          whatsappMessaging: deps.whatsappMessaging,
          events: deps.events,
          jobs: deps.jobs,
          locale: deps.phoneLocale,
        },
        payload,
        {
          operationId: `phone.deliver:${payload.runId ?? "drain"}`,
          traceId: `phone.deliver:${payload.runId ?? "drain"}`,
          workspaceId: "",
          userId: "",
          signal: new AbortController().signal,
        },
      );
    },
    "routine.wakeup": async (payload) => {
      await deps.executor.wakeRoutine(payload.routineId, payload.scheduledFor);
    },
    "computer.sleep": async (payload) => {
      await sleepComputerIfIdle(deps, payload.computerId);
    },
    "computer.control-expire": async (payload) => {
      if (await expireComputerControl(deps, payload.computerId, payload.leaseId)) {
        scheduleComputerSleep(deps.jobs, payload.computerId);
      }
    },
    "skill.teaching-expire": async (payload) => {
      await expireTaughtSkillTeaching(deps, payload.skillId);
    },
    "history.compact": async (payload) => {
      await compactHistory(
        {
          prisma: deps.prisma,
          runtime: deps.runtime,
          jobs: deps.jobs,
          memoryProviders: deps.memoryProviders,
          deploymentModelKey: deps.deploymentModelKey,
          ...(deps.executor.resolveModel ? { resolveModel: deps.executor.resolveModel } : {}),
        },
        payload.threadId,
      );
    },
  };
}
