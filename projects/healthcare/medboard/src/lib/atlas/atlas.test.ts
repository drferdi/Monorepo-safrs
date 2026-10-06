import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'

import { atlasTools } from './agent-tools'
import {
  EDITIONS,
  SYSTEMS,
  described,
  explanation,
  searchConcepts,
  termFor,
  type Atlas,
  type TermTable,
} from './anatomy'
import { createExplosionLayout } from './explosion-layout'
import { PointerTap } from './pointer-tap'

const publicDir = path.join(process.cwd(), 'public', 'atlas')
const readAtlas = (file: string): Atlas => JSON.parse(readFileSync(path.join(publicDir, file), 'utf8'))
const terms: TermTable = JSON.parse(readFileSync(path.join(publicDir, 'terms.json'), 'utf8'))
const male = readAtlas('atlas.json')
const female = readAtlas('atlas-female.json')

// Each reference body ships a fixed inventory; a drift in either is an import fault.
const INVENTORY = [
  { atlas: male, parts: 2234, concepts: 3432 },
  { atlas: female, parts: 1220, concepts: 1439 },
]

test('both bodies keep their full inventory and every gzip chunk holds every mesh it indexes', () => {
  for (const { atlas, parts, concepts } of INVENTORY) {
    assert.equal(atlas.parts.length, parts)
    assert.equal(atlas.concepts.length, concepts)
    const ids = new Set(atlas.parts.map((part) => part.id))
    assert.equal(ids.size, parts)
    const buffers = atlas.chunks.map((chunk) => {
      assert.match(chunk.url, /^\/atlas\/models\/[a-z]+-\d+\.bin\.gz$/)
      const buffer = gunzipSync(readFileSync(path.join(process.cwd(), 'public', chunk.url)))
      assert.equal(buffer.length, chunk.bytes)
      return buffer
    })
    let triangles = 0
    for (const part of atlas.parts) {
      const buffer = buffers[part.chunk]
      assert.ok(part.indices + part.indexCount * 4 <= buffer.length, `${part.id}: index buffer out of range`)
      const indices = new Uint32Array(buffer.buffer, buffer.byteOffset + part.indices, part.indexCount)
      assert.ok(indices.every((index) => index < part.vertexCount), `${part.id}: invalid vertex`)
      triangles += part.indexCount / 3
    }
    for (const concept of atlas.concepts) {
      assert.ok(concept.elements.length > 0)
      for (const id of concept.elements) assert.ok(ids.has(id), `${concept.id}: missing ${id}`)
    }
    assert.equal(triangles, atlas.triangles)
  }
})

test('every structure name has a Latin and an Indonesian name (Chief 2026-10-07)', () => {
  const missing: string[] = []
  for (const atlas of [male, female]) {
    for (const name of [...atlas.parts.map((part) => part.name), ...atlas.concepts.map((concept) => concept.name)]) {
      const entry = terms[name.toLowerCase().trim()]
      if (!entry?.la.trim() || !entry.id.trim()) missing.push(name)
    }
  }
  assert.deepEqual([...new Set(missing)], [])
})

test('a name shows in Latin with its Indonesian name, and says when its Latin is not yet verified', () => {
  const heart = termFor(terms, 'Heart')
  assert.equal(heart.la, 'Cor')
  assert.equal(heart.id, 'Jantung')
  assert.equal(heart.source, 'Heart')
  const anyUnverified = Object.values(terms).find((entry) => !entry.verified)
  assert.ok(anyUnverified, 'machine-translated Latin is marked unverified')
})

test('search finds a structure by Latin, Indonesian, English or atlas reference, word starts first', () => {
  const byLatin = searchConcepts(male.concepts, terms, 'cor')
  assert.equal(termFor(terms, byLatin[0].name).la, 'Cor')
  const byIndonesian = searchConcepts(male.concepts, terms, 'jantung')
  assert.ok(byIndonesian.some((concept) => concept.name.toLowerCase() === 'heart'))
  const byEnglish = searchConcepts(male.concepts, terms, 'femur')
  assert.ok(byEnglish.length > 0)
  assert.equal(searchConcepts(male.concepts, terms, 'FMA7088')[0]?.id, 'FMA7088')
  // "asma" style trap: a word-start match ranks above a match inside a word.
  const plasma = searchConcepts(male.concepts, terms, 'ren')
  const first = termFor(terms, plasma[0].name)
  assert.ok([first.la, first.id, first.source].some((name) => /(^|[\s(])ren/i.test(name)))
  assert.ok(searchConcepts(male.concepts, terms, 'jantung').length <= 80)
})

test('an empty search lists the body suggestions in order', () => {
  for (const atlas of [male, female]) {
    const edition = EDITIONS.find((entry) => entry.sex === atlas.sex)
    assert.ok(edition)
    const shown = searchConcepts(atlas.concepts, terms, '', edition.suggestions)
    assert.deepEqual(shown.map((concept) => concept.name.toLowerCase()), edition.suggestions)
  }
})

test('explanations are Indonesian, and a sided or numbered name falls back to its structure', () => {
  assert.match(explanation('heart', 'cardiac', 'male'), /^Pompa berotot di dalam rongga dada\./)
  assert.equal(explanation('left kidney', 'urinary', 'male'), explanation('kidney', 'urinary', 'male'))
  assert.equal(described('Intervertebral disk of third lumbar vertebra'), true)
  assert.equal(described('vascular tree'), false)
  // Unexplained structures fall back to the note of their system.
  assert.equal(explanation('vascular tree', 'arterial', 'male'), SYSTEMS.find((system) => system.id === 'arterial')?.description)
})

test('system names and edition captions are Indonesian sentence case', () => {
  const shouting = (text: string) => (text.match(/[A-Za-z]{3,}/g) ?? []).filter((word) => word === word.toUpperCase())
  for (const system of SYSTEMS) assert.deepEqual(shouting(system.name), [], system.name)
  assert.equal(SYSTEMS.find((system) => system.id === 'skeletal')?.name, 'Rangka')
  for (const edition of EDITIONS) assert.deepEqual(shouting(edition.caption), [], edition.caption)
  assert.deepEqual(EDITIONS.map((edition) => edition.label), ['Pria', 'Wanita'])
})

test('exploded pieces never overlap, at desktop and phone aspect ratios', () => {
  for (const atlas of [male, female]) {
    const systems = [...new Set(atlas.parts.map((part) => part.system))]
    const groups = [atlas.parts.slice(0, 400), ...systems.map((system) => atlas.parts.filter((part) => part.system === system))]
    for (const group of groups) {
      for (const aspect of [0.46, 1, 1.7]) {
        const layout = createExplosionLayout(group, aspect)
        const cells = [...layout.cells.values()]
        assert.equal(cells.length, group.length)
        for (let i = 0; i < cells.length; i++) {
          const a = cells[i]
          assert.ok(Math.abs(a.x) + a.width / 2 <= layout.width / 2 + 1e-8)
          assert.ok(Math.abs(a.y) + a.height / 2 <= layout.height / 2 + 1e-8)
          for (let j = i + 1; j < cells.length; j++) {
            const b = cells[j]
            assert.ok(
              Math.abs(a.x - b.x) >= (a.width + b.width) / 2 - 1e-8 || Math.abs(a.y - b.y) >= (a.height + b.height) / 2 - 1e-8,
              'exploded pieces overlap'
            )
          }
        }
      }
    }
  }
  assert.equal(createExplosionLayout([]).cells.size, 0)
})

test('a tap selects; a drag, a pinch or a cancelled touch does not', () => {
  const tap = new PointerTap()
  tap.down(1, 10, 10, 5)
  assert.equal(tap.up(1, 12, 11), true)
  tap.down(1, 10, 10, 5)
  tap.move(1, 40, 10)
  assert.equal(tap.up(1, 10, 10), false)
  tap.down(1, 10, 10, 12)
  tap.down(2, 20, 20, 12)
  assert.equal(tap.up(2, 20, 20), false)
  assert.equal(tap.up(1, 10, 10), false)
  tap.down(1, 10, 10, 5)
  tap.cancel(1)
  assert.equal(tap.up(1, 10, 10), false)
  tap.down(1, 10, 10, 5)
  assert.equal(tap.up(1, 10, 10), true)
})

test('browser agent tools find and inspect a structure, and reject unknown or empty input', () => {
  let selected: string | null = null
  const [find, inspect] = atlasTools(male, (concept) => {
    selected = concept.id
  })
  const results = find.execute({ query: 'femur' })
  assert.ok(Array.isArray(results) && results.length > 0)
  const first = results[0]
  assert.ok(first && typeof first === 'object' && 'id' in first && typeof first.id === 'string')
  inspect.execute({ id: first.id })
  assert.equal(selected, first.id)
  assert.throws(() => inspect.execute({ id: 'nonexistent-structure' }))
  assert.equal(selected, first.id)
  assert.throws(() => find.execute({ query: ' ' }))
})
