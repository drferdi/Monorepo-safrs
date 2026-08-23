import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import { ContractError, loadAndValidateContract } from "./contract.mjs";
import {
  assertSafeTree,
  copyCapsule,
  createExtraction,
  removeExtraction,
} from "./extraction.mjs";
import {
  boundedOutput,
  createSanitizedEnvironment,
  runCommand,
  startManagedProcess,
  stopManagedProcess,
} from "./process.mjs";

const lifecycleOrder = ["install", "lint", "typecheck", "test", "build"];
const commandTimeoutMs = 120_000;

function isWithin(candidate, boundary) {
  const relative = path.relative(boundary, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function absoluteOnAnyPlatform(value) {
  return (
    path.posix.isAbsolute(value.replaceAll("\\", "/")) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)
  );
}

async function assertRealDirectory(directory, label) {
  let info;
  try {
    info = await lstat(directory);
  } catch (error) {
    throw new ContractError(`${label} is unavailable: ${error.message}`);
  }
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new ContractError(`${label} must be a real directory.`);
  }
  return realpath(directory);
}

async function assertCapsuleFile(capsule, relativePath, label) {
  const candidate = path.resolve(
    capsule,
    relativePath.replaceAll("/", path.sep).replaceAll("\\", path.sep),
  );
  if (!isWithin(candidate, capsule) || candidate === capsule) {
    throw new ContractError(`${label} escapes the project capsule.`);
  }
  let info;
  try {
    info = await lstat(candidate);
  } catch (error) {
    throw new ContractError(
      `${label} is missing: ${relativePath} (${error.message})`,
    );
  }
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new ContractError(
      `${label} must be a real capsule-owned file: ${relativePath}`,
    );
  }
  const canonical = await realpath(candidate);
  if (!isWithin(canonical, capsule)) {
    throw new ContractError(`${label} resolves outside the project capsule.`);
  }
}

async function validateCapsuleFiles(capsule, contract) {
  if (contract.packageManager.lockfile !== null) {
    await assertCapsuleFile(
      capsule,
      contract.packageManager.lockfile,
      "Package-manager lockfile",
    );
  }
  for (const [name, command] of Object.entries(contract.commands)) {
    if (
      command.program !== null &&
      (command.program.includes("/") || command.program.includes("\\"))
    ) {
      await assertCapsuleFile(
        capsule,
        command.program,
        `commands.${name}.program`,
      );
    }
  }
}

function parseSelector(selector) {
  if (
    !selector ||
    typeof selector !== "string" ||
    absoluteOnAnyPlatform(selector)
  ) {
    throw new ContractError(
      "Capsule selector must be a relative domain/capsule identifier.",
    );
  }
  const normalized = selector.replaceAll("\\", "/").replace(/^projects\//u, "");
  const parts = normalized.split("/");
  if (
    parts.length !== 2 ||
    parts.some((part) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(part))
  ) {
    throw new ContractError(
      "Capsule selector must use domain/capsule or projects/domain/capsule.",
    );
  }
  return parts;
}

async function capsuleAt(projectsRoot, domain, name) {
  const domainPath = path.join(projectsRoot, domain);
  const capsule = path.join(domainPath, name);
  await assertRealDirectory(domainPath, `Project domain ${domain}`);
  const canonicalProjects = await realpath(projectsRoot);
  const canonicalCapsule = await assertRealDirectory(
    capsule,
    `Project capsule ${domain}/${name}`,
  );
  if (!isWithin(canonicalCapsule, canonicalProjects)) {
    throw new ContractError(
      `Project capsule ${domain}/${name} escapes the projects root.`,
    );
  }
  const contractPath = path.join(canonicalCapsule, "project.contract.json");
  const contractInfo = await lstat(contractPath).catch((error) => {
    throw new ContractError(
      `${domain}/${name} has no readable project.contract.json: ${error.message}`,
    );
  });
  if (!contractInfo.isFile() || contractInfo.isSymbolicLink()) {
    throw new ContractError(
      `${domain}/${name}/project.contract.json must be a real file.`,
    );
  }
  const contract = await loadAndValidateContract(contractPath);
  const id = `${domain}/${name}`;
  if (contract.id !== id) {
    throw new ContractError(
      `$.id must equal capsule path ${id}, received ${contract.id}.`,
    );
  }
  await validateCapsuleFiles(canonicalCapsule, contract);
  return { id, capsule: canonicalCapsule, contract, contractPath };
}

export async function resolveCapsules(root, selector) {
  const canonicalRoot = await assertRealDirectory(root, "Repository root");
  const projectsRoot = path.join(canonicalRoot, "projects");
  await assertRealDirectory(projectsRoot, "Projects root");
  if (selector) {
    const [domain, name] = parseSelector(selector);
    return [await capsuleAt(projectsRoot, domain, name)];
  }

  const capsules = [];
  const domains = await readdir(projectsRoot, { withFileTypes: true });
  for (const domain of domains.sort((first, second) =>
    first.name.localeCompare(second.name),
  )) {
    if (domain.isSymbolicLink()) {
      throw new ContractError(
        `Project domain ${domain.name} must not be a symbolic link.`,
      );
    }
    if (!domain.isDirectory() || domain.name.startsWith("_")) continue;
    const domainPath = path.join(projectsRoot, domain.name);
    const candidates = await readdir(domainPath, { withFileTypes: true });
    for (const candidate of candidates.sort((first, second) =>
      first.name.localeCompare(second.name),
    )) {
      if (candidate.isSymbolicLink()) {
        throw new ContractError(
          `Project capsule ${domain.name}/${candidate.name} must not be a symbolic link.`,
        );
      }
      if (!candidate.isDirectory()) continue;
      const contractPath = path.join(
        domainPath,
        candidate.name,
        "project.contract.json",
      );
      try {
        const info = await lstat(contractPath);
        if (info.isFile() && !info.isSymbolicLink()) {
          capsules.push(
            await capsuleAt(projectsRoot, domain.name, candidate.name),
          );
        }
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
  return capsules;
}

async function structuralReadiness(root, checkerPath) {
  const python = process.platform === "win32" ? "python" : "python3";
  const result = await runCommand(python, [checkerPath, "--root", root], {
    cwd: root,
    env: createSanitizedEnvironment({}, process.env, undefined, {
      forbiddenRoots: [root],
    }),
    timeoutMs: 30_000,
  });
  if (result.timedOut)
    throw new ContractError("Structural independence checker timed out.");
  if (result.exitCode !== 0) {
    throw new ContractError(
      `Structural independence check failed${boundedOutput(result) ? `:\n${boundedOutput(result)}` : "."}`,
    );
  }
}

export async function statusCapsules({ root, selector, checkerPath }) {
  const capsules = await resolveCapsules(root, selector);
  await structuralReadiness(root, checkerPath);
  return capsules.map(({ id, contract }) => ({
    id,
    risk: contract.risk,
    runtime: `${contract.runtime.name}@${contract.runtime.version}`,
    structural: "PASS",
  }));
}

export class VerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "VerificationError";
  }
}

function record(stages, name, status, detail) {
  stages.push({ name, status, ...(detail ? { detail } : {}) });
}

async function executeLifecycle(name, command, state) {
  if (command.program === null) {
    record(state.stages, name, "SKIP", command.notApplicableReason);
    return;
  }
  const result = await runCommand(command.program, command.args, {
    cwd: state.extraction.capsule,
    env: state.environment,
    timeoutMs: commandTimeoutMs,
  });
  if (result.timedOut) {
    record(state.stages, name, "FAIL", "timeout");
    throw new VerificationError(
      `${name} timed out after ${commandTimeoutMs / 1000} seconds.`,
    );
  }
  if (result.exitCode !== 0) {
    const evidence = boundedOutput(result, state.environment);
    record(
      state.stages,
      name,
      "FAIL",
      `exit ${result.exitCode ?? "unavailable"}`,
    );
    throw new VerificationError(
      `${name} failed with exit code ${result.exitCode ?? "unavailable"}${evidence ? `:\n${evidence}` : "."}`,
    );
  }
  await assertSafeTree(state.extraction.capsule);
  record(state.stages, name, "PASS");
}

async function validateArtifacts(contract, capsule, stages) {
  await assertSafeTree(capsule);
  const canonicalCapsule = await realpath(capsule);
  for (const artifact of contract.artifacts) {
    const candidate = path.resolve(capsule, artifact.replaceAll("/", path.sep));
    if (
      !isWithin(candidate, canonicalCapsule) ||
      candidate === canonicalCapsule
    ) {
      record(stages, "artifacts", "FAIL", artifact);
      throw new VerificationError(
        `Artifact path escapes the extracted capsule: ${artifact}`,
      );
    }
    let info;
    try {
      info = await lstat(candidate);
    } catch (error) {
      if (error?.code === "ENOENT") {
        record(stages, "artifacts", "FAIL", artifact);
        throw new VerificationError(
          `Declared artifact is missing after build: ${artifact}`,
        );
      }
      throw error;
    }
    if (info.isSymbolicLink()) {
      record(stages, "artifacts", "FAIL", artifact);
      throw new VerificationError(
        `Declared artifact is a symbolic link: ${artifact}`,
      );
    }
  }
  record(stages, "artifacts", "PASS", `${contract.artifacts.length} declared`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function probeHttp(smoke, child) {
  const deadline = Date.now() + smoke.startupTimeoutSeconds * 1000;
  let spawnError;
  child.once("error", (error) => {
    spawnError = error;
  });
  const host = smoke.host === "::1" ? "[::1]" : smoke.host;
  const url = `http://${host}:${smoke.port}${smoke.path}`;
  while (Date.now() < deadline) {
    if (spawnError)
      throw new VerificationError(`run failed to start: ${spawnError.message}`);
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new VerificationError(
        `run exited before the HTTP smoke probe passed.`,
      );
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      await response.body?.cancel();
      if (response.status === smoke.expectedStatus) return;
    } catch {
      // Startup connection failures are expected until the bounded deadline.
    }
    await delay(100);
  }
  throw new VerificationError(
    `HTTP smoke probe timed out at ${smoke.path}; expected status ${smoke.expectedStatus}.`,
  );
}

async function runAndSmoke(contract, state) {
  if (contract.smoke.kind === "none") {
    await executeLifecycle("run", contract.commands.run, state);
    return;
  }

  state.managed = startManagedProcess(
    contract.commands.run.program,
    contract.commands.run.args,
    {
      cwd: state.extraction.capsule,
      env: state.environment,
    },
  );
  const output = { stdout: "", stderr: "" };
  state.managed.stdout.on("data", (chunk) => {
    output.stdout = `${output.stdout}${chunk.toString("utf8")}`.slice(0, 4096);
  });
  state.managed.stderr.on("data", (chunk) => {
    output.stderr = `${output.stderr}${chunk.toString("utf8")}`.slice(0, 4096);
  });
  try {
    await probeHttp(contract.smoke, state.managed);
    record(state.stages, "run", "PASS", "managed process started once");
    record(
      state.stages,
      "smoke",
      "PASS",
      `${contract.smoke.path} -> ${contract.smoke.expectedStatus}`,
    );
  } catch (error) {
    const evidence = boundedOutput(output, state.environment);
    if (evidence) error.message = `${error.message}\n${evidence}`;
    record(state.stages, "smoke", "FAIL", error.message);
    throw error;
  } finally {
    await stopManagedProcess(state.managed, state.environment);
    state.managed = null;
  }
  await assertSafeTree(state.extraction.capsule);
}

export async function verifyCapsule({ root, selector, checkerPath }) {
  if (!selector)
    throw new ContractError("verify requires one capsule selector.");
  const [capsule] = await resolveCapsules(root, selector);
  await structuralReadiness(root, checkerPath);
  const result = {
    id: capsule.id,
    ok: false,
    stages: [],
    extractedRemoved: false,
  };
  const state = {
    stages: result.stages,
    extraction: null,
    environment: null,
    managed: null,
  };
  let primaryError;
  const cleanupErrors = [];
  try {
    state.extraction = await createExtraction();
    result.extraction = path.basename(state.extraction.root);
    await copyCapsule(
      capsule.capsule,
      state.extraction.capsule,
      capsule.contract,
    );
    state.environment = createSanitizedEnvironment(
      capsule.contract.smoke.kind === "http"
        ? {
            HOST: capsule.contract.smoke.host,
            PORT: String(capsule.contract.smoke.port),
          }
        : {},
      process.env,
      state.extraction.home,
      { forbiddenRoots: [root] },
    );

    for (const name of lifecycleOrder) {
      await executeLifecycle(name, capsule.contract.commands[name], state);
    }
    await validateArtifacts(
      capsule.contract,
      state.extraction.capsule,
      state.stages,
    );
    await executeLifecycle(
      "deployDryRun",
      capsule.contract.commands.deployDryRun,
      state,
    );
    await runAndSmoke(capsule.contract, state);
    result.ok = true;
  } catch (error) {
    primaryError = error;
  } finally {
    if (state.managed) {
      try {
        await stopManagedProcess(state.managed, state.environment);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (state.extraction) {
      try {
        await removeExtraction(state.extraction);
        result.extractedRemoved = true;
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    record(
      state.stages,
      "cleanup",
      cleanupErrors.length ? "FAIL" : "PASS",
      cleanupErrors.length
        ? cleanupErrors.map((error) => error.message).join("; ")
        : undefined,
    );
  }

  if (primaryError || cleanupErrors.length) {
    result.ok = false;
    const errors = [primaryError, ...cleanupErrors].filter(Boolean);
    const error =
      errors.length === 1
        ? errors[0]
        : new AggregateError(
            errors,
            "Standalone verification failed with cleanup errors.",
          );
    error.result = result;
    throw error;
  }
  return result;
}
