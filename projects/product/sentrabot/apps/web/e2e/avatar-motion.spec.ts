import { expect, test } from "@playwright/test";

const eyeTransform = (group: SVGGElement) => group.style.transform;

test("chip avatar stays still when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/e2e/fixtures/avatar-motion.html");

  const avatar = page.getByTestId("large").locator(".sentrabot-clay-avatar");
  await expect(avatar).toBeVisible();
  await expect(avatar.locator("animate")).toHaveCount(0);

  const eyes = avatar.locator(".sentrabot-clay-avatar-eyes");
  await expect(eyes).toBeVisible();
  await page.mouse.move(10, 10);
  await page.mouse.move(600, 400);
  await page.waitForTimeout(250);

  expect(await eyes.evaluate(eyeTransform)).toBe("");
});

test("only chips at 48px and above follow the pointer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/fixtures/avatar-motion.html");

  const largeEyes = page.getByTestId("large").locator(".sentrabot-clay-avatar-eyes");
  const smallEyes = page.getByTestId("small").locator(".sentrabot-clay-avatar-eyes");
  await expect(largeEyes).toBeVisible();
  await expect(smallEyes).toBeVisible();

  await page.mouse.move(10, 10);
  await page.mouse.move(700, 500);
  await page.waitForTimeout(250);

  expect(await largeEyes.evaluate(eyeTransform)).toMatch(/^translate\(/);
  expect(await smallEyes.evaluate(eyeTransform)).toBe("");
});
