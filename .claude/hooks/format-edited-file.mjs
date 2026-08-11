#!/usr/bin/env node

// Claude Code PostToolUse formatter (Edit / Write).
//
// Runs the repository Biome configuration on the file that was just written so
// format drift is fixed at edit time instead of at `.husky/pre-commit` or in CI.
//
// Never blocks: formatting problems are reported to stderr and the tool call
// still succeeds. Biome is invoked through its local binary in `node_modules`
// so the hook does not depend on shell resolution of `pnpm exec`.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const BIOME_BIN = "node_modules/@biomejs/biome/bin/biome";

const FORMATTABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".css",
]);

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const payload = readPayload();
const target = payload?.tool_input?.file_path;

if (!target) {
  process.exit(0);
}

const absolute = path.resolve(process.cwd(), target);
const relative = path
  .relative(process.cwd(), absolute)
  .split(path.sep)
  .join("/");

if (relative.startsWith("../") || !existsSync(absolute)) {
  process.exit(0);
}

if (!FORMATTABLE_EXTENSIONS.has(path.extname(absolute).toLowerCase())) {
  process.exit(0);
}

if (!existsSync(BIOME_BIN)) {
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [BIOME_BIN, "check", "--write", "--no-errors-on-unmatched", relative],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  console.error(
    `Biome reported issues in "${relative}" that it could not fix automatically:\n${detail}`,
  );
}

process.exit(0);
