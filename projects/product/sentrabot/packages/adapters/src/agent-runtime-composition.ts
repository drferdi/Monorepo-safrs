import type {
  AgentRuntime,
  BackgroundJobHandlers,
  JobPublisher,
  ManagedConnectorProvider,
  MemoryStore,
  MessagingProvider,
  SandboxProvider,
} from "@sentrabot/adapter-kit";
import type { PhoneLocale } from "@sentrabot/core";
import type { PrismaClient, ThreadEvents } from "@sentrabot/db";
import { LocalArtifactStore } from "./artifacts.js";
import { createBackgroundJobHandlers } from "./background-job-handlers.js";
import { type ComposioProvider, createConnectorStack } from "./composio-connector.js";
import type { DestinationEmulator } from "./destination-emulator.js";
import { createRunExecutor } from "./executor.js";
import { ExpoPushProvider } from "./expo-push.js";
import { LocalAgentHomeStore } from "./home.js";
import { createRunSandbox } from "./host-aware-sandbox.js";
import {
  InstalledConnectorProvider,
  type RemoteConnectorDependencies,
} from "./installed-connectors.js";
import { McpConnector } from "./mcp-connector.js";
import { McpOAuthBroker } from "./mcp-oauth.js";
import { WorkspaceMemoryProviderResolver } from "./memory-provider-factory.js";
import { createPhoneContextLoader } from "./phone-context.js";
import { PiAgentRuntime } from "./pi-runtime.js";
import type { SandboxProviderOptions } from "./sandbox-factory.js";
import { ScriptedAgentRuntime } from "./scripted-runtime.js";
import type { EncryptedSecretStore } from "./secrets.js";

/**
 * Single composition of the agent runtime. The API process and the worker process
 * both execute runs, so every dependency they hand the executor and the background
 * job handlers has to be built the same way; two hand-written copies drifted once
 * already (the worker had no WhatsApp messaging).
 */
export interface AgentRuntimeCompositionInput {
  prisma: PrismaClient;
  events: ThreadEvents;
  secrets: EncryptedSecretStore;
  jobs: JobPublisher;
  workerId: string;
  dataDir: string;
  /** "scripted" selects the deterministic offline runtime; anything else is the real agent. */
  agentRuntime: string;
  sandboxProvider: string;
  sandbox: SandboxProviderOptions;
  deploymentModelKey?: string;
  composio: { enabled: boolean; apiKey?: string; override?: ComposioProvider };
  pipedream?: ManagedConnectorProvider;
  mcp: { stdioEnabled: boolean; allowedCommands: string[] };
  remoteConnectors?: RemoteConnectorDependencies;
  memory: MemoryStore;
  messaging?: MessagingProvider;
  whatsappMessaging?: MessagingProvider;
  phoneLocale?: PhoneLocale;
}

export interface AgentRuntimeComposition {
  runtime: AgentRuntime;
  sandbox: SandboxProvider;
  mcpOAuth: McpOAuthBroker;
  mcp: McpConnector;
  memoryProviders: WorkspaceMemoryProviderResolver;
  home: LocalAgentHomeStore;
  artifacts: LocalArtifactStore;
  stack: ReturnType<typeof createConnectorStack>;
  connector: DestinationEmulator;
  notifications: ExpoPushProvider;
  executor: ReturnType<typeof createRunExecutor>;
  jobHandlers: BackgroundJobHandlers;
  stop(): Promise<void>;
}

export async function composeAgentRuntime(
  input: AgentRuntimeCompositionInput,
): Promise<AgentRuntimeComposition> {
  const { prisma, secrets, events, jobs, dataDir, remoteConnectors } = input;
  const sandbox: SandboxProvider = createRunSandbox(input.sandboxProvider, {
    ...input.sandbox,
    prisma,
  });
  const mcpOAuth = new McpOAuthBroker(prisma, secrets, remoteConnectors);
  const memoryProviders = new WorkspaceMemoryProviderResolver(prisma, secrets);
  const home = new LocalAgentHomeStore(dataDir);
  const artifacts = new LocalArtifactStore(dataDir);
  const mcp = new McpConnector(
    prisma,
    secrets,
    {
      stdioEnabled: input.mcp.stdioEnabled,
      allowedCommands: input.mcp.allowedCommands,
      network: remoteConnectors,
    },
    mcpOAuth,
  );
  const installed = new InstalledConnectorProvider(prisma, secrets, remoteConnectors);
  const pipedream = input.pipedream;
  const stack = createConnectorStack(input.composio.enabled, input.composio.override, [
    installed,
    ...(pipedream ? [pipedream] : []),
    mcp,
  ]);
  const connector = stack.destination;
  await connector.start();
  void stack.composio?.warmDirectory().catch(() => undefined);
  void pipedream?.warmDirectory?.().catch(() => undefined);
  const runtime =
    input.agentRuntime === "scripted" ? new ScriptedAgentRuntime() : new PiAgentRuntime();
  const notifications = new ExpoPushProvider(dataDir);
  const executor = createRunExecutor({
    prisma,
    runtime,
    sandbox,
    memory: input.memory,
    memoryProviders,
    home,
    artifacts,
    connector: stack.connector,
    connectors: stack.connector,
    listConnectedPluginSlugs: stack.composio?.listConnectedSlugs.bind(stack.composio),
    secrets: [input.deploymentModelKey ?? "", input.composio.apiKey ?? ""].filter(Boolean),
    secretStore: secrets,
    deploymentModelKey: input.deploymentModelKey,
    dataDir,
    notifications,
    jobs,
    events,
    phone:
      input.messaging || input.whatsappMessaging ? createPhoneContextLoader(prisma) : undefined,
  });
  const jobHandlers = createBackgroundJobHandlers({
    executor,
    prisma,
    sandbox,
    home,
    jobs,
    events,
    workerId: input.workerId,
    runtime,
    secretStore: secrets,
    memoryProviders,
    deploymentModelKey: input.deploymentModelKey,
    messaging: input.messaging,
    whatsappMessaging: input.whatsappMessaging,
    phoneLocale: input.phoneLocale,
  });
  return {
    runtime,
    sandbox,
    mcpOAuth,
    mcp,
    memoryProviders,
    home,
    artifacts,
    stack,
    connector,
    notifications,
    executor,
    jobHandlers,
    stop: async () => {
      await connector.stop();
      await mcp.close();
    },
  };
}
