import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboardSource = readFileSync(
  new URL('../../vite-pages/MedLinkDashboard.tsx', import.meta.url),
  'utf8'
)
const styles = readFileSync(new URL('../../src/globals.scss', import.meta.url), 'utf8')
const redesignMarker = '// MEDLINK query action redesign.'
const redesignStart = styles.lastIndexOf(redesignMarker)

assert.match(dashboardSource, /import \{ Reset, Search \} from '@carbon\/icons-react'/)
assert.match(
  dashboardSource,
  /<Button[\s\S]*?className="medlink-query-panel__submit"[\s\S]*?renderIcon={Search}[\s\S]*?>[\s\S]*?\{requestStatus === 'loading' \? 'Menganalisis\.\.\.' : 'Cari'\}[\s\S]*?<\/Button>/
)
assert.match(
  dashboardSource,
  /<Button[\s\S]*?className="medlink-query-panel__reset"[\s\S]*?kind="tertiary"[\s\S]*?renderIcon={Reset}[\s\S]*?>[\s\S]*?Bersihkan ruang kerja[\s\S]*?<\/Button>/
)
assert.ok(redesignStart >= 0, 'expected the approved MEDLINK query action layer')

const redesignStyles = styles.slice(redesignStart)
const actionRuleStart = redesignStyles.indexOf('.db01-workspace .medlink-query-panel__actions {')
const actionRule = redesignStyles.slice(
  actionRuleStart,
  redesignStyles.indexOf('}', actionRuleStart) + 1
)
assert.ok(actionRuleStart >= 0)
assert.match(actionRule, /display:\s*grid\s*!important/)
assert.match(
  actionRule,
  /grid-template-columns:\s*minmax\(7\.5rem, 0\.9fr\) minmax\(10rem, 1\.1fr\)/
)
assert.match(actionRule, /gap:\s*0\.625rem/)
assert.match(
  redesignStyles,
  /\.db01-workspace \.medlink-query-panel__actions \.medlink-query-panel__submit\s*{[^}]*background:\s*var\(--sentra-db01-accent-blue\)\s*!important[^}]*border-radius:\s*0\.75rem\s*!important[^}]*height:\s*3rem\s*!important[^}]*min-height:\s*3rem\s*!important/s
)
assert.match(
  redesignStyles,
  /\.db01-workspace \.medlink-query-panel__actions \.medlink-query-panel__reset\s*{[^}]*background:\s*#202020\s*!important[^}]*border:\s*1px solid #464646\s*!important[^}]*border-radius:\s*0\.75rem\s*!important[^}]*height:\s*3rem\s*!important/s
)
assert.match(
  redesignStyles,
  /\.db01-workspace \.medlink-query-panel__actions \.medlink-query-panel__submit:hover/
)
assert.match(
  redesignStyles,
  /\.db01-workspace \.medlink-query-panel__actions \.medlink-query-panel__reset:hover/
)
assert.match(
  redesignStyles,
  /\.db01-workspace \.medlink-query-panel__actions \.cds--btn:focus-visible/
)
assert.match(
  redesignStyles,
  /@media \(max-width: 420px\)[\s\S]*\.db01-workspace \.medlink-query-panel__actions\s*{[^}]*grid-template-columns:\s*1fr/s
)

console.log('approved MEDLINK query action design contract passed')
