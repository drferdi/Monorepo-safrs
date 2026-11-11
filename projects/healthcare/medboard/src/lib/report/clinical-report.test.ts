import { createTestRunner } from '../../../scripts/test-helpers/test-runner'
import {
  ClinicalReportAnamnesaSchema,
  ClinicalReportAssessmentSchema,
  ClinicalReportClosingSchema,
  ClinicalReportDraftInputSchema,
  ClinicalReportPatientSchema,
  formatClinicalReportDate,
} from './clinical-report'

const { test, runAll } = createTestRunner()

test('Clinical Report - Patient schema accepts valid data', () => {
  const valid = {
    noRM: 'RM001',
    nama: 'Budi Santoso',
    jenisKelamin: 'L' as const,
  }
  const result = ClinicalReportPatientSchema.safeParse(valid)
  if (!result.success) throw new Error('Should accept valid patient')
})

test('Clinical Report - Patient schema rejects invalid data', () => {
  const invalid = { noRM: '', nama: 'B', jenisKelamin: 'X' as any }
  const result = ClinicalReportPatientSchema.safeParse(invalid)
  if (result.success) throw new Error('Should reject invalid patient')
})

test('Clinical Report - Draft input schema works', () => {
  const draft = {
    pasien: { noRM: 'RM001', nama: 'Budi Santoso', jenisKelamin: 'L' as const },
    anamnesa: { keluhanUtama: 'Demam tinggi' },
    pemeriksaanFisik: {},
    asesmen: { diagnosisKerja: 'Demam tifoid' },
    tataLaksana: {},
    penutup: { dokter: 'dr. Ferdi', tanggalPemeriksaan: '2026-03-17' },
  }
  const result = ClinicalReportDraftInputSchema.safeParse(draft)
  if (!result.success) throw new Error('Should accept valid draft')
})

test('Clinical Report - formatClinicalReportDate works', () => {
  const formatted = formatClinicalReportDate('2026-03-17T10:30:00Z')
  if (!formatted.includes('17 Maret 2026')) {
    throw new Error('Date formatting failed')
  }
})

test('Clinical Report - formatClinicalReportDate handles invalid date', () => {
  const result = formatClinicalReportDate('invalid-date')
  if (result !== 'invalid-date') {
    throw new Error(`Expected "invalid-date", got "${result}"`)
  }
})

async function runTests() {
  const results = await runAll()
  const failed = results.filter(r => r.status === 'FAIL')
  if (failed.length > 0) {
    console.error('Clinical Report Tests failed:', failed)
    process.exit(1)
  }
  console.log('✅ Clinical Report tests passed')
}

runTests().catch(console.error)
