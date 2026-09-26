import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./differential-diagnosis-card.tsx', import.meta.url), 'utf8')

assert.match(source, /<details className="medlink-candidate__disclosure">/)
assert.match(source, /<summary className="medlink-candidate__disclosure-summary">/)
assert.match(source, /Clinical evidence/)
assert.match(source, /Referral evidence/)
assert.match(
  source,
  /medlink-candidate__disclosure-body[\s\S]*medlink-candidate__context[\s\S]*Selected for referral brief/
)
assert.doesNotMatch(source, /<article[^>]*onClick=/s)
assert.doesNotMatch(source, /<p className="medlink-candidate__context-label">/)
assert.match(source, /<div className="medlink-candidate__context-label">/)
assert.doesNotMatch(source, /<Tile/)
assert.match(source, /<section className="medlink-panel medlink-candidate-card">/)

console.log('differential diagnosis disclosure contract passed')
