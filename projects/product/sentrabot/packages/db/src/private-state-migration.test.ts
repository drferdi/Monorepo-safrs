import { describe, expect, it, vi } from "vitest";

describe("private-state migration", () => {
  it("does not mark a workspace E2EE-ready until encrypted local import succeeds", async () => {
    const { migrateWorkspaceToE2ee } = await import("./private-state-migration.js");
    const upsert = vi.fn();
    const db = { workspacePrivacyState: { upsert } };

    await expect(
      migrateWorkspaceToE2ee(db as any, {
        workspaceId: "workspace-1",
        importEncryptedLocally: async () => {
          throw new Error("local import failed");
        },
        now: new Date("2026-09-02T00:00:00.000Z"),
      }),
    ).rejects.toThrow("local import failed");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("exports only the owner's migratable legacy state and never credential records", async () => {
    const { exportLegacyPrivateState } = await import("./private-state-migration.js");
    const records = await exportLegacyPrivateState(
      {
        bot: { findMany: vi.fn().mockResolvedValue([{ id: "bot-1", name: "Private bot" }]) },
        thread: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "thread-1",
              messages: [{ id: "message-1", role: "user", blocks: [{ text: "private" }] }],
            },
          ]),
        },
        memoryDocument: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "memory-1", content: "private memory", revision: 3 }]),
        },
        routine: {
          findMany: vi.fn().mockResolvedValue([{ id: "routine-1", prompt: "private schedule" }]),
        },
      } as any,
      { userId: "user-1", workspaceId: "workspace-1" },
    );

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ objectId: "legacy:bot:bot-1", objectType: "bot" }),
        expect.objectContaining({ objectId: "legacy:thread:thread-1", objectType: "conversation" }),
        expect.objectContaining({
          objectId: "legacy:memory:memory-1",
          objectType: "memory",
          version: 3,
        }),
        expect.objectContaining({ objectId: "legacy:routine:routine-1", objectType: "setting" }),
      ]),
    );
    expect(JSON.stringify(records)).not.toContain("secretId");
  });
});
