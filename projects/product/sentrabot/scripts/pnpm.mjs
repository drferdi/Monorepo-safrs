#!/usr/bin/env node
/**
 * Capsule-local pnpm launcher for project.contract.json. The contract uses plain
 * `node` argv so it stays portable: spawning "pnpm" directly fails on Windows
 * when pnpm is installed as a .cmd shim.
 *
 *   node scripts/pnpm.mjs install --frozen-lockfile
 *   node scripts/pnpm.mjs run build
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync("pnpm", process.argv.slice(2), {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
