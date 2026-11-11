export type ManagedAiModelClass = "luna" | "terra" | "sol";

/** Runtime-only plaintext. It must never be sent to a persistence adapter. */
export interface AIRequest {
  modelClass: ManagedAiModelClass;
  input: string;
  instructions?: string;
  maxOutputTokens?: number;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface AIResponse {
  outputText: string;
  usage: AIUsage;
}

export type AIEvent =
  | { type: "output_text_delta"; delta: string }
  | { type: "completed"; usage: AIUsage }
  | { type: "error"; message: string };

export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIEvent>;
}

export function collectAiResponse(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
  return provider.generate(request);
}
