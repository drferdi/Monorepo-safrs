#!/usr/bin/env node
/**
 * Install capsule sidelab-src: workspace pnpm (artifacts/*, lib/*) dengan lockfile
 * capsule, lalu virtualenv Python untuk sidelab-engine di sidelab-engine/.venv
 * dari sidelab-engine/requirements.txt.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const ENGINE = fileURLToPath(new URL("../sidelab-engine/", import.meta.url));
const VENV_PYTHON = join(ENGINE, ".venv", ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]));

function step(command, args, cwd, shell = process.platform === "win32") {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

step("pnpm", ["install", "--frozen-lockfile"], ROOT);
if (!existsSync(VENV_PYTHON)) {
  step(process.platform === "win32" ? "python" : "python3", ["-m", "venv", ".venv"], ENGINE);
}
step(VENV_PYTHON, ["-m", "pip", "install", "--quiet", "-r", "requirements.txt"], ENGINE, false);
