'use client'

import type React from 'react'

// ============================================================
// PKM Dashboard — EPrescriptionModal Component
// ============================================================

import { CheckCircle, Plus, Printer, Trash2, X } from 'lucide-react'
import { useCallback, useState } from 'react'

import type { AppointmentWithDetails, PrescriptionItem } from '@/types/telemedicine.types'

interface EPrescriptionModalProps {
  open: boolean
  appointment: AppointmentWithDetails
  onClose: () => void
}

const BENTUK_SEDIAAN = [
  'Tablet',
  'Kapsul',
  'Sirup',
  'Sirup Kering',
  'Injeksi',
  'Salep',
  'Krim',
  'Tetes Mata',
  'Tetes Telinga',
  'Inhaler',
  'Suppositoria',
  'Puyer',
]
const ATURAN_MINUM_PRESET = ['1x1', '2x1', '3x1', '4x1', '1x½', '2x½', 'Jika Perlu (k/p)']

const EMPTY_ITEM: PrescriptionItem = {
  namaObat: '',
  bentukSediaan: 'Tablet',
  dosis: '',
  aturanMinum: '',
  jumlah: 10,
  catatan: '',
}

export function EPrescriptionModal({
  open,
  appointment,
  onClose,
}: EPrescriptionModalProps): React.JSX.Element | null {
  const [items, setItems] = useState<PrescriptionItem[]>([{ ...EMPTY_ITEM }])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleAddItem = useCallback(() => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }])
  }, [])

  const handleRemoveItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpdateItem = useCallback(
    <K extends keyof PrescriptionItem>(index: number, field: K, value: PrescriptionItem[K]) => {
      setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
    },
    []
  )

  const handleSave = useCallback(async () => {
    const validItems = items.filter(i => i.namaObat.trim().length > 0)
    if (validItems.length === 0) return

    setIsSaving(true)
    try {
      // Fix: API expects { obatList: [...] }
      const res = await fetch(`/api/telemedicine/appointments/${appointment.id}/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obatList: validItems }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan resep')
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('[EPrescriptionModal]', err)
    } finally {
      setIsSaving(false)
    }
  }, [items, appointment.id, onClose])

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
          maxWidth: 720,
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
              Resep Digital (e-Prescription)
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
            gap: 12,
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid var(--line-base)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Obat #{index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    style={{
                      color: '#f87171',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                {/* Nama Obat */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldLabel>Nama Obat *</FieldLabel>
                  <input
                    placeholder="Paracetamol, Amoxicillin..."
                    value={item.namaObat}
                    onChange={e => handleUpdateItem(index, 'namaObat', e.target.value)}
                    style={inputSm}
                  />
                </div>

                {/* Bentuk Sediaan */}
                <div>
                  <FieldLabel>Bentuk Sediaan</FieldLabel>
                  <select
                    value={item.bentukSediaan}
                    onChange={e => handleUpdateItem(index, 'bentukSediaan', e.target.value)}
                    style={inputSm}
                  >
                    {BENTUK_SEDIAAN.map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Dosis */}
                <div>
                  <FieldLabel>Dosis *</FieldLabel>
                  <input
                    placeholder="500mg, 250mg/5ml..."
                    value={item.dosis}
                    onChange={e => handleUpdateItem(index, 'dosis', e.target.value)}
                    style={inputSm}
                  />
                </div>

                {/* Aturan Minum */}
                <div>
                  <FieldLabel>Aturan Minum *</FieldLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      style={{ ...inputSm, flex: 1 }}
                      value={ATURAN_MINUM_PRESET.includes(item.aturanMinum) ? item.aturanMinum : ''}
                      onChange={e => {
                        if (e.target.value) handleUpdateItem(index, 'aturanMinum', e.target.value)
                      }}
                    >
                      <option value="">Pilih...</option>
                      {ATURAN_MINUM_PRESET.map(a => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                    <input
                      placeholder="custom"
                      value={item.aturanMinum}
                      onChange={e => handleUpdateItem(index, 'aturanMinum', e.target.value)}
                      style={{ ...inputSm, width: 70 }}
                    />
                  </div>
                </div>

                {/* Jumlah */}
                <div>
                  <FieldLabel>Jumlah</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={item.jumlah}
                    onChange={e =>
                      handleUpdateItem(index, 'jumlah', Number.parseInt(e.target.value) || 1)
                    }
                    style={inputSm}
                  />
                </div>

                {/* Catatan */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <FieldLabel>Catatan</FieldLabel>
                  <input
                    placeholder="Diminum sesudah makan..."
                    value={item.catatan ?? ''}
                    onChange={e => handleUpdateItem(index, 'catatan', e.target.value)}
                    style={inputSm}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '10px',
              border: '1px dashed var(--line-base)',
              background: 'none',
              borderRadius: 10,
              color: 'var(--text-muted)',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            <Plus size={15} /> Tambah Obat
          </button>
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
              fontSize: 14,
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
              background: saved ? 'rgba(16,185,129,0.85)' : 'rgba(16,185,129,0.7)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving || saved ? 'not-allowed' : 'pointer',
              opacity: isSaving || saved ? 0.85 : 1,
            }}
          >
            {saved ? (
              <>
                <CheckCircle size={15} /> Resep Tersimpan!
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
              <>
                <Printer size={15} /> Simpan Resep
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputSm: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--line-base)',
  borderRadius: 6,
  padding: '8px 10px',
  color: 'var(--text-main)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

function FieldLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <label
      style={{
        color: 'var(--text-muted)',
        fontSize: 14,
        fontWeight: 600,
        display: 'block',
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  )
}
