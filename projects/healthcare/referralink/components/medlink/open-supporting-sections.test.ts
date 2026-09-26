import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const chiefComplaintSource = readFileSync(
  new URL('./chief-complaint-card.tsx', import.meta.url),
  'utf8'
)
const clinicalLabsSource = readFileSync(
  new URL('./clinical-labs-card.tsx', import.meta.url),
  'utf8'
)
const technicalDetailsSource = readFileSync(
  new URL('./technical-details-card.tsx', import.meta.url),
  'utf8'
)
const styles = readFileSync(new URL('../../src/globals.scss', import.meta.url), 'utf8')

for (const source of [chiefComplaintSource, clinicalLabsSource, technicalDetailsSource]) {
  assert.doesNotMatch(source, /<Tile/)
}

assert.match(
  chiefComplaintSource,
  /<section className="medlink-panel medlink-context-card medlink-open-panel">/
)
assert.match(
  clinicalLabsSource,
  /<section className="medlink-panel medlink-evidence-card medlink-open-panel">/
)
assert.match(
  technicalDetailsSource,
  /<section className="medlink-panel medlink-technical-card medlink-open-panel">/
)

assert.match(
  styles,
  /\.db01-workspace \.medlink-workspace__section--supporting \.medlink-panel,[\s\S]*\.db01-workspace \.medlink-workspace__section--technical \.medlink-panel\s*{[^}]*background:\s*transparent\s*!important[^}]*border:\s*0\s*!important[^}]*border-radius:\s*0\s*!important[^}]*box-shadow:\s*none\s*!important/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-workspace__section--supporting > \.cds--css-grid\s*{[^}]*display:\s*grid\s*!important[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-workspace__section--supporting > \.cds--css-grid > \.cds--css-grid-column \+ \.cds--css-grid-column\s*{[^}]*border-left:\s*1px solid var\(--sentra-db01-divider\)/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-open-panel::before\s*{[^}]*animation:\s*medlink-open-line-reveal[^}]*transform:\s*scaleX\(0\)/s
)
assert.match(styles, /@keyframes medlink-open-line-reveal/)
assert.match(
  styles,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.db01-workspace \.medlink-open-panel::before\s*{[^}]*animation:\s*none[^}]*transform:\s*scaleX\(1\)/s
)
assert.match(
  styles,
  /@media \(max-width: 1055px\)[\s\S]*\.db01-workspace \.medlink-workspace__section--supporting > \.cds--css-grid\s*{[^}]*grid-template-columns:\s*1fr\s*!important[\s\S]*\.db01-workspace \.medlink-workspace__section--supporting > \.cds--css-grid > \.cds--css-grid-column \+ \.cds--css-grid-column\s*{[^}]*border-left:\s*0[^}]*border-top:\s*1px solid var\(--sentra-db01-divider\)/s
)

console.log('MEDLINK open supporting sections contract passed')
