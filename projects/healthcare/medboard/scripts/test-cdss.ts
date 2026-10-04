// Blueprinted & built by Drferdi.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { installModuleMocks } from './test-helpers/module-mocks'
import { createTestRunner, writeTestReport } from './test-helpers/test-runner'

type SecurityAuditEntry = {
  endpoint: string
  action: string
  result: string
  metadata?: Record<string, unknown>
}

type CDSSAuditEntry = {
  timestamp: Date
  action: string
  latencyMs: number
  outputSummary: Record<string, unknown>
  metadata?: Record<string, unknown>
  validationStatus: string
}

type CDSSOutcomeEntry = {
  selectedIcd: string
  finalIcd: string
  overrideReason: string | null
  outcomeConfirmed: boolean | null
}

type TeleAuditEntry = {
  appointmentId: string
  userId: string
  action: string
  metadata?: Record<string, unknown>
}

type AppointmentRecord = {
  id: string
  doctorId: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  livekitRoomName: string | null
  startedAt: Date | null
  deletedAt: Date | null
}

type SessionRecord = {
  id: string
  appointmentId: string
  roomName: string
  actualStartAt: Date | null
}

type ParticipantRecord = {
  sessionId: string
  userId: string
  role: 'DOCTOR' | 'NURSE' | 'PATIENT' | 'OBSERVER'
  livekitIdentity: string
  joinedAt: Date | null
  leftAt: Date | null
}

const forbiddenLegacyPatterns: Array<{ label: string; regex: RegExp }> = [
  {
    label: 'legacy red-flags import',
    regex: /from\s+["']\.\.\/src\/lib\/cdss\/red-flags["']/,
  },
  {
    label: 'legacy validation import',
    regex: /from\s+["']\.\.\/src\/lib\/cdss\/validation["']/,
  },
  {
    label: 'legacy data-provider import',
    regex: /from\s+["']\.\.\/src\/lib\/cdss\/data-provider["']/,
  },
  {
    label: 'legacy diagnose-request import',
    regex: /from\s+["']\.\.\/src\/lib\/cdss\/api\/diagnose-request["']/,
  },
] as const

async function main(): Promise<void> {
  process.env.NODE_ENV = 'test'
  process.env.CREW_ACCESS_SECRET = 'test-suite-secret'
  process.env.CREW_ACCESS_USERS_JSON = ''
  process.env.CREW_ACCESS_AUTOMATION_TOKEN = 'test-automation-token'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/puskesmas_test'
  // The engine is retired by default; these tests exercise it, so it is switched back on.
  process.env.LEGACY_CDSS_ENGINE_ENABLED = 'true'

  const securityAuditEntries: SecurityAuditEntry[] = []
  const cdssAuditEntries: CDSSAuditEntry[] = []
  const cdssOutcomeEntries: CDSSOutcomeEntry[] = []
  const teleAuditEntries: TeleAuditEntry[] = []
  const ensureLiveKitRoomCalls: string[] = []
  const generateLiveKitTokenCalls: Array<Record<string, unknown>> = []
  const diagnosisEngineCalls: Array<Record<string, unknown>> = []

  const dbState: {
    appointment: AppointmentRecord
    session: SessionRecord | null
    participant: ParticipantRecord | null
    appointmentUpdateCalls: Array<Record<string, unknown>>
    sessionUpsertCalls: Array<Record<string, unknown>>
    participantUpsertCalls: Array<Record<string, unknown>>
  } = {
    appointment: {
      id: 'appt-1',
      doctorId: 'doctor.user',
      status: 'PENDING',
      livekitRoomName: null,
      startedAt: null,
      deletedAt: null,
    },
    session: null,
    participant: null,
    appointmentUpdateCalls: [],
    sessionUpsertCalls: [],
    participantUpsertCalls: [],
  }

  let diagnosisEngineBehavior = async (input: Record<string, unknown>) => ({
    suggestions: [
      {
        rank: 1,
        llm_rank: 1,
        icd10_code: 'A09',
        diagnosis_name: 'Diare dan gastroenteritis',
        confidence: 0.88,
        reasoning: 'keluhan sesuai',
        key_reasons: ['demam', 'diare'],
        missing_information: [],
        red_flags: [],
        recommended_actions: ['hidrasi'],
        rag_verified: true,
        decision_status: 'recommended',
        decision_reason: 'Konsisten dengan KB lokal.',
        deterministic_score: 0.91,
        rank_source: 'hybrid',
      },
    ],
    red_flags: [],
    alerts: [],
    processing_time_ms: 5,
    source: 'ai',
    model_version: 'TEST-CDSS',
    validation_summary: {
      total_raw: 1,
      total_validated: 1,
      recommended_count: 1,
      review_count: 0,
      must_not_miss_count: 0,
      deferred_count: 0,
      requires_more_data: false,
      unverified_codes: [],
      warnings: [],
    },
    next_best_questions: [],
    _inputEcho: input,
  })

  const restoreModuleMocks = installModuleMocks({
    'server-only': {},
    '@/lib/prisma': {
      prisma: {
        cDSSAuditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            cdssAuditEntries.push({
              timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(),
              action: String(data.action),
              latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : 0,
              outputSummary: (data.outputSummary as Record<string, unknown>) ?? {},
              metadata: (data.metadata as Record<string, unknown> | undefined) ?? undefined,
              validationStatus: String(data.validationStatus ?? 'unknown'),
            })
            return data
          },
          findMany: async ({ where }: { where?: { timestamp?: { gte?: Date } } }) => {
            const since = where?.timestamp?.gte
            return cdssAuditEntries.filter(entry => !since || entry.timestamp >= since)
          },
        },
        cDSSOutcomeFeedback: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            cdssOutcomeEntries.push({
              selectedIcd: String(data.selectedIcd),
              finalIcd: String(data.finalIcd),
              overrideReason: typeof data.overrideReason === 'string' ? data.overrideReason : null,
              outcomeConfirmed:
                typeof data.outcomeConfirmed === 'boolean' ? data.outcomeConfirmed : null,
            })
            return data
          },
          findMany: async () => {
            return cdssOutcomeEntries
          },
        },
        telemedicineAppointment: {
          findUnique: async ({ where }: { where: { id: string } }) => {
            return where.id === dbState.appointment.id ? dbState.appointment : null
          },
          update: async ({ data }: { data: Record<string, unknown> }) => {
            dbState.appointmentUpdateCalls.push(data)
            dbState.appointment = {
              ...dbState.appointment,
              livekitRoomName:
                typeof data.livekitRoomName === 'string'
                  ? data.livekitRoomName
                  : dbState.appointment.livekitRoomName,
              status:
                typeof data.status === 'string'
                  ? (data.status as AppointmentRecord['status'])
                  : dbState.appointment.status,
              startedAt:
                data.startedAt instanceof Date ? data.startedAt : dbState.appointment.startedAt,
            }
            return dbState.appointment
          },
        },
        telemedicineSession: {
          upsert: async ({
            create,
            update,
          }: {
            create: Record<string, unknown>
            update: Record<string, unknown>
          }) => {
            dbState.sessionUpsertCalls.push({ create, update })
            dbState.session = {
              id: 'session-1',
              appointmentId: String(create.appointmentId),
              roomName: String(create.roomName),
              actualStartAt: create.actualStartAt instanceof Date ? create.actualStartAt : null,
            }
            return dbState.session
          },
        },
        telemedicineParticipant: {
          upsert: async ({
            create,
            update,
          }: {
            create: Record<string, unknown>
            update: Record<string, unknown>
          }) => {
            dbState.participantUpsertCalls.push({ create, update })
            dbState.participant = {
              sessionId: String(create.sessionId),
              userId: String(create.userId),
              role: String(create.role) as ParticipantRecord['role'],
              livekitIdentity: String(create.livekitIdentity),
              joinedAt: create.joinedAt instanceof Date ? create.joinedAt : null,
              leftAt: update.leftAt === null ? null : null,
            }
            return dbState.participant
          },
        },
      },
    },
    '@/lib/telemedicine/token': {
      isLiveKitConfigured: () => true,
      ensureLiveKitRoom: async (roomName: string) => {
        ensureLiveKitRoomCalls.push(roomName)
      },
      generateLiveKitToken: async (params: Record<string, unknown>) => {
        generateLiveKitTokenCalls.push(params)
        return 'lk-token-test'
      },
    },
    '@/lib/telemedicine/audit': {
      AUDIT_ACTIONS: {
        JOIN_ROOM: 'JOIN_ROOM',
        TOKEN_REQUEST_DENIED: 'TOKEN_REQUEST_DENIED',
      },
      createAuditLog: async (entry: TeleAuditEntry) => {
        teleAuditEntries.push(entry)
      },
    },
    '@/lib/server/security-audit': {
      getRequestIp: () => '127.0.0.1',
      writeSecurityAuditLog: async (entry: SecurityAuditEntry) => {
        securityAuditEntries.push(entry)
      },
    },
    '@/lib/cdss/workflow': {
      writeCDSSAuditEntry: async ({
        action,
        latencyMs = 0,
        outputSummary = {},
        metadata = {},
        validationStatus = 'unknown',
      }: {
        action: string
        latencyMs?: number
        outputSummary?: Record<string, unknown>
        metadata?: Record<string, unknown>
        validationStatus?: string
      }) => {
        cdssAuditEntries.push({
          timestamp: new Date(),
          action,
          latencyMs,
          outputSummary,
          metadata,
          validationStatus,
        })
      },
      writeCDSSOutcomeFeedbackEntry: async ({
        selectedIcd,
        finalIcd,
        overrideReason,
        outcomeConfirmed = null,
      }: {
        selectedIcd: string
        finalIcd: string
        overrideReason?: string
        outcomeConfirmed?: boolean | null
      }) => {
        cdssOutcomeEntries.push({
          selectedIcd,
          finalIcd,
          overrideReason: overrideReason ?? null,
          outcomeConfirmed: outcomeConfirmed ?? null,
        })
      },
      getCDSSQualityMetrics: async () => {
        const diagnoseRows = cdssAuditEntries.filter(entry => entry.action === 'DIAGNOSE_RESULT')
        const selectionRows = cdssAuditEntries.filter(
          entry => entry.action === 'SUGGESTION_SELECTED'
        )
        const totalRequests = diagnoseRows.length
        const mustNotMissSurfaced = diagnoseRows.reduce(
          (sum, entry) => sum + Number(entry.outputSummary.mustNotMissCount ?? 0),
          0
        )
        return {
          total_requests: totalRequests,
          total_displayed: diagnoseRows.reduce(
            (sum, entry) => sum + Number(entry.outputSummary.totalDisplayed ?? 0),
            0
          ),
          total_selected: selectionRows.length,
          selection_rate: totalRequests > 0 ? selectionRows.length / totalRequests : 0,
          red_flag_trigger_rate:
            totalRequests > 0
              ? diagnoseRows.filter(entry => Number(entry.outputSummary.redFlagCount ?? 0) > 0)
                  .length / totalRequests
              : 0,
          unverified_icd_avg_count:
            totalRequests > 0
              ? diagnoseRows.reduce(
                  (sum, entry) => sum + Number(entry.outputSummary.unverifiedCount ?? 0),
                  0
                ) / totalRequests
              : 0,
          latency_p95_ms:
            diagnoseRows.length > 0 ? Math.max(...diagnoseRows.map(entry => entry.latencyMs)) : 0,
          feedback_total: cdssOutcomeEntries.length,
          override_rate:
            cdssOutcomeEntries.length > 0
              ? cdssOutcomeEntries.filter(
                  entry => Boolean(entry.overrideReason) || entry.selectedIcd !== entry.finalIcd
                ).length / cdssOutcomeEntries.length
              : 0,
          concordance_rate:
            cdssOutcomeEntries.length > 0
              ? cdssOutcomeEntries.filter(entry => entry.selectedIcd === entry.finalIcd).length /
                cdssOutcomeEntries.length
              : 0,
          must_not_miss_surfaced_count: mustNotMissSurfaced,
        }
      },
    },
    '@/lib/cdss/engine': {
      runDiagnosisEngine: async (input: Record<string, unknown>) => {
        diagnosisEngineCalls.push(input)
        return await diagnosisEngineBehavior(input)
      },
    },
  })

  try {
    const authModule = await import('../src/lib/server/crew-access-auth')
    const doctorPasswordHash = await authModule.hashCrewAccessPassword('DoctorPass#202600')
    const nursePasswordHash = await authModule.hashCrewAccessPassword('NursePass#202600')
    const adminPasswordHash = await authModule.hashCrewAccessPassword('AdminPass#202600')

    process.env.CREW_ACCESS_USERS_JSON = JSON.stringify([
      {
        username: 'doctor.user',
        displayName: 'Doctor User',
        email: 'doctor@example.com',
        institution: 'Puskesmas Balowerti Kota Kediri',
        profession: 'Dokter',
        role: 'DOKTER',
        passwordHash: doctorPasswordHash,
      },
      {
        username: 'nurse.user',
        displayName: 'Nurse User',
        email: 'nurse@example.com',
        institution: 'Puskesmas Balowerti Kota Kediri',
        profession: 'Perawat',
        role: 'PERAWAT',
        passwordHash: nursePasswordHash,
      },
      {
        username: 'admin.user',
        displayName: 'Admin User',
        email: 'admin@example.com',
        institution: 'Puskesmas Balowerti Kota Kediri',
        profession: 'Perawat',
        role: 'ADMIN',
        passwordHash: adminPasswordHash,
      },
    ])

    const { parseDiagnoseRequestBody } = await import('../src/lib/cdss/diagnose-parser')
    const { generateNarrative } = await import('../src/lib/narrative-generator')
    const { suggestContextualVitals } = await import('../src/lib/ttv-inference')
    const { validateLLMSuggestions } = await import('../src/lib/cdss/validation')
    const { applyHybridDecisioning, mergeDiseaseCandidates } = await import(
      '../src/lib/cdss/hybrid'
    )
    const autocompleteRoute = await import('../src/app/api/cdss/autocomplete/route')
    const diagnoseRoute = await import('../src/app/api/cdss/diagnose/route')
    const { LEGACY_CDSS_RETIRED_MESSAGE, LEGACY_CDSS_RETIRED_REASON } = await import(
      '../src/lib/legacy-cdss-retirement'
    )
    const suggestionSelectedRoute = await import('../src/app/api/cdss/suggestion-selected/route')
    const outcomeFeedbackRoute = await import('../src/app/api/cdss/outcome-feedback/route')
    const redFlagAckRoute = await import('../src/app/api/cdss/red-flag-ack/route')
    const qualityDashboardRoute = await import('../src/app/api/cdss/quality-dashboard/route')
    const telemedicineTokenRoute = await import('../src/app/api/telemedicine/token/route')
    const realEngineModule = await import('../src/lib/cdss/engine')

    const { createCrewSession, getSessionCookieOptions } = authModule
    const cookieName = getSessionCookieOptions().name

    const doctorToken = createCrewSession({
      username: 'doctor.user',
      displayName: 'Doctor User',
      email: 'doctor@example.com',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Dokter',
      role: 'DOKTER',
    }).token

    const nurseToken = createCrewSession({
      username: 'nurse.user',
      displayName: 'Nurse User',
      email: 'nurse@example.com',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Perawat',
      role: 'PERAWAT',
    }).token

    const adminToken = createCrewSession({
      username: 'admin.user',
      displayName: 'Admin User',
      email: 'admin@example.com',
      institution: 'Puskesmas Balowerti Kota Kediri',
      profession: 'Perawat',
      role: 'ADMIN',
    }).token

    const { test, runAll, results } = createTestRunner()

    test('Legacy guard: suite test tidak lagi mengimpor modul CDSS lama atau endpoint yang dihapus', () => {
      const scriptsDir = path.join(process.cwd(), 'scripts')
      const scriptFiles = fs
        .readdirSync(scriptsDir)
        .filter(file => file.endsWith('.ts') || file.endsWith('.mjs'))
      for (const file of scriptFiles) {
        const content = fs.readFileSync(path.join(scriptsDir, file), 'utf-8')
        for (const pattern of forbiddenLegacyPatterns) {
          assert.equal(
            pattern.regex.test(content),
            false,
            `${file} masih memuat referensi legacy: ${pattern.label}`
          )
        }
      }
    })

    test('Parser CDSS: input valid menghasilkan payload engine yang konsisten', () => {
      const parsed = parseDiagnoseRequestBody({
        keluhan_utama: 'demam tinggi',
        keluhan_tambahan: 'batuk 3 hari',
        usia: 32,
        jenis_kelamin: 'P',
        allergies: ['penicillin'],
        chronic_diseases: ['asma'],
        is_pregnant: false,
        session_id: 'session-123',
      })

      assert.equal(parsed.ok, true)
      if (parsed.ok) {
        assert.equal(parsed.input.keluhan_utama, 'demam tinggi')
        assert.equal(parsed.input.keluhan_tambahan, 'batuk 3 hari')
        assert.equal(parsed.input.usia, 32)
        assert.equal(parsed.input.jenis_kelamin, 'P')
        assert.deepEqual(parsed.input.allergies, ['penicillin'])
        assert.deepEqual(parsed.input.chronic_diseases, ['asma'])
        assert.equal(parsed.input.is_pregnant, false)
        assert.equal(parsed.input.session_id, 'session-123')
      }
    })

    test('Parser CDSS: input malformed berhenti sebelum memanggil engine atau audit', async () => {
      diagnosisEngineCalls.length = 0
      securityAuditEntries.length = 0

      const parsed = parseDiagnoseRequestBody({
        keluhan_utama: 'demam',
        usia: 30,
        jenis_kelamin: 'L',
        is_pregnant: true,
      })

      assert.equal(parsed.ok, false)
      if (!parsed.ok) {
        assert.match(parsed.error, /is_pregnant/i)
      }

      const response = await diagnoseRoute.POST(
        new Request('http://localhost/api/cdss/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            keluhan_utama: 'demam',
            usia: 30,
            jenis_kelamin: 'L',
            is_pregnant: true,
          }),
        })
      )

      assert.equal(response.status, 400)
      assert.equal(diagnosisEngineCalls.length, 0)
      assert.equal(securityAuditEntries.length, 0)
    })

    test('Auth CDSS diagnose: automation token saja ditolak dan dicatat sebagai unauthenticated', async () => {
      diagnosisEngineCalls.length = 0
      securityAuditEntries.length = 0

      const response = await diagnoseRoute.POST(
        new Request('http://localhost/api/cdss/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-crew-access-token': 'test-automation-token',
          },
          body: JSON.stringify({
            keluhan_utama: 'demam',
            usia: 30,
            jenis_kelamin: 'L',
            session_id: 'automation-only',
          }),
        })
      )

      const payload = (await response.json()) as { error?: string }
      assert.equal(response.status, 401)
      assert.equal(payload.error, 'Unauthorized')
      assert.equal(diagnosisEngineCalls.length, 0)
      assert.equal(securityAuditEntries.length, 1)
      assert.equal(securityAuditEntries[0]?.result, 'unauthenticated')
      assert.equal(securityAuditEntries[0]?.metadata?.authorizationMode, 'automation-token')
    })

    test('Auth CDSS diagnose: role non-klinis ditolak dengan 403 dan audit forbidden', async () => {
      diagnosisEngineCalls.length = 0
      securityAuditEntries.length = 0

      const response = await diagnoseRoute.POST(
        new Request('http://localhost/api/cdss/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${adminToken}`,
          },
          body: JSON.stringify({
            keluhan_utama: 'demam',
            usia: 30,
            jenis_kelamin: 'L',
            session_id: 'admin-denied',
          }),
        })
      )

      const payload = (await response.json()) as { error?: string }
      assert.equal(response.status, 403)
      assert.equal(payload.error, 'Akses ditolak')
      assert.equal(diagnosisEngineCalls.length, 0)
      assert.equal(securityAuditEntries.length, 1)
      assert.equal(securityAuditEntries[0]?.result, 'forbidden')
      assert.equal(securityAuditEntries[0]?.role, 'ADMIN')
      assert.equal(securityAuditEntries[0]?.userId, 'admin.user')
    })

    const postDiagnoseAs = (role: string, profession: string) =>
      diagnoseRoute.POST(
        new Request('http://localhost/api/cdss/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${
              createCrewSession({
                username: `${role.toLowerCase()}.user`,
                displayName: `${role} User`,
                email: `${role.toLowerCase()}@example.com`,
                institution: 'Puskesmas Balowerti Kota Kediri',
                profession,
                role,
              }).token
            }`,
          },
          body: JSON.stringify({
            keluhan_utama: 'demam',
            usia: 30,
            jenis_kelamin: 'L',
            session_id: `access-${role}`,
          }),
        })
      )

    test('Auth CDSS diagnose: role non-klinis dengan profesi klinis tetap ditolak 403', async () => {
      for (const role of ['ADMIN', 'CEO', 'ADMINISTRATOR']) {
        for (const profession of ['Dokter', 'Perawat', 'Bidan', 'Apoteker']) {
          diagnosisEngineCalls.length = 0
          securityAuditEntries.length = 0

          const response = await postDiagnoseAs(role, profession)

          assert.equal(response.status, 403, `${role} + ${profession}`)
          assert.equal(diagnosisEngineCalls.length, 0, `${role} + ${profession}`)
          assert.equal(securityAuditEntries[0]?.result, 'forbidden', `${role} + ${profession}`)
        }
      }
    })

    test('Auth CDSS diagnose: role DOKTER_GIGI dan TRIAGE_OFFICER tetap diizinkan', async () => {
      for (const [role, profession] of [
        ['DOKTER_GIGI', 'Dokter Gigi'],
        ['TRIAGE_OFFICER', 'Triage Officer'],
      ]) {
        diagnosisEngineCalls.length = 0

        const response = await postDiagnoseAs(role, profession)

        assert.equal(response.status, 200, role)
        assert.equal(diagnosisEngineCalls.length, 1, role)
      }
    })

    const withLegacyEngine = async (enabled: boolean, run: () => Promise<void>) => {
      process.env.LEGACY_CDSS_ENGINE_ENABLED = enabled ? 'true' : 'false'
      try {
        await run()
      } finally {
        process.env.LEGACY_CDSS_ENGINE_ENABLED = 'true'
      }
    }

    test('Retired CDSS diagnose: engine mati secara default, dokter mendapat 503 tanpa engine berjalan', async () => {
      await withLegacyEngine(false, async () => {
        diagnosisEngineCalls.length = 0
        securityAuditEntries.length = 0

        const response = await postDiagnoseAs('DOKTER', 'Dokter')

        assert.equal(response.status, 503)
        assert.deepEqual(await response.json(), {
          error: LEGACY_CDSS_RETIRED_MESSAGE,
          retired: true,
        })
        assert.equal(diagnosisEngineCalls.length, 0)
        assert.equal(securityAuditEntries[0]?.result, 'failure')
        assert.equal(securityAuditEntries[0]?.metadata?.reason, LEGACY_CDSS_RETIRED_REASON)
      })
    })

    test('Retired CDSS diagnose: GET memberi tahu halaman EMR apakah engine aktif', async () => {
      const statusRequest = () =>
        diagnoseRoute.GET(
          new Request('http://localhost/api/cdss/diagnose', {
            headers: {
              cookie: `${cookieName}=${
                createCrewSession({
                  username: 'dokter.status',
                  displayName: 'Dokter Status',
                  email: 'dokter.status@example.com',
                  institution: 'Puskesmas Balowerti Kota Kediri',
                  profession: 'Dokter',
                  role: 'DOKTER',
                }).token
              }`,
            },
          })
        )

      await withLegacyEngine(false, async () => {
        const response = await statusRequest()
        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          enabled: false,
          message: LEGACY_CDSS_RETIRED_MESSAGE,
        })
      })
      await withLegacyEngine(true, async () => {
        assert.deepEqual(await (await statusRequest()).json(), { enabled: true, message: null })
      })

      const anonymous = await diagnoseRoute.GET(new Request('http://localhost/api/cdss/diagnose'))
      assert.equal(anonymous.status, 401)
    })

    test('Synthesia narrative: input dengan spasi tersembunyi tetap tersanitasi dan stabil', () => {
      const narrative = generateNarrative('nyeri\u00A0pinggang  kanan\u200B')

      assert.equal(narrative.entities.keluhan_utama, 'nyeri pinggang kanan')
      assert.match(narrative.keluhan_utama, /nyeri pinggang kanan/i)
      assert.equal(narrative.lama_sakit, 'beberapa waktu terakhir')
    })

    test('TTV assist: poli umum dewasa mendapat default GCS dan SpO2 saat keluhan non-respirasi', () => {
      const advice = suggestContextualVitals('demam dan nyeri pinggang', {
        ageYears: 35,
        sex: 'P',
        recentActivity: 'resting',
        stressState: 'pain',
        measured: {},
      })

      assert.ok(typeof advice.values.pulse === 'number')
      assert.ok(typeof advice.values.rr === 'number')
      assert.ok(typeof advice.values.temp === 'number')
      assert.equal(advice.metadata.pulse?.source, 'inferred')
      assert.equal(advice.metadata.rr?.source, 'inferred')
      assert.equal(advice.metadata.temp?.source, 'inferred')
      assert.equal(advice.defaults.gcs, 15)
      assert.equal(advice.defaults.spo2, 98)
      assert.deepEqual(advice.manualMeasurementRequired, ['sbp', 'dbp', 'map'])
    })

    test('TTV assist: keluhan sesak mempertahankan SpO2 sebagai manual-required', () => {
      const advice = suggestContextualVitals('sesak sejak tadi malam', {
        ageYears: 42,
        sex: 'L',
        recentActivity: 'resting',
        stressState: 'calm',
      })

      assert.equal(advice.defaults.gcs, 15)
      assert.equal(advice.defaults.spo2, undefined)
      assert.deepEqual(advice.manualMeasurementRequired, ['sbp', 'dbp', 'map', 'spo2'])
    })

    test('TTV assist: context modifier membuat hasil stabil dan lebih tinggi setelah aktivitas', () => {
      const resting = suggestContextualVitals('sesak', {
        ageYears: 30,
        sex: 'L',
        recentActivity: 'resting',
        stressState: 'calm',
      })
      const postExertion = suggestContextualVitals('sesak', {
        ageYears: 30,
        sex: 'L',
        recentActivity: 'post_exertion',
        stressState: 'calm',
      })

      assert.ok((postExertion.values.pulse ?? 0) > (resting.values.pulse ?? 0))
      assert.ok((postExertion.values.rr ?? 0) >= (resting.values.rr ?? 0))
    })

    test('TTV assist: tipe nyeri yang berbeda menghasilkan estimasi nadi yang berbeda', () => {
      const muskuloskeletal = suggestContextualVitals('nyeri pinggang', {
        ageYears: 34,
        sex: 'L',
        recentActivity: 'resting',
        stressState: 'calm',
      })
      const kolik = suggestContextualVitals('nyeri kolik pinggang menjalar ke lipat paha', {
        ageYears: 34,
        sex: 'L',
        recentActivity: 'resting',
        stressState: 'calm',
      })
      const nyeriDada = suggestContextualVitals('nyeri dada akut', {
        ageYears: 34,
        sex: 'L',
        recentActivity: 'resting',
        stressState: 'calm',
      })

      assert.ok((muskuloskeletal.values.pulse ?? 0) < (kolik.values.pulse ?? 0))
      assert.ok((muskuloskeletal.values.pulse ?? 0) <= (nyeriDada.values.pulse ?? 0))
      assert.match(muskuloskeletal.metadata.pulse?.reasoning ?? '', /muskuloskeletal/i)
      assert.match(kolik.metadata.pulse?.reasoning ?? '', /kolik|viseral/i)
    })

    test('Fallback CDSS: tanpa provider AI route tidak crash dan engine mengembalikan safe fallback', async () => {
      const previousDeepSeekKey = process.env.DEEPSEEK_API_KEY
      delete process.env.DEEPSEEK_API_KEY

      try {
        const result = await realEngineModule.runDiagnosisEngine({
          keluhan_utama: 'demam tinggi',
          usia: 41,
          jenis_kelamin: 'L',
          session_id: 'fallback-test',
        })

        assert.equal(result.source, 'error')
        assert.deepEqual(result.suggestions, [])
      assert.ok(result.validation_summary.warnings.length > 0)
      } finally {
        if (previousDeepSeekKey !== undefined) process.env.DEEPSEEK_API_KEY = previousDeepSeekKey
      }
    })

    test('Validasi CDSS: ICD yang ada di KB dan nama canonical lolos dengan rag_verified=true', () => {
      const validation = validateLLMSuggestions(
        {
          keluhan_utama: 'nyeri perut bawah',
          usia: 28,
          jenis_kelamin: 'P',
          is_pregnant: true,
        },
        [
          {
            rank: 1,
            icd10_code: 'O00.1',
            diagnosis_name: 'Kehamilan Ektopik Terganggu',
            confidence: 0.82,
            reasoning: 'sesuai gejala',
            key_reasons: ['nyeri perut bawah', 'perdarahan'],
            missing_information: [],
            red_flags: [],
            recommended_actions: ['rujuk'],
          },
        ]
      )

      assert.equal(validation.total_raw, 1)
      assert.equal(validation.total_validated, 1)
      assert.equal(validation.unverified_codes.length, 0)
      assert.equal(validation.suggestions[0]?.rag_verified, true)
      assert.equal(validation.suggestions[0]?.diagnosis_name, 'Kehamilan Ektopik Terganggu (KET)')
    })

    test('Validasi CDSS: mismatch nama dan konteks demografis ditandai unverified', () => {
      const validation = validateLLMSuggestions(
        {
          keluhan_utama: 'nyeri perut bawah',
          usia: 30,
          jenis_kelamin: 'L',
          is_pregnant: false,
        },
        [
          {
            rank: 1,
            icd10_code: 'O00.1',
            diagnosis_name: 'Apendisitis akut',
            confidence: 0.51,
            reasoning: 'uji mismatch',
            key_reasons: ['nyeri perut bawah'],
            missing_information: [],
            red_flags: [],
            recommended_actions: [],
          },
        ]
      )

      assert.equal(validation.total_validated, 0)
      assert.equal(validation.suggestions[0]?.rag_verified, false)
      assert.equal(validation.suggestions[0]?.diagnosis_name, 'Kehamilan Ektopik Terganggu (KET)')
      assert.ok(validation.warnings.some(warning => warning.includes('tidak cocok dengan nama KB')))
      assert.ok(
        validation.warnings.some(warning => warning.includes('memerlukan konteks kehamilan'))
      )
    })

    test('Validasi CDSS: kode tidak dikenal dan diagnosis anak pada dewasa tercatat di validation_summary', () => {
      const unknownCode = validateLLMSuggestions(
        {
          keluhan_utama: 'demam',
          usia: 45,
          jenis_kelamin: 'L',
        },
        [
          {
            rank: 1,
            icd10_code: 'X99',
            diagnosis_name: 'Diagnosis fiktif',
            confidence: 0.2,
            reasoning: 'uji kode',
            key_reasons: [],
            missing_information: [],
            red_flags: [],
            recommended_actions: [],
          },
        ]
      )

      assert.deepEqual(unknownCode.unverified_codes, ['X99'])
      assert.equal(unknownCode.total_validated, 0)
      assert.ok(unknownCode.warnings.some(warning => warning.includes('ICD X99 tidak ditemukan')))

      const ageMismatch = validateLLMSuggestions(
        {
          keluhan_utama: 'kejang',
          usia: 34,
          jenis_kelamin: 'L',
        },
        [
          {
            rank: 1,
            icd10_code: 'R56',
            diagnosis_name: 'Kejang demam',
            confidence: 0.41,
            reasoning: 'uji usia',
            key_reasons: ['demam', 'kejang'],
            missing_information: [],
            red_flags: [],
            recommended_actions: [],
          },
        ]
      )

      assert.equal(ageMismatch.total_validated, 0)
      assert.equal(ageMismatch.suggestions[0]?.rag_verified, false)
      assert.ok(
        ageMismatch.warnings.some(warning =>
          warning.includes('Kejang demam biasanya pada anak kecil')
        )
      )
    })

    test('Hybrid CDSS: duplicate ICD tetap terpisah, must-not-miss dipisah lane, dan next-best-questions tersedia', () => {
      const mergedCandidates = mergeDiseaseCandidates(
        [
          {
            id: 'a09-1',
            icd10: 'A09',
            nama: 'Diare dan gastroenteritis',
            definisi: 'Diare akut pada dewasa',
            gejala: ['diare', 'mual', 'muntah'],
            pemeriksaan_fisik: [],
            red_flags: [],
            terpi: [],
            kriteria_rujukan: '',
            diagnosis_banding: [],
            score: 18,
          },
          {
            id: 'a09-2',
            icd10: 'A09',
            nama: 'Gastroenteritis akut',
            definisi: 'Gastroenteritis dengan dehidrasi',
            gejala: ['diare', 'dehidrasi'],
            pemeriksaan_fisik: [],
            red_flags: ['tanda dehidrasi berat'],
            terpi: [],
            kriteria_rujukan: '',
            diagnosis_banding: [],
            score: 16,
          },
        ],
        [],
        10
      )

      assert.equal(mergedCandidates.length, 2)

      const validation = validateLLMSuggestions(
        {
          keluhan_utama: 'diare muntah',
          usia: 35,
          jenis_kelamin: 'L',
        },
        [
          {
            rank: 1,
            llm_rank: 1,
            icd10_code: 'A09',
            diagnosis_name: 'Diare dan gastroenteritis',
            confidence: 0.84,
            reasoning: 'sesuai keluhan diare muntah',
            key_reasons: ['diare akut', 'muntah'],
            missing_information: ['berapa frekuensi BAB cair per hari'],
            red_flags: [],
            recommended_actions: ['hidrasi oral'],
            decision_status: 'review',
            decision_reason: '',
            deterministic_score: 0,
            rank_source: 'llm',
          },
          {
            rank: 2,
            llm_rank: 2,
            icd10_code: 'A09',
            diagnosis_name: 'Gastroenteritis akut',
            confidence: 0.62,
            reasoning: 'risiko dehidrasi perlu dinilai',
            key_reasons: ['diare', 'dehidrasi'],
            missing_information: ['adakah tanda dehidrasi berat'],
            red_flags: ['curiga dehidrasi berat'],
            recommended_actions: ['rujuk bila ada syok'],
            decision_status: 'review',
            decision_reason: '',
            deterministic_score: 0,
            rank_source: 'llm',
          },
        ]
      )

      const hybrid = applyHybridDecisioning(
        {
          keluhan_utama: 'diare muntah',
          usia: 35,
          jenis_kelamin: 'L',
        },
        validation,
        mergedCandidates
      )

      assert.ok(
        hybrid.suggestions.some(
          suggestion =>
            suggestion.decision_status === 'recommended' || suggestion.decision_status === 'review'
        )
      )
      assert.ok(
        hybrid.suggestions.some(suggestion => suggestion.decision_status === 'must_not_miss')
      )
      assert.ok(hybrid.nextBestQuestions.length > 0)
    })

    test('Hybrid CDSS: red flag KB tidak otomatis menjadikan semua nyeri pinggang sebagai must-not-miss', () => {
      const mergedCandidates = mergeDiseaseCandidates(
        [
          {
            id: 'm79-1',
            icd10: 'M79.1',
            nama: 'Mialgia',
            definisi: 'Nyeri otot pinggang yang membaik dengan istirahat.',
            gejala: ['nyeri pinggang', 'nyeri otot', 'membaik dengan istirahat'],
            pemeriksaan_fisik: [],
            red_flags: [
              'Kelemahan otot progresif',
              'Urine berwarna gelap',
              'Demam tinggi disertai nyeri otot berat',
            ],
            terpi: [],
            kriteria_rujukan: '',
            diagnosis_banding: [],
            score: 18,
          },
          {
            id: 'n39-1',
            icd10: 'N39',
            nama: 'Infeksi saluran kemih',
            definisi: 'Nyeri pinggang dengan gejala saluran kemih.',
            gejala: ['nyeri pinggang', 'anyang-anyangan', 'nyeri suprapubik'],
            pemeriksaan_fisik: [],
            red_flags: ['Sepsis', 'Gagal ginjal'],
            terpi: [],
            kriteria_rujukan: '',
            diagnosis_banding: [],
            score: 12,
          },
        ],
        [],
        10
      )

      const validation = validateLLMSuggestions(
        {
          keluhan_utama: 'nyeri pinggang',
          keluhan_tambahan: 'RPS: nyeri pinggang membaik dengan istirahat',
          usia: 35,
          jenis_kelamin: 'L',
        },
        [
          {
            rank: 1,
            llm_rank: 1,
            icd10_code: 'M79.1',
            diagnosis_name: 'Mialgia',
            confidence: 0.7,
            reasoning: 'sesuai nyeri pinggang muskuloskeletal',
            key_reasons: ['nyeri pinggang', 'membaik dengan istirahat'],
            missing_information: ['riwayat aktivitas fisik', 'apakah ada cedera'],
            red_flags: [],
            recommended_actions: ['pemeriksaan fisik muskuloskeletal'],
            decision_status: 'review',
            decision_reason: '',
            deterministic_score: 0,
            rank_source: 'llm',
          },
          {
            rank: 2,
            llm_rank: 2,
            icd10_code: 'N39',
            diagnosis_name: 'Infeksi saluran kemih',
            confidence: 0.3,
            reasoning: 'masih mungkin bila ada gejala saluran kemih',
            key_reasons: ['nyeri pinggang'],
            missing_information: ['adakah anyang-anyangan', 'adakah demam'],
            red_flags: [],
            recommended_actions: ['tanyakan gejala BAK'],
            decision_status: 'review',
            decision_reason: '',
            deterministic_score: 0,
            rank_source: 'llm',
          },
        ]
      )

      const hybrid = applyHybridDecisioning(
        {
          keluhan_utama: 'nyeri pinggang',
          keluhan_tambahan: 'RPS: nyeri pinggang membaik dengan istirahat',
          usia: 35,
          jenis_kelamin: 'L',
        },
        validation,
        mergedCandidates
      )

      assert.ok(
        hybrid.suggestions.some(
          suggestion =>
            suggestion.decision_status === 'recommended' || suggestion.decision_status === 'review'
        )
      )
      assert.equal(
        hybrid.suggestions.every(suggestion => suggestion.decision_status === 'must_not_miss'),
        false
      )
    })

    test('Autocomplete klinis: nyeri pinggang dipetakan ke chain nyeri pinggang, bukan tenggorokan atau punggung umum', async () => {
      const response = await autocompleteRoute.POST(
        new Request('http://localhost/api/cdss/autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            query: 'nyeri pinggang',
          }),
        })
      )

      const payload = (await response.json()) as {
        source: 'local' | 'llm'
        chain: {
          clinical_entity: string
          pemeriksaan: {
            fisik: string[]
            lab: string[]
            penunjang: string[]
          }
        }
      }

      assert.equal(response.status, 200)
      assert.equal(payload.source, 'local')
      assert.equal(payload.chain.clinical_entity, 'Nyeri Pinggang')
      assert.ok(payload.chain.pemeriksaan.fisik.includes('CVA Test'))
      assert.equal(payload.chain.pemeriksaan.fisik.includes('Inspeksi Faring'), false)
      assert.equal(payload.chain.pemeriksaan.fisik.includes('Palpasi Vertebra'), false)
    })

    test('Autocomplete klinis: query pinggang yang lebih spesifik tetap mengarah ke nyeri pinggang', async () => {
      const response = await autocompleteRoute.POST(
        new Request('http://localhost/api/cdss/autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            query: 'nyeri pinggang kanan',
          }),
        })
      )

      const payload = (await response.json()) as {
        chain: {
          clinical_entity: string
        }
      }

      assert.equal(response.status, 200)
      assert.equal(payload.chain.clinical_entity, 'Nyeri Pinggang')
    })

    test('Autocomplete klinis: nyeri punggung tetap mengarah ke chain punggung', async () => {
      const response = await autocompleteRoute.POST(
        new Request('http://localhost/api/cdss/autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            query: 'nyeri punggung',
          }),
        })
      )

      const payload = (await response.json()) as {
        chain: {
          clinical_entity: string
        }
      }

      assert.equal(response.status, 200)
      assert.equal(payload.chain.clinical_entity, 'Nyeri Punggung')
    })

    test('Fallback/error route: ketika engine melempar error, response aman dan audit tercatat', async () => {
      diagnosisEngineCalls.length = 0
      securityAuditEntries.length = 0
      cdssAuditEntries.length = 0
      diagnosisEngineBehavior = async () => {
        throw new Error('DeepSeek timeout')
      }

      const response = await diagnoseRoute.POST(
        new Request('http://localhost/api/cdss/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            keluhan_utama: 'batuk pilek',
            usia: 35,
            jenis_kelamin: 'L',
            session_id: 'route-failure',
          }),
        })
      )

      const payload = (await response.json()) as { error?: string }
      assert.equal(response.status, 500)
      assert.equal(payload.error, 'Internal server error')
      assert.equal(diagnosisEngineCalls.length, 1)
      assert.equal(securityAuditEntries.length, 1)
      assert.equal(cdssAuditEntries.length, 0)
      assert.equal(securityAuditEntries[0]?.result, 'failure')
      assert.equal(typeof securityAuditEntries[0]?.metadata?.error, 'string')

      diagnosisEngineBehavior = async (input: Record<string, unknown>) => ({
        suggestions: [
          {
            rank: 1,
            llm_rank: 1,
            icd10_code: 'A09',
            diagnosis_name: 'Diare dan gastroenteritis',
            confidence: 0.88,
            reasoning: 'keluhan sesuai',
            key_reasons: ['demam', 'diare'],
            missing_information: [],
            red_flags: [],
            recommended_actions: ['hidrasi'],
            rag_verified: true,
            decision_status: 'recommended',
            decision_reason: 'Konsisten dengan KB lokal.',
            deterministic_score: 0.91,
            rank_source: 'hybrid',
          },
        ],
        red_flags: [],
        alerts: [],
        processing_time_ms: 5,
        source: 'ai',
        model_version: 'TEST-CDSS',
        validation_summary: {
          total_raw: 1,
          total_validated: 1,
          recommended_count: 1,
          review_count: 0,
          must_not_miss_count: 0,
          deferred_count: 0,
          requires_more_data: false,
          unverified_codes: [],
          warnings: [],
        },
        next_best_questions: [],
        _inputEcho: input,
      })
    })

    test('Workflow CDSS: selection review butuh alasan, ack red flag tersimpan, dan outcome feedback tercatat', async () => {
      cdssAuditEntries.length = 0
      cdssOutcomeEntries.length = 0

      const missingReasonResponse = await suggestionSelectedRoute.POST(
        new Request('http://localhost/api/cdss/suggestion-selected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            session_id: 'hybrid-session-1',
            selected_icd: 'A09',
            diagnosis_name: 'Diare dan gastroenteritis',
            decision_status: 'review',
            selection_intent: 'review_selection',
          }),
        })
      )

      assert.equal(missingReasonResponse.status, 400)

      const selectionResponse = await suggestionSelectedRoute.POST(
        new Request('http://localhost/api/cdss/suggestion-selected', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            session_id: 'hybrid-session-1',
            selected_icd: 'A09',
            selected_confidence: 0.78,
            diagnosis_name: 'Diare dan gastroenteritis',
            rank: 2,
            decision_status: 'review',
            decision_reason: 'Data klinis masih parsial',
            selection_intent: 'review_selection',
            review_reason: 'Pasien stabil dan keluhan paling mendekati A09',
          }),
        })
      )

      assert.equal(selectionResponse.status, 200)
      assert.equal(
        cdssAuditEntries.some(entry => entry.action === 'SUGGESTION_SELECTED'),
        true
      )

      const ackResponse = await redFlagAckRoute.POST(
        new Request('http://localhost/api/cdss/red-flag-ack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            session_id: 'hybrid-session-1',
            red_flags: ['Hipoksia Berat'],
          }),
        })
      )

      assert.equal(ackResponse.status, 200)
      assert.equal(
        cdssAuditEntries.some(entry => entry.action === 'RED_FLAG_ACK'),
        true
      )

      const feedbackResponse = await outcomeFeedbackRoute.POST(
        new Request('http://localhost/api/cdss/outcome-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            session_id: 'hybrid-session-1',
            selected_icd: 'A09',
            selected_confidence: 0.78,
            final_icd: 'A09',
            outcome_confirmed: true,
            override_reason: 'Tetap sesuai setelah evaluasi ulang',
          }),
        })
      )

      assert.equal(feedbackResponse.status, 200)
      assert.equal(cdssOutcomeEntries.length, 1)
      assert.equal(cdssOutcomeEntries[0]?.finalIcd, 'A09')
    })

    test('Workflow CDSS: quality dashboard merangkum diagnose hybrid dan must-not-miss metrics', async () => {
      cdssAuditEntries.length = 0
      cdssOutcomeEntries.length = 0
      securityAuditEntries.length = 0
      diagnosisEngineCalls.length = 0

      const diagnoseResponse = await diagnoseRoute.POST(
        new Request('http://localhost/api/cdss/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            keluhan_utama: 'diare muntah',
            usia: 35,
            jenis_kelamin: 'L',
            session_id: 'hybrid-session-2',
          }),
        })
      )

      assert.equal(diagnoseResponse.status, 200)
      assert.equal(
        cdssAuditEntries.some(entry => entry.action === 'DIAGNOSE_RESULT'),
        true
      )

      cdssAuditEntries.push({
        timestamp: new Date(),
        action: 'DIAGNOSE_RESULT',
        latencyMs: 9,
        validationStatus: 'completed',
        outputSummary: {
          totalDisplayed: 2,
          redFlagCount: 1,
          unverifiedCount: 0,
          recommendedCount: 1,
          reviewCount: 0,
          mustNotMissCount: 1,
          deferredCount: 0,
        },
        metadata: {},
      })

      const metricsResponse = await qualityDashboardRoute.GET(
        new Request('http://localhost/api/cdss/quality-dashboard?days=14', {
          method: 'GET',
          headers: {
            cookie: `${cookieName}=${doctorToken}`,
          },
        })
      )

      const payload = (await metricsResponse.json()) as {
        metrics: {
          total_requests: number
          must_not_miss_surfaced_count: number
        }
      }

      assert.equal(metricsResponse.status, 200)
      assert.equal(payload.metrics.total_requests >= 1, true)
      assert.equal(payload.metrics.must_not_miss_surfaced_count >= 1, true)
    })

    test('Auth telemedicine token: HMAC invalid menghasilkan 401 tanpa perubahan DB', async () => {
      teleAuditEntries.length = 0
      dbState.appointmentUpdateCalls.length = 0
      dbState.sessionUpsertCalls.length = 0
      dbState.participantUpsertCalls.length = 0

      const invalidToken = `${doctorToken}tampered`
      const response = await telemedicineTokenRoute.POST(
        new Request('http://localhost/api/telemedicine/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${invalidToken}`,
          },
          body: JSON.stringify({
            appointmentId: 'appt-1',
            participantRole: 'DOCTOR',
          }),
        })
      )

      assert.equal(response.status, 401)
      assert.equal(dbState.appointmentUpdateCalls.length, 0)
      assert.equal(dbState.sessionUpsertCalls.length, 0)
      assert.equal(dbState.participantUpsertCalls.length, 0)
      assert.equal(teleAuditEntries.length, 0)
    })

    test('Auth telemedicine token: role tidak berwenang menghasilkan 403 dan audit deny', async () => {
      teleAuditEntries.length = 0

      const response = await telemedicineTokenRoute.POST(
        new Request('http://localhost/api/telemedicine/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${nurseToken}`,
          },
          body: JSON.stringify({
            appointmentId: 'appt-1',
            participantRole: 'DOCTOR',
          }),
        })
      )

      const payload = (await response.json()) as { message?: string }
      assert.equal(response.status, 403)
      assert.equal(payload.message, 'Akses ditolak')
      assert.equal(teleAuditEntries.length, 1)
      assert.equal(teleAuditEntries[0]?.action, 'TOKEN_REQUEST_DENIED')
    })

    test('Response telemedicine token: role berwenang menghasilkan 200, schema valid, dan side-effect Prisma lengkap', async () => {
      teleAuditEntries.length = 0
      ensureLiveKitRoomCalls.length = 0
      generateLiveKitTokenCalls.length = 0
      dbState.appointment = {
        id: 'appt-1',
        doctorId: 'doctor.user',
        status: 'PENDING',
        livekitRoomName: null,
        startedAt: null,
        deletedAt: null,
      }
      dbState.session = null
      dbState.participant = null
      dbState.appointmentUpdateCalls.length = 0
      dbState.sessionUpsertCalls.length = 0
      dbState.participantUpsertCalls.length = 0

      const response = await telemedicineTokenRoute.POST(
        new Request('http://localhost/api/telemedicine/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${cookieName}=${doctorToken}`,
          },
          body: JSON.stringify({
            appointmentId: 'appt-1',
            participantRole: 'DOCTOR',
          }),
        })
      )

      const payload = (await response.json()) as {
        success: boolean
        data: {
          token: string
          roomName: string
          serverUrl: string
          participantIdentity: string
          expiresAt: string
        } | null
      }

      assert.equal(response.status, 200)
      assert.equal(payload.success, true)
      assert.ok(payload.data)
      assert.equal(payload.data?.token, 'lk-token-test')
      assert.equal(typeof payload.data?.roomName, 'string')
      assert.equal(typeof payload.data?.participantIdentity, 'string')
      assert.equal(typeof payload.data?.expiresAt, 'string')

      assert.equal(ensureLiveKitRoomCalls.length, 1)
      assert.equal(generateLiveKitTokenCalls.length, 1)
      assert.equal(dbState.sessionUpsertCalls.length, 1)
      assert.equal(dbState.participantUpsertCalls.length, 1)
      assert.equal(dbState.appointmentUpdateCalls.length >= 1, true)
      assert.equal(dbState.appointment.status, 'IN_PROGRESS')
      assert.equal(dbState.participant?.userId, 'doctor.user')
      assert.equal(dbState.participant?.role, 'DOCTOR')
      assert.equal(
        teleAuditEntries.some(entry => entry.action === 'JOIN_ROOM'),
        true
      )
    })

    await runAll()
    await writeTestReport('test-cdss-report.txt', 'Safety Net Test Report', results)

    if (results.some(result => result.status === 'FAIL')) {
      process.exitCode = 1
    }
  } finally {
    restoreModuleMocks()
  }
}

void main()
