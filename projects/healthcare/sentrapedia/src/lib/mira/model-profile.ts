import profile from "../../../scripts/mira-profile.json";

export const selectedMiraModel = profile.model;
export const miraStepBudgetUsd = profile.stepBudgetUsd;
// The engine stops a step at its own deadline; the margin covers the health check and TheOracle grounding.
export const miraGatewayTimeoutMs = (profile.stepDeadlineS + profile.gatewayMarginS) * 1000;
// The targeted pipeline runs two MIRA steps (diagnosis, then therapy), each with its own deadline.
export const miraTargetedGatewayTimeoutMs = (2 * profile.stepDeadlineS + profile.gatewayMarginS) * 1000;

// The engine reports provider=openai: it reaches the Gemini API through its OpenAI-compatible endpoint (scripts/mira-runtime.mjs).
export function miraServiceVersion(version: unknown, model: string): boolean {
  if (!/^(?:[a-z0-9._-]+\/)?[a-z0-9._-]+(?::[a-z0-9._-]+)?$/i.test(model) || typeof version !== "string" || !version.startsWith("mira-service/")) return false;
  const fields = version.split("+").slice(1);
  const field = (key: string) => { const matches = fields.filter(s => s.startsWith(`${key}=`)); return matches.length === 1 ? matches[0].slice(key.length + 1) : undefined; };
  return field("contract") === "1" && field("provider") === "openai" && field("data") === "synthetic-only" && field("plan") === model && field("assess") === model;
}
