import assert from 'node:assert/strict'
import test from 'node:test'

import { buildConsultVitalSigns } from './consult-vital-signs'

// Assist sends every ttv value as a string (bridge-client.ts ConsultPayload.ttv).
const assistTtv = {
  sbp: '150',
  dbp: '95',
  hr: '102',
  rr: '22',
  temp: '37,8',
  spo2: '95',
  glucose: '310',
}

test('consult vital signs carry the blood glucose Assist sends', () => {
  const vitals = buildConsultVitalSigns(assistTtv, null)

  assert.equal(vitals.glucose, 310)
})

test('consult vital signs parse the Assist ttv strings, including a decimal comma', () => {
  const vitals = buildConsultVitalSigns(assistTtv, null)

  assert.equal(vitals.systolic, 150)
  assert.equal(vitals.diastolic, 95)
  assert.equal(vitals.heart_rate, 102)
  assert.equal(vitals.respiratory_rate, 22)
  assert.equal(vitals.temperature, 37.8)
  assert.equal(vitals.spo2, 95)
})
