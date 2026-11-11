// ============================================================
// PKM Dashboard — Telemedicine Notifications (WhatsApp)
// ============================================================

import type { ConsultationType } from '@/types/telemedicine.types'

const WHATSAPP_API_URL = process.env.WHATSAPP_CLOUD_API_URL ?? ''
const WHATSAPP_TOKEN = process.env.WHATSAPP_CLOUD_API_TOKEN ?? ''
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''

interface NotificationPayload {
  appointmentId: string
  patientName: string
  patientPhone?: string
  doctorName: string
  scheduledAt: Date
  consultationType: ConsultationType
  joinUrl?: string // Link join untuk pasien
}

function formatTanggalIndonesia(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatJam(date: Date): string {
  return (
    date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }) + ' WIB'
  )
}

const CONSULTATION_TYPE_LABEL: Record<ConsultationType, string> = {
  VIDEO: 'Video Call',
  AUDIO: 'Telepon',
  CHAT: 'Chat',
}

export async function sendWhatsAppNotification(payload: NotificationPayload): Promise<void> {
  if (!payload.patientPhone) return
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return

  const tanggal = formatTanggalIndonesia(payload.scheduledAt)
  const jam = formatJam(payload.scheduledAt)
  const tipe = CONSULTATION_TYPE_LABEL[payload.consultationType]
  const phone = payload.patientPhone.replace(/^0/, '62').replace(/\D/g, '')

  const message = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'pkm_appointment_reminder',
      language: { code: 'id' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: payload.patientName },
            { type: 'text', text: payload.doctorName },
            { type: 'text', text: `${tanggal}, ${jam}` },
            { type: 'text', text: tipe },
            ...(payload.joinUrl ? [{ type: 'text', text: payload.joinUrl }] : []),
          ],
        },
      ],
    },
  }

  const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp API error: ${err}`)
  }
}

export async function sendAppointmentReminder(
  payload: NotificationPayload & { patientPhone: string }
): Promise<void> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return

  const phone = payload.patientPhone.replace(/^0/, '62').replace(/\D/g, '')
  const jam = formatJam(payload.scheduledAt)

  const message = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'pkm_appointment_1hour_reminder',
      language: { code: 'id' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: payload.patientName },
            { type: 'text', text: jam },
            { type: 'text', text: payload.doctorName },
          ],
        },
      ],
    },
  }

  const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error(`WhatsApp Reminder error: ${await response.text()}`)
  }
}
