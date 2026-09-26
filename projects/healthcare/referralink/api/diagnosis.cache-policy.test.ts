import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.join(currentDir, '..')
const serverSource = fs.readFileSync(path.join(currentDir, 'diagnosis.ts'), 'utf8')
const clientSource = fs.readFileSync(path.join(appDir, 'services', 'diagnosisApiClient.ts'), 'utf8')
const dashboardSource = fs.readFileSync(
  path.join(appDir, 'vite-pages', 'MedLinkDashboard.tsx'),
  'utf8'
)
const manualTestSource = fs.readFileSync(path.join(appDir, 'test-diagnosis-api.js'), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
}

assert.equal(fs.existsSync(path.join(appDir, 'services', 'cacheService.ts')), false)
assert.equal(fs.existsSync(path.join(currentDir, 'health', 'semantic-cache.ts')), false)
assert.equal(packageJson.dependencies?.['@upstash/vector'], undefined)
assert.doesNotMatch(serverSource, /checkSemanticCache|storeSemanticCache|UPSTASH_VECTOR|fromCache/)
assert.doesNotMatch(clientSource, /diagnosisCache|UPSTASH_VECTOR|fromCache|skipCache/)
assert.doesNotMatch(dashboardSource, /skipCache|fromCache/)
assert.doesNotMatch(manualTestSource, /skipCache|fromCache/)
assert.match(serverSource, /rawSkipCache/)
assert.match(serverSource, /data klinis tidak tepercaya/i)
assert.match(serverSource, /JSON\.stringify\(query\)/)
assert.match(serverSource, /1-3 kandidat.*kode unik/is)
assert.doesNotMatch(serverSource, /stack:/)
assert.doesNotMatch(clientSource, /response:\s*result|stack:/)

console.log('diagnosis no-cache architecture policy tests passed')
