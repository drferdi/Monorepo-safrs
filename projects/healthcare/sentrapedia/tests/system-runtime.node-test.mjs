import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { engineEnvironment, engineReady, model, pythonPath } from "../scripts/mira-runtime.mjs";

test("engine uses capsule runtime and preserves approved profile despite inherited external config", () => {
  const root = resolve("test-capsule");
  const env = engineEnvironment(root, { OPENROUTER_API_KEY: "fixture-only", PYTHONPATH: "external", MIRA_AUDIT_DIR: "external", MIRA_DEV_TOKEN: "old", MIRA_DATA_POLICY: "openrouter-zdr", MIRA_PLAN_MODEL: "other" }, "new-token");
  assert.equal(env.PYTHONPATH, "");
  assert.equal(env.MIRA_DEV_TOKEN, "new-token");
  assert.equal(env.MIRA_DATA_POLICY, "synthetic-only");
  assert.equal(env.MIRA_PLAN_MODEL, model);
  assert.equal(env.MIRA_ASSESS_MODEL, model);
  assert.equal(env.MIRA_FAST_THERAPY, "true");
  assert.equal(env.MIRA_DAILY_BUDGET_USD, "5");
  assert.equal(env.MIRA_AUDIT_DIR, resolve(root, ".runtime/mira-deepseek/audit"));
  assert.equal(pythonPath(root, "win32"), resolve(root, ".runtime/mira/venv/Scripts/python.exe"));
  assert.equal(pythonPath(root, "linux"), resolve(root, ".runtime/mira/venv/bin/python"));
});

test("startup requires a provider key without exposing values", () => {
  assert.throws(() => engineEnvironment(".", {}, "token"), /OPENROUTER_API_KEY/);
  assert.throws(() => engineEnvironment(".", { OPENROUTER_API_KEY: " " }, "token"), /OPENROUTER_API_KEY/);
});

test("workspace waits for grounded matching engine rather than old separate services", () => {
  const health = { status: "ok", contractVersion: "1", capabilities: ["oracle-grounding-v1"], version: `mira-service/0.1.0+contract=1+provider=openrouter+data=synthetic-only+plan=${model}+assess=${model}+experimental+ddx=provisional+assessment=fast+therapy=fast` };
  assert.equal(engineReady(health), true);
  for (const changed of [{ capabilities: [] }, { contractVersion: "2" }, { status: "unavailable" }, { version: health.version.replace(model, "other") }, { version: health.version.replace("+therapy=fast", "") }]) assert.equal(engineReady({ ...health, ...changed }), false);
});

test("Windows job closes child and its descendant even when guardian is forcibly killed", { skip: process.platform !== "win32", timeout: 15000 }, async () => {
  const descendant = "const http=require('node:http');http.createServer((q,r)=>r.end('child')).listen(0,'127.0.0.1',function(){console.log('descendant:'+this.address().port)});";
  const parent = `const {spawn}=require('node:child_process');const http=require('node:http');spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'inherit',windowsHide:true});http.createServer((q,r)=>r.end('parent')).listen(0,'127.0.0.1',function(){console.log('parent:'+this.address().port)});`;
  const guardian = spawn(pythonPath(process.cwd()), ["-I", resolve("mira/managed_child.py"), String(process.pid), process.execPath, "-e", parent], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  guardian.stdout.on("data", data => { output += data.toString(); });
  const exited = new Promise(done => guardian.once("exit", done));
  const ports = [];
  try {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && guardian.exitCode === null) {
      const matches = [...output.matchAll(/(?:parent|descendant):(\d+)/g)];
      if (matches.length === 2) { ports.push(...matches.map(match => match[1])); break; }
      await new Promise(done => setTimeout(done, 50));
    }
    assert.equal(ports.length, 2, "Both processes must be running inside the guardian job");
    for (const port of ports) assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
  } finally {
    if (guardian.exitCode === null) guardian.kill("SIGKILL");
    await exited;
  }
  await new Promise(done => setTimeout(done, 300));
  for (const port of ports) await assert.rejects(() => fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(500) }));
});

test("provider preflight preserves the existing price and structured endpoint gate", async () => {
  const { preflightProvider } = await import("../scripts/mira-runtime.mjs");
  const calls = [];
  await preflightProvider(async url => {
    calls.push(String(url));
    return Response.json(String(url).endsWith("/models") ? { data: [{ id: model, pricing: { prompt: "0.0000003", completion: "0.0000025" } }] } : { data: { endpoints: [{ supported_parameters: ["response_format", "structured_outputs", "temperature"] }] } });
  });
  assert.equal(calls.length, 2);
  assert(calls.every(url => url.startsWith("https://openrouter.ai/api/v1/")));
});

test("provider preflight refuses over-budget, missing or malformed model prices", async () => {
  const { preflightProvider } = await import("../scripts/mira-runtime.mjs");
  for (const pricing of [{ prompt: "0.0000006", completion: "0.0000025" }, { prompt: "0.0000003", completion: "0.000003" }, { prompt: "bad", completion: "0.0000025" }, {}]) {
    await assert.rejects(() => preflightProvider(async url => Response.json(String(url).endsWith("/models") ? { data: [{ id: model, pricing }] } : { data: { endpoints: [{ supported_parameters: ["response_format", "structured_outputs", "temperature"] }] } })), /Profil Flash/);
  }
});

test("provider preflight refuses unavailable metadata and unsupported output endpoints", async () => {
  const { preflightProvider } = await import("../scripts/mira-runtime.mjs");
  await assert.rejects(() => preflightProvider(async () => Response.json({}, { status: 503 })), /Metadata/);
  await assert.rejects(() => preflightProvider(async url => Response.json(String(url).endsWith("/models") ? { data: [{ id: model, pricing: { prompt: "0.0000003", completion: "0.0000025" } }] } : { data: { endpoints: [{ supported_parameters: ["temperature"] }] } })), /Profil Flash/);
});
