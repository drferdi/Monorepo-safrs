export const EMR_SOURCE_ORIGINS = {
  telemedicineAppointment: 'telemedicine-appointment',
  assistConsult: 'assist-consult',
  emrBridge: 'emr-bridge',
  emrManual: 'emr-manual',
} as const

const EMR_SOURCE_ORIGIN_VALUES = [
  EMR_SOURCE_ORIGINS.telemedicineAppointment,
  EMR_SOURCE_ORIGINS.assistConsult,
  EMR_SOURCE_ORIGINS.emrBridge,
  EMR_SOURCE_ORIGINS.emrManual,
] as const

export type EmrSourceOrigin = (typeof EMR_SOURCE_ORIGIN_VALUES)[number]

export type EmrBridgeStatus =
  | 'idle'
  | 'sending'
  | 'pending'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'failed'

type BridgeQueueStatus = 'pending' | 'claimed' | 'processing' | 'completed' | 'failed' | 'expired'

interface EmrSourceInput {
  appointmentId?: string | null
  consultId?: string | null
  bridgeEntryId?: string | null
  sourceOrigin?: string | null
}

interface ResolvedEmrSourceInput {
  appointmentId: string | null
  consultId: string | null
  bridgeEntryId: string | null
  sourceOrigin: EmrSourceOrigin
}

function normalizeValue(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isEmrSourceOrigin(value: string | null): value is EmrSourceOrigin {
  return value !== null && EMR_SOURCE_ORIGIN_VALUES.includes(value as EmrSourceOrigin)
}

export function resolveEmrSourceInput(input: EmrSourceInput): ResolvedEmrSourceInput {
  const appointmentId = normalizeValue(input.appointmentId)
  const consultId = normalizeValue(input.consultId)
  const bridgeEntryId = normalizeValue(input.bridgeEntryId)
  const rawSourceOrigin = normalizeValue(input.sourceOrigin)
  const sourceOrigin = isEmrSourceOrigin(rawSourceOrigin)
    ? rawSourceOrigin
    : appointmentId
      ? EMR_SOURCE_ORIGINS.telemedicineAppointment
      : consultId
        ? EMR_SOURCE_ORIGINS.assistConsult
        : bridgeEntryId
          ? EMR_SOURCE_ORIGINS.emrBridge
          : EMR_SOURCE_ORIGINS.emrManual

  switch (sourceOrigin) {
    case EMR_SOURCE_ORIGINS.telemedicineAppointment:
      return {
        appointmentId,
        consultId: null,
        bridgeEntryId: null,
        sourceOrigin,
      }
    case EMR_SOURCE_ORIGINS.assistConsult:
      return {
        appointmentId: null,
        consultId,
        bridgeEntryId,
        sourceOrigin,
      }
    case EMR_SOURCE_ORIGINS.emrBridge:
      return {
        appointmentId: null,
        consultId: null,
        bridgeEntryId,
        sourceOrigin,
      }
    case EMR_SOURCE_ORIGINS.emrManual:
    default:
      return {
        appointmentId: null,
        consultId: null,
        bridgeEntryId: null,
        sourceOrigin,
      }
  }
}

export function buildEmrSourceQuery(input: EmrSourceInput): string {
  const resolved = resolveEmrSourceInput(input)
  const query = new URLSearchParams()

  if (resolved.appointmentId) query.set('appointmentId', resolved.appointmentId)
  if (resolved.consultId) query.set('consultId', resolved.consultId)
  if (resolved.bridgeEntryId) query.set('bridgeEntryId', resolved.bridgeEntryId)
  query.set('sourceOrigin', resolved.sourceOrigin)

  return query.toString()
}

export function buildEmrSourceHref(input: EmrSourceInput): string {
  return `/emr?${buildEmrSourceQuery(input)}`
}

export function mapBridgeQueueStatusToEmrStatus(
  status?: BridgeQueueStatus | null
): EmrBridgeStatus {
  switch (status) {
    case 'pending':
    case 'claimed':
    case 'processing':
    case 'completed':
      return status
    case 'failed':
    case 'expired':
      return 'failed'
    default:
      return 'idle'
  }
}

export function isBridgeActionLocked(status: EmrBridgeStatus): boolean {
  return status !== 'idle' && status !== 'failed'
}

export function getBridgeStatusLabel(status: EmrBridgeStatus): string {
  switch (status) {
    case 'sending':
      return 'Mengirim...'
    case 'pending':
      return 'Menunggu Assist'
    case 'claimed':
      return 'Diklaim Assist'
    case 'processing':
      return 'Mengisi ePuskesmas...'
    case 'completed':
      return 'Selesai'
    case 'failed':
      return 'Coba Kirim Ulang'
    case 'idle':
    default:
      return 'Kirim ke ePuskesmas'
  }
}
