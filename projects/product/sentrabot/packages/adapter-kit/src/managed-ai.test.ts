import { describe, expect, it } from "vitest";

describe("managed AI provider contract", () => {
  it("keeps private input transient while returning usage metadata", async () => {
    const { collectAiResponse } = await import("./managed-ai.js");
    const response = await collectAiResponse(
      {
        generate: async (request) => ({
          outputText: request.input,
          usage: { inputTokens: 2, outputTokens: 3 },
        }),
        stream: async function* () {},
      },
      {
        modelClass: "luna",
        input: "private text",
      },
    );

    expect(response).toEqual({
      outputText: "private text",
      usage: { inputTokens: 2, outputTokens: 3 },
    });
  });
});
