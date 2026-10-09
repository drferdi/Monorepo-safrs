import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { FILM, filmFrameUrl } from '../components/neural/film'
import { MORPH } from '../components/neural/morph'
import { MASTER_DURATION, phaseToTime } from '../components/neural/timeline'

const divisionNames = ['Sentra Artificial Intelligence', 'Sentra Healthcare Solutions', 'Sentra Academic Solutions', 'Sentra Digital & Finance', 'Sentra Mitra Design']

// Scrolls to a story phase through the timeline's own tempo (the scroll travel maps onto the
// master's hundred units, and phases dwell unevenly across them since 2026-10-08).
async function portraitPhase(page: Page, phase: number) {
  await page.evaluate(progress => {
    const spacer = document.querySelector('.pin-spacer')!, stage = document.querySelector('[data-stage]')!
    const box = spacer.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + box.top + (box.height - stage.clientHeight) * progress)
  }, phaseToTime(phase) / MASTER_DURATION)
  await expect.poll(async () => Math.abs(Number(await page.locator('main').getAttribute('data-phase')) - phase)).toBeLessThan(.06)
}

test('the film: it fades in through the closing void after the SENTRA chapter, runs while the page scrolls, fits a phone, and the still poster is the photograph in reading mode', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  const film = page.locator('[data-film]'), veil = page.locator('[data-legacy-void]')
  const opacity = (locator: typeof film) => locator.evaluate(element => Number(getComputedStyle(element).opacity))
  await portraitPhase(page, 94.3)
  await expect(veil).toHaveCSS('opacity', '0')
  await expect(film).toHaveCSS('opacity', '0')
  // Mid-dissolve: the void is still closing while the film is already coming in, so nothing is black between.
  await portraitPhase(page, 95.4)
  await expect.poll(() => opacity(veil)).toBeGreaterThan(.2)
  await expect.poll(() => opacity(veil)).toBeLessThan(1)
  await expect.poll(() => opacity(film)).toBeGreaterThan(.1)
  await portraitPhase(page, 97)
  await expect(veil).toHaveCSS('opacity', '1')
  await expect(film).toHaveCSS('opacity', '0.85')
  await expect(film.locator('canvas[data-film-canvas]')).toBeVisible()
  await expect(film.locator('img')).toBeHidden()
  // The frame on screen is the scroll position's: a third of the way through the film window at
  // 97 (once the frames have arrived), the last frame at 100, an early one again on the way back.
  const frame = () => film.locator('canvas[data-film-canvas]').evaluate(canvas => Number(canvas.getAttribute('data-frame') ?? -1))
  const expected = (phase: number) => Math.round((phase - 95.8) / (99 - 95.8) * 10.1 * 12)
  await expect.poll(frame, { timeout: 20000 }).toBeGreaterThanOrEqual(expected(97) - 3)
  expect(await frame()).toBeLessThanOrEqual(expected(97) + 3)
  await portraitPhase(page, 100)
  await expect.poll(frame, { timeout: 20000 }).toBe(119)
  // The face's transformation is the scroll position's too: complete at the end, not begun at 98.5.
  // Read off the canvas itself: at the end the left side of the face as seen carries the light
  // tissue (edges, dots, somas) and the right side stays the photograph, untouched by the canvas.
  const morph = film.locator('canvas[data-film-morph]')
  await expect(morph).toBeVisible()
  await expect.poll(() => morph.getAttribute('data-morph'), { timeout: 20000 }).toBe('1.00')
  const face = MORPH.face, left = { x0: face.x - face.rx * .8, x1: face.x - 20 }, right = { x0: face.x + 20, x1: face.x + face.rx * .8 }
  const tissue = (side: { x0: number; x1: number }) => morph.evaluate((canvas, [x0, x1, y0, y1, scale]) => {
    if (!(canvas instanceof HTMLCanvasElement)) return null
    const context = canvas.getContext('2d')
    if (!context) return null
    const { data } = context.getImageData(x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale)
    let painted = 0, bright = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= 8) continue
      painted++
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 > 90) bright++
    }
    return { painted, bright, total: data.length / 4 }
  }, [side.x0, side.x1, face.y - 60, face.y + 70, MORPH.scale])
  await expect.poll(async () => (await tissue(left))?.bright ?? 0, { timeout: 20000 }).toBeGreaterThan(200)
  const untouched = await tissue(right)
  expect(untouched).not.toBeNull()
  expect((untouched?.painted ?? 1) / (untouched?.total ?? 1)).toBeLessThan(.005)
  await portraitPhase(page, 98.5)
  await expect.poll(() => morph.getAttribute('data-morph')).toBe('0.00')
  await expect.poll(async () => (await tissue(left))?.painted ?? -1).toBe(0)
  await portraitPhase(page, 96.2)
  await expect.poll(frame).toBeLessThanOrEqual(expected(96.2) + 3)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Go to The legacy', exact: true }).click()
  await portraitPhase(page, 100)
  const box = (await film.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.width).toBeGreaterThan(300)
  await expect(page.locator('#human h2')).toBeVisible()
  await page.getByRole('button', { name: 'READ THE STORY', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(film.locator('img')).toBeVisible()
  await expect(film.locator('canvas[data-film-canvas]')).toBeHidden()
  await expect(film.locator('canvas[data-film-morph]')).toBeHidden()
})

test('the film is fetched only on the way to it, first and last frame first, served immutable, none missing', async ({ page }) => {
  const frames: string[] = []
  page.on('request', request => { const path = new URL(request.url()).pathname; if (/^\/legacy-film\/.+\/f\d{3}\.webp$/.test(path)) frames.push(path) })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await page.waitForLoadState('networkidle')
  await portraitPhase(page, 50)
  expect(frames, 'no frame before the network chapter').toHaveLength(0)
  await portraitPhase(page, 61)
  await expect.poll(() => frames.length).toBeGreaterThanOrEqual(2)
  expect(frames.slice(0, 2)).toEqual([filmFrameUrl(0), filmFrameUrl(FILM.frames - 1)])
  await portraitPhase(page, 100)
  const canvas = page.locator('canvas[data-film-canvas]')
  await expect.poll(() => canvas.getAttribute('data-frame'), { timeout: 20000 }).toBe(String(FILM.frames - 1))
  await expect.poll(() => new Set(frames).size, { timeout: 20000 }).toBe(FILM.frames)
  expect(await canvas.getAttribute('data-missing')).toBeNull()
  const response = await page.request.get(filmFrameUrl(0))
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable')
})

test('the activity cycle runs through the network on WebGL and parks elsewhere and under reduced motion', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  // A shader that fails to compile falls back to Canvas 2D silently; the attribute makes it visible.
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'webgl')
  await expect(page.locator('main')).toHaveAttribute('data-signal', 'paused')
  await page.getByRole('button', { name: 'Go to Intelligence orchestration', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-signal', 'active')
  await page.getByRole('button', { name: 'Go to The legacy', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-signal', 'paused')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(page.locator('main')).toHaveAttribute('data-signal', 'paused')
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
  await page.getByRole('button', { name: 'Go to The legacy', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-face', 'ready')
  await expect(page.locator('[data-stage] > svg')).toHaveCount(0)
  // The jump lands on the drawn face; the photograph resolves over it on the way to the end.
  await portraitPhase(page, 100)
  await expect(page.locator('[data-film]')).toBeVisible()
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
  await expect(page.locator('[data-film]')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect(page.locator('.pin-spacer')).toHaveCount(1)
})

test('mobile retains the complete story without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  for (const label of ['Embryonic origin', 'A human architecture', 'Signal propagation', 'Human care', 'The legacy']) {
    await page.getByRole('button', { name: `Go to ${label}`, exact: true }).click()
    await expect(page.locator('[data-phase-label]')).toHaveText(label)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const panel = page.locator('[data-chapter][aria-hidden="false"]')
    const box = await panel.locator('h2').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    if (label === 'The legacy') {
      // The way on is the last beat of the legacy; it is in view once the camera has settled.
      await portraitPhase(page, 100)
      await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toBeInViewport()
    }
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
  await page.getByRole('button', { name: 'Go to The legacy', exact: true }).click()
  await expect(page.locator('#human h2')).toBeVisible()
  await expect(page.locator('[data-film]')).toBeVisible()
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
  const button = page.getByRole('button', { name: 'Go to The legacy', exact: true })
  const box = await button.boundingBox()
  expect(box).not.toBeNull()
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.locator('[data-phase-label]')).toHaveText('The legacy')
  await page.waitForTimeout(400)
  expect(await button.evaluate(element => (element as HTMLElement).style.transform)).toBe('')
  await context.close()
})

test('without JavaScript the full narrative and destination remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  for (const name of divisionNames) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toHaveAttribute('href', 'https://sentrahai.com/ekosistem')
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

test('the legacy: the field dissolves into the film, the film holds, and the final typography settles over it on every breakpoint', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  const film = page.locator('[data-film]'), scene = page.locator('[data-legacy]')
  // The opening line alone over the field, the words still to come.
  await portraitPhase(page, 95.2)
  await expect(page.locator('[data-legacy-presence]')).toHaveCSS('opacity', '1')
  await expect(page.locator('[data-legacy-tagline]')).toHaveCSS('opacity', '0')
  // The film in, the line gone.
  await portraitPhase(page, 98.5)
  await expect(page.locator('[data-legacy-presence]')).toHaveCSS('opacity', '0')
  await expect(film).toHaveCSS('opacity', '0.85')
  // The end: the words settled, the film large and inside the frame on every breakpoint.
  await portraitPhase(page, 100)
  await expect(page.locator('[data-legacy-tagline]')).toHaveText('Every universe begins with a vision.')
  await expect(page.locator('[data-legacy-signature]')).toContainText('dr Ferdi Iskandar')
  await expect(page.locator('[data-legacy-brand]')).toContainText('Human intelligence. Artificial intelligence. One universe.')
  await expect(page.getByRole('heading', { name: 'THE LEGACY', exact: true })).toBeVisible()
  for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport)
    // gsap.matchMedia rebuilds the pin on a breakpoint change; wait for the new spacer and the resize refresh.
    await page.waitForFunction(() => document.querySelector('.pin-spacer') !== null && document.querySelector('main')?.dataset.enhanced === 'cinematic')
    await page.waitForTimeout(400)
    await portraitPhase(page, 100)
    await expect(page.locator('[data-legacy-brand]')).toHaveCSS('opacity', '1')
    const box = (await film.boundingBox())!
    expect(box.x, `${viewport.width}: film left`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${viewport.width}: film right`).toBeLessThanOrEqual(viewport.width)
    expect(box.y, `${viewport.width}: film top`).toBeGreaterThanOrEqual(0)
    expect(box.height, `${viewport.width}: film large`).toBeGreaterThan(viewport.height * .4)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${viewport.width}: no horizontal overflow`).toBe(true)
    await expect(page.getByRole('link', { name: 'EXPLORE SENTRAVERSE', exact: true })).toBeInViewport()
  }
  // Reduced motion: the still poster, the photograph plain, the film hidden, the words in place.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await page.locator('#human').scrollIntoViewIfNeeded()
  await expect(film.locator('img')).toBeVisible()
  await expect(film.locator('canvas[data-film-canvas]')).toBeHidden()
  await expect(film.locator('canvas[data-film-morph]')).toBeHidden()
  expect(await scene.evaluate(element => element.getAttribute('style') ?? '')).toBe('')
  expect(await film.evaluate(element => element.getAttribute('style') ?? '')).toBe('')
  await expect(page.locator('[data-legacy-tagline]')).toBeVisible()
  await expect(page.locator('[data-legacy-signature]')).toBeVisible()
})

test('one carrier is handed from chapter to chapter: it travels, never cuts, survives a jump, and leaves into the legacy void', async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  const carrier = page.locator('[data-carrier]')
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const sample = async (phase: number) => {
    await portraitPhase(page, phase); await settle()
    const box = (await carrier.boundingBox())!
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }
  // Each handoff window: no single half-phase step covers most of the way from host to host.
  for (const [start, end] of [[6.5, 9.5], [16.5, 19.5], [25.5, 28.5], [35.5, 38.5], [49.5, 52.5], [57.5, 60.5], [63.5, 66.5], [69, 71.5], [74, 76.5], [88.5, 91.5]]) {
    const points: Array<{ x: number; y: number }> = []
    for (let phase = start; phase <= end + 1e-9; phase += .5) points.push(await sample(phase))
    const travel = Math.hypot(points.at(-1)!.x - points[0].x, points.at(-1)!.y - points[0].y)
    for (let i = 1; i < points.length; i++) {
      const step = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
      expect(step, `step ${i} in ${start}-${end}`).toBeLessThanOrEqual(Math.max(.65 * travel, 24))
    }
    for (const point of points) { expect(point.x).toBeGreaterThan(0); expect(point.x).toBeLessThan(1280); expect(point.y).toBeGreaterThan(0); expect(point.y).toBeLessThan(800) }
  }
  // It takes its host's size: the precise impulse is smaller than the breathing origin.
  const width = async (phase: number) => { await portraitPhase(page, phase); await settle(); return (await carrier.boundingBox())!.width }
  expect(await width(44)).toBeLessThan(.8 * await width(4))
  await portraitPhase(page, 50)
  await expect.poll(() => carrier.evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(.9)
  await portraitPhase(page, 97)
  await expect.poll(() => carrier.evaluate(element => Number(getComputedStyle(element).opacity))).toBeLessThan(.02)
  // A hash straight into a division, loaded fresh (a same-document hash change never re-runs the
  // app's start): the carrier is on its hub, on screen, at once.
  await page.goto('about:blank')
  await page.goto('/#division-3')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect.poll(async () => { const box = await carrier.boundingBox(); return !!box && box.x > 0 && box.x < 1280 && box.y > 0 && box.y < 800 }).toBe(true)
  await expect.poll(() => carrier.evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(.9)
  await page.getByRole('button', { name: 'READ THE STORY', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'reading')
  await expect(carrier).toBeHidden()
})

test('the Canvas 2D fallback keeps painting the field through the constellation, without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-renderer', 'canvas')
  for (const phase of [60, 62.5, 65, 70]) await portraitPhase(page, phase)
  const painted = await page.locator('canvas').nth(1).evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext('2d')!
    const { data } = context.getImageData(0, 0, (canvas as HTMLCanvasElement).width, (canvas as HTMLCanvasElement).height)
    let lit = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) lit++
    return lit
  })
  expect(painted).toBeGreaterThan(1000)
  expect(errors).toEqual([])
})

test('the opening words arrive by meaning, keep their name, and are never left faint', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveAccessibleName('Intelligence begins as connection.')
  const faintest = () => h1.evaluate(element => Math.min(...[element, ...element.querySelectorAll('*')].map(node => { let o = 1; for (let n: Element | null = node; n && n !== element.parentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o })))
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect.poll(faintest, { timeout: 6000 }).toBeGreaterThan(.99)
  // A breakpoint rebuild does not replay the intro or leave the words faint.
  await page.setViewportSize({ width: 700, height: 800 })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForTimeout(400)
  expect(await faintest()).toBeGreaterThan(.99)
  // Reduced motion: readable at once.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  expect(await faintest()).toBeGreaterThan(.99)
  await expect(h1).toHaveAccessibleName('Intelligence begins as connection.')
})

test('progress is a neural trace: a signal head rides the line at the scroll progress, one chapter tick lights, and a resize keeps them in step', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await expect(page.locator('[data-progress-tick]')).toHaveCount(15)
  const offset = async (phase: number) => {
    const line = await page.locator('[data-progress-line]').evaluate(element => element.parentElement!.getBoundingClientRect().toJSON() as { x: number; width: number })
    const dot = (await page.locator('[data-progress-head] span').boundingBox())!
    return Math.abs(dot.x + dot.width / 2 - (line.x + line.width * phaseToTime(phase) / MASTER_DURATION))
  }
  for (const [phase, chapter] of [[8.5, 8], [43, 43], [71.5, 71], [97, 94]]) {
    await portraitPhase(page, phase)
    await expect.poll(() => offset(phase)).toBeLessThan(4)
    await expect(page.locator('[data-progress-tick][data-active="true"]')).toHaveCount(1)
    await expect(page.locator('[data-progress-tick][data-active="true"]')).toHaveAttribute('data-progress-tick', String(chapter))
  }
  // A resize refreshes the pin: the same scroll position is now a different share of a shorter
  // travel, and the head moves to it (read from the pin's own geometry, not from the page's phase).
  await portraitPhase(page, 43)
  await page.setViewportSize({ width: 1100, height: 600 })
  const travelled = () => page.evaluate(() => {
    const spacer = document.querySelector('.pin-spacer')!.getBoundingClientRect(), stage = document.querySelector('[data-stage]')!
    const line = document.querySelector('[data-progress-line]')!.parentElement!.getBoundingClientRect()
    const dot = document.querySelector('[data-progress-head] span')!.getBoundingClientRect()
    return Math.abs(dot.x + dot.width / 2 - (line.x + line.width * -spacer.top / (spacer.height - stage.clientHeight)))
  })
  await expect.poll(travelled, { timeout: 8000 }).toBeLessThan(6)
  // The keyboard path to a chapter is the transport, as before.
  await page.getByRole('button', { name: 'Go to Signal propagation', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-phase-label]')).toHaveText('Signal propagation')
})

test('pointing at a division names it in a micro-label and scrolling on forgets it; touch and phones get none', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await page.getByRole('button', { name: 'Go to Human care', exact: true }).click()
  const copy = page.locator('#division-2 [data-marker-copy]')
  await expect(copy).toBeVisible()
  const box = (await copy.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.move(box.x + 30, box.y + 24)
  await expect(page.locator('[data-cursor-label]')).toHaveText('Human care')
  await expect(page.locator('[data-cursor]')).toHaveAttribute('data-active', 'true')
  // Scrolling on to the next division without moving the pointer does not keep naming this one.
  await portraitPhase(page, 77.5)
  await expect(page.locator('[data-cursor]')).toHaveAttribute('data-active', 'false')
  await page.mouse.move(5, 790)
  await expect(page.locator('[data-cursor]')).toHaveAttribute('data-active', 'false')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-cursor]')).toBeHidden()
})

test('controls inside a chapter that is not on screen cannot take focus, and the page hydrates without a mismatch', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await page.getByRole('button', { name: 'Go to Intelligence orchestration', exact: true }).click()
  await expect(page.locator('#division-1')).not.toHaveAttribute('inert', '')
  await expect(page.locator('#human')).toHaveAttribute('inert', '')
  await page.locator('#human [data-magnetic]').focus()
  expect(await page.evaluate(() => !!document.activeElement?.closest('#human'))).toBe(false)
  expect(errors.filter(text => /hydrat/i.test(text))).toEqual([])
  await page.getByRole('button', { name: 'READ THE STORY', exact: true }).click()
  await expect(page.locator('[data-chapter][inert]')).toHaveCount(0)
})

test('a division fades in empty and its words arrive once: no flash of the full copy on the first pass down', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await portraitPhase(page, 81.4)
  const panel = page.locator('#division-4')
  const read = () => panel.evaluate(element => ({
    panel: Number(getComputedStyle(element).opacity),
    copy: Number(getComputedStyle(element.querySelector('[data-marker-copy]')!).opacity),
    line: new DOMMatrix(getComputedStyle(element.querySelector('[data-marker-line]')!).transform).a,
  }))
  const entering = await read()
  expect(entering.panel).toBeGreaterThan(.2)
  expect(entering.copy).toBe(0)
  expect(entering.line).toBeLessThan(.9)
  await portraitPhase(page, 83)
  expect((await read()).copy).toBe(1)
})

test('if the scripts never start, the opening words do not stay faint', async ({ page }) => {
  await page.route('**/_next/static/chunks/**', route => route.abort())
  await page.goto('/')
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(page.locator('main')).not.toHaveAttribute('data-loading', /.*/)
  await expect.poll(() => h1.evaluate(element => Math.min(...Array.from(element.children, child => Number(getComputedStyle(child).opacity)))), { timeout: 9000 }).toBeGreaterThan(.99)
})

test('the ecosystem stands to the right of the founder at the end, and the last screen is the end of the page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await portraitPhase(page, 100)
  const nav = page.locator('[data-legacy-divisions]')
  await expect(nav).toHaveCSS('opacity', '1')
  for (const name of divisionNames) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
  const list = (await nav.locator('a').first().boundingBox())!, film = (await page.locator('[data-film]').boundingBox())!, copy = (await page.locator('#human [data-marker-copy]').boundingBox())!
  expect(list.x).toBeGreaterThan(film.x + film.width / 2)
  expect(list.x).toBeGreaterThan(copy.x + copy.width)
  expect(list.x + list.width).toBeLessThanOrEqual(1280)
  // Scrolled as far as the page goes, the stage still fills the window: nothing scrolls in below it.
  const flush = async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    return page.locator('[data-stage]').evaluate(stage => { const box = stage.getBoundingClientRect(); return [Math.round(box.top), Math.round(box.bottom - window.innerHeight)] })
  }
  await expect.poll(flush).toEqual([0, 0])
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(nav).toBeHidden()
  await expect.poll(flush).toEqual([0, 0])
})

test('no text is smaller than 11 px on a desktop or 10 px on a phone, and the legacy clears the controls on a short phone', async ({ page }) => {
  // Every element that holds its own words; the registered mark (®) is a sign, not text.
  const smallest = () => page.locator('main').evaluate(main => Math.min(...Array.from(main.querySelectorAll('*'))
    .filter(element => Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && /[\p{L}\p{N}]/u.test(node.textContent ?? '')))
    .map(element => Number.parseFloat(getComputedStyle(element).fontSize))))
  for (const [width, height, floor] of [[1280, 800, 11], [375, 812, 10]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
    expect(await smallest(), `${width}x${height}`).toBeGreaterThanOrEqual(floor)
  }
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
  await portraitPhase(page, 100)
  const cta = (await page.locator('#human [data-magnetic]').boundingBox())!, controls = (await page.locator('footer').boundingBox())!
  expect(cta.y + cta.height).toBeLessThanOrEqual(controls.y)
})

test('the network chapter names the SentraSquad one by one after its title, each out of a burst of light, on desktop, phone and short phone', async ({ page }) => {
  const squad = ['Asyraf Hadi', 'dr. Novi Dwi Anggraini', 'Joseph Arianto', 'Farhan Nugroho', 'Kevin Susanto']
  for (const [width, height] of [[1280, 800], [375, 812], [360, 640]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await expect(page.locator('main')).toHaveAttribute('data-enhanced', 'cinematic')
    const members = page.locator('#network [data-squad-name]')
    await portraitPhase(page, 60.3)
    await expect(members.first()).toHaveCSS('opacity', '0')
    await portraitPhase(page, 63.5)
    await expect(page.locator('#network [data-squad] > p')).toHaveText('SentraSquad')
    for (const [i, name] of squad.entries()) {
      await expect(members.nth(i).locator('strong')).toHaveText(name)
      await expect(members.nth(i)).toHaveCSS('opacity', '1')
      await expect(members.nth(i)).toHaveCSS('filter', 'blur(0px) brightness(1)')
      const box = (await members.nth(i).boundingBox())!
      expect(box.x, `${width}: ${name} left`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `${width}: ${name} right`).toBeLessThanOrEqual(width)
    }
    const last = (await members.last().boundingBox())!, controls = (await page.locator('footer').boundingBox())!
    expect(last.y + last.height, `${width}: clears the controls`).toBeLessThanOrEqual(controls.y)
    const header = (await page.locator('header').boundingBox())!, eyebrow = (await page.locator('#network [data-marker-copy] > p').first().boundingBox())!
    expect(eyebrow.y, `${width}x${height}: the chapter starts below the header`).toBeGreaterThanOrEqual(header.y + header.height)
  }
  await expect(page.locator('#network [data-squad-name]').nth(3).locator('span')).toHaveText('FULLSTACK + INFRASTRUCTURE MAINTENANCE LEAD')
  // In the moment a name arrives its burst is alight behind it; once it has settled the light is gone.
  const burst = page.locator('#network [data-burst]').first()
  await portraitPhase(page, 61.55)
  expect(Number(await burst.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(.3)
  await portraitPhase(page, 63.5)
  await expect(burst).toHaveCSS('opacity', '0')
})
