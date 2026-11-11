import { createRequire } from "node:module";
import { join } from "node:path";

import { startManagedProcess } from "./lib/process.mjs";

const env = { ...process.env, NODE_ENV: "production" };
const requireFromApp = createRequire(join(process.cwd(), "package.json"));
const nextCli = requireFromApp.resolve("next/dist/bin/next");
const child = startManagedProcess(process.execPath, [nextCli, "build"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  detached: false,
});

child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.once("error", () => {
  process.exitCode = 1;
});
