import { describe, expect, it, vi } from "vitest";

describe("OpenAI Managed AI provider", () => {
  it("uses the Responses API without provider-side response storage", async () => {
    const { OpenAiManagedProvider } = await import("./openai-managed-ai.js");
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: "hasil privat",
          usage: {
            input_tokens: 12,
            output_tokens: 8,
            input_tokens_details: { cached_tokens: 2 },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const provider = new OpenAiManagedProvider({ apiKey: "test-key", fetch });

    await expect(
      provider.generate({
        modelClass: "luna",
        input: "prompt privat",
        instructions: "instruksi privat",
      }),
    ).resolves.toEqual({
      outputText: "hasil privat",
      usage: { inputTokens: 12, outputTokens: 8, cachedInputTokens: 2 },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer test-key" }),
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: "prompt privat",
          instructions: "instruksi privat",
          store: false,
        }),
      }),
    );
  });
});
