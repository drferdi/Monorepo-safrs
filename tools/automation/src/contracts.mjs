import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { canonicalize, digestCanonical } from "./canonical-json.mjs";
import { compareRisk, computeEffectiveRisk, maxRisk } from "./risk.mjs";
import { detectCaseCollisions, normalizeScope } from "./scopes.mjs";

/**
 * Schema loading, a dependency-free validator for the JSON Schema 2020-12
 * subset these schemas use, and the task-contract compiler. Validation and
 * compilation fail closed: an input the policy cannot fully resolve is
 * rejected, never guessed at.
 */

const SECRET_PATTERNS = [
  /\b[A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL|AUTH)[A-Z0-9_]*=\S+/iu,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@\S+/iu,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:sk|rk|pk)-(?:live|test)-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b/u,
];

export function loadCompileContext(repositoryRoot) {
  const schemaDirectory = join(repositoryRoot, ".safrs/schemas");
  const schemas = {};
  for (const file of readdirSync(schemaDirectory)) {
    const match = /^(?<name>[a-z-]+)\.v1\.schema\.json$/u.exec(file);
    if (match) {
      schemas[match.groups.name] = JSON.parse(
        readFileSync(join(schemaDirectory, file), "utf8"),
      );
    }
  }
  return {
    schemas,
    policy: JSON.parse(
      readFileSync(
        join(repositoryRoot, ".safrs/automation-policy.json"),
        "utf8",
      ),
    ),
    toolInventory: JSON.parse(
      readFileSync(join(repositoryRoot, ".safrs/tool-inventory.json"), "utf8"),
    ),
    sensitivePaths: JSON.parse(
      readFileSync(join(repositoryRoot, ".safrs/sensitive-paths.json"), "utf8"),
    ),
  };
}

/* ------------------------- schema validation ------------------------- */

function resolveRef(reference, rootSchema) {
  if (!reference.startsWith("#/")) {
    throw new TypeError(`unsupported $ref: ${reference}`);
  }
  let node = rootSchema;
  for (const segment of reference.slice(2).split("/")) {
    node = node?.[segment];
  }
  if (node === undefined) {
    throw new TypeError(`unresolvable $ref: ${reference}`);
  }
  return node;
}

function typeMatches(type, value) {
  switch (type) {
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "null":
      return value === null;
    default:
      throw new TypeError(`unsupported schema type: ${type}`);
  }
}

/** V8's Date.parse rolls impossible dates over, so the calendar is checked
 *  by hand. The pattern already bounds the clock fields. */
function hasValidCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T/u.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

function validateNode(schema, value, path, rootSchema, errors) {
  // Composition keywords first: they must apply even beside $ref/const/enum.
  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      validateNode(subSchema, value, path, rootSchema, errors);
    }
  }
  if (schema.if) {
    const conditionErrors = [];
    validateNode(schema.if, value, path, rootSchema, conditionErrors);
    if (conditionErrors.length === 0 && schema.then) {
      validateNode(schema.then, value, path, rootSchema, errors);
    }
  }
  if (schema.$ref) {
    validateNode(
      resolveRef(schema.$ref, rootSchema),
      value,
      path,
      rootSchema,
      errors,
    );
    return;
  }
  if (Object.hasOwn(schema, "const")) {
    if (canonicalize(value ?? null) !== canonicalize(schema.const ?? null)) {
      errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
    }
    return;
  }
  if (schema.enum) {
    if (!schema.enum.some((entry) => entry === value)) {
      errors.push(`${path}: value not in enum`);
    }
    return;
  }
  if (schema.anyOf) {
    const passes = schema.anyOf.some((option) => {
      const optionErrors = [];
      validateNode(option, value, path, rootSchema, optionErrors);
      return optionErrors.length === 0;
    });
    if (!passes) {
      errors.push(`${path}: no anyOf branch matched`);
    }
    return;
  }
  if (schema.type && !typeMatches(schema.type, value)) {
    errors.push(`${path}: expected type ${schema.type}`);
    return;
  }
  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push(`${path}: pattern mismatch`);
    }
    if (schema.format === "date-time" && !hasValidCalendarDate(value)) {
      errors.push(`${path}: impossible calendar date`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: longer than maxLength`);
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: below minimum`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: above maximum`);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: fewer than minItems`);
    }
    if (schema.items) {
      for (const [index, entry] of value.entries()) {
        validateNode(
          schema.items,
          entry,
          `${path}[${index}]`,
          rootSchema,
          errors,
        );
      }
    }
  }
  if (
    typeMatches("object", value) &&
    (schema.properties ||
      schema.required ||
      Object.hasOwn(schema, "additionalProperties"))
  ) {
    for (const requiredKey of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push(`${path}: missing required ${requiredKey}`);
      }
    }
    for (const [key, entry] of Object.entries(value)) {
      const propertySchema = schema.properties?.[key];
      if (propertySchema) {
        validateNode(
          propertySchema,
          entry,
          `${path}.${key}`,
          rootSchema,
          errors,
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: additional property ${key} forbidden`);
      } else if (
        schema.additionalProperties &&
        schema.additionalProperties !== true
      ) {
        validateNode(
          schema.additionalProperties,
          entry,
          `${path}.${key}`,
          rootSchema,
          errors,
        );
      }
    }
  }
}

export function validateAgainstSchema(schema, value) {
  const errors = [];
  validateNode(schema, value, "$", schema, errors);
  return { valid: errors.length === 0, errors };
}

/* --------------------------- glob matching --------------------------- */

/** fnmatch-compatible: '*' and '**' both cross '/', '?' is one character. */
export function patternMatches(path, pattern) {
  const source = pattern
    .replaceAll(/[.+^${}()|\\]/gu, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", ".*")
    .replaceAll("\u0000", ".*")
    .replaceAll("?", ".");
  return new RegExp(`^${source}$`, "iu").test(path);
}

/* ----------------------------- compiler ------------------------------ */

function reject(message) {
  throw new Error(`task contract rejected: ${message}`);
}

function rejectSecretLike(value, field) {
  if (
    typeof value === "string" &&
    SECRET_PATTERNS.some((pattern) => pattern.test(value))
  ) {
    reject(`secret-like content in ${field}`);
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      rejectSecretLike(entry, `${field}[${index}]`);
    }
  } else if (typeof value === "object" && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      rejectSecretLike(entry, `${field}.${key}`);
    }
  }
}

function classifyPathRisk(writeScopes, sensitivePaths) {
  for (const rule of sensitivePaths.risk_overrides ?? []) {
    for (const scope of writeScopes) {
      if (rule.patterns.some((pattern) => patternMatches(scope, pattern))) {
        return {
          risk: rule.risk,
          reason: `write scope ${scope} matches ${rule.risk} override`,
        };
      }
    }
  }
  for (const scope of writeScopes) {
    if (
      (sensitivePaths.patterns ?? []).some((pattern) =>
        patternMatches(scope, pattern),
      )
    ) {
      return { risk: "R2", reason: `write scope ${scope} is a sensitive path` };
    }
  }
  return writeScopes.length > 0
    ? { risk: "R1", reason: "write scopes grant reversible mutation" }
    : { risk: "R0", reason: "no write scopes" };
}

export function compileTaskContract(input, context) {
  const { policy, toolInventory, sensitivePaths, schemas } = context;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    reject("input must be an object");
  }

  // Deep scan: every requester-controlled string in the input, not just the
  // headline fields — rollback text, evidence URLs, tool lists, all of it.
  rejectSecretLike(input, "input");

  const created = Date.parse(input.created_at ?? "");
  const expires = Date.parse(input.expires_at ?? "");
  if (!Number.isFinite(created) || !Number.isFinite(expires)) {
    reject("created_at and expires_at must be valid UTC timestamps");
  }
  if (expires <= created) {
    reject("expiry must be after creation");
  }
  if (expires - created > policy.max_expiry_hours * 3_600_000) {
    reject(`expiry exceeds policy maximum of ${policy.max_expiry_hours}h`);
  }

  const readScopes = (input.read_scopes ?? []).map((scope) =>
    normalizeScope(scope),
  );
  const writeScopes = (input.write_scopes ?? []).map((scope) =>
    normalizeScope(scope),
  );
  const collisions = detectCaseCollisions([...writeScopes]);
  if (collisions.length > 0) {
    reject(`case collision in write scopes: ${collisions[0].casefolded}`);
  }

  const declared = input.declared_risk;
  if (declared === "R0" && writeScopes.length > 0) {
    reject("R0 contracts must have empty write scopes");
  }

  const knownTools = new Map(
    (toolInventory.tools ?? []).map((tool) => [tool.id, tool]),
  );
  const grantedEndpoints = new Set();
  for (const grant of input.tools ?? []) {
    const record = knownTools.get(grant.id);
    if (!record) {
      reject(`unknown tool: ${grant.id}`);
    }
    if (record.review_status === "DISABLED") {
      reject(`tool is disabled: ${grant.id}`);
    }
    const allowedSubcommands = new Set(record.allowed_operations ?? []);
    for (const subcommand of grant.subcommands ?? []) {
      if (!allowedSubcommands.has(subcommand)) {
        reject(
          `tool ${grant.id} subcommand not in inventory allowlist: ${subcommand}`,
        );
      }
    }
    for (const endpoint of record.network_endpoints ?? []) {
      grantedEndpoints.add(endpoint.toLowerCase());
    }
  }

  const operationRisks = ["R0"];
  for (const operation of input.operations ?? []) {
    const record = policy.operations[operation];
    if (!record) {
      reject(`unknown operation: ${operation}`);
    }
    operationRisks.push(record.min_risk);
  }

  let capabilityRisk = { risk: "R0", reason: "no elevated capabilities" };
  if (input.network !== "denied") {
    // A network grant must trace to a granted tool's registered endpoint —
    // inventory-wide registration alone is not authority.
    for (const entry of Array.isArray(input.network) ? input.network : []) {
      if (!grantedEndpoints.has(String(entry.host ?? "").toLowerCase())) {
        reject(
          `network endpoint not granted by any requested tool: ${entry.host}`,
        );
      }
      if (entry.port !== 443) {
        reject(`network entries must use HTTPS port 443, got: ${entry.port}`);
      }
    }
    capabilityRisk = {
      risk: policy.capability_risk.network_egress,
      reason: "explicit network egress requested",
    };
  }

  const budgets = input.budgets ?? {};
  for (const dimension of policy.budgets.required_dimensions) {
    if (!Object.hasOwn(budgets, dimension)) {
      reject(`missing enforceable budget dimension: ${dimension}`);
    }
  }
  for (const [dimension, maximum] of Object.entries(policy.budgets.maximums)) {
    const value = budgets[dimension];
    if (typeof value === "number" && value > maximum) {
      reject(`budget ${dimension} exceeds policy maximum ${maximum}`);
    }
  }
  if (
    budgets.spend === "unmetered" &&
    !policy.budgets.spend_unmetered_allowed
  ) {
    reject("unmetered spend is not allowed by policy");
  }

  const APPROVAL_STRICTNESS = [
    "none",
    "automatic_gates_only",
    "independent_or_code_owner",
    "protected_environment_human",
  ];
  const approvalPolicy = input.approval_policy ?? policy.approval_defaults;
  for (const level of ["R0", "R1", "R2", "R3"]) {
    if (
      APPROVAL_STRICTNESS.indexOf(approvalPolicy[level]) <
      APPROVAL_STRICTNESS.indexOf(policy.approval_defaults[level])
    ) {
      reject(
        `approval_policy ${level} downgrades the policy default ` +
          `${policy.approval_defaults[level]} to ${approvalPolicy[level]}`,
      );
    }
  }

  const verificationProfile =
    input.verification_profile ?? policy.verification_checks;
  for (const check of policy.verification_checks) {
    if (!verificationProfile.includes(check)) {
      reject(`verification_profile omits policy-required check: ${check}`);
    }
  }

  const pathRisk = classifyPathRisk(writeScopes, sensitivePaths);
  const dataRisk = policy.data_classification_risk[input.data_classification];
  if (!dataRisk) {
    reject(`unknown data classification: ${input.data_classification}`);
  }

  const { risk: computedRisk, reasons } = computeEffectiveRisk({
    declared,
    dimensions: {
      path: pathRisk,
      operation: {
        risk: maxRisk(operationRisks),
        reason: `operations require ${maxRisk(operationRisks)}`,
      },
      data: {
        risk: dataRisk,
        reason: `data classification ${input.data_classification}`,
      },
      capability: capabilityRisk,
    },
  });

  for (const field of ["computed_risk", "effective_risk"]) {
    if (input[field] && compareRisk(input[field], computedRisk) < 0) {
      reject(
        `${field} ${input[field]} attempts to lower the computed risk ${computedRisk}`,
      );
    }
  }
  const effectiveRisk = maxRisk(
    [computedRisk, input.effective_risk, input.computed_risk].filter(Boolean),
  );

  const contract = {
    schema_version: 1,
    task_id: input.task_id,
    objective: input.objective,
    requester: input.requester,
    accountable_human: input.accountable_human,
    created_at: input.created_at,
    expires_at: input.expires_at,
    base_ref: input.base_ref,
    base_sha: input.base_sha,
    declared_risk: declared,
    computed_risk: computedRisk,
    effective_risk: effectiveRisk,
    risk_reasons: reasons,
    read_scopes: readScopes,
    write_scopes: writeScopes,
    operations: [...(input.operations ?? [])].sort(),
    tools: (input.tools ?? []).map((grant) => ({
      id: grant.id,
      subcommands: [...(grant.subcommands ?? [])].sort(),
    })),
    network: input.network,
    data_classification: input.data_classification,
    isolation_profile: input.isolation_profile,
    budgets,
    verification_profile: verificationProfile,
    approval_policy: approvalPolicy,
    rollback: input.rollback,
    requested_by_evidence: input.requested_by_evidence,
  };

  const contractDigest = digestCanonical(contract);
  const complete = { ...contract, contract_digest: contractDigest };

  const verdict = validateAgainstSchema(schemas["task-contract"], complete);
  if (!verdict.valid) {
    reject(`schema validation failed: ${verdict.errors.join("; ")}`);
  }

  return {
    contract: complete,
    canonicalJson: canonicalize(complete),
    contractDigest,
  };
}
