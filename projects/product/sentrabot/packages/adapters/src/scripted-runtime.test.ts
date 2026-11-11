import type { AgentRuntimeEvent } from "@sentrabot/adapter-kit";
import { describe, expect, it } from "vitest";
import { inferScript, ScriptedAgentRuntime } from "./scripted-runtime.js";

describe("ScriptedAgentRuntime executionIds", () => {
  it("gives repeated tools distinct executionIds within a run", async () => {
    const runtime = new ScriptedAgentRuntime();
    const events: AgentRuntimeEvent[] = [];
    for await (const event of runtime.run({
      botId: "bot-1",
      threadId: "thread-1",
      runId: "run-1",
      prompt: "ping",
      instructions: "",
      history: [],
      tools: [],
      model: { provider: "scripted", id: "scripted" },
      script: [
        {
          toolCalls: [
            { name: "message_agent", args: { phone: "+15551111111", message: "one" } },
            { name: "message_agent", args: { phone: "+15551111111", message: "two" } },
          ],
          complete: true,
        },
      ],
    })) {
      events.push(event);
    }

    const toolIds = events
      .filter(
        (event): event is Extract<AgentRuntimeEvent, { type: "tool" }> => event.type === "tool",
      )
      .map((event) => event.executionId);
    expect(toolIds).toEqual(["run-1:message_agent:0", "run-1:message_agent:1"]);
  });
});

describe("inferScript shell pattern", () => {
  it("maps a quoted shell command prompt to one shell tool call", () => {
    expect(inferScript('run the shell command "echo host-check"')).toEqual([
      {
        assistant: "Command finished.",
        toolCalls: [{ name: "shell", args: { command: "echo host-check" } }],
        complete: true,
      },
    ]);
  });
});
