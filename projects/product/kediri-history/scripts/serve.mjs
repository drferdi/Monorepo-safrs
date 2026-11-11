#!/usr/bin/env node
/**
 * Perintah `run` pada project.contract.json.
 *
 * Kediri melayani halaman publik server-first dan (mulai Phase 2) admin
 * Payload, jadi artefaknya bukan static export: yang dijalankan adalah server
 * produksi Next pada 127.0.0.1:4320 — port yang sama dengan probe smoke di
 * project.contract.json.
 *
 * Prasyarat: `pnpm run build` sudah menghasilkan apps/web/.next.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const APP = new URL("../apps/web/", import.meta.url);
const HOST = "127.0.0.1";
const PORT = "4320";

if (!existsSync(new URL(".next/", APP))) {
  console.error(
    "[serve] apps/web/.next tidak ada — jalankan `pnpm run build` lebih dulu.",
  );
  process.exit(1);
}

console.log(`[serve] kediri-history: http://${HOST}:${PORT}`);
const result = spawnSync(
  "pnpm",
  ["--filter", "@kediri/web", "exec", "next", "start", "-H", HOST, "-p", PORT],
  { cwd: ROOT, stdio: "inherit", shell: true },
);
process.exit(result.status ?? 1);
