#!/usr/bin/env node
/**
 * Capsule-local npm wrapper. project.contract.json uses plain `node` argv so it
 * stays portable: spawning "npm" directly fails on Windows, where npm is a .cmd
 * file. The shell resolves it.
 *
 *   node scripts/npm.mjs ci --workspaces=false
 *   node scripts/npm.mjs run build
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync("npm", process.argv.slice(2), {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
