import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryStore } from "@sentrabot/adapter-kit";
import type { PrismaClient, ThreadEvents } from "@sentrabot/db";
import { afterAll, beforeAll, expect, it } from "vitest";
import { composeAgentRuntime } from "./agent-runtime-composition.js";
import { EncryptedSecretStore } from "./secrets.js";
import { InMemoryJobQueue } from "./wakeup.js";

// Composition must not touch the database or the network: both processes build it
// before they own a connection, and a stub prisma proves nothing is queried eagerly.
const prisma = {} as PrismaClient;
const events = {} as ThreadEvents;
const memory = {
  describe: () => ({ id: "stub", contractVersion: "1", adapterVersion: "0.1.0", capabilities: {} }),
} as unknown as MemoryStore;

let dataDir = "";

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "sentrabot-composition-"));
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
});

it("composes one runtime both processes can share", async () => {
  const composition = await composeAgentRuntime({
    prisma,
    events,
    secrets: new EncryptedSecretStore("test-key"),
    jobs: new InMemoryJobQueue(),
    workerId: "test",
    dataDir,
    agentRuntime: "scripted",
    sandboxProvider: "fake",
    sandbox: { dataDir },
    composio: { enabled: false },
    mcp: { stdioEnabled: false, allowedCommands: [] },
    memory,
  });

  expect(composition.sandbox.describe().id).toBe("fake");
  expect(composition.runtime.describe().capabilities.scripted).toBe(true);
  expect(Object.keys(composition.jobHandlers)).toEqual(
    expect.arrayContaining(["run.continue", "routine.wakeup", "phone.deliver"]),
  );

  await expect(composition.stop()).resolves.toBeUndefined();
});
