import { defineConfig, devices } from "@playwright/test";

const HOST = "127.0.0.1";
const PORT = 4322;
const localBaseUrl = `http://${HOST}:${PORT}`;
const externalBaseUrl = process.env.KEDIRI_MOTION_CANARY_URL?.trim();
const baseURL = externalBaseUrl || localBaseUrl;
const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  ),
);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "production-motion.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "production-desktop",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: { reducedMotion: "no-preference" },
      },
    },
    {
      name: "production-mobile",
      use: {
        ...devices["Pixel 7"],
        contextOptions: { reducedMotion: "no-preference" },
      },
    },
    {
      name: "production-reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: { reducedMotion: "reduce" },
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `next start -H ${HOST} -p ${PORT}`,
        url: localBaseUrl,
        reuseExistingServer: false,
        timeout: 180_000,
        env: { ...inheritedEnv, NODE_ENV: "production" },
      },
});
