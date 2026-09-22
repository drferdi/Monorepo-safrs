import { FailureClass, Route, WorkerClass } from "./constants.mjs";
import { runGaffer } from "./runner.mjs";
import { createSafrsPorts } from "./safrs-ports.mjs";

/**
 * Codex Provider for Gaffer Orchestration Framework (Phase 3).
 * Provides default Root planning, implementation, worker execution,
 * reviewer auditing, and acceptance callbacks bound to Codex & SAFRS.
 */
export function createCodexProvider(options = {}) {
  const defaultWorkerExecution =
    options.executeWorkerProvider ??
    (async () => {
      const error = new Error(
        "Codex worker execution provider is not configured; refusing simulated completion.",
      );
      error.code = "ADAPTER_UNAVAILABLE";
      throw error;
    });

  const defaultRootImplement =
    options.rootImplementProvider ??
    (async () => ({
      status: "unavailable",
      changedFiles: [],
      summary:
        "Codex root implementation provider is not configured; simulated completion is disabled.",
    }));

  const rootPlan = async ({ intent, project, authorization, context }) => {
    if (context.plan) return context.plan;

    // Route decision heuristic: SOLO for small/focused tasks, DECOMPOSE for multi-unit
    const isMultiUnit = Boolean(
      context.isMultiUnit || (context.tasks && context.tasks.length > 0),
    );
    const forceSolo =
      context.route === Route.SOLO ||
      (!isMultiUnit && context.route !== Route.DECOMPOSE);

    if (forceSolo) {
      return {
        route: Route.SOLO,
        ownedPaths:
          context.ownedPaths ?? (project?.path ? [`${project.path}/src/`] : []),
        summary: `Solo plan for: ${intent}`,
        evidenceManifest: context.evidenceManifest,
      };
    }

    // Decompose into bounded tasks DAG
    const tasks = context.tasks ?? [
      {
        id: "TASK-1",
        title: "Core Implementation",
        objective: intent,
        ownedPaths:
          context.ownedPaths ??
          (project?.path ? [`${project.path}/src/components/`] : []),
        plannedChangedFiles:
          context.plannedChangedFiles ??
          context.ownedPaths ??
          (project?.path ? [`${project.path}/src/components/`] : []),
        workerClass: context.workerClass ?? WorkerClass.ECONOMY,
        dependencies: [],
        architectureSettled: true,
        verificationCommands: context.verificationCommands ?? ["pnpm test"],
        evidenceManifest: context.evidenceManifest,
      },
    ];

    return {
      route: Route.DECOMPOSE,
      tasks: tasks.map((t) => ({
        ...t,
        plannedChangedFiles: t.plannedChangedFiles ?? t.ownedPaths,
        evidenceManifest: t.evidenceManifest ?? context.evidenceManifest,
      })),
      summary: `Decomposed plan with ${tasks.length} bounded task(s) for: ${intent}`,
      evidenceManifest: context.evidenceManifest,
    };
  };

  const rootImplement = async (args) => {
    return defaultRootImplement(args);
  };

  const executeWorker = async (args) => {
    return defaultWorkerExecution(args);
  };

  const audit = async (args) => {
    if (typeof options.auditProvider === "function") {
      return options.auditProvider(args);
    }
    if (options.auditVerdict) {
      return { verdict: options.auditVerdict };
    }
    return {
      verdict: "HOLD",
      reviewer: null,
      comments:
        "Independent audit provider is not configured; SHIP cannot be self-asserted.",
    };
  };

  const rootAccept = async ({ intent, plan, verification, result }) => {
    if (options.acceptanceResult !== undefined) {
      return options.acceptanceResult;
    }
    // Root semantic acceptance requires verification to have passed
    if (verification && verification.passed === false) {
      return { accepted: false, reason: "verification_not_passed" };
    }
    return {
      accepted: false,
      reason: "semantic_acceptance_not_configured",
      summary: `No explicit semantic acceptance provider/result exists for intent: ${intent}`,
    };
  };

  return {
    rootPlan,
    rootImplement,
    executeWorker,
    audit,
    rootAccept,
  };
}

/**
 * Executes a Gaffer intent through the Codex provider and SAFRS ports.
 */
export async function executeGafferIntent({
  intent,
  capsuleSelector = "academic/academic-smartboard",
  repositoryRoot = process.cwd(),
  context = {},
  policy = {},
  providerOptions = {},
  portsOverrides = {},
  controlDirectory = null,
  workerRegistry = null,
}) {
  if (!intent || typeof intent !== "string") {
    throw new TypeError("Gaffer intent string is required");
  }

  const codexProviderPorts = createCodexProvider(providerOptions);

  const defaultWorkerRegistry = workerRegistry ?? [
    {
      id: "codex-luna-economy",
      adapterId: "codex",
      classes: [WorkerClass.ECONOMY],
      certified: true,
      expectedCost: 1,
    },
    {
      id: "codex-luna-strong",
      adapterId: "codex",
      classes: [WorkerClass.STRONG],
      certified: true,
      expectedCost: 3,
    },
  ];

  const safrsPorts = createSafrsPorts({
    repositoryRoot,
    capsuleSelector,
    controlDirectory,
    providerPorts: {
      rootPlan: codexProviderPorts.rootPlan,
      rootImplement: codexProviderPorts.rootImplement,
      executeWorker: codexProviderPorts.executeWorker,
      audit: codexProviderPorts.audit,
      rootAccept: codexProviderPorts.rootAccept,
      ...portsOverrides.providerPorts,
    },
    workerRegistry: defaultWorkerRegistry,
    ...portsOverrides,
  });

  return runGaffer({
    intent,
    context,
    policy,
    ports: safrsPorts,
  });
}
