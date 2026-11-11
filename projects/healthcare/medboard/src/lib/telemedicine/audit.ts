// ============================================================
// PKM Dashboard — Telemedicine Audit Log
// ============================================================

import { prisma } from '@/lib/prisma'

interface AuditLogInput {
  appointmentId: string
  userId: string
  action: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog({
  appointmentId,
  userId,
  action,
  metadata,
}: AuditLogInput): Promise<void> {
  try {
    await prisma.telemedicineAuditLog.create({
      data: {
        appointmentId,
        userId,
        action,
        metadata: (metadata ?? {}) as object,
      },
    })
  } catch {
    // Audit log gagal tidak boleh menghentikan flow utama — silent
  }
}

export const AUDIT_ACTIONS = {
  // Session events
  JOIN_ROOM: 'JOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  TOKEN_REQUEST_DENIED: 'TOKEN_REQUEST_DENIED',

  // Appointment events
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',

  // Clinical events
  DIAGNOSIS_WRITTEN: 'DIAGNOSIS_WRITTEN',
  PRESCRIPTION_CREATED: 'PRESCRIPTION_CREATED',
  REFERRAL_ISSUED: 'REFERRAL_ISSUED',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED',

  // Recording
  RECORDING_STARTED: 'RECORDING_STARTED',
  RECORDING_STOPPED: 'RECORDING_STOPPED',

  // Integration
  SATUSEHAT_PUSHED: 'SATUSEHAT_PUSHED',
  PCARE_SUBMITTED: 'PCARE_SUBMITTED',
  BPJS_CLAIM_SENT: 'BPJS_CLAIM_SENT',
} as const
