import { expect, test } from '@playwright/test'

test.describe('sentra-main marketing site', () => {
  test('homepage loads with main landmark', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(res?.ok()).toBeTruthy()
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('primary routes do not 404', async ({ page }) => {
    for (const path of ['/insights', '/story', '/privacy', '/terms']) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(res?.status(), `expected 200 for ${path}`).toBe(200)
    }
  })

  test('cinematic journey reaches the ecosystem CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toHaveAttribute('data-loading', 'false')
    await page.getByRole('button', { name: 'Go to Back to the human', exact: true }).click()
    await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toHaveAttribute('href', '/ekosistem')
  })
})
