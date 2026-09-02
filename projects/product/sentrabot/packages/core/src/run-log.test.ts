import { afterEach, describe, expect, it } from "vitest";
import { runLog, setRunLogSink } from "./run-log.js";

afterEach(() => {
  setRunLogSink(null);
});

describe("runLog", () => {
  it("writes one JSON line with the given fields, dropping undefined values", () => {
    const lines: string[] = [];
    setRunLogSink({ write: (line) => lines.push(line) });

    runLog("run.started", { runId: "r1", fence: 2, skipped: undefined });

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!);
    expect(entry.event).toBe("run.started");
    expect(entry.runId).toBe("r1");
    expect(entry.fence).toBe(2);
    expect("skipped" in entry).toBe(false);
    expect(entry.level).toBe("info");
    expect(typeof entry.ts).toBe("string");
    expect(new Date(entry.ts).toISOString()).toBe(entry.ts);
  });

  it("preserves an explicit error level", () => {
    const lines: string[] = [];
    setRunLogSink({ write: (line) => lines.push(line) });

    runLog("run.lease.lost", { runId: "r1" }, "error");

    const entry = JSON.parse(lines[0]!);
    expect(entry.level).toBe("error");
  });

  it("does not propagate when the sink throws", () => {
    setRunLogSink({
      write: () => {
        throw new Error("sink failure");
      },
    });

    expect(() => runLog("run.started", { runId: "r1" })).not.toThrow();
  });
});
