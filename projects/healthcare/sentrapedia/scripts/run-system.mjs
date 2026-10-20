import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { engineEnvironment, engineReady, installedPython, model, nextRestart, preflightProvider, warmWorkspace } from "./aadi-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
// Launcher timings (milliseconds), named so they are read and changed in one place (tech-debt row 19).
const killTimeoutMs = 6000; // taskkill of a child tree on Windows
const killGraceMs = 1500; // time children get to exit before the launcher exits
// Restart backoff and the crash limit: nextRestart in aadi-runtime.mjs.
const engineReadyMs = 30000; // every start: how long /healthz may take to answer
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
let engineUrl;
async function waitReady(url) {
  const deadline = Date.now() + engineReadyMs;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(healthProbeMs) });
      if (response.ok && engineReady(await response.json())) return true;
    } catch { /* The child has not opened its socket yet. */ }
    await new Promise(done => setTimeout(done, healthPollMs));
  }
  return false;
}
// restart: the AADI engine is started again on the same port and token when it stops, so the workspace keeps working;
// the wait doubles from 2 s to 30 s and resets after a minute of running; five crashes in a row end the system.
// Any other child stopping ends the system.
function launch(program, args, environment, restart = false) {
  const started = Date.now();
  const command = process.platform === "win32" ? guardianPython : program;
  const argumentsList = process.platform === "win32" ? ["-I", resolve(root, "aadi/managed_child.py"), String(process.pid), program, ...args] : args;
  const child = spawn(command, argumentsList, { cwd: root, env: environment, stdio: "inherit", windowsHide: true, detached: process.platform !== "win32" });
  children.add(child);
  child.once("error", () => { console.error("Sentrapedia: proses internal gagal dimulai."); stop(1); });
  child.once("exit", code => {
    children.delete(child);
    if (stopping) return;
    if (restart) {
      const next = nextRestart(engineRestarts, Date.now() - started);
      engineRestarts = next.crashes;
      if (next.delayMs === null) {
        console.error(`Sentrapedia: engine AADI berhenti ${next.crashes} kali berturut-turut (kode terakhir ${code}); system ditutup. Periksa venv AADI dan GEMINI_API_KEY.`);
        stop(1);
        return;
      }
      console.error(`Sentrapedia: engine AADI berhenti (kode ${code}); dimulai ulang dalam ${next.delayMs / 1000} detik.`);
      setTimeout(() => {
        if (stopping) return;
        launch(program, args, environment, true);
        void waitReady(engineUrl).then(ready => { if (!ready && !stopping) console.error("Sentrapedia: engine AADI belum siap setelah dimulai ulang; analisis belum tersedia."); });
      }, next.delayMs);
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
    engineUrl = url;
    launch(python, ["-I", "-m", "uvicorn", "--factory", "service.app:create_app", "--app-dir", resolve(root, "aadi"), "--host", "127.0.0.1", "--port", String(port), "--no-access-log"], environment, true);
    if (!await waitReady(url)) throw new Error("Engine AADI lokal belum siap atau capability/profile tidak cocok.");
    if (!stopping) {
      const webEnv = { ...process.env, AADI_SERVICE_URL: url, AADI_SERVICE_TOKEN: token };
      const webPort = process.env.PORT || "3101";
      const host = process.env.SENTRAPEDIA_HOST || "127.0.0.1";
      console.log(`Sentrapedia: engine AADI siap (Gemini API langsung, ${model}); menjalankan workspace dalam satu lifecycle.`);
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
