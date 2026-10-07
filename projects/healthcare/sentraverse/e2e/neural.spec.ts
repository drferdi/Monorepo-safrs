import { expect, test } from '@playwright/test'

const divisionNames = ['Sentra Artificial Intelligence', 'Sentra Healthcare Solutions', 'Sentra Academic Solutions', 'Sentra Digital & Finance', 'Sentra Mitra Design']

test('scroll narrative reverses, discovers every division, and keeps sound opt-in', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.pin-spacer')).toHaveCount(1)
  const names = ['Intelligence orchestration', 'Human care', 'Knowledge in formation', 'Precision in motion', 'Intelligence takes shape']
  for (const [index, label] of names.entries()) {
    await page.getByRole('button', { name: `Go to ${label}`, exact: true }).click()
    await expect(page.getByRole('heading', { name: divisionNames[index], exact: true })).toBeVisible()
    await expect(page.locator('[data-phase-label]')).toHaveText(label)
  }
  await page.getByRole('button', { name: 'Go to Across the synapse', exact: true }).click()
  await expect(page.locator('#synapse')).toHaveAttribute('aria-hidden', 'false')
  await page.getByRole('button', { name: 'Go to The beginning', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => page.locator('main').getAttribute('data-phase')).toMatch(/^1\./)
  expect(errors).toEqual([])
})

test('reduced motion uses unpinned readable chapters and reacts to preference changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  for (const name of divisionNames) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(page.locator('[data-chapter][aria-hidden="true"]')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect(page.locator('.pin-spacer')).toHaveCount(1)
})

test('mobile retains the complete story without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  for (const label of ['Embryonic origin', 'A human architecture', 'Signal propagation', 'Human care', 'Back to the human']) {
    await page.getByRole('button', { name: `Go to ${label}`, exact: true }).click()
    await expect(page.locator('[data-phase-label]')).toHaveText(label)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const panel = page.locator('[data-chapter][aria-hidden="false"]')
    const box = await panel.locator('h2').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  }
})

test('WebGL unavailable preserves the Canvas journey and all division names', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'canvas')
  await page.getByRole('button', { name: 'Go to Intelligence orchestration', exact: true }).click()
  await expect(page.getByRole('heading', { name: divisionNames[0], exact: true })).toBeVisible()
})

test('context loss recovers to Canvas and reading mode cleans up pins', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-loading', 'false')
  const mode = await page.locator('main').getAttribute('data-renderer')
  if (mode === 'webgl') {
    await page.locator('canvas').first().evaluate(canvas => {
      (canvas as HTMLCanvasElement).getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext()
    })
    await expect(page.locator('main')).toHaveAttribute('data-renderer', 'canvas')
  }
  await page.getByRole('button', { name: 'READ THE STORY', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await page.getByRole('button', { name: 'CINEMATIC VIEW', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect(page.locator('.pin-spacer')).toHaveCount(1)
})

test('without JavaScript the full narrative and destination remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  for (const name of divisionNames) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toHaveAttribute('href', '/ekosistem')
  await context.close()
})

test('all five connected regions are actionable and network frame pacing is recorded', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await page.getByRole('button', { name: 'Go to All systems connected', exact: true }).click()
  await expect(page.locator('[data-overview]')).toBeVisible()
  for (const name of divisionNames) await expect(page.locator('[data-overview]').getByRole('button', { name: new RegExp(name) })).toBeVisible()
  const timing = await page.evaluate(() => new Promise<{ meanMs: number; p95Ms: number }>(resolve => {
    const frames: number[] = []
    let previous = performance.now()
    const sample = (now: number) => {
      frames.push(now - previous); previous = now
      if (frames.length < 90) requestAnimationFrame(sample)
      else {
        const measured = frames.slice(10).sort((a, b) => a - b)
        resolve({ meanMs: measured.reduce((sum, n) => sum + n, 0) / measured.length, p95Ms: measured[Math.floor(measured.length * .95)] })
      }
    }
    requestAnimationFrame(sample)
  }))
  console.log('Neural network frame pacing (local browser, ms):', timing)
  expect(timing.meanMs).toBeLessThan(100)
  await page.locator('[data-overview]').getByRole('button', { name: /Sentra Academic Solutions/ }).click()
  await expect(page.getByRole('heading', { name: 'Sentra Academic Solutions', exact: true })).toBeVisible()
})
