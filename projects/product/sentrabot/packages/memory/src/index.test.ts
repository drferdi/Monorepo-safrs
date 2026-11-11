import type { AdapterContext } from "@sentrabot/adapter-kit";
import { describe, expect, it, vi } from "vitest";
import { MarkdownMemoryStore } from "./index.js";

const context: AdapterContext = {
  operationId: "read-memory",
  traceId: "read-memory",
  workspaceId: "workspace-1",
  userId: "user-1",
  signal: new AbortController().signal,
};

describe("memory store contract shape", () => {
  it("declares markdown portability", () => {
    const store = new MarkdownMemoryStore({} as never);
    expect(store.describe().capabilities.markdownPortable).toBe(true);
  });

  it("reads the most recently updated documents first", async () => {
    const updatedAt = new Date("2026-08-16T10:00:00.000Z");
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { id: "memory-1", path: "facts.md", content: "A fact", revision: 3, updatedAt },
      ]);
    const store = new MarkdownMemoryStore({ memoryDocument: { findMany } } as never);

    await expect(store.read({ scope: "bot", botId: "bot-1" }, context)).resolves.toEqual({
      documents: [
        {
          id: "memory-1",
          path: "facts.md",
          content: "A fact",
          revision: 3,
          updatedAt: updatedAt.toISOString(),
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace-1",
        userId: "user-1",
        scope: "bot",
        botId: "bot-1",
      },
      orderBy: [{ updatedAt: "desc" }, { path: "asc" }],
    });
  });

  it("looks up an existing document scoped to the committing user, not any user at that path", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({
      id: "memory-2",
      path: "notes.md",
      content: "hi",
      revision: 1,
    });
    const revisionCreate = vi.fn().mockResolvedValue(undefined);
    const store = new MarkdownMemoryStore({
      memoryDocument: { findFirst, create },
      memoryRevision: { create: revisionCreate },
    } as never);

    await store.commit({ scope: "user", path: "notes.md", content: "hi" }, context);

    // The natural key a second user's own "notes.md" must not collide with must include userId,
    // matching the DB's (workspaceId, userId, scope, botId, path) unique index.
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace-1",
        userId: "user-1",
        scope: "user",
        botId: null,
        path: "notes.md",
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: "workspace-1", userId: "user-1" }),
    });
  });
});
