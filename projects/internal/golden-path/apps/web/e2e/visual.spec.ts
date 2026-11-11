import { expect, test } from "@playwright/test";

/**
 * Visual regression baseline for the golden-path readiness desk.
 *
 * The page is server-rendered; in the disposable e2e environment both the API
 * and PostgreSQL are reachable, so the desk deterministically renders the
 * "ready" aggregate state. Any change to the composed layout, spacing, or
 * token-driven styling will be caught here.
 *
 * Regenerate baselines intentionally with:
 *   pnpm --filter @safrs/web exec playwright test --update-snapshots
 */
test("readiness desk renders to the committed visual baseline", async ({
  page,
}) => {
  await page.goto("/");

  // Wait for the server-rendered desk to settle before capturing.
  await expect(
    page.getByRole("heading", { name: /Monorepo siap untuk alur SAFRS/i }),
  ).toBeVisible();

  await expect(page.getByText("PostgreSQL dapat dijangkau.")).toBeVisible();
  await expect(page.getByText("Endpoint Hono merespons.")).toBeVisible();

  await expect(page).toHaveScreenshot("readiness-desk.png", {
    fullPage: true,
  });
});
