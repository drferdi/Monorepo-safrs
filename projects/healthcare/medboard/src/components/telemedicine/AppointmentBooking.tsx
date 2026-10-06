// Drferdi — vision, brought to life.
'use client'

import { Clock, MessageSquare, Phone, User, Video } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

import type { ConsultationType, CreateAppointmentInput } from '@/types/telemedicine.types'

/* ── Design tokens (theme-aware via CSS vars) ── */
const L = {
  bgPanel: 'var(--bg-card, #141414)',
  border: 'var(--line-base, rgba(255,255,255,0.08))',
  text: 'var(--text-main, #d4d4d4)',
  muted: 'var(--text-muted, #666666)',
  accent: 'var(--c-asesmen, #002147)',
  actionTone: '#101012',
  actionToneSoft: 'rgba(16,16,18,0.10)',
  actionToneBorder: 'rgba(16,16,18,0.22)',
  actionNeumorph: '1px 1px 4px rgba(0,0,0,0.14), inset 1px 1px 0 rgba(255,255,255,0.03)',
  mono: 'var(--font-mono)',
  sans: 'var(--font-sans)',
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
  { value: 'VIDEO', label: 'Video', icon: <Video size={13} /> },
  { value: 'AUDIO', label: 'Telepon', icon: <Phone size={13} /> },
  { value: 'CHAT', label: 'Chat', icon: <MessageSquare size={13} /> },
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
  <div
    style={{
      fontSize: 13,
      color: L.muted,
      marginBottom: 8,
    }}
  >
    {children}
  </div>
)

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg-canvas)',
  border: `1px solid ${L.border}`,
  borderRadius: 2,
  padding: '8px 10px',
  color: L.text,
  fontSize: 13,
  outline: 'none',
}

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
          padding: '10px 18px',
          borderBottom: `1px solid ${L.border}`,
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
                  fontSize: 13,
                  color: isDone ? L.accent : isActive ? L.accent : L.muted,
                }}
              >
                {isDone ? '✓' : `0${num}`} {label.toUpperCase()}
              </span>
              {i < 2 && <span style={{ color: L.border, margin: '0 10px', fontSize: 13 }}>›</span>}
            </div>
          )
        })}
      </div>

      <div
        style={{
          padding: '16px 18px',
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
                        background: sel ? L.actionToneSoft : 'transparent',
                        border: `1px solid ${sel ? L.actionTone : L.border}`,
                        borderRadius: 4,
                        boxShadow: sel ? L.actionNeumorph : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: `1px solid ${sel ? L.actionTone : L.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: sel ? '#ffffff' : L.muted,
                          flexShrink: 0,
                          background: 'transparent',
                        }}
                      >
                        <User size={14} />
                      </div>
                      <div style={{ display: 'grid', gap: 3 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: sel ? '#ffffff' : L.text,
                          }}
                        >
                          {doc.name}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: L.muted,
                          }}
                        >
                          {doc.spesialisasi.toUpperCase()}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <FieldLabel>Nama / No. RM Pasien *</FieldLabel>
              {/* patientId bisa berisi nama lengkap atau nomor RM — dipakai untuk DB dan display */}
              <input
                placeholder="nama lengkap atau nomor rekam medis..."
                value={form.patientId ?? ''}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    patientId: e.target.value,
                    patientName: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>

            <div>
              <FieldLabel>No. HP Pasien (WhatsApp)</FieldLabel>
              <input
                placeholder="08xx atau +628xx..."
                value={form.patientPhone ?? ''}
                onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value }))}
                style={inputStyle}
                type="tel"
              />
              <div style={{ fontSize: 13, color: L.muted, marginTop: 5 }}>
                pasien akan menerima link join via whatsapp
              </div>
            </div>

            <div>
              <FieldLabel>Tipe Konsultasi</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {CONSULTATION_TYPES.map(opt => {
                  const sel = form.consultationType === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setForm(p => ({ ...p, consultationType: opt.value }))}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '7px 0',
                        background: sel ? L.actionTone : 'transparent',
                        border: `1px solid ${sel ? 'rgba(255,255,255,0.06)' : L.border}`,
                        borderRadius: 2,
                        color: sel ? '#f1ece3' : L.muted,
                        fontSize: 13,
                        cursor: 'pointer',
                        boxShadow: sel ? L.actionNeumorph : 'none',
                        transition: 'all 0.15s ease',
                      }}
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {days.map(d => {
                  const dateObj = new Date(d + 'T00:00:00')
                  const isSel = selectedDate === d
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      style={{
                        padding: '5px 10px',
                        background: isSel ? 'rgba(0, 33, 71, 0.1)' : 'transparent',
                        border: `1px solid ${isSel ? L.accent : L.border}`,
                        borderRadius: 2,
                        color: isSel ? L.accent : L.muted,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {dateObj
                        .toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })
                        .toUpperCase()}
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
                  fontSize: 13,
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {slots.map(slot => {
                    const slotIso = `${selectedDate}T${slot.startTime}:00+07:00`
                    const isSel = form.scheduledAt === slotIso
                    return (
                      <button
                        key={slot.startTime}
                        disabled={!slot.isAvailable}
                        onClick={() => setForm(p => ({ ...p, scheduledAt: slotIso }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 10px',
                          background: !slot.isAvailable
                            ? 'transparent'
                            : isSel
                              ? 'rgba(0, 33, 71, 0.1)'
                              : 'transparent',
                          border: `1px solid ${!slot.isAvailable ? 'rgba(255,255,255,0.04)' : isSel ? L.accent : L.border}`,
                          borderRadius: 2,
                          color: !slot.isAvailable
                            ? 'rgba(255,255,255,0.15)'
                            : isSel
                              ? L.accent
                              : L.muted,
                          fontSize: 13,
                          cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Clock size={10} />
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
            <div>
              <FieldLabel>Keluhan Utama</FieldLabel>
              <textarea
                rows={3}
                placeholder="keluhan yang ingin dikonsultasikan..."
                value={form.keluhanUtama ?? ''}
                onChange={e => setForm(p => ({ ...p, keluhanUtama: e.target.value }))}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
            <div>
              <FieldLabel>No. SEP BPJS (opsional)</FieldLabel>
              <input
                placeholder="nomor sep peserta bpjs..."
                value={form.bpjsNomorSEP ?? ''}
                onChange={e => setForm(p => ({ ...p, bpjsNomorSEP: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Summary */}
            <div
              style={{
                background: 'rgba(0, 33, 71, 0.06)',
                border: `1px solid rgba(0, 33, 71, 0.2)`,
                borderRadius: 2,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: L.muted,
                  marginBottom: 8,
                }}
              >
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
                    gridTemplateColumns: '70px 1fr',
                    gap: 8,
                    padding: '3px 0',
                    borderBottom: `1px solid ${L.border}`,
                  }}
                >
                  <span style={{ fontSize: 13, color: L.muted }}>{k}</span>
                  <span style={{ fontSize: 13, color: L.text }}>{v}</span>
                </div>
              ))}
            </div>

            {error && (
              <div
                style={{
                  fontSize: 13,
                  color: '#f87171',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 2,
                  padding: '8px 12px',
                }}
              >
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
            paddingTop: 4,
            borderTop: `1px solid ${L.border}`,
          }}
        >
          <button
            onClick={step === 1 ? onCancel : () => setStep(s => (s - 1) as 1 | 2)}
            style={{
              fontSize: 13,
              color: L.muted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            {step === 1 ? 'BATAL' : '← KEMBALI'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              disabled={step === 1 ? !canNext1 : !canNext2}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                background: (step === 1 ? !canNext1 : !canNext2)
                  ? 'transparent'
                  : 'rgba(0, 33, 71, 0.15)',
                border: `1px solid ${(step === 1 ? !canNext1 : !canNext2) ? L.border : L.accent}`,
                borderRadius: 2,
                color: (step === 1 ? !canNext1 : !canNext2) ? L.muted : L.accent,
                fontSize: 13,
                cursor: (step === 1 ? !canNext1 : !canNext2) ? 'not-allowed' : 'pointer',
              }}
            >
              LANJUT →
            </button>
          ) : (
            <button
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                background: 'rgba(0, 33, 71, 0.15)',
                border: `1px solid ${L.accent}`,
                borderRadius: 2,
                color: L.accent,
                fontSize: 13,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? (
                <>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      border: `2px solid ${L.accent}`,
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />{' '}
                  MENYIMPAN...
                </>
              ) : (
                '✓ BUAT APPOINTMENT'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
