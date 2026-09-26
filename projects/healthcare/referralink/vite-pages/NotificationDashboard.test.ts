import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./NotificationDashboard.tsx', import.meta.url), 'utf8')

assert.match(source, /useLogbookRecords/)
assert.match(source, /Belum ada notifikasi baru/)
assert.match(source, /Buka Logbook/)
assert.match(source, /SYNTHETIC_DATA_GUARDRAIL/)
assert.match(source, /record\.urgency/)
assert.doesNotMatch(source, /record\.outcome|record\.errorMessage|record\.input/)

console.log('notification redacted workspace contract passed')
