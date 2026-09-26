/**
 * Manual Test Script untuk Diagnosis API Endpoint
 * Run: node test-diagnosis-api.js
 */

const testPayload = {
  query:
    'Pasien laki-laki 45 tahun mengeluh nyeri dada kiri menjalar ke rahang, berkeringat dingin, sesak napas. Onset 2 jam lalu.',
  model: 'GEMINI_25_FLASH',
}

console.log('=== DIAGNOSIS API TEST ===\n')
console.log('Payload:')
console.log(JSON.stringify(testPayload, null, 2))
console.log('\n[INFO] Endpoint: http://localhost:3000/api/diagnosis')
console.log('[INFO] Method: POST')
console.log('[INFO] Expected Status: 200')
console.log('[INFO] Expected Response: { success: true, data: {...}, metadata: {...} }')
console.log('\n[ACTION] Setelah `vercel dev` running, test dengan:')
console.log('curl -X POST http://localhost:3000/api/diagnosis \\')
console.log('  -H "Content-Type: application/json" \\')
console.log("  -d '" + JSON.stringify(testPayload) + "'")
console.log('\n[NOTE] Atau gunakan Postman/Insomnia untuk test visual.')
