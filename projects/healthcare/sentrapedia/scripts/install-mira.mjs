import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lockDigest, pythonPath } from "./mira-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
function run(program, args) {
  const result = spawnSync(program, args, { cwd: root, stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Instalasi MIRA gagal pada ${program}: ${result.error?.code || result.status}`);
}
try {
  const interpreter = process.platform === "win32" ? "python" : "python3";
  run(interpreter, ["-c", "import sys; assert sys.version_info >= (3, 11), 'Python 3.11+ is required'"]);
  run(interpreter, ["-m", "venv", resolve(root, ".runtime/mira/venv")]);
  const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
  run(pythonPath(root), ["-I", "-m", "pip", "--disable-pip-version-check", "install", "--requirement", resolve(root, production ? "mira/requirements.lock" : "mira/requirements-test.lock")]);
  run(pythonPath(root), ["-I", "-m", "pip", "check"]);
  mkdirSync(resolve(root, ".runtime/mira"), { recursive: true });
  writeFileSync(resolve(root, ".runtime/mira/installed.json"), JSON.stringify({ lockSha256: lockDigest(root), testDependencies: !production }) + "\n");
  console.log("Sentrapedia: engine MIRA terpasang di dalam capsule.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
