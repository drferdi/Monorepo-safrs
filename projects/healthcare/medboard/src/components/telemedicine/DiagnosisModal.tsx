'use client'

import type React from 'react'

// ============================================================
// PKM Dashboard — DiagnosisModal Component
// ============================================================

import { AlertCircle, CheckCircle, Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { z } from 'zod'

import type { AppointmentWithDetails } from '@/types/telemedicine.types'

interface DiagnosisModalProps {
  open: boolean
  appointment: AppointmentWithDetails
  onClose: () => void
}

interface IcdSearchResult {
  code: string
  description: string
  pCareCode?: string
}

const diagnosisSchema = z.object({
  anamnesis: z.string().min(10, 'Minimal 10 karakter'),
  pemeriksaan: z.string().min(5, 'Minimal 5 karakter'),
  diagnosaICD10: z.string().min(3, 'Pilih kode ICD-10'),
  diagnosis: z.string().min(3, 'Label diagnosis wajib diisi'),
  tatalaksana: z.string().min(10, 'Minimal 10 karakter'),
  rujukan: z.boolean(),
  rujukanTujuan: z.string().optional(),
})

type DiagnosisForm = z.infer<typeof diagnosisSchema>

export function DiagnosisModal({
  open,
  appointment,
  onClose,
}: DiagnosisModalProps): React.JSX.Element | null {
  const [form, setForm] = useState<Partial<DiagnosisForm>>({ rujukan: false })
  const [icdSearch, setIcdSearch] = useState('')
  const [icdResults, setIcdResults] = useState<IcdSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof DiagnosisForm, string>>>({})
  const [saved, setSaved] = useState(false)

  // Fix: gunakan /api/icdx/lookup bukan /api/icd-converter/search
  const handleIcdSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setIcdResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/icdx/lookup?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean
          results?: IcdSearchResult[]
          data?: IcdSearchResult[]
        }
        setIcdResults(data.results ?? data.data ?? [])
      }
    } catch {
      setIcdResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSelectIcd = useCallback((result: IcdSearchResult) => {
    setForm(prev => ({
      ...prev,
      diagnosaICD10: result.code,
      diagnosis: result.description,
    }))
    setIcdSearch(`${result.code} — ${result.description}`)
    setIcdResults([])
  }, [])

  const handleSave = useCallback(async () => {
    const parsed = diagnosisSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: typeof errors = {}
      parsed.error.issues.forEach(e => {
        const field = e.path[0] as keyof DiagnosisForm
        fieldErrors[field] = e.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/telemedicine/appointments/${appointment.id}/diagnosis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (!res.ok) throw new Error('Gagal menyimpan diagnosis')
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('[DiagnosisModal]', err)
    } finally {
      setIsSaving(false)
    }
  }, [form, appointment.id, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--bg-nav)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--line-base)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--line-base)',
          }}
        >
          <div>
            <h2
              style={{
                color: 'var(--text-main)',
                fontSize: 16,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Input Diagnosis
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 14,
                margin: '4px 0 0',
              }}
            >
              Appointment #{appointment.id.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <FormField label="Anamnesis *" error={errors.anamnesis}>
            <textarea
              rows={3}
              placeholder="Keluhan utama, riwayat penyakit sekarang..."
              value={form.anamnesis ?? ''}
              onChange={e => setForm(p => ({ ...p, anamnesis: e.target.value }))}
              style={textareaStyle}
            />
          </FormField>

          <FormField label="Pemeriksaan Fisik *" error={errors.pemeriksaan}>
            <textarea
              rows={3}
              placeholder="TD: 120/80 mmHg, Nadi: 80x/mnt, RR: 20x/mnt..."
              value={form.pemeriksaan ?? ''}
              onChange={e => setForm(p => ({ ...p, pemeriksaan: e.target.value }))}
              style={textareaStyle}
            />
          </FormField>

          <FormField label="Diagnosis (ICD-10) *" error={errors.diagnosaICD10}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--line-base)',
                  borderRadius: 8,
                  padding: '0 12px',
                }}
              >
                <Search
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari kode ICD-10... (contoh: diare, hipertensi, A09)"
                  value={icdSearch}
                  onChange={e => {
                    setIcdSearch(e.target.value)
                    void handleIcdSearch(e.target.value)
                  }}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-main)',
                    fontSize: 13,
                    padding: '10px 0',
                  }}
                />
                {isSearching && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid var(--c-asesmen)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                )}
              </div>
              {icdResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'var(--bg-nav)',
                    border: '1px solid var(--line-base)',
                    borderRadius: 8,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    zIndex: 10,
                    overflow: 'hidden',
                  }}
                >
                  {icdResults.map(r => (
                    <button
                      key={r.code}
                      onClick={() => handleSelectIcd(r)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid var(--line-base)',
                        cursor: 'pointer',
                        display: 'block',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--c-asesmen)',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {r.code}
                      </span>
                      <span
                        style={{
                          color: 'var(--text-main)',
                          fontSize: 13,
                          marginLeft: 8,
                        }}
                      >
                        {r.description}
                      </span>
                      {r.pCareCode && (
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: 13,
                            marginLeft: 8,
                          }}
                        >
                          (P-Care: {r.pCareCode})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Tatalaksana *" error={errors.tatalaksana}>
            <textarea
              rows={3}
              placeholder="Terapi farmakologi dan non-farmakologi..."
              value={form.tatalaksana ?? ''}
              onChange={e => setForm(p => ({ ...p, tatalaksana: e.target.value }))}
              style={textareaStyle}
            />
          </FormField>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="rujukan"
              type="checkbox"
              checked={form.rujukan}
              onChange={e => setForm(p => ({ ...p, rujukan: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--c-asesmen)' }}
            />
            <label htmlFor="rujukan" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Perlu rujukan ke fasilitas lanjutan
            </label>
          </div>

          {form.rujukan && (
            <FormField label="Tujuan Rujukan" error={errors.rujukanTujuan}>
              <input
                placeholder="RSUD, Poli Spesialis..."
                value={form.rujukanTujuan ?? ''}
                onChange={e => setForm(p => ({ ...p, rujukanTujuan: e.target.value }))}
                style={inputStyle}
              />
            </FormField>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            padding: '16px 24px',
            borderTop: '1px solid var(--line-base)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              padding: '8px 16px',
            }}
          >
            Batal
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || saved}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              background: saved ? 'rgba(16,185,129,0.8)' : 'rgba(59,130,246,0.85)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isSaving || saved ? 'not-allowed' : 'pointer',
              opacity: isSaving || saved ? 0.85 : 1,
            }}
          >
            {saved ? (
              <>
                <CheckCircle size={15} /> Tersimpan!
              </>
            ) : isSaving ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid #fff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Menyimpan...
              </>
            ) : (
              'Simpan Diagnosis'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--line-base)',
  borderRadius: 8,
  padding: '10px 12px',
  color: 'var(--text-main)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'none',
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div>
      <label
        style={{
          color: 'var(--text-muted)',
          fontSize: 14,
          fontWeight: 600,
          display: 'block',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#f87171',
            fontSize: 13,
            marginTop: 4,
          }}
        >
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}
