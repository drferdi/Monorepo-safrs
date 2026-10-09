export const freeOpenRouterModel = "apodex/apodex-1.1-mini:free";

export function freeServiceVersion(version: unknown, model: string): boolean {
  if (!/^[a-z0-9._-]+\/[a-z0-9._-]+:free$/i.test(model) || typeof version !== "string" || !version.startsWith("mira-service/")) return false;
  const fields = version.split("+").slice(1);
  const field = (key: string) => { const matches = fields.filter(s => s.startsWith(`${key}=`)); return matches.length === 1 ? matches[0].slice(key.length + 1) : undefined; };
  return field("contract") === "1" && field("provider") === "openrouter" && field("data") === "synthetic-only" && field("plan") === model && field("assess") === model;
}
