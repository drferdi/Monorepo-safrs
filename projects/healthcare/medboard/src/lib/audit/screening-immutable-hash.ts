import { createHash } from 'node:crypto'

export function computeImmutableHash(fields: {
  eventId: string
  deliveryTimestamp: string
  patientId: string
  doctorId: string
  screeningStatus: string
  score: number | null | undefined
  assistId: string
}): string {
  const canonical = [
    fields.eventId,
    fields.deliveryTimestamp,
    fields.patientId,
    fields.doctorId,
    fields.screeningStatus,
    String(fields.score ?? ''),
    fields.assistId,
  ].join('|')
  return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex')
}
