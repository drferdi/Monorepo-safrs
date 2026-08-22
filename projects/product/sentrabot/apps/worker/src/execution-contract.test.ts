import { describe, expect, it, vi } from "vitest";
import { createIdempotentExecutor } from "./execution-contract.js";
import { createFakeProviderRuntime } from "./fake-provider.js";

describe("worker execution contract", () => {
  it("deduplicates concurrent requests by requestId", async () => {
    const run = vi.fn().mockResolvedValue("done");
    const execute = createIdempotentExecutor({ run });
    const input = {
      requestId: "request_1",
      workspaceId: "workspace_1",
      userId: "user_1",
      botId: "bot_1",
      prompt: "hello",
      provider: "fake",
      model: "fake-model",
    };

    const [first, second] = await Promise.all([execute(input), execute(input)]);
    expect(first).toEqual({
      requestId: "request_1",
      status: "completed",
      output: "done",
    });
    expect(second).toEqual(first);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized or empty prompts before runtime access", async () => {
    const run = vi.fn();
    const execute = createIdempotentExecutor({ run });
    await expect(
      execute({ requestId: "request_1", prompt: "" }),
    ).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  });

  it("runs a deterministic fake-provider journey without credentials", async () => {
    const execute = createIdempotentExecutor(createFakeProviderRuntime());
    await expect(
      execute({
        requestId: "journey_1",
        workspaceId: "workspace_1",
        userId: "user_1",
        botId: "bot_1",
        prompt: "ping",
        provider: "fake",
        model: "fake-model",
      }),
    ).resolves.toEqual({
      requestId: "journey_1",
      status: "completed",
      output: "[fake:fake-model] ping",
    });
  });
});
