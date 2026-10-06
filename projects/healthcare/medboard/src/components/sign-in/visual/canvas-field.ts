/**
 * Intelligence field: a living neural network rendered on one 2D canvas.
 *
 * Procedural neurons (soma + branching dendrites) sit on four depth planes.
 * The near plane is drawn sharp with a glass-like body, rim light and specular
 * streaks; the planes behind and in front are drawn at low resolution so they
 * read as out of focus. Signals travel along dendrites, charge the soma, and
 * fire onward to other cells. Warm sparks drift through the volume.
 *
 * The opening sequence first shows fine lines parting into a lens around the
 * lockup, then the lines dissolve while the network grows outward.
 *
 * No dependencies.
 */
import type { FieldHandle, Palette, RGB } from './palette'

const TAU = Math.PI * 2
const STEP = 12 // world units between dendrite samples
const MAX_REACH = 1150
const MAX_LINES = 72
const MAX_PULSES = 16

/** Opening sequence timing (seconds). */
export const INTRO = { reveal: 1.1, releaseAt: 3.8, releaseDur: 1.7, growDur: 2.7 }

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
const easeOut = (v: number): number => 1 - (1 - v) ** 3
const easeInOut = (v: number): number => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)
const rgba = (c: RGB, a: number): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* World construction                                                   */
/* ------------------------------------------------------------------ */

interface Branch {
  level: number
  parent: number
  parentAt: number
  n: number
  d0: number
  kids: number[]
  w: Float32Array
  bx: Float32Array
  by: Float32Array
  X: Float32Array
  Y: Float32Array
  NX: Float32Array
  NY: Float32Array
  m: number
  frac: number
}

interface Ring {
  tilt: number
  rot: number
  spin: number
}

interface Neuron {
  x: number
  y: number
  r: number
  branches: Branch[]
  roots: number[]
  tips: number[]
  reachMax: number
  phase: number
  delay: number
  cx: number
  cy: number
  charge: number
  energy: number
  nextSpark: number
  rings: Ring[]
}

interface NeuronConfig {
  x: number
  y: number
  r: number
  arms: number
  reach: [number, number]
  levels: number
  angles?: number[]
  branchiness?: number
  w0?: number
}

interface Spark {
  x: number
  y: number
  z: number
  size: number
  vx: number
  vy: number
  phase: number
  rate: number
  warm: boolean
}

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
  g: number
  rev: number
}

interface Pulse {
  neuron: Neuron
  b: number
  i: number
  dir: number
  speed: number
  wait: number
}

interface Flash {
  x: number
  y: number
  life: number
  near: boolean
}

interface World {
  near: Neuron[]
  mid: Neuron[]
  far: Neuron[]
  fore: Neuron[]
  sparks: Spark[]
  lines: Line[]
  rand: () => number
}

function buildNeuron(rand: () => number, cfg: NeuronConfig): Neuron {
  const { x, y, r, arms, reach, levels, angles, branchiness = 1 } = cfg
  const w0 = cfg.w0 ?? r * 0.27
  const range = (min: number, max: number): number => min + rand() * (max - min)
  const branches: Branch[] = []
  const base = range(0, TAU)

  const grow = (
    sx: number,
    sy: number,
    angle: number,
    length: number,
    width: number,
    level: number,
    d0: number,
    parent: number,
    parentAt: number,
  ): void => {
    const n = Math.max(5, Math.round(length / STEP))
    const size = n + 1
    const br: Branch = {
      level, parent, parentAt, n, d0,
      kids: [],
      w: new Float32Array(size),
      bx: new Float32Array(size),
      by: new Float32Array(size),
      X: new Float32Array(size),
      Y: new Float32Array(size),
      NX: new Float32Array(size),
      NY: new Float32Array(size),
      m: 0,
      frac: 0,
    }
    const index = branches.push(br) - 1
    if (parent >= 0) branches[parent].kids.push(index)

    let px = sx
    let py = sy
    let a = angle
    let wander = 0
    const curl = range(-0.011, 0.011)
    const spawn: number[] = []
    const chance = (level === 0 ? 0.075 : 0.06) * branchiness
    for (let i = 0; i <= n; i++) {
      const t = i / n
      br.bx[i] = px
      br.by[i] = py
      const flare = level === 0 ? r * 0.64 * Math.exp(-(i * STEP) / (r * 0.8)) : 0
      br.w[i] = width * (1 - 0.87 * t) + 0.45 + flare
      if (level < levels && i > 3 && i < n - 3 && rand() < chance) spawn.push(i, a)
      wander = wander * 0.86 + range(-0.045, 0.045)
      a += curl + wander + (angle - a) * (level === 0 ? 0.03 : 0.015) // drift back toward the outward heading, so arms never loop
      px += Math.cos(a) * STEP
      py += Math.sin(a) * STEP
    }
    for (let k = 0; k < spawn.length; k += 2) {
      const i = spawn[k]
      const t = i / n
      const side = rand() < 0.5 ? -1 : 1
      grow(
        br.bx[i], br.by[i],
        spawn[k + 1] + side * range(0.4, 1.0),
        length * (1 - t) * range(0.5, 0.9) + 40,
        (width * (1 - 0.87 * t) + 0.45) * 0.7,
        level + 1, d0 + i * STEP, index, i,
      )
    }
  }

  let reachMax = 0
  for (let k = 0; k < arms; k++) {
    const a = angles ? angles[k] : base + (k / arms) * TAU + range(-0.32, 0.32)
    const length = range(reach[0], reach[1])
    reachMax = Math.max(reachMax, length)
    grow(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, a, length, w0 * range(0.75, 1.15), 0, 0, -1, 0)
  }

  const roots: number[] = []
  const tips: number[] = []
  branches.forEach((br, i) => {
    if (br.level === 0) roots.push(i)
    if (br.level > 0 || levels === 0) tips.push(i)
  })

  return {
    x, y, r, branches, roots, tips,
    reachMax: reachMax + r,
    phase: range(0, TAU),
    delay: Math.min(1, Math.hypot(x, y) / 1000),
    cx: x, cy: y,
    charge: 0, energy: 0,
    nextSpark: range(0.4, 2.4),
    rings: Array.from({ length: 7 }, () => ({
      tilt: range(0, TAU),
      rot: range(0, TAU),
      spin: range(0.06, 0.16) * (rand() < 0.5 ? -1 : 1),
    })),
  }
}

function buildWorld(): World {
  const rand = mulberry32(7741)
  const range = (min: number, max: number): number => min + rand() * (max - min)
  const N = (cfg: NeuronConfig): Neuron => buildNeuron(rand, cfg)

  // Only the hero cell sits on the focal plane; its neighbours are slightly out of focus.
  const near = [N({ x: 30, y: -30, r: 38, arms: 8, reach: [420, 760], levels: 3 })]
  const midSpecs: Array<[number, number, number]> = [
    [-640, 300, 26], [650, -340, 25], [-360, -390, 21], [420, 300, 20], [-150, 470, 18], [760, 130, 20], [-800, -160, 20],
  ]
  const mid = midSpecs.map(([x, y, r]) => N({ x, y, r, arms: 6, reach: [280, 580], levels: 2 }))
  const far = Array.from({ length: 8 }, (_, i) =>
    N({
      x: -900 + (i % 4) * 600 + range(-160, 160),
      y: (i < 4 ? -280 : 280) + range(-170, 170),
      r: range(15, 22),
      arms: 5,
      reach: [240, 480],
      levels: 1,
      w0: range(7, 10),
    }),
  )
  const fore = [
    N({ x: -1000, y: -660, r: 60, arms: 3, angles: [0.2, 0.52, 0.95], reach: [900, 1350], levels: 1, w0: 34, branchiness: 0.5 }),
    N({ x: 1020, y: 660, r: 60, arms: 2, angles: [3.45, 3.95], reach: [800, 1250], levels: 0, w0: 30 }),
  ]

  const sparks: Spark[] = Array.from({ length: 72 }, () => ({
    x: range(-1000, 1000),
    y: range(-580, 580),
    z: rand(),
    size: range(0.7, 1.7),
    vx: range(-7, 7),
    vy: range(-9, 3),
    phase: range(0, TAU),
    rate: range(0.4, 1.3),
    warm: rand() < 0.78,
  }))

  // Opening lens lines
  const lines: Line[] = []
  for (let i = 0; i < MAX_LINES; i++) {
    const roll = rand()
    const y0 = range(-0.08, 1.08)
    lines.push({
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
        phase: range(0, TAU),
        speed: range(0.03, 0.1) * (rand() < 0.5 ? -1 : 1),
      })),
      g: 1,
      rev: 0,
    })
  }

  return { near, mid, far, fore, sparks, lines, rand }
}

/* ------------------------------------------------------------------ */
/* Geometry                                                             */
/* ------------------------------------------------------------------ */

const scratch = new Float32Array(4096)

/** Positions every visible sample of a neuron for this frame (gentle sway, growth front). */
function poseNeuron(neuron: Neuron, time: number, grown: number): void {
  const ph = neuron.phase
  const sway = (x: number, y: number, d: number, out: Branch, i: number): void => {
    const amp = 1.5 + Math.min(16, d * 0.022)
    out.X[i] = x + amp * (Math.sin(time * 0.31 + y * 0.0052 + ph) + 0.5 * Math.sin(time * 0.17 + x * 0.0031 + ph * 1.7))
    out.Y[i] = y + amp * (Math.cos(time * 0.27 + x * 0.0047 + ph * 1.3) + 0.5 * Math.cos(time * 0.21 + y * 0.0029 + ph))
  }
  const amp0 = 1.5
  neuron.cx = neuron.x + amp0 * (Math.sin(time * 0.31 + neuron.y * 0.0052 + ph) + 0.5 * Math.sin(time * 0.17 + neuron.x * 0.0031 + ph * 1.7))
  neuron.cy = neuron.y + amp0 * (Math.cos(time * 0.27 + neuron.x * 0.0047 + ph * 1.3) + 0.5 * Math.cos(time * 0.21 + neuron.y * 0.0029 + ph))

  for (const br of neuron.branches) {
    const vis = (grown - br.d0) / STEP
    if (vis <= 0) {
      br.m = 0
      continue
    }
    const whole = Math.floor(vis)
    br.m = Math.min(br.n + 1, whole + 1)
    br.frac = br.m <= br.n ? vis - whole : 0
    const last = Math.min(br.m, br.n)
    for (let i = 0; i <= last; i++) sway(br.bx[i], br.by[i], br.d0 + i * STEP, br, i)
  }
}

/** Adds one tapered ribbon (closed outline) for a branch to the current path. */
function ribbon(g: CanvasPath, br: Branch): void {
  const { X, Y, w, NX, NY, m, n } = br
  const L = m - 1
  if (L < 0) return
  const hasTip = m <= n
  if (L === 0 && !hasTip) return
  const tipX = hasTip ? X[L] + (X[L + 1] - X[L]) * br.frac : 0
  const tipY = hasTip ? Y[L] + (Y[L + 1] - Y[L]) * br.frac : 0

  for (let i = 0; i <= L; i++) {
    const ax = X[i > 0 ? i - 1 : 0]
    const ay = Y[i > 0 ? i - 1 : 0]
    const bx = i < L ? X[i + 1] : hasTip ? tipX : X[L]
    const by = i < L ? Y[i + 1] : hasTip ? tipY : Y[L]
    const dx = bx - ax
    const dy = by - ay
    const inv = 1 / (Math.hypot(dx, dy) || 1)
    const nx = -dy * inv
    const ny = dx * inv
    NX[i] = nx
    NY[i] = ny
    const h = w[i] * 0.5
    if (i === 0) g.moveTo(X[i] + nx * h, Y[i] + ny * h)
    else g.lineTo(X[i] + nx * h, Y[i] + ny * h)
    scratch[i * 2] = X[i] - nx * h
    scratch[i * 2 + 1] = Y[i] - ny * h
  }
  if (hasTip) g.lineTo(tipX, tipY)
  for (let i = L; i >= 0; i--) g.lineTo(scratch[i * 2], scratch[i * 2 + 1])
  g.closePath()
}

/** Adds the specular streak of a branch (offset toward the light) to the current path. */
function streak(g: CanvasPath, br: Branch): void {
  const { X, Y, w, NX, NY, m } = br
  if (m < 2) return
  for (let i = 0; i < m; i++) {
    const facing = Math.max(-1, Math.min(1, (NX[i] * -0.6 + NY[i] * -0.8) * 1.6))
    const o = w[i] * 0.28 * facing
    if (i === 0) g.moveTo(X[i] + NX[i] * o, Y[i] + NY[i] * o)
    else g.lineTo(X[i] + NX[i] * o, Y[i] + NY[i] * o)
  }
}

function somaPath(g: CanvasRenderingContext2D, neuron: Neuron, r: number, time: number): void {
  g.beginPath()
  for (let k = 0; k <= 44; k++) {
    const th = (k / 44) * TAU
    const rr = r * (1 + 0.07 * Math.sin(3 * th + neuron.phase + time * 0.2) + 0.045 * Math.sin(5 * th - neuron.phase * 2 - time * 0.13))
    const x = neuron.cx + Math.cos(th) * rr
    const y = neuron.cy + Math.sin(th) * rr
    if (k === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
}

/* ------------------------------------------------------------------ */
/* Field                                                                */
/* ------------------------------------------------------------------ */

interface Layer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  k: number
}

interface Sprites {
  warmPoint: HTMLCanvasElement
  warmBokeh: HTMLCanvasElement
  coolPoint: HTMLCanvasElement
  coolBokeh: HTMLCanvasElement
  pulse: HTMLCanvasElement
}

interface SoftLayerOptions {
  alpha: number
  mode?: GlobalCompositeOperation
  layerAlpha?: number
  streaks?: boolean
  soma?: number
  pulses?: boolean
}

interface Pointer {
  nx: number
  ny: number
  tx: number
  ty: number
  x: number
  y: number
  inside: boolean
  moved: number
}

interface IntroState {
  t: number
  rate: number
}

function context2d(canvas: HTMLCanvasElement, settings?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const g = canvas.getContext('2d', settings)
  if (!g) throw new Error('2D canvas is unavailable')
  return g
}

export function createIntelligenceField(
  canvas: HTMLCanvasElement,
  getPalette: () => Palette,
  options: { intro?: boolean } = {},
): FieldHandle {
  const ctx = context2d(canvas, { alpha: false })
  const world = buildWorld()
  const rand = world.rand
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  const makeLayer = (k: number): Layer => {
    const c = document.createElement('canvas')
    return { canvas: c, ctx: context2d(c), k }
  }
  // Low-resolution planes: drawing small and scaling up is what puts them out of focus.
  const baseLayer = makeLayer(1 / 5) // background light + far neurons
  const midLayer = makeLayer(1 / 2.5)
  const glowLayer = makeLayer(1 / 4) // bloom of the in-focus plane
  const hazeLayer = makeLayer(1 / 9) // wide bloom + foreground strands

  let W = 0
  let H = 0
  let cw = 0
  let ch = 0
  let dpr = 1
  let quality = 1 // steps down on slow machines (see frame())
  let slowFrames = 0
  let warm = 0
  let scale = 1
  let raf = 0
  let last = 0
  let time = 40
  let onScreen = true
  let camX = 0
  let camY = 0
  let sprites: Sprites | null = null
  let spritesFor: Palette | null = null
  let hoverIn = 0

  const pulses: Pulse[] = []
  const flashes: Flash[] = []
  const pointer: Pointer = { nx: 0, ny: 0, tx: 0, ty: 0, x: 0, y: 0, inside: false, moved: 0 }

  let intro: IntroState | null = options.intro && !reduceQuery.matches ? { t: 0, rate: 1 } : null
  let introG = intro ? 1 : 0 // 1 = lens held
  let lineFade = intro ? 1 : 0
  let growth = intro ? 0 : 1 // 0..1 network growth
  let ambient = intro ? 0.35 : 1 // sparks and nebula presence
  let lensA = 0.15
  let lensR = 0.3

  function endIntro(): void {
    intro = null
    introG = 0
    lineFade = 0
    growth = 1
    ambient = 1
  }

  function applyIntro(dt: number): void {
    if (!intro) return
    intro.t += dt * intro.rate
    const p = clamp01((intro.t - INTRO.releaseAt) / INTRO.releaseDur)
    introG = 1 - easeInOut(p)
    lineFade = clamp01(1 - p * 1.15)
    lensA = Math.min(0.26, 155 / H)
    lensR = Math.min(0.42, 340 / W)
    for (const line of world.lines) {
      line.rev = easeOut(clamp01((intro.t / INTRO.reveal) * 1.5 - line.stag * 0.5))
      line.g = 1 - easeInOut(clamp01(p * 1.5 - line.stag * 0.5))
    }
    const gp = clamp01((intro.t - INTRO.releaseAt - 0.2) / INTRO.growDur)
    growth = gp
    ambient = 0.35 + 0.65 * easeInOut(clamp01(gp * 1.6))
    if (gp >= 1) endIntro()
  }

  const grownFor = (neuron: Neuron): number =>
    growth >= 1 ? MAX_REACH * 2 : easeOut(clamp01(growth * 1.3 - neuron.delay * 0.3)) * MAX_REACH

  /** 0..1 as a cell body fades in at the start of its growth. */
  const appearFor = (neuron: Neuron): number => clamp01(grownFor(neuron) / (neuron.r * 5))

  /* ---------------- signals ---------------- */

  function spawnInbound(neuron: Neuron, wait = 0, tipIndex = -1): void {
    if (pulses.length >= MAX_PULSES || !neuron.tips.length) return
    const b = tipIndex >= 0 ? tipIndex : neuron.tips[Math.floor(rand() * neuron.tips.length)]
    pulses.push({ neuron, b, i: neuron.branches[b].n, dir: -1, speed: 16 + rand() * 10, wait })
  }

  function fire(neuron: Neuron): void {
    neuron.charge = 0
    neuron.energy = 1
    const count = Math.min(neuron.roots.length, 2 + Math.floor(rand() * 2))
    for (let k = 0; k < count; k++) {
      const b = neuron.roots[Math.floor(rand() * neuron.roots.length)]
      pulses.push({ neuron, b, i: 0, dir: 1, speed: 24 + rand() * 12, wait: k * 0.08 })
    }
  }

  function updateSignals(dt: number): void {
    const active = world.near.concat(world.mid)
    for (const neuron of active) {
      neuron.energy *= Math.exp(-dt * 1.5)
      neuron.charge *= Math.exp(-dt * 0.12)
      neuron.nextSpark -= dt
      if (neuron.nextSpark <= 0) {
        spawnInbound(neuron)
        neuron.nextSpark = 0.7 + rand() * 2.6
      }
    }

    // Pointer excites the nearest dendrite tip
    hoverIn -= dt
    pointer.moved -= dt
    if (pointer.inside && pointer.moved > 0 && hoverIn <= 0) {
      hoverIn = 0.4
      const wx = (pointer.x - W / 2 - camX) / scale
      const wy = (pointer.y - H / 2 - camY) / scale
      const reach = 150 / scale
      let best: [Neuron, number] | null = null
      let bestD = reach * reach
      for (const neuron of world.near) {
        for (const b of neuron.tips) {
          const br = neuron.branches[b]
          const dx = br.X[br.n] - wx
          const dy = br.Y[br.n] - wy
          const d = dx * dx + dy * dy
          if (d < bestD) {
            bestD = d
            best = [neuron, b]
          }
        }
      }
      if (best) spawnInbound(best[0], 0, best[1])
    }

    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k]
      if (p.wait > 0) {
        p.wait -= dt
        continue
      }
      let br = p.neuron.branches[p.b]
      const before = p.i
      p.i += p.dir * p.speed * dt
      if (p.dir < 0) {
        if (p.i <= 0) {
          if (br.parent >= 0) {
            p.i += br.parentAt
            p.b = br.parent
          } else {
            p.neuron.charge += 0.5
            p.neuron.energy = Math.max(p.neuron.energy, 0.55)
            if (p.neuron.charge >= 1) fire(p.neuron)
            pulses.splice(k, 1)
          }
        }
      } else {
        for (const kid of br.kids) {
          const at = p.neuron.branches[kid].parentAt
          if (at > before && at <= p.i && rand() < 0.5) {
            p.b = kid
            p.i = 0
            br = p.neuron.branches[kid]
            break
          }
        }
        if (p.i >= br.n) {
          flashes.push({ x: br.X[br.n], y: br.Y[br.n], life: 1, near: world.near.includes(p.neuron) })
          if (rand() < 0.45) {
            const target = active[Math.floor(rand() * active.length)]
            if (target !== p.neuron) spawnInbound(target, 0.12)
          }
          pulses.splice(k, 1)
        }
      }
    }
    for (let k = flashes.length - 1; k >= 0; k--) {
      flashes[k].life -= dt * 1.6
      if (flashes[k].life <= 0) flashes.splice(k, 1)
    }
  }

  function update(dt: number, realDt: number = dt): void {
    time += dt
    applyIntro(realDt) // wall-clock, so the opening stays in step with the page
    pointer.nx += (pointer.tx - pointer.nx) * Math.min(1, dt * 2.2)
    pointer.ny += (pointer.ty - pointer.ny) * Math.min(1, dt * 2.2)
    for (const s of world.sparks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (s.x > 1040) s.x = -1040
      if (s.x < -1040) s.x = 1040
      if (s.y < -620) s.y = 620
      if (s.y > 620) s.y = -620
    }
    if (growth >= 1) updateSignals(dt)
  }

  /* ---------------- sprites ---------------- */

  function sprite(color: RGB, kind: 'point' | 'bokeh'): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    const g = context2d(c)
    const grd = g.createRadialGradient(48, 48, 0, 48, 48, 48)
    if (kind === 'point') {
      grd.addColorStop(0, 'rgba(255,255,255,1)')
      grd.addColorStop(0.1, rgba(color, 0.95))
      grd.addColorStop(0.36, rgba(color, 0.26))
      grd.addColorStop(1, rgba(color, 0))
    } else {
      grd.addColorStop(0, rgba(color, 0.6))
      grd.addColorStop(0.55, rgba(color, 0.44))
      grd.addColorStop(0.82, rgba(color, 0.12))
      grd.addColorStop(1, rgba(color, 0))
    }
    g.fillStyle = grd
    g.fillRect(0, 0, 96, 96)
    return c
  }

  function ensureSprites(P: Palette): Sprites {
    if (sprites && spritesFor === P) return sprites
    spritesFor = P
    sprites = {
      warmPoint: sprite(P.warm, 'point'),
      warmBokeh: sprite(P.warm, 'bokeh'),
      coolPoint: sprite(P.cool, 'point'),
      coolBokeh: sprite(P.cool, 'bokeh'),
      pulse: sprite(P.pulse, 'point'),
    }
    return sprites
  }

  /* ---------------- drawing ---------------- */

  const worldTransform = (g: CanvasRenderingContext2D, k: number, pf: number): void =>
    g.setTransform(scale * k, 0, 0, scale * k, (W / 2 + camX * pf) * k, (H / 2 + camY * pf) * k)

  function drawPulses(g: CanvasRenderingContext2D, neurons: Neuron[], px: number, P: Palette, sp: Sprites): void {
    g.globalCompositeOperation = 'lighter'
    g.lineCap = 'round'
    for (const p of pulses) {
      if (p.wait > 0 || !neurons.includes(p.neuron)) continue
      const br = p.neuron.branches[p.b]
      const head = Math.max(0, Math.min(br.n, p.i))
      const tail = Math.max(0, Math.min(br.n, p.i - p.dir * 7))
      const at = (f: number): [number, number] => {
        const i = Math.min(br.n - 1, Math.floor(f))
        const t = f - i
        return [br.X[i] + (br.X[i + 1] - br.X[i]) * t, br.Y[i] + (br.Y[i + 1] - br.Y[i]) * t]
      }
      const [hx, hy] = at(head)
      const [tx, ty] = at(tail)
      const width = br.w[Math.round(head)]
      const grd = g.createLinearGradient(tx, ty, hx, hy)
      grd.addColorStop(0, rgba(P.pulse, 0))
      grd.addColorStop(1, rgba(P.pulse, 0.95))
      g.strokeStyle = grd
      g.lineWidth = Math.max(px * 1.8, width * 0.8)
      g.beginPath()
      g.moveTo(tx, ty)
      const lo = Math.min(head, tail)
      const hi = Math.max(head, tail)
      const mids: number[] = []
      for (let i = Math.ceil(lo); i <= Math.floor(hi); i++) mids.push(i)
      if (p.dir < 0) mids.reverse()
      for (const i of mids) g.lineTo(br.X[i], br.Y[i])
      g.lineTo(hx, hy)
      g.stroke()
      const size = Math.max(px * 16, width * 3.4)
      g.drawImage(sp.pulse, hx - size / 2, hy - size / 2, size, size)
    }
    g.globalCompositeOperation = 'source-over'
  }

  function clearLayer(layer: Layer): void {
    const g = layer.ctx
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
  }

  function drawSoftLayer(layer: Layer, neurons: Neuron[], pf: number, color: RGB, opts: SoftLayerOptions, P: Palette, sp: Sprites): void {
    const g = layer.ctx
    const px = 1 / (scale * layer.k)
    g.globalCompositeOperation = opts.mode ?? 'source-over'
    g.globalAlpha = opts.layerAlpha ?? 1
    worldTransform(g, layer.k, pf)
    for (const neuron of neurons) {
      g.beginPath()
      for (const br of neuron.branches) ribbon(g, br)
      const grd = g.createRadialGradient(neuron.cx, neuron.cy, neuron.r, neuron.cx, neuron.cy, neuron.reachMax)
      grd.addColorStop(0, rgba(color, opts.alpha))
      grd.addColorStop(1, rgba(color, opts.alpha * 0.45))
      g.fillStyle = grd
      g.fill()
      if (opts.streaks) {
        g.beginPath()
        for (const br of neuron.branches) streak(g, br)
        g.lineWidth = px * 0.9
        g.strokeStyle = rgba(P.hi, 0.3)
        g.stroke()
      }
      if (opts.soma && grownFor(neuron) > 0) {
        const r = neuron.r * (1.15 + 0.08 * neuron.energy)
        const sg = g.createRadialGradient(neuron.cx - r * 0.3, neuron.cy - r * 0.3, 0, neuron.cx, neuron.cy, r * 1.6)
        const appear = appearFor(neuron)
        sg.addColorStop(0, rgba(P.somaCore, (0.85 * opts.soma + 0.15 * neuron.energy) * appear))
        sg.addColorStop(0.4, rgba(P.somaMid, 0.8 * opts.soma * appear))
        sg.addColorStop(1, rgba(P.somaMid, 0))
        g.fillStyle = sg
        g.beginPath()
        g.arc(neuron.cx, neuron.cy, r * 1.6, 0, TAU)
        g.fill()
      }
    }
    if (opts.pulses) drawPulses(g, neurons, px, P, sp)
    g.globalAlpha = 1
  }

  function blit(layer: Layer, alpha: number, mode: GlobalCompositeOperation = 'source-over'): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = mode
    ctx.globalAlpha = alpha
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(layer.canvas, 0, 0, W * layer.k, H * layer.k, 0, 0, cw, ch)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawNearNeuron(g: CanvasRenderingContext2D, neuron: Neuron, P: Palette, px: number): void {
    const R = neuron.reachMax
    const { cx, cy } = neuron
    if (grownFor(neuron) <= 0) return
    const appear = appearFor(neuron)

    // halo
    g.globalCompositeOperation = 'lighter'
    let grd = g.createRadialGradient(cx, cy, neuron.r * 0.6, cx, cy, neuron.r * 3.6)
    grd.addColorStop(0, rgba(P.glow, (0.2 + 0.4 * neuron.energy) * appear))
    grd.addColorStop(1, rgba(P.glow, 0))
    g.fillStyle = grd
    g.beginPath()
    g.arc(cx, cy, neuron.r * 3.6, 0, TAU)
    g.fill()
    g.globalCompositeOperation = 'source-over'

    // glass body of the dendrites
    g.beginPath()
    for (const br of neuron.branches) ribbon(g, br)
    grd = g.createRadialGradient(cx, cy, neuron.r, cx, cy, R)
    grd.addColorStop(0, rgba(P.body, 0.84))
    grd.addColorStop(0.45, rgba(P.body, 0.52))
    grd.addColorStop(1, rgba(P.body, 0.26))
    g.fillStyle = grd
    g.fill()
    grd = g.createRadialGradient(cx, cy, neuron.r, cx, cy, R)
    grd.addColorStop(0, rgba(P.edge, 0.36))
    grd.addColorStop(1, rgba(P.edge, 0.07))
    g.lineJoin = 'round'
    g.lineWidth = px * 0.8
    g.strokeStyle = grd
    g.stroke()

    // specular streaks
    g.beginPath()
    for (const br of neuron.branches) streak(g, br)
    grd = g.createRadialGradient(cx, cy, neuron.r, cx, cy, R)
    grd.addColorStop(0, rgba(P.hi, 0.9))
    grd.addColorStop(0.55, rgba(P.hi, 0.42))
    grd.addColorStop(1, rgba(P.hi, 0.14))
    g.lineCap = 'round'
    g.lineWidth = px
    g.strokeStyle = grd
    g.stroke()

    // soma
    g.globalAlpha = appear
    const r = neuron.r * (0.55 + 0.45 * appear) * (1 + 0.018 * Math.sin(time * 0.9 + neuron.phase) + 0.05 * neuron.energy)
    somaPath(g, neuron, r, time)
    grd = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.1)
    grd.addColorStop(0, rgba(P.somaCore, 0.98))
    grd.addColorStop(0.28, rgba(P.somaMid, 0.93))
    grd.addColorStop(0.78, rgba(P.somaDeep, 0.92))
    grd.addColorStop(1, rgba(P.somaMid, 0.78))
    g.fillStyle = grd
    g.fill()

    g.save()
    g.clip()
    g.lineWidth = px * 0.7
    g.strokeStyle = rgba(P.hi, 0.17)
    for (const ring of neuron.rings) {
      g.beginPath()
      g.ellipse(cx, cy, r * 1.04, r * 1.04 * Math.abs(Math.cos(ring.tilt + time * ring.spin)) + 0.01, ring.rot + time * 0.04, 0, TAU)
      g.stroke()
    }
    g.globalCompositeOperation = 'lighter'
    grd = g.createRadialGradient(cx + r * 0.1, cy + r * 0.12, 0, cx + r * 0.1, cy + r * 0.12, r * 0.85)
    grd.addColorStop(0, rgba(P.pulse, 0.1 + 0.8 * neuron.energy))
    grd.addColorStop(1, rgba(P.pulse, 0))
    g.fillStyle = grd
    g.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4)
    g.restore()
    g.globalCompositeOperation = 'source-over'

    somaPath(g, neuron, r, time)
    grd = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    grd.addColorStop(0, rgba(P.hi, 0.95))
    grd.addColorStop(0.5, rgba(P.hi, 0.16))
    grd.addColorStop(1, rgba(P.edge, 0.5))
    g.lineWidth = px * 1.3
    g.strokeStyle = grd
    g.stroke()

    g.save()
    g.translate(cx - r * 0.36, cy - r * 0.44)
    g.rotate(-0.6)
    g.scale(1, 0.55)
    grd = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.32)
    grd.addColorStop(0, 'rgba(255,255,255,0.88)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.beginPath()
    g.arc(0, 0, r * 0.32, 0, TAU)
    g.fill()
    g.restore()
    g.globalAlpha = 1
  }

  function drawSparks(zMin: number, zMax: number, sp: Sprites): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'lighter'
    for (const s of world.sparks) {
      if (s.z < zMin || s.z >= zMax) continue
      const pf = 0.2 + s.z * 1.8
      const x = W / 2 + s.x * scale + camX * pf
      const y = H / 2 + s.y * scale + camY * pf
      const blur = Math.abs(s.z - 0.55)
      const twinkle = 0.55 + 0.45 * Math.sin(time * s.rate + s.phase)
      let img: HTMLCanvasElement
      let size: number
      let alpha: number
      if (blur < 0.13) {
        img = s.warm ? sp.warmPoint : sp.coolPoint
        size = (9 + s.size * 9) * scale
        alpha = 0.95 * twinkle
      } else {
        img = s.warm ? sp.warmBokeh : sp.coolBokeh
        size = (14 + blur * 120) * s.size * scale
        alpha = (0.62 / (1 + blur * 2.4)) * (0.7 + 0.3 * twinkle)
      }
      if (x < -size || x > W + size || y < -size || y > H + size) continue
      ctx.globalAlpha = alpha * ambient * (s.warm ? 1 : 0.6)
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawFlashes(g: CanvasRenderingContext2D, sp: Sprites): void {
    g.globalCompositeOperation = 'lighter'
    for (const f of flashes) {
      if (!f.near) continue
      const size = 14 + (1 - f.life) * 34
      g.globalAlpha = f.life
      g.drawImage(sp.warmPoint, f.x - size / 2, f.y - size / 2, size, size)
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }

  /** Background light, painted small into the base plane. */
  function drawBackdrop(P: Palette): void {
    const g = baseLayer.ctx
    const k = baseLayer.k
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.fillStyle = P.bg
    g.fillRect(0, 0, baseLayer.canvas.width, baseLayer.canvas.height)
    g.setTransform(k, 0, 0, k, 0, 0)
    g.globalCompositeOperation = 'lighter'
    const big = Math.max(W, H)
    const spots: Array<[number, number, number, number]> = [
      [0.52 + 0.05 * Math.sin(time * 0.05), 0.46 + 0.04 * Math.cos(time * 0.04), 0.62, 0.36],
      [0.86 + 0.04 * Math.cos(time * 0.035), 0.2, 0.5, 0.28],
      [0.12, 0.78 + 0.04 * Math.sin(time * 0.045), 0.52, 0.24],
    ]
    spots.forEach(([fx, fy, fr, a], i) => {
      const x = fx * W + camX * 0.15
      const y = fy * H + camY * 0.15
      const grd = g.createRadialGradient(x, y, 0, x, y, fr * big)
      grd.addColorStop(0, rgba(P.nebula[i], a * ambient))
      grd.addColorStop(1, rgba(P.nebula[i], 0))
      g.fillStyle = grd
      g.fillRect(0, 0, W + 5, H + 5)
    })
    g.globalCompositeOperation = 'source-over'
  }

  /* opening lens lines (CSS pixel space) */
  function lineY(line: Line, x: number): number {
    let y = line.y0 - 0.14 * (x - 0.5)
    for (const w of line.waves) y += w.amp * Math.sin(w.freq * x + w.phase + w.speed * time)
    if (line.g > 0.001) {
      const d = (x - 0.5) / lensR
      const target = 0.5 + line.side * (0.006 + line.lensK * lensA * Math.exp(-d * d)) + (line.y0 - 0.5) * 0.03
      y += (target - y) * line.g
    }
    return y * H
  }

  function drawLens(P: Palette): void {
    if (lineFade <= 0.003) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
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
    for (const line of world.lines) {
      const span = 1.04 * line.rev
      if (span < 0.002) continue
      const from = line.index % 2 ? 1.02 - span : -0.02
      const to = line.index % 2 ? 1.02 : -0.02 + span
      ctx.lineWidth = styles[line.layer].width
      ctx.strokeStyle = styles[line.layer].stroke
      ctx.globalAlpha = line.alpha * lineFade
      let x = from
      let prevX = x * W
      let prevY = lineY(line, x)
      ctx.beginPath()
      ctx.moveTo(prevX, prevY)
      while (x < to) {
        x = Math.min(to, x + step)
        const X = x * W
        const Y = lineY(line, x)
        ctx.quadraticCurveTo(prevX, prevY, (prevX + X) / 2, (prevY + Y) / 2)
        prevX = X
        prevY = Y
      }
      ctx.lineTo(prevX, prevY)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  /** Bloom: the in-focus plane redrawn small and bright, then added back over the frame. */
  function drawGlow(P: Palette, sp: Sprites, layerAlpha: number): void {
    clearLayer(glowLayer)
    const g = glowLayer.ctx
    const px = 1 / (scale * glowLayer.k)
    worldTransform(g, glowLayer.k, 1)
    g.lineCap = 'round'
    for (const neuron of world.near) {
      if (grownFor(neuron) <= 0) continue
      g.beginPath()
      for (const br of neuron.branches) ribbon(g, br)
      g.fillStyle = rgba(P.body, 0.32)
      g.fill()
      g.beginPath()
      for (const br of neuron.branches) streak(g, br)
      g.lineWidth = px * 1.1
      g.strokeStyle = rgba(P.hi, 0.3)
      g.stroke()
      const r = neuron.r * 1.5
      const grd = g.createRadialGradient(neuron.cx, neuron.cy, 0, neuron.cx, neuron.cy, r)
      const appear = appearFor(neuron)
      grd.addColorStop(0, rgba(P.somaCore, (0.32 + 0.5 * neuron.energy) * appear))
      grd.addColorStop(0.5, rgba(P.glow, (0.26 + 0.4 * neuron.energy) * appear))
      grd.addColorStop(1, rgba(P.glow, 0))
      g.fillStyle = grd
      g.beginPath()
      g.arc(neuron.cx, neuron.cy, r, 0, TAU)
      g.fill()
    }
    drawPulses(g, world.near, px, P, sp)
    drawFlashes(g, sp)

    // wide haze = glow shrunk again, plus the out-of-focus foreground strands
    clearLayer(hazeLayer)
    const h = hazeLayer.ctx
    h.imageSmoothingEnabled = true
    h.drawImage(glowLayer.canvas, 0, 0, W * glowLayer.k, H * glowLayer.k, 0, 0, W * hazeLayer.k, H * hazeLayer.k)
    drawSoftLayer(hazeLayer, world.fore, 1.9, P.fore, { alpha: 0.3, layerAlpha, mode: 'lighter' }, P, sp)
    hazeLayer.ctx.globalCompositeOperation = 'source-over'

    blit(glowLayer, 0.4, 'lighter')
    blit(hazeLayer, 0.55, 'lighter')
  }

  function draw(): void {
    const P = getPalette()
    const sp = ensureSprites(P)
    camX = pointer.nx * 18 + Math.sin(time * 0.07) * 10
    camY = pointer.ny * 13 + Math.cos(time * 0.05) * 8
    const px = 1 / scale
    const layerAlpha = easeInOut(clamp01(growth * 1.7))

    for (const group of [world.far, world.mid, world.near, world.fore]) {
      for (const neuron of group) poseNeuron(neuron, time, grownFor(neuron))
    }

    drawBackdrop(P)
    if (growth > 0) drawSoftLayer(baseLayer, world.far, 0.25, P.farBody, { alpha: 0.5, soma: 0.5, layerAlpha: 0.9 * layerAlpha }, P, sp)
    blit(baseLayer, 1)
    drawLens(P)
    drawSparks(0, 0.35, sp)

    if (growth > 0) {
      clearLayer(midLayer)
      drawSoftLayer(midLayer, world.mid, 0.55, P.midBody, { alpha: 0.6, soma: 0.8, streaks: true, pulses: true }, P, sp)
      blit(midLayer, 0.78 * layerAlpha)

      worldTransform(ctx, dpr, 1)
      for (const neuron of world.near) drawNearNeuron(ctx, neuron, P, px)
      drawPulses(ctx, world.near, px, P, sp)
      worldTransform(ctx, dpr, 1)
      drawFlashes(ctx, sp)
      drawGlow(P, sp, layerAlpha)
    }
    drawSparks(0.35, 1.01, sp)
  }

  /* ---------------- lifecycle ---------------- */

  function frame(now: number): void {
    const real = Math.min(0.5, (now - last) / 1000 || 0)
    last = now
    update(Math.min(0.05, real), real)
    draw()

    // Adaptive resolution: patient, and never below 75% so the picture stays clean.
    warm += real
    if (warm > 4) {
      if (real > 0.045) slowFrames += 1
      else slowFrames = Math.max(0, slowFrames - 0.5)
      if (slowFrames > 45 && quality > 0.75) {
        quality = Math.max(0.75, quality - 0.125)
        slowFrames = 0
        resize()
      }
    }
    raf = requestAnimationFrame(frame)
  }

  function stop(): void {
    cancelAnimationFrame(raf)
    raf = 0
  }

  /** Runs the loop only when visible and motion is welcome; otherwise paints one still frame. */
  function sync(): void {
    stop()
    if (!W || !H) return
    if (reduceQuery.matches) {
      endIntro()
      pointer.tx = pointer.ty = pointer.nx = pointer.ny = 0
      draw()
      return
    }
    if (onScreen && !document.hidden) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect()
    W = Math.round(rect.width)
    H = Math.round(rect.height)
    if (!W || !H) return
    dpr = Math.min(window.devicePixelRatio || 1, 2) * quality
    cw = Math.max(1, Math.round(W * dpr))
    ch = Math.max(1, Math.round(H * dpr))
    canvas.width = cw
    canvas.height = ch
    scale = Math.max(H, W * 0.62, 520) / 1000
    for (const layer of [baseLayer, midLayer, glowLayer, hazeLayer]) {
      layer.canvas.width = Math.ceil(W * layer.k) + 1
      layer.canvas.height = Math.ceil(H * layer.k) + 1
    }
    draw()
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    pointer.inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height
    if (pointer.inside) {
      pointer.x = x
      pointer.y = y
      pointer.tx = -((x / rect.width) * 2 - 1)
      pointer.ty = -((y / rect.height) * 2 - 1)
      pointer.moved = 0.6
    } else {
      pointer.tx = 0
      pointer.ty = 0
    }
  }
  const onPointerLeave = (): void => {
    pointer.inside = false
    pointer.tx = 0
    pointer.ty = 0
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
    sync()
  })
  intersectionObserver.observe(canvas)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
  document.addEventListener('visibilitychange', sync)
  reduceQuery.addEventListener('change', sync)

  resize()
  sync()

  return {
    /** Repaint immediately, e.g. after a palette change while motion is reduced. */
    redraw() {
      if (W && H && !raf) draw()
    },
    /** Fast-forwards the opening sequence into the grown network. */
    skipIntro() {
      if (!intro) return
      intro.t = Math.max(intro.t, INTRO.releaseAt)
      intro.rate = 2.4
    },
    destroy() {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', sync)
      reduceQuery.removeEventListener('change', sync)
    },
  }
}
