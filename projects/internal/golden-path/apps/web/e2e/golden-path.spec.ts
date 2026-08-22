import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { resolvePlaywrightEnvironment } from "./environment.js";

const { DATABASE_URL: databaseUrl } = resolvePlaywrightEnvironment(process.env);
const createdDemoNames: string[] = [];

test.afterEach(async () => {
  if (createdDemoNames.length === 0) {
    return;
  }

  const database = new Client({ connectionString: databaseUrl });
  await database.connect();
  try {
    await database.query("DELETE FROM demos WHERE name = ANY($1::text[])", [
      createdDemoNames.splice(0),
    ]);
  } finally {
    await database.end();
  }
});

test("Chief can see health and create a demo record", async ({ page }) => {
  const name = `Atlas E2E ${randomUUID()}`;
  createdDemoNames.push(name);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Monorepo siap untuk alur SAFRS/i }),
  ).toBeVisible();
  await expect(page.getByText("PostgreSQL dapat dijangkau.")).toBeVisible();
  await expect(page.getByText("Endpoint Hono merespons.")).toBeVisible();
  await page.getByLabel("Nama contoh").fill(name);
  await page.getByRole("button", { name: "Simpan contoh" }).click();
  await expect(page.getByText(`Contoh ${name} tersimpan.`)).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Contoh tersimpan" }),
  ).toContainText(name);
});
