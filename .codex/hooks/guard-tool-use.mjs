#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
const CREDENTIAL_EXCEPTIONS = [".env.example", "**/.env.example"];

function deny(reason) {
  console.error(`SAFRS guard: ${reason}`);
  process.exit(2);
}

function matchesAny(candidate, patterns) {
  return patterns.some(
    (pattern) =>
      typeof pattern === "string" && path.matchesGlob(candidate, pattern),
  );
}

function patchPaths(command) {
  return [
    ...command.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gmu),
  ].map((match) => match[1].trim().replaceAll("\\", "/"));
}

function repositoryRelative(candidate, root) {
  const relative = path.relative(root, path.resolve(root, candidate));
  return relative.split(path.sep).join("/");
}

function credentialPath(candidate) {
  return (
    !matchesAny(candidate, CREDENTIAL_EXCEPTIONS) &&
    matchesAny(candidate, CREDENTIAL_PATTERNS)
  );
}

function findRepositoryRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

function loadRegistry(root) {
  try {
    return JSON.parse(
      readFileSync(path.join(root, ".safrs/sensitive-paths.json"), "utf8"),
    );
  } catch {
    return { patterns: [], verification_control_patterns: [] };
  }
}

let payload;
try {
  const raw = readFileSync(0, "utf8").trim();
  payload = raw ? JSON.parse(raw) : {};
} catch (error) {
  console.error(
    `SAFRS guard: hook payload could not be parsed (${error.message}).`,
  );
  process.exit(0);
}

const toolName = String(payload.tool_name ?? "");
const command = String(payload.tool_input?.command ?? "");
const root = findRepositoryRoot(String(payload.cwd ?? process.cwd()));

if (toolName === "Bash") {
  if (/\bgit\s+push\s+[^\n]*--force(?!-with-lease)\b/iu.test(command)) {
    deny("force-push is prohibited; use a normal push or --force-with-lease.");
  }
  if (/\bgit\s+push\s+[^\n]*(?<![\w-])-f(?![\w-])/iu.test(command)) {
    deny("force-push (-f) is prohibited.");
  }
  if (
    /\bprisma\s+migrate\s+reset\b|\bDROP\s+DATABASE\b|\bdropdb\b/iu.test(
      command,
    )
  ) {
    deny(
      "direct destructive database commands are prohibited; use repository wrappers.",
    );
  }
  if (
    /\b(?:Get-Content|Set-Content|Add-Content|Out-File|Remove-Item|Copy-Item|Move-Item|cat|type|less|more)\b[^\n]*(?:\.env(?:\.[\w-]+)?|\.pem|\.p12|\.pfx|\.key|credentials\.json|secrets\.json)/iu.test(
      command,
    )
  ) {
    deny("credential file access is prohibited; use .env.example.");
  }
  process.exit(0);
}

if (toolName !== "apply_patch") process.exit(0);

const targets = patchPaths(command).map((target) =>
  repositoryRelative(target, root),
);
for (const target of targets) {
  if (target.startsWith("../")) {
    deny(`write target resolves outside the repository: ${target}`);
  }
  if (credentialPath(target)) {
    deny(`refusing to modify credential file ${target}.`);
  }
}

const registry = loadRegistry(root);
const verification = targets.filter((target) =>
  matchesAny(target, registry.verification_control_patterns ?? []),
);
const sensitive = targets.filter((target) =>
  matchesAny(target, registry.patterns ?? []),
);

if (verification.length > 0 || sensitive.length > 0) {
  const detail =
    verification.length > 0
      ? `Verification controls (minimum R2): ${verification.join(", ")}. Keep control changes separate from implementation or obtain designated integrity review.`
      : `Sensitive paths (minimum R2): ${sensitive.join(", ")}. Designated review is required.`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `SAFRS ${detail}`,
      },
    }),
  );
}
