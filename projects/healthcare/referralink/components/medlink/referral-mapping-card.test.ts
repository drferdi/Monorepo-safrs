import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(currentDir, 'referral-mapping-card.tsx'), 'utf8')

for (const field of [
  'destination_service',
  'facility_level',
  'referral_reason',
  'required_capability',
  'urgency',
]) {
  assert.match(source, new RegExp(`item\\.${field}|selectedReferral\\?\\.${field}`))
}

assert.match(source, /Tujuan layanan/)
assert.match(source, /Alasan rujukan/)
assert.match(source, /Kapabilitas dibutuhkan/)
assert.match(source, /selectedReferral\?\.code === item\.code/)

const dashboardSource = fs.readFileSync(
  path.join(currentDir, '..', '..', 'vite-pages', 'MedLinkDashboard.tsx'),
  'utf8'
)
assert.match(dashboardSource, /urgency:\s*toUrgencyLevel\(item\.urgency\)/)
assert.match(dashboardSource, /normalized === 'emergency'[^\n]*return 'high'/)
assert.match(dashboardSource, /normalized === 'urgent'[\s\S]{0,160}return 'moderate'/)
assert.match(source, /Belum terverifikasi terhadap ruleset BPJS/)
assert.match(source, /No referral proposed/)
assert.match(source, /Low-risk engine result/)
assert.match(source, /result && referrals\.length === 0/)
assert.match(source, /medlink-referral-card__no-referral/)
assert.match(source, /selectedReferral\?\.description/)
assert.match(source, /selectedReferral\?\.code/)
assert.doesNotMatch(source, /selectedDiagnosis\?\.name \|\| result\.description/)
assert.doesNotMatch(source, /selectedReferral\?\.referral_reason \|\|\s*result\.evidence/s)
assert.equal(source.match(/<details className="medlink-referral-card__brief">/g)?.length, 3)
assert.match(
  source,
  /<summary className="medlink-referral-card__brief-summary">Tujuan layanan<\/summary>/
)
assert.match(
  source,
  /<summary className="medlink-referral-card__brief-summary">Alasan rujukan<\/summary>/
)
assert.match(
  source,
  /<summary className="medlink-referral-card__brief-summary">\s*Kapabilitas dibutuhkan\s*<\/summary>/
)
assert.match(
  source,
  /<details[\s\S]*medlink-referral-option[\s\S]*medlink-referral-option__summary/
)
assert.doesNotMatch(source, /<Tile/)
assert.match(source, /<section className="medlink-panel medlink-referral-card">/)

console.log('referral mapping field wiring tests passed')
