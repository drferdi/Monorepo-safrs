// THE LEGACY's last beat (Chief 2026-10-09, "sebagian wajah saya berubah menjadi persyarafan
// neuron"): over the film's held last frame, part of the founder's face becomes neural tissue. A
// front sweeps in from one side of the face (`MORPH.cut.side`, the left as seen, Chief's call);
// the flesh it passes darkens to the void and, a
// few pixels behind it, the face's own edges and light return as the material of chapters 03 and
// 14 (`face.ts` on the frame: edge segments and luminance dots), with somas on the densest
// features, links between them, axons growing out of the face into the code, and signals running
// along them. Everything is drawn into `<canvas data-film-morph>` over the film at twice the
// frame's resolution. The master's morph tween hands the front's progress to `render` (so the
// transformation is the scroll position's), the journey's ticker hands GSAP's clock to `tick` for
// the living layer, and the signals are a repeating GSAP timeline as in `signal.ts`.
// The frame's analysis (`face.ts` on `faceCrop`) and the frame's size come in from the journey, so
// this module stays a leaf the node tests can load.
import type { FaceAnalysis, FacePixels } from './face'

export type Gsap = typeof import('gsap').gsap

export const MORPH = {
  scale: 2,
  // The face on the last frame, in frame pixels: the soft ellipse the transformation stays inside.
  face: { x: 315, y: 232, rx: 94, ry: 132, soft: .82 },
  // The front comes in from `side` of the face as seen (Chief 2026-10-09: "wajah kiri saja"),
  // `from` pixels out from the face centre, and rests `to` pixels from it (so this much of that
  // side stays flesh); it is tilted by `slope` (px of x per px of y, following the nose line) and
  // `width` pixels soft. Neurons return `lag` pixels behind it, somas and links `deep` pixels behind.
  cut: { side: 'left' as 'right' | 'left', from: 120, to: 7, slope: .12, width: 34, lag: 14, deep: 30, wave: 5 },
  // Frame rows above the hairline: the formula glyphs over the hair are flattened to `glyph` out of
  // the analysis so they do not become edges.
  hairline: 155, glyph: 60,
  // The crop of the frame the analysis runs on (the head and a margin).
  crop: { x: 200, y: 70, w: 240, h: 330 },
  somas: 22, axons: 7, gap: 24, cell: 12,
  lanes: 4, laneOffset: .55, laneLength: 1.4,
  motes: 40,
}
const obsidian = [5, 7, 11]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t) }
const side = () => MORPH.cut.side === 'right' ? 1 : -1
function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
}

// 1 well inside the face ellipse, 0 outside it, soft between.
export function regionWeight(x: number, y: number): number {
  const f = MORPH.face
  return 1 - smooth((Math.hypot((x - f.x) / f.rx, (y - f.y) / f.ry) - f.soft) / (1 - f.soft))
}
// Where the front stands for a progress (0 out past the face, 1 at rest): signed px from the centre.
export const frontAt = (value: number) => MORPH.cut.from + (MORPH.cut.to - MORPH.cut.from) * clamp01(value)
// The front's gentle waver along y, so the seam is not a ruler's edge.
export const wave = (y: number) => MORPH.cut.wave * (Math.sin(y / 19) + .6 * Math.sin(y / 7.7 + 1))
// A frame point's signed distance from the face centre along the front's normal (positive on the
// side the front comes from), with the tilt and the waver taken out.
export const across = (x: number, y: number) => ((x - MORPH.face.x) - MORPH.cut.slope * (y - MORPH.face.y) - wave(y)) * side()
// How far past the front a frame point is at `value`: 0 before it, 1 after it, soft over `width`;
// `lag` holds the front back by that many pixels.
export function cutWeight(x: number, y: number, value: number, lag = 0): number {
  return smooth((across(x, y) - frontAt(value) - lag + MORPH.cut.width / 2) / MORPH.cut.width)
}

// The frame's face crop with the glyphs over the hair flattened.
export function faceCrop(pixels: FacePixels): FacePixels {
  const { x, y, w, h } = MORPH.crop
  const lum = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = pixels.lum[(y + j) * pixels.width + x + i]
    lum[j * w + i] = y + j < MORPH.hairline ? Math.min(v, MORPH.glyph) : v
  }
  return { width: w, height: h, lum }
}

// The neurons of the transformed side: somas on the features where the analysis found the most
// edges, two links from each to its nearest, and axons from the outermost somas growing out of
// the face. Coordinates are frame pixels; seeded, so a rebuild draws the same face.
export type Neurons = { somas: Array<[number, number]>; links: Array<[number, number, number]>; axons: Array<number[]> }
export function seedNeurons(face: FaceAnalysis, origin: { x: number; y: number }, seed = 7): Neurons {
  const rand = random(seed), f = MORPH.face, cell = MORPH.cell
  const counts = new Map<number, number>()
  for (let i = 0; i < face.segments.length; i += 6) {
    const x = origin.x + (face.segments[i] + face.segments[i + 3]) / 2, y = origin.y + (face.segments[i + 1] + face.segments[i + 4]) / 2
    if (regionWeight(x, y) < .6 || cutWeight(x, y, 1) < .5) continue
    const key = Math.floor(x / cell) * 10000 + Math.floor(y / cell)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const cells = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])
  const somas: Array<[number, number]> = []
  for (const [key] of cells) {
    if (somas.length >= MORPH.somas) break
    const x = Math.floor(key / 10000) * cell + cell / 2 + (rand() - .5) * 6, y = (key % 10000) * cell + cell / 2 + (rand() - .5) * 6
    if (somas.every(([sx, sy]) => Math.hypot(sx - x, sy - y) >= MORPH.gap)) somas.push([x, y])
  }
  const links: Array<[number, number, number]> = []
  somas.forEach(([x, y], a) => {
    const near = somas.map(([sx, sy], b) => [Math.hypot(sx - x, sy - y), b] as const).filter(([, b]) => b !== a).sort((p, q) => p[0] - q[0]).slice(0, 2)
    for (const [, b] of near) if (!links.some(([p, q]) => (p === a && q === b) || (p === b && q === a))) links.push([a, b, (rand() - .5) * 24])
  })
  const outward = somas.map(([x, y], i) => [(x - f.x) * side() + (f.y - y) * .4, i] as const).sort((p, q) => q[0] - p[0]).slice(0, MORPH.axons)
  const axons: Array<number[]> = []
  for (const [, i] of outward) {
    const [sx, sy] = somas[i]
    const grow = (x: number, y: number, heading: number, steps: number) => {
      const line = [x, y]
      for (let s = 0; s < steps; s++) { heading += (rand() - .5) * .5; x += Math.cos(heading) * 11; y += Math.sin(heading) * 11; line.push(x, y) }
      return line
    }
    const heading = Math.atan2(sy - f.y, (sx - f.x) * side()) ; const h = side() === 1 ? heading : Math.PI - heading
    const trunk = grow(sx, sy, h, 14 + Math.floor(rand() * 5))
    axons.push(trunk)
    const at = 7 * 2
    axons.push(grow(trunk[at], trunk[at + 1], h + (rand() < .5 ? .7 : -.7), 6 + Math.floor(rand() * 4)))
  }
  return { somas, links, axons }
}

// The signal lanes: a repeating GSAP timeline, as the network's activity cycle, writing plain lane
// objects (`path` re-rolled on every repeat, `t` running 0 → 1 along it, -1 while idle).
export type Lane = { t: number; path: number }
export function createPulseCycle(gsap: Gsap, pathCount: () => number): { lanes: Lane[]; cycle: gsap.core.Timeline } {
  const lanes: Lane[] = Array.from({ length: MORPH.lanes }, () => ({ t: -1, path: 0 }))
  const cycle = gsap.timeline({ paused: true, repeat: -1, repeatRefresh: true })
  lanes.forEach((lane, k) => {
    const start = k * MORPH.laneOffset
    cycle.set(lane, { path: () => Math.floor(Math.random() * Math.max(1, pathCount())) }, start)
    cycle.fromTo(lane, { t: 0 }, { t: 1, duration: MORPH.laneLength, ease: 'none', immediateRender: false }, start)
    cycle.set(lane, { t: -1 }, start + MORPH.laneLength)
  })
  cycle.to({ rest: 0 }, { rest: 1, duration: .6 }, (MORPH.lanes - 1) * MORPH.laneOffset + MORPH.laneLength)
  return { lanes, cycle }
}

type Path = { at(t: number): [number, number]; root: number }
type Built = { face: FaceAnalysis; origin: { x: number; y: number }; neurons: Neurons; paths: Path[] }

function buildPaths(neurons: Neurons): Path[] {
  const quad = ([a, b, bow]: [number, number, number]): Path => {
    const [ax, ay] = neurons.somas[a], [bx, by] = neurons.somas[b]
    const len = Math.hypot(bx - ax, by - ay) || 1, cx = (ax + bx) / 2 - (by - ay) / len * bow, cy = (ay + by) / 2 + (bx - ax) / len * bow
    return { root: a, at: t => [(1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by] }
  }
  const poly = (line: number[], root: number): Path => {
    const lengths = [0]
    for (let i = 2; i < line.length; i += 2) lengths.push(lengths[lengths.length - 1] + Math.hypot(line[i] - line[i - 2], line[i + 1] - line[i - 1]))
    const total = lengths[lengths.length - 1]
    return { root, at: t => {
      const d = t * total
      let i = 1
      while (i < lengths.length - 1 && lengths[i] < d) i++
      const u = (d - lengths[i - 1]) / ((lengths[i] - lengths[i - 1]) || 1)
      return [line[(i - 1) * 2] + (line[i * 2] - line[(i - 1) * 2]) * u, line[(i - 1) * 2 + 1] + (line[i * 2 + 1] - line[(i - 1) * 2 + 1]) * u]
    } }
  }
  const roots = neurons.axons.map(line => neurons.somas.findIndex(([x, y]) => Math.abs(x - line[0]) < 1e-6 && Math.abs(y - line[1]) < 1e-6))
  return [...neurons.links.map(quad), ...neurons.axons.map((line, i) => poly(line, roots[i] >= 0 ? roots[i] : 0))]
}

export type Morph = { render(value: number): void; tick(time: number): void; dispose(): void }

export type MorphOptions = { frame: { width: number; height: number }; face: Promise<FaceAnalysis | null> }
export function createMorph(gsap: Gsap, canvas: HTMLCanvasElement, options: MorphOptions): Morph | null {
  const context = canvas.getContext('2d')
  if (!context) return null
  const s = MORPH.scale, FILM = options.frame, W = FILM.width * s, H = FILM.height * s
  canvas.width = W; canvas.height = H
  const stillCanvas = document.createElement('canvas'), coverCanvas = document.createElement('canvas')
  stillCanvas.width = coverCanvas.width = W; stillCanvas.height = coverCanvas.height = H
  const still = stillCanvas.getContext('2d'), cover = coverCanvas.getContext('2d')
  if (!still || !cover) return null
  let built: Built | null = null, disposed = false, value = 0, stillValue = -1, moteSeed: number[] = []
  const { lanes, cycle } = createPulseCycle(gsap, () => built?.paths.length ?? 0)
  const rand = random(11)
  for (let i = 0; i < MORPH.motes; i++) moteSeed.push(rand(), rand())

  void options.face.then(face => {
    if (disposed || !face) return
    const origin = { x: MORPH.crop.x, y: MORPH.crop.y }
    const neurons = seedNeurons(face, origin)
    built = { face, origin, neurons, paths: buildPaths(neurons) }
    stillValue = -1
    if (value > 0) composite(0)
  })

  // The layer that depends on the scroll alone: the cover and the returned face, redrawn only
  // when the front moves.
  const drawStill = (v: number) => {
    if (!built) return
    const { face, origin, neurons } = built, f = MORPH.face, c = MORPH.cut
    still.setTransform(1, 0, 0, 1, 0, 0); still.clearRect(0, 0, W, H)
    // The cover: the face ellipse in the void colour, soft at its rim, kept only past the front.
    cover.setTransform(1, 0, 0, 1, 0, 0); cover.globalCompositeOperation = 'source-over'; cover.clearRect(0, 0, W, H)
    cover.setTransform(s * f.rx, 0, 0, s * f.ry, s * f.x, s * f.y)
    const rim = cover.createRadialGradient(0, 0, 0, 0, 0, 1)
    rim.addColorStop(0, `rgb(${obsidian.join(' ')})`); rim.addColorStop(f.soft, `rgb(${obsidian.join(' ')})`); rim.addColorStop(1, `rgb(${obsidian.join(' ')} / 0)`)
    cover.fillStyle = rim; cover.fillRect(-1, -1, 2, 2)
    cover.setTransform(s, 0, 0, s, 0, 0); cover.globalCompositeOperation = 'destination-in'
    const g = [side(), -c.slope * side()], gl = Math.hypot(g[0], g[1]), front = frontAt(v)
    const p0 = [f.x + g[0] / gl * (front - c.width / 2) / gl, f.y + g[1] / gl * (front - c.width / 2) / gl], p1 = [f.x + g[0] / gl * (front + c.width / 2) / gl, f.y + g[1] / gl * (front + c.width / 2) / gl]
    const edge = cover.createLinearGradient(p0[0], p0[1], p1[0], p1[1])
    edge.addColorStop(0, 'rgb(0 0 0 / 0)'); edge.addColorStop(1, 'rgb(0 0 0 / 1)')
    cover.fillStyle = edge; cover.fillRect(0, 0, FILM.width, FILM.height)
    still.globalAlpha = .9; still.drawImage(coverCanvas, 0, 0); still.globalAlpha = 1
    still.setTransform(s, 0, 0, s, 0, 0)
    // The face's own edges and light, in eight bands of reveal.
    const bands = 8
    const lines: number[][] = Array.from({ length: bands + 1 }, () => []), dots: number[][] = Array.from({ length: bands + 1 }, () => [])
    for (let i = 0; i < face.segments.length; i += 6) {
      const ax = origin.x + face.segments[i], ay = origin.y + face.segments[i + 1], bx = origin.x + face.segments[i + 3], by = origin.y + face.segments[i + 4]
      const w = regionWeight((ax + bx) / 2, (ay + by) / 2) * cutWeight((ax + bx) / 2, (ay + by) / 2, v, c.lag)
      const band = Math.round(w * bands)
      if (band > 0) lines[band].push(ax, ay, bx, by)
    }
    for (let i = 0; i < face.dots.length; i += 3) {
      const x = origin.x + face.dots[i], y = origin.y + face.dots[i + 1]
      const band = Math.round(regionWeight(x, y) * cutWeight(x, y, v, c.lag) * bands)
      if (band > 0) dots[band].push(x, y, face.dots[i + 2])
    }
    still.lineWidth = 1; still.strokeStyle = '#8fb0cf'; still.fillStyle = '#b5c8dc'
    for (let band = 1; band <= bands; band++) {
      still.globalAlpha = .85 * band / bands
      still.beginPath()
      for (let i = 0; i < lines[band].length; i += 4) { still.moveTo(lines[band][i], lines[band][i + 1]); still.lineTo(lines[band][i + 2], lines[band][i + 3]) }
      still.stroke()
      still.globalAlpha = .6 * band / bands
      for (let i = 0; i < dots[band].length; i += 3) { const size = .9 + dots[band][i + 2] * 1.3; still.fillRect(dots[band][i] - size / 2, dots[band][i + 1] - size / 2, size, size) }
    }
    // Links and axons grow in behind the front; somas are drawn live.
    const reveal = (i: number) => { const [x, y] = neurons.somas[i]; return regionWeight(x, y) * cutWeight(x, y, v, c.deep) }
    still.strokeStyle = '#9bb9d7'; still.lineWidth = .8
    for (const [a, b, bow] of neurons.links) {
      const r = Math.min(reveal(a), reveal(b))
      if (r <= 0) continue
      const [ax, ay] = neurons.somas[a], [bx, by] = neurons.somas[b]
      const len = Math.hypot(bx - ax, by - ay) || 1
      still.globalAlpha = .6 * r
      still.beginPath(); still.moveTo(ax, ay); still.quadraticCurveTo((ax + bx) / 2 - (by - ay) / len * bow, (ay + by) / 2 + (bx - ax) / len * bow, bx, by); still.stroke()
    }
    still.strokeStyle = '#7799b7'
    neurons.axons.forEach((line, i) => {
      const root = built!.paths[neurons.links.length + i].root, growth = reveal(root)
      if (growth <= 0) return
      const steps = Math.floor((line.length / 2 - 1) * growth)
      still.globalAlpha = .75 * Math.min(1, growth * 1.5)
      for (let k = 0; k < steps; k++) {
        still.lineWidth = 1.1 - .6 * k / (line.length / 2)
        still.beginPath(); still.moveTo(line[k * 2], line[k * 2 + 1]); still.lineTo(line[k * 2 + 2], line[k * 2 + 3]); still.stroke()
      }
    })
    still.globalAlpha = 1
    stillValue = v
  }

  // The living layer: the still, then the somas breathing, the seam and its motes, the signals.
  const composite = (time: number) => {
    if (disposed || !built) return
    if (stillValue !== value) drawStill(value)
    const { neurons, paths } = built, f = MORPH.face, c = MORPH.cut
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, W, H)
    context.drawImage(stillCanvas, 0, 0)
    context.setTransform(s, 0, 0, s, 0, 0)
    neurons.somas.forEach(([x, y], i) => {
      const r = regionWeight(x, y) * cutWeight(x, y, value, c.deep)
      if (r <= 0) return
      const breath = .7 + .3 * Math.sin(time * 1.6 + i * 1.3)
      const glow = context.createRadialGradient(x, y, 0, x, y, 10)
      glow.addColorStop(0, `rgb(200 220 240 / ${.8 * r * breath})`); glow.addColorStop(1, 'rgb(200 220 240 / 0)')
      context.fillStyle = glow; context.fillRect(x - 10, y - 10, 20, 20)
      context.fillStyle = `rgb(229 233 238 / ${r})`; context.beginPath(); context.arc(x, y, 1.8, 0, Math.PI * 2); context.fill()
    })
    // The seam where flesh meets tissue (wavering, fading at its ends), and the motes drifting off it.
    const front = frontAt(value), seamX = (y: number) => f.x + side() * front + c.slope * (y - f.y) + wave(y)
    const top = f.y - f.ry * .8, bottom = f.y + f.ry * .8, seam = context.createLinearGradient(0, top, 0, bottom)
    const seamAlpha = value < 1 ? .3 : .14
    seam.addColorStop(0, 'rgb(185 208 231 / 0)'); seam.addColorStop(.3, `rgb(185 208 231 / ${seamAlpha})`); seam.addColorStop(.7, `rgb(185 208 231 / ${seamAlpha})`); seam.addColorStop(1, 'rgb(185 208 231 / 0)')
    context.strokeStyle = seam; context.lineWidth = 1
    context.beginPath(); context.moveTo(seamX(top), top)
    for (let y = top + 4; y <= bottom; y += 4) context.lineTo(seamX(y), y)
    context.stroke()
    context.fillStyle = '#d9e4ef'
    for (let i = 0; i < MORPH.motes; i++) {
      const y = f.y + (moteSeed[i * 2] - .5) * f.ry * 1.8, drift = (time * 22 + moteSeed[i * 2 + 1] * 140) % 140
      const x = seamX(y) + side() * drift
      const a = (1 - drift / 140) * .55 * regionWeight(x, y)
      if (a <= .01) continue
      context.globalAlpha = a; context.fillRect(x - .6, y - .6, 1.2, 1.2)
    }
    context.globalAlpha = 1
    // The signals: a warm head with a short trail, along a link or an axon that has grown in.
    for (const lane of lanes) {
      const path = paths[lane.path]
      if (!path || lane.t < 0) continue
      const [rx, ry] = neurons.somas[path.root]
      const grown = regionWeight(rx, ry) * cutWeight(rx, ry, value, c.deep)
      if (lane.t > grown) continue
      for (let k = 0; k < 4; k++) {
        const t = lane.t - k * .025
        if (t < 0) break
        const [x, y] = path.at(t)
        context.fillStyle = `rgb(255 214 160 / ${(1 - k / 4) * .9})`
        context.beginPath(); context.arc(x, y, 2.1 - k * .4, 0, Math.PI * 2); context.fill()
      }
    }
  }

  return {
    render(v) {
      value = clamp01(v)
      canvas.dataset.morph = value.toFixed(2)
      if (value > 0 && cycle.paused()) cycle.play()
      else if (value === 0 && !cycle.paused()) cycle.pause()
      if (value === 0) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, W, H); return }
      composite(gsap.ticker.time)
    },
    tick(time) { if (value > 0) composite(time) },
    dispose() { disposed = true; cycle.kill(); context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, W, H); delete canvas.dataset.morph },
  }
}
