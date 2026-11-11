import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const styles = readFileSync(new URL('../../src/globals.scss', import.meta.url), 'utf8')
const marker = '// MEDLINK typography normalization.'
const sentraboardMarker = '// Sentraboard reference shell.'
const finalCascade = styles.slice(styles.lastIndexOf(marker), styles.indexOf(sentraboardMarker))

for (const token of [
  '--db01-font-label: 0.75rem',
  '--db01-font-meta: 0.8125rem',
  '--db01-font-body: 0.875rem',
  '--db01-font-body-lg: 0.9375rem',
  '--db01-font-heading: 1rem',
  '--db01-font-section: 1.25rem',
  '--db01-font-page: 2rem',
  '--db01-leading-label: 1.3',
  '--db01-leading-body: 1.5',
  '--db01-leading-heading: 1.2',
]) {
  assert.ok(styles.includes(token), `missing typography token: ${token}`)
}

for (const selector of [
  '.db01-workspace .medlink-query-panel__input',
  '.db01-workspace .medlink-status > p',
  '.db01-workspace .medlink-candidate__reasoning',
  '.db01-workspace .medlink-referral-option__body',
  '.db01-workspace .medlink-workspace__footer',
]) {
  const selectorIndex = finalCascade.indexOf(selector)
  assert.notEqual(selectorIndex, -1, `missing selector: ${selector}`)
  assert.match(finalCascade.slice(selectorIndex, selectorIndex + 600), /var\(--db01-font-/)
}

assert.doesNotMatch(
  finalCascade,
  /font-size:\s*0\.(5|54|55|5625|62|64|65|66|67|68|6875|7|72|73|74|76|78|8|82|84|86)rem/
)

console.log('MEDLINK typography contract passed')
