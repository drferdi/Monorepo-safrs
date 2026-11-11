import { describe, expect, it } from "vitest";

describe("managed AI pricing", () => {
  it("calculates Luna usage in micro-USD from the active price version", async () => {
    const { calculateOpenAiCostMicros } = await import("./managed-ai-pricing.js");

    expect(
      calculateOpenAiCostMicros({
        model: "luna",
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      }),
    ).toBe(1_400_000n);
  });
});
