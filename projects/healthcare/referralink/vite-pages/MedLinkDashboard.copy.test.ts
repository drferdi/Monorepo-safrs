import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./MedLinkDashboard.tsx', import.meta.url), 'utf8')
const normalizedSource = source.replace(/\s+/g, ' ')

assert.match(
  normalizedSource,
  /Dukungan keputusan klinis untuk eksplorasi diagnosis banding, pemetaan ICD-10, dan pertimbangan rujukan berdasarkan konteks pasien\./
)
assert.match(normalizedSource, /Evidence-aware · Safety-first · Clinician-controlled/)
assert.match(
  normalizedSource,
  /Contoh: Pasien laki-laki, 58 tahun, datang dengan nyeri dada akut, sesak, dan keringat dingin\. Riwayat hipertensi\. Mohon identifikasi diagnosis banding, red flags, kode ICD-10 yang relevan, dan pertimbangan rujukan\./
)
assert.match(
  normalizedSource,
  /MedLink merupakan sistem pendukung keputusan klinis dan tidak menggantikan penilaian, pemeriksaan, maupun keputusan tenaga medis\. Seluruh hasil harus diverifikasi berdasarkan kondisi pasien dan kewenangan klinisi yang bertanggung jawab\./
)

console.log('MEDLINK dashboard copy contract passed')
