import { defineConfig, devices } from "@playwright/test";

process.env.DATABASE_URL ??=
  "postgresql://safrs:safrs@127.0.0.1:54329/safrs_local";
process.env.NODE_ENV ??= "test";
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5001";
process.env.APP_URL ??= baseURL;
process.env.BETTER_AUTH_SECRET ??= "sentrabot-disposable-auth-secret-32-chars";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:5001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: `${baseURL}/workspace`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
