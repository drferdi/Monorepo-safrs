import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const model = "google/gemini-2.5-flash";
export async function preflightProvider(fetchFn = fetch) {
  const readMetadata = async url => {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!response.ok) throw new Error("Metadata provider belum tersedia; system tidak dimulai.");
    return response.json();
  };
  const catalog = await readMetadata("https://openrouter.ai/api/v1/models");
  const endpoints = await readMetadata(`https://openrouter.ai/api/v1/models/${model}/endpoints`);
  const entries = Array.isArray(catalog.data) ? catalog.data.filter(entry => entry.id === model) : [];
  const eligible = Array.isArray(endpoints.data?.endpoints) && endpoints.data.endpoints.some(endpoint =>
    Array.isArray(endpoint.supported_parameters) && ["response_format", "structured_outputs", "temperature"].every(name => endpoint.supported_parameters.includes(name)));
  const priceWithin = (value, maximum) => (typeof value === "number" || (typeof value === "string" && !!value.trim())) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= maximum;
  if (entries.length !== 1 || !priceWithin(entries[0].pricing?.prompt, 0.0000005) || !priceWithin(entries[0].pricing?.completion, 0.0000025) || !eligible) {
    throw new Error("Profil Flash, batas harga, atau endpoint terstruktur belum tersedia. System tidak dimulai.");
  }
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
  if (!environment.OPENROUTER_API_KEY?.trim()) throw new Error("OPENROUTER_API_KEY belum tersedia di environment atau .env.local Sentrapedia.");
  return {
    ...environment,
    PYTHONPATH: "", PYTHONNOUSERSITE: "1", PYTHON_DOTENV_DISABLED: "1",
    MIRA_DEV_TOKEN: token, MIRA_LLM_PROVIDER: "openrouter", MIRA_SERVICE_ENV: "development",
    MIRA_DATA_POLICY: "synthetic-only", MIRA_PLAN_MODEL: model, MIRA_PLAN_MODEL_CHOICES: model,
    MIRA_ASSESS_MODEL: model, MIRA_OPENROUTER_PROVIDER_SORT: "throughput", MIRA_OPENROUTER_ZDR: "false",
    MIRA_PROVISIONAL_DIFFERENTIAL: "true", MIRA_FAST_ASSESSMENT: "true", MIRA_FAST_THERAPY: "true",
    MIRA_FAST_COPY_PROVIDERS: "google-ai-studio,google-vertex/global", MIRA_STEP_DEADLINE_S: "20",
    MIRA_MAX_USD_PER_STEP: "0.10", MIRA_DAILY_BUDGET_USD: "5", MIRA_ALLOWED_ORIGINS: "",
    MIRA_AUDIT_DIR: resolve(root, ".runtime/mira-deepseek/audit"),
  };
}
export function engineReady(health) {
  return health?.status === "ok" && health.contractVersion === "1" &&
    health.capabilities?.includes("oracle-grounding-v1") &&
    health.version?.includes(`+contract=1+provider=openrouter+data=synthetic-only+plan=${model}+assess=${model}`) &&
    health.version?.endsWith("+ddx=provisional+assessment=fast+therapy=fast");
}
