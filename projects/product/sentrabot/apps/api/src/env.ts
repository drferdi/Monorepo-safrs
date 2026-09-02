import { resolveDeploymentModel, resolveSandboxProvider } from "@sentrabot/adapters";
import {
  resolveAuthSecret,
  resolveEncryptionKey,
  resolveScreenProxySecret,
  resolveSupervisorToken,
} from "@sentrabot/core";

export { resolveSandboxProvider } from "@sentrabot/adapters";

export interface AppEnv {
  databaseUrl: string;
  realtimeDatabaseUrl: string;
  authSecret: string;
  authUrl: string;
  webOrigin: string;
  apiUrl: string;
  apiHost: string;
  signupsEnabled: string | undefined;
  signupAllowlist: string | undefined;
  encryptionKey: string;
  dataDir: string;
  sandboxSupervisorUrl: string;
  sandboxSupervisorToken: string | undefined;
  screenProxySecret: string;
  sandboxProvider: string;
  agentRuntime: string;
  deploymentModelKey: string | undefined;
  e2bApiKey: string | undefined;
  daytonaApiKey: string | undefined;
  daytonaApiUrl: string | undefined;
  daytonaTarget: string | undefined;
  boxApiKey: string | undefined;
  boxApiUrl: string | undefined;
  composioApiKey: string | undefined;
  pipedreamClientId: string | undefined;
  pipedreamClientSecret: string | undefined;
  pipedreamProjectId: string | undefined;
  pipedreamEnvironment: "development" | "production";
  sendblueApiKeyId: string | undefined;
  sendblueApiSecret: string | undefined;
  sendblueSigningSecret: string | undefined;
  sendbluePhoneNumber: string | undefined;
  whatsappAccessToken: string | undefined;
  whatsappPhoneNumberId: string | undefined;
  whatsappAppSecret: string | undefined;
  whatsappVerifyToken: string | undefined;
  whatsappBusinessPhoneE164: string | undefined;
  /**
   * Pre-approved WhatsApp template for reaching the owner after the 24h
   * customer-service window closes. Unset keeps the prior behaviour: those
   * messages fail terminally.
   */
  whatsappTemplateName: string | undefined;
  whatsappTemplateLanguage: string | undefined;
  /** Language of the deployment's own phone-channel copy ("id" default). */
  phoneLocale: string | undefined;
  /**
   * Deployment-wide speech-to-text for inbound voice notes. Phone-provisioned
   * users are synthetic and hold no voice credential of their own, so without
   * this a voice note gets an honest "not supported" reply.
   */
  phoneTranscribeProvider: string | undefined;
  phoneTranscribeApiKey: string | undefined;
  defaultProvider: string;
  defaultModel: string;
  wakeupDriver: string;
  mcpStdioEnabled: boolean;
  mcpStdioAllowedCommands: string[];
  port: number;
  gitSha: string | undefined;
  /** Private Compose control-network URL for the opt-in updater sidecar. */
  updaterUrl: string | undefined;
  /** Bearer shared with the updater; never sent to the browser. */
  updaterToken: string | undefined;
  /** Current application image tag; used for compose manual-upgrade command selection. */
  imageTag: string | undefined;
  xenditCallbackToken: string | undefined;
  xenditApiKey: string | undefined;
  openaiApiKey: string | undefined;
  managedAiFreeBudgetMicros: bigint | undefined;
  /**
   * Experimental hybrid control-plane relay stream (/v1/relay/*). No client consumes it yet,
   * so it stays unmounted unless SENTRABOT_CONTROL_PLANE_RELAY=enabled.
   */
  controlPlaneRelay: boolean;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const authSecret = resolveAuthSecret(source);
  const sandboxProvider = resolveSandboxProvider(source);
  const deploymentModel = resolveDeploymentModel(source);
  const updaterUrl = optional(source.SENTRABOT_UPDATER_URL);
  const updaterToken = optional(source.SENTRABOT_UPDATER_TOKEN);
  return {
    databaseUrl: required(source, "DATABASE_URL"),
    realtimeDatabaseUrl: source.REALTIME_DATABASE_URL ?? required(source, "DATABASE_URL"),
    authSecret,
    authUrl: source.BETTER_AUTH_URL ?? source.WEB_ORIGIN ?? "http://127.0.0.1:5173",
    webOrigin: source.WEB_ORIGIN ?? "http://127.0.0.1:5173",
    apiUrl: source.API_URL ?? "http://127.0.0.1:3100",
    apiHost: source.API_HOST ?? "127.0.0.1",
    signupsEnabled: source.SIGNUPS_ENABLED,
    signupAllowlist: source.SIGNUP_ALLOWLIST,
    encryptionKey: resolveEncryptionKey(source),
    dataDir: source.DATA_DIR ?? "./data",
    sandboxSupervisorUrl: source.SANDBOX_SUPERVISOR_URL ?? "http://127.0.0.1:7091",
    sandboxSupervisorToken:
      sandboxProvider === "docker" ? resolveSupervisorToken(source) : undefined,
    screenProxySecret: resolveScreenProxySecret(source),
    sandboxProvider,
    agentRuntime: source.AGENT_RUNTIME ?? "pi",
    // Provider, model and key resolve together: see resolveDeploymentModel.
    deploymentModelKey: deploymentModel.key,
    e2bApiKey: source.E2B_API_KEY,
    daytonaApiKey: source.DAYTONA_API_KEY,
    daytonaApiUrl: source.DAYTONA_API_URL,
    daytonaTarget: source.DAYTONA_TARGET,
    boxApiKey: source.BOX_API_KEY,
    boxApiUrl: source.BOX_API_URL ?? source.BOX_BASE_URL,
    composioApiKey: source.COMPOSIO_API_KEY,
    pipedreamClientId: optional(source.PIPEDREAM_CLIENT_ID),
    pipedreamClientSecret: optional(source.PIPEDREAM_CLIENT_SECRET),
    pipedreamProjectId: optional(source.PIPEDREAM_PROJECT_ID),
    pipedreamEnvironment:
      source.PIPEDREAM_ENVIRONMENT === "production" ? "production" : "development",
    sendblueApiKeyId: optional(source.SENDBLUE_API_KEY_ID),
    sendblueApiSecret: optional(source.SENDBLUE_API_SECRET),
    sendblueSigningSecret: optional(source.SENDBLUE_SIGNING_SECRET),
    sendbluePhoneNumber: optional(source.SENDBLUE_PHONE_NUMBER),
    whatsappAccessToken: optional(source.WHATSAPP_ACCESS_TOKEN),
    whatsappPhoneNumberId: optional(source.WHATSAPP_PHONE_NUMBER_ID),
    whatsappAppSecret: optional(source.WHATSAPP_APP_SECRET),
    whatsappVerifyToken: optional(source.WHATSAPP_VERIFY_TOKEN),
    whatsappBusinessPhoneE164: optional(source.WHATSAPP_BUSINESS_PHONE_E164),
    whatsappTemplateName: optional(source.WHATSAPP_TEMPLATE_NAME),
    whatsappTemplateLanguage: optional(source.WHATSAPP_TEMPLATE_LANGUAGE),
    phoneLocale: optional(source.PHONE_LOCALE),
    phoneTranscribeProvider: optional(source.PHONE_TRANSCRIBE_PROVIDER),
    phoneTranscribeApiKey: optional(source.PHONE_TRANSCRIBE_API_KEY),
    defaultProvider: deploymentModel.provider,
    defaultModel: deploymentModel.model,
    wakeupDriver: source.WAKEUP_DRIVER ?? "graphile",
    mcpStdioEnabled: source.MCP_STDIO_ENABLED === "true",
    mcpStdioAllowedCommands: (source.MCP_STDIO_ALLOWED_COMMANDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    port: Number(source.API_PORT ?? 3100),
    controlPlaneRelay: source.SENTRABOT_CONTROL_PLANE_RELAY?.trim() === "enabled",
    gitSha: optional(source.GIT_SHA) ?? optional(source.SENTRABOT_GIT_SHA),
    updaterUrl,
    updaterToken,
    imageTag: optional(source.SENTRABOT_IMAGE_TAG),
    xenditCallbackToken: optional(source.XENDIT_CALLBACK_TOKEN),
    xenditApiKey: optional(source.XENDIT_API_KEY),
    openaiApiKey: optional(source.OPENAI_API_KEY),
    managedAiFreeBudgetMicros: positiveBigInt(
      optional(source.SENTRABOT_MANAGED_AI_FREE_BUDGET_MICROS),
    ),
  };
}

function required(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function positiveBigInt(value: string | undefined): bigint | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value))
    throw new Error("SENTRABOT_MANAGED_AI_FREE_BUDGET_MICROS must be a positive integer");
  const parsed = BigInt(value);
  if (parsed <= 0n)
    throw new Error("SENTRABOT_MANAGED_AI_FREE_BUDGET_MICROS must be a positive integer");
  return parsed;
}
