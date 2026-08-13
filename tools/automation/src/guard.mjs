import path from "node:path";

/**
 * Shared policy guard: one vendor-neutral decision for every adapter.
 *
 * authorize(event, context) -> {
 *   decision: "allow" | "ask" | "deny" | "stop",
 *   reasonCode, message, additionalContext?, remainingBudgets?
 * }
 *
 * Canonical verdicts are identical across adapters; an adapter without an
 * "ask" channel renders ask as deny (fail closed), and one without any
 * enforceable pre-action hook must stay read-only.
 *
 * Events:
 *   { type: "command", command }
 *   { type: "write",   paths: [repo-relative...] }
 *   { type: "read",    paths: [repo-relative...] }
 */

const CREDENTIAL_PATTERNS = [
  ".env",
  ".env.*",
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/*.p12",
  "**/*.pfx",
  "**/*.key",
  "**/id_rsa*",
  "**/id_ed25519*",
  "**/credentials.json",
  "**/secrets.json",
];
const CREDENTIAL_EXCEPTIONS = [
  ".env.example",
  "**/.env.example",
  ".env.template",
  "**/.env.template",
  ".env.dist",
  "**/.env.dist",
];

/** Template filenames are always safe; remove them before pattern tests so
 *  ".env" inside ".env.example" cannot trigger a credential match. */
function stripTemplateNames(command) {
  return command.replaceAll(/\.env\.(?:example|template|dist)\b/giu, "");
}

const COMMAND_RULES = [
  {
    reasonCode: "FORCE_PUSH",
    decision: "deny",
    test: (command) =>
      /\bgit\s+push\s+[^\n]*--force(?!-with-lease)\b/iu.test(command) ||
      /\bgit\s+push\s+[^\n]*(?<![\w-])-f(?![\w-])/iu.test(command),
    message:
      "force-push is prohibited; use a normal push or --force-with-lease.",
  },
  {
    reasonCode: "DB_DESTRUCTIVE",
    decision: "ask",
    test: (command) =>
      /\bprisma\s+migrate\s+reset\b|\bDROP\s+DATABASE\b|\bdropdb\b|\b(?:pnpm\s+)?db:reset\b/iu.test(
        command,
      ),
    message:
      "direct destructive database commands are prohibited; use repository wrappers with explicit human authorization.",
  },
  {
    reasonCode: "CREDENTIAL_ACCESS",
    decision: "deny",
    test: (command) =>
      /\b(?:Get-Content|Set-Content|Add-Content|Out-File|Remove-Item|Copy-Item|Move-Item|cat|type|less|more)\b[^\n]*(?:\.env(?:\.[\w-]+)?|\.pem|\.p12|\.pfx|\.key|credentials\.json|secrets\.json)/iu.test(
        stripTemplateNames(command),
      ),
    message: "credential file access is prohibited; use .env.example.",
  },
  {
    reasonCode: "CREDENTIAL_MENTION",
    decision: "ask",
    test: (command) =>
      /(?:^|[\s"'=])\.env(?:\.[A-Za-z0-9_-]+)?(?:[\s"'=]|$)/iu.test(
        stripTemplateNames(command),
      ),
    message:
      "command references .env — avoid reading, printing, or writing credential files; use .env.example.",
  },
  {
    reasonCode: "UNRESTRICTED_AUTONOMY",
    decision: "deny",
    test: (command) =>
      /--dangerously-skip-permissions|--yolo\b|\bdroid\b[^\n]*--auto\s+(?:high|max)\b/iu.test(
        command,
      ),
    message: "unrestricted autonomous flags are prohibited.",
  },
];

function matchesAny(candidate, patterns) {
  return patterns.some(
    (pattern) =>
      typeof pattern === "string" && path.matchesGlob(candidate, pattern),
  );
}

function isCredentialPath(candidate) {
  return (
    !matchesAny(candidate, CREDENTIAL_EXCEPTIONS) &&
    matchesAny(candidate, CREDENTIAL_PATTERNS)
  );
}

function allow(extra = {}) {
  return { decision: "allow", reasonCode: "OK", message: "", ...extra };
}

export function authorize(event, context = {}) {
  // Budget breaker first: an exhausted or tripped task stops everything.
  if (context.budget) {
    if (context.budget.stopped) {
      return {
        decision: "stop",
        reasonCode: "BUDGET_BREAKER",
        message: `budget circuit breaker tripped: ${context.budget.reason ?? "exhausted"}`,
      };
    }
  }

  if (event.type === "command") {
    for (const rule of COMMAND_RULES) {
      if (rule.test(event.command ?? "")) {
        return {
          decision: rule.decision,
          reasonCode: rule.reasonCode,
          message: rule.message,
        };
      }
    }
    return allow();
  }

  if (event.type === "read") {
    for (const target of event.paths ?? []) {
      if (isCredentialPath(target)) {
        return {
          decision: "deny",
          reasonCode: "CREDENTIAL_READ",
          message: `refusing to read credential file ${target}; use .env.example.`,
        };
      }
    }
    return allow();
  }

  if (event.type === "write") {
    const sensitivePaths = context.sensitivePaths ?? {
      patterns: [],
      verification_control_patterns: [],
    };
    for (const target of event.paths ?? []) {
      if (target.startsWith("../") || path.isAbsolute(target)) {
        return {
          decision: "deny",
          reasonCode: "OUTSIDE_REPOSITORY",
          message: `write target resolves outside the repository: ${target}`,
        };
      }
      if (isCredentialPath(target)) {
        return {
          decision: "deny",
          reasonCode: "CREDENTIAL_WRITE",
          message: `refusing to modify credential file ${target}.`,
        };
      }
    }
    if (context.contract) {
      const scopes = context.contract.write_scopes ?? [];
      for (const target of event.paths ?? []) {
        const inScope = scopes.some(
          (scope) =>
            scope.toLowerCase() === target.toLowerCase() ||
            (scope.endsWith("/") &&
              target.toLowerCase().startsWith(scope.toLowerCase())),
        );
        if (!inScope) {
          return {
            decision: "deny",
            reasonCode: "OUT_OF_SCOPE",
            message: `write target is outside the contracted write scopes: ${target}`,
          };
        }
      }
    }
    const verification = (event.paths ?? []).filter((target) =>
      matchesAny(target, sensitivePaths.verification_control_patterns ?? []),
    );
    const sensitive = (event.paths ?? []).filter((target) =>
      matchesAny(target, sensitivePaths.patterns ?? []),
    );
    if (verification.length > 0 || sensitive.length > 0) {
      const detail =
        verification.length > 0
          ? `Verification controls (minimum R2): ${verification.join(", ")}. Keep control changes separate from implementation or obtain designated integrity review.`
          : `Sensitive paths (minimum R2): ${sensitive.join(", ")}. Designated review is required.`;
      return allow({
        reasonCode:
          verification.length > 0 ? "VERIFICATION_R2" : "SENSITIVE_R2",
        additionalContext: `SAFRS ${detail}`,
      });
    }
    return allow();
  }

  return {
    decision: "deny",
    reasonCode: "UNKNOWN_EVENT",
    message: `unknown guard event type: ${String(event.type)}`,
  };
}

export const guardInternals = {
  CREDENTIAL_PATTERNS,
  CREDENTIAL_EXCEPTIONS,
  isCredentialPath,
};
