import { expect, type Page, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, rpc, signup } from "./helpers";

function slackCard(page: Page) {
  return page.getByRole("group", { name: "Slack connection" });
}

test("focus choice suggests apps and preserves a completed connection", async ({
  page,
}, testInfo) => {
  const stamp = Date.now();
  await signup(page, `onboarding-${stamp}@sentrabot.test`, "password12", "Robin");
  await completeOnboarding(page);

  await expect(
    page.getByText("Halo Robin. Saya mulai dari nol, jadi saya buat singkat saja."),
  ).toBeVisible();
  await expect(page.getByText("Mau saya pegang apa lebih dulu?", { exact: true })).toBeVisible();
  await page.mouse.move(1, 1);
  await captureScreenshot(page, testInfo, "01-focus-choice");

  await page.getByRole("button", { name: /Pekerjaan sehari-hari/ }).click();
  // The focus step suggests apps but must not rename the bot: the name the
  // user chose during creation ("Chief") is preserved.
  await expect(page.locator("main").getByText("Chief", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Message Chief")).toBeVisible();
  await expect(page.getByText("Slack", { exact: true })).toBeVisible();
  await expect(page.getByText("Gmail", { exact: true })).toBeVisible();
  await page
    .getByTestId("transcript")
    .getByText("Hubungkan tiga itu, dan saya mulai menyusun gambarannya.")
    .scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await captureScreenshot(page, testInfo, "02-app-suggestions");

  await slackCard(page).getByRole("button", { name: "Authorize" }).click();
  await expect(slackCard(page).getByText("Connected", { exact: true })).toBeVisible();
  await expect(slackCard(page).getByText("Connected", { exact: true })).toHaveCSS("opacity", "1");
  await expect
    .poll(async () => {
      const connections = await rpc<Array<{ provider: string; status: string }>>(
        page,
        "connections/list",
        {},
      );
      return connections.some(
        (connection) => connection.provider === "SLACK" && connection.status === "connected",
      );
    })
    .toBe(true);
  await page.mouse.move(1, 1);
  await captureScreenshot(page, testInfo, "03-slack-connected");

  await page.reload();
  await expect(slackCard(page).getByText("Connected", { exact: true })).toBeVisible();
  await page.mouse.move(1, 1);
  await captureScreenshot(page, testInfo, "04-connected-after-reload");
});
