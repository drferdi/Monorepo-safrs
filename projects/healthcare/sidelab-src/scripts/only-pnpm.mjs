#!/usr/bin/env node
// preinstall: hapus lockfile npm/yarn yang nyasar dan tolak installer selain pnpm.
import { rmSync } from "node:fs";

for (const stray of ["package-lock.json", "yarn.lock"]) rmSync(new URL(`../${stray}`, import.meta.url), { force: true });
if (!(process.env.npm_config_user_agent ?? "").startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
