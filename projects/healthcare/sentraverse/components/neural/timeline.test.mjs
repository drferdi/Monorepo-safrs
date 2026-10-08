import test from 'node:test'
import assert from 'node:assert/strict'
import * as gsapModule from 'gsap'
import { chapters } from './story.ts'
import { MASTER_DURATION, buildMaster, jumpLabel, phaseToTime } from './timeline.ts'

const gsap = gsapModule.gsap ?? gsapModule.default
// GSAP registers its core `attr` plugin only where a window exists; this is that plugin's own
// definition marked headless, so the SVG attribute tweens run on the stand-ins below.
gsap.registerPlugin({
  name: 'attr', headless: true,
  init(target, vars, tween, index, targets) {
    for (const p in vars) {
      const v = target.getAttribute(p) || ''
      const pt = this.add(target, 'setAttribute', (v || 0) + '', vars[p], index, targets, 0, 0, p)
      pt.op = p; pt.b = v
      this._props.push(p)
    }
  },
})
const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)

// Stand-ins for the DOM: GSAP tweens plain properties on them, the attr plugin goes through
// get/setAttribute, and the scene builder finds its parts through querySelector(All).
const element = (children = {}, text = '') => {
  const attributes = new Map()
  return {
    nodeType: 1, textContent: text,
    getAttribute: name => attributes.has(name) ? String(attributes.get(name)) : null,
    setAttribute: (name, value) => attributes.set(name, value),
    querySelector: selector => children[selector]?.[0] ?? null,
    querySelectorAll: selector => children[selector] ?? [],
  }
}
const many = (count, text) => Array.from({ length: count }, (_, i) => element({}, text?.[i]))

function stage() {
  const dots = many(3), lines = many(3), glints = many(3), labels = many(3, ['dr Ferdi Iskandar', 'the Gaffer', 'Sentraone'])
  const photo = element({ '[data-callout-line]': lines, '[data-callout-dot]': dots, '[data-callout], [data-callout-glint]': [...labels, ...glints] })
  const panels = chapters.map(chapter => {
    if (chapter.id.startsWith('division')) return element({ '[data-marker-line]': many(1), '[data-marker-dot]': many(1), '[data-marker-copy]': many(1) })
    if (chapter.id === 'human') return element({ '[data-callout-dot]': dots, '[data-callout]': labels, '[data-callout-glint]': glints, '[data-callout-line]': lines })
    return element()
  })
  const state = { phase: 0 }
  const master = buildMaster(gsap, chapters, { state, panels, nav: {}, overview: {}, scrim: {}, photo, reveal: true })
  master.pause()
  return { master, state, panels, photo, dots, lines, labels, glints }
}

test('the master runs exactly the hundred units the scroll travel is mapped onto, and no scene pushes past it', () => {
  const { master, state } = stage()
  assert.equal(MASTER_DURATION, 100)
  close(master.duration(), MASTER_DURATION, 1e-9, 'master duration')
  master.progress(1)
  close(state.phase, 100, 1e-9, 'phase at the end')
  master.time(phaseToTime(50))
  close(state.phase, 50, 1e-9, 'phase half way')
  master.kill()
})

test('every chapter has its label at its phase and an entry label 1.5 phase units in, where a jump lands', () => {
  const { master } = stage()
  for (const chapter of chapters) {
    close(master.labels[chapter.id], phaseToTime(chapter.phase), 1e-9, chapter.id)
    close(master.labels[`${chapter.id}-enter`], phaseToTime(chapter.phase + 1.5), 1e-9, `${chapter.id}-enter`)
  }
  assert.equal(jumpLabel(chapters, 0), 'origin-enter')
  assert.equal(jumpLabel(chapters, 66), 'division-1-enter')
  assert.equal(jumpLabel(chapters, 96), 'human-enter')
  // A phase between two chapters belongs to the chapter it is in.
  assert.equal(jumpLabel(chapters, 63), 'network-enter')
  master.kill()
})

test('the phase mapping is monotonic and its ends are pinned', () => {
  assert.equal(phaseToTime(0), 0)
  assert.equal(phaseToTime(100), MASTER_DURATION)
  let previous = 0
  for (let phase = 0; phase <= 100; phase += .5) {
    const time = phaseToTime(phase)
    assert.ok(time >= previous, `time goes back at phase ${phase}`)
    previous = time
  }
})

test('the first chapter is visible at the start, the others hidden, and the human scene settles the callouts complete', () => {
  const { master, panels, dots, lines, labels, glints } = stage()
  // GSAP writes a string into a plain object whose property was undefined; the number is what matters.
  assert.equal(Number(panels[0].autoAlpha), 1)
  assert.equal(Number(panels[1].autoAlpha), 0)
  // Hidden until the final scene draws them.
  for (const line of lines) assert.equal(Number(line.getAttribute('stroke-dashoffset')), 1)
  for (const dot of dots) assert.equal(Number(dot.getAttribute('r')), 0)
  master.time(phaseToTime(97))
  for (const label of labels) assert.equal(Number(label.autoAlpha), 0, 'labels still hidden at 97')
  master.progress(1)
  for (const line of lines) close(Number(line.getAttribute('stroke-dashoffset')), 0, 1e-9, 'line drawn')
  for (const dot of dots) close(Number(dot.getAttribute('r')), .55, 1e-9, 'dot popped')
  for (const label of labels) { close(label.autoAlpha, 1, 1e-9, 'label shown'); close(label.x, 0, 1e-9, 'label in place') }
  for (const glint of glints) close(glint.autoAlpha, 1, 1e-9, 'glint on')
  assert.deepEqual(labels.map(label => label.textContent), ['dr Ferdi Iskandar', 'the Gaffer', 'Sentraone'])
  master.kill()
})
