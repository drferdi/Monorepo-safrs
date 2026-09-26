import { defineConfig, devices } from "@playwright/test";

/** K2v visual-only: Administrator login. Does not seed e2e-* accounts. */
const adminPassword = process.env.MANTRA_ADMIN_PASSWORD;
if (!adminPassword) {
  throw new Error(
    "MANTRA_ADMIN_PASSWORD is required for K2v Administrator login (ADR-0002)."
  );
}

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/k2v-praktisi-bertugas.spec.ts", "**/k2v-all-days.spec.ts"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.MANTRA_E2E_BASE_URL || "http://localhost:8000",
    screenshot: "off",
    ...devices["Desktop Chrome"],
  },
});
