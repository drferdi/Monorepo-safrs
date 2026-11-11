// Drferdi — vision, brought to life.
// ============================================================
// PKM Dashboard — Telemedicine Types
// ============================================================

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type ConsultationType = 'VIDEO' | 'AUDIO' | 'CHAT'

export type SessionParticipantRole = 'DOCTOR' | 'NURSE' | 'PATIENT' | 'OBSERVER'

// ─── API RESPONSE WRAPPER ─────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  timestamp: string
}

// ─── APPOINTMENT ──────────────────────────────────────────────
export interface CreateAppointmentInput {
  patientId: string
  patientPhone?: string // No HP pasien untuk WhatsApp
  doctorId: string
  scheduledAt: string // ISO 8601
  durationMinutes?: number
  consultationType?: ConsultationType
  keluhanUtama?: string
  riwayatPenyakit?: string
  bpjsNomorSEP?: string
}

export interface TelemedicineSessionDetails {
  id: string
  appointmentId: string
  roomName: string
  roomSid: string | null
  recordingEnabled: boolean
  recordingUrl: string | null
  recordingConsent: boolean
  actualStartAt: Date | string | null
  actualEndAt: Date | string | null
  actualDurationSeconds: number | null
  avgNetworkQuality: unknown | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface AppointmentWithDetails {
  id: string
  patientId: string
  patientPhone: string | null
  patientJoinToken: string | null
  doctorId: string
  createdByStaffId: string
  scheduledAt: Date | string
  durationMinutes: number
  consultationType: ConsultationType
  status: AppointmentStatus
  bpjsNomorSEP: string | null
  pCareNoKunjungan: string | null
  diagnosaICD10: string | null
  diagnosaInaCBGs: string | null
  keluhanUtama: string | null
  riwayatPenyakit: string | null
  anamnesis: string | null
  pemeriksaan: string | null
  diagnosis: string | null
  tatalaksana: string | null
  resepDigital: unknown | null
  rujukan: boolean
  rujukanTujuan: string | null
  livekitRoomName: string | null
  livekitRoomId: string | null
  satusehatEncounterId: string | null
  startedAt: Date | string | null
  endedAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt: Date | string | null
  session: TelemedicineSessionDetails | null
}

// ─── LIVEKIT TOKEN ────────────────────────────────────────────
export interface LiveKitTokenRequest {
  appointmentId: string
  participantRole: SessionParticipantRole
}

export interface LiveKitTokenResponse {
  token: string
  roomName: string
  serverUrl: string
  participantIdentity: string
  expiresAt: string
}

// ─── SESSION ──────────────────────────────────────────────────
export interface SessionState {
  isConnected: boolean
  isConnecting: boolean
  isMicEnabled: boolean
  isCameraEnabled: boolean
  isScreenSharing: boolean
  participantCount: number
  networkQuality: 'excellent' | 'good' | 'poor' | 'unknown'
  elapsedSeconds: number
}

export interface SessionParticipantInfo {
  identity: string
  name: string
  role: SessionParticipantRole
  isSpeaking: boolean
  isCameraOn: boolean
  isMicOn: boolean
  networkQuality: number // 0-5
}

// ─── E-PRESCRIPTION ───────────────────────────────────────────
export interface PrescriptionItem {
  namaObat: string
  bentukSediaan: string
  dosis: string
  aturanMinum: string
  jumlah: number
  catatan?: string
}

export interface EPrescription {
  appointmentId: string
  nomorResep: string
  tanggal: string
  dokterNama: string
  dokterSIP: string
  pasienNama: string
  pasienTanggalLahir: string
  obatList: PrescriptionItem[]
  diagnosa: string
  paraf?: string
}

// ─── BOOKING SLOT ─────────────────────────────────────────────
export interface DoctorScheduleSlot {
  doctorId: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string
  isAvailable: boolean
  appointmentId?: string
}

// ─── SATUSEHAT INTEGRATION ────────────────────────────────────
export interface SatuSehatEncounterPayload {
  resourceType: 'Encounter'
  identifier: Array<{ system: string; value: string }>
  status: 'in-progress' | 'finished' | 'cancelled'
  class: { system: string; code: string; display: string }
  type: Array<{
    coding: Array<{ system: string; code: string; display: string }>
  }>
  subject: { reference: string }
  participant: Array<{ individual: { reference: string } }>
  period: { start: string; end?: string }
  serviceProvider: { reference: string }
}
