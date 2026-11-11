// Borrows the male reference's muscles into the female Atlas body (Chief 2026-10-07: "ototnya mana",
// "benahi apapun caranya"). Upstream Human Atlas borrows only bones and deliberately leaves muscle
// out; MedBoard adds it under its own system, "Otot dari referensi pria", so the borrowing stays
// visible. The donor leg muscles (a female source) keep the legs; everything above and below them
// comes from here.
//
// Placement follows the bones the muscle sits on. Upstream already placed 180 male bones in the
// female body (system `borrowed`); 178 of them keep the male vertices in order, so each gives an
// exact similarity transform (rotation, uniform scale, translation; Horn's quaternion method). The
// spine, sternum and hip bones exist natively in both bodies and get a box fit instead. Each muscle
// vertex follows its three nearest bones, weighted by 1/d², and normals are recomputed afterwards.
// Leg muscles (nearest bone femur, patella, tibia or fibula, or the hip bone below the iliac crest)
// stay with the donor set; the female's own eye muscles are not duplicated.
//
// Usage, after scripts/atlas/import-human-atlas.mjs (which resets the manifest):
//   node scripts/atlas/borrow-muscles.mjs
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

const root = path.join(process.cwd(), 'public', 'atlas')
const readAtlas = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const chunkFile = (url) => path.join(process.cwd(), 'public', url)
const male = readAtlas('atlas.json')
const female = readAtlas('atlas-female.json')
const SYSTEM = 'borrowed-muscle'
const CHUNK_LIMIT = 4_000_000

// --- undo a previous run -------------------------------------------------
const kept = female.parts.filter((part) => part.system !== SYSTEM)
if (kept.length < female.parts.length) {
  const keep = Math.max(...kept.map((part) => part.chunk)) + 1
  for (const chunk of female.chunks.slice(keep)) rmSync(chunkFile(chunk.url), { force: true })
  female.chunks = female.chunks.slice(0, keep)
  female.parts = kept
  female.concepts = female.concepts.filter((concept) => !concept.id.startsWith('BORROWED-MUSCLE:'))
  female.triangles = kept.reduce((sum, part) => sum + part.indexCount / 3, 0)
  delete female.borrowedMuscle
  console.log('removed the muscles of an earlier run')
}

const load = (atlas) => atlas.chunks.map((chunk) => gunzipSync(readFileSync(chunkFile(chunk.url))))
const maleBuffers = load(male)
const femaleBuffers = load(female)
const positionsOf = (buffers, part) => {
  const b = buffers[part.chunk]
  return new Float32Array(b.buffer, b.byteOffset + part.positions, part.vertexCount * 3)
}
const indicesOf = (buffers, part) => {
  const b = buffers[part.chunk]
  return new Uint32Array(b.buffer, b.byteOffset + part.indices, part.indexCount)
}

// --- similarity transforms -------------------------------------------------
const centroid = (pts) => {
  const c = [0, 0, 0]
  for (let i = 0; i < pts.length; i += 3) for (let k = 0; k < 3; k++) c[k] += pts[i + k]
  return c.map((v) => v / (pts.length / 3))
}
const rotate = (q, v) => {
  const [w, x, y, z] = q
  return [
    (1 - 2 * (y * y + z * z)) * v[0] + 2 * (x * y - w * z) * v[1] + 2 * (x * z + w * y) * v[2],
    2 * (x * y + w * z) * v[0] + (1 - 2 * (x * x + z * z)) * v[1] + 2 * (y * z - w * x) * v[2],
    2 * (x * z - w * y) * v[0] + 2 * (y * z + w * x) * v[1] + (1 - 2 * (x * x + y * y)) * v[2],
  ]
}
/** Horn (1987): best rotation from the largest eigenvector of a 4x4 matrix, then the scale. */
function similarity(from, onto) {
  const a = centroid(from)
  const b = centroid(onto)
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  let norm = 0
  for (let i = 0; i < from.length; i += 3) {
    const p = [from[i] - a[0], from[i + 1] - a[1], from[i + 2] - a[2]]
    const r = [onto[i] - b[0], onto[i + 1] - b[1], onto[i + 2] - b[2]]
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) S[j][k] += p[j] * r[k]
    norm += p[0] * p[0] + p[1] * p[1] + p[2] * p[2]
  }
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ]
  const shift = N.flat().reduce((sum, v) => sum + Math.abs(v), 0)
  let q = [1, 0, 0, 0]
  for (let it = 0; it < 200; it++) {
    const next = N.map((row, j) => row.reduce((sum, v, k) => sum + v * q[k], 0) + shift * q[j])
    const length = Math.hypot(...next)
    q = next.map((v) => v / length)
  }
  let dot = 0
  for (let i = 0; i < from.length; i += 3) {
    const p = rotate(q, [from[i] - a[0], from[i + 1] - a[1], from[i + 2] - a[2]])
    dot += p[0] * (onto[i] - b[0]) + p[1] * (onto[i + 1] - b[1]) + p[2] * (onto[i + 2] - b[2])
  }
  const scale = dot / norm
  const apply = (p) => {
    const r = rotate(q, [p[0] - a[0], p[1] - a[1], p[2] - a[2]])
    return [scale * r[0] + b[0], scale * r[1] + b[1], scale * r[2] + b[2]]
  }
  let error = 0
  for (let i = 0; i < from.length; i += 3) {
    const p = apply([from[i], from[i + 1], from[i + 2]])
    error += (p[0] - onto[i]) ** 2 + (p[1] - onto[i + 1]) ** 2 + (p[2] - onto[i + 2]) ** 2
  }
  return { apply, scale, rms: Math.sqrt(error / (from.length / 3)) }
}
/** Box fit: uniform scale and translation carrying one structure's box onto the other's. */
function boxFit(fromParts, fromAtlas, ontoParts) {
  const box = (parts) => {
    const lo = [Infinity, Infinity, Infinity]
    const hi = [-Infinity, -Infinity, -Infinity]
    for (const part of parts) for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], part.bounds[0][k])
      hi[k] = Math.max(hi[k], part.bounds[1][k])
    }
    return Array.from({ length: 8 }, (_, c) => [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]]).flat()
  }
  return similarityNoTurn(box(fromParts), box(ontoParts))
}
function similarityNoTurn(from, onto) {
  const a = centroid(from)
  const b = centroid(onto)
  let num = 0
  let den = 0
  for (let i = 0; i < from.length; i++) {
    num += (from[i] - a[i % 3]) * (onto[i] - b[i % 3])
    den += (from[i] - a[i % 3]) ** 2
  }
  const scale = num / den
  return { apply: (p) => p.map((v, k) => scale * (v - a[k]) + b[k]), scale, rms: 0 }
}

// --- the bones muscles follow ---------------------------------------------
const SOFT = /iliotibial|tibialis|fibularis|levator scapulae|subscapularis|intervertebral disk/i
const maleBones = male.parts.filter((part) => part.system === 'skeletal' && !SOFT.test(part.name))
const maleByName = new Map(maleBones.map((part) => [part.name, part]))
const ORDINAL = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth']
const NATIVE = {
  Atlas: ['Cervical vertebra 1'], Axis: ['Cervical vertebra 2'], Sacrum: ['Sacrum'],
  'Body of sternum': ['Sternum'], Manubrium: ['Manubrium'],
  'Left hip bone': ['Ilium compact bone (left)', 'Pubis compact bone (left)', 'Ischium compact bone (left)'],
  'Right hip bone': ['Ilium compact bone (right)', 'Pubis compact bone (right)', 'Ischium compact bone (right)'],
}
for (const [n, word] of ORDINAL.entries()) {
  if (n >= 2 && n < 7) NATIVE[`${word} cervical vertebra`] = [`Cervical vertebra ${n + 1}`]
  NATIVE[`${word} thoracic vertebra`] = [`Thoracic vertebra ${n + 1}`]
  if (n < 5) NATIVE[`${word} lumbar vertebra`] = [`Lumbar vertebra ${n + 1}`]
}
/** Donor territory: a muscle whose vertices mostly sit by these bones belongs to the leg set. */
const LEG = /^(left|right) (femur|patella|tibia|fibula)$/i

const transforms = new Map()
const residuals = []
for (const part of female.parts.filter((entry) => entry.system === 'borrowed')) {
  const source = maleByName.get(part.name)
  if (!source || source.vertexCount !== part.vertexCount) continue
  const fit = similarity(positionsOf(maleBuffers, source), positionsOf(femaleBuffers, part))
  transforms.set(source.id, fit)
  residuals.push([part.name, fit.rms])
}
for (const [maleName, femaleNames] of Object.entries(NATIVE)) {
  const source = maleByName.get(maleName)
  const host = female.parts.filter((part) => femaleNames.includes(part.name))
  if (!source || host.length !== femaleNames.length) throw new Error(`anchor missing: ${maleName}`)
  transforms.set(source.id, boxFit([source], male, host))
}
residuals.sort((a, b) => b[1] - a[1])
console.log(`exact bone fits: ${residuals.length}; worst RMS ${residuals.slice(0, 4).map(([name, rms]) => `${name} ${(rms * 1000).toFixed(1)} mm`).join(', ')}`)

// Sample every bone so "nearest bone" means nearest surface, not nearest centre.
const samples = []
for (const bone of maleBones) {
  const pts = positionsOf(maleBuffers, bone)
  const step = Math.max(1, Math.floor(bone.vertexCount / 40))
  for (let v = 0; v < bone.vertexCount; v += step) samples.push({ bone, x: pts[v * 3], y: pts[v * 3 + 1], z: pts[v * 3 + 2] })
}
const fitted = samples.filter((sample) => transforms.has(sample.bone.id))
function nearestBones(list, x, y, z, k) {
  const best = new Map()
  for (const s of list) {
    const d = (s.x - x) ** 2 + (s.y - y) ** 2 + (s.z - z) ** 2
    const seen = best.get(s.bone.id)
    if (seen === undefined || d < seen) best.set(s.bone.id, d)
  }
  return [...best.entries()].sort((a, b) => a[1] - b[1]).slice(0, k)
}

// --- which muscles --------------------------------------------------------
const OWN = /^(left|right) ((superior|inferior) (oblique|rectus)|(medial|lateral) rectus)$|levator palpebrae/i
// A muscle the female body already has (donor legs, own eye and knee) is never doubled, whatever
// bone it sits nearest to: psoas major lies along the spine but is in the donor set.
const plain = (name) => name.toLowerCase().replace(/\((left|right)\)|\b(left|right)\b|\bhead\b/g, ' ').replace(/\s+/g, ' ').trim()
const present = new Set(female.parts.filter((part) => ['donor-muscle', 'muscular'].includes(part.system)).map((part) => plain(part.name)))
const borrowed = []
const skipped = []
for (const muscle of male.parts.filter((part) => part.system === 'muscular')) {
  if (OWN.test(muscle.name)) {
    skipped.push(`${muscle.name} (own eye muscle)`)
    continue
  }
  if (present.has(plain(muscle.name))) {
    skipped.push(`${muscle.name} (already in the female body)`)
    continue
  }
  const pts = positionsOf(maleBuffers, muscle)
  const votes = new Map()
  const step = Math.max(1, Math.floor(muscle.vertexCount / 60))
  for (let v = 0; v < muscle.vertexCount; v += step) {
    const [[id]] = nearestBones(samples, pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2], 1)
    votes.set(id, (votes.get(id) ?? 0) + 1)
  }
  const [topId] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]
  const top = male.parts.find((part) => part.id === topId)
  const centreY = (muscle.bounds[0][1] + muscle.bounds[1][1]) / 2
  // Hip muscles below the iliac crest belong to the donor set; abdominal wall muscles above it stay.
  const hipLow = /hip bone$/i.test(top.name) && centreY < top.bounds[1][1] - 0.04
  if (LEG.test(top.name) || hipLow) skipped.push(`${muscle.name} (${top.name})`)
  else borrowed.push(muscle)
}
console.log(`borrowing ${borrowed.length} muscles, leaving ${skipped.length} to the donor or own set`)
writeFileSync(path.join(process.cwd(), 'scripts', 'atlas', 'borrow-muscles.log'), [
  'BORROWED', ...borrowed.map((part) => part.name).sort(), '', 'LEFT OUT', ...skipped.sort(),
].join('\n') + '\n')

// --- move them --------------------------------------------------------------
const align = (n) => (n + 3) & ~3
const chunks = []
let current = { parts: [], size: 0 }
const parts = []
const concepts = []
let triangles = 0
for (const [index, muscle] of borrowed.entries()) {
  const source = positionsOf(maleBuffers, muscle)
  const indices = indicesOf(maleBuffers, muscle)
  const moved = new Float32Array(source.length)
  // Only bones around this muscle can be among its nearest three.
  let candidates = []
  for (const reach of [0.06, 0.15, 0.5]) {
    candidates = fitted.filter(
      (s) =>
        s.x > muscle.bounds[0][0] - reach && s.x < muscle.bounds[1][0] + reach &&
        s.y > muscle.bounds[0][1] - reach && s.y < muscle.bounds[1][1] + reach &&
        s.z > muscle.bounds[0][2] - reach && s.z < muscle.bounds[1][2] + reach
    )
    if (new Set(candidates.map((s) => s.bone.id)).size >= 3) break
  }
  for (let v = 0; v < muscle.vertexCount; v++) {
    const p = [source[v * 3], source[v * 3 + 1], source[v * 3 + 2]]
    const near = nearestBones(candidates, p[0], p[1], p[2], 3)
    let total = 0
    const out = [0, 0, 0]
    for (const [id, d2] of near) {
      const w = 1 / Math.max(d2, 1e-8)
      const q = transforms.get(id).apply(p)
      for (let k = 0; k < 3; k++) out[k] += w * q[k]
      total += w
    }
    for (let k = 0; k < 3; k++) moved[v * 3 + k] = out[k] / total
  }
  // Area-weighted normals from the moved triangles.
  const acc = new Float32Array(source.length)
  for (let t = 0; t < indices.length; t += 3) {
    const [i, j, k] = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3]
    const e1 = [moved[j] - moved[i], moved[j + 1] - moved[i + 1], moved[j + 2] - moved[i + 2]]
    const e2 = [moved[k] - moved[i], moved[k + 1] - moved[i + 1], moved[k + 2] - moved[i + 2]]
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    for (const at of [i, j, k]) for (let c = 0; c < 3; c++) acc[at + c] += n[c]
  }
  const normals = new Int16Array(source.length)
  for (let v = 0; v < muscle.vertexCount; v++) {
    const length = Math.hypot(acc[v * 3], acc[v * 3 + 1], acc[v * 3 + 2]) || 1
    for (let c = 0; c < 3; c++) normals[v * 3 + c] = Math.round((acc[v * 3 + c] / length) * 32767)
  }
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (let v = 0; v < muscle.vertexCount; v++) for (let k = 0; k < 3; k++) {
    lo[k] = Math.min(lo[k], moved[v * 3 + k])
    hi[k] = Math.max(hi[k], moved[v * 3 + k])
  }
  const bytes = align(moved.byteLength) + align(normals.byteLength) + indices.byteLength
  if (current.parts.length && current.size + bytes > CHUNK_LIMIT) {
    chunks.push(current)
    current = { parts: [], size: 0 }
  }
  const id = `BMU${String(index).padStart(4, '0')}`
  const conceptId = `BORROWED-MUSCLE:${muscle.id}`
  const entry = {
    id, name: muscle.name, conceptId, system: SYSTEM, chunk: female.chunks.length + chunks.length,
    positions: current.size, normals: current.size + align(moved.byteLength),
    indices: current.size + align(moved.byteLength) + align(normals.byteLength),
    vertexCount: muscle.vertexCount, indexCount: muscle.indexCount, bounds: [lo, hi],
  }
  current.parts.push({ entry, moved, normals, indices: new Uint32Array(indices) })
  current.size = align(current.size + bytes)
  parts.push(entry)
  concepts.push({ id: conceptId, name: muscle.name, elements: [id] })
  triangles += muscle.indexCount / 3
}
if (current.parts.length) chunks.push(current)

for (const [n, chunk] of chunks.entries()) {
  const buffer = Buffer.alloc(chunk.size)
  for (const { entry, moved, normals, indices } of chunk.parts) {
    Buffer.from(moved.buffer).copy(buffer, entry.positions)
    Buffer.from(normals.buffer).copy(buffer, entry.normals)
    Buffer.from(indices.buffer).copy(buffer, entry.indices)
  }
  const url = `/atlas/models/female-${female.chunks.length + n}.bin.gz`
  const gz = gzipSync(buffer, { level: 9 })
  writeFileSync(chunkFile(url), gz)
  chunks[n].manifest = { url, bytes: buffer.length, gzipBytes: gz.length }
}
female.chunks.push(...chunks.map((chunk) => chunk.manifest))
female.parts.push(...parts)
female.concepts.push(...concepts)
female.triangles += triangles
female.borrowedMuscle = {
  from: 'BodyParts3D 4.0',
  structures: parts.length,
  method:
    'each vertex follows its three nearest male bones (weights 1/d²): exact similarity fits to the 178 bones ' +
    'upstream borrowed, box fits to the spine, sternum and hip bones; normals recomputed',
}
writeFileSync(path.join(root, 'atlas-female.json'), JSON.stringify(female))
console.log(`added ${parts.length} muscles in ${chunks.length} chunks, ${chunks.reduce((n, c) => n + c.manifest.gzipBytes, 0)} bytes gzip`)
