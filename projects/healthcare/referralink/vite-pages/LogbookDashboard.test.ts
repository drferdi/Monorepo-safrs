import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./LogbookDashboard.tsx', import.meta.url), 'utf8')
assert.match(source, /Logbook · Riwayat analisis/)
assert.match(source, /filterLogbookRecords/)
assert.match(source, /Hapus semua catatan/)
assert.match(source, /SYNTHETIC_DATA_GUARDRAIL/)
assert.match(source, /pendingDeleteId/)
assert.match(source, /Hapus catatan ini\?/)
assert.match(source, /role="status"/)
assert.match(source, /type="date"/)
assert.match(source, /Riwayat lama dihapus saat kebijakan retensi tanpa narasi diterapkan\./)
assert.doesNotMatch(source, /Search logbook|Synthetic query|Clinical notes|Differential diagnoses/)
assert.doesNotMatch(source, /record\.input|record\.outcome|record\.logs|record\.errorMessage/)
assert.doesNotMatch(source, /DetailDrawer|selectedRecord/)

console.log('logbook redacted workspace contract passed')
