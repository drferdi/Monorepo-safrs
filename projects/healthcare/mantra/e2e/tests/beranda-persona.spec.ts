/**
 * K1 — Beranda persona E2E.
 * SSOT: docs/design/2026-07-16-beranda-persona-design.md §4
 * Runtime labels: sentra_mantra_indonesia.home_today.ACTIONS
 */
import { test, expect, type Page } from "@playwright/test";

const E2E_PASSWORD = process.env.MANTRA_E2E_PASSWORD as string;
const ADMIN_PASSWORD = process.env.MANTRA_ADMIN_PASSWORD as string;

const ACTIONS: Record<string, string[]> = {
  chief: ["Persetujuan", "Laporan Manajemen", "Keuangan", "Karyawan"],
  clinical: [
    "Daftarkan Pasien",
    "Buat Appointment",
    "Mulai Pemeriksaan",
    "Cari Pasien",
  ],
  hr: ["Data Karyawan", "Ajukan Cuti", "Kehadiran", "Penugasan Shift"],
  finance: ["Buat Tagihan", "Catat Pembayaran", "Buat Pengadaan", "Buku Besar"],
  umum: ["Ajukan Cuti", "Kehadiran Saya", "Cari Pasien", "Profil Saya"],
};

const HIDDEN_SIDEBAR = ["Website", "Build", "Tools"];

async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#login_email").fill(email);
  await page.locator("#login_password").fill(password);
  await page.locator(".btn-login").click();
  // Desk is an SPA — wait for URL, not full window "load" (can hang after /app).
  // Frappe v15 may land on /apps (workspace picker) or /app/...
  await page.waitForURL(/\/apps?(\/|$)/, { timeout: 30_000, waitUntil: "domcontentloaded" });
}

async function openHome(page: Page) {
  await page.goto("/app/home", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".rsia-today")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".rsia-profile")).toBeVisible({ timeout: 30_000 });
  // Wait until both Custom HTML Blocks hydrate from frappe.call
  await expect(page.locator(".rsia-today .rsia-quick").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator(".rsia-profile .rsia-grid label").first()).toBeVisible({
    timeout: 20_000,
  });
}

async function actionLabels(page: Page): Promise<string[]> {
  return page.locator(".rsia-today .rsia-quick b").allTextContents();
}

async function tileLabels(page: Page): Promise<string[]> {
  return page.locator(".rsia-profile .rsia-grid label").allTextContents();
}

async function sidebarLabels(page: Page): Promise<string[]> {
  const labels = await page
    .locator(
      ".desk-sidebar .standard-sidebar-label, .desk-sidebar .sidebar-item-label, .desk-sidebar .item-anchor"
    )
    .allTextContents();
  return labels.map((t) => t.trim()).filter(Boolean);
}

async function assertNoPenggajian(page: Page) {
  // Scope to sidebar + Aksi Cepat only — avoid false positives in page copy.
  const nav = page.locator(
    ".desk-sidebar, .rsia-today [data-sec='actions'], .rsia-today-actions"
  );
  await expect(nav.getByText("Penggajian", { exact: false })).toHaveCount(0);
}

async function assertHiddenWorkspaces(page: Page) {
  const side = (await sidebarLabels(page)).join("\n");
  for (const name of HIDDEN_SIDEBAR) {
    expect(side, `sidebar must not show ${name}`).not.toMatch(
      new RegExp(`\\b${name}\\b`, "i")
    );
  }
}

test.describe.configure({ mode: "serial" });

test.describe("persona: chief (Administrator)", () => {
  test("Beranda matches matriks §4.1", async ({ page }) => {
    await login(page, "Administrator", ADMIN_PASSWORD);
    await openHome(page);

    expect(await actionLabels(page)).toEqual(ACTIONS.chief);

    const dir = page.locator(".rsia-dir");
    await expect(dir).toBeVisible({ timeout: 20_000 });
    await expect(dir).not.toHaveAttribute("hidden", "");

    const rme = page.locator(".rme-bridge");
    await expect(rme).toBeVisible({ timeout: 20_000 });
    await expect(rme).toContainText(
      /Belum ada hasil extract RME|Status data staging terbaru/
    );

    await assertNoPenggajian(page);
    await assertHiddenWorkspaces(page);

    const side = await sidebarLabels(page);
    // Pengaturan is System Manager only — may appear as translated label
    expect(side.join(" ")).toMatch(/Pengaturan|Settings/i);
  });
});

test.describe("persona: clinical", () => {
  test("Beranda matches matriks §4.2", async ({ page }) => {
    await login(page, "e2e-clinical@mantra.test", E2E_PASSWORD);
    await openHome(page);

    expect(await actionLabels(page)).toEqual(ACTIONS.clinical);

    const dir = page.locator(".rsia-dir");
    await expect(dir).toBeHidden();

    const tiles = await tileLabels(page);
    expect(tiles.some((t) => t.includes("Unit Layanan"))).toBeTruthy();
    expect(tiles.some((t) => t.includes("Jadwal Praktik Hari Ini"))).toBeTruthy();

    await expect(page.locator('[data-sec="presence"]')).toBeHidden();

    await assertNoPenggajian(page);
    await assertHiddenWorkspaces(page);
  });
});

test.describe("persona: hr", () => {
  test("Beranda matches matriks §4.3", async ({ page }) => {
    await login(page, "e2e-hr@mantra.test", E2E_PASSWORD);
    await openHome(page);

    expect(await actionLabels(page)).toEqual(ACTIONS.hr);

    await expect(page.locator(".rsia-dir")).toBeHidden();
    await expect(page.locator('[data-sec="presence"]')).toBeHidden();

    await assertNoPenggajian(page);
    await assertHiddenWorkspaces(page);
  });
});

test.describe("persona: finance", () => {
  test("Beranda matches matriks §4.4", async ({ page }) => {
    await login(page, "e2e-finance@mantra.test", E2E_PASSWORD);
    await openHome(page);

    expect(await actionLabels(page)).toEqual(ACTIONS.finance);

    await expect(page.locator(".rsia-dir")).toBeHidden();
    await expect(page.locator('[data-sec="presence"]')).toBeHidden();

    await assertNoPenggajian(page);
    await assertHiddenWorkspaces(page);
  });
});

test.describe("persona: umum", () => {
  test("Beranda matches matriks §4.5 + Profil Publik seed", async ({ page }) => {
    await login(page, "e2e-umum@mantra.test", E2E_PASSWORD);
    await openHome(page);

    expect(await actionLabels(page)).toEqual(ACTIONS.umum);

    await expect(page.locator(".rsia-dir")).toBeHidden();

    const tiles = await tileLabels(page);
    const tileText = tiles.join(" | ");
    expect(tileText).not.toMatch(/\bSTR\b/);
    expect(tileText).not.toMatch(/\bSIP\b/);

    const presence = page.locator('[data-sec="presence"]');
    await expect(presence).toBeVisible();
    await expect(presence.locator(".rsia-presence-link")).toContainText("Website");

    await assertNoPenggajian(page);
    await assertHiddenWorkspaces(page);

    const side = await sidebarLabels(page);
    expect(side.join(" ")).not.toMatch(/Pengaturan|Settings/i);
  });
});
