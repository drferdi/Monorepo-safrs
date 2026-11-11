// Runs pnpm through the platform shell so argv-only contracts work on Windows (pnpm.cmd).
// Variables missing from the environment fall back to the safe local values in .env.example.
import { spawnSync } from "node:child_process";

process.loadEnvFile(new URL("../.env.example", import.meta.url));

const result = spawnSync("pnpm", process.argv.slice(2), {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
