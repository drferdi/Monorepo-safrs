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
for (const name of ["run-system.mjs", "mira-runtime.mjs", "install-mira.mjs"]) cpSync(resolve(root, "scripts", name), resolve(output, "scripts", name));
cpSync(resolve(root, ".next/static"), resolve(output, ".next/static"), { recursive: true });
if (existsSync(resolve(root, "public"))) cpSync(resolve(root, "public"), resolve(output, "public"), { recursive: true });
console.log("Sentrapedia: standalone output mencakup engine MIRA dan unified launcher.");
