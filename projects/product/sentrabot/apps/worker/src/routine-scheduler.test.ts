import { describe, expect, it, vi } from "vitest";
import { createRoutineScheduler } from "./routine-scheduler.js";

describe("routine scheduler boundary", () => {
  it("converts a bounded routine into an execution request", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const schedule = createRoutineScheduler({
      enqueue,
      now: () => new Date("2026-08-21T00:00:00.000Z"),
    });
    const request = await schedule({
      routineId: "routine_1",
      workspaceId: "workspace_1",
      userId: "user_1",
      botId: "bot_1",
      prompt: "Summarize work",
      provider: "fake",
      model: "fake-model",
    });

    expect(request.requestId).toBe(
      "routine:routine_1:2026-08-21T00:00:00.000Z",
    );
    expect(enqueue).toHaveBeenCalledWith(request);
  });

  it("rejects invalid routines before enqueue", async () => {
    const enqueue = vi.fn();
    const schedule = createRoutineScheduler({ enqueue });
    await expect(
      schedule({ routineId: "routine_1", prompt: "" }),
    ).rejects.toThrow();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
