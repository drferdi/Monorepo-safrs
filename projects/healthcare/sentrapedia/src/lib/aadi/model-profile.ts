import profile from "../../../scripts/aadi-profile.json";

export const selectedAadiModel = profile.model;
export const aadiStepBudgetUsd = profile.stepBudgetUsd;
export const aadiDailyBudgetUsd = profile.dailyBudgetUsd;
// The engine stops a step at its own deadline; the margin covers the health check and TheOracle grounding.
export const aadiGatewayTimeoutMs = (profile.stepDeadlineS + profile.gatewayMarginS) * 1000;
// The targeted pipeline runs two AADI steps (diagnosis, then therapy), each with its own deadline.
export const aadiTargetedGatewayTimeoutMs = (2 * profile.stepDeadlineS + profile.gatewayMarginS) * 1000;

// The engine reports provider=openai: it reaches the Gemini API through its OpenAI-compatible endpoint (scripts/aadi-runtime.mjs).
export function aadiServiceVersion(version: unknown, model: string): boolean {
  if (!/^(?:[a-z0-9._-]+\/)?[a-z0-9._-]+(?::[a-z0-9._-]+)?$/i.test(model) || typeof version !== "string" || !version.startsWith("aadi-service/")) return false;
  const fields = version.split("+").slice(1);
  const field = (key: string) => { const matches = fields.filter(s => s.startsWith(`${key}=`)); return matches.length === 1 ? matches[0].slice(key.length + 1) : undefined; };
  // The data policy is the owner's server-side setting (AADI_DATA_POLICY), so the client accepts any
  // policy the engine declares and never pins the development default. An unknown value still fails.
  const dataPolicies = ["synthetic-only", "openai-standard-retention", "openai-zdr-approved", "openrouter-zdr"];
  return field("contract") === "1" && field("provider") === "openai" && dataPolicies.includes(field("data") ?? "") && field("plan") === model && field("assess") === model;
}
