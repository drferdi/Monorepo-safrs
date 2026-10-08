import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { FILM, filmFrameIndex, filmFrameUrl, filmPosterUrl, loadOrder, nearestLoaded } from './film.ts'

test('a clip time maps to its frame at the sequence rate, clamped to the sequence', () => {
  assert.equal(filmFrameIndex(0), 0)
  assert.equal(filmFrameIndex(5), 5 * FILM.fps)
  assert.equal(filmFrameIndex(-1), 0)
  assert.equal(filmFrameIndex(1000), FILM.frames - 1)
  assert.equal(filmFrameIndex(10.1), FILM.frames - 1, 'the clip length lands on the last frame')
})

test('frame urls are zero-padded under the versioned public/legacy-film folder and every frame plus the poster is on disk', () => {
  assert.equal(filmFrameUrl(0), `/legacy-film/${FILM.version}/f000.webp`)
  assert.equal(filmFrameUrl(119), `/legacy-film/${FILM.version}/f119.webp`)
  assert.equal(filmPosterUrl, `/legacy-film/${FILM.version}/poster.webp`)
  const files = new Set(readdirSync(new URL(`../../public/legacy-film/${FILM.version}/`, import.meta.url)))
  for (let i = 0; i < FILM.frames; i++) assert.ok(files.has(`f${String(i).padStart(3, '0')}.webp`), `frame ${i} missing`)
  assert.ok(files.has('poster.webp'), 'poster missing')
})

test('a frame not yet loaded is stood in for by the nearest earlier one, else the nearest later one', () => {
  const loaded = [false, true, false, false, true, false]
  assert.equal(nearestLoaded(loaded, 3), 1, 'earlier first')
  assert.equal(nearestLoaded(loaded, 4), 4, 'itself when loaded')
  assert.equal(nearestLoaded(loaded, 0), 1, 'later when nothing earlier')
  assert.equal(nearestLoaded(loaded, 99), 4, 'past the end, the last loaded')
  assert.equal(nearestLoaded([false, false], 1), -1, 'none loaded')
})

test('the first and the last frame are fetched first, then every other frame once, in order', () => {
  const order = loadOrder(FILM.frames)
  assert.deepEqual(order.slice(0, 3), [0, FILM.frames - 1, 1])
  assert.equal(order.length, FILM.frames)
  assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: FILM.frames }, (_, i) => i))
  assert.deepEqual(loadOrder(2), [0, 1])
})
