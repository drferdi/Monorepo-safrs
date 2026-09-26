/**
 * K2v — visual verify panel "Praktisi Bertugas".
 * Empty-state copy only on flyer days without slots (Tue/Sat); other days expect roster.
 * Read-only: screenshot only; do not change app code or schedule data.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ADMIN_PASSWORD = process.env.MANTRA_ADMIN_PASSWORD as string;
const E2E_PASSWORD = process.env.MANTRA_E2E_PASSWORD as string;

const outDir = path.join(__dirname, "..", "test-results");
const assetsDir = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "progress",
  "assets",
  "k2v"
);

function ensureDirs() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#login_email").fill(email);
  await page.locator("#login_password").fill(password);
  await page.locator(".btn-login").click();
  // Frappe v15 may land on /apps (workspace picker) or /app/...
  await page.waitForURL(/\/apps?(\/|$)/, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });
}

async function openKlinikWorkspace(page: Page) {
  const routes = [
    "/app/pasien-%26-klinik",
    "/app/Pasien%20%26%20Klinik",
    "/app/pasien-klinik",
  ];
  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const title = page.getByText("Praktisi Bertugas", { exact: false }).first();
    if (await title.isVisible().catch(() => false)) {
      return;
    }
  }
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page
    .locator(".desk-sidebar, .workspace-sidebar, body")
    .getByText(/Pasien\s*&\s*Klinik/i)
    .first()
    .click({ timeout: 15_000 });
  await page.waitForTimeout(2000);
}

async function saveShot(page: Page, name: string, locator?: Locator) {
  const file = `${name}.png`;
  const primary = path.join(outDir, file);
  const archive = path.join(assetsDir, file);
  if (locator && (await locator.count()) > 0) {
    await locator.first().screenshot({ path: primary });
  } else {
    await page.screenshot({ path: primary, fullPage: true });
  }
  fs.copyFileSync(primary, archive);
}

test.describe.configure({ mode: "serial" });

test("K2v: Praktisi Bertugas panel on Pasien & Klinik (today)", async ({
  page,
}) => {
  test.skip(!ADMIN_PASSWORD, "MANTRA_ADMIN_PASSWORD required");
  ensureDirs();

  await login(page, "Administrator", ADMIN_PASSWORD);
  await openKlinikWorkspace(page);

  const panelTitle = page.getByText("Praktisi Bertugas", { exact: false }).first();
  await expect(panelTitle).toBeVisible({ timeout: 30_000 });

  const block = page
    .locator(".rsia-block, .ce-card, .workspace-section, [data-widget-name]")
    .filter({ hasText: "Praktisi Bertugas" })
    .first();

  await saveShot(page, "k2v-praktisi-bertugas-today", block);
  await saveShot(page, "k2v-pasien-klinik-full");

  // Flyer SSOT (praktik_dokter.SCHEDULES): slots on Mon/Wed/Thu/Fri/Sun only.
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const emptyDays = new Set(["Tuesday", "Saturday"]);
  if (emptyDays.has(weekday)) {
    await expect(
      page.getByText("Belum ada jadwal praktik hari ini.", { exact: false })
    ).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(
      page.getByText("Belum ada jadwal praktik hari ini.", { exact: false })
    ).toHaveCount(0);
    await expect(block.getByText(/dr\.|Sp\.|Poli/i).first()).toBeVisible({
      timeout: 15_000,
    });
  }
});

test("K2v: Beranda clinical tile Jadwal Praktik Hari Ini", async ({ page }) => {
  test.skip(!E2E_PASSWORD, "MANTRA_E2E_PASSWORD required for clinical persona");
  ensureDirs();

  await login(page, "e2e-clinical@mantra.test", E2E_PASSWORD);
  await page.goto("/app/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const tile = page.getByText("Jadwal Praktik Hari Ini", { exact: false }).first();
  await expect(tile).toBeVisible({ timeout: 30_000 });

  const card = page
    .locator(".rsia-block, .ce-card, .workspace-section, .home-tile, body")
    .filter({ hasText: "Jadwal Praktik Hari Ini" })
    .first();
  await saveShot(page, "k2v-beranda-jadwal-praktik", card);
  await saveShot(page, "k2v-beranda-home-full");
});
