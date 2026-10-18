// Runs pnpm through the platform shell so argv-only contracts work on Windows (pnpm.cmd).
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", process.argv.slice(2), {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
