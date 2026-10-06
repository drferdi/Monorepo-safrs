import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { audreyStage } from './audrey-stage'

const read = (relative: string): string => readFileSync(path.join(process.cwd(), relative), 'utf8')
const page = read('src/app/voice/page.tsx')
const css = read('src/app/voice/voice.module.css')

test('Audrey moves with the real session: idle, thinking while it works, responding while it speaks', () => {
  assert.equal(audreyStage('idle').motion, 'idle')
  assert.equal(audreyStage('ready').motion, 'idle')
  assert.equal(audreyStage('recording').motion, 'idle')
  assert.equal(audreyStage('error').motion, 'idle')
  assert.equal(audreyStage('connecting').motion, 'thinking')
  assert.equal(audreyStage('processing').motion, 'thinking')
  assert.equal(audreyStage('speaking').motion, 'responding')
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

test('the page is the attachment layout (Chief 2026-10-06): Audrey on a stage beside the consultation stream', () => {
  assert.match(page, /src="\/audrey\.png"/)
  assert.match(page, /<section className=\{cx\(styles\.card, styles\.stage\)\}>/)
  assert.match(page, /<section className=\{cx\(styles\.card, styles\.consult\)\}>/)
  assert.match(css, /\.layout\s*\{[^}]*grid-template-columns/)
})

test('the page shows no made-up patient, compliance claim, version tag or developer stage switch', () => {
  for (const banned of [/Mrs\. Tan/, /HbA1c/, /HIPAA|GDPR/, /v3\.4/, /Stage Mode/i, /Fine-tuning pipeline/]) {
    assert.doesNotMatch(page, banned)
  }
})

test('Audrey stands still for people who ask for less motion, by system setting or by the page switch', () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/)
  assert.match(css, /\.still\s[^{]*\{[^}]*animation:\s*none/)
  assert.match(page, /aria-pressed=\{reducedMotion\}/)
})
