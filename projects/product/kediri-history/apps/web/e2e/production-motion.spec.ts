import { expect, test } from "@playwright/test";

type MotionDebugHandle = {
  ScrollTrigger: { getAll(): Array<{ progress: number }> };
  activeTriggers(): number;
};

type MotionWindow = Window & { __kediriMotion?: MotionDebugHandle };

test("production Journey boots its motion runtime without client or chunk failures", async ({
  page,
}, testInfo) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const editorialPreviewRequests: string[] = [];
  const failedScripts: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/editorial-preview/")) {
      editorialPreviewRequests.push(response.url());
    }
    if (
      response.request().resourceType() === "script" &&
      response.status() >= 400
    ) {
      failedScripts.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/journey?motionDebug=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#historical-content")).toBeVisible();
  const editorialPreviewMarkup = await page
    .locator(
      '[src*="/api/editorial-preview/"], [srcset*="/api/editorial-preview/"]',
    )
    .evaluateAll((elements) => elements.map((element) => element.outerHTML));
  expect(editorialPreviewMarkup, editorialPreviewMarkup.join("\n")).toEqual([]);
  await expect
    .poll(
      () =>
        page.evaluate(() => Boolean((window as MotionWindow).__kediriMotion)),
      { timeout: 10_000, message: "Motion runtime did not become ready." },
    )
    .toBe(true);

  if (testInfo.project.name === "production-desktop") {
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as MotionWindow).__kediriMotion?.activeTriggers() ?? 0,
          ),
        {
          timeout: 10_000,
          message: "No ScrollTrigger survived production boot.",
        },
      )
      .toBeGreaterThan(0);

    const before = await page.evaluate(
      () =>
        (window as MotionWindow).__kediriMotion?.ScrollTrigger.getAll().map(
          (trigger) => trigger.progress,
        ) ?? [],
    );
    await page.mouse.wheel(0, 1_200);
    await expect
      .poll(
        () =>
          page.evaluate((previous) => {
            const current =
              (
                window as MotionWindow
              ).__kediriMotion?.ScrollTrigger.getAll().map(
                (trigger) => trigger.progress,
              ) ?? [];
            return current.some(
              (progress, index) =>
                Math.abs(progress - (previous[index] ?? progress)) > 0.001,
            );
          }, before),
        {
          timeout: 5_000,
          message: "ScrollTrigger progress did not change after scrolling.",
        },
      )
      .toBe(true);
  } else {
    const beforeScroll = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 800);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(beforeScroll);
  }

  if (testInfo.project.name === "production-reduced-motion") {
    expect(
      await page.evaluate(
        () => (window as MotionWindow).__kediriMotion?.activeTriggers() ?? 0,
      ),
    ).toBe(0);
  }

  expect(failedScripts, failedScripts.join("\n")).toEqual([]);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  expect(editorialPreviewRequests, editorialPreviewRequests.join("\n")).toEqual(
    [],
  );
});
