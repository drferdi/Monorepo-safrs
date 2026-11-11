import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPrompt } from './engine'
import type { CDSSEngineInput } from './types'

const baseInput: CDSSEngineInput = {
  keluhan_utama: 'Lemas',
  usia: 58,
  jenis_kelamin: 'P',
}

test('the prompt shows the Assist trajectory summary in its own block', () => {
  const prompt = buildPrompt(
    {
      ...baseInput,
      trajectory_summary_text: '- Trend keseluruhan: declining\n- Status perburukan: deteriorating',
    },
    '',
    'Perempuan 58 tahun dengan lemas'
  )

  assert.match(prompt, /## Ringkasan Trajectory dari Assist/)
  assert.match(prompt, /- Trend keseluruhan: declining/)
  assert.match(prompt, /- Status perburukan: deteriorating/)
})

test('an Assist trajectory summary never claims momentum, acceleration or worsening parameters', () => {
  const prompt = buildPrompt(
    { ...baseInput, trajectory_summary_text: '- Trend keseluruhan: declining' },
    '',
    'Perempuan 58 tahun dengan lemas'
  )

  assert.doesNotMatch(prompt, /Parameter memburuk:/)
  assert.doesNotMatch(prompt, /Akselerasi:/)
  assert.doesNotMatch(prompt, /- Momentum:/)
})
