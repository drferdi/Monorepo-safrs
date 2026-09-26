import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

export interface CDSSQualityMetrics {
  total_requests: number
  total_displayed: number
  total_selected: number
  selection_rate: number
  red_flag_trigger_rate: number
  unverified_icd_avg_count: number
  latency_p95_ms: number
  feedback_total: number
  override_rate: number
  concordance_rate: number
  must_not_miss_surfaced_count: number
}

interface CDSSAuditEntryInput {
  sessionId?: string
  action: string
  validationStatus: string
  outputSummary?: Record<string, unknown>
  modelVersion?: string
  latencyMs?: number
  metadata?: Record<string, unknown>
}

interface CDSSOutcomeFeedbackInput {
  sessionId?: string
  selectedIcd: string
  selectedConfidence: number
  finalIcd: string
  outcomeConfirmed?: boolean | null
  followUpNote?: string
  doctorUserId?: string | null
  overrideReason?: string
  metadata?: Record<string, unknown>
}

type CDSSAuditRow = {
  sessionHash: string
  timestamp: Date
  latencyMs: number
  action: string
  outputSummary: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

type CDSSOutcomeFeedbackRow = {
  selectedIcd: string
  finalIcd: string
  overrideReason: string | null
  outcomeConfirmed: boolean | null
}

function shouldUseDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

function hashSessionId(sessionId?: string): string {
  return createHash('sha256')
    .update(sessionId?.trim() || 'anonymous-session')
    .digest('hex')
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index] ?? 0
}

export async function writeCDSSAuditEntry({
  sessionId,
  action,
  validationStatus,
  outputSummary = {},
  modelVersion = 'IDE-V2-HYBRID',
  latencyMs = 0,
  metadata = {},
}: CDSSAuditEntryInput): Promise<void> {
  if (!shouldUseDatabase()) return

  try {
    const { prisma } = await import('@/lib/prisma')
    const delegate = (
      prisma as unknown as {
        cDSSAuditLog?: { create: (args: unknown) => Promise<unknown> }
      }
    ).cDSSAuditLog
    if (!delegate?.create) return

    await delegate.create({
      data: {
        id: randomUUID(),
        sessionHash: hashSessionId(sessionId),
        action,
        inputHash: createHash('sha256').update(`${action}:${validationStatus}`).digest('hex'),
        outputSummary,
        modelVersion,
        latencyMs: Math.max(0, Math.round(latencyMs)),
        validationStatus,
        metadata,
      },
    })
  } catch {
    // Audit write failure — silent to avoid leaking info
  }
}

export async function writeCDSSOutcomeFeedbackEntry({
  sessionId,
  selectedIcd,
  selectedConfidence,
  finalIcd,
  outcomeConfirmed = null,
  followUpNote,
  doctorUserId = null,
  overrideReason,
  metadata = {},
}: CDSSOutcomeFeedbackInput): Promise<void> {
  if (!shouldUseDatabase()) return

  try {
    const { prisma } = await import('@/lib/prisma')
    const delegate = (
      prisma as unknown as {
        cDSSOutcomeFeedback?: { create: (args: unknown) => Promise<unknown> }
      }
    ).cDSSOutcomeFeedback
    if (!delegate?.create) return

    await delegate.create({
      data: {
        sessionHash: hashSessionId(sessionId),
        selectedIcd,
        selectedConfidence,
        finalIcd,
        outcomeConfirmed,
        followUpNote,
        doctorUserId,
        overrideReason,
        metadata,
      },
    })
  } catch {
    // Outcome feedback write failure — silent
  }
}

export async function getCDSSQualityMetrics(days = 14): Promise<CDSSQualityMetrics> {
  const empty: CDSSQualityMetrics = {
    total_requests: 0,
    total_displayed: 0,
    total_selected: 0,
    selection_rate: 0,
    red_flag_trigger_rate: 0,
    unverified_icd_avg_count: 0,
    latency_p95_ms: 0,
    feedback_total: 0,
    override_rate: 0,
    concordance_rate: 0,
    must_not_miss_surfaced_count: 0,
  }

  if (!shouldUseDatabase()) return empty

  try {
    const { prisma } = await import('@/lib/prisma')
    const prismaLike = prisma as unknown as {
      cDSSAuditLog?: { findMany: (args: unknown) => Promise<CDSSAuditRow[]> }
      cDSSOutcomeFeedback?: {
        findMany: (args: unknown) => Promise<CDSSOutcomeFeedbackRow[]>
      }
    }

    const since = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000)
    const auditRows =
      (await prismaLike.cDSSAuditLog?.findMany({
        where: { timestamp: { gte: since } },
        select: {
          sessionHash: true,
          timestamp: true,
          latencyMs: true,
          action: true,
          outputSummary: true,
          metadata: true,
        },
      })) ?? []

    const feedbackRows =
      (await prismaLike.cDSSOutcomeFeedback?.findMany({
        where: { timestamp: { gte: since } },
        select: {
          selectedIcd: true,
          finalIcd: true,
          overrideReason: true,
          outcomeConfirmed: true,
        },
      })) ?? []

    const diagnoseRows = auditRows.filter(row => row.action === 'DIAGNOSE_RESULT')
    const selectionRows = auditRows.filter(
      row =>
        row.action === 'SUGGESTION_SELECTED' &&
        row.outputSummary?.selectionIntent !== 'must_not_miss_considered'
    )
    const selectedSessions = new Set(selectionRows.map(row => row.sessionHash))
    const displayedCounts = diagnoseRows.map(row => toNumber(row.outputSummary?.totalDisplayed))
    const redFlagCount = diagnoseRows.filter(
      row => toNumber(row.outputSummary?.redFlagCount) > 0
    ).length
    const unverifiedCounts = diagnoseRows.map(row => toNumber(row.outputSummary?.unverifiedCount))
    const mustNotMissCounts = diagnoseRows.map(row => toNumber(row.outputSummary?.mustNotMissCount))

    return {
      total_requests: diagnoseRows.length,
      total_displayed: displayedCounts.reduce((sum, count) => sum + count, 0),
      total_selected: selectedSessions.size,
      selection_rate: diagnoseRows.length > 0 ? selectedSessions.size / diagnoseRows.length : 0,
      red_flag_trigger_rate: diagnoseRows.length > 0 ? redFlagCount / diagnoseRows.length : 0,
      unverified_icd_avg_count:
        unverifiedCounts.length > 0
          ? unverifiedCounts.reduce((sum, count) => sum + count, 0) / unverifiedCounts.length
          : 0,
      latency_p95_ms: percentile95(diagnoseRows.map(row => toNumber(row.latencyMs))),
      feedback_total: feedbackRows.length,
      override_rate:
        feedbackRows.length > 0
          ? feedbackRows.filter(
              row => Boolean(row.overrideReason?.trim()) || row.selectedIcd !== row.finalIcd
            ).length / feedbackRows.length
          : 0,
      concordance_rate:
        feedbackRows.length > 0
          ? feedbackRows.filter(row => row.selectedIcd === row.finalIcd).length /
            feedbackRows.length
          : 0,
      must_not_miss_surfaced_count: mustNotMissCounts.reduce((sum, count) => sum + count, 0),
    }
  } catch {
    return empty
  }
}

// ─── Per-Encounter CDSS Summary (for Intelligence Dashboard) ─────────────────

export interface CDSSEncounterSummary {
  sessionHash: string
  hasDiagnoseResult: boolean
  redFlagCount: number
  totalDisplayed: number
  modelVersion: string
  latestAt: Date
}

/**
 * Fetch CDSS audit summaries for a set of encounter IDs.
 * Returns a Map<encounterId, CDSSEncounterSummary>.
 */
export async function getCDSSEncounterSummaries(
  encounterIds: string[]
): Promise<Map<string, CDSSEncounterSummary>> {
  const result = new Map<string, CDSSEncounterSummary>()
  if (encounterIds.length === 0 || !shouldUseDatabase()) return result

  const hashToId = new Map<string, string>()
  for (const id of encounterIds) {
    hashToId.set(hashSessionId(id), id)
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const prismaLike = prisma as unknown as {
      cDSSAuditLog?: { findMany: (args: unknown) => Promise<CDSSAuditRow[]> }
    }

    const rows =
      (await prismaLike.cDSSAuditLog?.findMany({
        where: {
          sessionHash: { in: Array.from(hashToId.keys()) },
          action: 'DIAGNOSE_RESULT',
        },
        select: {
          sessionHash: true,
          timestamp: true,
          outputSummary: true,
          modelVersion: true,
        },
        orderBy: { timestamp: 'desc' },
      })) ?? []

    for (const row of rows) {
      const encounterId = hashToId.get(row.sessionHash)
      if (!encounterId || result.has(encounterId)) continue

      result.set(encounterId, {
        sessionHash: row.sessionHash,
        hasDiagnoseResult: true,
        redFlagCount: toNumber(row.outputSummary?.redFlagCount),
        totalDisplayed: toNumber(row.outputSummary?.totalDisplayed),
        modelVersion: String(
          row.metadata?.modelVersion ?? row.outputSummary?.modelVersion ?? 'unknown'
        ),
        latestAt: row.timestamp,
      })
    }
  } catch {
    // Silent — intelligence dashboard degrades gracefully
  }

  return result
}
