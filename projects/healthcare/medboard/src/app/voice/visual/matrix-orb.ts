/**
 * Audrey as a dot-matrix orb (Chief 2026-10-07, after rareui.com/components/matrixorb, in MedBoard
 * colours): a square grid of dots cut to a circle. At rest the orb breathes softly; while
 * listening it blooms from its centre; while thinking a bright spot travels around it. Written
 * here from the reference's behaviour, not copied from its source. Paused off-screen and in
 * hidden tabs; one still frame when the viewer asks for less motion.
 */

export type OrbMotion = 'idle' | 'listening' | 'thinking'

export interface OrbDot {
  /** -1..1 across the orb */
  u: number
  /** -1..1 down the orb */
  v: number
}

const TAU = Math.PI * 2

/** The dots of a `dots` x `dots` grid that fall inside the orb's circle. */
export function orbGrid(dots: number): OrbDot[] {
  const grid: OrbDot[] = []
  for (let row = 0; row < dots; row++) {
    for (let col = 0; col < dots; col++) {
      const u = (col / (dots - 1)) * 2 - 1
      const v = (row / (dots - 1)) * 2 - 1
      if (Math.hypot(u, v) <= 1) grid.push({ u, v })
    }
  }
  return grid
}

/** How lit and how large a dot is at time `t` (seconds), 0..1. */
export function dotLevel(dot: OrbDot, motion: OrbMotion, t: number): number {
  const r = Math.hypot(dot.u, dot.v)
  if (motion === 'thinking') {
    const angle = t * 2.4
    const d = Math.hypot(dot.u - 0.42 * Math.cos(angle), dot.v - 0.42 * Math.sin(angle))
    return 0.08 + 0.92 * (0.75 * Math.exp(-((d / 0.38) ** 2)) + 0.15 * Math.exp(-((r / 0.5) ** 2)))
  }
  const bloom =
    motion === 'listening'
      ? 0.66 + 0.18 * Math.sin(t * 2.1) + 0.1 * Math.sin(t * 5.3 + 1)
      : 0.22 + 0.06 * Math.sin((t * TAU) / 4.5)
  const reach = motion === 'listening' ? 0.35 + 0.35 * bloom : 0.7
  return 0.08 + 0.92 * bloom * Math.exp(-((r / reach) ** 2))
}

export interface MatrixOrbHandle {
  setMotion(motion: OrbMotion): void
  setStill(still: boolean): void
  destroy(): void
}

const DOTS = 13

/** Draws the orb on `canvas` in the canvas's CSS `color`. */
export function createMatrixOrb(canvas: HTMLCanvasElement): MatrixOrbHandle | null {
  const context = canvas.getContext('2d')
  if (!context) return null
  // Bound once so the hoisted draw functions below see a context, not a possible null.
  const ctx: CanvasRenderingContext2D = context

  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const grid = orbGrid(DOTS)
  // Each dot eases toward its target, so a change of state flows rather than jumps.
  const levels = Float32Array.from(grid, (d) => dotLevel(d, 'idle', 0))

  let motion: OrbMotion = 'idle'
  let still = false
  let visible = true
  let frame = 0
  let last = 0
  let width = 0
  let height = 0
  let dpr = 1

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    draw()
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const radius = Math.min(width, height) * 0.46
    const step = (radius * 2) / (DOTS - 1)
    ctx.fillStyle = getComputedStyle(canvas).color
    grid.forEach((d, i) => {
      const level = levels[i]
      ctx.globalAlpha = 0.3 + 0.7 * level
      ctx.beginPath()
      ctx.arc(width / 2 + d.u * radius, height / 2 + d.v * radius, step * 0.5 * (0.12 + 0.86 * level), 0, TAU)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }

  function settle(t: number) {
    grid.forEach((d, i) => {
      levels[i] = dotLevel(d, motion, t)
    })
  }

  function step(now: number) {
    const t = now / 1000
    const dt = last ? Math.min(0.1, t - last) : 0
    last = t
    const ease = 1 - Math.exp(-dt * 6)
    grid.forEach((d, i) => {
      levels[i] += (dotLevel(d, motion, t) - levels[i]) * ease
    })
    draw()
    frame = requestAnimationFrame(step)
  }

  function sync() {
    cancelAnimationFrame(frame)
    frame = 0
    if (still || reducedQuery.matches || !visible || document.hidden) {
      settle(0)
      draw()
      return
    }
    last = 0
    frame = requestAnimationFrame(step)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    sync()
  })
  viewObserver.observe(canvas)
  document.addEventListener('visibilitychange', sync)
  reducedQuery.addEventListener('change', sync)
  resize()
  sync()

  return {
    setMotion(next) {
      motion = next
      if (!frame) sync()
    },
    setStill(next) {
      still = next
      sync()
    },
    destroy() {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      viewObserver.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reducedQuery.removeEventListener('change', sync)
    },
  }
}
