import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import profile from "./mira-profile.json" with { type: "json" };

export const model = profile.model;
// The Gemini API's OpenAI-compatible endpoint. The engine reaches it through its openai provider (OPENAI_BASE_URL).
export const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
export async function preflightProvider(fetchFn = fetch, apiKey = process.env.GEMINI_API_KEY) {
  // Reads the model's metadata with the key; no completion is sent, so nothing is billed. The response body is never echoed.
  const response = await fetchFn(`${geminiBaseUrl}models/${model}`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000), redirect: "error" });
  if (response.status === 401 || response.status === 403) throw new Error("GEMINI_API_KEY ditolak oleh Gemini API. System tidak dimulai.");
  if (!response.ok) throw new Error(`Model ${model} belum tersedia di Gemini API (HTTP ${response.status}). System tidak dimulai.`);
}
export function pythonPath(root, platform = process.platform) {
  return resolve(root, ".runtime/mira/venv", platform === "win32" ? "Scripts/python.exe" : "bin/python");
}
export function lockDigest(root) {
  return createHash("sha256").update(readFileSync(resolve(root, "mira/requirements.lock"))).digest("hex");
}
export function installedPython(root) {
  const python = pythonPath(root);
  const stamp = resolve(root, ".runtime/mira/installed.json");
  if (!existsSync(python) || !existsSync(stamp) || JSON.parse(readFileSync(stamp, "utf8")).lockSha256 !== lockDigest(root)) {
    throw new Error("Runtime MIRA lokal belum terpasang atau lock berubah. Jalankan npm ci --workspaces=false di Sentrapedia.");
  }
  return python;
}
export function engineEnvironment(root, environment, token) {
  if (!environment.GEMINI_API_KEY?.trim()) throw new Error("GEMINI_API_KEY belum tersedia di environment atau .env.local Sentrapedia.");
  const inherited = { ...environment };
  delete inherited.OPENROUTER_API_KEY; // the engine needs only the Gemini key
  return {
    ...inherited,
    OPENAI_API_KEY: environment.GEMINI_API_KEY, OPENAI_BASE_URL: geminiBaseUrl,
    PYTHONPATH: "", PYTHONNOUSERSITE: "1", PYTHON_DOTENV_DISABLED: "1",
    MIRA_DEV_TOKEN: token, MIRA_LLM_PROVIDER: "openai", MIRA_SERVICE_ENV: "development",
    MIRA_DATA_POLICY: "synthetic-only", MIRA_PLAN_MODEL: model, MIRA_PLAN_MODEL_CHOICES: model,
    MIRA_ASSESS_MODEL: model, MIRA_OPENROUTER_PROVIDER_SORT: "", MIRA_OPENROUTER_ZDR: "",
    MIRA_PROVISIONAL_DIFFERENTIAL: "true", MIRA_FAST_ASSESSMENT: "true", MIRA_FAST_THERAPY: "true",
    MIRA_FAST_COPIES: String(profile.fastCopies), MIRA_FAST_COPY_PROVIDERS: "", MIRA_STEP_DEADLINE_S: String(profile.stepDeadlineS),
    MIRA_MAX_USD_PER_STEP: profile.stepBudgetUsd.toFixed(2), MIRA_DAILY_BUDGET_USD: "5", MIRA_ALLOWED_ORIGINS: "",
    MIRA_AUDIT_DIR: resolve(root, ".runtime/mira-deepseek/audit"),
  };
}
// Calls the workspace health check once Next answers; that call starts loading TheOracle in the background.
export async function warmWorkspace(webUrl, fetchFn = fetch, timeoutMs = 120000, pauseMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetchFn(`${webUrl}/api/mira`, { signal: AbortSignal.timeout(30000) });
      return true;
    } catch { /* Next has not opened its port or compiled the route yet. */ }
    await new Promise(done => setTimeout(done, pauseMs));
  }
  return false;
}
export function engineReady(health) {
  return health?.status === "ok" && health.contractVersion === "1" &&
    health.capabilities?.includes("theoracle-grounding-v2") &&
    health.version?.includes(`+contract=1+provider=openai+data=synthetic-only+plan=${model}+assess=${model}`) &&
    health.version?.endsWith("+ddx=provisional+assessment=fast+therapy=fast");
}
