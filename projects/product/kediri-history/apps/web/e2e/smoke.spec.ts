import { expect, test } from "@playwright/test";

/**
 * Anchor scene dimulai dengan angka (1135-panjalu-jayati), sesuai kontrak
 * tautan dalam di UX Bible bagian 5. Fragment URL menerimanya, tetapi selector
 * CSS TIDAK: "#1135-..." bukan selector yang sah. Karena itu setiap pencarian
 * elemen memakai selector atribut, dan kode aplikasi memakai getElementById.
 */
const SCENE_1135 = '[id="1135-panjalu-jayati"]';

/**
 * Bukti browser.
 *
 * Skenario di bawah mengikuti Master Implementation Plan bagian 21 dan menguji
 * kontrak yang paling mudah rusak diam-diam: dokumen bermakna lebih dulu,
 * tautan dalam yang stabil, bukti berjarak satu interaksi, dan tombol Back yang
 * mengembalikan konteks yang tepat.
 *
 * Setiap uji berjalan di proyek desktop DAN mobile, karena mobile adalah desain
 * tersendiri, bukan desktop yang dikecilkan.
 */

test("home offers three ways in without forcing an intro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /A Living Civilization/,
  );
  await expect(
    page.getByRole("link", { name: "Mulai perjalanan" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ke Arsip" })).toBeVisible();
});

test("the first focusable control is the skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("href", "#historical-content");
  await expect(focused).toBeVisible();
});

test("home leads into the journey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Mulai perjalanan" }).click();
  await expect(page).toHaveURL(/\/journey$/);
  await expect(
    page.getByRole("heading", { name: "Panjalu Jayati" }).first(),
  ).toBeVisible();
});

test("a scene deep link lands on that scene", async ({ page }) => {
  // Seorang guru membagikan tautan ini. Ia harus tetap hidup.
  await page.goto("/journey#1135-panjalu-jayati");
  const scene = page.locator(SCENE_1135);
  await expect(scene).toBeVisible();
  await expect(scene.locator("time")).toHaveText("1135");
});

test("evidence is one interaction away, and names its source", async ({
  page,
}) => {
  await page.goto("/journey#1135-panjalu-jayati");
  const scene = page.locator(SCENE_1135);
  await scene.locator("details > summary").click();
  await expect(scene.getByText("Bukti yang menopang").first()).toBeVisible();
  await expect(
    scene.getByText("catatan katalog D.9", { exact: false }).first(),
  ).toBeVisible();
});

test("journey to archive and back restores the exact scene", async ({
  page,
}) => {
  // Alur yang UX Bible bagian 17 sebut sakral.
  await page.goto("/journey#1135-panjalu-jayati");
  await page
    .locator(SCENE_1135)
    .getByRole("link", { name: "Catatan arsip lengkap" })
    .click();
  await expect(page).toHaveURL(/\/archive\/events\/1135-panjalu-jayati$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Panjalu Jayati",
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/journey#1135-panjalu-jayati$/);
  await expect(page.locator(SCENE_1135)).toBeVisible();
});

test("the archive record separates record from reading", async ({ page }) => {
  await page.goto("/archive/events/1135-panjalu-jayati");
  await expect(page.getByText("PRIMARY RECORD").first()).toBeVisible();
  await expect(
    page.getByText("SCHOLARLY INTERPRETATION").first(),
  ).toBeVisible();
});

test("an event without published evidence says so plainly", async ({
  page,
}) => {
  await page.goto("/archive/events/1869-brantas-bridge");
  await expect(
    page.getByText("Belum ada klaim terbit yang tertaut ke peristiwa ini."),
  ).toBeVisible();
});

test("a person with no documented likeness says so", async ({ page }) => {
  await page.goto("/archive/people/jayabhaya");
  await expect(
    page
      .getByText("Tidak ada rupa yang terdokumentasi", { exact: false })
      .first(),
  ).toBeVisible();
});

test("search finds a person through a historical spelling", async ({
  page,
}) => {
  // Jayabaya harus menemukan Jayabhaya tanpa pengunjung menguasai transliterasi.
  await page.goto("/archive");
  await page.getByLabel("Cari arsip").fill("Jayabaya");
  await page.getByRole("button", { name: "Cari" }).click();
  await expect(page.getByRole("link", { name: /Jayabhaya/ })).toBeVisible();
});

test("search invents nothing when there is no match", async ({ page }) => {
  await page.goto("/archive?q=zzzznothing");
  await expect(page.getByText("Tidak ada yang cocok")).toBeVisible();
});

test("the timeline is a real page, not only an overlay", async ({ page }) => {
  await page.goto("/explore/timeline");
  await expect(page.getByText("27 Juli 879").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Panjalu Jayati/ }).first(),
  ).toBeVisible();
});

test("a missing record does not fabricate a replacement", async ({ page }) => {
  const response = await page.goto("/archive/events/tidak-pernah-ada");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByText("Bagian sejarah ini tidak ada di sini"),
  ).toBeVisible();
});

test("the journey is meaningful with JavaScript disabled", async ({
  browser,
}) => {
  // Kalau JavaScript gagal, bioskopnya hilang dan sejarahnya tetap ada.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/journey");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tanda Pertama" }),
  ).toBeVisible();
  await expect(
    page.getByText("27 Juli 879").or(page.getByText("879")).first(),
  ).toBeVisible();
  // Bukti tetap terbuka lewat elemen <details> asli.
  await expect(page.getByText("Lihat bukti").first()).toBeVisible();
  await context.close();
});

test("reduced motion keeps the whole journey, without motion", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/journey");

  const title = page.getByRole("heading", { name: "Panjalu Jayati" }).first();
  await expect(title).toBeVisible();
  // Komposisi akhir langsung: tidak ada elemen yang tertinggal transparan.
  await expect(title).toHaveCSS("opacity", "1");
  await context.close();
});

test("motion enhances the document without becoming it", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Varian mobile punya perjalanan spasialnya sendiri; kontrak ini diuji sekali.",
  );

  await page.goto("/journey");
  const title = page.locator(`${SCENE_1135} [data-motion="title"]`);

  // Sebelum di-scroll, koreografi sudah memegang elemennya: ia belum tampil
  // penuh. Teksnya tetap ada di DOM — yang berubah hanya presentasinya.
  await expect(title).toHaveText("Panjalu Jayati");

  await title.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(900);

  // Setelah scene dilewati, komposisinya selesai.
  await expect(title).toHaveCSS("opacity", "1");
});

test("leaving and returning does not leave motion behind", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Diuji sekali.");

  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/journey");
  await page.getByRole("link", { name: "Sumber" }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/journey$/);

  // Timeline dan ScrollTrigger milik scene dibersihkan pemiliknya; trigger
  // yatim akan muncul sebagai error saat rute berganti.
  expect(errors).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Panjalu Jayati" }).first(),
  ).toBeVisible();
});
