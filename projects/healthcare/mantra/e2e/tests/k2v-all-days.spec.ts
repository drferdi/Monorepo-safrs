/**
 * K2v — screenshot Praktisi Bertugas for each flyer weekday.
 * Loads real per-day payloads from scripts/_k2v_verify_slots (bench), then
 * intercepts ws_klinik.data so the UI renders that day without clock changes.
 * Does not mutate DB/schedule code.
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ADMIN_PASSWORD = process.env.MANTRA_ADMIN_PASSWORD as string;
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

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

type SlotItem = { title: string; sub: string; right: string; route?: string };
type VerifyOut = {
  by_day: Record<string, SlotItem[]>;
  flyer_expected: Record<string, SlotItem[]>;
  diffs: unknown[];
};

function loadVerify(): VerifyOut {
  const cached = path.join(__dirname, "..", "..", "scripts", "_k2v_out.json");
  if (fs.existsSync(cached)) {
    return JSON.parse(fs.readFileSync(cached, "utf8")) as VerifyOut;
  }
  // Prefer pre-generated JSON from scripts/_k2v_run.sh
  throw new Error(
    "Missing scripts/_k2v_out.json — run scripts/_k2v_run.sh first to export parity JSON."
  );
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

async function openKlinik(page: Page) {
  await page.goto("/app/pasien-%26-klinik", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const title = page.getByText("Praktisi Bertugas", { exact: false }).first();
  if (!(await title.isVisible().catch(() => false))) {
    await page.goto("/app/Pasien%20%26%20Klinik", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
  }
  await expect(
    page.getByText("Praktisi Bertugas", { exact: false }).first()
  ).toBeVisible({ timeout: 30_000 });
}

function panelPayload(items: SlotItem[]) {
  const cards = [
    { value: 0, label: "Appointment Hari Ini", route: "/app/patient-appointment" },
    { value: 0, label: "Pasien Menunggu", route: "/app/patient-appointment" },
    { value: 0, label: "Pemeriksaan Belum Selesai", route: "/app/patient-encounter" },
    {
      value: new Set(items.map((i) => i.title)).size,
      label: "Praktisi Bertugas",
      route: "/app/healthcare-practitioner",
    },
  ];
  return {
    message: {
      cards,
      actions: [
        { label: "Daftarkan Pasien", desc: "Pasien baru", route: "/app/patient/new" },
        {
          label: "Buat Appointment",
          desc: "Jadwalkan kunjungan",
          route: "/app/patient-appointment/new",
        },
        {
          label: "Mulai Pemeriksaan",
          desc: "Pemeriksaan baru",
          route: "/app/patient-encounter/new",
        },
        { label: "Cari Pasien", desc: "Daftar pasien", route: "/app/patient" },
      ],
      panels: [
        {
          title: "Appointment Hari Ini",
          items: [],
          empty: "Tidak ada appointment hari ini.",
        },
        {
          title: "Praktisi Bertugas",
          items: items.map((i) => ({
            title: i.title,
            sub: i.sub,
            right: i.right,
            route: i.route || "/app/healthcare-practitioner",
          })),
          empty: "Belum ada jadwal praktik hari ini.",
        },
      ],
    },
  };
}

test.describe.configure({ mode: "serial" });

test("K2v: screenshot Praktisi Bertugas for each flyer day", async ({
  page,
}) => {
  test.skip(!ADMIN_PASSWORD, "MANTRA_ADMIN_PASSWORD required");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const verify = loadVerify();
  expect(verify.diffs, "flyer vs DB must have no diffs").toEqual([]);

  await login(page, "Administrator", ADMIN_PASSWORD);

  for (const day of DAYS) {
    const items = verify.by_day[day] || [];
    const expected = verify.flyer_expected[day] || [];
    expect(
      items.map((i) => [i.title, i.right, i.sub]),
      `${day} actual vs flyer`
    ).toEqual(expected.map((i) => [i.title, i.right, i.sub]));

    await page.route("**/api/method/**", async (route) => {
      const url = route.request().url();
      if (url.includes("ws_klinik.data") || url.includes("ws_klinik%2Edata")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(panelPayload(items)),
        });
        return;
      }
      await route.continue();
    });

    await openKlinik(page);
    // Force block refresh if already on page
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const block = page
      .locator(".rsia-block, .ce-card, .workspace-section, [data-widget-name]")
      .filter({ hasText: "Praktisi Bertugas" })
      .first();
    await expect(
      page.getByText("Praktisi Bertugas", { exact: false }).first()
    ).toBeVisible({ timeout: 30_000 });

    if (items.length === 0) {
      await expect(
        page.getByText("Belum ada jadwal praktik hari ini.", { exact: false })
      ).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(page.getByText(items[0].title, { exact: false })).toBeVisible({
        timeout: 15_000,
      });
    }

    const file = `k2v-praktisi-${day.toLowerCase()}.png`;
    const primary = path.join(outDir, file);
    const archive = path.join(assetsDir, file);
    if ((await block.count()) > 0) {
      await block.first().screenshot({ path: primary });
    } else {
      await page.screenshot({ path: primary, fullPage: true });
    }
    fs.copyFileSync(primary, archive);

    await page.unroute("**/api/method/**");
  }
});
