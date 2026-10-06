import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const emr = readFileSync(path.join(process.cwd(), 'src/app/emr/page.tsx'), 'utf-8')

test('the assessment workspace shows no engine-retirement notice and no engine explainer text (Chief 2026-10-06)', () => {
  assert.doesNotMatch(emr, /\{cdssRetiredMessage\}/)
  assert.doesNotMatch(emr, /DIISTIRAHATKAN/)
  assert.doesNotMatch(emr, /Tulis problem representation singkat dulu/)
  assert.doesNotMatch(emr, /engine membaca ringkasan klinis ini/)
  assert.doesNotMatch(emr, /jalankan Iskandar/)
  assert.doesNotMatch(emr, /Review dokter selesai/)
  assert.doesNotMatch(emr, /Data triase awal sudah terkumpul/)
})
