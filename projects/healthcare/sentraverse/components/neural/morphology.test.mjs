import test from 'node:test'
import assert from 'node:assert/strict'
import { makeMorphology, makeNetwork, makeNeuron, strandCount, tagOf } from './geometry.ts'

const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)
const children = compartments => compartments.map(() => [])
  .map((list, i, lists) => { compartments.forEach((c, j) => { if (c.parent === i) lists[i].push(j) }); return list })

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

test('every chain tapers to .35 of its start and every bifurcation obeys Rall with the given asymmetry', () => {
  const tree = makeMorphology(37, 1, 3), kids = children(tree)
  let bifurcations = 0, tips = 0
  tree.forEach((c, i) => {
    if (i === 0) return
    if (kids[i].length === 1) assert.ok(tree[kids[i][0]].radius <= c.radius + 1e-12, `taper at ${i}`)
    if (kids[i].length === 2) {
      bifurcations++
      const [a, b] = kids[i].map(j => tree[j].radius).sort((x, y) => y - x)
      close(a ** 1.5 + b ** 1.5, c.radius ** 1.5, 1e-9, 'Rall at ' + i)
      const share = a ** 1.5 / c.radius ** 1.5
      assert.ok(share >= .55 - 1e-9 && share <= .75 + 1e-9, 'asymmetry ' + share)
    }
    if (kids[i].length === 0) {
      tips++
      let start = i
      while (tree[start].parent > 0 && kids[tree[start].parent].length === 1) start = tree[start].parent
      close(c.radius, tree[start].radius * .35, 1e-9, 'tip of chain from ' + start)
    }
  })
  assert.ok(bifurcations > 20, `${bifurcations} bifurcations`); assert.ok(tips > bifurcations, 'tips outnumber bifurcations')
  // Bifurcations sit between .45 and .8 of the nominal length: a parent chain is never shorter than the remainder's floor.
  const depth0 = makeMorphology(37, 1, 0)
  assert.equal(children(depth0).filter(list => list.length === 2).length, 0, 'depth 0 never bifurcates')
})

test('thickness is a strand count that follows the radius and the density', () => {
  assert.equal(strandCount(.05, .85), 4); assert.equal(strandCount(.0175, .85), 1); assert.equal(strandCount(.075, .85), 6)
  assert.equal(strandCount(.04, .85), 3); assert.equal(strandCount(.05, .35), 2); assert.equal(strandCount(.001, .85), 1)
})

test('neuron vertices carry unit normals pointing away from the soma and a lane tag', () => {
  const neuron = makeNeuron(.85)
  assert.equal(neuron.lineNormals.length, neuron.lines.length / 9 * 4)
  assert.equal(neuron.pointNormals.length, neuron.points.length / 9 * 4)
  for (let v = 0; v < neuron.lines.length / 9; v++) {
    const p = neuron.lines.subarray(v * 9, v * 9 + 3), n = neuron.lineNormals.subarray(v * 4, v * 4 + 4)
    close(Math.hypot(n[0], n[1], n[2]), 1, 1e-6, 'unit normal ' + v)
    assert.ok(n[0] * p[0] + n[1] * p[1] + n[2] * p[2] > -1e-6, 'normal faces outward at ' + v)
    // The hero carries no lane; BLUE (g .53) strands are its axon, WHITE (g .77) strands dendrites.
    assert.equal(n[3], tagOf(-1, neuron.lines[v * 9 + 4] < .6 ? 1 : 0), 'tag at ' + v)
  }
})

test('the network has six signal lanes with release particles at their axon terminals', () => {
  const network = makeNetwork(.85)
  // Decode as the shader does: kind = floor((tag + 1) / 100), lane = tag - 100 × kind.
  const decode = tag => { const kind = Math.floor((tag + 1) / 100); return { kind, lane: tag - kind * 100 } }
  const lanes = new Set(), particles = new Map()
  for (let v = 0; v < network.lineNormals.length; v += 4) {
    const { kind, lane } = decode(network.lineNormals[v + 3])
    assert.ok(kind === 0 || kind === 1, 'lines are dendrite or axon'); lanes.add(lane)
  }
  for (let v = 0; v < network.pointNormals.length; v += 4) {
    const { kind, lane } = decode(network.pointNormals[v + 3])
    if (kind === 2) particles.set(lane, (particles.get(lane) ?? 0) + 1)
  }
  assert.deepEqual([...lanes].sort((a, b) => a - b), [-1, 0, 1, 2, 3, 4, 5])
  assert.equal(particles.size, 6)
  for (const [lane, count] of particles) assert.ok(count >= 25 && count <= 40, `lane ${lane} has ${count} particles`)
})

test('the morphology stays inside the vertex budget measured on 7965278', () => {
  const budget = (geometry, lines, points, label) => {
    assert.ok(geometry.lines.length / 9 <= lines, `${label} lines ${geometry.lines.length / 9} > ${lines}`)
    assert.ok(geometry.points.length / 9 <= points, `${label} points ${geometry.points.length / 9} > ${points}`)
  }
  budget(makeNeuron(.85), 17930 * 1.3, 3178 * 1.3, 'neuron .85')
  budget(makeNeuron(.35), 15378 * 1.1, 2288 * 1.1, 'neuron .35')
  budget(makeNetwork(.85), 137056 * 1.3, 149968 * 1.3, 'network .85')
  budget(makeNetwork(.35), 55440 * 1.1, 31543 * 1.1, 'network .35')
})
