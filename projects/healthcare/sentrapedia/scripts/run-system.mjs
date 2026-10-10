import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { engineEnvironment, engineReady, installedPython, preflightProvider } from "./mira-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
const children = new Set();
let stopping = false;
let guardianPython;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore", timeout: 6000 });
    else {
      try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") console.error("Child shutdown failed."); }
    }
  }
  // Allow graceful group shutdown, then kill only our groups if needed.
  setTimeout(() => {
    if (process.platform !== "win32") for (const child of children) {
      try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") console.error("Child cleanup failed."); }
    }
    process.exit(code);
  }, 1500);
}
function launch(program, args, environment) {
  const command = process.platform === "win32" ? guardianPython : program;
  const argumentsList = process.platform === "win32" ? ["-I", resolve(root, "mira/managed_child.py"), String(process.pid), program, ...args] : args;
  const child = spawn(command, argumentsList, { cwd: root, env: environment, stdio: "inherit", windowsHide: true, detached: process.platform !== "win32" });
  children.add(child);
  child.once("error", () => { console.error("Sentrapedia: proses internal gagal dimulai."); stop(1); });
  child.once("exit", code => { if (!stopping) { console.error("Sentrapedia: proses internal berhenti; menutup seluruh system."); stop(code || 1); } });
  return child;
}
async function freePort() {
  const server = createServer();
  await new Promise((done, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", done); });
  const port = server.address().port;
  await new Promise((done, fail) => server.close(error => error ? fail(error) : done()));
  return port;
}
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
if (process.platform !== "win32") process.once("SIGHUP", () => stop(0));
try {
  if (!["dev", "start", "standalone", "check"].includes(mode)) throw new Error("Gunakan dev, start, standalone, atau check.");
  if (existsSync(resolve(root, ".env.local"))) process.loadEnvFile(resolve(root, ".env.local"));
  const python = installedPython(root);
  guardianPython = python;
  const token = randomBytes(32).toString("hex");
  const environment = engineEnvironment(root, process.env, token);
  await preflightProvider();
  if (mode === "check") {
    console.log("PASS: engine lokal, dependency lock, dan provider key tersedia. Tidak ada inference.");
  } else {
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    launch(python, ["-I", "-m", "uvicorn", "--factory", "service.app:create_app", "--app-dir", resolve(root, "mira"), "--host", "127.0.0.1", "--port", String(port), "--no-access-log"], environment);
    const deadline = Date.now() + 30000;
    let ready = false;
    while (!stopping && Date.now() < deadline) {
      try {
        const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(1000) });
        ready = response.ok && engineReady(await response.json());
      } catch { /* The child has not opened its socket yet. */ }
      if (ready) break;
      await new Promise(done => setTimeout(done, 100));
    }
    if (!ready) throw new Error("Engine MIRA lokal belum siap atau capability/profile tidak cocok.");
    if (!stopping) {
      const webEnv = { ...process.env, MIRA_SERVICE_URL: url, MIRA_SERVICE_TOKEN: token };
      const webPort = process.env.PORT || "3101";
      const host = process.env.SENTRAPEDIA_HOST || "127.0.0.1";
      console.log("Sentrapedia: engine MIRA siap; menjalankan workspace dalam satu lifecycle.");
      if (mode === "standalone") launch(process.execPath, [resolve(root, "server.js")], webEnv);
      else launch(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), mode, "--hostname", host, "--port", webPort], webEnv);
    }
  }
} catch (error) {
  console.error(error.message);
  if (children.size) stop(1);
  else process.exitCode = 1;
}
