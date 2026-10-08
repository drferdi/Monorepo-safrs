import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const divisionNames = ['Sentra Artificial Intelligence', 'Sentra Healthcare Solutions', 'Sentra Academic Solutions', 'Sentra Digital & Finance', 'Sentra Mitra Design']

async function portraitPhase(page: Page, phase: number) {
  await page.evaluate(value => {
    const spacer = document.querySelector('.pin-spacer')!, stage = document.querySelector('[data-stage]')!
    const box = spacer.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + box.top + (box.height - stage.clientHeight) * value / 100)
  }, phase)
  await expect.poll(async () => Math.abs(Number(await page.locator('main').getAttribute('data-phase')) - phase)).toBeLessThan(.06)
}

test('portrait contours reveal features first, reverse cleanly and finish on the original photo', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-face', 'ready')
  await portraitPhase(page, 96.5)
  const photo = page.locator('[data-photo]'), canvas = photo.locator('canvas')
  await expect(photo).toHaveAttribute('data-reveal', 'active')
  const sample = () => canvas.evaluate(element => {
    const surface = element as HTMLCanvasElement, ctx = surface.getContext('2d')!
    const alpha = (u: number, v: number) => ctx.getImageData(Math.floor(u * surface.width), Math.floor(v * surface.height), 1, 1).data[3]
    return [alpha(.52, .475), alpha(.425, .38), alpha(.1, .9)]
  })
  const first = await sample()
  expect(first[0]).toBeGreaterThan(240)
  expect(first[1]).toBeGreaterThan(240)
  expect(first[2]).toBe(0)
  await portraitPhase(page, 98.7)
  await expect(photo).toHaveAttribute('data-reveal', 'complete')
  await expect(photo.locator('img')).toHaveCSS('opacity', '1')
  await portraitPhase(page, 96.5)
  await expect(photo).toHaveAttribute('data-reveal', 'active')
  expect(await sample()).toEqual(first)
  expect(await page.locator('#human').evaluate(element => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  await page.getByRole('button', { name: 'READ THE STORY', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(photo).not.toHaveAttribute('data-reveal', /.+/)
  await expect(photo.locator('img')).toHaveCSS('opacity', '1')
})

test('a late portrait load resolves the current phase and survives a mobile resize', async ({ page }) => {
  let release: () => void = () => undefined
  const ready = new Promise<void>(resolve => { release = resolve })
  await page.route(url => url.pathname === '/_next/image' && url.searchParams.get('url') === '/portrait-ferdi.webp', async route => { await ready; await route.continue() })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await portraitPhase(page, 98.7)
  release()
  const photo = page.locator('[data-photo]')
  await expect(photo).toHaveAttribute('data-reveal', 'complete')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Go to Back to the human', exact: true }).click()
  await portraitPhase(page, 98.7)
  await expect(photo).toHaveAttribute('data-reveal', 'complete')
  const face = await photo.boundingBox(), text = await page.locator('#human h2').boundingBox()
  expect(face).not.toBeNull(); expect(text).not.toBeNull()
  expect(face!.y + face!.height).toBeLessThan(text!.y)
  expect(face!.x).toBeGreaterThanOrEqual(0)
  expect(face!.x + face!.width).toBeLessThanOrEqual(390)
})

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
  await page.getByRole('button', { name: 'Go to Back to the human', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-face', 'ready')
  await expect(page.locator('[data-stage] > svg')).toHaveCount(0)
  await expect(page.locator('[data-photo] img')).toBeVisible()
  await expect(page.locator('[data-scrim]')).toHaveCSS('opacity', '0')
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
  await expect(page.locator('main')).toHaveAttribute('data-face', 'ready')
  await expect(page.locator('[data-photo] img')).toBeVisible()
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
    if (label === 'Back to the human') await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toBeInViewport()
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
  await expect(page.locator('main')).toHaveAttribute('data-face', 'ready')
  await page.getByRole('button', { name: 'Go to Intelligence orchestration', exact: true }).click()
  await expect(page.getByRole('heading', { name: divisionNames[0], exact: true })).toBeVisible()
})

test('without any canvas context the story still ends on the human chapter text', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'svg')
  await expect(page.locator('main')).toHaveAttribute('data-face', 'unavailable')
  await page.getByRole('button', { name: 'Go to Back to the human', exact: true }).click()
  await expect(page.locator('#human h2')).toBeVisible()
  await expect(page.locator('[data-photo] img')).toBeVisible()
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
  // The headline text never moves with the pointer (Chief 2026-10-08).
  await page.mouse.move(640, 300)
  await page.mouse.move(760, 420)
  await page.waitForTimeout(600)
  expect(await page.locator('#origin [data-marker-copy]').evaluate(block => (block as HTMLElement).style.transform)).toBe('')
  await page.getByRole('button', { name: 'READ THE STORY', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  expect(await page.locator('[data-marker-copy], [data-magnetic], [data-nav] > *, [data-jump]').evaluateAll(elements => elements.every(element => !(element as HTMLElement).style.transform))).toBe(true)
  await page.getByRole('button', { name: 'CINEMATIC VIEW', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect(page.locator('.pin-spacer')).toHaveCount(1)
})

test('a touch on a desktop-sized tablet moves the story without lifting the button', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  const button = page.getByRole('button', { name: 'Go to Back to the human', exact: true })
  const box = await button.boundingBox()
  expect(box).not.toBeNull()
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.locator('[data-phase-label]')).toHaveText('Back to the human')
  await page.waitForTimeout(400)
  expect(await button.evaluate(element => (element as HTMLElement).style.transform)).toBe('')
  await context.close()
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
  await expect(page.locator('[data-scrim]')).toHaveCSS('opacity', '1')
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
