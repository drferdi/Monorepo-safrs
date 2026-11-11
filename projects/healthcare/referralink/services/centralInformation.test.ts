import assert from 'node:assert/strict'

import {
  SENTRABOARD_REFERENCE_SNAPSHOT,
  loadCentralInformation,
} from './centralInformation'

assert.equal(SENTRABOARD_REFERENCE_SNAPSHOT.hero.title, 'Welcome back, dr Ferdi')
assert.equal(
  SENTRABOARD_REFERENCE_SNAPSHOT.hero.weather,
  'Kediri hari ini 30° Kemungkinan hujan sore dan malam hari.'
)
assert.equal(SENTRABOARD_REFERENCE_SNAPSHOT.hero.actionLabel, 'Medlink')

assert.deepEqual(
  SENTRABOARD_REFERENCE_SNAPSHOT.metrics.map(({ label, value, trend }) => ({
    label,
    value,
    trend,
  })),
  [
    { label: 'Member', value: '7', trend: '+1 From last week' },
    { label: 'Apps', value: '3', trend: '+1 From last week' },
    { label: 'Sentraverse (website)', value: '20', trend: '+10 From last week' },
    { label: 'Hours', value: '20', trend: '+10 From last week' },
  ]
)

assert.deepEqual(
  SENTRABOARD_REFERENCE_SNAPSHOT.notes.map(({ title, byline }) => ({ title, byline })),
  [
    { title: 'New policy added', byline: 'By dr Ferdi Iskandar' },
    { title: 'Registration this week', byline: 'By dr Ferdi Iskandar' },
    { title: '10 Tips Sentra', byline: 'By dr Ferdi Iskandar' },
    { title: 'Forgot password', byline: 'By dr Ferdi Iskandar' },
  ]
)

assert.deepEqual(
  SENTRABOARD_REFERENCE_SNAPSHOT.activities.map(({ label }) => label),
  [
    'Mencari ICD10 keluhan Pusing di Medlink',
    'Mencari ICD10 keluhan Muntah di Medlink',
  ]
)

const providedSnapshot = await loadCentralInformation({
  getSnapshot: async () => SENTRABOARD_REFERENCE_SNAPSHOT,
})

assert.equal(providedSnapshot, SENTRABOARD_REFERENCE_SNAPSHOT)

console.log('central information contract passed')
