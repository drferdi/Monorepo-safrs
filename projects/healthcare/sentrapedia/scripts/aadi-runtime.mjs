import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import profile from "./aadi-profile.json" with { type: "json" };

export const model = profile.model;
// Request timeouts (milliseconds): the provider metadata read at startup, and one warm-up request to /api/aadi.
const preflightTimeoutMs = 10000;
const warmRequestTimeoutMs = 30000;
// The Gemini API's OpenAI-compatible endpoint. The engine reaches it through its openai provider (OPENAI_BASE_URL).
export const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
export async function preflightProvider(fetchFn = fetch, apiKey = process.env.GEMINI_API_KEY) {
  // Reads the model's metadata with the key; no completion is sent, so nothing is billed. The response body is never echoed.
  const response = await fetchFn(`${geminiBaseUrl}models/${model}`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(preflightTimeoutMs), redirect: "error" });
  if (response.status === 401 || response.status === 403) throw new Error("GEMINI_API_KEY ditolak oleh Gemini API. System tidak dimulai.");
  if (!response.ok) throw new Error(`Model ${model} belum tersedia di Gemini API (HTTP ${response.status}). System tidak dimulai.`);
}
export function pythonPath(root, platform = process.platform) {
  return resolve(root, ".runtime/aadi/venv", platform === "win32" ? "Scripts/python.exe" : "bin/python");
}
export function lockDigest(root) {
  return createHash("sha256").update(readFileSync(resolve(root, "aadi/requirements.lock"))).digest("hex");
}
export function installedPython(root) {
  const python = pythonPath(root);
  const stamp = resolve(root, ".runtime/aadi/installed.json");
  if (!existsSync(python) || !existsSync(stamp) || JSON.parse(readFileSync(stamp, "utf8")).lockSha256 !== lockDigest(root)) {
    throw new Error("Runtime AADI lokal belum terpasang atau lock berubah. Jalankan npm ci --workspaces=false di Sentrapedia.");
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
    AADI_DEV_TOKEN: token, AADI_LLM_PROVIDER: "openai", AADI_SERVICE_ENV: "development",
    AADI_DATA_POLICY: "synthetic-only", AADI_PLAN_MODEL: model, AADI_PLAN_MODEL_CHOICES: model,
    AADI_ASSESS_MODEL: model, AADI_OPENROUTER_PROVIDER_SORT: "", AADI_OPENROUTER_ZDR: "",
    AADI_PROVISIONAL_DIFFERENTIAL: "true", AADI_FAST_ASSESSMENT: "true", AADI_FAST_THERAPY: "true",
    AADI_FAST_COPIES: String(profile.fastCopies), AADI_FAST_COPY_PROVIDERS: "", AADI_STEP_DEADLINE_S: String(profile.stepDeadlineS),
    AADI_MAX_USD_PER_STEP: profile.stepBudgetUsd.toFixed(2), AADI_DAILY_BUDGET_USD: String(profile.dailyBudgetUsd), AADI_ALLOWED_ORIGINS: "",
    AADI_AUDIT_DIR: resolve(root, ".runtime/aadi-deepseek/audit"),
  };
}
// Calls the workspace health check once Next answers; that call starts loading TheOracle in the background.
export async function warmWorkspace(webUrl, fetchFn = fetch, timeoutMs = 120000, pauseMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetchFn(`${webUrl}/api/aadi`, { signal: AbortSignal.timeout(warmRequestTimeoutMs) });
      return true;
    } catch { /* Next has not opened its port or compiled the route yet. */ }
    await new Promise(done => setTimeout(done, pauseMs));
  }
  return false;
}
// Engine restart policy (tech-debt row 28): the wait doubles per crash, a run longer than resetMs resets the count,
// and maxCrashes crashes in a row end the system (delayMs null) instead of an endless crash loop.
export function nextRestart(crashes, ranMs, { resetMs = 60000, baseMs = 1000, maxMs = 30000, maxCrashes = 5 } = {}) {
  const count = ranMs > resetMs ? 1 : crashes + 1;
  return { crashes: count, delayMs: count >= maxCrashes ? null : Math.min(maxMs, baseMs * 2 ** count) };
}
export function engineReady(health) {
  return health?.status === "ok" && health.contractVersion === "1" &&
    health.capabilities?.includes("theoracle-grounding-v2") &&
    health.version?.includes(`+contract=1+provider=openai+data=synthetic-only+plan=${model}+assess=${model}`) &&
    health.version?.endsWith("+ddx=provisional+assessment=fast+therapy=fast");
}
