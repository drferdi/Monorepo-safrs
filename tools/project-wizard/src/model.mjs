const RESERVED_WINDOWS_NAMES = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

const RISK_ORDER = { R0: 0, R1: 1, R2: 2, R3: 3 };
const R2_TERMS =
  /\b(healthcare|health|financial|finance|government|auth|authentication|payments?|migrations?|shared[- ]?package)\b/i;

function asNonEmptyText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function decodeForSafety(value) {
  let decoded = value;
  for (let index = 0; index < 3; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      throw new TypeError(
        "Project names and slugs must be safe project slugs.",
      );
    }
  }
  return decoded;
}

function assertSafeSlugSource(value) {
  const decoded = decodeForSafety(value);
  if (
    decoded === "" ||
    decoded === "." ||
    decoded === ".." ||
    /[\\/\0]/.test(decoded) ||
    decoded.includes("..")
  ) {
    throw new TypeError("Project names and slugs must be safe project slugs.");
  }
}

function slugify(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug === "" || RESERVED_WINDOWS_NAMES.has(slug)) {
    throw new TypeError("Project names and slugs must be safe project slugs.");
  }
  return slug;
}

function normalizeChoices(value, field) {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((choice) => typeof choice !== "string")
  ) {
    throw new TypeError(`${field} must be an array of text choices.`);
  }
  return [
    ...new Set(value.map((choice) => slugify(asNonEmptyText(choice, field)))),
  ].sort();
}

function normalizeRisk(value) {
  if (value === undefined) return "R1";
  if (typeof value !== "string" || !(value.toUpperCase() in RISK_ORDER)) {
    throw new TypeError("risk must be one of R0, R1, R2, or R3.");
  }
  return value.toUpperCase();
}

function normalizeAppBinding(value, kind) {
  if (value === undefined) return `apps/${kind}`;
  const binding = asNonEmptyText(value, "appBinding");
  const decoded = decodeForSafety(binding);
  const parts = decoded.split("/");
  if (
    /[\\\0]/.test(decoded) ||
    parts.length < 2 ||
    parts[0] !== "apps" ||
    parts.some((part) => !/^[a-z0-9][a-z0-9-]*$/.test(part))
  ) {
    throw new TypeError(
      "appBinding must be a bounded app binding below apps/.",
    );
  }
  return parts.join("/");
}

function computedRisk(capabilities, sensitiveDomains) {
  return R2_TERMS.test([...capabilities, ...sensitiveDomains].join(" "))
    ? "R2"
    : "R1";
}

/**
 * Normalize untrusted wizard answers into the bounded SAFRS project model.
 * @param {Record<string, unknown>} input
 */
export function normalizeProjectAnswers(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Project answers must be an object.");
  }

  const name = asNonEmptyText(input.name, "name");
  const slugSource =
    input.slug === undefined ? name : asNonEmptyText(input.slug, "slug");
  assertSafeSlugSource(slugSource);
  const slug = slugify(slugSource);
  const problem = asNonEmptyText(input.problem, "problem");
  const kind = typeof input.kind === "string" ? input.kind.toLowerCase() : "";
  if (!["web", "desktop", "extension"].includes(kind)) {
    throw new TypeError("kind must be web, desktop, or extension.");
  }
  const capabilities = normalizeChoices(input.capabilities, "capabilities");
  const sensitiveDomains = normalizeChoices(
    input.sensitiveDomains,
    "sensitiveDomains",
  );
  const suppliedRisk = normalizeRisk(input.risk);
  const minimumRisk = computedRisk(capabilities, sensitiveDomains);
  const risk =
    RISK_ORDER[suppliedRisk] >= RISK_ORDER[minimumRisk]
      ? suppliedRisk
      : minimumRisk;

  return {
    name,
    slug,
    problem,
    kind,
    capabilities,
    sensitiveDomains,
    risk,
    appBinding: normalizeAppBinding(input.appBinding, kind),
  };
}
