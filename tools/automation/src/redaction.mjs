/**
 * Deterministic evidence redaction. Same input, same output, always — the
 * redacted text is what gets hashed into the evidence manifest, so any
 * nondeterminism here would fork digests.
 *
 * Bump REDACTION_VERSION whenever a rule changes; manifests record the
 * version that produced them so old evidence stays interpretable.
 */

export const REDACTION_VERSION = 1;

const RULES = [
  {
    label: "TOKEN",
    pattern:
      /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:sk|rk|pk)-(?:live|test)-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b/gu,
  },
  {
    label: "ASSIGNMENT",
    pattern:
      /\b([A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL|AUTH)[A-Z0-9_]*)=\S+/giu,
    replace: (_match, name) => `${name}=[REDACTED:ASSIGNMENT]`,
  },
  {
    label: "URL_CREDENTIALS",
    pattern: /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/giu,
    replace: (_match, scheme) => `${scheme}[REDACTED:URL_CREDENTIALS]@`,
  },
  {
    label: "PRIVATE_KEY",
    pattern:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gu,
  },
];

export function redactText(value) {
  if (typeof value !== "string") {
    return value;
  }
  let result = value;
  for (const rule of RULES) {
    result = result.replaceAll(
      rule.pattern,
      rule.replace ?? `[REDACTED:${rule.label}]`,
    );
  }
  return result;
}

/** Recursively redacts every string in a JSON-shaped value. */
export function redactValue(value) {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]),
    );
  }
  return value;
}

const REDACTION_MARKER = /\[REDACTED:[A-Z_]+\]/gu;

export function containsSecret(value) {
  const raw = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
  // Replace our own markers with a space first: "NAME=[REDACTED:ASSIGNMENT]"
  // would otherwise re-match the assignment rule. A space (not an empty
  // string) so a trailing marker cannot leave "NAME=" glued to the closing
  // JSON quote, which \S+ would still match.
  const serialized = raw.replaceAll(REDACTION_MARKER, " ");
  return RULES.some((rule) => {
    const probe = new RegExp(rule.pattern.source, rule.pattern.flags);
    return probe.test(serialized);
  });
}
