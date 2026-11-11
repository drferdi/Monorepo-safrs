#!/usr/bin/env node
/**
 * Gate before a build leaves Chief's own machines (audit 2026-10-06): the bundle carries no static
 * credential. The production env is read the way Vite reads it; output names variables, never a
 * value. `--allow-dev-token` admits VITE_MIRA_DEV_TOKEN for Chief's private MIRA build (DECISIONS
 * 2026-10-03) until MIRA issues a per-session token.
 * Exit 0 = no credential in .output/chrome-mv3-dev.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SECRET_ENV = ["VITE_MIRA_DEV_TOKEN", "VITE_SENTRA_API_KEY"];
// Shorter values would match ordinary code; a real credential is far longer.
const MIN_SECRET_LENGTH = 8;

export function releaseFailures(env, files, { allowDevToken = false } = {}) {
  const failures = new Set();
  for (const name of SECRET_ENV) {
    if (allowDevToken && name === "VITE_MIRA_DEV_TOKEN") continue;
    const value = env[name]?.trim() ?? "";
    // The whole env object is inlined (diagnosis-v2.ts, hybrid-trajectory.ts), so a filled key
    // shows up by name even when today's env no longer has the value.
    const filledKey = new RegExp(`["']?${name}["']?\\s*:\\s*["'][^"']+["']`);
    for (const [file, content] of Object.entries(files)) {
      const hasValue = value.length >= MIN_SECRET_LENGTH && content.includes(value);
      if (hasValue || filledKey.test(content)) failures.add(`${name} tertanam di ${file}`);
    }
  }
  return [...failures];
}

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const out = join(root, ".output/chrome-mv3-dev");
  if (!existsSync(join(out, "manifest.json"))) {
    console.error("FAIL .output/chrome-mv3-dev/manifest.json tidak ada; jalankan build dulu.");
    process.exit(1);
  }
  const { loadEnv } = await import("vite");
  const env = loadEnv("production", root, ["VITE_", "SENTRA_"]);
  const files = {};
  for (const entry of readdirSync(out, { recursive: true })) {
    const file = String(entry);
    if (file.endsWith(".js")) files[file] = readFileSync(join(out, file), "utf8");
  }
  const failures = releaseFailures(env, files, {
    allowDevToken: process.argv.includes("--allow-dev-token"),
  });
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log(`Release check: no credential in ${Object.keys(files).length} bundle files.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
