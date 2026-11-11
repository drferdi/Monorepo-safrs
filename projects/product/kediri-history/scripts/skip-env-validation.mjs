#!/usr/bin/env node
/**
 * Menjalankan satu skrip capsule dengan SKIP_ENV_VALIDATION=1.
 *
 * Hanya untuk bukti standalone (build dan run pada project.contract.json):
 * ekstraksi tidak punya rahasia produksi, sedangkan apps/web/src/env.ts
 * memvalidasi DATABASE_URL dan PAYLOAD_SECRET saat diimpor. Keputusan Chief
 * 2026-09-25, dicatat di .agents/DECISIONS.md. Deploy produksi tidak memakai
 * skrip ini, jadi validasi tetap berlaku di sana.
 *
 *   node scripts/skip-env-validation.mjs scripts/pnpm.mjs run build
 *   node scripts/skip-env-validation.mjs scripts/serve.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error("[skip-env-validation] skrip target wajib diisi.");
  process.exit(2);
}
const result = spawnSync(process.execPath, [script, ...args], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, SKIP_ENV_VALIDATION: "1" },
});
process.exit(result.status ?? 1);
