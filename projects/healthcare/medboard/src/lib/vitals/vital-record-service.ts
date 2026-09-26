import 'server-only'

import type { Prisma, VitalRecordSource } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { TriageVitalSigns } from './unified-vitals'

export {
  buildPatientIdentifierFromRM,
  buildPatientIdentifierHash,
} from './vital-record-utils'

export interface PersistVitalRecordInput {
  patientIdentifier: string
  encounterId?: string
  vitals: TriageVitalSigns
  news2Score: number
  news2Risk: string
  avpu?: string
  flags?: Array<{ severity: string; condition: string }>
  source?: VitalRecordSource
  recordedAt: string
  recordedByUserId?: string
}

export interface PersistVitalRecordResult {
  success: boolean
  id?: string
  error?: string
}

export interface VitalHistoryRecord {
  id: string
  vitals: unknown
  news2Score: number
  news2Risk: string
  avpu: string | null
  flags: unknown
  source: VitalRecordSource
  recordedAt: string
}

export interface GetPatientVitalHistoryResult {
  success: boolean
  data: VitalHistoryRecord[]
  error?: string
}

export async function persistVitalRecord(
  input: PersistVitalRecordInput
): Promise<PersistVitalRecordResult> {
  try {
    const record = await prisma.vitalRecord.create({
      data: {
        patientIdentifier: input.patientIdentifier,
        encounterId: input.encounterId ?? null,
        vitals: input.vitals as Prisma.InputJsonValue,
        news2Score: input.news2Score,
        news2Risk: input.news2Risk,
        avpu: input.avpu ?? input.vitals.avpu ?? null,
        flags: input.flags ? (input.flags as Prisma.InputJsonValue) : undefined,
        source: input.source ?? 'ASSIST_TRIAGE',
        recordedAt: new Date(input.recordedAt),
        recordedByUserId: input.recordedByUserId ?? null,
      },
    })

    return { success: true, id: record.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getPatientVitalHistory(
  patientIdentifier: string,
  limit: number
): Promise<GetPatientVitalHistoryResult> {
  try {
    const rows = await prisma.vitalRecord.findMany({
      where: { patientIdentifier },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    })

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        vitals: row.vitals,
        news2Score: row.news2Score,
        news2Risk: row.news2Risk,
        avpu: row.avpu,
        flags: row.flags,
        source: row.source,
        recordedAt: row.recordedAt.toISOString(),
      })),
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
