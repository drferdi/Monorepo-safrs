import type { FaceAnalysis } from './face'

export type Vec3 = [number, number, number]
// Normals are a parallel buffer (4 floats per vertex: a unit normal and a tag) only on the layers
// that are lit; the 9-float vertex format itself is unchanged.
export type Geometry = { points: Float32Array; lines: Float32Array; pointNormals?: Float32Array; lineNormals?: Float32Array; pointTargets?: Float32Array; lineTargets?: Float32Array }
// One SWC-shaped compartment (allensdk cell_types: type 1 soma, 2 axon, 3 basal, 4 apical; radius; parent).
export type Compartment = { type: 1 | 2 | 3 | 4; p: Vec3; radius: number; parent: number; birth: number; phase: number }
type Color = [number, number, number]
type Normal = [number, number, number, number]
const WHITE: Color = [.68, .77, .84]
const BLUE: Color = [.34, .53, .78]
const AMBER: Color = [.92, .68, .4]
const TAU = Math.PI * 2

function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
}

// The vertex tag in the fourth normal component: the signal lane (-1 none, 0–5), +50 for a sheath
// sprite (whose size slot is a world radius) and 100 × kind (0 soma or dendrite, 1 axon, 2 release
// particle). The shader and the Canvas 2D fallback decode it the same way.
export const tagOf = (lane: number, kind: number, sheath = 0) => lane + sheath * 50 + kind * 100

// On neurons of size .5 and up, shafts down to this radius (world units) are drawn as a core line
// inside a sheath of soft sprites sized by the radius; thinner twigs and the small network neurons
// stay single lines.
export const SHEATH_RADIUS = .008

// A parametric neuron in SWC shape (spec 2026-10-08, after Allen cell_types): a soma, 6–9 basal
// trunks (r0 .05·size), one apical trunk (r0 .075·size, +20 % reach) and one axon (r0 .04·size).
// Every chain tapers to .7 of its own root radius over 7–20 steps of about .13·size (the bulk of
// the thinning happens at the Rall splits, as in reconstructions, so the first daughters are still
// thick enough to carry a sheath); a chain that
// still has depth stops at a seeded .45–.8 of its nominal length and splits by Rall's 3/2 rule (the
// thicker daughter carries a .55–.75 share and continues, the thinner leaves at 35–55°), and most
// such chains also shed collaterals part-way (85 % one, long chains 60 % a second; an .18–.32 share
// by the same rule each, the chain going on thinner), which is what makes the arbor bushy (Chief
// 2026-10-08, "realistic dan dramatic"). The
// heading is a persistent random walk integrated step by step, so paths meander like stained
// dendrites instead of sweeping one smooth arc; the z-slope is ±.5 L per chain. `phase` is the path
// fraction from the soma to the farthest tip.
export function makeMorphology(seed: number, size: number, depth: number): Compartment[] {
  const rand = random(seed)
  const tree: Compartment[] = [{ type: 1, p: [0, 0, 0], radius: .23 * size, parent: -1, birth: 0, phase: 0 }]
  const grow = (from: number, start: Vec3, angle: number, nominal: number, r0: number, remaining: number, type: 2 | 3 | 4, birth: number, travelled: number, reach: number) => {
    const split = remaining > 0 ? .45 + rand() * .35 : 1
    const length = nominal * split
    const steps = Math.max(7, Math.min(20, Math.round(length / (.13 * size))))
    const curve = (rand() - .5) * 1.1, slope = (rand() - .5) * length
    const collaterals: number[] = []
    if (remaining > 0) {
      if (rand() < .85) collaterals.push(3 + Math.floor(rand() * (steps - 5)))
      if (steps >= 12 && rand() < .6) collaterals.push(3 + Math.floor(rand() * (steps - 5)))
    }
    let parent = from, wobble = 0, heading = angle, shrink = 1, x = start[0], y = start[1]
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      wobble = wobble * .8 + (rand() - .5) * .3
      heading = angle + curve * t + wobble
      x += Math.cos(heading) * length / steps; y += Math.sin(heading) * length / steps
      tree.push({ type, p: [x, y, start[2] + slope * t + Math.sin(t * 5) * length * .045], radius: r0 * (1 - .3 * t) * shrink, parent, birth: birth + t * .12, phase: Math.min(1, (travelled + length * t) / reach) })
      parent = tree.length - 1
      if (collaterals.includes(i)) {
        const node = tree[parent], share = .18 + rand() * .14, side = rand() > .5 ? 1 : -1, radius = node.radius * share ** (2 / 3)
        shrink *= (1 - share) ** (2 / 3)
        tree.push({ type, p: node.p, radius, parent, birth: node.birth, phase: node.phase })
        grow(tree.length - 1, node.p, heading + side * (.7 + rand() * .5), (nominal - length * t) * .6, radius, remaining - 1, type, node.birth, travelled + length * t, reach)
      }
    }
    if (remaining === 0) return
    const end = tree[parent], share = .55 + rand() * .2, side = rand() > .5 ? 1 : -1, rest = nominal - length
    const daughters: [number, number, number][] = [
      [heading + (rand() - .5) * .35, end.radius * share ** (2 / 3), rest],
      [heading + side * (.61 + rand() * .35), end.radius * (1 - share) ** (2 / 3), rest * .75],
    ]
    for (const [a, radius, len] of daughters) {
      // The daughter's root sits on the bifurcation point so its chain tapers from its own r0.
      tree.push({ type, p: end.p, radius, parent, birth: end.birth, phase: end.phase })
      grow(tree.length - 1, end.p, a, len, radius, remaining - 1, type, end.birth, travelled + length, reach)
    }
  }
  const trunk = (angle: number, nominal: number, r0: number, type: 2 | 3 | 4, levels: number) => {
    const start: Vec3 = [Math.cos(angle) * .19 * size, Math.sin(angle) * .19 * size, 0]
    tree.push({ type, p: start, radius: r0, parent: 0, birth: .06, phase: 0 })
    grow(tree.length - 1, start, angle, nominal, r0, levels, type, .06, 0, nominal)
  }
  const basal = 6 + Math.floor(rand() * 4), apical = Math.PI / 2 + (rand() - .5) * .3
  for (let i = 0; i < basal; i++) trunk(apical + Math.PI / 4 + (i + rand() * .35) / basal * (TAU - Math.PI / 2), size * (.75 + rand() * .65) * 1.5, .05 * size, 3, depth)
  trunk(apical, size * (.75 + rand() * .65) * 1.8, .075 * size, 4, depth)
  trunk(-.4, size * 3.4, .04 * size, 2, Math.max(0, depth - 1))
  return tree
}

class Tissue {
  points: number[] = []
  lines: number[] = []
  pointNormals: number[] = []
  lineNormals: number[] = []
  pointTargets: number[] = []
  lineTargets: number[] = []
  rand: () => number
  readonly density: number
  // Lighting context: vertices emitted while a soma is set get a radial normal and the current tag;
  // everything else faces the camera untagged. `lit` marks layers whose normals reach the GPU.
  private soma: Vec3 | null = null
  private tag = -1
  private lit = false
  // The constellation (brief 2026-10-09 §7): vertices emitted while `shift` is set take it as the
  // way to their place in the constellation; only layers that call `constellate` carry targets.
  private shift: Vec3 | null = null
  private targeted = false
  constellate(shift: Vec3 | null) { this.shift = shift; this.targeted = true }
  private targetOf(p: Vec3): Vec3 { const s = this.shift; return s ? [p[0] + s[0], p[1] + s[1], p[2] + s[2]] : p }
  constructor(seed: number, density: number) { this.density = density; this.rand = random(seed) }
  vertex(p: Vec3, color = WHITE, size = 1.4, birth = 0, phase = 0) {
    return [...p, ...color, size, birth, phase]
  }
  private normalOf(p: Vec3): Normal {
    if (!this.soma) return [0, 0, 1, this.tag]
    const d: Vec3 = [p[0] - this.soma[0], p[1] - this.soma[1], p[2] - this.soma[2]]
    const length = Math.hypot(d[0], d[1], d[2]) || 1
    return [d[0] / length, d[1] / length, d[2] / length, this.tag]
  }
  point(p: Vec3, color = WHITE, size = 1.4, birth = 0, phase = 0, normal = this.normalOf(p)) {
    this.points.push(...this.vertex(p, color, size, birth, phase))
    this.pointNormals.push(...normal)
    this.pointTargets.push(...this.targetOf(p))
  }
  // For lines the size slot is a brightness weight (1 for every line that is not a tapered strand).
  line(a: Vec3, b: Vec3, color = WHITE, birth = 0, phase = 0, weight = 1, targets?: readonly [Vec3, Vec3]) {
    this.lines.push(...this.vertex(a, color, weight, birth, phase), ...this.vertex(b, color, weight, birth, phase + .006))
    this.lineNormals.push(...this.normalOf(a), ...this.normalOf(b))
    this.lineTargets.push(...(targets ? targets[0] : this.targetOf(a)), ...(targets ? targets[1] : this.targetOf(b)))
  }
  path(points: Vec3[], color = WHITE, birth = 0) {
    for (let i = 1; i < points.length; i++) this.line(points[i - 1], points[i], color, birth, i / points.length)
  }
  cell(center: Vec3, radius: number, count: number, color = WHITE, birth = 0, elongation = 1, flattening = 1) {
    for (let i = 0; i < count * this.density; i++) {
      const theta = this.rand() * TAU, cos = this.rand() * 2 - 1
      const sin = Math.sqrt(1 - cos * cos)
      const irregular = 1 + .12 * Math.sin(theta * 7 + cos * 8) + .065 * Math.sin(theta * 17)
      const r = radius * irregular * (i % 5 === 0 ? .58 : 1)
      this.point([center[0] + Math.cos(theta) * sin * r, center[1] + cos * r * elongation, center[2] + Math.sin(theta) * sin * r * flattening], color, 1.3 + this.rand() * 1.8, birth, theta / TAU)
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
  // A neuron from its SWC-shaped morphology (spec 2026-10-08; redrawn the same day for Chief's
  // "realistic dan dramatic"). The soma is a 1:.85:.8 ellipsoid of membrane dots at half the colour
  // over a body of world-sized soft sprites with a warm nucleus. Each compartment becomes one core
  // line whose brightness follows its radius; on neurons of size .5 and up, shafts down to
  // SHEATH_RADIUS add a sheath of sprites one radius apart (at least .015, sparser at phone density) whose size
  // slot is the shaft radius (the shader scales them with the view), so thickness, taper and glow
  // come from area, not from parallel strands, and their dendrites carry spines at desktop density
  // (sub-pixel on phones). A lane (0–5) marks the network neurons the signal cycle drives and seeds
  // 25–40 release particles at the axon terminal.
  neuron(center: Vec3, size: number, depth: number, color = WHITE, lane = -1) {
    const tree = makeMorphology(Math.floor(this.rand() * 2 ** 31), size, depth)
    const dim = (c: Color, f: number): Color => [c[0] * f, c[1] * f, c[2] * f]
    const radius = .23 * size
    this.lit = true; this.soma = center; this.tag = tagOf(lane, 0)
    // Additive blending stacks the membrane dots, the body sprites and the nucleus, so each is kept
    // faint: together they read as a translucent cell with a warm core instead of a white star.
    this.cell(center, radius, 1700, dim(color, .38), 0, .85, .8)
    this.tag = tagOf(lane, 0, 1)
    for (let i = 0; i < 44 * this.density; i++) {
      const theta = this.rand() * TAU, cos = this.rand() * 2 - 1, sin = Math.sqrt(1 - cos * cos), r = radius * .55 * Math.cbrt(this.rand())
      this.point([center[0] + Math.cos(theta) * sin * r, center[1] + cos * r * .85, center[2] + Math.sin(theta) * sin * r * .8], dim(color, .07), radius * (.22 + this.rand() * .2), 0, this.rand())
    }
    for (let i = 0; i < 24 * this.density; i++) {
      const theta = this.rand() * TAU, cos = this.rand() * 2 - 1, sin = Math.sqrt(1 - cos * cos), r = radius * .2 * this.rand()
      this.point([center[0] + Math.cos(theta) * sin * r, center[1] + cos * r, center[2] + Math.sin(theta) * sin * r], dim(AMBER, .5), radius * .2, 0, this.rand())
    }
    const at = (c: Compartment): Vec3 => [center[0] + c.p[0], center[1] + c.p[1], center[2] + c.p[2]]
    let terminal = tree[0]
    for (let i = 1; i < tree.length; i++) {
      const c = tree[i], parent = tree[c.parent]
      if (c.type === 2 && c.phase >= terminal.phase) terminal = c
      if (parent.type === 1 || parent.p === c.p) continue
      const kind = c.type === 2 ? 1 : 0, shade = c.type === 2 ? BLUE : color
      const a = at(parent), b = at(c)
      this.tag = tagOf(lane, kind)
      this.line(a, b, shade, c.birth, c.phase, Math.min(1.8, .9 + c.radius / .05 * .6))
      if (i % 2 === 0) this.point(b, color, 1, c.birth, c.phase)
      if (size >= .5 && parent.radius >= SHEATH_RADIUS) {
        this.tag = tagOf(lane, kind, 1)
        const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), count = Math.max(1, Math.round(length / (Math.max(parent.radius, .015) * .85 / this.density)))
        for (let k = 0; k < count; k++) {
          const t = (k + .5) / count, r = parent.radius + (c.radius - parent.radius) * t
          if (r < SHEATH_RADIUS) break
          this.point([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], dim(shade, kind ? .3 : .25), r, c.birth, c.phase)
        }
      }
      if (size >= .5 && this.density >= .5 && c.type !== 2 && c.radius < .035) {
        this.tag = tagOf(lane, 0)
        const spines = Math.floor(1.3 * this.density + this.rand())
        for (let k = 0; k < spines; k++) {
          const t = this.rand(), side = this.rand() > .5 ? 1 : -1, reach = c.radius + .008 + this.rand() * .014
          const dx = b[0] - a[0], dy = b[1] - a[1], norm = Math.hypot(dx, dy) || 1
          this.point([a[0] + dx * t - dy / norm * reach * side, a[1] + dy * t + dx / norm * reach * side, a[2] + (b[2] - a[2]) * t + (this.rand() - .5) * .01], dim(color, .75), .55 + this.rand() * .3, c.birth, c.phase)
        }
      }
    }
    if (lane >= 0) {
      const count = 25 + Math.floor(this.rand() * 16), origin = at(terminal)
      for (let i = 0; i < count; i++) {
        const theta = this.rand() * TAU, cos = this.rand() * 2 - 1, sin = Math.sqrt(1 - cos * cos)
        this.point(origin, AMBER, 1.4, 0, this.rand(), [Math.cos(theta) * sin, cos, Math.sin(theta) * sin, tagOf(lane, 2)])
      }
    }
    this.soma = null; this.tag = -1
  }
  finish(): Geometry {
    const geometry: Geometry = { points: new Float32Array(this.points), lines: new Float32Array(this.lines) }
    if (this.lit) { geometry.pointNormals = new Float32Array(this.pointNormals); geometry.lineNormals = new Float32Array(this.lineNormals) }
    if (this.targeted) { geometry.pointTargets = new Float32Array(this.pointTargets); geometry.lineTargets = new Float32Array(this.lineTargets) }
    return geometry
  }
}

export const hubs: Vec3[] = [[-3.2, 1.6, 0], [2.9, 1.4, -.5], [-2.5, -1.7, .4], [2.8, -1.8, .1], [.1, 2.9, -1]]
// The distant field recedes this far into the fog as the constellation forms: 4, not the brief's 14.
// With the network camera at z 12, the shader's fog reaches its .12 floor at depth 41.4: at 14 only
// 37 % of the field stays above that floor (front edge .39), at 4 87 % does (front edge .74), so
// the field thins behind the constellation instead of vanishing.
export const RECEDE = 4
// Foreground neurons this close to their nearest hub gather into the constellation; the rest stay.
const GATHER = 3.5
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
export const nearestHub = (p: Vec3) => hubs.reduce((best, hub, i) => Math.hypot(p[0] - hub[0], p[1] - hub[1], p[2] - hub[2]) < Math.hypot(p[0] - hubs[best][0], p[1] - hubs[best][1], p[2] - hubs[best][2]) ? i : best, 0)
// A foreground neuron's seat in the constellation: on a ring of radius .75–1.15 around its hub, the
// n-th neuron of that hub a golden angle on from the last, so seats never stack; no randomness, so
// the seeded field is unchanged.
export function ringSeat(hub: number, order: number): Vec3 {
  const centre = hubs[hub], angle = hub + order * GOLDEN, radius = .75 + (order % 3) * .2
  return [centre[0] + Math.cos(angle) * radius, centre[1] + Math.sin(angle) * radius * .8, centre[2] + Math.sin(angle * 2) * .15]
}

export function makeNeuron(density: number): Geometry {
  const tissue = new Tissue(37, density)
  tissue.neuron([0, 0, 0], 1, 3)
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
  tissue.constellate([0, 0, -RECEDE])
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
  const shifts: Vec3[] = [], kept: boolean[] = [], filled = hubs.map(() => 0)
  for (let i = 0; i < 100 * density; i++) {
    const center: Vec3 = [(tissue.rand() - .5) * 15, (tissue.rand() - .5) * 10, (tissue.rand() - .5) * 8]
    centers.push(center)
    // Neurons that grew within GATHER of a hub join its ring; the outer field keeps its place, so the
    // frame around the constellation keeps its depth instead of emptying to flat black (brief
    // 2026-10-09 §7: the organic noise reduces, the background stays atmospheric).
    const hub = nearestHub(center), far = Math.hypot(center[0] - hubs[hub][0], center[1] - hubs[hub][1], center[2] - hubs[hub][2]) > GATHER
    const seat = far ? center : ringSeat(hub, filled[hub]++)
    const shift: Vec3 = [seat[0] - center[0], seat[1] - center[1], seat[2] - center[2]]
    shifts.push(shift); kept.push(far)
    tissue.constellate(shift)
    tissue.neuron(center, .16 + tissue.rand() * .15, 1, i % 3 ? BLUE : WHITE)
  }
  tissue.constellate(null)
  for (const [i, hub] of hubs.entries()) {
    // The five hubs and the centre are the six signal lanes of the activity cycle (spec 2026-10-08).
    tissue.neuron(hub, .65, 2, i === 4 ? [.7, .58, .45] : [.54, .62, .78], i)
    const path: Vec3[] = []
    for (let j = 0; j < 40; j++) {
      const t = j / 39
      path.push([hub[0] * (1 - t), hub[1] * (1 - t) + Math.sin(t * Math.PI) * .4, hub[2] * (1 - t)])
    }
    tissue.path(path, WHITE)
  }
  tissue.neuron([0, 0, 0], .7, 2, WHITE, 5)
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      const a = centers[i], b = centers[j]
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 2.8) {
        const sa = shifts[i], sb = shifts[j]
        // A link from a neuron that keeps its place to one that joins a ring would stretch across
        // the frame as the field orders; it folds into the neuron that stays instead.
        const targets: [Vec3, Vec3] = kept[i] === kept[j] ? [[a[0] + sa[0], a[1] + sa[1], a[2] + sa[2]], [b[0] + sb[0], b[1] + sb[1], b[2] + sb[2]]] : kept[i] ? [a, a] : [b, b]
        tissue.line(a, b, [.18, .28, .41], 0, tissue.rand(), 1, targets)
      }
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
// The founder's relief, calibrated by hand in the source-image coordinates of the 2026-10-08
// half-body portrait (500×500: head at u .36–.61 and v .03–.43, shoulders at v .46, crossed arms
// around v .76): a head ellipsoid with nose, brow, eye sockets, cheeks, lips, chin and neck over a
// low torso with the forearms raised a little, so the figure has volume while lighting, beard and
// the black suit never become bumps.
export function faceDepth(u: number, v: number): number {
  const bulge = (x: number, y: number, rx: number, ry: number) => Math.exp(-(((u - x) / rx) ** 2 + ((v - y) / ry) ** 2) * 2)
  const head = Math.sqrt(Math.max(0, 1 - ((u - .485) / .125) ** 2 - ((v - .235) / .21) ** 2))
  const torso = Math.sqrt(Math.max(0, 1 - ((u - .5) / .4) ** 2 - ((v - .8) / .34) ** 2))
  return -.1 + head * .43 + torso * .14
    + .16 * bulge(.486, .265, .022, .05) + .22 * bulge(.486, .30, .03, .024)
    - .1 * bulge(.425, .235, .042, .02) - .1 * bulge(.545, .235, .042, .02)
    + .07 * bulge(.405, .30, .05, .045) + .07 * bulge(.567, .30, .05, .045)
    + .045 * bulge(.486, .35, .055, .018) + .08 * bulge(.486, .415, .065, .035)
    + .05 * bulge(.486, .49, .07, .06)
    + .06 * bulge(.33, .78, .14, .07) + .06 * bulge(.67, .78, .14, .07)
}

// The order the face grows its neural features in: nose, eyes and lips first, then the cheeks,
// hair and jaw, and the shoulders and arms last (the .98 cap). Coordinates refer to the
// unchanged source photograph.
export function faceContour(u: number, v: number): number {
  const reach = (x: number, y: number, rx: number, ry: number) => Math.hypot((u - x) / rx, (v - y) / ry)
  return Math.min(.98, .08 + Math.min(
    reach(.486, .30, .11, .13) * .34,
    .04 + reach(.425, .235, .085, .095) * .36,
    .04 + reach(.545, .235, .085, .095) * .36,
    .08 + reach(.486, .35, .1, .1) * .34,
  ))
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
