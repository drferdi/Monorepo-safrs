import type { AIProvider, AIRequest, AIResponse } from "@sentrabot/adapter-kit";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const MODEL_BY_CLASS = {
  luna: "gpt-5.6-luna",
  terra: "gpt-5.6-terra",
  sol: "gpt-5.6-sol",
} as const;

export class OpenAiManagedProvider implements AIProvider {
  private readonly fetch: typeof globalThis.fetch;

  constructor(private readonly dependencies: { apiKey: string; fetch?: typeof globalThis.fetch }) {
    this.fetch = dependencies.fetch ?? globalThis.fetch;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const response = await this.fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.dependencies.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_BY_CLASS[request.modelClass],
        input: request.input,
        ...(request.instructions ? { instructions: request.instructions } : {}),
        ...(request.maxOutputTokens ? { max_output_tokens: request.maxOutputTokens } : {}),
        store: false,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API failed: ${response.status}`);
    const body = (await response.json()) as OpenAiResponse;
    if (typeof body.output_text !== "string" || !body.usage) {
      throw new Error("OpenAI Responses API returned an invalid response");
    }
    return {
      outputText: body.output_text,
      usage: {
        inputTokens: body.usage.input_tokens,
        outputTokens: body.usage.output_tokens,
        cachedInputTokens: body.usage.input_tokens_details?.cached_tokens ?? 0,
      },
    };
  }

  async *stream(request: AIRequest) {
    const response = await this.generate(request);
    yield { type: "output_text_delta" as const, delta: response.outputText };
    yield { type: "completed" as const, usage: response.usage };
  }
}

interface OpenAiResponse {
  output_text?: unknown;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: { cached_tokens?: number };
  };
}
