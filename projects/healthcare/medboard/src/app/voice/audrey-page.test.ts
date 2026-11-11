import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { audreyStage } from './audrey-stage'
import { AUDREY_NAME, audreyExpansion } from './audrey-identity'
import { AUDREY_TEMPLATES, firstSlot } from './audrey-templates'

const read = (relative: string): string => readFileSync(path.join(process.cwd(), relative), 'utf8')
const page = read('src/app/voice/page.tsx')
const css = read('src/app/voice/voice.module.css')
const orb = read('src/app/voice/visual/matrix-orb.ts')

test('the orb follows the real session in three states (Chief: idle, listening, thinking)', () => {
  assert.equal(audreyStage('idle').motion, 'idle')
  assert.equal(audreyStage('ready').motion, 'idle')
  assert.equal(audreyStage('error').motion, 'idle')
  assert.equal(audreyStage('recording').motion, 'listening')
  assert.equal(audreyStage('speaking').motion, 'listening')
  assert.equal(audreyStage('connecting').motion, 'thinking')
  assert.equal(audreyStage('processing').motion, 'thinking')
})

test('every session state has its own words for the stage, the bubble and the badge', () => {
  const states = ['idle', 'connecting', 'ready', 'recording', 'processing', 'speaking', 'error'] as const
  for (const state of states) {
    const stage = audreyStage(state)
    assert.ok(stage.stageLabel && stage.bubbleLabel && stage.badgeLabel, state)
  }
  assert.equal(new Set(states.map((state) => audreyStage(state).badgeLabel)).size, states.length)
  assert.equal(audreyStage('recording').tone, 'critical')
  assert.equal(audreyStage('error').tone, 'critical')
  assert.equal(audreyStage('ready').tone, 'success')
})

// Chief 2026-10-07: "kolom chat, kolom voice, ada template tanya misal dosis obat, penyakit".
test('the page has a chat column and a voice column side by side', () => {
  assert.match(page, /<section className=\{cx\(styles\.card, styles\.chat\)\}/)
  assert.match(page, /<section className=\{cx\(styles\.card, styles\.voice\)\}/)
  assert.match(page, /src="\/audrey\.png"/)
  assert.match(page, /fetch\('\/api\/perplexity'/)
  assert.match(css, /\.layout\s*\{[^}]*grid-template-columns/)
})

test('question templates cover drug doses and diseases, each with a slot to fill in', () => {
  const labels = AUDREY_TEMPLATES.map((template) => template.label)
  assert.ok(labels.includes('Dosis obat'))
  assert.ok(labels.includes('Penyakit'))
  for (const template of AUDREY_TEMPLATES) assert.ok(firstSlot(template.text), template.label)
})

test('choosing a template selects its first slot so the doctor types straight over it', () => {
  const text = 'Berapa dosis [nama obat] untuk pasien [usia] tahun?'
  assert.deepEqual(firstSlot(text), { start: 13, end: 24 })
  assert.equal(text.slice(13, 24), '[nama obat]')
  assert.equal(firstSlot('Tanpa slot'), null)
})

test('the page shows no made-up patient, compliance claim, version tag or developer stage switch', () => {
  for (const banned of [/Mrs\. Tan/, /HbA1c/, /HIPAA|GDPR/, /v3\.4/, /Stage Mode/i, /Fine-tuning pipeline/, /Alpha/]) {
    assert.doesNotMatch(page, banned)
  }
})

test('Audrey stands still for people who ask for less motion, by system setting or by the page switch', () => {
  assert.match(page, /<AudreyOrb motion=\{stage\.motion\} still=\{reducedMotion\} label=\{stage\.stageLabel\} \/>/)
  assert.match(page, /aria-pressed=\{reducedMotion\}/)
  assert.match(orb, /prefers-reduced-motion: reduce/)
  assert.match(orb, /if \(still \|\| reducedQuery\.matches \|\| !visible \|\| document\.hidden\)/)
})

test('the orb is MedBoard accent dots straight on the card, with no dark block behind it', () => {
  const orbRule = css.match(/\.orb \{([^}]*)\}/)?.[1] ?? ''
  assert.doesNotMatch(orbRule, /background|box-shadow/)
  assert.match(css, /\.orbCanvas \{[^}]*color: var\(--accent\)/)
  assert.match(orb, /getComputedStyle\(canvas\)\.color/)
  assert.doesNotMatch(css, /@keyframes/)
})

test('the page names Audrey in full and says what she is, in the words Chief gave', () => {
  assert.equal(AUDREY_NAME.map((part) => part.word[0]).join(''), 'AUDREY')
  assert.equal(audreyExpansion(), 'Augmented Universal Doctor Reasoning Engine for Your Healthcare')
  assert.match(page, /aria-label=\{audreyExpansion\(\)\}/)
  assert.match(page, /AUDREY adalah entitas kecerdasan augmented tingkat klinis yang di design dan di kembangkan oleh/)
  assert.match(page, /<a[^>]*href="https:\/\/ferdiiskandar\.com"[^>]*>\s*dr Ferdi Iskandar\s*<\/a>/)
  assert.match(page, /href="https:\/\/ferdiiskandar\.com"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
})
