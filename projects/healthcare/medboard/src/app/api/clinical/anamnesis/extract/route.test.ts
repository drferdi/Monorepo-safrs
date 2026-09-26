import assert from 'node:assert/strict'
import test from 'node:test'

import type { CDSSEngineInput } from '@/lib/cdss/types'

async function loadCanonicalDifferentialRouteModule() {
  process.env.DATABASE_URL ||=
    'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
  return await import('../../differential/evaluate/route')
}

test('route anamnesis extract tersedia di path yang benar', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const routePath = path.join(process.cwd(), 'src/app/api/clinical/anamnesis/extract/route.ts')

  assert.ok(fs.existsSync(routePath), 'route.ts harus tersedia')
})

test('route anamnesis extract mengekspor POST, OPTIONS, dan runtime nodejs', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const routePath = path.join(process.cwd(), 'src/app/api/clinical/anamnesis/extract/route.ts')
  const content = fs.readFileSync(routePath, 'utf-8')

  assert.ok(content.includes('export async function POST'), 'harus mengekspor POST handler')
  assert.ok(content.includes('export async function OPTIONS'), 'harus mengekspor OPTIONS handler')
  assert.ok(content.includes("runtime = 'nodejs'"), 'harus set nodejs runtime')
  assert.ok(content.includes('isCrewAuthorizedRequest'), 'harus memakai auth crew')
  assert.ok(
    content.includes('extractClinicalAnamnesisRich'),
    'harus memakai helper extractor kaya-field'
  )
})

test('route anamnesis extract memuat kontrak response ok data meta', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const routePath = path.join(process.cwd(), 'src/app/api/clinical/anamnesis/extract/route.ts')
  const content = fs.readFileSync(routePath, 'utf-8')

  assert.ok(content.includes('ok: true'), 'response sukses harus memiliki ok: true')
  assert.ok(
    content.includes('data: extraction.data'),
    'response sukses harus mengirim data extraction'
  )
  assert.ok(
    content.includes('source: extraction.source'),
    'response sukses harus mengirim meta source'
  )
})

test('canonical differential route returns 401 and records unauthenticated audit when session is missing', async () => {
  const { createCanonicalDifferentialPostHandler } = await loadCanonicalDifferentialRouteModule()
  const auditCalls: Array<Record<string, unknown>> = []

  const handler = createCanonicalDifferentialPostHandler({
    getIp: () => '10.10.10.10',
    getSession: () => null,
    getAuthorizationMode: () => 'none',
    isClinicalRole: () => false,
    runDiagnosis: async () => {
      throw new Error('should not be called')
    },
    writeClinicalAudit: async () => {
      throw new Error('should not be called')
    },
    writeSecurityAudit: async (input) => {
      auditCalls.push(input)
    },
  })

  const response = await handler(
    new Request('http://localhost/api/clinical/differential/evaluate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    })
  )
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.ok, false)
  assert.equal(auditCalls.length, 1)
  assert.equal(auditCalls[0]?.result, 'unauthenticated')
  assert.equal(auditCalls[0]?.action, 'CLINICAL_DIFFERENTIAL_EVALUATE')
})

test('canonical differential route rejects non-clinical roles with 403 before engine execution', async () => {
  const { createCanonicalDifferentialPostHandler } = await loadCanonicalDifferentialRouteModule()
  const callOrder: string[] = []

  const handler = createCanonicalDifferentialPostHandler({
    getIp: () => null,
    getSession: () => ({
      username: 'kepala-a',
      role: 'KEPALA_PUSKESMAS',
      profession: 'Administrasi',
    }),
    getAuthorizationMode: () => 'session',
    isClinicalRole: (role) => role === 'DOKTER',
    runDiagnosis: async () => {
      callOrder.push('runDiagnosis')
      throw new Error('should not be called')
    },
    writeClinicalAudit: async () => {
      callOrder.push('writeClinicalAudit')
    },
    writeSecurityAudit: async () => {
      callOrder.push('writeSecurityAudit')
    },
  })

  const response = await handler(
    new Request('http://localhost/api/clinical/differential/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patient: { age: 52, gender: 'L' },
        narrative: { keluhan_utama: 'Nyeri dada' },
      }),
      headers: { 'content-type': 'application/json' },
    })
  )

  assert.equal(response.status, 403)
  assert.deepEqual(callOrder, ['writeSecurityAudit'])
})

test('canonical differential route maps glucose and writes both clinical plus security audit on success', async () => {
  const { createCanonicalDifferentialPostHandler } = await loadCanonicalDifferentialRouteModule()
  const callOrder: string[] = []
  let receivedInput: CDSSEngineInput | undefined
  let clinicalAudit: { action?: string } | undefined
  let securityAudit: { result?: string } | undefined

  const handler = createCanonicalDifferentialPostHandler({
    getIp: () => '127.0.0.1',
    getSession: () => ({
      username: 'dokter-a',
      role: 'DOKTER',
      profession: 'Dokter',
    }),
    getAuthorizationMode: () => 'session',
    isClinicalRole: (role) => role === 'DOKTER' || role === 'Dokter',
    runDiagnosis: async (input: CDSSEngineInput) => {
      callOrder.push('runDiagnosis')
      receivedInput = input
      return {
        suggestions: [
          {
            rank: 1,
            icd10_code: 'E11.65',
            diagnosis_name: 'Diabetes Mellitus',
            confidence: 0.88,
            reasoning: 'Hiperglikemia dengan gejala klasik.',
            key_reasons: ['glukosa tinggi'],
            missing_information: [],
            red_flags: ['krisis glikemik'],
            recommended_actions: ['Evaluasi segera'],
            rag_verified: true,
          },
        ],
        red_flags: [
          {
            severity: 'urgent' as const,
            condition: 'Krisis glikemik',
            action: 'Monitor ketat',
            criteria_met: ['glucose >= 200'],
          },
        ],
        alerts: [],
        processing_time_ms: 123,
        source: 'ai' as const,
        model_version: 'TEST-MODEL',
        validation_summary: {
          total_raw: 3,
          total_validated: 1,
          recommended_count: 1,
          review_count: 0,
          must_not_miss_count: 0,
          deferred_count: 0,
          requires_more_data: false,
          unverified_codes: [],
          warnings: [],
        },
        next_best_questions: ['Riwayat diabetes sebelumnya?'],
        _reasoning_content: 'Clinical reasoning',
      }
    },
    writeClinicalAudit: async (input) => {
      callOrder.push('writeClinicalAudit')
      clinicalAudit = input
    },
    writeSecurityAudit: async (input) => {
      callOrder.push('writeSecurityAudit')
      securityAudit = input
    },
  })

  const response = await handler(
    new Request('http://localhost/api/clinical/differential/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        request_id: 'req-glucose-001',
        patient: { age: 54, gender: 'P' },
        narrative: {
          keluhan_utama: 'Sering haus dan lemas',
          keluhan_tambahan: 'Sering kencing',
        },
        vitals: {
          sbp: 150,
          dbp: 92,
          hr: 108,
          rr: 24,
          temp: 37.2,
          spo2: 97,
          glucose: 288,
        },
      }),
      headers: { 'content-type': 'application/json' },
    })
  )
  const body = await response.json()
  const vitalSigns = receivedInput?.vital_signs

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(receivedInput?.session_id, 'req-glucose-001')
  assert.equal(vitalSigns?.glucose, 288)
  assert.deepEqual(callOrder, ['runDiagnosis', 'writeClinicalAudit', 'writeSecurityAudit'])
  assert.equal(clinicalAudit?.action, 'DIAGNOSE_RESULT')
  assert.equal(securityAudit?.result, 'success')
  assert.equal(body.data.meta.model_version, 'TEST-MODEL')
  assert.equal(body.data.diagnosis_suggestions[0]?.icd10_code, 'E11.65')
})
