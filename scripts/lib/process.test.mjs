import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { startManagedProcess, stopManagedProcess } from "./process.mjs";

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
