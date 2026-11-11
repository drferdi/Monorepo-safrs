import assert from 'node:assert/strict'

import { SYNTHETIC_DATA_GUARDRAIL, UI_COPY } from './uiCopy'

for (const group of Object.values(UI_COPY)) {
  for (const value of Object.values(group)) assert.ok(value.trim().length > 0)
}

assert.equal(
  SYNTHETIC_DATA_GUARDRAIL,
  'Hanya gunakan data sintetis. Jangan masukkan identitas pasien atau PHI.'
)

console.log('Indonesian UI copy contract passed')
