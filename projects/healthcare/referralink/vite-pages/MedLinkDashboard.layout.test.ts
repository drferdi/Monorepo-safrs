import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboardSource = readFileSync(new URL('./MedLinkDashboard.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/globals.scss', import.meta.url), 'utf8')

assert.match(dashboardSource, /className="medlink-query-layout"/)
assert.doesNotMatch(
  dashboardSource,
  /LazyIcd10LegacyTranslator|ICD Translator|medlink-workspace__tabs/
)
assert.match(
  dashboardSource,
  /<ClinicalReasoningStream\s+phase={requestStatus}\s+result={result}\s*\/>/
)
assert.match(
  dashboardSource,
  /setRequestStatus\('loading'\).*setRequestLogs\(\[\]\).*setResult\(null\).*setSelectedDiagnosisId\(undefined\)/s
)
assert.match(dashboardSource, /disabled={requestStatus === 'loading'}/)
assert.match(dashboardSource, /result \? submittedQuery : query/)
assert.match(dashboardSource, /<Grid className="medlink-result-layout">/)
assert.doesNotMatch(dashboardSource, /<Tile className="medlink-panel medlink-query-panel"/)
assert.match(dashboardSource, /function RequestTrace\(\{ logs \}/)

const statusTitleIndex = dashboardSource.indexOf('<h2>{status.title}</h2>')
const successTraceIndex = dashboardSource.indexOf(
  "requestStatus === 'success' && requestLogs.length > 0"
)
const statusTimelineIndex = dashboardSource.indexOf(
  '<ClinicalReasoningStream phase={requestStatus} result={result} />'
)
const statusAsideStart = dashboardSource.indexOf('<aside')
const statusAsideEnd = dashboardSource.indexOf('</aside>', statusAsideStart)
const queryLayoutEnd = dashboardSource.indexOf('</div>', statusAsideEnd)
assert.ok(statusTitleIndex >= 0)
assert.ok(successTraceIndex > statusTitleIndex)
assert.ok(statusTimelineIndex > queryLayoutEnd)
assert.ok(statusTimelineIndex > statusAsideEnd)
assert.ok(statusTimelineIndex < dashboardSource.indexOf("requestStatus === 'error'"))

assert.match(
  styles,
  /\.db01-workspace \.medlink-query-layout\s*{[^}]*align-items:\s*start[^}]*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(320px, 2fr\)/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-query-panel__input\s*{[^}]*field-sizing:\s*content/s
)
assert.match(
  styles,
  /@media \(max-width: 1055px\)\s*{[^}]*\.db01-workspace \.medlink-query-layout\s*{[^}]*grid-template-columns:\s*1fr/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-result-layout\s*{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 22rem\), 1fr\)\)/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-result-layout > \.cds--css-grid-column\s*{[^}]*grid-column:\s*auto\s*!important[^}]*min-width:\s*0[^}]*width:\s*100%\s*!important/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-result-layout \.cds--stack-vertical\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)[^}]*min-width:\s*0/s
)
assert.match(styles, /\.db01-workspace \.medlink-candidate__disclosure-summary,/)
assert.match(
  styles,
  /\.db01-workspace \.medlink-reasoning-stream__stages\s*{[^}]*grid-auto-columns:\s*minmax\(170px, 1fr\)[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-reasoning-stream__stages:focus-visible\s*{[^}]*outline:\s*2px solid var\(--sentra-db01-accent-blue\)/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-reasoning-stage\s*{[^}]*grid-template-rows:\s*18px minmax\(0, 1fr\)/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-reasoning-stage:not\(:last-child\) \.medlink-reasoning-stage__rail::after\s*{[^}]*height:\s*1px[^}]*left:\s*14px[^}]*top:\s*8px[^}]*width:\s*calc\(100% - 14px\)/s
)
assert.match(styles, /\.db01-workspace \.medlink-reasoning-stage--interrupted/)
assert.match(styles, /\.db01-workspace \.medlink-reasoning-stage--result/)
assert.match(styles, /@keyframes medlink-reasoning-summary-reveal/)
assert.match(
  styles,
  /\.db01-workspace \.medlink-reasoning-summary\s*{[^}]*animation:\s*medlink-reasoning-summary-reveal 320ms ease-out both[^}]*border-top:\s*1px solid var\(--sentra-db01-divider\)[^}]*margin-top:\s*24px[^}]*width:\s*100%/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-reasoning-summary p\s*{[^}]*max-width:\s*72ch[^}]*overflow-wrap:\s*anywhere/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-status \.medlink-request-trace\s*{[^}]*margin-top:\s*16px/s
)
assert.match(
  styles,
  /@media \(max-width: 767px\)[\s\S]*\.db01-workspace \.medlink-reasoning-stream__stages\s*{[^}]*grid-auto-columns:\s*minmax\(210px, 78vw\)/s
)
assert.match(styles, /\.db01-workspace \.medlink-referral-option__summary\s*{/)
assert.match(
  styles,
  /\.db01-workspace \.medlink-workspace__section--result \.medlink-panel\s*{[^}]*background:\s*transparent\s*!important[^}]*border:\s*0\s*!important[^}]*border-radius:\s*0\s*!important[^}]*box-shadow:\s*none\s*!important/s
)
assert.match(
  styles,
  /\.db01-workspace \.medlink-result-layout > \.cds--css-grid-column \+ \.cds--css-grid-column\s*{[^}]*border-left:\s*1px solid var\(--sentra-db01-divider\)/s
)
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)

console.log('approved MEDLINK open sectional layout contract passed')
