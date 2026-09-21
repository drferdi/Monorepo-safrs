import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { loadAndValidateContract } from "../../../project-standalone/src/contract.mjs";
import {
  resolveCapsules,
  verifyCapsule,
} from "../../../project-standalone/src/verify.mjs";
import { resolveControlPlanePaths } from "../../../task/src/storage.mjs";
import { compileTaskContract, loadCompileContext } from "../contracts.mjs";
import { verifyManifest } from "../evidence.mjs";
import { GATES, runGate } from "../gates.mjs";
import { authorize as authorizeGuard } from "../guard.mjs";
import { reconcileLease } from "../leases.mjs";
import { evaluatePublication } from "../publisher.mjs";
import { compareRisk } from "../risk.mjs";
import { normalizeScope } from "../scopes.mjs";
import { FailureClass } from "./constants.mjs";
import { assertChangedFilesWithinScope } from "./scope.mjs";

const execFileAsync = promisify(execFile);
const SELECTOR_PART = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;
const DEFAULT_VERIFY_TIMEOUT_MS = 120_000;

function portError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireCallback(providerPorts, name) {
  if (typeof providerPorts?.[name] !== "function") {
    throw new TypeError(
      `Gaffer SAFRS port '${name}' requires an injected callback`,
    );
  }
  return providerPorts[name];
}

function strictSelector(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw portError(
      "PROJECT_SELECTOR_REQUIRED",
      "Gaffer project discovery requires a domain/capsule selector",
    );
  }
  const normalized = value.trim().replaceAll("\\", "/");
  const parts = normalized.split("/");
  if (
    parts.length !== 2 ||
    parts.some((part) => !SELECTOR_PART.test(part)) ||
    normalized.startsWith("projects/")
  ) {
    throw portError(
      "PROJECT_SELECTOR_INVALID",
      `project selector must use domain/capsule: ${value}`,
    );
  }
  return normalized;
}

function loadAdapterCapabilities(repositoryRoot) {
  try {
    const path = join(repositoryRoot, ".safrs", "adapter-capabilities.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    return data.adapters ?? {};
  } catch (error) {
    throw portError(
      "ADAPTER_UNAVAILABLE",
      `cannot load SAFRS adapter capabilities: ${error.message}`,
    );
  }
}

function activeAdapterIds(repositoryRoot) {
  const capabilities = loadAdapterCapabilities(repositoryRoot);
  return new Set(
    Object.entries(capabilities)
      .filter(([id, capability]) => {
        return (
          id !== "droid" &&
          capability?.activation === "active" &&
          capability?.enforceable_pre_action_hooks === true
        );
      })
      .map(([id]) => id),
  );
}

function workerAdapterId(worker) {
  return worker?.adapterId ?? worker?.provider ?? worker?.id;
}

function findEvidenceManifest(input = {}) {
  const candidates = [
    input.workerResult?.evidenceManifest,
    input.result?.evidenceManifest,
    input.plan?.evidenceManifest,
    input.task?.evidenceManifest,
    input.authorization?.evidenceManifest,
    ...(input.tasks ?? []).map((task) => task?.verification?.evidenceManifest),
  ];
  return candidates.find(
    (candidate) => candidate && typeof candidate === "object",
  );
}

function evidenceBinding(input = {}) {
  const authorization =
    input.verification?.authorization ?? input.authorization;
  const contract = authorization?.contract ?? input.plan?.contract;
  return {
    taskId:
      input.task?.id ??
      input.plan?.task_id ??
      input.plan?.taskId ??
      contract?.task_id ??
      null,
    contractDigest:
      authorization?.contractDigest ??
      input.plan?.contractDigest ??
      contract?.contract_digest ??
      null,
    headSha:
      input.headSha ??
      input.plan?.head_sha ??
      input.plan?.headSha ??
      authorization?.headSha ??
      null,
    diffDigest:
      input.diffDigest ??
      input.plan?.diff_digest ??
      input.plan?.diffDigest ??
      authorization?.diffDigest ??
      null,
  };
}

function normalizeVerificationResult(value) {
  if (typeof value === "boolean") return { passed: value };
  if (!value || typeof value !== "object") {
    return { passed: false, reason: "verification_result_missing" };
  }
  return { ...value, passed: value.passed === true };
}

async function defaultRepositoryVerification({ repositoryRoot }) {
  const windows = process.platform === "win32";
  const command = windows ? "powershell" : "bash";
  const args = windows
    ? ["-ExecutionPolicy", "Bypass", "-File", "scripts/safrs-verify.ps1"]
    : ["scripts/safrs-verify.sh"];

  try {
    await execFileAsync(command, args, {
      cwd: repositoryRoot,
      timeout: DEFAULT_VERIFY_TIMEOUT_MS,
      maxBuffer: 1_024 * 1_024,
      windowsHide: true,
    });
    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      reason: "repository_verification_failed",
      exitCode: typeof error?.code === "number" ? error.code : null,
    };
  }
}

async function defaultStandaloneVerification({
  repositoryRoot,
  project,
  checkerPath,
}) {
  if (!project?.id) {
    return {
      passed: false,
      reason: "project_missing_for_standalone_verification",
    };
  }
  try {
    const result = await verifyCapsule({
      root: repositoryRoot,
      selector: project.id,
      checkerPath:
        checkerPath ??
        join(repositoryRoot, "tools", "safrs", "check_project_independence.py"),
    });
    return { passed: result.ok === true, result };
  } catch (error) {
    return {
      passed: false,
      reason: "standalone_verification_failed",
      result: error.result ?? null,
    };
  }
}

function evaluateGates(repositoryRoot, controlDirectory) {
  return Object.fromEntries(
    GATES.map((gateId) => {
      try {
        return [
          gateId,
          runGate(gateId, {
            root: repositoryRoot,
            controlDirectory,
          }),
        ];
      } catch (error) {
        return [
          gateId,
          {
            verdict: "FAIL",
            reason: `gate_error: ${error.message}`,
          },
        ];
      }
    }),
  );
}

function guardFailureCode(decision) {
  return decision === "stop" ? "BUDGET_EXHAUSTED" : "SECURITY_RISK";
}

export function createSafrsPorts(options = {}) {
  const repositoryRoot = options.repositoryRoot ?? process.cwd();
  const configuredSelector = strictSelector(options.capsuleSelector);
  const providerPorts = options.providerPorts ?? {};
  const rootPlan = requireCallback(providerPorts, "rootPlan");
  const rootImplement = requireCallback(providerPorts, "rootImplement");
  const rootAcceptProvider = requireCallback(providerPorts, "rootAccept");
  const audit = requireCallback(providerPorts, "audit");
  const executeWorkerProvider = requireCallback(providerPorts, "executeWorker");
  const compileContext =
    options.compileContext ?? loadCompileContext(repositoryRoot);
  let controlDirectory = options.controlDirectory;
  if (!controlDirectory) {
    try {
      controlDirectory =
        resolveControlPlanePaths(repositoryRoot).controlDirectory;
    } catch (error) {
      throw portError(
        "CONTROL_PLANE_UNAVAILABLE",
        `cannot resolve SAFRS control plane: ${error.message}`,
      );
    }
  }
  const activeAdapters = activeAdapterIds(repositoryRoot);
  const runRepositoryVerification =
    options.runRepositoryVerification ?? defaultRepositoryVerification;
  const runStandaloneVerification =
    options.runStandaloneVerification ?? defaultStandaloneVerification;
  const authorizationByTask = new Map();

  async function availableWorkersFor(requestedClass) {
    return typeof options.workerRegistry === "function"
      ? await options.workerRegistry({ requestedClass })
      : (options.workerRegistry ?? []);
  }

  async function discoverProject({ context = {} } = {}) {
    const selector = context.projectSelector
      ? strictSelector(context.projectSelector)
      : configuredSelector;
    if (selector !== configuredSelector) {
      throw portError(
        "PROJECT_SELECTOR_MISMATCH",
        `context selector ${selector} does not match configured selector ${configuredSelector}`,
      );
    }
    const capsules = await resolveCapsules(repositoryRoot, selector);
    if (capsules.length !== 1) {
      throw portError(
        "PROJECT_DISCOVERY_FAILED",
        `expected exactly one capsule for ${selector}, found ${capsules.length}`,
      );
    }
    const capsule = capsules[0];
    const contract = await loadAndValidateContract(capsule.contractPath);
    return {
      ...capsule,
      contract,
      path: capsule.capsule,
    };
  }

  async function authorize({ context = {}, task } = {}) {
    const taskContract =
      context.taskContract ?? task?.metadata?.taskContract ?? null;
    if (!taskContract) {
      return { allowed: false, reason: "contract_missing" };
    }

    let compiled;
    try {
      compiled = compileTaskContract(taskContract, compileContext);
    } catch (error) {
      return {
        allowed: false,
        reason: "contract_invalid",
        detail: error.message,
      };
    }

    const budget =
      context.budget ??
      (context.budgetSnapshot?.stopped ? context.budgetSnapshot : undefined);
    if (budget?.stopped) {
      return {
        allowed: false,
        reason: "budget_breaker",
        contract: compiled.contract,
        contractDigest: compiled.contractDigest,
      };
    }

    const guardEvent =
      context.guardEvent ??
      (compiled.contract.write_scopes.length > 0
        ? { type: "write", paths: compiled.contract.write_scopes }
        : { type: "read", paths: compiled.contract.read_scopes });
    const guard = authorizeGuard(guardEvent, {
      contract: compiled.contract,
      sensitivePaths: compileContext.sensitivePaths,
      budget,
    });
    if (guard.decision !== "allow") {
      return {
        allowed: false,
        reason: `guard_${guard.reasonCode.toLowerCase()}`,
        guard,
        contract: compiled.contract,
        contractDigest: compiled.contractDigest,
      };
    }

    const authorization = {
      allowed: true,
      highRisk: compareRisk(compiled.contract.effective_risk, "R2") >= 0,
      contract: compiled.contract,
      contractDigest: compiled.contractDigest,
      guard,
      headSha:
        context.headSha ??
        context.head_sha ??
        options.publicationContext?.pullRequest?.head_sha ??
        null,
      diffDigest:
        context.diffDigest ??
        context.diff_digest ??
        options.publicationContext?.pullRequest?.diff_digest ??
        null,
    };
    authorizationByTask.set(compiled.contract.task_id, authorization);
    return authorization;
  }

  async function listAvailableWorkers({ requestedClass } = {}) {
    const registry = await availableWorkersFor(requestedClass);
    return registry.filter((worker) => {
      const adapterId = workerAdapterId(worker);
      return (
        worker?.enabled !== false &&
        worker?.certified === true &&
        Array.isArray(worker?.classes) &&
        worker.classes.includes(requestedClass) &&
        activeAdapters.has(adapterId)
      );
    });
  }

  async function executeWorker(input = {}) {
    const context = input.context ?? {};
    const lease = context.lease;
    if (!lease) {
      throw portError(
        "BLOCKED_REQUIREMENT",
        "worker execution requires an active SAFRS lease",
      );
    }
    const worker = input.worker;
    const workerClass = input.workerClass;
    const adapterId = workerAdapterId(worker);
    if (
      worker?.enabled === false ||
      worker?.certified !== true ||
      !Array.isArray(worker?.classes) ||
      !worker.classes.includes(workerClass) ||
      !activeAdapters.has(adapterId)
    ) {
      throw portError(
        "ADAPTER_UNAVAILABLE",
        `worker ${String(worker?.id ?? "<unknown>")} is not an active certified ${String(workerClass)} adapter`,
      );
    }

    const taskId = input.task?.id;
    const authorization = taskId ? authorizationByTask.get(taskId) : null;
    if (!taskId || !authorization) {
      throw portError(
        "BLOCKED_REQUIREMENT",
        "worker execution requires prior SAFRS authorization for the task",
      );
    }
    const providedContract =
      context.taskContract ?? input.task?.metadata?.taskContract ?? null;
    if (providedContract) {
      let providedDigest;
      try {
        providedDigest = compileTaskContract(
          providedContract,
          compileContext,
        ).contractDigest;
      } catch (error) {
        throw portError(
          "BLOCKED_REQUIREMENT",
          `worker TaskContractV1 is invalid: ${error.message}`,
        );
      }
      if (providedDigest !== authorization.contractDigest) {
        throw portError(
          "BLOCKED_REQUIREMENT",
          "worker TaskContractV1 digest does not match authorization",
        );
      }
    }
    const taskContract = authorization.contract;
    if (lease.local?.task_id !== taskId) {
      throw portError(
        "BLOCKED_REQUIREMENT",
        "worker lease task_id does not match the Gaffer task",
      );
    }
    const ownedPaths = (input.task?.ownedPaths ?? []).map(normalizeScope);
    if (ownedPaths.length === 0) {
      throw portError(
        "BLOCKED_REQUIREMENT",
        "worker execution requires non-empty owned paths",
      );
    }
    assertChangedFilesWithinScope(
      ownedPaths,
      lease.local?.scope_prefixes ?? [],
    );
    const plannedChangedFiles =
      context.plannedChangedFiles ??
      input.task?.plannedChangedFiles ??
      input.worker?.plannedChangedFiles ??
      input.task?.ownedPaths ??
      [];
    if (
      !Array.isArray(plannedChangedFiles) ||
      plannedChangedFiles.length === 0
    ) {
      throw portError(
        "BLOCKED_REQUIREMENT",
        "worker execution requires declared plannedChangedFiles",
      );
    }
    assertChangedFilesWithinScope(plannedChangedFiles, ownedPaths);
    const preGuard = authorizeGuard(
      { type: "write", paths: plannedChangedFiles },
      {
        contract: taskContract,
        sensitivePaths: compileContext.sensitivePaths,
        budget: context.budget,
      },
    );
    if (preGuard.decision !== "allow") {
      throw portError(
        guardFailureCode(preGuard.decision),
        preGuard.message || `worker scope denied: ${preGuard.reasonCode}`,
      );
    }
    const leaseVerdict = reconcileLease(
      lease.local,
      lease.remoteEvents,
      lease.now ?? new Date().toISOString(),
    );
    if (leaseVerdict.decision !== "allow") {
      throw portError("BLOCKED_REQUIREMENT", leaseVerdict.reason);
    }

    const registeredWorkers = await listAvailableWorkers({
      requestedClass: workerClass,
    });
    if (
      !registeredWorkers.some(
        (candidate) =>
          candidate.id === worker.id &&
          workerAdapterId(candidate) === adapterId,
      )
    ) {
      throw portError(
        "ADAPTER_UNAVAILABLE",
        `worker ${String(worker?.id ?? "<unknown>")} is not registered for ${String(workerClass)}`,
      );
    }

    const result = await executeWorkerProvider({
      ...input,
      context: {
        ...context,
        safrsPreflight: {
          plannedChangedFiles,
          contractDigest: authorization.contractDigest,
          leaseFence: lease.local.fencing_token,
        },
      },
    });
    const changedFiles = result?.changedFiles ?? [];
    assertChangedFilesWithinScope(changedFiles, ownedPaths);

    const postGuard = authorizeGuard(
      { type: "write", paths: changedFiles },
      {
        contract: taskContract,
        sensitivePaths: compileContext.sensitivePaths,
        budget: context.budget,
      },
    );
    if (postGuard.decision !== "allow") {
      throw portError(
        guardFailureCode(postGuard.decision),
        postGuard.message || `worker write denied: ${postGuard.reasonCode}`,
      );
    }

    return {
      ...result,
      safrsGuard: { preAction: preGuard, postAction: postGuard },
    };
  }

  async function verify(input = {}) {
    const gates = evaluateGates(repositoryRoot, controlDirectory);
    const evidenceManifest = findEvidenceManifest(input);
    const evidence = evidenceManifest
      ? verifyManifest(evidenceManifest)
      : { valid: false, errors: ["evidence manifest missing"] };

    let repository;
    try {
      repository = normalizeVerificationResult(
        await runRepositoryVerification({
          repositoryRoot,
          ...input,
        }),
      );
    } catch (error) {
      repository = {
        passed: false,
        reason: "repository_verification_failed",
        detail: error.message,
        failureClass: error.code ?? error.failureClass ?? null,
      };
    }

    let standalone;
    try {
      standalone = normalizeVerificationResult(
        await runStandaloneVerification({
          repositoryRoot,
          project: input.project,
          ...input,
        }),
      );
    } catch (error) {
      standalone = {
        passed: false,
        reason: "standalone_verification_failed",
        detail: error.message,
        failureClass: error.code ?? error.failureClass ?? null,
      };
    }

    const errors = [
      ...Object.entries(gates)
        .filter(([, result]) => result.verdict !== "PASS")
        .map(([gateId, result]) => `${gateId}: ${result.reason}`),
      ...(evidence.valid ? [] : (evidence.errors ?? ["evidence invalid"])),
      ...(repository.passed
        ? []
        : [repository.reason ?? "repository verification failed"]),
      ...(standalone.passed
        ? []
        : [standalone.reason ?? "standalone verification failed"]),
    ];

    const failureClass =
      input.failureClass ??
      repository?.failureClass ??
      standalone?.failureClass ??
      (errors.length ? FailureClass.TEST_FAILURE : null);

    return {
      passed: errors.length === 0,
      failureClass,
      gates,
      evidence,
      evidenceManifest,
      repository,
      standalone,
      authorization: input.authorization,
      errors,
    };
  }

  async function rootAccept(input = {}) {
    const verification = input.verification;
    if (!verification?.passed) {
      return { accepted: false, reason: "verification_failed" };
    }
    const evidenceManifest = verification.evidenceManifest;
    if (!evidenceManifest) {
      return { accepted: false, reason: "evidence_manifest_invalid" };
    }
    const authorization = authorizationByTask.get(evidenceManifest.task_id);
    if (!authorization) {
      return { accepted: false, reason: "evidence_binding_mismatch" };
    }
    const finalVerification = await verify({
      mode: "FINAL",
      intent: input.intent,
      project: input.project,
      plan: { ...(input.plan ?? {}), evidenceManifest },
      tasks: input.tasks,
      authorization,
    });
    if (!finalVerification.passed) {
      return {
        accepted: false,
        reason: "verification_failed",
        verification: finalVerification,
      };
    }
    const evidence = verifyManifest(evidenceManifest);
    if (!evidence.valid) {
      return {
        accepted: false,
        reason: "evidence_manifest_invalid",
        evidence,
      };
    }
    const binding = evidenceBinding({
      ...input,
      verification: {
        ...finalVerification,
        authorization,
      },
    });
    if (
      !binding.taskId ||
      evidenceManifest.task_id !== binding.taskId ||
      !binding.contractDigest ||
      evidenceManifest.contract_digest !== binding.contractDigest ||
      !binding.headSha ||
      evidenceManifest.head_sha !== binding.headSha ||
      !binding.diffDigest ||
      evidenceManifest.diff_digest !== binding.diffDigest ||
      evidenceManifest.effective_risk !== authorization.contract.effective_risk
    ) {
      return {
        accepted: false,
        reason: "evidence_binding_mismatch",
      };
    }

    const risk = evidenceManifest.effective_risk;
    if (risk === "R2" || risk === "R3") {
      if (!options.publicationContext) {
        return { accepted: false, reason: "publication_context_missing" };
      }
      const publication = evaluatePublication(
        options.publicationContext.pullRequest,
        evidenceManifest,
        {
          ...options.publicationContext,
          now: options.publicationContext.now ?? new Date().toISOString(),
        },
      );
      if (!publication.eligible) {
        return {
          accepted: false,
          reason: "publication_ineligible",
          publication,
        };
      }
    }

    return rootAcceptProvider({
      ...input,
      verification: finalVerification,
    });
  }

  return {
    discoverProject,
    authorize,
    rootPlan,
    rootImplement,
    executeWorker,
    verify,
    rootAccept,
    listAvailableWorkers,
    audit,
  };
}
