import { defineConfig, devices } from "@playwright/test";

const e2ePassword = process.env.MANTRA_E2E_PASSWORD;
const adminPassword = process.env.MANTRA_ADMIN_PASSWORD;
if (!e2ePassword) {
  throw new Error(
    "MANTRA_E2E_PASSWORD is required for e2e-* accounts (ADR-0002)."
  );
}
if (!adminPassword) {
  throw new Error(
    "MANTRA_ADMIN_PASSWORD is required for Administrator (chief) login (ADR-0002)."
  );
}
if (e2ePassword === adminPassword) {
  throw new Error(
    "MANTRA_ADMIN_PASSWORD and MANTRA_E2E_PASSWORD must be different (ADR-0002)."
  );
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.MANTRA_E2E_BASE_URL || "http://localhost:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
});
