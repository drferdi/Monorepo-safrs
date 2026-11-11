/**
 * Neural field (WebGL2): a real 3D neural network filmed by a slowly moving camera.
 *
 * - Geometry: procedural neurons (displaced cell bodies, branching tapered
 *   dendrites with small swellings) scattered through a volume.
 * - Material: wet-glass shading (fresnel rim, tight specular, inner glow,
 *   membrane net on cell bodies), distance fog for depth.
 * - Activity: each cell integrates inbound signals and fires an outward wave;
 *   firing is lagged by distance so activation sweeps through the network.
 * - Optics: optical depth of field (gathered bokeh), bloom, drifting bokeh
 *   particles, slight chromatic aberration, vignette and film grain.
 * - Opening: the camera pushes in and racks focus while dendrites grow.
 *
 * No dependencies. Returns null when WebGL2 is unavailable so the caller can
 * fall back to the 2D renderer.
 */
import type { FieldHandle, Palette, RGB } from './palette'

const TAU = Math.PI * 2
const STEP = 0.07 // world units between dendrite rings
const MAX_D = 9.5 // longest path from a cell body, for growth
const FIRE_PERIOD = 7.2 // seconds between activation sweeps
const STRIDE = 17 // floats per vertex
const FOCUS = 6.5 // camera distance to the hero cell

/** Opening timing (seconds), shared with the lens overlay and the 2D fallback. */
export const NEURAL_INTRO = { reveal: 1.1, releaseAt: 3.8, releaseDur: 1.7, growDur: 3.2 }

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
const easeOut = (v: number): number => 1 - (1 - v) ** 3
const easeInOut = (v: number): number => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)

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
/* Vector helpers                                                       */
/* ------------------------------------------------------------------ */

type Vec3 = [number, number, number]
type Tri = [number, number, number]

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

function perspective(fovY: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fovY / 2)
  const nf = 1 / (near - far)
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3): number[] {
  const z = norm(sub(eye, target))
  const x = norm(cross(up, z))
  const y = cross(z, x)
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]
}

function multiply(a: number[], b: number[]): number[] {
  const o = new Array<number>(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
    }
  }
  return o
}

/* ------------------------------------------------------------------ */
/* Geometry                                                             */
/* ------------------------------------------------------------------ */

function icosphere(level: number): { verts: Vec3[]; faces: Tri[] } {
  const t = (1 + Math.sqrt(5)) / 2
  const seeds: Vec3[] = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
  const verts: Vec3[] = seeds.map((s) => norm(s))
  let faces: Tri[] = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  for (let l = 0; l < level; l++) {
    const cache = new Map<string, number>()
    const mid = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`
      const hit = cache.get(key)
      if (hit !== undefined) return hit
      const index = verts.push(norm(add(verts[a], verts[b]))) - 1
      cache.set(key, index)
      return index
    }
    const next: Tri[] = []
    for (const [a, b, c] of faces) {
      const ab = mid(a, b)
      const bc = mid(b, c)
      const ca = mid(c, a)
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca])
    }
    faces = next
  }
  return { verts, faces }
}

interface NeuronMeta {
  c: Vec3
  r: number
  lag: number
  delay: number
  seed: number
}

interface PathPoint {
  p: Vec3
  r: number
  d: number
}

interface NeuronConfig {
  c: Vec3
  r: number
  arms: number
  reach: [number, number]
  levels: number
  sides: number
  detail: number
  lag: number
  delay: number
  flat?: number
  r0?: number
}

interface Network {
  vertices: Float32Array
  indices: Uint32Array
  points: Float32Array
  pointCount: number
}

function buildNetwork(): Network {
  const rand = mulberry32(90417)
  const range = (min: number, max: number): number => min + rand() * (max - min)
  const randVec = (): Vec3 => norm([range(-1, 1), range(-1, 1), range(-1, 1)])
  const V: number[] = []
  const I: number[] = []
  let count = 0

  const pushV = (p: Vec3, n: Vec3, d: number, arm: number, kind: number, br: number, neu: NeuronMeta): number => {
    V.push(p[0], p[1], p[2], n[0], n[1], n[2], d, arm, kind, br, neu.lag, neu.delay, neu.r, neu.seed, neu.c[0], neu.c[1], neu.c[2])
    return count++
  }
  const posAt = (at: number): Vec3 => [V[at], V[at + 1], V[at + 2]]

  function addTube(path: PathPoint[], sides: number, arm: number, br: number, neu: NeuronMeta): void {
    const n = path.length - 1
    let T = norm(sub(path[1].p, path[0].p))
    let N = norm(cross(T, Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]))
    const base = count
    for (let i = 0; i <= n; i++) {
      T = norm(sub(path[Math.min(i + 1, n)].p, path[Math.max(i - 1, 0)].p))
      N = norm(sub(N, mul(T, dot(N, T))))
      const B = cross(T, N)
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * TAU
        const nrm = add(mul(N, Math.cos(a)), mul(B, Math.sin(a)))
        pushV(add(path[i].p, mul(nrm, path[i].r)), nrm, path[i].d, arm, 0, br, neu)
      }
    }
    for (let i = 0; i < n; i++) {
      for (let s = 0; s < sides; s++) {
        const a = base + i * sides + s
        const b = base + i * sides + ((s + 1) % sides)
        I.push(a, a + sides, b, b, a + sides, b + sides)
      }
    }
  }

  function addNeuron(cfg: NeuronConfig): void {
    const { c, r, arms, reach, levels, sides, detail } = cfg
    const neu: NeuronMeta = { c, r, lag: cfg.lag, delay: cfg.delay, seed: rand() }
    const r0 = cfg.r0 ?? r * 0.145

    // outward headings, kept mostly across the camera plane so arms cross the focal plane
    const dirs: Vec3[] = []
    let guard = 0
    while (dirs.length < arms && guard++ < 400) {
      const v = randVec()
      const dir = norm([v[0], v[1], v[2] * (cfg.flat ?? 0.6)])
      if (dir[2] < 0.45 && dirs.every((o) => dot(o, dir) < 0.74)) dirs.push(dir)
    }

    // cell body: displaced sphere, bulging toward each arm
    const ico = icosphere(detail)
    const s1 = range(0, 9)
    const s2 = range(0, 9)
    const somaBase = count
    for (const u of ico.verts) {
      let f = 1 + 0.09 * (Math.sin(u[0] * 3.1 + s1) * Math.sin(u[1] * 2.7 + s2) + Math.sin(u[2] * 3.7 + s2) * Math.sin(u[0] * 1.9 + s1))
      f += 0.035 * Math.sin(u[0] * 7.3 + s2) * Math.sin(u[1] * 6.1 + s1) * Math.sin(u[2] * 6.7)
      for (const dir of dirs) f += 0.2 * Math.max(0, dot(u, dir)) ** 5
      pushV(add(c, mul(u, r * f)), u, 0, 0, 1, 0, neu)
    }
    const acc: Vec3[] = ico.verts.map((): Vec3 => [0, 0, 0])
    for (const [a, b, d] of ico.faces) {
      I.push(somaBase + a, somaBase + b, somaBase + d)
      const pa = posAt((somaBase + a) * STRIDE)
      const pb = posAt((somaBase + b) * STRIDE)
      const pd = posAt((somaBase + d) * STRIDE)
      const fn = cross(sub(pb, pa), sub(pd, pa))
      for (const k of [a, b, d]) acc[k] = add(acc[k], fn)
    }
    acc.forEach((nv, k) => {
      let nn = norm(nv)
      if (dot(nn, ico.verts[k]) < 0) nn = mul(nn, -1)
      const at = (somaBase + k) * STRIDE + 3
      V[at] = nn[0]
      V[at + 1] = nn[1]
      V[at + 2] = nn[2]
    })

    const grow = (start: Vec3, heading: Vec3, length: number, width: number, level: number, d0: number, arm: number): void => {
      const n = Math.max(6, Math.round(length / STEP))
      const path: PathPoint[] = []
      let p = start
      let v = heading
      let w: Vec3 = [0, 0, 0]
      const beadF = range(5, 9)
      const beadP = range(0, TAU)
      const spawn: Array<[number, Vec3]> = []
      const chance = level === 0 ? 0.085 : 0.06
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const s = i * STEP
        const flare = level === 0 ? r * 0.4 * Math.exp(-s / (r * 0.7)) : 0
        const bead = 1 + 0.3 * Math.max(0, Math.sin(s * beadF + beadP)) ** 4 * Math.min(1, s / 0.6)
        path.push({ p, r: (width * (1 - 0.86 * t) + 0.005) * bead + flare, d: d0 + s })
        if (level < levels && i > 5 && i < n - 4 && rand() < chance) spawn.push([i, v])
        w = add(mul(w, 0.86), mul(randVec(), 0.05))
        v = norm(add(add(v, w), mul(sub(heading, v), level === 0 ? 0.035 : 0.018)))
        p = add(p, mul(v, STEP))
      }
      addTube(path, sides, arm, rand(), neu)
      for (const [i, vi] of spawn) {
        const t = i / n
        const perp = norm(cross(vi, randVec()))
        const ang = range(0.45, 1.05)
        const heading2 = norm(add(mul(vi, Math.cos(ang)), mul(perp, Math.sin(ang))))
        grow(path[i].p, heading2, length * (1 - t) * range(0.5, 0.9) + 0.45, (width * (1 - 0.86 * t) + 0.005) * 0.72, level + 1, d0 + i * STEP, arm)
      }
    }
    for (const dir of dirs) {
      grow(add(c, mul(dir, r * 0.45)), dir, range(reach[0], reach[1]), r0 * range(0.8, 1.15), 0, 0, rand())
    }
  }

  // hero on the focal plane, neighbours behind (fogged, soft) and two in front (large, very soft)
  const hero: Vec3 = [0.2, 0.05, 0]
  const lagFor = (c: Vec3): number => Math.hypot(c[0] - hero[0], c[1] - hero[1], c[2] - hero[2]) * 0.42
  const delayFor = (c: Vec3): number => Math.min(1, Math.hypot(c[0] - hero[0], c[1] - hero[1], c[2] - hero[2]) / 11)
  addNeuron({ c: hero, r: 0.38, arms: 10, reach: [3.2, 6.4], levels: 3, sides: 9, detail: 4, lag: 0, delay: 0, flat: 0.38 })
  const others: Vec3[] = [
    [-3.6, 1.9, -2.2], [3.9, -1.6, -2.8], [-2.6, -2.6, -3.6], [3.1, 2.7, -4.2],
    [-7, 0.5, -7], [0.5, 3.8, -7.5], [7, 1.5, -8], [-5, -4, -9], [5.5, -4.2, -9.5], [0, -4.5, -6.5],
    [-3.5, -2.0, 2.7], [3.7, 2.3, 3.1],
  ]
  for (const c of others) {
    addNeuron({ c, r: range(0.26, 0.34), arms: 6, reach: [2.4, 5], levels: 2, sides: 6, detail: 3, lag: lagFor(c) + range(0, 0.5), delay: delayFor(c) })
  }

  // drifting particles: x y z seed | size warm
  const P: number[] = []
  const POINTS = 420
  for (let i = 0; i < POINTS; i++) {
    P.push(range(-9.5, 9.5), range(-6, 6), range(-9.5, 4.6), rand(), range(0.6, 1.6), rand() < 0.76 ? 1 : 0)
  }

  return { vertices: new Float32Array(V), indices: new Uint32Array(I), points: new Float32Array(P), pointCount: POINTS }
}

/* ------------------------------------------------------------------ */
/* Shaders                                                              */
/* ------------------------------------------------------------------ */

const NOISE = `
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`

const SCENE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aData;   // d, arm seed, kind (1 = cell body), branch seed
layout(location=3) in vec4 aNeuron; // firing lag, growth delay, body radius, seed
layout(location=4) in vec3 aCenter;
uniform mat4 uViewProj;
uniform float uTime, uGrow;
out vec3 vPos, vNormal, vObj;
out vec4 vData;
out float vGrown, vTl;
void main(){
  float g = clamp(uGrow * 1.3 - aNeuron.y * 0.3, 0.0, 1.0);
  vGrown = uGrow >= 1.0 ? 100.0 : (1.0 - pow(1.0 - g, 3.0)) * ${MAX_D.toFixed(1)};
  vTl = mod(uTime - aNeuron.x + 720.0, ${FIRE_PERIOD.toFixed(1)});
  vec3 p = aPos;
  vObj = (aPos - aCenter) / aNeuron.z;
  if (aData.z > 0.5) {
    float appear = clamp(vGrown / (aNeuron.z * 5.0), 0.0, 1.0);
    float flash = exp(-vTl * 1.6);
    p = aCenter + (p - aCenter) * (0.45 + 0.55 * appear) * (1.0 + 0.045 * flash + 0.012 * sin(uTime * 0.9 + aNeuron.w * 20.0));
  }
  float amp = 0.012 + min(0.30, aData.x * 0.05);
  vec3 q = p * 0.42 + aNeuron.w * 10.0;
  p += amp * vec3(
    sin(q.y * 1.7 + uTime * 0.31) + 0.5 * sin(q.z * 2.3 + uTime * 0.17),
    sin(q.z * 1.9 + uTime * 0.27) + 0.5 * sin(q.x * 2.1 + uTime * 0.21),
    sin(q.x * 1.5 + uTime * 0.23) + 0.5 * sin(q.y * 2.5 + uTime * 0.19));
  vPos = p; vNormal = aNormal; vData = aData;
  gl_Position = uViewProj * vec4(p, 1.0);
}`

const SCENE_FS = `#version 300 es
precision highp float;
in vec3 vPos, vNormal, vObj;
in vec4 vData;
in float vGrown, vTl;
uniform vec3 uCam, uDeep, uBody, uRim, uSpec, uInner, uPulse, uFog;
uniform float uTime, uFocus, uAperture, uSignals, uGrow;
out vec4 frag;
${NOISE}
float sq(float x){ return x * x; }
void main(){
  float d = vData.x; float arm = vData.y; bool body = vData.z > 0.5;
  if (!body && d > vGrown) discard;
  vec3 N = normalize(vNormal);
  vec3 toCam = uCam - vPos; float dist = length(toCam); vec3 V = toCam / dist;
  if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 L = normalize(vec3(-0.5, 0.7, 0.6));
  float wrap = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float spec = pow(nh, 90.0) * 1.7 + pow(nh, 14.0) * 0.16;
  float fres = pow(1.0 - ndv, 2.2);

  vec3 col = mix(uDeep, uBody, wrap * wrap);
  col = mix(col, uFog * 2.2 + uBody * 0.35, ndv * ndv * 0.4); // see-through centre
  col += uRim * fres * 1.15;
  col += uSpec * spec * (0.75 + 0.25 * vnoise(vec3(d * 9.0, arm * 40.0, 0.0)));
  col += uInner * pow(clamp(dot(V, -L) * 0.5 + 0.5, 0.0, 1.0), 2.0) * 0.14 * (1.0 - ndv);

  float T = ${FIRE_PERIOD.toFixed(1)};
  float flash = exp(-vTl * 1.6);
  float charge = smoothstep(T - 2.6, T, vTl);
  if (body) {
    // membrane net: ridges of warped noise, so the pattern reads organic rather than grid-like
    vec3 q = vObj * 2.3 + vec3(0.0, uTime * 0.03, 0.0);
    q = mat3(0.8, 0.6, 0.0, -0.6, 0.8, 0.0, 0.0, 0.0, 1.0) * q;
    q += 0.75 * vec3(vnoise(q * 1.4 + 5.0), vnoise(q * 1.4 + 11.0), vnoise(q * 1.4 + 17.0));
    float net = pow(1.0 - abs(fbm(q) * 2.0 - 1.0), 5.0) + 0.5 * pow(1.0 - abs(fbm(q * 2.3 + 3.7) * 2.0 - 1.0), 5.0);
    col += uRim * net * 0.3 * (0.15 + 0.85 * ndv);
    col += uInner * pow(ndv, 1.7) * (0.13 + (1.15 * flash + 0.3 * charge) * uSignals);
  } else {
    float wave = exp(-sq((d - vTl * 2.4) / 0.2)) * exp(-vTl * 0.5);
    float tn = T - vTl;
    float inbound = step(0.45, arm) * exp(-sq((d - tn * (0.9 + arm)) / 0.12)) * smoothstep(4.6, 3.4, tn);
    float tn2 = mod(tn + T * 0.5, T);
    float inbound2 = step(arm, 0.5) * exp(-sq((d - tn2 * (1.0 + arm)) / 0.11)) * smoothstep(4.0, 3.0, tn2);
    float pulse = (wave * 1.0 + inbound * 0.7 + inbound2 * 0.5) * uSignals;
    col += uPulse * pulse * (0.9 + 0.9 * fres);
    // glowing growth front during the opening
    float tip = smoothstep(0.4, 0.0, vGrown - d) * step(uGrow, 0.999);
    col += uPulse * tip * 1.6;
  }

  float fog = 1.0 - exp(-max(dist - 5.0, 0.0) * 0.12);
  col = mix(col, uFog, fog);
  col *= mix(0.5, 1.0, smoothstep(2.4, 5.4, dist));
  col = min(col, vec3(1.7)); // keeps multisample edges clean under HDR
  float coc = clamp((1.0 / uFocus - 1.0 / dist) * uAperture, -1.0, 1.0);
  frag = vec4(col, coc * 0.5 + 0.5);
}`

const QUAD_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`

const BACKDROP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uBg0, uBg1;
uniform vec2 uOffset;
uniform float uTime, uAspect, uAmbient;
out vec4 frag;
${NOISE}
void main(){
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float n = fbm(vec3(p * 1.5 + uOffset * 0.12, uTime * 0.02));
  float r = length(p - vec2(0.03, 0.0) + uOffset * 0.03);
  vec3 col = mix(uBg0, uBg1, smoothstep(0.1, 1.0, n * 0.95 + 0.42 - r * 0.6) * uAmbient);
  col += uBg1 * 1.0 * exp(-r * r * 4.2) * uAmbient;
  frag = vec4(col, 1.0);
}`

const DOF_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uPx;
uniform float uMaxR, uRadScale;
out vec4 frag;
void main(){
  vec4 c = texture(uScene, vUv);
  float cs = c.a * 2.0 - 1.0;
  float centerSize = abs(cs) * uMaxR;
  vec3 color = c.rgb; float blur = abs(cs); float tot = 1.0;
  float radius = 0.9;
  for (float ang = 0.0; radius < uMaxR; ang += 2.39996323) {
    vec4 s = texture(uScene, vUv + vec2(cos(ang), sin(ang)) * uPx * radius);
    float ss = s.a * 2.0 - 1.0;
    float size = abs(ss) * uMaxR;
    if (ss > cs) size = clamp(size, 0.0, centerSize * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, size);
    color += mix(color / tot, s.rgb, m);
    blur += mix(blur / tot, abs(ss), m);
    tot += 1.0;
    radius += uRadScale / radius;
  }
  frag = vec4(color / tot, blur / tot);
}`

const COMPOSE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene, uDof;
uniform vec2 uDofPx;
out vec4 frag;
void main(){
  vec4 sharp = texture(uScene, vUv);
  vec4 soft = (texture(uDof, vUv + uDofPx * vec2(-0.75, -0.75)) + texture(uDof, vUv + uDofPx * vec2(0.75, -0.75))
             + texture(uDof, vUv + uDofPx * vec2(-0.75, 0.75)) + texture(uDof, vUv + uDofPx * vec2(0.75, 0.75))) * 0.25;
  frag = vec4(mix(sharp.rgb, soft.rgb, smoothstep(0.04, 0.3, soft.a)), 1.0);
}`

const POINT_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aPoint;
layout(location=1) in vec2 aInfo;
uniform mat4 uViewProj;
uniform vec3 uCam;
uniform float uTime, uFocus, uAperture, uPixels;
out float vCoc, vWarm, vAlpha;
void main(){
  float s = aPoint.w;
  vec3 p = aPoint.xyz;
  p += 0.4 * vec3(sin(uTime * 0.11 + s * 40.0), sin(uTime * 0.13 + s * 70.0), sin(uTime * 0.09 + s * 90.0));
  p.y = mod(p.y + uTime * (0.02 + s * 0.04) + 6.0, 12.0) - 6.0;
  float dist = length(uCam - p);
  float coc = abs(clamp((1.0 / uFocus - 1.0 / dist) * uAperture, -1.0, 1.0));
  float size = (2.2 + aInfo.x * 2.2) * (6.5 / dist) + coc * 46.0 * aInfo.x;
  gl_Position = uViewProj * vec4(p, 1.0);
  gl_PointSize = size * uPixels;
  float twinkle = 0.6 + 0.4 * sin(uTime * (0.5 + s * 1.5) + s * 100.0);
  vCoc = coc; vWarm = aInfo.y;
  vAlpha = twinkle * mix(1.6, 0.085, smoothstep(0.0, 0.5, coc)) * smoothstep(1.2, 2.4, dist);
}`

const POINT_FS = `#version 300 es
precision highp float;
in float vCoc, vWarm, vAlpha;
uniform vec3 uWarm, uCool;
uniform float uAmbient;
out vec4 frag;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
  if (r > 1.0) discard;
  float sharp = exp(-r * r * 5.0);                                             // in focus: tight glow
  float disc = smoothstep(1.0, 0.86, r) * (0.75 + 0.25 * smoothstep(0.55, 0.95, r)); // out of focus: bokeh disc
  float shape = mix(sharp, disc, smoothstep(0.08, 0.3, vCoc));
  vec3 col = mix(uCool, uWarm, vWarm) * mix(0.55, 1.0, vWarm);
  frag = vec4(col * shape * vAlpha * uAmbient, 1.0);
}`

const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uPx;
out vec4 frag;
void main(){
  vec3 c = (texture(uTex, vUv + uPx * vec2(-0.5, -0.5)).rgb + texture(uTex, vUv + uPx * vec2(0.5, -0.5)).rgb
          + texture(uTex, vUv + uPx * vec2(-0.5, 0.5)).rgb + texture(uTex, vUv + uPx * vec2(0.5, 0.5)).rgb) * 0.25;
  float l = max(c.r, max(c.g, c.b));
  frag = vec4(c * smoothstep(0.55, 1.1, l), 1.0);
}`

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uPx;
out vec4 frag;
void main(){
  vec3 c = texture(uTex, vUv + uPx * vec2(-1.0, -1.0)).rgb + texture(uTex, vUv + uPx * vec2(1.0, -1.0)).rgb
         + texture(uTex, vUv + uPx * vec2(-1.0, 1.0)).rgb + texture(uTex, vUv + uPx * vec2(1.0, 1.0)).rgb;
  frag = vec4(c * 0.25, 1.0);
}`

const FINAL_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uComp, uBloom;
uniform float uTime, uBloomK;
out vec4 frag;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 dir = vUv - 0.5; float r2 = dot(dir, dir);
  vec2 ca = dir * r2 * 0.005;
  vec3 col = vec3(texture(uComp, vUv - ca).r, texture(uComp, vUv).g, texture(uComp, vUv + ca).b);
  col += texture(uBloom, vUv).rgb * uBloomK;
  col *= mix(1.0, 0.4, smoothstep(0.12, 0.62, r2));
  col = col / (1.0 + max(col - 0.82, 0.0) * 0.85);
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.007;
  frag = vec4(col, 1.0);
}`

/* ------------------------------------------------------------------ */
/* Renderer                                                             */
/* ------------------------------------------------------------------ */

interface Program {
  p: WebGLProgram
  u: (name: string) => WebGLUniformLocation | null
}

interface Programs {
  scene: Program
  backdrop: Program
  dof: Program
  compose: Program
  point: Program
  bright: Program
  blur: Program
  final: Program
}

interface Target {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
  w: number
  h: number
}

interface Targets {
  msaa: WebGLFramebuffer
  msaaColor: WebGLRenderbuffer
  msaaDepth: WebGLRenderbuffer
  scene: Target
  dof: Target
  comp: Target
  bloom: Target[]
}

interface IntroState {
  t: number
  rate: number
}

interface NeuralOptions {
  intro?: boolean
  allowSoftware?: boolean
  adaptive?: boolean
  onTooSlow?: () => void
}

function contextOf(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    return canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader')
  return shader
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): Program {
  const p = gl.createProgram()
  if (!p) throw new Error('program')
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
  const cache: Record<string, WebGLUniformLocation | null> = {}
  return { p, u: (name) => (cache[name] ??= gl.getUniformLocation(p, name)) }
}

export function createNeuralField(
  canvas: HTMLCanvasElement,
  getPalette: () => Palette,
  options: NeuralOptions = {},
): FieldHandle | null {
  const gl = contextOf(canvas)
  if (!gl) return null
  return run(gl, canvas, getPalette, options)
}

function run(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, getPalette: () => Palette, options: NeuralOptions): FieldHandle | null {
  // Software-rendered WebGL (virtual desktops, blocked GPU drivers) is far too slow for this scene.
  if (!options.allowSoftware) {
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return null
  }

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const hdr = !!gl.getExtension('EXT_color_buffer_float')
  const COLOR = hdr ? gl.RGBA16F : gl.RGBA8
  const TYPE = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE
  const SAMPLES = Math.min(4, Number(gl.getParameter(gl.MAX_SAMPLES)))

  let progs: Programs
  try {
    progs = {
      scene: program(gl, SCENE_VS, SCENE_FS),
      backdrop: program(gl, QUAD_VS, BACKDROP_FS),
      dof: program(gl, QUAD_VS, DOF_FS),
      compose: program(gl, QUAD_VS, COMPOSE_FS),
      point: program(gl, POINT_VS, POINT_FS),
      bright: program(gl, QUAD_VS, BRIGHT_FS),
      blur: program(gl, QUAD_VS, BLUR_FS),
      final: program(gl, QUAD_VS, FINAL_FS),
    }
  } catch (error) {
    console.warn('Neural field: WebGL setup failed, using the 2D renderer.', error)
    return null
  }

  /* geometry */
  const net = buildNetwork()
  const meshVao = gl.createVertexArray()
  gl.bindVertexArray(meshVao)
  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, net.vertices, gl.STATIC_DRAW)
  const layout = [3, 3, 4, 4, 3]
  let offset = 0
  layout.forEach((size, i) => {
    gl.enableVertexAttribArray(i)
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, STRIDE * 4, offset * 4)
    offset += size
  })
  const ibo = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, net.indices, gl.STATIC_DRAW)

  const pointVao = gl.createVertexArray()
  gl.bindVertexArray(pointVao)
  const pbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, pbo)
  gl.bufferData(gl.ARRAY_BUFFER, net.points, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16)

  const quadVao = gl.createVertexArray()
  gl.bindVertexArray(null)

  /* render targets */
  let targets: Targets | null = null
  function makeTarget(w: number, h: number): Target {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, COLOR, w, h, 0, gl.RGBA, TYPE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { tex, fbo, w, h }
  }
  function freeTargets(): void {
    if (!targets) return
    for (const t of [targets.scene, targets.dof, targets.comp, ...targets.bloom]) {
      gl.deleteTexture(t.tex)
      gl.deleteFramebuffer(t.fbo)
    }
    gl.deleteFramebuffer(targets.msaa)
    gl.deleteRenderbuffer(targets.msaaColor)
    gl.deleteRenderbuffer(targets.msaaDepth)
    targets = null
  }
  function buildTargets(w: number, h: number): void {
    freeTargets()
    const msaa = gl.createFramebuffer()
    const msaaColor = gl.createRenderbuffer()
    const msaaDepth = gl.createRenderbuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, msaa)
    gl.bindRenderbuffer(gl.RENDERBUFFER, msaaColor)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, SAMPLES, COLOR, w, h)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaaColor)
    gl.bindRenderbuffer(gl.RENDERBUFFER, msaaDepth)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, SAMPLES, gl.DEPTH_COMPONENT24, w, h)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msaaDepth)
    const bloom: Target[] = []
    let bw = w
    let bh = h
    for (let i = 0; i < 5; i++) {
      bw = Math.max(2, bw >> 1)
      bh = Math.max(2, bh >> 1)
      bloom.push(makeTarget(bw, bh))
    }
    targets = {
      msaa, msaaColor, msaaDepth,
      scene: makeTarget(w, h),
      dof: makeTarget(Math.max(2, w >> 1), Math.max(2, h >> 1)),
      comp: makeTarget(w, h),
      bloom,
    }
  }

  /* state */
  let W = 0
  let H = 0
  let rw = 0
  let rh = 0
  let quality = 1
  let slowFrames = 0
  let warm = 0
  let raf = 0
  let last = 0
  let time = 30
  let onScreen = true
  let lost = false
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

  let intro: IntroState | null = options.intro && !reduceQuery.matches ? { t: 0, rate: 1 } : null
  let growth = intro ? 0 : 1
  let ambient = intro ? 0.3 : 1
  let signals = intro ? 0 : 1

  function applyIntro(dt: number): void {
    if (!intro) {
      signals = Math.min(1, signals + dt * 0.6)
      return
    }
    intro.t += dt * intro.rate
    growth = clamp01((intro.t - NEURAL_INTRO.releaseAt - 0.15) / NEURAL_INTRO.growDur)
    ambient = 0.3 + 0.7 * easeInOut(clamp01(growth * 1.8))
    if (growth >= 1) intro = null
  }

  const set3 = (prog: Program, name: string, c: RGB): void => gl.uniform3f(prog.u(name), c[0], c[1], c[2])
  function bindTex(prog: Program, name: string, unit: number, tex: WebGLTexture): void {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(prog.u(name), unit)
  }
  function pass(prog: Program, target: Target | null): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null)
    gl.viewport(0, 0, target ? target.w : canvas.width, target ? target.h : canvas.height)
    gl.useProgram(prog.p)
    gl.bindVertexArray(quadVao)
  }
  const drawQuad = (): void => gl.drawArrays(gl.TRIANGLES, 0, 3)

  function draw(): void {
    if (lost || !targets) return
    const P = getPalette().gl
    const t = targets

    // camera: slow drift, pointer parallax, opening push-in and focus pull
    const reveal = easeOut(growth)
    const push = (1 - reveal) * 4.2
    const eye: Vec3 = [
      Math.sin(time * 0.07) * 0.55 + pointer.x * 0.6,
      Math.cos(time * 0.09) * 0.32 + pointer.y * 0.4,
      FOCUS + Math.sin(time * 0.05) * 0.4 + push,
    ]
    const target: Vec3 = [0.2 + pointer.x * 0.08, 0.05 + pointer.y * 0.05, 0]
    const aspect = rw / rh
    const fov = (aspect < 0.8 ? 46 : 38) * (Math.PI / 180)
    const viewProj = multiply(perspective(fov, aspect, 0.1, 60), lookAt(eye, target, [0, 1, 0]))
    const focusDist = Math.hypot(eye[0] - 0.2, eye[1] - 0.05, eye[2])
    const focus = focusDist * (0.55 + 0.45 * easeInOut(clamp01(growth * 1.4)))
    const aperture = 10

    /* scene (multisampled) */
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.msaa)
    gl.viewport(0, 0, rw, rh)
    gl.disable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(true)
    gl.clearDepth(1)
    gl.clear(gl.DEPTH_BUFFER_BIT)

    gl.useProgram(progs.backdrop.p)
    gl.bindVertexArray(quadVao)
    set3(progs.backdrop, 'uBg0', P.bg0)
    set3(progs.backdrop, 'uBg1', P.bg1)
    gl.uniform2f(progs.backdrop.u('uOffset'), eye[0], eye[1])
    gl.uniform1f(progs.backdrop.u('uTime'), time)
    gl.uniform1f(progs.backdrop.u('uAspect'), aspect)
    gl.uniform1f(progs.backdrop.u('uAmbient'), ambient)
    drawQuad()

    if (growth > 0) {
      gl.enable(gl.DEPTH_TEST)
      const s = progs.scene
      gl.useProgram(s.p)
      gl.bindVertexArray(meshVao)
      gl.uniformMatrix4fv(s.u('uViewProj'), false, viewProj)
      gl.uniform3f(s.u('uCam'), eye[0], eye[1], eye[2])
      gl.uniform1f(s.u('uTime'), time)
      gl.uniform1f(s.u('uGrow'), growth)
      gl.uniform1f(s.u('uFocus'), focus)
      gl.uniform1f(s.u('uAperture'), aperture)
      gl.uniform1f(s.u('uSignals'), signals)
      const sceneColors: Array<[string, RGB]> = [
        ['uDeep', P.deep], ['uBody', P.body], ['uRim', P.rim], ['uSpec', P.spec],
        ['uInner', P.inner], ['uPulse', P.pulse], ['uFog', P.fog],
      ]
      for (const [name, color] of sceneColors) set3(s, name, color)
      gl.drawElements(gl.TRIANGLES, net.indices.length, gl.UNSIGNED_INT, 0)
      gl.disable(gl.DEPTH_TEST)
    }

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.msaa)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.scene.fbo)
    gl.blitFramebuffer(0, 0, rw, rh, 0, 0, rw, rh, gl.COLOR_BUFFER_BIT, gl.NEAREST)

    /* depth of field */
    const maxR = Math.max(4, rh * 0.021)
    pass(progs.dof, t.dof)
    bindTex(progs.dof, 'uScene', 0, t.scene.tex)
    gl.uniform2f(progs.dof.u('uPx'), 1 / rw, 1 / rh)
    gl.uniform1f(progs.dof.u('uMaxR'), maxR)
    gl.uniform1f(progs.dof.u('uRadScale'), (maxR * maxR) / 150) // about 75 samples
    drawQuad()

    pass(progs.compose, t.comp)
    bindTex(progs.compose, 'uScene', 0, t.scene.tex)
    bindTex(progs.compose, 'uDof', 1, t.dof.tex)
    gl.uniform2f(progs.compose.u('uDofPx'), 1 / t.dof.w, 1 / t.dof.h)
    drawQuad()

    /* particles, added over the composed frame */
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    const pp = progs.point
    gl.useProgram(pp.p)
    gl.bindVertexArray(pointVao)
    gl.uniformMatrix4fv(pp.u('uViewProj'), false, viewProj)
    gl.uniform3f(pp.u('uCam'), eye[0], eye[1], eye[2])
    gl.uniform1f(pp.u('uTime'), time)
    gl.uniform1f(pp.u('uFocus'), focus)
    gl.uniform1f(pp.u('uAperture'), aperture)
    gl.uniform1f(pp.u('uPixels'), rh / 900)
    gl.uniform1f(pp.u('uAmbient'), ambient)
    set3(pp, 'uWarm', P.warm)
    set3(pp, 'uCool', P.cool)
    gl.drawArrays(gl.POINTS, 0, net.pointCount)
    gl.disable(gl.BLEND)

    /* bloom */
    pass(progs.bright, t.bloom[0])
    bindTex(progs.bright, 'uTex', 0, t.comp.tex)
    gl.uniform2f(progs.bright.u('uPx'), 1 / rw, 1 / rh)
    drawQuad()
    for (let i = 1; i < t.bloom.length; i++) {
      pass(progs.blur, t.bloom[i])
      bindTex(progs.blur, 'uTex', 0, t.bloom[i - 1].tex)
      gl.uniform2f(progs.blur.u('uPx'), 0.5 / t.bloom[i - 1].w, 0.5 / t.bloom[i - 1].h)
      drawQuad()
    }
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    for (let i = t.bloom.length - 2; i >= 0; i--) {
      pass(progs.blur, t.bloom[i])
      bindTex(progs.blur, 'uTex', 0, t.bloom[i + 1].tex)
      gl.uniform2f(progs.blur.u('uPx'), 0.5 / t.bloom[i + 1].w, 0.5 / t.bloom[i + 1].h)
      drawQuad()
    }
    gl.disable(gl.BLEND)

    /* grade to screen */
    pass(progs.final, null)
    bindTex(progs.final, 'uComp', 0, t.comp.tex)
    bindTex(progs.final, 'uBloom', 1, t.bloom[0].tex)
    gl.uniform1f(progs.final.u('uTime'), reduceQuery.matches ? 0 : time)
    gl.uniform1f(progs.final.u('uBloomK'), P.bloom)
    drawQuad()
  }

  function frame(now: number): void {
    const real = Math.min(0.5, (now - last) / 1000 || 0)
    last = now
    time += Math.min(0.05, real)
    applyIntro(real)
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, real * 2)
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, real * 2)
    draw()

    // Adaptive resolution. Patient on purpose: ignores start-up, needs sustained slowness,
    // and never drops below 75% so the picture stays clean.
    warm += real
    if (warm > 4 && options.adaptive !== false) {
      if (real > 0.045) slowFrames += 1
      else slowFrames = Math.max(0, slowFrames - 0.5)
      if (slowFrames > 45) {
        slowFrames = 0
        if (quality > 0.75) {
          quality = Math.max(0.75, quality - 0.125)
          resize()
        } else if (real > 0.07 && options.onTooSlow) {
          options.onTooSlow() // still far too slow: hand over to the 2D renderer
          return
        }
      }
    }
    raf = requestAnimationFrame(frame)
  }

  function stop(): void {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function sync(): void {
    stop()
    if (!W || !H || lost) return
    if (reduceQuery.matches) {
      intro = null
      growth = 1
      ambient = 1
      signals = 1
      pointer.x = pointer.y = pointer.tx = pointer.ty = 0
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
    const budget = Math.sqrt(3.4e6 / (W * H)) // keeps very large canvases affordable
    const scale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, budget)) * quality
    const nw = Math.max(2, Math.round(W * scale))
    const nh = Math.max(2, Math.round(H * scale))
    if (nw !== rw || nh !== rh || !targets) {
      rw = nw
      rh = nh
      canvas.width = rw
      canvas.height = rh
      buildTargets(rw, rh)
    }
    draw()
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') return
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
    pointer.tx = inside ? x * 2 - 1 : 0
    pointer.ty = inside ? -(y * 2 - 1) : 0
  }
  const onPointerLeave = (): void => {
    pointer.tx = 0
    pointer.ty = 0
  }
  const onLost = (event: Event): void => {
    event.preventDefault()
    lost = true
    stop()
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
  canvas.addEventListener('webglcontextlost', onLost)

  resize()
  sync()

  return {
    redraw() {
      if (W && H && !raf) draw()
    },
    skipIntro() {
      if (!intro) return
      intro.t = Math.max(intro.t, NEURAL_INTRO.releaseAt)
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
      canvas.removeEventListener('webglcontextlost', onLost)
      freeTargets()
      for (const b of [vbo, ibo, pbo]) gl.deleteBuffer(b)
      for (const v of [meshVao, pointVao, quadVao]) gl.deleteVertexArray(v)
      for (const pr of Object.values(progs)) gl.deleteProgram(pr.p)
    },
  }
}
