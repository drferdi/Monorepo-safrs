import type {
  AgentHomeStore,
  AgentRuntime,
  JobPublisher,
  MessagingProvider,
  SandboxProvider,
} from "@sentrabot/adapter-kit";
import { phoneDeliverJob } from "@sentrabot/adapter-kit";
import type { PrismaClient, ThreadEvents } from "@sentrabot/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackgroundJobHandlers } from "./background-job-handlers.js";
import { createRunExecutor } from "./executor.js";
import { compactHistory } from "./history-compaction.js";
import { deliverPhoneOutbound } from "./phone-delivery.js";
import type { EncryptedSecretStore } from "./secrets.js";

vi.mock("./history-compaction.js", () => ({ compactHistory: vi.fn(async () => undefined) }));
vi.mock("./phone-delivery.js", () => ({ deliverPhoneOutbound: vi.fn(async () => undefined) }));

describe("createBackgroundJobHandlers", () => {
  it("compacts the requested thread with the runtime, job publisher, and model key it was given", async () => {
    const prisma = {} as unknown as PrismaClient;
    const runtime = {} as unknown as AgentRuntime;
    const jobs = {} as unknown as JobPublisher;
    const secretStore = {} as unknown as EncryptedSecretStore;
    const memoryProviders = { resolve: vi.fn(async () => null) };
    const resolveModel = vi.fn();
    const handlers = createBackgroundJobHandlers({
      executor: { resolveModel } as unknown as ReturnType<typeof createRunExecutor>,
      prisma,
      sandbox: {} as unknown as SandboxProvider,
      home: {} as unknown as AgentHomeStore,
      jobs,
      events: {} as unknown as ThreadEvents,
      workerId: "worker-1",
      runtime,
      secretStore,
      memoryProviders,
      deploymentModelKey: "openrouter-key",
    });

    await handlers["history.compact"]({ threadId: "thread-1" });

    expect(compactHistory).toHaveBeenCalledWith(
      {
        prisma,
        runtime,
        jobs,
        memoryProviders,
        deploymentModelKey: "openrouter-key",
        resolveModel,
      },
      "thread-1",
    );
  });

  it("resolves the deployment model when no user credential is configured", async () => {
    const prisma = {
      userModelCredential: { findFirst: vi.fn(async () => null) },
      deploymentSettings: { findUnique: vi.fn(async () => null) },
    } as unknown as PrismaClient;
    const executor = createRunExecutor({
      prisma,
      deploymentModelKey: "deployment-key",
    } as Parameters<typeof createRunExecutor>[0]);

    await expect(
      executor.resolveModel({ userId: "user-1", workspaceId: "workspace-1" }),
    ).resolves.toEqual({
      provider: "openrouter",
      id: "deepseek/deepseek-v4-flash-0731",
      apiKey: "deployment-key",
      baseUrl: undefined,
      thinkingLevel: null,
      oauth: undefined,
    });
  });

  it("preserves a configured local model when resolving background compaction", async () => {
    const prisma = {
      userModelCredential: { findFirst: vi.fn(async () => null) },
      deploymentSettings: {
        findUnique: vi.fn(async () => ({
          defaultModelProvider: "local",
          defaultModelId: "qwen3:4b",
        })),
      },
    } as unknown as PrismaClient;
    const executor = createRunExecutor({
      prisma,
    } as Parameters<typeof createRunExecutor>[0]);

    await expect(
      executor.resolveModel({ userId: "user-1", workspaceId: "workspace-1" }),
    ).resolves.toEqual({
      provider: "local",
      id: "qwen3:4b",
      apiKey: undefined,
      baseUrl: undefined,
      thinkingLevel: null,
      oauth: undefined,
    });
  });
});

describe("phone delivery wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildDeps(overrides: {
    messaging?: MessagingProvider;
    whatsappMessaging?: MessagingProvider;
    phoneLocale?: "id";
  }) {
    const executor = { continueRun: vi.fn(async () => undefined) } as unknown as ReturnType<
      typeof createRunExecutor
    >;
    const jobs = { enqueue: vi.fn(async () => undefined) } as unknown as JobPublisher;
    const deps = {
      executor,
      prisma: {} as unknown as PrismaClient,
      sandbox: {} as unknown as SandboxProvider,
      home: {} as unknown as AgentHomeStore,
      jobs,
      events: {} as unknown as ThreadEvents,
      workerId: "worker-1",
      runtime: {} as unknown as AgentRuntime,
      secretStore: {} as unknown as EncryptedSecretStore,
      memoryProviders: { resolve: vi.fn(async () => null) },
      ...overrides,
    };
    return { deps, executor, jobs };
  }

  it("enqueues a phone.deliver job when run.continue finishes and whatsappMessaging is configured", async () => {
    const whatsappMessagingStub = {} as MessagingProvider;
    const { deps, executor, jobs } = buildDeps({ whatsappMessaging: whatsappMessagingStub });
    const handlers = createBackgroundJobHandlers(deps);

    await handlers["run.continue"]({ runId: "run-1" });

    expect(executor.continueRun).toHaveBeenCalledWith("run-1", "worker-1");
    expect(jobs.enqueue).toHaveBeenCalledTimes(1);
    expect(jobs.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ name: "phone.deliver", payload: { runId: "run-1" } }),
    );
    expect(jobs.enqueue).toHaveBeenCalledWith(phoneDeliverJob("run-1"));
  });

  it("does not enqueue a phone.deliver job when no messaging provider is configured", async () => {
    const { deps, jobs } = buildDeps({});
    const handlers = createBackgroundJobHandlers(deps);

    await handlers["run.continue"]({ runId: "run-1" });

    expect(jobs.enqueue).not.toHaveBeenCalled();
  });

  it("delivers via whatsappMessaging when it is the only configured provider", async () => {
    const whatsappMessagingStub = {} as MessagingProvider;
    const { deps } = buildDeps({ whatsappMessaging: whatsappMessagingStub, phoneLocale: "id" });
    const handlers = createBackgroundJobHandlers(deps);

    await handlers["phone.deliver"]({ runId: "run-1" });

    expect(deliverPhoneOutbound).toHaveBeenCalledTimes(1);
    const [firstArg, secondArg] = vi.mocked(deliverPhoneOutbound).mock.calls[0]!;
    expect(firstArg.messaging).toBe(whatsappMessagingStub);
    expect(firstArg.whatsappMessaging).toBe(whatsappMessagingStub);
    expect(firstArg.locale).toBe("id");
    expect(secondArg).toEqual({ runId: "run-1" });
  });

  it("does not deliver when no messaging provider is configured", async () => {
    const { deps } = buildDeps({});
    const handlers = createBackgroundJobHandlers(deps);

    await handlers["phone.deliver"]({ runId: "run-1" });

    expect(deliverPhoneOutbound).not.toHaveBeenCalled();
  });

  it("prefers messaging (SendBlue) as the primary provider while still passing whatsappMessaging along", async () => {
    const sendBlueStub = {} as MessagingProvider;
    const whatsappStub = {} as MessagingProvider;
    const { deps } = buildDeps({ messaging: sendBlueStub, whatsappMessaging: whatsappStub });
    const handlers = createBackgroundJobHandlers(deps);

    await handlers["phone.deliver"]({ runId: "run-1" });

    const [firstArg] = vi.mocked(deliverPhoneOutbound).mock.calls[0]!;
    expect(firstArg.messaging).toBe(sendBlueStub);
    expect(firstArg.whatsappMessaging).toBe(whatsappStub);
  });
});
