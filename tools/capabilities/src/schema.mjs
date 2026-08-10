const RISK_ORDER = { R0: 0, R1: 1, R2: 2, R3: 3 };
const REQUIRED_FIELDS = [
  "id",
  "label",
  "description",
  "risk",
  "dependencies",
  "environment",
  "commands",
  "tests",
  "sensitivePaths",
  "sideEffects",
  "removal",
];

export function validateText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be non-empty text.`);
  }
  if (
    [...value].some((character) => {
      const code = character.codePointAt(0);
      return code !== undefined && (code < 32 || code === 127);
    })
  ) {
    throw new TypeError(`${field} must not contain control characters.`);
  }
  return value.trim();
}

function textList(value, field) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new TypeError(`${field} must be a list of non-empty text.`);
  }
  return [...new Set(value.map((item) => validateText(item, field)))].sort();
}

export function validateManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Capability manifest must be an object.");
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in value))
      throw new TypeError(`Capability manifest needs ${field}.`);
  }
  const id = validateText(value.id, "id");
  if (!/^[a-z][a-z0-9-]*$/u.test(id))
    throw new TypeError("id must be a safe capability id.");
  const risk = validateText(value.risk, "risk").toUpperCase();
  if (!(risk in RISK_ORDER) || RISK_ORDER[risk] < RISK_ORDER.R1) {
    throw new TypeError("Capability risk must be R1, R2, or R3.");
  }
  return {
    id,
    label: validateText(value.label, "label"),
    description: validateText(value.description, "description"),
    risk,
    dependencies: textList(value.dependencies, "dependencies"),
    environment: textList(value.environment, "environment"),
    commands: textList(value.commands, "commands"),
    tests: textList(value.tests, "tests"),
    sensitivePaths: textList(value.sensitivePaths, "sensitivePaths"),
    sideEffects: textList(value.sideEffects, "sideEffects"),
    removal: validateText(value.removal, "removal"),
  };
}

export function safeProjectSlug(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/u.test(value)) {
    throw new TypeError("project must be a safe project slug.");
  }
  return value;
}

export function validateCapabilities(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.version !== 1 ||
    !Array.isArray(value.capabilities)
  ) {
    throw new TypeError(
      "capabilities.json must contain version 1 and a capabilities list.",
    );
  }
  const capabilities = value.capabilities.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TypeError("Each selected capability must be an object.");
    }
    const id = validateText(item.id, "selected capability id");
    const risk = validateText(
      item.risk,
      "selected capability risk",
    ).toUpperCase();
    if (!/^[a-z][a-z0-9-]*$/u.test(id) || !(risk in RISK_ORDER)) {
      throw new TypeError("Selected capability is invalid.");
    }
    const selected = { id, risk };
    if (item.justification !== undefined)
      selected.justification = validateText(
        item.justification,
        "technical justification",
      );
    return selected;
  });
  if (
    new Set(capabilities.map((item) => item.id)).size !== capabilities.length
  ) {
    throw new TypeError("Selected capability ids must be unique.");
  }
  return { version: 1, capabilities };
}

export function maximumRisk(first, second) {
  return RISK_ORDER[first] >= RISK_ORDER[second] ? first : second;
}
