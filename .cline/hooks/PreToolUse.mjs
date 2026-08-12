#!/usr/bin/env node
// SAFRS PreToolUse hook (Node.js port of PreToolUse.sh).
// Blocks sensitive-path edits and lockfile edits.
// Reads a JSON event from stdin, prints '{}' to allow, or a cancel payload to block.
// Pure Node.js — no bash, no python3 — so no console-window flash on Windows.

import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

const MUTATE = new Set([
  "write_to_file",
  "edit_file",
  "multi_edit",
  "apply_diff",
  "insert_content",
  "insert_content_multiple",
  "renaming",
  "delete_file",
]);

const LOCKFILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
]);

const ENV_FILE_RE = /^\.env($|\.)/;
const ENV_EXAMPLE_PREFIX = ".env.example";

function isEnvFile(p) {
  const base = String(p).replace(/\\/g, "/").split("/").pop();
  return ENV_FILE_RE.test(base) && !base.startsWith(ENV_EXAMPLE_PREFIX);
}

function getPath(input) {
  for (const k of ["file_path", "filePath", "path", "target_path", "rename"]) {
    if (input[k]) return String(input[k]);
  }
  return "";
}

function block(message) {
  emit({ cancel: true, errorMessage: message });
  process.exit(0);
}

let event = {};
try {
  event = JSON.parse(readStdin() || "{}");
} catch {
  event = {};
}

const toolCall = event.tool_call || {};
const tool = toolCall.name || "";
const input = toolCall.input || {};
const file = getPath(input);
const cmd = String(input.command || "");

// 0) Live .env files are off-limits for BOTH reads and writes.
if (MUTATE.has(tool) && isEnvFile(file)) {
  block(
    "SAFRS: .env is off-limits to agents (live credentials). Chief authorization required.",
  );
}
if (tool === "read_files") {
  const files = Array.isArray(input.files) ? input.files : [];
  if (files.some((f) => isEnvFile(f))) {
    block(
      "SAFRS: .env is off-limits to agents (live credentials). Chief authorization required.",
    );
  }
}

// Guard shell commands that touch .env or reset the DB.
if (tool === "run_commands") {
  if (/\.env|db:reset|drop\s+database/i.test(cmd)) {
    block(
      "SAFRS: guarded shell command blocked (.env / db:reset) requires Chief authorization.",
    );
  }
  emit({});
  process.exit(0);
}

if (!MUTATE.has(tool)) {
  emit({});
  process.exit(0);
}

if (!file) {
  emit({});
  process.exit(0);
}

const norm = file.replace(/\\/g, "/");
const base = norm.split("/").pop();

// 2) KB directory: reads allowed, edits blocked.
if (/(^|\/)\.agents\/knowledge\//.test(norm)) {
  block("SAFRS: .agents/knowledge/ edits require Chief approval.");
}

// 3) Lockfiles: never hand-edited; regenerate with pnpm.
if (LOCKFILES.has(base)) {
  block("SAFRS: lockfiles must be regenerated with pnpm, not hand-edited.");
}

emit({});
