import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "build"], { cwd: root, stdio: "inherit", windowsHide: true });
if (result.error || result.status !== 0) process.exit(result.status || 1);
const output = resolve(root, ".next/standalone");
mkdirSync(resolve(output, "scripts"), { recursive: true });
cpSync(resolve(root, "mira"), resolve(output, "mira"), { recursive: true, filter: file => !/[\\/](?:__pycache__|\.pytest_cache)(?:[\\/]|$)/.test(file) });
for (const name of ["run-system.mjs", "mira-runtime.mjs", "mira-profile.json", "install-mira.mjs"]) cpSync(resolve(root, "scripts", name), resolve(output, "scripts", name));
// TheOracle: the verified index and the pinned local embedding model the retriever loads from cwd.
// The public code repository has no index (2026-10-19); that build answers "Database TheOracle belum terpasang".
for (const name of ["index", "model"]) {
  if (name === "index" && !existsSync(resolve(root, "theoracle", "index", "manifest.json"))) { console.warn("Sentrapedia: database TheOracle tidak terpasang; build ini tidak dapat menjalankan analisis."); continue; }
  cpSync(resolve(root, "theoracle", name), resolve(output, "theoracle", name), { recursive: true, filter: file => !/vectors\.partial\.|\.partial$/.test(file) });
}
cpSync(resolve(root, ".next/static"), resolve(output, ".next/static"), { recursive: true });
if (existsSync(resolve(root, "public"))) cpSync(resolve(root, "public"), resolve(output, "public"), { recursive: true });
console.log("Sentrapedia: standalone output mencakup engine MIRA, index + model TheOracle, dan unified launcher.");
