// Drferdi — vision, brought to life.
'use client'

import { Clock, MessageSquare, Phone, User, Video } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

import type { ConsultationType, CreateAppointmentInput } from '@/types/telemedicine.types'

/* ── Design tokens (white theme, docs/redesign-glass.md §3) ── */
const L = {
  border: 'var(--border)',
  text: 'var(--text)',
  muted: 'var(--text-secondary)',
  accent: 'var(--primary)',
}

interface DoctorOption {
  id: string
  name: string
  spesialisasi: string
}
interface DoctorSlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}
interface AppointmentBookingProps {
  onSuccess: (appointmentId: string) => void
  onCancel: () => void
}

const CONSULTATION_TYPES: Array<{
  value: ConsultationType
  label: string
  icon: React.ReactNode
}> = [
  { value: 'VIDEO', label: 'Video', icon: <Video size={14} /> },
  { value: 'AUDIO', label: 'Telepon', icon: <Phone size={14} /> },
  { value: 'CHAT', label: 'Chat', icon: <MessageSquare size={14} /> },
]

const DOCTORS: DoctorOption[] = [
  { id: 'ferdi', name: 'dr. Ferdi Iskandar', spesialisasi: 'Dokter Umum' },
]

function getNext7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

/* ── Shared field components ── */
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="ui-field__label" style={{ marginBottom: 8 }}>
    {children}
  </div>
)

export function AppointmentBooking({
  onSuccess,
  onCancel,
}: AppointmentBookingProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [slots, setSlots] = useState<DoctorSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(getNext7Days()[0])
  const [form, setForm] = useState<
    Partial<
      CreateAppointmentInput & {
        patientName: string
        doctorName: string
        patientPhone: string
      }
    >
  >({
    consultationType: 'VIDEO',
    durationMinutes: 15,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const days = getNext7Days()

  useEffect(() => {
    if (!form.doctorId || !selectedDate) return
    setIsLoading(true)
    fetch(`/api/telemedicine/slots?doctorId=${form.doctorId}&date=${selectedDate}`)
      .then(r => r.json())
      .then((d: { data?: DoctorSlot[] }) => setSlots(d.data ?? []))
      .catch(() => setSlots([]))
      .finally(() => setIsLoading(false))
  }, [form.doctorId, selectedDate])

  const handleSubmit = useCallback(async () => {
    if (!form.patientId || !form.doctorId || !form.scheduledAt) {
      setError('Mohon lengkapi semua data')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/telemedicine/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = (await res.json()) as {
        data?: { id: string }
        message?: string
      }
      if (!res.ok) throw new Error(data.message ?? 'Gagal membuat appointment')
      onSuccess(data.data?.id ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }, [form, onSuccess])

  const STEPS = ['Dokter & Pasien', 'Jadwal', 'Konfirmasi']
  const canNext1 = !!(form.doctorId && form.patientId)
  const canNext2 = !!form.scheduledAt

  return (
    <div>
      {/* Step indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          paddingBottom: 16,
        }}
      >
        {STEPS.map((label, i) => {
          const num = i + 1
          const isActive = step === num
          const isDone = step > num
          return (
            <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isDone || isActive ? L.accent : L.muted,
                }}
              >
                {isDone ? '✓' : null} {label}
              </span>
              {i < 2 && <span style={{ color: L.border, margin: '0 10px', fontSize: 14 }}>›</span>}
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div>
              <FieldLabel>Dokter *</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DOCTORS.map(doc => {
                  const sel = form.doctorId === doc.id
                  return (
                    <button
                      key={doc.id}
                      aria-pressed={sel}
                      onClick={() =>
                        setForm(p => ({
                          ...p,
                          doctorId: doc.id,
                          doctorName: doc.name,
                        }))
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        background: sel ? 'var(--primary-tint)' : 'var(--surface)',
                        border: `1px solid ${sel ? L.accent : L.border}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: sel ? L.accent : L.muted,
                          flexShrink: 0,
                        }}
                      >
                        <User size={16} />
                      </div>
                      <div style={{ display: 'grid', gap: 3 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: L.text,
                          }}
                        >
                          {doc.name}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: L.muted,
                          }}
                        >
                          {doc.spesialisasi}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="ui-field">
              <FieldLabel>Nama / No. RM Pasien *</FieldLabel>
              {/* patientId bisa berisi nama lengkap atau nomor RM — dipakai untuk DB dan display */}
              <input
                className="ui-input"
                placeholder="nama lengkap atau nomor rekam medis..."
                value={form.patientId ?? ''}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    patientId: e.target.value,
                    patientName: e.target.value,
                  }))
                }
              />
            </div>

            <div className="ui-field">
              <FieldLabel>No. HP Pasien (WhatsApp)</FieldLabel>
              <input
                className="ui-input"
                placeholder="08xx atau +628xx..."
                value={form.patientPhone ?? ''}
                onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value }))}
                type="tel"
              />
              <div className="ui-field__hint">pasien akan menerima link join via whatsapp</div>
            </div>

            <div>
              <FieldLabel>Tipe Konsultasi</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CONSULTATION_TYPES.map(opt => {
                  const sel = form.consultationType === opt.value
                  return (
                    <button
                      key={opt.value}
                      className="ui-chip"
                      aria-pressed={sel}
                      onClick={() => setForm(p => ({ ...p, consultationType: opt.value }))}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <div>
              <FieldLabel>Tanggal</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {days.map(d => {
                  const dateObj = new Date(d + 'T00:00:00')
                  const isSel = selectedDate === d
                  return (
                    <button
                      key={d}
                      className="ui-chip"
                      aria-pressed={isSel}
                      onClick={() => setSelectedDate(d)}
                    >
                      {dateObj.toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </button>
                  )
                })}
              </div>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '20px 0',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    border: `2px solid ${L.accent}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
            ) : slots.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: L.muted,
                  textAlign: 'center',
                  padding: '20px 0',
                }}
              >
                tidak ada slot tersedia
              </div>
            ) : (
              <div>
                <FieldLabel>Jam</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map(slot => {
                    const slotIso = `${selectedDate}T${slot.startTime}:00+07:00`
                    const isSel = form.scheduledAt === slotIso
                    return (
                      <button
                        key={slot.startTime}
                        className="ui-chip"
                        aria-pressed={isSel}
                        disabled={!slot.isAvailable}
                        onClick={() => setForm(p => ({ ...p, scheduledAt: slotIso }))}
                        style={{
                          opacity: slot.isAvailable ? 1 : 0.4,
                          cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Clock size={12} />
                        {slot.startTime}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <>
            <div className="ui-field">
              <FieldLabel>Keluhan Utama</FieldLabel>
              <textarea
                className="ui-input"
                rows={3}
                placeholder="keluhan yang ingin dikonsultasikan..."
                value={form.keluhanUtama ?? ''}
                onChange={e => setForm(p => ({ ...p, keluhanUtama: e.target.value }))}
              />
            </div>
            <div className="ui-field">
              <FieldLabel>No. SEP BPJS (opsional)</FieldLabel>
              <input
                className="ui-input"
                placeholder="nomor sep peserta bpjs..."
                value={form.bpjsNomorSEP ?? ''}
                onChange={e => setForm(p => ({ ...p, bpjsNomorSEP: e.target.value }))}
              />
            </div>

            {/* Summary */}
            <div>
              <div className="ui-field__label" style={{ marginBottom: 4 }}>
                RINGKASAN
              </div>
              {[
                ['DOKTER', form.doctorName ?? form.doctorId ?? '-'],
                ['PASIEN', form.patientName ?? form.patientId ?? '-'],
                [
                  'JADWAL',
                  form.scheduledAt
                    ? new Date(form.scheduledAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '-',
                ],
                ['DURASI', `${form.durationMinutes ?? 15} menit`],
                ['TIPE', form.consultationType ?? 'VIDEO'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: `1px solid ${L.border}`,
                  }}
                >
                  <span style={{ fontSize: 14, color: L.muted }}>{k}</span>
                  <span style={{ fontSize: 14, color: L.text }}>{v}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="ui-alert ui-alert--critical" role="alert">
                {error}
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: `1px solid ${L.border}`,
          }}
        >
          <button
            className="ui-btn ui-btn--ghost"
            onClick={step === 1 ? onCancel : () => setStep(s => (s - 1) as 1 | 2)}
          >
            {step === 1 ? 'Batal' : 'Kembali'}
          </button>

          {step < 3 ? (
            <button
              className="ui-btn ui-btn--primary"
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              disabled={step === 1 ? !canNext1 : !canNext2}
            >
              Lanjut
            </button>
          ) : (
            <button
              className="ui-btn ui-btn--primary"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      border: '2px solid var(--text-on-accent)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />{' '}
                  Menyimpan...
                </>
              ) : (
                'Buat appointment'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
