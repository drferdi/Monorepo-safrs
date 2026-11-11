#!/usr/bin/env node
/**
 * Pembungkus CLI Payload.
 *
 * Alasannya bukan kenyamanan: pemeriksa independensi capsule memecah nilai
 * skrip berdasarkan spasi dan menguji setiap token sebagai calon path. Token
 * seperti `generate:types` cocok dengan pola skema URI dan dilaporkan sebagai
 * path di luar capsule. Perintah ber-titik-dua karena itu hidup DI DALAM berkas
 * ini, bukan di package.json, sehingga kontrak standalone tetap dapat
 * diverifikasi tanpa melemahkan satu pun gerbang.
 *
 *   node scripts/payload-cli.mjs migrate
 *   node scripts/payload-cli.mjs migrate-create <name>
 *   node scripts/payload-cli.mjs types
 *   node scripts/payload-cli.mjs seed
 *   node scripts/payload-cli.mjs verify-production
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const COMMANDS = {
  migrate: ["migrate"],
  "migrate-create": ["migrate:create"],
  types: ["generate:types"],
  importmap: ["generate:importmap"],
  seed: ["run", "src/scripts/seed.ts"],
  "verify-production": ["run", "src/scripts/verify-production.ts"],
};

const [name, ...rest] = process.argv.slice(2);
const mapped = COMMANDS[name];

if (!mapped) {
  console.error(
    `Unknown command "${name ?? ""}". Available: ${Object.keys(COMMANDS).join(", ")}`,
  );
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@kediri/web", "exec", "payload", ...mapped, ...rest],
  { cwd: ROOT, stdio: "inherit", shell: true },
);
process.exit(result.status ?? 1);
