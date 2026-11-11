import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSummaryPrompt, parseSummary, redactNumbers, sectionText, type TranscriptLine } from './epuskesmas-summary'

const lines: TranscriptLine[] = [
  { speaker: 'dokter', text: 'Keluhannya apa, Bu?', at: '2026-10-07T10:00:00.000Z' },
  { speaker: 'pasien', text: 'Batuk tiga hari, NIK saya 3507123456780001.', at: '2026-10-07T10:00:05.000Z' },
]

const known = (code: string) => ['J06.9', 'J20.9'].includes(code)

test('long numbers (NIK, BPJS, phone) are removed before the transcript reaches the AI', () => {
  assert.equal(redactNumbers('NIK 3507123456780001, HP 0812-3456-7890'), 'NIK [angka dihapus], HP [angka dihapus]')
  assert.equal(redactNumbers('suhu 38,5 dan 3x500mg'), 'suhu 38,5 dan 3x500mg')
})

test('the prompt names who spoke and carries no long numbers', () => {
  const prompt = buildSummaryPrompt(lines)
  assert.match(prompt, /Dokter: Keluhannya apa, Bu\?/)
  assert.match(prompt, /Pasien: Batuk tiga hari/)
  assert.doesNotMatch(prompt, /3507123456780001/)
})

test('the answer is read into the ePuskesmas pages: Anamnesa, Diagnosa, Resep; gaps become empty', () => {
  const content = '```json\n' + JSON.stringify({
    anamnesa: { keluhan_utama: 'Batuk', lama_sakit: { hr: 3 }, alergi: { obat: ['Amoksisilin'] } },
    diagnosa: [{ icd_x: 'j06.9', nama: 'ISPA', jenis: 'PRIMER', kasus: 'BARU' }],
    resep: [{ nama_obat: 'Paracetamol 500 mg', signa: '3x500mg', jumlah: 10 }],
  }) + '\n```'
  const summary = parseSummary(content, known)
  assert.ok(summary)
  assert.equal(summary.anamnesa.keluhan_utama, 'Batuk')
  assert.deepEqual(summary.anamnesa.lama_sakit, { thn: 0, bln: 0, hr: 3 })
  assert.equal(summary.anamnesa.keluhan_tambahan, '')
  assert.deepEqual(summary.anamnesa.riwayat_penyakit, { sekarang: '', dahulu: '', keluarga: '' })
  assert.deepEqual(summary.anamnesa.alergi, { obat: ['Amoksisilin'], makanan: [], udara: [], lainnya: [] })
  assert.equal(summary.diagnosa[0]?.icd_x, 'J06.9')
  assert.equal(summary.resep[0]?.signa, '3x500mg')
})

test('an ICD code missing from the 2010 catalogue is dropped, the diagnosis name stays', () => {
  const summary = parseSummary(JSON.stringify({ diagnosa: [{ icd_x: 'Z99.99', nama: 'Karangan' }] }), known)
  assert.equal(summary?.diagnosa[0]?.icd_x, '')
  assert.equal(summary?.diagnosa[0]?.nama, 'Karangan')
  assert.equal(summary?.diagnosa[0]?.jenis, 'PRIMER')
})

test('an answer that is not JSON gives no summary', () => {
  assert.equal(parseSummary('maaf, saya tidak bisa', known), null)
})

test('each page copies as its own text block', () => {
  const summary = parseSummary(JSON.stringify({ anamnesa: { keluhan_utama: 'Batuk' }, resep: [{ nama_obat: 'Paracetamol', signa: '3x500mg' }] }), known)
  assert.ok(summary)
  assert.match(sectionText(summary, 'anamnesa'), /Keluhan utama: Batuk/)
  assert.match(sectionText(summary, 'resep'), /Paracetamol 3x500mg/)
  assert.equal(sectionText(summary, 'diagnosa'), '')
})
