import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { operateBetaAccess } from "../scripts/beta-access-core.mjs";

const key = "sk_test_fixture_only";
test("invalid action, user or configuration fails before constructing a provider", async () => {
  for (const [action, userId, secretKey] of [["ban", "user_a", key], ["disable", "email@example.test", key], ["disable", "user_a", ""]]) {
    let called = false;
    await assert.rejects(operateBetaAccess({ action, userId, secretKey, provider: () => { called = true; } }));
    assert.equal(called, false);
  }
});
test("disable merges only the flag before listing every page and revoking sessions", async () => {
  const events = []; const metadata = { other: 1, sentrapediaBetaConsent: { version: "unchanged" } };
  const sessions = Array.from({ length: 103 }, (_, i) => ({ id: `sess_${i}` }));
  const client = {
    users: { async updateUserMetadata(id, patch) { assert.equal(id, "user_a"); Object.assign(metadata, patch.privateMetadata); events.push("disabled"); } },
    sessions: { async getSessionList({ userId, offset, limit }) { assert.equal(userId, "user_a"); events.push(`list:${offset}`); return { data: sessions.slice(offset, offset + limit), totalCount: sessions.length }; }, async revokeSession(id) { events.push(id); } },
  };
  const result = await operateBetaAccess({ action: "disable", userId: "user_a", secretKey: key, provider: () => client });
  assert.equal(result.revoked, 103); assert.deepEqual(events.slice(0, 3), ["disabled", "list:0", "list:100"]);
  assert.deepEqual(metadata, { other: 1, sentrapediaBetaConsent: { version: "unchanged" }, sentrapediaBetaAccess: { disabled: true } });
});
test("enable does not grant consent or create sessions", async () => {
  let patch;
  await operateBetaAccess({ action: "enable", userId: "user_a", secretKey: key, provider: () => ({ users: { async updateUserMetadata(id, value) { patch = value; } } }) });
  assert.deepEqual(patch, { privateMetadata: { sentrapediaBetaAccess: { disabled: false } } });
});
test("partial revocation remains disabled and reports failure without provider details", async () => {
  let disabled = false; const attempted = [];
  await assert.rejects(operateBetaAccess({ action: "disable", userId: "user_a", secretKey: key, provider: () => ({
    users: { async updateUserMetadata() { disabled = true; } },
    sessions: { async getSessionList() { return { data: [{ id: "sess_a" }, { id: "sess_b" }], totalCount: 2 }; }, async revokeSession(id) { attempted.push(id); if (id === "sess_a") throw new Error("private-secret-body"); } },
  }) }), error => !error.message.includes("private-secret-body"));
  assert.equal(disabled, true); assert.deepEqual(attempted, ["sess_a", "sess_b"]);
});
test("CLI subprocess uses the injected provider seam, exits nonzero and redacts remote errors", async () => {
  const requests = [];
  const server = createServer((req, res) => { requests.push(req.url); res.writeHead(500); res.end("private-secret-body"); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const endpoint = `http://127.0.0.1:${server.address().port}`;
    const source = `import {runBetaAccess} from './scripts/beta-access.mjs'; process.exitCode = await runBetaAccess(['disable','user_a'],{CLERK_SECRET_KEY:'${key}'},()=>({users:{async updateUserMetadata(){const r=await fetch('${endpoint}/metadata');if(!r.ok)throw Error(await r.text());}}}));`;
    const child = spawn(process.execPath, ["--input-type=module", "-e", source], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let output = ""; child.stdout.on("data", x => { output += x; }); child.stderr.on("data", x => { output += x; });
    const code = await new Promise(resolve => child.once("exit", resolve));
    assert.equal(code, 1); assert.deepEqual(requests, ["/metadata"]); assert.match(output, /failed/i);
    assert.ok(!output.includes(key)); assert.ok(!output.includes("private-secret-body"));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
