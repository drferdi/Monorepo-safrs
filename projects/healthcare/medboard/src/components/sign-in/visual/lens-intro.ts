/**
 * Opening lens: fine lines sweep in from both sides and part around the
 * lockup, then release and dissolve as the network behind them grows.
 * Draws on its own transparent 2D canvas above the WebGL field and stops
 * itself when finished.
 */
import { NEURAL_INTRO } from './neural-field'
import type { LensHandle, Palette, RGB } from './palette'

const LINES = 72
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
const easeOut = (v: number): number => 1 - (1 - v) ** 3
const easeInOut = (v: number): number => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)
const rgba = (c: RGB, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`

interface Wave {
  amp: number
  freq: number
  phase: number
  speed: number
}

interface Line {
  index: number
  layer: number
  y0: number
  stag: number
  side: number
  lensK: number
  alpha: number
  waves: Wave[]
}

export function createLensIntro(canvas: HTMLCanvasElement, getPalette: () => Palette): LensHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is unavailable')
  let seed = 20261006
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const range = (min: number, max: number): number => min + rand() * (max - min)

  const lines: Line[] = Array.from({ length: LINES }, (_, i) => {
    const roll = rand()
    const y0 = range(-0.08, 1.08)
    return {
      index: i,
      layer: roll < 0.48 ? 0 : roll < 0.84 ? 1 : 2,
      y0,
      stag: (i * 0.618) % 1,
      side: y0 < 0.5 ? -1 : 1,
      lensK: 0.75 + 0.5 * Math.min(1, Math.abs(y0 - 0.5) * 2),
      alpha: range(0.55, 1),
      waves: [0, 1, 2].map((k) => ({
        amp: range(0.012, 0.05) / (k + 1) ** 0.6,
        freq: range(1.8, 4.2) * (k + 1),
        phase: range(0, 6.28),
        speed: range(0.03, 0.1) * (rand() < 0.5 ? -1 : 1),
      })),
    }
  })

  let W = 0
  let H = 0
  let dpr = 1
  let raf = 0
  let last = 0
  let t = 0
  let rate = 1
  let done = false

  const draw = (): void => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const p = clamp01((t - NEURAL_INTRO.releaseAt) / NEURAL_INTRO.releaseDur)
    const fade = clamp01(1 - p * 1.15)
    if (fade <= 0.003) {
      done = true
      return
    }
    const P = getPalette()
    const lensA = Math.min(0.26, 155 / H)
    const lensR = Math.min(0.42, 340 / W)
    const gradient = (color: RGB, alpha: number): CanvasGradient => {
      const g = ctx.createLinearGradient(0, 0, W, 0)
      g.addColorStop(0, rgba(color, alpha * 0.3))
      g.addColorStop(0.16, rgba(color, alpha))
      g.addColorStop(0.84, rgba(color, alpha))
      g.addColorStop(1, rgba(color, alpha * 0.3))
      return g
    }
    const styles = [
      { stroke: gradient(P.lineFar, 0.11), width: 1.9 },
      { stroke: gradient(P.lineMid, 0.36), width: 0.75 },
      { stroke: gradient(P.lineNear, 0.62), width: 0.95 },
    ]
    const step = Math.max(0.008, 14 / W)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const line of lines) {
      const rev = easeOut(clamp01((t / NEURAL_INTRO.reveal) * 1.5 - line.stag * 0.5))
      const held = 1 - easeInOut(clamp01(p * 1.5 - line.stag * 0.5))
      const span = 1.04 * rev
      if (span < 0.002) continue
      const yAt = (x: number): number => {
        let y = line.y0 - 0.14 * (x - 0.5)
        for (const w of line.waves) y += w.amp * Math.sin(w.freq * x + w.phase + w.speed * (t + 40))
        const d = (x - 0.5) / lensR
        const target = 0.5 + line.side * (0.006 + line.lensK * lensA * Math.exp(-d * d)) + (line.y0 - 0.5) * 0.03
        return (y + (target - y) * held) * H
      }
      const from = line.index % 2 ? 1.02 - span : -0.02
      const to = line.index % 2 ? 1.02 : -0.02 + span
      ctx.lineWidth = styles[line.layer].width
      ctx.strokeStyle = styles[line.layer].stroke
      ctx.globalAlpha = line.alpha * fade
      let x = from
      let prevX = x * W
      let prevY = yAt(x)
      ctx.beginPath()
      ctx.moveTo(prevX, prevY)
      while (x < to) {
        x = Math.min(to, x + step)
        const X = x * W
        const Y = yAt(x)
        ctx.quadraticCurveTo(prevX, prevY, (prevX + X) / 2, (prevY + Y) / 2)
        prevX = X
        prevY = Y
      }
      ctx.lineTo(prevX, prevY)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  function frame(now: number): void {
    t += Math.min(0.5, (now - last) / 1000 || 0) * rate
    last = now
    draw()
    if (!done) raf = requestAnimationFrame(frame)
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect()
    W = Math.round(rect.width)
    H = Math.round(rect.height)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(W * dpr))
    canvas.height = Math.max(1, Math.round(H * dpr))
    if (W && H && !done) draw()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()
  last = performance.now()
  raf = requestAnimationFrame(frame)

  return {
    skip() {
      t = Math.max(t, NEURAL_INTRO.releaseAt)
      rate = 2.4
    },
    destroy() {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
    },
  }
}
