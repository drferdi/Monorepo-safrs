#!/usr/bin/env node
/**
 * Menjalankan seluruh suite pytest sidelab-engine (termasuk tests/clinical) dengan
 * konfigurasi proyek sendiri (pyproject.toml, termasuk batas coverage 80%).
 * Tes bertanda `live` dan `performance` butuh kredensial LLM sungguhan dan tidak
 * dijalankan di sini.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = fileURLToPath(new URL("../sidelab-engine/", import.meta.url));
const VENV_PYTHON = join(ENGINE, ".venv", ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]));
const result = spawnSync(
  VENV_PYTHON,
  ["-m", "pytest", "-m", "not live and not performance", "-q", "-p", "no:cacheprovider"],
  { cwd: ENGINE, stdio: "inherit" },
);
process.exit(result.status ?? 1);
