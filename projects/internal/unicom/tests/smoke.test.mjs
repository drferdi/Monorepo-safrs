import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import test from "node:test";

test("UNICOM home page is reachable in a local runtime", async () => {
  const port = 3600 + Math.floor(Math.random() * 400);
  const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const server = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "ignore",
  });

  try {
    const deadline = Date.now() + 30_000;
    let response;
    while (Date.now() < deadline) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(response?.status, 200, "UNICOM home page must respond with HTTP 200");
    assert.match(await response.text(), /UNICOM/u, "home page must identify the application");
  } finally {
    server.kill();
    await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
});
