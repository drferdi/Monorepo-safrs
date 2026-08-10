import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createAllowlistedEnvironment,
  startManagedProcess,
  stopManagedProcess,
} from "./process.mjs";

test("filters sensitive inherited environment values before overlaying canonical values", () => {
  const environment = createAllowlistedEnvironment(
    { DATABASE_URL: "postgresql://safe" },
    {
      API_TOKEN: "token-sentinel",
      AUTH_COOKIE: "auth-sentinel",
      PUBLIC_CONTEXT: "allowed",
    },
  );

  assert.deepEqual(environment, {
    DATABASE_URL: "postgresql://safe",
    PUBLIC_CONTEXT: "allowed",
  });
});

test("stops the child process it starts", async () => {
  const child = startManagedProcess(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)"],
    {
      stdio: "ignore",
    },
  );

  const exited = once(child, "exit");
  await stopManagedProcess(child);
  const [code, signal] = await exited;

  assert.ok(code !== null || signal !== null);
  assert.equal(child.exitCode, code);
});

test("stops the complete process tree including a real grandchild", async () => {
  const pidFile = join(
    tmpdir(),
    `safrs-grandchild-${process.pid}-${Date.now()}.pid`,
  );
  const child = startManagedProcess(
    process.execPath,
    [
      "-e",
      "const {spawn}=require('node:child_process');const {writeFileSync}=require('node:fs');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});writeFileSync(process.argv[1],String(child.pid));setInterval(()=>{},1000);",
      pidFile,
    ],
    { stdio: "ignore" },
  );
  try {
    let grandchildPid;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        grandchildPid = Number(await readFile(pidFile, "utf8"));
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    assert.ok(grandchildPid > 0);

    await stopManagedProcess(child);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.throws(() => process.kill(grandchildPid, 0));
  } finally {
    await stopManagedProcess(child);
    await rm(pidFile, { force: true });
  }
});
