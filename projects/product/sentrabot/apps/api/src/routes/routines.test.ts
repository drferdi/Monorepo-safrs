import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { mapRoutine, nextRoutineDate } from "./routines.js";

const baseRow = {
  id: "routine-1",
  botId: "bot-1",
  name: "Morning brief",
  prompt: "Summarise the inbox",
  crons: ["0 9 * * *"],
  timezone: "Asia/Jakarta",
  active: true,
  notify: true,
  webhookEnabled: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("mapRoutine", () => {
  it("serialises run timestamps to ISO strings", () => {
    const dto = mapRoutine({
      ...baseRow,
      lastRunAt: new Date("2026-01-02T03:04:05.000Z"),
      nextRunAt: new Date("2026-01-03T02:00:00.000Z"),
    });
    expect(dto.lastRunAt).toBe("2026-01-02T03:04:05.000Z");
    expect(dto.nextRunAt).toBe("2026-01-03T02:00:00.000Z");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("keeps missing run timestamps null", () => {
    const dto = mapRoutine({ ...baseRow, lastRunAt: null, nextRunAt: null });
    expect(dto.lastRunAt).toBeNull();
    expect(dto.nextRunAt).toBeNull();
  });
});

describe("nextRoutineDate", () => {
  it("returns the next occurrence in the future", () => {
    const next = nextRoutineDate(["0 9 * * *"], "Asia/Jakarta");
    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects an invalid cron expression", () => {
    expect(() => nextRoutineDate(["not a cron"], "UTC")).toThrow("Enter a valid cron expression.");
    try {
      nextRoutineDate(["not a cron"], "UTC");
      expect.unreachable("nextRoutineDate should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ORPCError);
      expect((error as ORPCError<string, unknown>).code).toBe("BAD_REQUEST");
    }
  });
});
