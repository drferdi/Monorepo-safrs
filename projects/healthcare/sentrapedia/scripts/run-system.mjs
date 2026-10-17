import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { engineEnvironment, engineReady, installedPython, model, preflightProvider, warmWorkspace } from "./mira-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
// Launcher timings (milliseconds), named so they are read and changed in one place (tech-debt row 19).
const killTimeoutMs = 6000; // taskkill of a child tree on Windows
const killGraceMs = 1500; // time children get to exit before the launcher exits
const restartResetMs = 60000; // an engine that ran this long restarts with the shortest backoff again
const restartBaseMs = 1000; // restart delay is restartBaseMs * 2^n, n counting quick crashes
const restartMaxMs = 30000; // longest restart delay
const engineReadyMs = 30000; // first start: how long /healthz may take to answer
const healthProbeMs = 1000; // timeout of one /healthz probe
const healthPollMs = 100; // pause between /healthz probes
const mode = process.argv[2];
const children = new Set();
let stopping = false;
let guardianPython;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore", timeout: killTimeoutMs });
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
  }, killGraceMs);
}
let engineRestarts = 0;
// restart: the MIRA engine is started again on the same port and token when it stops, so the workspace keeps working;
// the wait doubles from 2 s to 30 s and resets after a minute of running. Any other child stopping ends the system.
function launch(program, args, environment, restart = false) {
  const started = Date.now();
  const command = process.platform === "win32" ? guardianPython : program;
  const argumentsList = process.platform === "win32" ? ["-I", resolve(root, "mira/managed_child.py"), String(process.pid), program, ...args] : args;
  const child = spawn(command, argumentsList, { cwd: root, env: environment, stdio: "inherit", windowsHide: true, detached: process.platform !== "win32" });
  children.add(child);
  child.once("error", () => { console.error("Sentrapedia: proses internal gagal dimulai."); stop(1); });
  child.once("exit", code => {
    children.delete(child);
    if (stopping) return;
    if (restart) {
      engineRestarts = Date.now() - started > restartResetMs ? 1 : engineRestarts + 1;
      const delay = Math.min(restartMaxMs, restartBaseMs * 2 ** engineRestarts);
      console.error(`Sentrapedia: engine MIRA berhenti (kode ${code}); dimulai ulang dalam ${delay / 1000} detik.`);
      setTimeout(() => { if (!stopping) launch(program, args, environment, true); }, delay);
      return;
    }
    console.error("Sentrapedia: proses internal berhenti; menutup seluruh system.");
    stop(code || 1);
  });
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
    launch(python, ["-I", "-m", "uvicorn", "--factory", "service.app:create_app", "--app-dir", resolve(root, "mira"), "--host", "127.0.0.1", "--port", String(port), "--no-access-log"], environment, true);
    const deadline = Date.now() + engineReadyMs;
    let ready = false;
    while (!stopping && Date.now() < deadline) {
      try {
        const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(healthProbeMs) });
        ready = response.ok && engineReady(await response.json());
      } catch { /* The child has not opened its socket yet. */ }
      if (ready) break;
      await new Promise(done => setTimeout(done, healthPollMs));
    }
    if (!ready) throw new Error("Engine MIRA lokal belum siap atau capability/profile tidak cocok.");
    if (!stopping) {
      const webEnv = { ...process.env, MIRA_SERVICE_URL: url, MIRA_SERVICE_TOKEN: token };
      const webPort = process.env.PORT || "3101";
      const host = process.env.SENTRAPEDIA_HOST || "127.0.0.1";
      console.log(`Sentrapedia: engine MIRA siap (Gemini API langsung, ${model}); menjalankan workspace dalam satu lifecycle.`);
      if (mode === "standalone") launch(process.execPath, [resolve(root, "server.js")], webEnv);
      else launch(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), mode, "--hostname", host, "--port", webPort], webEnv);
      void warmWorkspace(`http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${webPort}`).then(warmed => {
        if (!stopping) console.log(warmed ? "Sentrapedia: TheOracle mulai dimuat di latar sebelum kasus pertama." : "Sentrapedia: workspace belum menjawab; TheOracle dimuat saat kasus pertama.");
      });
    }
  }
} catch (error) {
  console.error(error.message);
  if (children.size) stop(1);
  else process.exitCode = 1;
}
