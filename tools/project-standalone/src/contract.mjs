import { readFile } from "node:fs/promises";
import path from "node:path";

const topLevelKeys = new Set([
  "schemaVersion",
  "id",
  "owner",
  "risk",
  "runtime",
  "packageManager",
  "commands",
  "smoke",
  "artifacts",
  "externalDependencies",
  "mutableStatePaths",
]);
const commandNames = [
  "install",
  "lint",
  "typecheck",
  "test",
  "build",
  "run",
  "deployDryRun",
];
const requiredCommands = new Set([
  "install",
  "test",
  "build",
  "run",
  "deployDryRun",
]);
const shellPrograms = new Set([
  "bash",
  "cmd",
  "cmd.exe",
  "fish",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "sh",
  "zsh",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.hasOwn(object, key);
}

function nonEmptyString(value) {
  return typeof value === "string" && /\S/u.test(value);
}

function rejectUnknownKeys(value, allowed, field, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${field}.${key} is not allowed.`);
  }
}

function requireKeys(value, required, field, errors) {
  if (!isObject(value)) return;
  for (const key of required) {
    if (!hasOwn(value, key)) errors.push(`${field}.${key} is required.`);
  }
}

function isAbsoluteOnAnyPlatform(value) {
  return (
    path.posix.isAbsolute(value.replaceAll("\\", "/")) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)
  );
}

function hasParentSegment(value) {
  return value.replaceAll("\\", "/").split("/").includes("..");
}

function credentialedUrl(value) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.username || parsed.password);
  } catch {
    return false;
  }
}

function isUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function safeRelativePath(value) {
  if (!nonEmptyString(value) || value.includes("\0")) return false;
  if (isAbsoluteOnAnyPlatform(value) || hasParentSegment(value)) return false;
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  return (
    normalized !== "." && normalized !== ".." && !normalized.startsWith("../")
  );
}

function validateRelativePath(value, field, errors) {
  if (!nonEmptyString(value)) {
    errors.push(`${field} must be a non-empty string.`);
  } else if (!safeRelativePath(value)) {
    errors.push(`${field} must be a contained capsule-relative path.`);
  }
}

function validateProgram(program, field, errors) {
  if (!nonEmptyString(program)) {
    errors.push(`${field} must be a non-empty string.`);
    return;
  }
  const basename = path.win32.basename(program).toLowerCase();
  if (/\.(?:bat|cmd)$/iu.test(basename)) {
    errors.push(`${field} must not execute a batch file.`);
  }
  if (shellPrograms.has(basename)) {
    errors.push(`${field} must not execute a shell interpreter.`);
  }
  if (
    isAbsoluteOnAnyPlatform(program) ||
    ((program.includes("/") || program.includes("\\")) &&
      !safeRelativePath(program))
  ) {
    errors.push(
      `${field} must be a contained capsule-relative path or a program name.`,
    );
  }
}

function validateArgument(argument, field, errors) {
  if (typeof argument !== "string") {
    errors.push(`${field} must be a string.`);
    return;
  }
  const candidates = [argument];
  if (argument.startsWith("-")) {
    for (const separator of ["=", ":"]) {
      const index = argument.indexOf(separator);
      if (index >= 0 && index < argument.length - 1) {
        candidates.push(argument.slice(index + 1));
      }
    }
    const shortFlagValue = argument.match(/^-[A-Za-z](.+)$/u)?.[1];
    if (shortFlagValue) candidates.push(shortFlagValue);
  }
  for (const candidate of candidates) {
    if (credentialedUrl(candidate)) {
      errors.push(`${field} must not embed URL credentials.`);
      return;
    }
    if (isUrl(candidate)) continue;
    const pathCandidate = candidate.startsWith("@")
      ? candidate.slice(1)
      : candidate;
    const pathLike =
      pathCandidate === "." ||
      pathCandidate === ".." ||
      /[/\\]/u.test(pathCandidate) ||
      /^[A-Za-z]:/u.test(pathCandidate) ||
      /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(pathCandidate);
    if (pathLike && !safeRelativePath(pathCandidate)) {
      errors.push(`${field} contains an absolute or parent-escaping path.`);
      return;
    }
  }
}

function validateCommand(value, name, errors) {
  const field = `$.commands.${name}`;
  if (!isObject(value)) {
    errors.push(`${field} must be an object.`);
    return;
  }
  const required = requiredCommands.has(name);
  const notApplicable = value.program === null;
  if (required && notApplicable) {
    errors.push(`${field}.program must be executable.`);
  }
  if (notApplicable) {
    rejectUnknownKeys(
      value,
      new Set(["program", "args", "notApplicableReason"]),
      field,
      errors,
    );
    requireKeys(
      value,
      ["program", "args", "notApplicableReason"],
      field,
      errors,
    );
    if (!Array.isArray(value.args) || value.args.length !== 0) {
      errors.push(`${field}.args must be an empty array when not applicable.`);
    }
    if (!nonEmptyString(value.notApplicableReason)) {
      errors.push(`${field}.notApplicableReason must be a non-empty string.`);
    }
    return;
  }
  rejectUnknownKeys(value, new Set(["program", "args"]), field, errors);
  requireKeys(value, ["program", "args"], field, errors);
  validateProgram(value.program, `${field}.program`, errors);
  if (!Array.isArray(value.args)) {
    errors.push(`${field}.args must be an array.`);
  } else {
    value.args.forEach((argument, index) => {
      validateArgument(argument, `${field}.args[${index}]`, errors);
    });
  }
}

function validateRuntime(value, errors) {
  if (!isObject(value)) {
    errors.push("$.runtime must be an object.");
    return;
  }
  rejectUnknownKeys(value, new Set(["name", "version"]), "$.runtime", errors);
  requireKeys(value, ["name", "version"], "$.runtime", errors);
  for (const key of ["name", "version"]) {
    if (!nonEmptyString(value[key]))
      errors.push(`$.runtime.${key} must be a non-empty string.`);
  }
}

function validatePackageManager(value, errors) {
  if (!isObject(value)) {
    errors.push("$.packageManager must be an object.");
    return;
  }
  rejectUnknownKeys(
    value,
    new Set(["name", "version", "lockfile"]),
    "$.packageManager",
    errors,
  );
  requireKeys(
    value,
    ["name", "version", "lockfile"],
    "$.packageManager",
    errors,
  );
  if (!nonEmptyString(value.name))
    errors.push("$.packageManager.name must be a non-empty string.");
  if (value.version !== null && !nonEmptyString(value.version)) {
    errors.push("$.packageManager.version must be null or a non-empty string.");
  }
  if (value.lockfile !== null)
    validateRelativePath(value.lockfile, "$.packageManager.lockfile", errors);
}

function validateSmoke(value, errors) {
  if (!isObject(value)) {
    errors.push("$.smoke must be an object.");
    return;
  }
  if (value.kind === "none") {
    rejectUnknownKeys(
      value,
      new Set(["kind", "notApplicableReason"]),
      "$.smoke",
      errors,
    );
    requireKeys(value, ["kind", "notApplicableReason"], "$.smoke", errors);
    if (!nonEmptyString(value.notApplicableReason)) {
      errors.push("$.smoke.notApplicableReason must be a non-empty string.");
    }
    return;
  }
  if (value.kind !== "http") {
    errors.push('$.smoke.kind must be "none" or "http".');
    return;
  }
  const keys = new Set([
    "kind",
    "host",
    "port",
    "path",
    "expectedStatus",
    "startupTimeoutSeconds",
  ]);
  rejectUnknownKeys(value, keys, "$.smoke", errors);
  requireKeys(value, keys, "$.smoke", errors);
  if (!new Set(["127.0.0.1", "::1", "localhost"]).has(value.host)) {
    errors.push("$.smoke.host must be a loopback host.");
  }
  if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535) {
    errors.push("$.smoke.port must be an integer from 1 through 65535.");
  }
  if (typeof value.path !== "string" || !value.path.startsWith("/")) {
    errors.push("$.smoke.path must begin with /.");
  }
  if (
    !Number.isInteger(value.expectedStatus) ||
    value.expectedStatus < 100 ||
    value.expectedStatus > 599
  ) {
    errors.push(
      "$.smoke.expectedStatus must be an integer from 100 through 599.",
    );
  }
  if (
    !Number.isInteger(value.startupTimeoutSeconds) ||
    value.startupTimeoutSeconds < 1
  ) {
    errors.push("$.smoke.startupTimeoutSeconds must be a positive integer.");
  }
}

export function validateContract(contract) {
  const errors = [];
  if (!isObject(contract)) return ["$ must be an object."];
  rejectUnknownKeys(contract, topLevelKeys, "$", errors);
  requireKeys(contract, topLevelKeys, "$", errors);
  if (contract.schemaVersion !== 1)
    errors.push("$.schemaVersion must equal 1.");
  if (
    !nonEmptyString(contract.id) ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(
      contract.id,
    )
  ) {
    errors.push("$.id must use the domain/capsule identifier format.");
  }
  if (!nonEmptyString(contract.owner))
    errors.push("$.owner must be a non-empty string.");
  if (!["R0", "R1", "R2", "R3"].includes(contract.risk)) {
    errors.push("$.risk must be R0, R1, R2, or R3.");
  }
  validateRuntime(contract.runtime, errors);
  validatePackageManager(contract.packageManager, errors);

  if (!isObject(contract.commands)) {
    errors.push("$.commands must be an object.");
  } else {
    rejectUnknownKeys(
      contract.commands,
      new Set(commandNames),
      "$.commands",
      errors,
    );
    requireKeys(contract.commands, commandNames, "$.commands", errors);
    for (const name of commandNames)
      validateCommand(contract.commands[name], name, errors);
  }
  validateSmoke(contract.smoke, errors);

  for (const field of ["artifacts", "mutableStatePaths"]) {
    const value = contract[field];
    if (
      !Array.isArray(value) ||
      (field === "artifacts" && value.length === 0)
    ) {
      errors.push(
        `$.${field} must be ${field === "artifacts" ? "a non-empty" : "an"} array.`,
      );
      continue;
    }
    value.forEach((item, index) => {
      validateRelativePath(item, `$.${field}[${index}]`, errors);
    });
    if (new Set(value).size !== value.length)
      errors.push(`$.${field} must contain unique paths.`);
  }

  if (!Array.isArray(contract.externalDependencies)) {
    errors.push("$.externalDependencies must be an array.");
  } else {
    contract.externalDependencies.forEach((dependency, index) => {
      const field = `$.externalDependencies[${index}]`;
      if (!isObject(dependency)) {
        errors.push(`${field} must be an object.`);
        return;
      }
      const keys = new Set(["kind", "name", "locator", "required"]);
      rejectUnknownKeys(dependency, keys, field, errors);
      requireKeys(dependency, keys, field, errors);
      for (const key of ["kind", "name", "locator"]) {
        if (!nonEmptyString(dependency[key]))
          errors.push(`${field}.${key} must be a non-empty string.`);
      }
      if (credentialedUrl(dependency.locator))
        errors.push(`${field}.locator must not embed URL credentials.`);
      if (typeof dependency.required !== "boolean")
        errors.push(`${field}.required must be boolean.`);
    });
  }
  return [...new Set(errors)].sort();
}

export class ContractError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "ContractError";
    this.errors = errors;
  }
}

export async function loadAndValidateContract(contractPath) {
  let source;
  try {
    source = await readFile(contractPath, "utf8");
  } catch (error) {
    throw new ContractError(
      `${contractPath}: cannot read project.contract.json: ${error.message}`,
    );
  }
  let contract;
  try {
    contract = JSON.parse(source);
  } catch (error) {
    throw new ContractError(
      `${contractPath}: project.contract.json must contain valid JSON: ${error.message}`,
    );
  }
  const errors = validateContract(contract);
  if (errors.length) {
    throw new ContractError(
      `${contractPath}: invalid project contract:\n${errors.map((error) => `- ${error}`).join("\n")}`,
      errors,
    );
  }
  return contract;
}
