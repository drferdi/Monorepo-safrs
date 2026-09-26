import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./CredentialDashboard.tsx', import.meta.url), 'utf8')
assert.match(source, /Credential · Referensi aman/)
assert.match(source, /Vault aman desktop diperlukan/)
assert.match(source, /SYNTHETIC_DATA_GUARDRAIL/)
assert.doesNotMatch(source, /type=["']password["']/)
assert.doesNotMatch(source, /localStorage|sessionStorage/)
assert.match(source, /https:/)
assert.doesNotMatch(source, /cause instanceof Error \? cause\.message/)

console.log('credential workspace security contract passed')
