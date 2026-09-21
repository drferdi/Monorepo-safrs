import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";

const port = 4100 + Math.floor(Math.random() * 400);
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
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
  if (!response?.ok) throw new Error("UNICOM production server did not become ready.");
  const page = await response.text();
  if (!page.includes("UNICOM")) throw new Error("UNICOM production page marker is missing.");
  console.log("Production smoke test passed.");
} finally {
  server.kill();
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]);
}
