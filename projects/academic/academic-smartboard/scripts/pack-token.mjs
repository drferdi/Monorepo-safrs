#!/usr/bin/env node
/**
 * Repack @sentra/token menjadi tarball vendor/ setelah source token berubah.
 * Jalankan dari capsule root: `pnpm run token:pack`, lalu `pnpm install`.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(
  "pnpm",
  ["pack", "--pack-destination", resolve(ROOT, "vendor")],
  { cwd: resolve(ROOT, "packages/token"), stdio: "inherit", shell: true },
);
process.exit(result.status ?? 1);
