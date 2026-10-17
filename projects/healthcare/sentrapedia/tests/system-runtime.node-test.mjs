import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { engineEnvironment, engineReady, geminiBaseUrl, model, pythonPath } from "../scripts/mira-runtime.mjs";
import profile from "../scripts/mira-profile.json" with { type: "json" };

test("launcher takes model, step deadline and budget from the shared MIRA profile", () => {
  const env = engineEnvironment(resolve("test-capsule"), { GEMINI_API_KEY: "fixture-only" }, "token");
  assert.equal(model, profile.model);
  assert.equal(env.MIRA_STEP_DEADLINE_S, String(profile.stepDeadlineS));
  assert.equal(env.MIRA_MAX_USD_PER_STEP, profile.stepBudgetUsd.toFixed(2));
});

test("engine uses capsule runtime and preserves approved profile despite inherited external config", () => {
  const root = resolve("test-capsule");
  const env = engineEnvironment(root, { GEMINI_API_KEY: "fixture-only", OPENROUTER_API_KEY: "old-route", OPENAI_BASE_URL: "https://external.example/v1", OPENAI_API_KEY: "other", MIRA_LLM_PROVIDER: "openrouter", MIRA_OPENROUTER_ZDR: "false", MIRA_FAST_COPY_PROVIDERS: "x", PYTHONPATH: "external", MIRA_AUDIT_DIR: "external", MIRA_DEV_TOKEN: "old", MIRA_DATA_POLICY: "openrouter-zdr", MIRA_PLAN_MODEL: "other" }, "new-token");
  assert.equal(env.PYTHONPATH, "");
  assert.equal(env.MIRA_LLM_PROVIDER, "openai");
  assert.equal(env.OPENAI_BASE_URL, "https://generativelanguage.googleapis.com/v1beta/openai/");
  assert.equal(env.OPENAI_API_KEY, "fixture-only");
  assert.equal(env.OPENROUTER_API_KEY, undefined);
  for (const name of ["MIRA_OPENROUTER_PROVIDER_SORT", "MIRA_OPENROUTER_ZDR", "MIRA_FAST_COPY_PROVIDERS"]) assert.equal(env[name], "");
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
  assert.throws(() => engineEnvironment(".", {}, "token"), /GEMINI_API_KEY/);
  assert.throws(() => engineEnvironment(".", { GEMINI_API_KEY: " ", OPENROUTER_API_KEY: "old-route" }, "token"), /GEMINI_API_KEY/);
});

test("workspace waits for grounded matching engine rather than old separate services", () => {
  const health = { status: "ok", contractVersion: "1", capabilities: ["theoracle-grounding-v2"], version: `mira-service/0.1.0+contract=1+provider=openai+data=synthetic-only+plan=${model}+assess=${model}+experimental+ddx=provisional+assessment=fast+therapy=fast` };
  assert.equal(engineReady(health), true);
  for (const changed of [{ capabilities: [] }, { contractVersion: "2" }, { status: "unavailable" }, { version: health.version.replace(model, "other") }, { version: health.version.replace("provider=openai", "provider=openrouter") }, { version: health.version.replace("+therapy=fast", "") }]) assert.equal(engineReady({ ...health, ...changed }), false);
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

test("provider preflight reads the model from the Gemini API with the key and sends no completion", async () => {
  const { preflightProvider } = await import("../scripts/mira-runtime.mjs");
  const calls = [];
  await preflightProvider(async (url, init) => { calls.push({ url: String(url), init }); return Response.json({ id: `models/${model}`, object: "model" }); }, "fixture-only");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${geminiBaseUrl}models/${model}`);
  assert.equal(calls[0].init.headers.Authorization, "Bearer fixture-only");
  assert.equal(calls[0].init.method, undefined);
});

test("provider preflight refuses a rejected key or an unavailable model without echoing the key or body", async () => {
  const { preflightProvider } = await import("../scripts/mira-runtime.mjs");
  for (const status of [401, 403]) {
    await assert.rejects(() => preflightProvider(async () => Response.json({ error: "secret-echo" }, { status }), "fixture-only"), error => /GEMINI_API_KEY ditolak/.test(error.message) && !/fixture-only|secret-echo/.test(error.message));
  }
  await assert.rejects(() => preflightProvider(async () => Response.json({ error: "secret-echo" }, { status: 404 }), "fixture-only"), error => /belum tersedia di Gemini API \(HTTP 404\)/.test(error.message) && !/fixture-only|secret-echo/.test(error.message));
});

test("launcher calls the workspace health check once Next answers, so TheOracle starts loading before the first case", async () => {
  const { warmWorkspace } = await import("../scripts/mira-runtime.mjs");
  const calls = [];
  const warmed = await warmWorkspace("http://127.0.0.1:3101", async url => { calls.push(String(url)); if (calls.length < 3) throw new Error("ECONNREFUSED"); return Response.json({}); }, 5000, 1);
  assert.equal(warmed, true);
  assert.deepEqual(calls, Array(3).fill("http://127.0.0.1:3101/api/mira"));
  assert.equal(await warmWorkspace("http://127.0.0.1:3101", async () => { throw new Error("ECONNREFUSED"); }, 20, 1), false);
});
