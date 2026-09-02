import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.WAKEUP_DRIVER = "memory";
process.env.SANDBOX_PROVIDER = "desktop";
process.env.AGENT_RUNTIME = "scripted";

const hasDb = process.env.VERIFY_DATABASE === "1" && Boolean(process.env.DATABASE_URL);
const describeIntegration = hasDb ? describe : describe.skip;

type MessageBlockRow = { kind?: string; text?: string; approvalEffectId?: string };

describeIntegration("host execution approval", () => {
  let handles: Awaited<ReturnType<typeof import("../../../apps/api/src/app.ts")["createApp"]>>;
  const dataDir = mkdtempSync(path.join(tmpdir(), "sentrabot-host-approval-"));
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const shellPrompt = 'run the shell command "echo host-check"';

  beforeAll(async () => {
    const { createApp } = await import("../../../apps/api/src/app.ts");
    handles = await createApp({
      databaseUrl: process.env.DATABASE_URL!,
      dataDir,
      sandboxProvider: "desktop",
      agentRuntime: "scripted",
      wakeupDriver: "memory",
      defaultProvider: "scripted",
      defaultModel: "scripted",
    });
  });

  afterAll(async () => {
    await handles?.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("shell asks for approval on a trusted host computer", async () => {
    const seeded = await seedRun("ask", shellPrompt);

    await handles.executor.continueRun(seeded.run.id, "host-worker");

    const [run, messages, effects] = await Promise.all([
      handles.prisma.run.findUniqueOrThrow({ where: { id: seeded.run.id } }),
      handles.prisma.message.findMany({
        where: { threadId: seeded.thread.id },
        orderBy: { seq: "desc" },
      }),
      handles.prisma.externalEffect.findMany({ where: { runId: seeded.run.id } }),
    ]);
    expect(run.status).toBe("waiting_input");

    const newest = messages[0];
    expect(newest).toBeTruthy();
    const blocks = newest.blocks as MessageBlockRow[];
    const ask = blocks.find((block) => block.kind === "ask");
    expect(ask).toBeTruthy();
    expect(typeof ask?.approvalEffectId).toBe("string");
    expect(ask?.text).toMatch(/shell/);

    // shell is not read-only, so the executor records the intended effect before pausing.
    const shellEffects = effects.filter((effect) => effect.kind === "shell");
    expect(shellEffects).toHaveLength(1);
    expect(shellEffects[0]).toMatchObject({ status: "intended" });
  });

  it("an always_allow rule lets shell run on the host without pausing", async () => {
    const seeded = await seedRun("allow", shellPrompt);
    await handles.prisma.actionApprovalRule.create({
      data: {
        workspaceId: seeded.me.workspaceId,
        createdByUserId: seeded.me.userId,
        effect: "always_allow",
        matchKind: "tool",
        matchValue: "shell",
      },
    });

    await handles.executor.continueRun(seeded.run.id, "host-worker");

    const [run, messages, effects] = await Promise.all([
      handles.prisma.run.findUniqueOrThrow({ where: { id: seeded.run.id } }),
      handles.prisma.message.findMany({
        where: { threadId: seeded.thread.id },
        orderBy: { seq: "desc" },
      }),
      handles.prisma.externalEffect.findMany({ where: { runId: seeded.run.id } }),
    ]);
    expect(run.status).toBe("completed");

    const askBlocks = messages
      .flatMap((message) => message.blocks as MessageBlockRow[])
      .filter((block) => block.kind === "ask" && typeof block.approvalEffectId === "string");
    expect(askBlocks).toEqual([]);

    const shellEffects = effects.filter((effect) => effect.kind === "shell");
    expect(shellEffects).toHaveLength(1);
    expect(shellEffects[0]).toMatchObject({ status: "completed" });
  });

  async function seedRun(label: string, prompt: string) {
    const cookie = await signup(`host-${label}-${stamp}@sentrabot.test`, `Host ${label}`);
    const me = await rpc<{ userId: string; workspaceId: string }>(cookie, "me");
    const bot = await rpc<{ id: string }>(cookie, "bots/create", {
      name: `Host ${label}`,
      title: "",
      description: "",
      instructions: "",
      notifyOnFinish: false,
    });
    const thread = await handles.prisma.thread.findUniqueOrThrow({ where: { botId: bot.id } });
    const task = await handles.prisma.task.create({
      data: {
        workspaceId: me.workspaceId,
        botId: bot.id,
        threadId: thread.id,
        userId: me.userId,
        prompt,
        status: "queued",
      },
    });
    const run = await handles.prisma.run.create({
      data: {
        workspaceId: me.workspaceId,
        botId: bot.id,
        threadId: thread.id,
        taskId: task.id,
        userId: me.userId,
        status: "queued",
        trigger: "user",
      },
    });
    return { cookie, me, bot, thread, task, run };
  }

  async function signup(email: string, name: string) {
    const response = await handles.app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({ email, password: "password12", name }),
    });
    expect(response.status).toBeLessThan(400);
    const raw = response.headers.get("set-cookie") ?? "";
    const match = raw.match(/better-auth\.session_token=([^;]+)/);
    expect(match?.[1]).toBeTruthy();
    return `better-auth.session_token=${match![1]}`;
  }

  async function rpc<T>(cookie: string, procedure: string, body: unknown = {}): Promise<T> {
    const response = await handles.app.request(`/rpc/${procedure}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:5173",
        cookie,
      },
      body: JSON.stringify({ json: body }),
    });
    const payload = (await response.json()) as { json?: T; error?: { message?: string } };
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message ?? `${procedure} failed (${response.status})`);
    }
    return payload.json as T;
  }
});
