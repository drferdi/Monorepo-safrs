import test from 'node:test'
import assert from 'node:assert/strict'
import { SHEATH_RADIUS, makeMorphology, makeNetwork, makeNeuron, tagOf } from './geometry.ts'

const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)
const children = compartments => compartments.map(() => [])
  .map((list, i, lists) => { compartments.forEach((c, j) => { if (c.parent === i) lists[i].push(j) }); return list })
// Decode as the shader does: kind = floor((tag + 1) / 100), the sheath flag is +50 inside the lane field.
const decode = tag => { const kind = Math.floor((tag + 1) / 100), rem = tag - kind * 100, sheath = rem >= 48.5 ? 1 : 0; return { kind, sheath, lane: rem - sheath * 50 } }
const pointsOf = geometry => {
  const list = []
  for (let v = 0; v < geometry.points.length / 9; v++) {
    const [x, y, z, r, g, b, size, birth, phase] = geometry.points.subarray(v * 9, v * 9 + 9)
    list.push({ p: [x, y, z], color: [r, g, b], size, birth, phase, ...decode(geometry.pointNormals[v * 4 + 3]) })
  }
  return list
}

test('the morphology is an SWC-shaped tree: soma first, valid parents, trunk radii at size 1', () => {
  const tree = makeMorphology(37, 1, 3)
  assert.equal(tree[0].type, 1); assert.equal(tree[0].parent, -1); close(tree[0].radius, .23, 1e-9, 'soma radius')
  tree.forEach((c, i) => { if (i > 0) assert.ok(c.parent >= 0 && c.parent < i, `parent of ${i}`); assert.ok([1, 2, 3, 4].includes(c.type)) })
  const trunks = tree.filter(c => c.parent === 0)
  const basal = trunks.filter(c => c.type === 3), apical = trunks.filter(c => c.type === 4), axon = trunks.filter(c => c.type === 2)
  assert.ok(basal.length >= 6 && basal.length <= 9, `${basal.length} basal trunks`)
  assert.equal(apical.length, 1); assert.equal(axon.length, 1)
  basal.forEach(c => close(c.radius, .05, 1e-9, 'basal r0')); close(apical[0].radius, .075, 1e-9, 'apical r0'); close(axon[0].radius, .04, 1e-9, 'axon r0')
  const scaled = makeMorphology(37, .5, 3)
  close(scaled[0].radius, .115, 1e-9, 'soma scales'); close(scaled.filter(c => c.parent === 0 && c.type === 4)[0].radius, .0375, 1e-9, 'apical scales')
})

test('the arbor is bushy and tortuous: radii never grow, Rall holds within one taper step, chains end at .7 of their root', () => {
  const tree = makeMorphology(37, 1, 3), kids = children(tree)
  let bifurcations = 0, tips = 0
  const isRoot = i => tree[i].parent === 0 || tree[tree[i].parent].p === tree[i].p
  tree.forEach((c, i) => {
    if (i === 0) return
    if (c.parent > 0) assert.ok(c.radius <= tree[c.parent].radius + 1e-12, `radius grows at ${i}`)
    if (kids[i].length === 2) {
      bifurcations++
      const [a, b] = kids[i].map(j => tree[j].radius)
      const ratio = (a ** 1.5 + b ** 1.5) / c.radius ** 1.5
      assert.ok(ratio <= 1 + 1e-9 && ratio >= .78, `Rall at ${i}: ${ratio}`)
    }
    if (kids[i].length === 0) {
      tips++
      let root = i
      while (!isRoot(root)) root = tree[root].parent
      const share = c.radius / tree[root].radius
      // Up to two collaterals of a .32 share thin a chain to (.68)^(4/3) ≈ .6 of its taper.
      assert.ok(share <= .7 + 1e-9 && share >= .7 * .58 - 1e-9, `tip share ${share} from root ${root}`)
    }
  })
  // The old single split per level gave ~110 bifurcations; mid-chain collaterals make it bushy.
  assert.ok(bifurcations >= 150, `${bifurcations} bifurcations`); assert.ok(tips > bifurcations, 'tips outnumber bifurcations')
  // Tortuosity: consecutive segments turn, they are not one smooth arc.
  let turns = 0, pairs = 0
  tree.forEach((c, i) => {
    if (i === 0 || c.parent <= 0 || kids[i].length !== 1) return
    const a = tree[c.parent], b = tree[kids[i][0]]
    if (a.p === c.p || b.p === c.p) return
    const h1 = Math.atan2(c.p[1] - a.p[1], c.p[0] - a.p[0]), h2 = Math.atan2(b.p[1] - c.p[1], b.p[0] - c.p[0])
    const turn = Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)))
    pairs++; if (turn > .04) turns++
  })
  assert.ok(turns / pairs > .3, `only ${turns} of ${pairs} segment pairs turn`)
  const depth0 = makeMorphology(37, 1, 0)
  assert.equal(children(depth0).filter(list => list.length === 2).length, 0, 'depth 0 never branches')
})

test('thickness is a sheath of world-sized sprites along the shafts, none below the sheath radius or on small neurons', () => {
  const points = pointsOf(makeNeuron(.85))
  const sheath = points.filter(point => point.sheath === 1 && point.p.some(v => Math.abs(v) > .23))
  // The sheath covers the proximal sixth of the segments (radius ≥ .008): about 1.3k sprites.
  assert.ok(sheath.length >= 1000, `${sheath.length} sheath sprites`)
  for (const point of sheath) assert.ok(point.size >= SHEATH_RADIUS - 1e-9 && point.size <= .075 + 1e-9, 'sheath size is the shaft radius ' + point.size)
  assert.ok(Math.max(...sheath.map(point => point.size)) >= .045, 'the trunk roots carry a thick sheath')
  assert.ok(Math.min(...sheath.map(point => point.size)) <= .015, 'the sheath thins toward the branches')
  assert.ok(sheath.some(point => point.kind === 1), 'the axon carries its own sheath')
  // The small network neurons (no lane) keep a soft soma body but no shaft sheath: their axons
  // (r0 .012 at size .3) would qualify by radius alone, so the size gate is what this checks.
  const network = pointsOf(makeNetwork(.85))
  assert.equal(network.filter(point => point.sheath === 1 && point.kind === 1 && point.lane === -1).length, 0, 'no shaft sheath on small neurons')
  assert.ok(network.some(point => point.sheath === 1 && point.kind === 1 && point.lane >= 0), 'the hubs carry a sheath')
})

test('the soma is a volume with a warm nucleus and the dendrites carry spines', () => {
  const points = pointsOf(makeNeuron(.85))
  const body = points.filter(point => point.sheath === 1 && point.p.every(v => Math.abs(v) <= .23))
  assert.ok(body.length >= 40, `${body.length} soma body sprites`)
  assert.ok(body.some(point => point.color[0] > point.color[2]), 'a warm nucleus sits inside the cool body')
  const spines = points.filter(point => point.sheath === 0 && point.size >= .55 && point.size < .9)
  assert.ok(spines.length >= 1500, `${spines.length} spines`)
  // Every spine stands just off the arbor: within .12 of a line vertex of the same geometry.
  const neuron = makeNeuron(.85), vertices = neuron.lines.length / 9
  for (const spine of spines.filter((_, i) => i % 97 === 0)) {
    let near = false
    for (let v = 0; v < vertices && !near; v++) near = Math.hypot(neuron.lines[v * 9] - spine.p[0], neuron.lines[v * 9 + 1] - spine.p[1], neuron.lines[v * 9 + 2] - spine.p[2]) <= .12
    assert.ok(near, 'spine far from the arbor at ' + spine.p)
  }
})

test('neuron vertices carry unit normals pointing away from the soma and a lane tag', () => {
  const neuron = makeNeuron(.85)
  assert.equal(neuron.lineNormals.length, neuron.lines.length / 9 * 4)
  assert.equal(neuron.pointNormals.length, neuron.points.length / 9 * 4)
  for (let v = 0; v < neuron.lines.length / 9; v++) {
    const p = neuron.lines.subarray(v * 9, v * 9 + 3), n = neuron.lineNormals.subarray(v * 4, v * 4 + 4)
    close(Math.hypot(n[0], n[1], n[2]), 1, 1e-6, 'unit normal ' + v)
    assert.ok(n[0] * p[0] + n[1] * p[1] + n[2] * p[2] > -1e-6, 'normal faces outward at ' + v)
    // The hero carries no lane; BLUE (g .53) lines are its axon, WHITE (g .77) lines dendrites.
    assert.equal(n[3], tagOf(-1, neuron.lines[v * 9 + 4] < .6 ? 1 : 0), 'tag at ' + v)
  }
  for (let v = 0; v < neuron.points.length / 9; v++) close(Math.hypot(...neuron.pointNormals.subarray(v * 4, v * 4 + 3)), 1, 1e-6, 'unit point normal ' + v)
})

test('the network has six signal lanes with release particles at their axon terminals and lane-tagged sheaths', () => {
  const network = makeNetwork(.85)
  const lanes = new Set(), particles = new Map(), sheathLanes = new Set()
  for (let v = 0; v < network.lineNormals.length; v += 4) {
    const { kind, lane, sheath } = decode(network.lineNormals[v + 3])
    assert.ok(kind === 0 || kind === 1, 'lines are dendrite or axon'); assert.equal(sheath, 0, 'lines carry no sheath flag'); lanes.add(lane)
  }
  for (let v = 0; v < network.pointNormals.length; v += 4) {
    const { kind, lane, sheath } = decode(network.pointNormals[v + 3])
    if (kind === 2) particles.set(lane, (particles.get(lane) ?? 0) + 1)
    if (sheath === 1 && kind === 1) sheathLanes.add(lane)
  }
  assert.deepEqual([...lanes].sort((a, b) => a - b), [-1, 0, 1, 2, 3, 4, 5])
  assert.equal(particles.size, 6)
  for (const [lane, count] of particles) assert.ok(count >= 25 && count <= 40, `lane ${lane} has ${count} particles`)
  assert.deepEqual([...sheathLanes].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5], 'every hub axon sheath carries its lane')
})

test('the morphology stays inside the vertex budget measured on 79652787 (hero points re-based for the sheath and spines)', () => {
  const budget = (geometry, lines, points, label) => {
    assert.ok(geometry.lines.length / 9 <= lines, `${label} lines ${geometry.lines.length / 9} > ${lines}`)
    assert.ok(geometry.points.length / 9 <= points, `${label} points ${geometry.points.length / 9} > ${points}`)
  }
  // The hero is the only layer on screen in chapter 02; its sheath and spines are fill-rate, which
  // the frame-timing e2e gates, so its point budget is 12k rather than 1.3× the old count.
  budget(makeNeuron(.85), 17930 * 1.3, 12000, 'neuron .85')
  budget(makeNeuron(.35), 15378 * 1.1, 6000, 'neuron .35')
  budget(makeNetwork(.85), 137056 * 1.3, 149968 * 1.3, 'network .85')
  // The phone network gains the hubs' sheath and soma bodies (about 7 px sprites): 40k points
  // instead of 1.1× the old 31,543.
  budget(makeNetwork(.35), 55440 * 1.1, 40000, 'network .35')
})
