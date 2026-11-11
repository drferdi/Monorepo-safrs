import { checkEklaimReadiness, runFullComplianceCheck } from '@abyss/guardrails'
import type {
  ClinicalAlert,
  DashboardComplianceIssue,
  DashboardEncounterStatus,
  DashboardEncounterSummary,
  DashboardOperationalMetrics,
  Diagnosis,
  Encounter,
  IskandarSuggestion,
  Prescription,
  Referral,
} from '@abyss/types'

export interface TemporaryEncounterRecord {
  id: string
  patientId: string
  doctorId: string
  scheduledAt: string
  startedAt: string | null
  endedAt: string | null
  updatedAt: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  keluhanUtama: string | null
  riwayatPenyakit: string | null
  anamnesis: string | null
  pemeriksaan: string | null
  diagnosis: string | null
  diagnosaICD10: string | null
  resepDigital: unknown | null
  rujukan: boolean
  rujukanTujuan: string | null
}

interface TemporaryConsultRecord {
  consultId: string
  patientRm: string | null
  targetDoctorId: string | null
  createdAt: Date
  updatedAt: Date
  sentAt: Date | null
  acceptedAt: Date | null
  transferredAt: Date | null
  completedAt: Date | null
  status: string
  keluhanUtama: string | null
}

interface BuildEncounterSummaryInput {
  encounter: TemporaryEncounterRecord
  suggestions: IskandarSuggestion[]
  alerts: ClinicalAlert[]
}

type ComplianceCheck = ReturnType<typeof checkEklaimReadiness>[number]

interface BuildMetricsInput {
  encounterSummaries: DashboardEncounterSummary[]
  cdssUsageCount: number
  overrideCount: number
  averageConfidenceScore: number
  generatedAt: string
  shiftLabel?: string
}

interface ListEncounterSummaryOptions {
  limit?: number
  status?: string | null
}

interface OverrideInput {
  encounterId: string
  action: 'accept' | 'modify' | 'reject'
  selectedIcd?: string
  finalIcd?: string
  selectedConfidence?: number
  outcomeConfirmed?: boolean | null
  followUpNote?: string
  overrideReason?: string
  metadata?: Record<string, unknown>
  actorUserId: string
  actorRole: string
}

export interface OverrideAuditResult {
  encounterId: string
  auditedAt: string
}

interface InteractionAuditInput {
  encounterId: string
  requestId?: string
  interaction: 'rendered' | 'guardrail_blocked' | 'degraded' | 'alert_acknowledged'
  latencyMs?: number
  suggestionCount: number
  violationCount: number
  warningCount: number
  primaryConfidence?: number
  metadata?: Record<string, unknown>
  actorUserId: string
  actorRole: string
}

interface OutcomeFeedbackMetricsRow {
  selectedConfidence: number
  selectedIcd: string
  finalIcd: string
  overrideReason: string | null
}

export interface IntelligenceDashboardAccess {
  canViewAlerts: boolean
  canViewEncounters: boolean
  canViewInsights: boolean
  canViewMetrics: boolean
  canSubmitOverride: boolean
  hasAnyAccess: boolean
}

const CLINICAL_ROLES = new Set([
  'DOKTER',
  'DOKTER_GIGI',
  'PERAWAT',
  'BIDAN',
  'APOTEKER',
  'TRIAGE_OFFICER',
  'CEO_SENTRA',
])

const MANAGEMENT_ROLES = new Set([
  'ADMIN',
  'ADMINISTRATOR',
  'CEO',
  'CHIEF_EXECUTIVE_OFFICER',
  'KEPALA_PUSKESMAS',
  'CEO_SENTRA',
])

const OMITTED_METADATA_KEYS = [
  'patientid',
  'patientlabel',
  'patientname',
  'medicalrecordnumber',
  'bpjsnumber',
  'bpjsnomorsep',
  'nik',
  'name',
  'fullname',
  'phone',
  'address',
  'anamnesis',
  'chiefcomplaint',
  'historyofpresentillness',
  'riwayatpenyakit',
  'keluhanutama',
  'followupnote',
  'note',
  'notes',
]

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString()
  return value instanceof Date ? value.toISOString() : value
}

function mapTemporaryStatus(encounter: TemporaryEncounterRecord): DashboardEncounterStatus {
  switch (encounter.status) {
    case 'PENDING':
    case 'CONFIRMED':
      return 'waiting'
    case 'IN_PROGRESS':
      return encounter.diagnosaICD10 || encounter.diagnosis ? 'in_consultation' : 'cdss_pending'
    case 'COMPLETED':
      return 'completed'
    default:
      return 'waiting'
  }
}

function sanitizeFieldKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function shouldOmitMetadataKey(key: string): boolean {
  return OMITTED_METADATA_KEYS.includes(sanitizeFieldKey(key))
}

function scrubMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scrubMetadataValue(item)).filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    const scrubbedEntries = Object.entries(value).flatMap(([key, nestedValue]) => {
      if (shouldOmitMetadataKey(key)) {
        return []
      }

      const scrubbedValue = scrubMetadataValue(nestedValue)
      if (scrubbedValue === undefined) {
        return []
      }

      return [[key, scrubbedValue] as const]
    })

    return Object.fromEntries(scrubbedEntries)
  }

  return value
}

function buildPatientLabel(encounterId: string): string {
  const suffix = encounterId.slice(-6).toUpperCase()
  return `Pasien #${suffix}`
}

function mapConsultStatusToTemporaryStatus(status: string): TemporaryEncounterRecord['status'] {
  switch (status.trim().toLowerCase()) {
    case 'accepted':
      return 'IN_PROGRESS'
    case 'transferred':
    case 'completed':
      return 'COMPLETED'
    case 'rejected':
      return 'CANCELLED'
    case 'received':
    default:
      return 'PENDING'
  }
}

function mapRequestedTemporaryStatusToConsultStatuses(status: string | null | undefined): string[] {
  const normalizedStatus = status?.trim().toUpperCase()
  if (!normalizedStatus) {
    return ['received', 'accepted', 'transferred', 'completed']
  }

  switch (normalizedStatus) {
    case 'PENDING':
    case 'CONFIRMED':
      return ['received']
    case 'IN_PROGRESS':
      return ['accepted']
    case 'COMPLETED':
      return ['transferred', 'completed']
    case 'CANCELLED':
    case 'NO_SHOW':
      return ['rejected']
    default:
      return []
  }
}

function mapTemporaryDiagnosis(encounter: TemporaryEncounterRecord): Diagnosis[] {
  if (!encounter.diagnosaICD10) return []

  return [
    {
      id: `${encounter.id}-primary`,
      icd10Code: encounter.diagnosaICD10,
      icd10Description: encounter.diagnosis ?? 'Diagnosis klinis',
      type: 'primary',
      confidence: 1,
      source: 'clinician',
      notes: encounter.pemeriksaan ?? undefined,
    },
  ]
}

function mapTemporaryPrescriptions(encounter: TemporaryEncounterRecord): Prescription[] {
  if (!Array.isArray(encounter.resepDigital)) return []

  return encounter.resepDigital.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []

    const raw = item as Record<string, unknown>
    const medicationName = typeof raw.medicationName === 'string' ? raw.medicationName : ''
    if (!medicationName) return []

    return [
      {
        id: `${encounter.id}-rx-${index + 1}`,
        medicationName,
        dosage: typeof raw.dosage === 'string' ? raw.dosage : '-',
        frequency: typeof raw.frequency === 'string' ? raw.frequency : '-',
        route: typeof raw.route === 'string' ? raw.route : 'oral',
        duration: typeof raw.duration === 'string' ? raw.duration : '-',
        quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
        instructions: typeof raw.instructions === 'string' ? raw.instructions : undefined,
      },
    ]
  })
}

function mapTemporaryReferral(encounter: TemporaryEncounterRecord): Referral | undefined {
  if (!encounter.rujukan) return undefined

  return {
    id: `${encounter.id}-referral`,
    fromFacilityId: 'intelligenceboard',
    toFacilityId: encounter.rujukanTujuan ?? 'external-facility',
    urgency: 'routine',
    reason: 'Rujukan operasional dari encounter sementara',
    clinicalSummary: encounter.diagnosis ?? encounter.keluhanUtama ?? 'Rujukan klinis',
    diagnoses: encounter.diagnosaICD10 ? [encounter.diagnosaICD10] : [],
    status: 'pending',
    createdAt: encounter.updatedAt,
  }
}

function toClinicalEncounter(encounter: TemporaryEncounterRecord): Encounter {
  return {
    id: encounter.id,
    patientId: encounter.patientId,
    practitionerId: encounter.doctorId,
    puskesmasId: 'intelligenceboard',
    type: 'outpatient',
    status:
      encounter.status === 'COMPLETED'
        ? 'completed'
        : encounter.status === 'CANCELLED' || encounter.status === 'NO_SHOW'
          ? 'cancelled'
          : 'in_progress',
    startedAt: encounter.startedAt ?? encounter.scheduledAt,
    completedAt: encounter.endedAt ?? undefined,
    anamnesis:
      encounter.keluhanUtama || encounter.anamnesis || encounter.riwayatPenyakit
        ? {
            chiefComplaint: encounter.keluhanUtama ?? 'Keluhan belum dicatat',
            historyOfPresentIllness:
              encounter.anamnesis ??
              encounter.riwayatPenyakit ??
              encounter.keluhanUtama ??
              'Belum ada anamnesis terstruktur',
            source: 'manual',
            recordedAt: encounter.updatedAt,
          }
        : undefined,
    vitals: encounter.pemeriksaan
      ? {
          recordedAt: encounter.updatedAt,
        }
      : undefined,
    diagnoses: mapTemporaryDiagnosis(encounter),
    prescriptions: mapTemporaryPrescriptions(encounter),
    referral: mapTemporaryReferral(encounter),
  }
}

function mapComplianceSeverity(check: ComplianceCheck): DashboardComplianceIssue['severity'] {
  if (check.category === 'eklaim' || check.category === 'ai_transparency') {
    return 'critical'
  }

  if (check.category === 'documentation') {
    return 'warning'
  }

  return 'info'
}

function mapComplianceIssue(check: ComplianceCheck): DashboardComplianceIssue {
  return {
    code: check.rule,
    message: check.message,
    severity: mapComplianceSeverity(check),
  }
}

export function canAccessIntelligenceEncounters(role: string): boolean {
  return CLINICAL_ROLES.has(role) || MANAGEMENT_ROLES.has(role)
}

export function canAccessIntelligenceInsights(role: string): boolean {
  return CLINICAL_ROLES.has(role)
}

export function canAccessIntelligenceMetrics(role: string): boolean {
  return MANAGEMENT_ROLES.has(role)
}

export function canSubmitIntelligenceOverride(role: string): boolean {
  return canAccessIntelligenceInsights(role)
}

export function resolveIntelligenceDashboardAccess(
  role: string | null | undefined
): IntelligenceDashboardAccess {
  const normalizedRole = role?.trim() ?? ''
  const canViewEncounters = canAccessIntelligenceEncounters(normalizedRole)
  const canViewInsights = canAccessIntelligenceInsights(normalizedRole)
  const canViewMetrics = canAccessIntelligenceMetrics(normalizedRole)
  const canViewAlerts = canViewEncounters
  const canSubmitOverride = canSubmitIntelligenceOverride(normalizedRole)

  return {
    canViewAlerts,
    canViewEncounters,
    canViewInsights,
    canViewMetrics,
    canSubmitOverride,
    hasAnyAccess:
      canViewAlerts || canViewEncounters || canViewInsights || canViewMetrics || canSubmitOverride,
  }
}

export function sanitizeIntelligenceMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const scrubbed = scrubMetadataValue(metadata)
  return scrubbed && typeof scrubbed === 'object' ? (scrubbed as Record<string, unknown>) : {}
}

export function buildDashboardEncounterSummary({
  encounter,
  suggestions,
  alerts,
}: BuildEncounterSummaryInput): DashboardEncounterSummary {
  const clinicalEncounter = toClinicalEncounter(encounter)
  const eklaimChecks = checkEklaimReadiness(clinicalEncounter)
  const compliance = runFullComplianceCheck(clinicalEncounter)
  const failedChecks = compliance.checks.filter((check) => check.passed === false)

  const hasDocumentationFailure = failedChecks.some(
    (check) => check.category === 'documentation' || check.category === 'eklaim'
  )

  const baseStatus = mapTemporaryStatus(encounter)
  const finalStatus =
    baseStatus === 'completed' && hasDocumentationFailure ? 'documentation_incomplete' : baseStatus

  return {
    encounterId: encounter.id,
    patientLabel: buildPatientLabel(encounter.id),
    status: finalStatus,
    suggestions,
    alerts,
    eklaimReadiness: {
      isReady: eklaimChecks.every((check) => check.passed !== false),
      checkedAt: encounter.updatedAt,
      blockers: eklaimChecks
        .filter((check) => check.passed === false)
        .map((check) => mapComplianceIssue(check)),
    },
    activeComplianceFailures: failedChecks.map((check) => mapComplianceIssue(check)),
    lastUpdatedAt: encounter.updatedAt,
  }
}

export function buildDashboardOperationalMetrics({
  encounterSummaries,
  cdssUsageCount,
  overrideCount,
  averageConfidenceScore,
  generatedAt,
  shiftLabel = 'Shift Operasional',
}: BuildMetricsInput): DashboardOperationalMetrics {
  const statusSeed: DashboardOperationalMetrics['encountersByStatus'] = {
    waiting: 0,
    in_consultation: 0,
    cdss_pending: 0,
    documentation_incomplete: 0,
    completed: 0,
  }

  for (const summary of encounterSummaries) {
    statusSeed[summary.status] += 1
  }

  const totalEncounters = encounterSummaries.length
  const readyCount = encounterSummaries.filter((summary) => summary.eklaimReadiness.isReady).length

  return {
    shiftLabel,
    totalEncounters,
    encountersByStatus: statusSeed,
    cdssUtilizationRate: totalEncounters > 0 ? cdssUsageCount / totalEncounters : 0,
    eklaimReadinessRate: totalEncounters > 0 ? readyCount / totalEncounters : 0,
    averageConfidenceScore,
    overrideCount,
    overrideRate: totalEncounters > 0 ? overrideCount / totalEncounters : 0,
    generatedAt,
  }
}

async function loadTemporaryEncounterRecords({
  limit = 50,
  status,
}: ListEncounterSummaryOptions): Promise<TemporaryEncounterRecord[]> {
  const { prisma } = await import('@/lib/prisma')
  const consultStatuses = mapRequestedTemporaryStatusToConsultStatuses(status)

  const [appointmentRecords, consultRecords] = await Promise.all([
    prisma.telemedicineAppointment.findMany({
      where: {
        deletedAt: null,
        status: status
          ? (status.toUpperCase() as TemporaryEncounterRecord['status'])
          : {
              in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'],
            },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: Math.max(1, Math.min(limit, 100)),
    }),
    consultStatuses.length > 0
      ? prisma.consultLog.findMany({
          where: {
            status: { in: consultStatuses },
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: Math.max(1, Math.min(limit, 100)),
          select: {
            consultId: true,
            patientRm: true,
            targetDoctorId: true,
            createdAt: true,
            updatedAt: true,
            sentAt: true,
            acceptedAt: true,
            transferredAt: true,
            completedAt: true,
            status: true,
            keluhanUtama: true,
          },
        })
      : Promise.resolve([] as TemporaryConsultRecord[]),
  ])

  const appointmentSummaries = appointmentRecords.map((record) => ({
    id: record.id,
    patientId: record.patientId,
    doctorId: record.doctorId,
    scheduledAt: toIsoString(record.scheduledAt),
    startedAt: toIsoString(record.startedAt),
    endedAt: toIsoString(record.endedAt),
    updatedAt: toIsoString(record.updatedAt),
    status: record.status,
    keluhanUtama: record.keluhanUtama,
    riwayatPenyakit: record.riwayatPenyakit,
    anamnesis: record.anamnesis,
    pemeriksaan: record.pemeriksaan,
    diagnosis: record.diagnosis,
    diagnosaICD10: record.diagnosaICD10,
    resepDigital: record.resepDigital,
    rujukan: record.rujukan,
    rujukanTujuan: record.rujukanTujuan,
  }))

  const consultSummaries = consultRecords.map((record) => ({
    id: record.consultId,
    patientId: record.patientRm ?? record.consultId,
    doctorId: record.targetDoctorId ?? 'assist-consult',
    scheduledAt: toIsoString(record.sentAt ?? record.createdAt),
    startedAt: toIsoString(record.acceptedAt),
    endedAt: toIsoString(record.completedAt ?? record.transferredAt),
    updatedAt: toIsoString(record.updatedAt),
    status: mapConsultStatusToTemporaryStatus(record.status),
    keluhanUtama: record.keluhanUtama,
    riwayatPenyakit: null,
    anamnesis: null,
    pemeriksaan: null,
    diagnosis: null,
    diagnosaICD10: null,
    resepDigital: null,
    rujukan: false,
    rujukanTujuan: null,
  }))

  return [...appointmentSummaries, ...consultSummaries]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, Math.max(1, Math.min(limit, 100)))
}

export async function listEncounterSummaries(
  options: ListEncounterSummaryOptions = {}
): Promise<DashboardEncounterSummary[]> {
  const records = await loadTemporaryEncounterRecords(options)

  // Load CDSS audit data to populate alerts for encounters with red flags
  const { getCDSSEncounterSummaries } = await import('@/lib/cdss/workflow')
  const cdssSummaries = await getCDSSEncounterSummaries(records.map((r) => r.id))

  return records.map((encounter) => {
    const cdss = cdssSummaries.get(encounter.id)
    const alerts: ClinicalAlert[] = []

    if (cdss?.redFlagCount && cdss.redFlagCount > 0) {
      alerts.push({
        id: `cdss-redflag-${encounter.id}`,
        type: 'critical_value',
        severity: 'warning',
        message: `CDSS mendeteksi ${cdss.redFlagCount} red flag untuk encounter ini.`,
        source: cdss.modelVersion,
        actionRequired: true,
      })
    }

    return buildDashboardEncounterSummary({
      encounter,
      suggestions: [],
      alerts,
    })
  })
}

export async function getOperationalMetrics(): Promise<DashboardOperationalMetrics> {
  const [encounterSummaries, workflowMetrics, confidenceRows] = await Promise.all([
    listEncounterSummaries({ limit: 100 }),
    import('@/lib/cdss/workflow').then(({ getCDSSQualityMetrics }) => getCDSSQualityMetrics(14)),
    import('@/lib/prisma').then(async ({ prisma }) => {
      const prismaLike = prisma as unknown as {
        cDSSOutcomeFeedback?: {
          findMany: (args: unknown) => Promise<OutcomeFeedbackMetricsRow[]>
        }
      }

      return (
        (await prismaLike.cDSSOutcomeFeedback?.findMany({
          select: {
            selectedConfidence: true,
            selectedIcd: true,
            finalIcd: true,
            overrideReason: true,
          },
        })) ?? []
      )
    }),
  ])

  const overrideCount = confidenceRows.filter(
    (row: OutcomeFeedbackMetricsRow) =>
      Boolean(row.overrideReason?.trim()) || row.selectedIcd !== row.finalIcd
  ).length
  const averageConfidenceScore =
    confidenceRows.length > 0
      ? confidenceRows.reduce(
          (sum: number, row: OutcomeFeedbackMetricsRow) => sum + row.selectedConfidence,
          0
        ) / confidenceRows.length
      : 0

  return buildDashboardOperationalMetrics({
    encounterSummaries,
    cdssUsageCount: Math.min(encounterSummaries.length, workflowMetrics.total_requests),
    overrideCount,
    averageConfidenceScore,
    generatedAt: new Date().toISOString(),
    shiftLabel: 'Shift Operasional',
  })
}

export async function recordOverrideAudit(input: OverrideInput): Promise<OverrideAuditResult> {
  const auditedAt = new Date().toISOString()
  const sanitizedMetadata = sanitizeIntelligenceMetadata({
    encounterId: input.encounterId,
    action: input.action,
    selectedIcd: input.selectedIcd,
    finalIcd: input.finalIcd,
    selectedConfidence: input.selectedConfidence,
    outcomeConfirmed: input.outcomeConfirmed,
    hasFollowUpNote: Boolean(input.followUpNote?.trim()),
    overrideReason: input.overrideReason,
    actorRole: input.actorRole,
    ...input.metadata,
  })

  const { writeCDSSAuditEntry, writeCDSSOutcomeFeedbackEntry } = await import('@/lib/cdss/workflow')

  if (input.selectedIcd || input.finalIcd) {
    await writeCDSSOutcomeFeedbackEntry({
      sessionId: input.encounterId,
      selectedIcd: input.selectedIcd ?? input.finalIcd ?? 'UNKNOWN',
      selectedConfidence: input.selectedConfidence ?? 0,
      finalIcd: input.finalIcd ?? input.selectedIcd ?? 'UNKNOWN',
      outcomeConfirmed: input.outcomeConfirmed ?? null,
      followUpNote: undefined,
      doctorUserId: input.actorUserId,
      overrideReason: input.overrideReason ?? input.action,
      metadata: sanitizedMetadata,
    })
  }

  await writeCDSSAuditEntry({
    sessionId: input.encounterId,
    action: `INTELLIGENCE_OVERRIDE_${input.action.toUpperCase()}`,
    validationStatus: 'completed',
    modelVersion: 'INTELLIGENCE-DASHBOARD-V1',
    latencyMs: 0,
    outputSummary: {
      encounterId: input.encounterId,
      action: input.action,
      auditedAt,
    },
    metadata: sanitizedMetadata,
  })

  return {
    encounterId: input.encounterId,
    auditedAt,
  }
}

function mapInteractionAction(interaction: InteractionAuditInput['interaction']): string {
  switch (interaction) {
    case 'rendered':
      return 'INTELLIGENCE_AI_RENDERED'
    case 'guardrail_blocked':
      return 'INTELLIGENCE_AI_BLOCKED'
    case 'degraded':
      return 'INTELLIGENCE_AI_DEGRADED'
    case 'alert_acknowledged':
      return 'INTELLIGENCE_ALERT_ACKNOWLEDGED'
  }
}

function mapInteractionValidationStatus(interaction: InteractionAuditInput['interaction']): string {
  switch (interaction) {
    case 'rendered':
      return 'completed'
    case 'guardrail_blocked':
      return 'blocked_by_guardrails'
    case 'degraded':
      return 'degraded'
    case 'alert_acknowledged':
      return 'completed'
  }
}

export async function recordIntelligenceInteractionAudit(
  input: InteractionAuditInput
): Promise<OverrideAuditResult> {
  const auditedAt = new Date().toISOString()
  const sanitizedMetadata = sanitizeIntelligenceMetadata({
    requestId: input.requestId,
    actorRole: input.actorRole,
    interaction: input.interaction,
    primaryConfidence: input.primaryConfidence,
    ...input.metadata,
  })

  const { writeCDSSAuditEntry } = await import('@/lib/cdss/workflow')

  await writeCDSSAuditEntry({
    sessionId: input.encounterId,
    action: mapInteractionAction(input.interaction),
    validationStatus: mapInteractionValidationStatus(input.interaction),
    modelVersion:
      typeof sanitizedMetadata.engineVersion === 'string'
        ? sanitizedMetadata.engineVersion
        : 'INTELLIGENCE-DASHBOARD-V1',
    latencyMs: input.latencyMs ?? 0,
    outputSummary: {
      encounterId: input.encounterId,
      requestId: input.requestId,
      interaction: input.interaction,
      auditedAt,
      suggestionCount: input.suggestionCount,
      violationCount: input.violationCount,
      warningCount: input.warningCount,
      primaryConfidence: input.primaryConfidence,
    },
    metadata: sanitizedMetadata,
  })

  return {
    encounterId: input.encounterId,
    auditedAt,
  }
}
