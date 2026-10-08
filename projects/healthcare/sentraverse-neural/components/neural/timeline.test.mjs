import test from 'node:test'
import assert from 'node:assert/strict'
import * as gsapModule from 'gsap'
import { chapters } from './story.ts'
import { MASTER_DURATION, buildMaster, ease, jumpLabel, legacy, legacyParts, motionOf, phaseToTime, settleLegacy } from './timeline.ts'

const gsap = gsapModule.gsap ?? gsapModule.default
// `clearProps` is a CSS-plugin feature with no meaning on the stand-ins below; a headless no-op
// keeps `settleLegacy` from tweening a property of that name.
gsap.registerPlugin({ name: 'clearProps', headless: true, init() {} })
const close = (actual, expected, tolerance, label = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not ${expected}`)
const at = phaseToTime

// Stand-ins for the DOM: GSAP tweens plain properties on them, and the scene builder finds its
// parts through querySelector(All) and reads their data attributes. A selector list resolves to
// the union of its parts, as the DOM would.
const element = (children = {}, attributes = {}) => {
  const map = new Map(Object.entries(attributes))
  const find = selector => selector.split(',').map(part => part.trim()).flatMap(part => children[part] ?? [])
  return {
    nodeType: 1, scale: 1,
    getAttribute: name => map.has(name) ? String(map.get(name)) : null,
    setAttribute: (name, value) => map.set(name, value),
    querySelector: selector => find(selector)[0] ?? null,
    querySelectorAll: selector => find(selector),
  }
}
const many = (count, attributes) => Array.from({ length: count }, () => element({}, attributes))

function stage(titles, options = {}) {
  const veil = many(2), film = element()
  const scene = element({ '[data-legacy-void]': [veil[0]], '[data-legacy-vignette]': [veil[1]], '[data-film]': [film] })
  const text = { presence: element(), tagline: element(), signature: element(), brand: element(), cta: element() }
  const human = element({ '[data-legacy-presence]': [text.presence], '[data-legacy-tagline]': [text.tagline], '[data-legacy-signature]': [text.signature], '[data-legacy-brand]': [text.brand], '[data-magnetic]': [text.cta] })
  const panels = chapters.map(chapter => {
    if (chapter.id.startsWith('division')) return element({ '[data-marker-line]': many(1), '[data-marker-dot]': many(1), '[data-marker-copy]': many(1) })
    if (chapter.id === 'human') return human
    return element()
  })
  const state = { phase: 0 }
  const master = buildMaster(gsap, chapters, { state, panels, nav: {}, overview: {}, scrim: {}, legacy: scene, titles, ...options })
  master.pause()
  return { master, state, panels, scene, human, veil, film, text }
}

test('the master runs exactly the units the scroll travel is mapped onto, and no scene pushes past it', () => {
  const { master, state } = stage()
  assert.equal(MASTER_DURATION, 131.5)
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
  assert.equal(jumpLabel(chapters, 94), 'human-enter')
  assert.equal(jumpLabel(chapters, 96), 'human-enter')
  // A phase between two chapters belongs to the chapter it is in.
  assert.equal(jumpLabel(chapters, 63), 'network-enter')
  master.kill()
})

test('the phase mapping is monotonic, its ends are pinned and the first 94 phases keep the tempo they had before the legacy', () => {
  assert.equal(phaseToTime(0), 0)
  assert.equal(phaseToTime(100), MASTER_DURATION)
  close(phaseToTime(94), 91.5, 1e-9, 'the legacy starts where the old ending did')
  let previous = 0
  for (let phase = 0; phase <= 100; phase += .5) {
    const time = phaseToTime(phase)
    assert.ok(time >= previous, `time goes back at phase ${phase}`)
    previous = time
  }
})

test('the key moments dwell: the chapter 03 face, the network and the legacy get more scroll than their phases, the legacy one straight stretch', () => {
  const share = (from, to) => (phaseToTime(to) - phaseToTime(from)) / (to - from)
  assert.ok(share(25, 40) >= 1.2, 'face window ' + share(25, 40))
  assert.ok(share(58, 66) >= 1.2, 'network window ' + share(58, 66))
  assert.ok(share(94, 100) >= 6, 'legacy ' + share(94, 100))
  // One linear stretch, so the dissolve, the film's clock and the words keep step with the scroll.
  const k = legacy
  for (const [a, b] of [[94, 96], [k.void.at, k.void.at + k.void.in], [k.film.play, k.film.end], [99, 100]]) close(phaseToTime((a + b) / 2), (phaseToTime(a) + phaseToTime(b)) / 2, 1e-9, `linear ${a}-${b}`)
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

test('the first chapter is visible at the start, the others hidden, and the legacy starts with the void open and the film dark', () => {
  const { master, panels, veil, film, text } = stage()
  // GSAP writes a string into a plain object whose property was undefined; the number is what matters.
  assert.equal(Number(panels[0].autoAlpha), 1)
  assert.equal(Number(panels[1].autoAlpha), 0)
  for (const part of veil) assert.equal(Number(part.autoAlpha), 0, 'void open')
  assert.equal(Number(film.autoAlpha), 0, 'film dark')
  for (const part of Object.values(text)) assert.equal(Number(part.autoAlpha), 0, 'text hidden')
  master.kill()
})

test('the dissolve: the opening line shows over the field, then the void closes while the film is already fading in, so nothing is black between them', () => {
  const { master, veil, film, text } = stage()
  const k = legacy
  const scene = master.getById('scene-human')
  assert.ok(scene, 'the legacy scene carries the human id')
  close(scene.labels.dissolve, 0, 1e-9, 'dissolve at the chapter start')
  master.time(at(k.void.at - .01)); for (const part of veil) close(Number(part.autoAlpha ?? 0), 0, 1e-9, 'void still open before its cue'); close(Number(film.autoAlpha), 0, 1e-9, 'film still dark before its cue')
  master.time(at(k.presence.at + k.presence.in)); close(Number(text.presence.autoAlpha), 1, 1e-6, 'opening line shown')
  // The film's cue falls inside the void's closing, and the void is shut by `covered`.
  assert.ok(k.film.at > k.void.at && k.film.at < k.void.at + k.void.in, 'the film starts while the void is closing')
  assert.ok(k.void.at + k.void.in <= k.covered, 'the canvases are covered only once the void is shut')
  master.time(at(k.film.at + k.film.in * .5))
  const half = Number(veil[0].autoAlpha)
  assert.ok(half > .3 && half < 1, 'void half closed ' + half)
  assert.ok(Number(film.autoAlpha) > .2, 'film coming in through it ' + film.autoAlpha)
  master.time(at(k.film.at + k.film.in)); close(Number(film.autoAlpha), k.film.alpha, 1e-6, 'film at its blended opacity')
  master.time(at(k.void.at + k.void.in)); for (const part of veil) close(Number(part.autoAlpha), 1, 1e-6, 'void shut')
  master.time(at(k.presence.out + k.presence.outOver)); close(Number(text.presence.autoAlpha), 0, 1e-9, 'opening line gone')
  master.progress(1); close(Number(film.autoAlpha), k.film.alpha, 1e-6, 'film still there at the end')
  master.kill()
})

test('the film: its clock is the scroll position, without easing, from the first frame at play to the last at end, held to the end of the story', () => {
  const drawn = []
  const { master, state } = stage(undefined, { film: time => drawn.push([state.phase, time]) })
  const k = legacy.film
  const scene = master.getById('scene-human')
  close(scene.labels.film, at(k.play) - at(94), 1e-9, 'film label where the clock starts')
  master.time(at(k.play - .01)); assert.equal(drawn.length, 0, 'no frame asked for before the clock starts')
  const last = () => drawn[drawn.length - 1][1]
  master.time(at(k.play + .01)); assert.ok(drawn.length > 0 && last() < .1, 'the first frame as the clock starts ' + last())
  master.time(at((k.play + k.end) / 2)); close(last(), k.length / 2, 1e-6, 'half the clip half way through the window: no easing')
  master.time(at(k.play + (k.end - k.play) * .25)); close(last(), k.length / 4, 1e-6, 'a quarter in, a quarter of the clip')
  master.time(at(k.end)); close(last(), k.length, 1e-6, 'the last frame at the end of the window')
  master.time(at(100)); close(last(), k.length, 1e-6, 'the last frame held to the end')
  assert.ok(k.end <= legacy.title, 'the film settles before the words')
  // Scrolling back asks for earlier frames again.
  master.time(at(k.play + .01)); assert.ok(last() < .1, 'the first frame again after a reverse scroll ' + last())
  master.kill()
})

test('the morph: its progress is the scroll position, without easing, from 0 once the film holds to 1 before the end, held there', () => {
  const drawn = []
  const { master, state } = stage(undefined, { morph: value => drawn.push([state.phase, value]) })
  const k = legacy.morph
  const scene = master.getById('scene-human')
  close(scene.labels.morph, at(k.at) - at(94), 1e-9, 'morph label where the progress starts')
  assert.ok(k.at >= legacy.film.end, 'the face is transformed on the held last frame, never on a moving one')
  assert.ok(k.at + k.in < 100, 'the transformation is complete before the end of the story')
  master.time(at(k.at - .01)); assert.equal(drawn.length, 0, 'nothing before the window')
  const last = () => drawn[drawn.length - 1][1]
  master.time(at(k.at + k.in / 2)); close(last(), .5, 1e-6, 'half way through the window, half the progress: no easing')
  master.time(at(k.at + k.in)); close(last(), 1, 1e-6, 'complete at the end of the window')
  master.time(at(100)); close(last(), 1, 1e-6, 'held to the end')
  master.time(at(k.at + k.in / 4)); close(last(), .25, 1e-6, 'a quarter again after a reverse scroll')
  master.kill()
})

test('the legacy: the title then the line, the signature, the brand and the way on, each after the last, all settled by the end', () => {
  const chars = many(6), lines = many(1)
  const titles = chapters.map(chapter => chapter.id === 'human' ? { lines, chars, centered: true } : null)
  const { master, text } = stage(titles)
  const scene = master.getById('scene-human')
  close(scene.labels.legacy, at(legacy.title) - at(94), 1e-9, 'legacy label at the title')
  master.time(at(legacy.title - .05))
  for (const char of chars) close(Number(char.autoAlpha), 0, 1e-9, 'title hidden before its beat')
  for (const part of [text.tagline, text.signature, text.brand, text.cta]) close(Number(part.autoAlpha), 0, 1e-9, 'text hidden before its beat')
  const order = [legacy.title, legacy.tagline, legacy.signature, legacy.brand, legacy.cta]
  assert.ok(order.every((phase, i) => i === 0 || phase > order[i - 1]), 'beats in order')
  assert.ok(legacy.cta + legacy.textIn <= 100, 'the last beat settles before the pin releases')
  master.time(at(legacy.tagline + legacy.textIn * .4))
  assert.ok(Number(text.tagline.autoAlpha) > 0 && Number(text.tagline.autoAlpha) < 1, 'tagline coming in ' + text.tagline.autoAlpha)
  close(Number(text.signature.autoAlpha), 0, 1e-9, 'signature waits')
  master.progress(1)
  for (const char of chars) close(Number(char.autoAlpha), 1, 1e-6, 'title shown')
  for (const part of [text.tagline, text.signature, text.brand, text.cta]) { close(Number(part.autoAlpha), 1, 1e-6, 'text shown'); close(Number(part.y), 0, 1e-6, 'text in place') }
  master.kill()
})

test('settling the legacy restores the still state whatever the scene left behind', () => {
  const { master, scene, human } = stage()
  master.time(at(97.3))
  settleLegacy(gsap, scene, human)
  // The selector lists name every tweened part, so a part the scene animates is never left behind.
  for (const part of ['[data-legacy-void]', '[data-legacy-vignette]']) assert.ok(legacyParts.scene.includes(part), part)
  assert.equal(legacyParts.film, '[data-film]')
  for (const part of ['[data-legacy-presence]', '[data-legacy-tagline]', '[data-legacy-signature]', '[data-legacy-brand]', '[data-magnetic]']) assert.ok(legacyParts.text.includes(part), part)
  master.kill()
})

test('each chapter enters with its narrative signature and every title reveals on the text curve', () => {
  const lines = many(2), chars = many(3)
  const titles = chapters.map(chapter => chapter.id === 'neuron' ? { lines, chars: [], centered: false } : chapter.id === 'connected' ? { lines: many(1), chars, centered: true } : null)
  const { master, panels } = stage(titles)
  for (const [index, chapter] of chapters.entries()) {
    const motion = motionOf(chapter.id)
    if (index === 0 || chapter.id === 'human') continue
    const scene = master.getById(`scene-${chapter.id}`)
    const entrance = scene.getChildren(false, true, false).find(tween => tween.targets()[0] === panels[index])
    assert.equal(entrance.vars.ease, motion.enter, `${chapter.id} entrance curve`)
    close(entrance.duration(), motion.duration, 1e-9, `${chapter.id} entrance duration`)
  }
  assert.equal(motionOf('origin').enter, ease.growth, 'cell growth')
  assert.equal(motionOf('axon').enter, ease.signal, 'neural signal')
  assert.equal(motionOf('synapse').enter, ease.pulse, 'synaptic pulse')
  assert.ok(motionOf('origin').duration > motionOf('axon').duration, 'the origin is slow, the signal short')
  for (const [id, target] of [['neuron', lines[0]], ['connected', chars[0]]]) {
    const reveal = master.getById(`scene-${id}`).getChildren(false, true, false).find(tween => tween.targets().includes(target))
    assert.equal(reveal.vars.ease, ease.text, `${id} title curve`)
  }
  assert.throws(() => motionOf('nowhere'), /No motion signature for chapter: nowhere/)
  master.kill()
})
