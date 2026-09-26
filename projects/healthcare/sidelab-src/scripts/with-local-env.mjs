#!/usr/bin/env node
/**
 * Menjalankan pnpm dengan PORT dan BASE_PATH lokal bila belum di-set. Konfigurasi
 * Vite di artifacts/* berasal dari Replit, yang selalu mengisi kedua variabel itu;
 * tanpa default ini build dan preview di luar Replit gagal.
 *
 *   node scripts/with-local-env.mjs run build
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env, PORT: process.env.PORT ?? "4345", BASE_PATH: process.env.BASE_PATH ?? "/" };
const result = spawnSync("pnpm", process.argv.slice(2), { cwd: ROOT, stdio: "inherit", shell: true, env });
process.exit(result.status ?? 1);
