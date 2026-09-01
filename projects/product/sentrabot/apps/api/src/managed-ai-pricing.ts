import type { AIUsage, ManagedAiModelClass } from "@sentrabot/adapter-kit";

const TOKENS_PER_MILLION = 1_000_000n;

const PRICE_MICRO_USD_PER_MILLION = {
  luna: { input: 200_000n, output: 1_200_000n },
  terra: { input: 2_000_000n, output: 12_000_000n },
  sol: { input: 4_000_000n, output: 20_000_000n },
} as const;

export const openAiPriceVersion = "2026-09-02";

export function calculateOpenAiCostMicros(input: {
  model: ManagedAiModelClass;
  usage: AIUsage;
}): bigint {
  const price = PRICE_MICRO_USD_PER_MILLION[input.model];
  return (
    ceilDiv(BigInt(input.usage.inputTokens) * price.input, TOKENS_PER_MILLION) +
    ceilDiv(BigInt(input.usage.outputTokens) * price.output, TOKENS_PER_MILLION)
  );
}

/** Conservative reservation, bounded by the gateway's accepted input and output caps. */
export function estimateOpenAiCostMicros(model: ManagedAiModelClass): bigint {
  return calculateOpenAiCostMicros({
    model,
    usage: { inputTokens: 8_000, outputTokens: 2_048 },
  });
}

function ceilDiv(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
}
