import 'server-only'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export const CLINICAL_CASE_AUDIT_EVENTS = {
  CONSULT_RECEIVED: 'CONSULT_RECEIVED',
  CONSULT_ACCEPTED: 'CONSULT_ACCEPTED',
  CONSULT_TRANSFERRED_TO_EMR: 'CONSULT_TRANSFERRED_TO_EMR',
  TELEMEDICINE_DIAGNOSIS_SAVED: 'TELEMEDICINE_DIAGNOSIS_SAVED',
  TELEMEDICINE_PRESCRIPTION_SAVED: 'TELEMEDICINE_PRESCRIPTION_SAVED',
} as const

export type ClinicalCaseAuditEventType =
  (typeof CLINICAL_CASE_AUDIT_EVENTS)[keyof typeof CLINICAL_CASE_AUDIT_EVENTS]

export interface AppendClinicalCaseAuditEventInput {
  eventType: ClinicalCaseAuditEventType | string
  actorUserId?: string | null
  actorName?: string | null
  appointmentId?: string | null
  consultId?: string | null
  reportId?: string | null
  sourceOrigin?: string | null
  payload: Record<string, unknown>
}

export async function appendClinicalCaseAuditEvent(
  input: AppendClinicalCaseAuditEventInput
): Promise<void> {
  await prisma.clinicalCaseAuditEvent.create({
    data: {
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      appointmentId: input.appointmentId ?? null,
      consultId: input.consultId ?? null,
      reportId: input.reportId ?? null,
      sourceOrigin: input.sourceOrigin ?? null,
      payload: input.payload as Prisma.InputJsonValue,
    },
  })
}
