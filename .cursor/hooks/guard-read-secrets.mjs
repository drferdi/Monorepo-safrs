#!/usr/bin/env node
/**
 * Cursor beforeReadFile — deny credential-shaped paths from Agent context.
 * Complements `.cursorignore`; not a substitute for vaults.
 */
import { readFileSync } from "node:fs";
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

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function matchesAny(candidate, patterns) {
  return patterns.some(
    (pattern) =>
      typeof pattern === "string" && path.matchesGlob(candidate, pattern),
  );
}

function respond(permission, userMessage) {
  const body = { permission };
  if (userMessage) {
    body.user_message = userMessage;
  }
  process.stdout.write(JSON.stringify(body));
  process.exit(0);
}

const payload = readPayload();
const target = payload?.file_path ?? null;

if (!target) {
  respond("allow");
}

const relative = path
  .relative(process.cwd(), path.resolve(process.cwd(), target))
  .split(path.sep)
  .join("/");

if (
  !matchesAny(relative, CREDENTIAL_EXCEPTIONS) &&
  matchesAny(relative, CREDENTIAL_PATTERNS)
) {
  respond(
    "deny",
    `Blocked read of credential-shaped path "${relative}". Use .env.example and ask the human for secrets.`,
  );
}

respond("allow");
