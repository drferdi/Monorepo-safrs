import 'server-only'

import { prisma } from '@/lib/prisma'

import { computeImmutableHash } from '@/lib/audit/screening-immutable-hash'

// ============================================================================
// TYPES
// ============================================================================

export interface CreateScreeningAuditInput {
  eventId: string
  assistId: string
  consultId?: string
  patientId: string
  screeningId: string
  doctorId: string
  facilityId: string
  screeningStatus: 'positive' | 'negative' | 'inconclusive'
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  score?: number | null
  resultSummary?: string
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'pending'
  deliveryTimestamp: Date
  appVersion?: string
  senderUserId?: string
  metaJson?: Record<string, unknown>
}

export interface ScreeningAuditAck {
  id: string
  eventId: string
  savedAt: string
}

export interface ScreeningAuditLogFilters {
  from?: Date
  to?: Date
  doctorId?: string
  facilityId?: string
  screeningStatus?: string
  deliveryStatus?: string
  acknowledged?: boolean
  page?: number
  perPage?: number
}

export { computeImmutableHash } from '@/lib/audit/screening-immutable-hash'

// ============================================================================
// CREATE
// ============================================================================

export async function createScreeningAuditLog(
  input: CreateScreeningAuditInput
): Promise<ScreeningAuditAck> {
  const immutableHash = computeImmutableHash({
    eventId: input.eventId,
    deliveryTimestamp: input.deliveryTimestamp.toISOString(),
    patientId: input.patientId,
    doctorId: input.doctorId,
    screeningStatus: input.screeningStatus,
    score: input.score,
    assistId: input.assistId,
  })

  const record = await prisma.screeningAuditLog.create({
    data: {
      eventId: input.eventId,
      assistId: input.assistId,
      consultId: input.consultId ?? null,
      patientId: input.patientId,
      screeningId: input.screeningId,
      doctorId: input.doctorId,
      facilityId: input.facilityId,
      screeningStatus: input.screeningStatus,
      riskLevel: input.riskLevel ?? null,
      score: input.score ?? null,
      resultSummary: input.resultSummary ?? null,
      deliveryStatus: input.deliveryStatus,
      deliveryTimestamp: input.deliveryTimestamp,
      appVersion: input.appVersion ?? null,
      senderUserId: input.senderUserId ?? null,
      metaJson: (input.metaJson ?? {}) as object,
      immutableHash,
    },
    select: { id: true, eventId: true, createdAt: true },
  })

  return {
    id: record.id,
    eventId: record.eventId,
    savedAt: record.createdAt.toISOString(),
  }
}

// ============================================================================
// QUERY (for dashboard logbook GET)
// ============================================================================

export async function queryScreeningAuditLogs(filters: ScreeningAuditLogFilters) {
  const page = filters.page ?? 1
  const perPage = Math.min(filters.perPage ?? 50, 200)
  const skip = (page - 1) * perPage

  const where = {
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
    ...(filters.facilityId ? { facilityId: filters.facilityId } : {}),
    ...(filters.screeningStatus ? { screeningStatus: filters.screeningStatus } : {}),
    ...(filters.deliveryStatus ? { deliveryStatus: filters.deliveryStatus } : {}),
    ...(filters.acknowledged !== undefined
      ? { acknowledgedByDoctor: filters.acknowledged }
      : {}),
  }

  const [total, data] = await prisma.$transaction([
    prisma.screeningAuditLog.count({ where }),
    prisma.screeningAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true,
        eventId: true,
        assistId: true,
        consultId: true,
        patientId: true,
        screeningId: true,
        doctorId: true,
        facilityId: true,
        screeningStatus: true,
        riskLevel: true,
        score: true,
        resultSummary: true,
        deliveryStatus: true,
        deliveryTimestamp: true,
        acknowledgedByDoctor: true,
        ackTimestamp: true,
        appVersion: true,
        immutableHash: true,
        createdAt: true,
      },
    }),
  ])

  return {
    data,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }
}

// ============================================================================
// GET SINGLE BY EVENT ID
// ============================================================================

export async function getScreeningAuditLogByEventId(eventId: string) {
  return prisma.screeningAuditLog.findUnique({
    where: { eventId },
    select: {
      id: true,
      eventId: true,
      assistId: true,
      consultId: true,
      patientId: true,
      screeningId: true,
      doctorId: true,
      facilityId: true,
      screeningStatus: true,
      riskLevel: true,
      score: true,
      resultSummary: true,
      deliveryStatus: true,
      deliveryTimestamp: true,
      acknowledgedByDoctor: true,
      ackTimestamp: true,
      appVersion: true,
      immutableHash: true,
      senderUserId: true,
      metaJson: true,
      createdAt: true,
    },
  })
}

// ============================================================================
// ACK
// ============================================================================

export async function ackScreeningAuditLog(
  eventId: string,
  ackedByDoctorId: string,
  ackTimestamp: Date
): Promise<{ eventId: string; acknowledgedByDoctor: boolean; ackTimestamp: string }> {
  const existing = await prisma.screeningAuditLog.findUnique({
    where: { eventId },
    select: { id: true, acknowledgedByDoctor: true, metaJson: true },
  })

  if (!existing) throw new Error(`ScreeningAuditLog not found: ${eventId}`)
  if (existing.acknowledgedByDoctor) throw new Error(`ALREADY_ACKED:${eventId}`)

  const prevMeta =
    existing.metaJson && typeof existing.metaJson === 'object' && !Array.isArray(existing.metaJson)
      ? (existing.metaJson as Record<string, unknown>)
      : {}

  const updated = await prisma.screeningAuditLog.update({
    where: { eventId },
    data: {
      acknowledgedByDoctor: true,
      ackTimestamp,
      metaJson: { ...prevMeta, acked_by_doctor_id: ackedByDoctorId },
    },
    select: { eventId: true, acknowledgedByDoctor: true, ackTimestamp: true },
  })

  return {
    eventId: updated.eventId,
    acknowledgedByDoctor: updated.acknowledgedByDoctor,
    ackTimestamp: updated.ackTimestamp?.toISOString() ?? ackTimestamp.toISOString(),
  }
}
