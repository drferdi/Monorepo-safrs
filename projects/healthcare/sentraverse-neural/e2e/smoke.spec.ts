import { expect, test } from '@playwright/test'

test.describe('sentraverse neural site', () => {
  test('home page loads with the journey as its main landmark', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()
    await expect(page.getByRole('main', { name: 'Sentraverse neural journey' })).toBeVisible()
  })

  test('the journey reaches the way on to the Sentra ecosystem', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toHaveAttribute('data-loading', 'false')
    await page.getByRole('button', { name: 'Go to The legacy', exact: true }).click()
    // The jump lands at the chapter's start; the way on appears once the story has reached its end.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const cta = page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', 'https://sentrahai.com/ekosistem')
  })
})
