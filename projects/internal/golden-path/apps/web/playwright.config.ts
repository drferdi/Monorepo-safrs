import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { resolvePlaywrightEnvironment } from "./e2e/environment.js";

const canonicalEnvironment = resolvePlaywrightEnvironment(process.env);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
  },
  snapshotPathTemplate:
    "{testDir}/screenshots/{projectName}/{testFileName}-snapshots/{arg}{ext}",
  webServer: {
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3001",
    cwd: fileURLToPath(new URL(".", import.meta.url)),
    env: canonicalEnvironment,
    reuseExistingServer: false,
    // Without `url` Playwright never waits for readiness: it spawns the dev
    // server and starts the tests in the same tick, so every navigation hits
    // ERR_CONNECTION_REFUSED. The probe also drives the first compile, which
    // is why the budget is well above a warm boot.
    url: "http://127.0.0.1:3001",
    timeout: 180_000,
    // Surface the dev server's own output so a boot failure in CI is readable
    // from the job log instead of only as a refused connection.
    stdout: "pipe",
  },
});
