#!/usr/bin/env node

// SAFRS PostToolUse hook (Node.js port of PostToolUse.sh).
// Auto-formats edited code files with Biome.
// Reads a JSON event from stdin; prints '{}' (PostToolUse supports a "context" field).
// Pure Node.js — no bash, no python3 — so no console-window flash on Windows.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const MUTATE = new Set([
  "write_to_file",
  "edit_file",
  "multi_edit",
  "apply_diff",
  "insert_content",
  "insert_content_multiple",
]);

const FORMATTABLE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
]);

let event = {};
try {
  event = JSON.parse(readStdin() || "{}");
} catch {
  event = {};
}

const toolCall = event.tool_call || {};
const tool = toolCall.name || "";
const input = toolCall.input || {};

let file = "";
if (MUTATE.has(tool)) {
  for (const k of ["file_path", "filePath", "path", "target_path"]) {
    if (input[k]) {
      const p = String(input[k]);
      const ext = p.slice(p.lastIndexOf(".")).toLowerCase();
      if (FORMATTABLE_EXT.has(ext)) {
        file = p;
      }
      break;
    }
  }
}

if (file && existsSync(file) && statSync(file).isFile()) {
  // stderr is for logs; stdout must remain valid JSON. Don't fail the hook on lint issues.
  try {
    execFileSync("pnpm", ["exec", "biome", "check", "--write", file], {
      stdio: "ignore",
      windowsHide: true,
      shell: true,
    });
  } catch {
    // Swallow lint/format errors — hook must not fail the tool flow.
  }
}

process.stdout.write("{}\n");
