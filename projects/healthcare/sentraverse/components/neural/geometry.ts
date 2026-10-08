import type { FaceAnalysis } from './face'

export type Vec3 = [number, number, number]
export type Geometry = { points: Float32Array; lines: Float32Array }
type Color = [number, number, number]
const WHITE: Color = [.68, .77, .84]
const BLUE: Color = [.34, .53, .78]
const AMBER: Color = [.92, .68, .4]
const TAU = Math.PI * 2

function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
}

class Tissue {
  points: number[] = []
  lines: number[] = []
  rand: () => number
  readonly density: number
  constructor(seed: number, density: number) { this.density = density; this.rand = random(seed) }
  vertex(p: Vec3, color = WHITE, size = 1.4, birth = 0, phase = 0) {
    return [...p, ...color, size, birth, phase]
  }
  point(p: Vec3, color = WHITE, size = 1.4, birth = 0, phase = 0) {
    this.points.push(...this.vertex(p, color, size, birth, phase))
  }
  line(a: Vec3, b: Vec3, color = WHITE, birth = 0, phase = 0) {
    this.lines.push(...this.vertex(a, color, 1, birth, phase), ...this.vertex(b, color, 1, birth, phase + .006))
  }
  path(points: Vec3[], color = WHITE, birth = 0) {
    for (let i = 1; i < points.length; i++) this.line(points[i - 1], points[i], color, birth, i / points.length)
  }
  cell(center: Vec3, radius: number, count: number, color = WHITE, birth = 0, elongation = 1) {
    for (let i = 0; i < count * this.density; i++) {
      const theta = this.rand() * TAU, cos = this.rand() * 2 - 1
      const sin = Math.sqrt(1 - cos * cos)
      const irregular = 1 + .12 * Math.sin(theta * 7 + cos * 8) + .065 * Math.sin(theta * 17)
      const r = radius * irregular * (i % 5 === 0 ? .58 : 1)
      this.point([center[0] + Math.cos(theta) * sin * r, center[1] + cos * r * elongation, center[2] + Math.sin(theta) * sin * r], color, 1.3 + this.rand() * 1.8, birth, theta / TAU)
    }
    for (let i = 0; i < 80 * this.density; i++) {
      const theta = this.rand() * TAU, z = this.rand() * 2 - 1
      this.point([center[0] + Math.cos(theta) * radius * .28, center[1] + Math.sin(theta) * radius * .3, center[2] + z * radius * .25], AMBER, 1.7, birth)
    }
  }
  branch(start: Vec3, angle: number, length: number, depth: number, birth: number, color: Color) {
    let previous = start
    const steps = 11, curve = (this.rand() - .5) * 1.1, zSlope = (this.rand() - .5) * length
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, a = angle + curve * t
      const end: Vec3 = [start[0] + Math.cos(a) * length * t, start[1] + Math.sin(a) * length * t, start[2] + zSlope * t + Math.sin(t * 5) * length * .045]
      this.line(previous, end, color, birth + t * .12, t)
      for (let strand = 0; strand < (depth + 1) * this.density; strand++) {
        const offset = (strand - depth / 2) * .009
        this.line([previous[0] + offset, previous[1] + offset, previous[2]], [end[0] + offset, end[1] + offset, end[2]], color, birth + t * .12, t)
      }
      if (i % 2 === 0) this.point(end, color, .9, birth + t * .12, t)
      previous = end
      if (depth > 0 && i === 7) this.branch(end, a + (this.rand() > .5 ? 1 : -1) * .6, length * .48, depth - 1, birth + .12, color)
    }
    if (depth > 0) {
      this.branch(previous, angle + curve + .38, length * .62, depth - 1, birth + .15, color)
      this.branch(previous, angle + curve - .43, length * .53, depth - 1, birth + .15, color)
    }
  }
  neuron(center: Vec3, size: number, branches: number, depth: number, color = WHITE) {
    this.cell(center, .23 * size, 1700, color)
    for (let i = 0; i < branches; i++) {
      const angle = i / branches * TAU + this.rand() * .35
      const start: Vec3 = [center[0] + Math.cos(angle) * .19 * size, center[1] + Math.sin(angle) * .19 * size, center[2]]
      this.branch(start, angle, size * (.75 + this.rand() * .65), depth, .06, color)
    }
    this.branch(center, -.4, size * 3.4, Math.max(0, depth - 1), .1, BLUE)
  }
  finish(): Geometry { return { points: new Float32Array(this.points), lines: new Float32Array(this.lines) } }
}

export const hubs: Vec3[] = [[-3.2, 1.6, 0], [2.9, 1.4, -.5], [-2.5, -1.7, .4], [2.8, -1.8, .1], [.1, 2.9, -1]]

export function makeNeuron(density: number): Geometry {
  const tissue = new Tissue(37, density)
  tissue.neuron([0, 0, 0], 1, 8, 3)
  return tissue.finish()
}

export function makeEmbryo(density: number): Geometry {
  const tissue = new Tissue(19, density)
  // Radial progenitors line a tubular lumen; a separate stream suggests crest migration.
  for (let row = 0; row < 9; row++) {
    const y = (row - 4) * .48
    for (let i = 0; i < 11; i++) {
      const angle = i / 11 * TAU + row * .09
      const center: Vec3 = [Math.cos(angle) * 1.4, y, Math.sin(angle) * 1.4]
      tissue.cell(center, .13 + tissue.rand() * .04, 150, i % 4 === 0 ? BLUE : WHITE, 0, 1.6)
      tissue.line(center, [center[0] * 1.3, y + .23, center[2] * 1.3], BLUE)
    }
  }
  for (let i = 0; i < 20; i++) {
    const t = i / 20
    tissue.cell([1.4 + t * 2.1, 1.6 - t * 2 + Math.sin(t * 5) * .3, .4], .10, 100, BLUE, t * .6)
  }
  return tissue.finish()
}

export function makeSystem(density: number): Geometry {
  const tissue = new Tissue(81, density)
  // Two folded hemispheres, a brainstem, spinal cord, and bilateral nerve plexuses.
  for (const side of [-1, 1]) {
    for (let fold = 0; fold < 48 * density; fold++) {
      const latitude = fold / (48 * density) * Math.PI
      const path: Vec3[] = []
      for (let j = 0; j <= 85; j++) {
        const a = j / 85 * Math.PI
        const foldDepth = .024 * Math.sin(a * 16 + fold * .87) + .012 * Math.sin(a * 29 - fold * .5)
        const radius = Math.sin(latitude)
        path.push([side * (.012 + Math.sin(a) * (.43 + foldDepth) * radius),
          2.47 + Math.cos(latitude) * .36 + foldDepth * radius, Math.cos(a) * (.38 + foldDepth) * radius])
      }
      tissue.path(path, [.52, .64, .75])
    }
    for (let fold = 0; fold < 12; fold++) {
      const path: Vec3[] = []
      for (let j = 0; j <= 30; j++) {
        const a = j / 30 * TAU
        path.push([side * (.15 + Math.cos(a) * .145), 2.08 + Math.sin(a) * .085, -.12 + fold * .012])
      }
      tissue.path(path, [.4, .52, .65])
    }
    for (let strand = 0; strand < 5; strand++) {
      const spine: Vec3[] = []
      for (let i = 0; i < 54; i++) spine.push([side * .014 + strand * .004 * (1 - i / 70), 2.02 - i * .046, .035 + Math.sin(i * .07) * .055])
      tissue.path(spine, [.48, .61, .72])
      tissue.path([[side * .015, -.28, .06], [side * (.06 + strand * .022), -.56, .02], [side * (.12 + strand * .035), -.85, 0]], BLUE)
    }
    for (let level = 0; level < 22; level++) {
      const y = 1.7 - level * .115
      const reach = level < 5 ? .6 : .42 - Math.abs(level - 12) * .008
      const path: Vec3[] = []
      for (let j = 0; j < 18; j++) {
        const t = j / 17
        path.push([side * (.05 + t * reach), y - .14 * Math.sin(t * Math.PI), -.06 + .12 * Math.sin(t * 3)])
      }
      tissue.path(path, BLUE)
    }
    const arm: Vec3[] = [[side * .04, 1.71, 0], [side * .43, 1.61, 0], [side * .73, 1.46, 0], [side * .9, .97, .02], [side * .98, .53, .04], [side * 1.14, -.18, .04], [side * 1.2, -.41, .02]]
    const leg: Vec3[] = [[side * .09, -.48, 0], [side * .33, -.85, 0], [side * .4, -1.36, 0], [side * .4, -1.91, .02], [side * .41, -2.6, 0], [side * .38, -3.05, .12]]
    for (let fiber = 0; fiber < 8 * density; fiber++) {
      const offset = (fiber - 4) * .008
      tissue.path(arm.map(p => [p[0] + offset, p[1], p[2] + offset]), fiber % 3 ? WHITE : BLUE)
      tissue.path(leg.map(p => [p[0] + offset, p[1], p[2] + offset]), fiber % 3 ? WHITE : BLUE)
    }
    for (let finger = 0; finger < 5; finger++) {
      tissue.path([[side * 1.2, -.32, .02], [side * (1.07 + finger * .063), -.44, .02], [side * (1.07 + finger * .063), -.70 + Math.abs(finger - 2) * .08, .02]], WHITE)
      tissue.path([[side * .38, -3.05, .12], [side * (.3 + finger * .047), -3.2, .22]], BLUE)
    }
    for (let i = 0; i < 16; i++) {
      const t = i / 16
      tissue.branch([side * (.38 + .025 * t), -1 - 1.8 * t, 0], side > 0 ? -.3 : Math.PI + .3, .085, 1, 0, BLUE)
      tissue.branch([side * (.87 + .26 * t), 1.1 - 1.3 * t, 0], side > 0 ? -.3 : Math.PI + .3, .065, 1, 0, BLUE)
    }
  }
  return tissue.finish()
}

export const axonCenter = (z: number): Vec3 => [Math.sin(z * .19) * .62, Math.sin(z * .13 + .8) * .5, z]

export function makeAxon(density: number): Geometry {
  const tissue = new Tissue(63, density)
  for (let fiber = 0; fiber < 85 * density; fiber++) {
    const angle = fiber / (85 * density) * TAU
    let previous: Vec3 | undefined
    for (let i = 0; i < 260; i++) {
      const z = -i * .13, center = axonCenter(z), radius = 1.18 + .04 * Math.sin(i * .4 + angle * 6)
      const a = angle + .05 * Math.sin(z * .6)
      const p: Vec3 = [center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius, z]
      if (previous) tissue.line(previous, p, i % 30 < 3 ? WHITE : BLUE, 0, i / 260)
      if (i % 4 === 0) tissue.point(p, WHITE, .8 + tissue.rand(), 0, i / 260)
      previous = p
    }
  }
  for (let ring = 0; ring < 24; ring++) {
    const z = -ring * 1.4, center = axonCenter(z)
    for (let wrap = 0; wrap < 5; wrap++) {
      const path: Vec3[] = []
      for (let i = 0; i <= 70; i++) {
        const a = i / 70 * TAU, radius = (1.2 + wrap * .025) * (1 + .045 * Math.sin(a * 5 + ring * .7))
        path.push([center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius, z - wrap * .035])
      }
      tissue.path(path, [.35, .46, .55])
    }
  }
  return tissue.finish()
}

export function makeSynapse(density: number): Geometry {
  const tissue = new Tissue(113, density)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12000 * density; i++) {
      const theta = tissue.rand() * TAU, r = Math.sqrt(tissue.rand()) * 1.7
      const x = side * (.36 + .42 * r * r)
      tissue.point([x, Math.cos(theta) * r, Math.sin(theta) * r], side < 0 ? WHITE : BLUE, .8 + tissue.rand(), 0, r / 1.7)
    }
  }
  for (let i = 0; i < 22; i++) {
    const y = (tissue.rand() - .5) * 2.3, z = (tissue.rand() - .5) * 1.8
    tissue.cell([-1 - tissue.rand() * .7, y, z], .08 + tissue.rand() * .055, 100, AMBER)
  }
  for (let i = 0; i < 18; i++) {
    const y = (i - 9) * .12
    tissue.path([[.43, y - .025, .3], [.32, y - .025, .3], [.32, y + .025, .3], [.43, y + .025, .3]], WHITE)
  }
  return tissue.finish()
}

export function makeNetwork(density: number): Geometry {
  const tissue = new Tissue(273, density)
  const centers: Vec3[] = []
  // Distant neurons use a soma point and sparse arbors in the same GPU buffers.
  // Detailed foreground cells carry morphology without thousands of scene objects.
  const distantCount = density > .5 ? 2600 : 500
  for (let i = 0; i < distantCount * density; i++) {
    const center: Vec3 = [(tissue.rand() - .5) * 46, (tissue.rand() - .5) * 30, -8 - tissue.rand() * 20]
    tissue.point(center, [.24, .34, .46], 2 + tissue.rand() * 2, 0, tissue.rand())
    for (let branch = 0; branch < 4; branch++) {
      const angle = tissue.rand() * TAU, length = .2 + tissue.rand() * .5
      const end: Vec3 = [center[0] + Math.cos(angle) * length, center[1] + Math.sin(angle) * length, center[2] + tissue.rand() * .3]
      tissue.line(center, end, [.16, .23, .32], 0, tissue.rand())
      tissue.line(end, [end[0] + Math.cos(angle + .6) * length * .4, end[1] + Math.sin(angle + .6) * length * .4, end[2]], [.16, .23, .32])
    }
  }
  for (let i = 0; i < 100 * density; i++) {
    const center: Vec3 = [(tissue.rand() - .5) * 15, (tissue.rand() - .5) * 10, (tissue.rand() - .5) * 8]
    centers.push(center)
    tissue.neuron(center, .16 + tissue.rand() * .15, 4, 1, i % 3 ? BLUE : WHITE)
  }
  for (const [i, hub] of hubs.entries()) {
    tissue.neuron(hub, .65, 7, 2, i === 4 ? [.7, .58, .45] : [.54, .62, .78])
    const path: Vec3[] = []
    for (let j = 0; j < 40; j++) {
      const t = j / 39
      path.push([hub[0] * (1 - t), hub[1] * (1 - t) + Math.sin(t * Math.PI) * .4, hub[2] * (1 - t)])
    }
    tissue.path(path, WHITE)
  }
  tissue.neuron([0, 0, 0], .7, 7, 2)
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const a = centers[i], b = centers[j]
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 2.8) tissue.line(a, b, [.18, .28, .41], 0, tissue.rand())
    }
  }
  return tissue.finish()
}

export function makeDust(density: number): Geometry {
  const tissue = new Tissue(781, density)
  for (let i = 0; i < 1500 * density; i++) tissue.point([(tissue.rand() - .5) * 22, (tissue.rand() - .5) * 14, (tissue.rand() - .5) * 12], [.23, .29, .36], .6 + tissue.rand() * 1.2)
  return tissue.finish()
}

// Portrait-guided relief in source-image coordinates. This is a gently sculpted 2.5D surface,
// not a face scan: lighting, facial hair and clothing never become bumps in the geometry.
export function faceDepth(u: number, v: number): number {
  const bulge = (x: number, y: number, rx: number, ry: number) => Math.exp(-(((u - x) / rx) ** 2 + ((v - y) / ry) ** 2) * 2)
  const head = Math.sqrt(Math.max(0, 1 - ((u - .52) / .255) ** 2 - ((v - .405) / .35) ** 2))
  return -.16 + head * .43
    + .16 * bulge(.518, .425, .033, .09) + .24 * bulge(.52, .475, .041, .036)
    - .105 * bulge(.425, .38, .055, .033) - .105 * bulge(.613, .38, .055, .033)
    + .07 * bulge(.395, .477, .074, .065) + .07 * bulge(.643, .477, .074, .065)
    + .045 * bulge(.52, .565, .082, .025) + .08 * bulge(.52, .66, .10, .053)
    + .055 * bulge(.52, .79, .12, .15)
}

// The same field grows neural features and reveals skin: nose, eyes and lips first, then the
// cheeks, hair, jaw and shoulders. Coordinates refer to the unchanged source photograph.
export function faceContour(u: number, v: number): number {
  const reach = (x: number, y: number, rx: number, ry: number) => Math.hypot((u - x) / rx, (v - y) / ry)
  return Math.min(.98, .08 + Math.min(
    reach(.52, .475, .16, .21) * .34,
    .04 + reach(.425, .38, .125, .15) * .36,
    .04 + reach(.613, .38, .125, .15) * .36,
    .08 + reach(.52, .565, .14, .16) * .34,
  ))
}

export function faceDissolve(contour: number, progress: number): number {
  const t = Math.min(1, Math.max(0, (progress * 1.18 - .09 - contour + .08) / .16))
  return t * t * (3 - 2 * t)
}

// Chief's face: three units wide; luminance controls light, while the portrait profile controls depth.
export function makeFace(face: FaceAnalysis): Geometry {
  const tissue = new Tissue(5, 1)
  const { width: w, height: h, segments, dots } = face
  const unit = 3 / w
  const place = (x: number, y: number): Vec3 => [(x - w / 2) * unit, (h / 2 - y) * unit, faceDepth(x / w, y / h)]
  const birth = (x: number, y: number) => faceContour(x / w, y / h)
  for (let i = 0; i < segments.length; i += 6) {
    tissue.line(place(segments[i], segments[i + 1]), place(segments[i + 3], segments[i + 4]), [.52, .64, .75], birth(segments[i], segments[i + 1]), (segments[i] + segments[i + 1]) / (w + h))
  }
  for (let i = 0; i < dots.length; i += 3) {
    tissue.point(place(dots[i], dots[i + 1]), WHITE, 1 + dots[i + 2] * 1.6, birth(dots[i], dots[i + 1]), tissue.rand())
  }
  return tissue.finish()
}
