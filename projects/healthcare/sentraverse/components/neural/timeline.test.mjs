import test from 'node:test'
import assert from 'node:assert/strict'
import * as gsapModule from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { chapters } from './story.ts'
import { MASTER_DURATION, buildMaster, ending, endingParts, jumpLabel, phaseToTime, settleEnding } from './timeline.ts'

const gsap = gsapModule.gsap ?? gsapModule.default
// GSAP registers its core `attr` plugin only where a window exists; this is that plugin's own
// definition marked headless, so the SVG attribute tweens run on the stand-ins below. The
// ending's plugins are registered the way the browser does, minus the window check.
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
}, { ...ScrambleTextPlugin, headless: true }, { name: 'clearProps', headless: true, init() {} })
CustomEase.register(gsap); CustomWiggle.register(gsap)
const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)
const at = phaseToTime

// Stand-ins for the DOM: GSAP tweens plain properties on them, the attr plugin goes through
// get/setAttribute, the scramble writes textContent, and the scene builder finds its parts
// through querySelector(All).
const element = (children = {}, text = '', attributes = {}) => {
  const map = new Map(Object.entries(attributes))
  return {
    nodeType: 1, textContent: text, scale: 1,
    getAttribute: name => map.has(name) ? String(map.get(name)) : null,
    setAttribute: (name, value) => map.set(name, value),
    querySelector: selector => children[selector]?.[0] ?? null,
    querySelectorAll: selector => children[selector] ?? [],
  }
}
const many = (count, text) => Array.from({ length: count }, (_, i) => element({}, text?.[i]))
const LABELS = ['dr Ferdi Iskandar', 'the Gaffer', 'Sentraone']

function stage(titles) {
  const dots = many(3), lines = many(3), glints = many(3), texts = many(3, LABELS)
  const labels = LABELS.map((label, k) => element({ '[data-callout-text]': [texts[k]] }, label, { 'aria-label': label }))
  const corners = many(4), reticle = element({ '[data-reticle-corner]': corners }), scan = element(), flash = element()
  const parts = {
    '[data-callout-line]': lines, '[data-callout-dot]': dots, '[data-callout]': labels, '[data-callout-glint]': glints, '[data-callout-text]': texts,
    '[data-reticle]': [reticle], '[data-reticle-corner]': corners, '[data-scan]': [scan], '[data-flash]': [flash],
    [endingParts.strokes]: [...lines, ...corners],
    [endingParts.faded]: [...labels, ...glints, ...lines, ...corners, scan, flash],
    [endingParts.all]: [...labels, ...glints, ...lines, ...texts, reticle, ...corners, scan, flash],
  }
  const photo = element(parts)
  const panels = chapters.map(chapter => {
    if (chapter.id.startsWith('division')) return element({ '[data-marker-line]': many(1), '[data-marker-dot]': many(1), '[data-marker-copy]': many(1) })
    if (chapter.id === 'human') return element(parts)
    return element()
  })
  const state = { phase: 0 }
  const master = buildMaster(gsap, chapters, { state, panels, nav: {}, overview: {}, scrim: {}, photo, reveal: true, titles })
  master.pause()
  return { master, state, panels, photo, dots, lines, labels, texts, glints, corners, reticle, scan, flash }
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

test('the key moments dwell: the chapter 03 face, the network and the final reveal get at least a fifth more scroll than their phases', () => {
  const share = (from, to) => (phaseToTime(to) - phaseToTime(from)) / (to - from)
  assert.ok(share(25, 40) >= 1.2, 'face window ' + share(25, 40))
  assert.ok(share(58, 66) >= 1.2, 'network window ' + share(58, 66))
  assert.ok(share(94, 100) >= 1.3, 'final reveal ' + share(94, 100))
  // The reveal window stays one straight stretch, so the scan and the develop keep step with portraitState.
  const mid = phaseToTime(97), expected = (phaseToTime(95.5) + phaseToTime(98.5)) / 2
  close(mid, expected, 1e-9, 'reveal window linear')
})

test('chapter titles rise line by line behind their masks as the chapter enters, and the centered titles come in character by character from the middle', () => {
  const lines = many(2), chars = many(5), centeredLines = many(1)
  const titles = chapters.map(chapter => chapter.id === 'nervous-system' ? { lines, chars: [], centered: false } : chapter.id === 'network' ? { lines: centeredLines, chars, centered: true } : null)
  const { master } = stage(titles)
  const start = at(28)
  master.time(start + .05)
  for (const line of lines) assert.ok(Number(line.yPercent) > 50, 'line still behind the mask ' + line.yPercent)
  master.time(start + 2)
  for (const line of lines) close(Number(line.yPercent), 0, 1e-6, 'line risen')
  assert.ok(Number(lines[1].yPercent) === 0 && Number(lines[0].yPercent) === 0, 'both lines settled')
  // The centered title: the middle character leads, the ends follow.
  const network = at(60)
  master.time(network + .25)
  const alpha = chars.map(char => Number(char.autoAlpha))
  assert.ok(alpha[2] > alpha[0] && alpha[2] > alpha[4], 'centre leads ' + alpha)
  for (const line of centeredLines) close(Number(line.yPercent ?? 0), 0, 1e-9, 'centered lines are not moved')
  master.time(network + 2)
  for (const char of chars) close(Number(char.autoAlpha), 1, 1e-6, 'char shown')
  master.kill()
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
  master.kill()
})

test('scan, develop and lock overlap in the final scene: the scan sweeps with the reveal, the grade develops to the low-key finals, the lock follows', () => {
  const { master, photo, scan, reticle, corners, flash } = stage()
  const scene = master.getById('scene-human')
  assert.ok(scene, 'the human scene carries an id')
  close(scene.labels.scan, 0, 1e-9, 'scan at the reveal start')
  close(scene.labels.develop, scene.labels.scan, 1e-9, 'develop starts with the scan')
  const span = (from, to) => at(to) - at(from)
  close(scene.labels.lock, span(ending.revealStart, ending.revealEnd) - span(ending.revealStart, ending.revealStart + ending.lockLead), 1e-9, 'lock leads the develop end')
  // Scan: transform only, in step with portraitState(phase).reveal. (A nested timeline that has
  // never rendered treats its own time 0 as already rendered, so the samples start a hair in.)
  master.time(at(ending.revealStart + .01)); close(Number(scan.yPercent), 0, .5, 'scan at the top')
  master.time(at((ending.revealStart + ending.revealEnd) / 2)); close(Number(scan.yPercent), 50, 1e-6, 'scan half way'); close(Number(scan.autoAlpha), 1, 1e-9, 'scan visible')
  master.time(at(ending.revealEnd)); close(Number(scan.yPercent), 100, 1e-9, 'scan at the bottom')
  close(Number(scan.autoAlpha), 0, 1e-9, 'scan gone as its sweep ends, nothing lingers below the box')
  master.time(at(99)); close(Number(scan.autoAlpha), 0, 1e-9, 'scan still gone')
  // Develop: brighter, colder, flatter at the start; the approved grade at the end.
  master.time(at(ending.revealStart + .01))
  assert.ok(Number(photo['--photo-brightness']) > ending.developTo.brightness, 'starts brighter')
  assert.ok(Number(photo['--photo-contrast']) < ending.developTo.contrast, 'starts flatter')
  assert.ok(Number(photo['--photo-saturate']) < ending.developTo.saturate, 'starts colder')
  master.progress(1)
  close(Number(photo['--photo-brightness']), .74, 1e-9, 'final brightness'); close(Number(photo['--photo-contrast']), 1.26, 1e-9, 'final contrast'); close(Number(photo['--photo-saturate']), .55, 1e-9, 'final saturation')
  // Lock: the brackets are hidden before the lock, draw in after it, and the reticle settles at scale 1.
  master.time(at(97))
  for (const corner of corners) { close(Number(corner.autoAlpha), 0, 1e-9, 'corner hidden before the lock'); assert.equal(Number(corner.getAttribute('stroke-dashoffset')), 1, 'corner undrawn') }
  master.time(at(ending.revealEnd - ending.lockLead + ending.settleAt + ending.settle * .3)); assert.notEqual(Number(reticle.scale), 1, 'reticle wiggles while settling')
  master.progress(1)
  close(Number(reticle.scale), 1, 1e-9, 'reticle settled')
  for (const corner of corners) { close(Number(corner.autoAlpha), 1, 1e-9, 'corner shown'); close(Number(corner.getAttribute('stroke-dashoffset')), 0, 1e-9, 'corner drawn') }
  // The flash is the last thing: brief, and gone at the very end.
  close(Number(flash.autoAlpha), 0, 1e-9, 'flash over at the end')
  master.time(at(ending.revealEnd - ending.lockLead + ending.flashAt + ending.flashIn)); assert.ok(Number(flash.autoAlpha) > .3, 'flash peaks ' + flash.autoAlpha)
  master.kill()
})

test('labels decode into the exact strings, read exact to assistive tech throughout, and the e2e sample points hold', () => {
  const { master, lines, corners, labels, texts } = stage()
  for (const [k, label] of labels.entries()) assert.equal(label.getAttribute('aria-label'), LABELS[k])
  master.time(at(97))
  assert.deepEqual(texts.map(text => text.textContent), LABELS, 'exact before the decode')
  // Mid-decode the visible text is scrambled but keeps its length; the aria-label stays exact.
  master.time(at(ending.revealEnd - ending.lockLead + ending.calloutsAt + ending.labelAt + ending.label * .5))
  assert.equal(texts[0].textContent.length, LABELS[0].length, 'scramble keeps the length')
  assert.notEqual(texts[0].textContent, LABELS[0], 'first label mid-decode')
  // The e2e samples 99.6 and expects every line settled.
  master.time(at(99.6))
  for (const line of lines) close(Number(line.getAttribute('stroke-dashoffset')), 0, 1e-9, 'line settled by 99.6')
  for (const corner of corners) close(Number(corner.getAttribute('stroke-dashoffset')), 0, 1e-9, 'corner settled by 99.6')
  master.progress(1)
  assert.deepEqual(texts.map(text => text.textContent), LABELS, 'exact at the end')
  master.kill()
})

test('settling the ending restores the complete state whatever the scene left behind', () => {
  const { master, photo, lines, corners, dots, texts, labels } = stage()
  master.time(at(99.3))
  settleEnding(gsap, photo)
  for (const line of lines) assert.equal(Number(line.getAttribute('stroke-dashoffset')), 0)
  for (const corner of corners) assert.equal(Number(corner.getAttribute('stroke-dashoffset')), 0)
  for (const dot of dots) assert.equal(Number(dot.getAttribute('r')), .55)
  assert.deepEqual(texts.map(text => text.textContent), LABELS)
  assert.deepEqual(labels.map(label => label.getAttribute('aria-label')), LABELS)
  master.kill()
})
