import { defineConfig, devices } from "@playwright/test";

/**
 * Fondasi browser Phase 1. Satu proyek desktop dan satu proyek mobile sejak
 * awal, karena mobile adalah desain tersendiri (UX Bible §26) dan bukan
 * penyesuaian akhir.
 *
 * Server dev dijalankan oleh Playwright sendiri agar perintah ini tetap bisa
 * dijalankan dari capsule root tanpa orkestrasi luar.
 *
 * Portnya SENGAJA berbeda dari 4320 yang dipakai scripts/serve.mjs. Kalau
 * keduanya berbagi port, `reuseExistingServer` akan diam-diam menguji build
 * produksi yang lama dan melaporkan hijau untuk kode yang belum pernah
 * dijalankan.
 */
const HOST = "127.0.0.1";
const PORT = 4321;
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `next dev -H ${HOST} -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
