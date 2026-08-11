#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BIOME_RELATIVE = "node_modules/@biomejs/biome/bin/biome";
const FORMATTABLE = new Set([
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
const EXCLUDED = [
  "node_modules/",
  ".next/",
  ".turbo/",
  "packages/database/src/generated/",
  "packages/database/prisma/generated/",
];

export function extractEditedPaths(payload) {
  const input = payload?.tool_input ?? {};
  const values =
    payload?.tool_name === "apply_patch"
      ? [
          ...String(input.command ?? "").matchAll(
            /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gmu,
          ),
        ].map((match) => match[1].trim())
      : [input.file_path ?? input.path].filter(Boolean);
  return [
    ...new Set(values.map((value) => String(value).replaceAll("\\", "/"))),
  ];
}

export function shouldFormat(relative) {
  const normalized = relative.replaceAll("\\", "/");
  return (
    !normalized.startsWith("../") &&
    !EXCLUDED.some((prefix) => normalized.includes(prefix)) &&
    FORMATTABLE.has(path.extname(normalized).toLowerCase())
  );
}

export function findRepositoryRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error(
      `Codex formatter: hook payload could not be parsed (${error.message}).`,
    );
    return {};
  }
}

export function main() {
  const payload = readPayload();
  const cwd = findRepositoryRoot(String(payload.cwd ?? process.cwd()));
  const biomeBin = path.join(cwd, BIOME_RELATIVE);
  if (!existsSync(biomeBin)) return;

  for (const target of extractEditedPaths(payload)) {
    const absolute = path.resolve(cwd, target);
    const relative = path.relative(cwd, absolute).split(path.sep).join("/");
    if (!existsSync(absolute) || !shouldFormat(relative)) continue;
    const result = spawnSync(
      process.execPath,
      [biomeBin, "check", "--write", "--no-errors-on-unmatched", relative],
      { cwd, encoding: "utf8" },
    );
    if (result.status !== 0) {
      const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
      console.error(`Biome could not fully format ${relative}:\n${detail}`);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}
