#!/usr/bin/env node
/**
 * Cursor afterFileEdit / afterTabFileEdit — Biome format+lint write on the edited file.
 * Never blocks the edit. Mirrors `.claude/hooks/format-edited-file.mjs` for Cursor payloads.
 */
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
const target =
  payload?.file_path ??
  payload?.tool_input?.file_path ??
  payload?.tool_input?.path ??
  null;

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

if (
  relative.includes("node_modules/") ||
  relative.includes(".next/") ||
  relative.includes("packages/database/src/generated/") ||
  relative.includes("packages/database/prisma/generated/")
) {
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
