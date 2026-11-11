import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./SentraBoardDashboard.tsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')

assert.match(source, /SENTRABOARD_REFERENCE_SNAPSHOT/)
assert.match(source, /loadCentralInformation/)
assert.match(source, /useEffect/)
assert.match(source, /setSnapshot/)
assert.match(source, /loadCentralInformation\(\)/)
assert.doesNotMatch(source, /useLogbookRecords|buildSentraBoardSummary/)
assert.match(source, /SentraBoard · Ringkasan/)
assert.match(source, /db01-dashboard__hero/)
assert.match(source, /db01-dashboard__metrics/)
assert.match(source, /db01-dashboard__notes/)
assert.match(source, /db01-dashboard__recent/)
assert.match(source, /Catatan Airmanship Anda/)
assert.match(source, /Aktivitas terbaru/)
assert.match(source, /onClick=\{onOpenMedLink\}/)
assert.match(source, /snapshot\.metrics\.map/)
assert.match(source, /snapshot\.notes\.map/)
assert.match(source, /snapshot\.activities\.map/)
assert.match(appSource, /workspaceView === 'sentraboard'/)
assert.match(appSource, /medlink-shell--sentraboard/)

console.log('Sentraboard page contract passed')
