#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard (Edit / Write / NotebookEdit).
 *
 * Blocks edits to credential files and warns when a write touches a path that
 * `.safrs/sensitive-paths.json` classifies as R2 (designated review required).
 *
 * This hook is an adapter, not a second policy tree: the pattern list is read
 * from the SAFRS registry, and the credential list mirrors `.gitignore` plus
 * root `AGENTS.md` rule 4 (never expose or persist production credentials).
 *
 * Contract: stdin receives the hook payload as JSON; exit code 2 blocks the
 * tool call and shows stderr to the agent, exit code 0 allows it.
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

const REGISTRY_PATH = ".safrs/sensitive-paths.json";

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(
      `SAFRS guard: hook payload could not be parsed (${error.message}); path classification was skipped.`,
    );
    return null;
  }
}

function targetPath(payload) {
  const input = payload?.tool_input ?? {};
  return input.file_path ?? input.notebook_path ?? input.path ?? null;
}

function repositoryRelative(target) {
  const absolute = path.resolve(process.cwd(), target);
  const relative = path.relative(process.cwd(), absolute);
  return relative.split(path.sep).join("/");
}

function matchesAny(candidate, patterns) {
  return patterns.some(
    (pattern) =>
      typeof pattern === "string" && path.matchesGlob(candidate, pattern),
  );
}

function sensitivePatterns() {
  try {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    return {
      sensitive: registry.patterns ?? [],
      verification: registry.verification_control_patterns ?? [],
    };
  } catch {
    return { sensitive: [], verification: [] };
  }
}

const payload = readPayload();
const target = targetPath(payload);

if (!target) {
  process.exit(0);
}

const relative = repositoryRelative(target);
const outsideRepository = relative.startsWith("../");

if (
  !matchesAny(relative, CREDENTIAL_EXCEPTIONS) &&
  matchesAny(relative, CREDENTIAL_PATTERNS)
) {
  console.error(
    `SAFRS guard: refusing to modify credential file "${relative}".\n` +
      "Root AGENTS.md rule 4: never expose, request, print, persist, or transmit credentials.\n" +
      "Edit .env.example instead, and ask the human operator to apply real values manually.",
  );
  process.exit(2);
}

if (outsideRepository) {
  console.error(
    `SAFRS guard: "${relative}" resolves outside the repository. Confirm scope with the human operator before writing there.`,
  );
  process.exit(0);
}

const { sensitive, verification } = sensitivePatterns();

if (matchesAny(relative, verification)) {
  console.error(
    `SAFRS notice: "${relative}" is a verification/governance control (minimum R2).\n` +
      "Do not weaken it to make a task pass, and keep control changes out of the same change set as implementation changes.",
  );
  process.exit(0);
}

if (matchesAny(relative, sensitive)) {
  console.error(
    `SAFRS notice: "${relative}" is classified R2 by ${REGISTRY_PATH} — designated review required before merge.`,
  );
}

process.exit(0);
