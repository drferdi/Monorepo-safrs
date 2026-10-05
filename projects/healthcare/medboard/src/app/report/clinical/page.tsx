'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClinicalReport } from '@/lib/report/clinical-report'

type Mode = 'list' | 'form' | 'preview'
type ClinicalReportFormState = Omit<
  ClinicalReport,
  'id' | 'nomor' | 'createdAt' | 'pdfAvailable' | 'pdfGeneratedAt' | 'auditTrail'
>

const EMPTY_FORM: ClinicalReportFormState = {
  pasien: { noRM: '', nama: '', umur: '', jenisKelamin: 'L', alamat: '' },
  anamnesa: { keluhanUtama: '', rps: '', rpd: '', rpk: '', alergi: '' },
  pemeriksaanFisik: {
    tdSistolik: '',
    tdDiastolik: '',
    nadi: '',
    suhu: '',
    napas: '',
    spo2: '',
    bb: '',
    tb: '',
    keadaanUmum: 'Baik',
    kesadaran: 'Compos Mentis',
    pemeriksaanLain: '',
  },
  asesmen: {
    diagnosisKerja: '',
    icd10: '',
    diagnosisBanding: '',
    prognosis: 'Dubia ad bonam',
  },
  tataLaksana: { terapi: '', tindakan: '', edukasi: '', tindakLanjut: '' },
  penutup: {
    dokter: '',
    perawat: '',
    tanggalPemeriksaan: '',
    jamPemeriksaan: '',
  },
}

const PAGE_W = 1100

/* ─── Helpers ─── */
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function nowTime() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ═══════════════════════════════════════════════ */
export default function ClinicalReportPage() {
  const searchParams = useSearchParams()
  const autoViewId = searchParams.get('id')

  const [mode, setMode] = useState<Mode>(autoViewId ? 'preview' : 'list')
  const [reports, setReports] = useState<ClinicalReport[]>([])
  const [nextNumber, setNextNumber] = useState(1)
  const [form, setForm] = useState<ClinicalReportFormState>(structuredClone(EMPTY_FORM))
  const [selected, setSelected] = useState<ClinicalReport | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  /* ─── Data fetching ─── */
  const loadReports = useCallback(async () => {
    try {
      const res = await fetch('/api/report/clinical', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        ok: boolean
        reports: ClinicalReport[]
        nextNumber: number
      }
      if (data.ok) {
        setReports(data.reports)
        setNextNumber(data.nextNumber)
        // Auto-open preview if ?id= is present
        if (autoViewId) {
          const match = data.reports.find((r: ClinicalReport) => r.id === autoViewId)
          if (match) {
            setSelected(match)
            setMode('preview')
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [autoViewId])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  /* ─── Actions ─── */
  const startNew = () => {
    const f = structuredClone(EMPTY_FORM)
    const pad3 = String(nextNumber).padStart(3, '0')
    const pad4 = String(nextNumber).padStart(4, '0')
    f.pasien.noRM = `PKM-BLW-${pad4}`
    f.pasien.nama = `Pasien ${pad3}`
    f.penutup.dokter = 'dr. Ferdi Iskandar'
    f.penutup.perawat = 'Joseph Arianto'
    f.penutup.tanggalPemeriksaan = todayStr()
    f.penutup.jamPemeriksaan = nowTime()
    setForm(f)
    setMode('form')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/report/clinical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, auditTrail: {} }),
      })
      const data = (await res.json()) as {
        ok: boolean
        report: ClinicalReport
      }
      if (data.ok) {
        setSelected(data.report)
        setMode('preview')
        await loadReports()
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const viewReport = (r: ClinicalReport) => {
    setSelected(r)
    setMode('preview')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDelete = async (reportId: string) => {
    if (!confirm('Hapus laporan ini? Tindakan tidak dapat dibatalkan.')) return
    try {
      const res = await fetch(`/api/report/clinical?id=${reportId}`, {
        method: 'DELETE',
      })
      const data = (await res.json()) as { ok: boolean }
      if (data.ok) {
        if (selected?.id === reportId) {
          setSelected(null)
          setMode('list')
        }
        await loadReports()
      }
    } catch {
      /* ignore */
    }
  }

  /* ─── Form updaters ─── */
  const up = <S extends keyof ClinicalReportFormState>(
    section: S,
    field: keyof ClinicalReportFormState[S] & string,
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
  }

  /* ─── Shared styles ─── */
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: '0.12em',
    color: 'var(--text-muted)',
    marginBottom: 4,
    display: 'block',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 14,
    background: 'var(--bg-card)',
    color: 'var(--text-main)',
    border: '1px solid var(--line-base)',
    outline: 'none',
    transition: 'border-color 0.15s',
  }
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 60,
    resize: 'vertical',
    fontFamily: 'inherit',
  }
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    letterSpacing: '0.15em',
    color: 'var(--c-asesmen)',
    borderBottom: '1px solid var(--line-base)',
    paddingBottom: 6,
    marginBottom: 16,
    marginTop: 32,
  }
  const btnStyle: React.CSSProperties = {
    fontSize: 13,
    letterSpacing: '0.1em',
    padding: '8px 20px',
    background: '#101012',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.92)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  }

  /* ═══════════════ PRINT STYLES ═══════════════ */
  const printStyles = `
    @media print {
      body * { visibility: hidden !important; }
      #clinical-report-print, #clinical-report-print * { visibility: visible !important; }
      #clinical-report-print {
        position: fixed !important; left: 0 !important; top: 0 !important;
        width: 210mm !important; padding: 15mm !important;
        background: white !important; color: #111 !important;
        font-size: 11pt !important;
      }
      #clinical-report-print .print-section-title {
        color: #333 !important; border-bottom: 1px solid #999 !important;
      }
      #clinical-report-print .print-label {
        color: #555 !important;
      }
      #clinical-report-print .print-header {
        border-bottom: 2px solid #111 !important;
      }
      .no-print { display: none !important; }
    }
  `

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* ── Header ── */}
      <div
        className="page-header no-print"
        style={{
          maxWidth: PAGE_W,
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div className="page-title">Laporan Klinis</div>
          <div className="page-subtitle">Rekam Medis Kunjungan — UPTD Puskesmas Balowerti</div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          {mode !== 'list' && (
            <button style={btnStyle} onClick={() => setMode('list')}>
              KEMBALI
            </button>
          )}
          {mode === 'list' && (
            <button
              style={{
                ...btnStyle,
                borderColor: 'var(--c-asesmen)',
                color: 'var(--c-asesmen)',
              }}
              onClick={startNew}
            >
              BUAT LAPORAN BARU
            </button>
          )}
          {mode === 'preview' && (
            <button
              style={{
                ...btnStyle,
                borderColor: 'var(--c-asesmen)',
                color: 'var(--c-asesmen)',
              }}
              onClick={handlePrint}
            >
              CETAK / PDF
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════ LIST MODE ═══════════════ */}
      {mode === 'list' && (
        <div style={{ maxWidth: PAGE_W, width: '100%' }}>
          {loading ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-muted)',
                letterSpacing: '0.15em',
              }}
            >
              MEMUAT DATA...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.15em',
                  marginBottom: 16,
                }}
              >
                BELUM ADA LAPORAN KLINIS
              </div>
              <button
                style={{
                  ...btnStyle,
                  borderColor: 'var(--c-asesmen)',
                  color: 'var(--c-asesmen)',
                }}
                onClick={startNew}
              >
                BUAT LAPORAN PERTAMA
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                }}
              >
                {reports.length} LAPORAN TERSIMPAN
              </div>

              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 160px 180px 1fr 140px 120px 60px',
                  gap: 12,
                  padding: '0 0 8px',
                  borderBottom: '1px solid var(--line-base)',
                }}
              >
                {['No', 'No. RM', 'Pasien', 'Diagnosis', 'Dokter', 'Tanggal', ''].map(h => (
                  <span key={h} className="v-label">
                    {h}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {reports.map(r => (
                <div
                  key={r.id}
                  onClick={() => viewReport(r)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 160px 180px 1fr 140px 120px 60px',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px dashed var(--line-base)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,236,230,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 13, color: 'var(--c-asesmen)' }}>
                    {String(r.nomor).padStart(3, '0')}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {r.pasien.noRM}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-main)' }}>
                    {r.pasien.nama}
                    {r.pasien.umur && (
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          marginLeft: 6,
                        }}
                      >
                        ({r.pasien.umur})
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-main)' }}>
                    {r.asesmen.diagnosisKerja || '—'}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {r.penutup.dokter || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.penutup.tanggalPemeriksaan || r.createdAt.slice(0, 10)}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      void handleDelete(r.id)
                    }}
                    style={{
                      ...btnStyle,
                      padding: '4px 8px',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                    title="Hapus laporan"
                  >
                    HAPUS
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ═══════════════ FORM MODE ═══════════════ */}
      {mode === 'form' && (
        <div style={{ maxWidth: PAGE_W, width: '100%' }}>
          {/* ── 1. IDENTITAS PASIEN ── */}
          <div style={sectionTitleStyle}>01 — IDENTITAS PASIEN</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>NO. REKAM MEDIS</label>
              <input
                style={{ ...inputStyle, color: 'var(--c-asesmen)' }}
                value={form.pasien.noRM}
                readOnly
              />
            </div>
            <div>
              <label style={labelStyle}>NAMA PASIEN</label>
              <input style={inputStyle} value={form.pasien.nama} readOnly />
            </div>
            <div>
              <label style={labelStyle}>UMUR</label>
              <input
                style={inputStyle}
                value={form.pasien.umur}
                placeholder="contoh: 45 tahun"
                onChange={e => up('pasien', 'umur', e.target.value)}
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr',
              gap: 16,
              marginTop: 12,
            }}
          >
            <div>
              <label style={labelStyle}>JENIS KELAMIN</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                {(['L', 'P'] as const).map(g => (
                  <label
                    key={g}
                    style={{
                      fontSize: 14,
                      color:
                        form.pasien.jenisKelamin === g ? 'var(--text-main)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <input
                      type="radio"
                      name="jk"
                      checked={form.pasien.jenisKelamin === g}
                      onChange={() => up('pasien', 'jenisKelamin', g)}
                    />
                    {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>ALAMAT</label>
              <input
                style={inputStyle}
                value={form.pasien.alamat}
                placeholder="Alamat pasien"
                onChange={e => up('pasien', 'alamat', e.target.value)}
              />
            </div>
          </div>

          {/* ── 2. ANAMNESA (S) ── */}
          <div style={sectionTitleStyle}>02 — ANAMNESA (SUBJEKTIF)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>KELUHAN UTAMA</label>
              <textarea
                style={textareaStyle}
                value={form.anamnesa.keluhanUtama}
                onChange={e => up('anamnesa', 'keluhanUtama', e.target.value)}
                placeholder="Keluhan yang membawa pasien datang..."
              />
            </div>
            <div>
              <label style={labelStyle}>RIWAYAT PENYAKIT SEKARANG (RPS)</label>
              <textarea
                style={{ ...textareaStyle, minHeight: 80 }}
                value={form.anamnesa.rps}
                onChange={e => up('anamnesa', 'rps', e.target.value)}
                placeholder="Onset, lokasi, durasi, karakteristik, faktor pemberat/peringan..."
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>RPD (RIWAYAT PENYAKIT DAHULU)</label>
                <textarea
                  style={textareaStyle}
                  value={form.anamnesa.rpd}
                  onChange={e => up('anamnesa', 'rpd', e.target.value)}
                  placeholder="DM, HT, Asma..."
                />
              </div>
              <div>
                <label style={labelStyle}>RPK (RIWAYAT PENYAKIT KELUARGA)</label>
                <textarea
                  style={textareaStyle}
                  value={form.anamnesa.rpk}
                  onChange={e => up('anamnesa', 'rpk', e.target.value)}
                  placeholder="DM, HT, Ca..."
                />
              </div>
              <div>
                <label style={labelStyle}>ALERGI</label>
                <textarea
                  style={textareaStyle}
                  value={form.anamnesa.alergi}
                  onChange={e => up('anamnesa', 'alergi', e.target.value)}
                  placeholder="Obat, makanan, lainnya..."
                />
              </div>
            </div>
          </div>

          {/* ── 3. PEMERIKSAAN FISIK (O) ── */}
          <div style={sectionTitleStyle}>03 — PEMERIKSAAN FISIK (OBJEKTIF)</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>TD SISTOLIK (mmHg)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.tdSistolik}
                onChange={e => up('pemeriksaanFisik', 'tdSistolik', e.target.value)}
                placeholder="120"
              />
            </div>
            <div>
              <label style={labelStyle}>TD DIASTOLIK (mmHg)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.tdDiastolik}
                onChange={e => up('pemeriksaanFisik', 'tdDiastolik', e.target.value)}
                placeholder="80"
              />
            </div>
            <div>
              <label style={labelStyle}>NADI (x/mnt)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.nadi}
                onChange={e => up('pemeriksaanFisik', 'nadi', e.target.value)}
                placeholder="80"
              />
            </div>
            <div>
              <label style={labelStyle}>NAPAS (x/mnt)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.napas}
                onChange={e => up('pemeriksaanFisik', 'napas', e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <label style={labelStyle}>SUHU (°C)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={form.pemeriksaanFisik.suhu}
                onChange={e => up('pemeriksaanFisik', 'suhu', e.target.value)}
                placeholder="36.5"
              />
            </div>
            <div>
              <label style={labelStyle}>SpO2 (%)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.spo2}
                onChange={e => up('pemeriksaanFisik', 'spo2', e.target.value)}
                placeholder="98"
              />
            </div>
            <div>
              <label style={labelStyle}>BB (kg)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.bb}
                onChange={e => up('pemeriksaanFisik', 'bb', e.target.value)}
                placeholder="70"
              />
            </div>
            <div>
              <label style={labelStyle}>TB (cm)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.pemeriksaanFisik.tb}
                onChange={e => up('pemeriksaanFisik', 'tb', e.target.value)}
                placeholder="170"
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <label style={labelStyle}>KEADAAN UMUM</label>
              <select
                style={inputStyle}
                value={form.pemeriksaanFisik.keadaanUmum}
                onChange={e => up('pemeriksaanFisik', 'keadaanUmum', e.target.value)}
              >
                <option>Baik</option>
                <option>Sedang</option>
                <option>Lemah</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>KESADARAN</label>
              <select
                style={inputStyle}
                value={form.pemeriksaanFisik.kesadaran}
                onChange={e => up('pemeriksaanFisik', 'kesadaran', e.target.value)}
              >
                <option>Compos Mentis</option>
                <option>Apatis</option>
                <option>Somnolen</option>
                <option>Sopor</option>
                <option>Koma</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>PEMERIKSAAN FISIK LAIN</label>
            <textarea
              style={{ ...textareaStyle, minHeight: 80 }}
              value={form.pemeriksaanFisik.pemeriksaanLain}
              onChange={e => up('pemeriksaanFisik', 'pemeriksaanLain', e.target.value)}
              placeholder="Kepala, Leher, Thorax, Abdomen, Ekstremitas..."
            />
          </div>

          {/* ── 4. ASESMEN (A) ── */}
          <div style={sectionTitleStyle}>04 — ASESMEN</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px',
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>DIAGNOSIS KERJA</label>
              <input
                style={inputStyle}
                value={form.asesmen.diagnosisKerja}
                onChange={e => up('asesmen', 'diagnosisKerja', e.target.value)}
                placeholder="Diagnosis utama"
              />
            </div>
            <div>
              <label style={labelStyle}>KODE ICD-10</label>
              <input
                style={inputStyle}
                value={form.asesmen.icd10}
                onChange={e => up('asesmen', 'icd10', e.target.value)}
                placeholder="J06.9"
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <label style={labelStyle}>DIAGNOSIS BANDING</label>
              <textarea
                style={textareaStyle}
                value={form.asesmen.diagnosisBanding}
                onChange={e => up('asesmen', 'diagnosisBanding', e.target.value)}
                placeholder="DD/ ..."
              />
            </div>
            <div>
              <label style={labelStyle}>PROGNOSIS</label>
              <select
                style={inputStyle}
                value={form.asesmen.prognosis}
                onChange={e => up('asesmen', 'prognosis', e.target.value)}
              >
                <option>Dubia ad bonam</option>
                <option>Bonam</option>
                <option>Dubia ad malam</option>
                <option>Malam</option>
              </select>
            </div>
          </div>

          {/* ── 5. TATA LAKSANA (P) ── */}
          <div style={sectionTitleStyle}>05 — TATA LAKSANA (PLAN)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>TERAPI / RESEP</label>
              <textarea
                style={{ ...textareaStyle, minHeight: 80 }}
                value={form.tataLaksana.terapi}
                onChange={e => up('tataLaksana', 'terapi', e.target.value)}
                placeholder="R/ Paracetamol 500mg 3x1&#10;R/ Amoxicillin 500mg 3x1"
              />
            </div>
            <div>
              <label style={labelStyle}>TINDAKAN</label>
              <textarea
                style={{ ...textareaStyle, minHeight: 80 }}
                value={form.tataLaksana.tindakan}
                onChange={e => up('tataLaksana', 'tindakan', e.target.value)}
                placeholder="Rawat luka, nebulizer, injeksi..."
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <label style={labelStyle}>EDUKASI</label>
              <textarea
                style={textareaStyle}
                value={form.tataLaksana.edukasi}
                onChange={e => up('tataLaksana', 'edukasi', e.target.value)}
                placeholder="Edukasi pasien dan keluarga..."
              />
            </div>
            <div>
              <label style={labelStyle}>RENCANA TINDAK LANJUT</label>
              <textarea
                style={textareaStyle}
                value={form.tataLaksana.tindakLanjut}
                onChange={e => up('tataLaksana', 'tindakLanjut', e.target.value)}
                placeholder="Kontrol 3 hari, rujuk jika..."
              />
            </div>
          </div>

          {/* ── 6. PENUTUP ── */}
          <div style={sectionTitleStyle}>06 — PENUTUP</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>DOKTER PEMERIKSA</label>
              <input
                style={inputStyle}
                value={form.penutup.dokter}
                onChange={e => up('penutup', 'dokter', e.target.value)}
                placeholder="dr. ..."
              />
            </div>
            <div>
              <label style={labelStyle}>PERAWAT</label>
              <input
                style={inputStyle}
                value={form.penutup.perawat}
                onChange={e => up('penutup', 'perawat', e.target.value)}
                placeholder="Ns. ..."
              />
            </div>
            <div>
              <label style={labelStyle}>TANGGAL PEMERIKSAAN</label>
              <input
                style={inputStyle}
                type="date"
                value={form.penutup.tanggalPemeriksaan}
                onChange={e => up('penutup', 'tanggalPemeriksaan', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>JAM</label>
              <input
                style={inputStyle}
                value={form.penutup.jamPemeriksaan}
                onChange={e => up('penutup', 'jamPemeriksaan', e.target.value)}
                placeholder="08:30"
              />
            </div>
          </div>

          {/* ── Save button ── */}
          <div
            style={{
              marginTop: 40,
              marginBottom: 40,
              display: 'flex',
              gap: 12,
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...btnStyle,
                padding: '12px 32px',
                fontSize: 14,
                borderColor: 'var(--c-asesmen)',
                color: 'var(--c-asesmen)',
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? 'MENYIMPAN...' : 'SIMPAN & LIHAT LAPORAN'}
            </button>
            <button style={btnStyle} onClick={() => setMode('list')}>
              BATAL
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ PREVIEW MODE ═══════════════ */}
      {mode === 'preview' && selected && (
        <>
          {/* Preview controls (hidden on print) */}
          <div
            className="no-print"
            style={{
              maxWidth: PAGE_W,
              width: '100%',
              marginBottom: 16,
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              style={{
                ...btnStyle,
                borderColor: 'var(--c-asesmen)',
                color: 'var(--c-asesmen)',
              }}
              onClick={handlePrint}
            >
              CETAK / PDF
            </button>
            <button style={btnStyle} onClick={startNew}>
              BUAT BARU
            </button>
            <button
              style={{
                ...btnStyle,
                color: 'rgba(239,68,68,0.7)',
                borderColor: 'rgba(239,68,68,0.2)',
              }}
              onClick={() => void handleDelete(selected.id)}
            >
              HAPUS
            </button>
          </div>

          {/* Printable report */}
          <div
            id="clinical-report-print"
            ref={printRef}
            style={{
              maxWidth: PAGE_W,
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-base)',
              padding: 40,
            }}
          >
            {/* Letterhead */}
            <div
              className="print-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid var(--c-asesmen)',
                paddingBottom: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    letterSpacing: '0.04em',
                  }}
                >
                  UPTD PUSKESMAS PONED BALOWERTI
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  Jl. Balowerti No. 2, Kota Kediri, Jawa Timur
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Kepala: drg. Endah Retno W.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--c-asesmen)',
                    letterSpacing: '0.08em',
                  }}
                >
                  REKAM MEDIS KUNJUNGAN
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {selected.id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDate(selected.createdAt)}
                </div>
              </div>
            </div>

            {/* Patient info bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                gap: 16,
                padding: '12px 16px',
                marginBottom: 24,
                background: 'rgba(230,126,34,0.06)',
                border: '1px solid var(--line-base)',
              }}
            >
              {(
                [
                  ['NO. RM', selected.pasien.noRM],
                  ['NAMA', selected.pasien.nama],
                  ['UMUR', selected.pasien.umur || '—'],
                  ['JK', selected.pasien.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'],
                  ['ALAMAT', selected.pasien.alamat || '—'],
                ] as [string, string][]
              ).map(([l, v]) => (
                <div key={l}>
                  <div
                    className="print-label"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                      marginBottom: 2,
                    }}
                  >
                    {l}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* S — Subjektif */}
            <ReportSection title="SUBJEKTIF (S) — ANAMNESA">
              <ReportField label="Keluhan Utama" value={selected.anamnesa.keluhanUtama} />
              <ReportField label="Riwayat Penyakit Sekarang" value={selected.anamnesa.rps} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16,
                }}
              >
                <ReportField label="RPD" value={selected.anamnesa.rpd} />
                <ReportField label="RPK" value={selected.anamnesa.rpk} />
                <ReportField label="Alergi" value={selected.anamnesa.alergi} />
              </div>
            </ReportSection>

            {/* O — Objektif */}
            <ReportSection title="OBJEKTIF (O) — PEMERIKSAAN FISIK">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 16,
                }}
              >
                <ReportField
                  label="Tekanan Darah"
                  value={
                    selected.pemeriksaanFisik.tdSistolik && selected.pemeriksaanFisik.tdDiastolik
                      ? `${selected.pemeriksaanFisik.tdSistolik}/${selected.pemeriksaanFisik.tdDiastolik} mmHg`
                      : '—'
                  }
                />
                <ReportField
                  label="Nadi"
                  value={
                    selected.pemeriksaanFisik.nadi ? `${selected.pemeriksaanFisik.nadi} x/mnt` : '—'
                  }
                />
                <ReportField
                  label="Suhu"
                  value={
                    selected.pemeriksaanFisik.suhu ? `${selected.pemeriksaanFisik.suhu} °C` : '—'
                  }
                />
                <ReportField
                  label="Napas"
                  value={
                    selected.pemeriksaanFisik.napas
                      ? `${selected.pemeriksaanFisik.napas} x/mnt`
                      : '—'
                  }
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 16,
                  marginTop: 12,
                }}
              >
                <ReportField
                  label="SpO2"
                  value={
                    selected.pemeriksaanFisik.spo2 ? `${selected.pemeriksaanFisik.spo2}%` : '—'
                  }
                />
                <ReportField
                  label="Berat Badan"
                  value={selected.pemeriksaanFisik.bb ? `${selected.pemeriksaanFisik.bb} kg` : '—'}
                />
                <ReportField
                  label="Tinggi Badan"
                  value={selected.pemeriksaanFisik.tb ? `${selected.pemeriksaanFisik.tb} cm` : '—'}
                />
                <ReportField
                  label="IMT"
                  value={
                    selected.pemeriksaanFisik.bb && selected.pemeriksaanFisik.tb
                      ? (
                          Number.parseFloat(selected.pemeriksaanFisik.bb) /
                          (Number.parseFloat(selected.pemeriksaanFisik.tb) / 100) ** 2
                        ).toFixed(1)
                      : '—'
                  }
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginTop: 12,
                }}
              >
                <ReportField label="Keadaan Umum" value={selected.pemeriksaanFisik.keadaanUmum} />
                <ReportField label="Kesadaran" value={selected.pemeriksaanFisik.kesadaran} />
              </div>
              {selected.pemeriksaanFisik.pemeriksaanLain && (
                <ReportField
                  label="Pemeriksaan Fisik Lain"
                  value={selected.pemeriksaanFisik.pemeriksaanLain}
                />
              )}
            </ReportSection>

            {/* A — Asesmen */}
            <ReportSection title="ASESMEN (A)">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px',
                  gap: 16,
                }}
              >
                <ReportField label="Diagnosis Kerja" value={selected.asesmen.diagnosisKerja} />
                <ReportField label="ICD-10" value={selected.asesmen.icd10} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginTop: 8,
                }}
              >
                <ReportField label="Diagnosis Banding" value={selected.asesmen.diagnosisBanding} />
                <ReportField label="Prognosis" value={selected.asesmen.prognosis} />
              </div>
            </ReportSection>

            {/* P — Plan */}
            <ReportSection title="TATA LAKSANA (P)">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <ReportField label="Terapi / Resep" value={selected.tataLaksana.terapi} />
                <ReportField label="Tindakan" value={selected.tataLaksana.tindakan} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginTop: 8,
                }}
              >
                <ReportField label="Edukasi" value={selected.tataLaksana.edukasi} />
                <ReportField
                  label="Rencana Tindak Lanjut"
                  value={selected.tataLaksana.tindakLanjut}
                />
              </div>
            </ReportSection>

            {/* Signature */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 40,
                marginTop: 40,
                paddingTop: 16,
                borderTop: '1px solid var(--line-base)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  className="print-label"
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                  }}
                >
                  DOKTER PEMERIKSA
                </div>
                <div style={{ height: 60 }} />
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-main)',
                    borderTop: '1px solid var(--line-base)',
                    paddingTop: 8,
                    display: 'inline-block',
                    minWidth: 200,
                  }}
                >
                  {selected.penutup.dokter || '............................'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  className="print-label"
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                  }}
                >
                  PERAWAT
                </div>
                <div style={{ height: 60 }} />
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-main)',
                    borderTop: '1px solid var(--line-base)',
                    paddingTop: 8,
                    display: 'inline-block',
                    minWidth: 200,
                  }}
                >
                  {selected.penutup.perawat || '............................'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 12,
                borderTop: '1px dashed var(--line-base)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
              }}
            >
              <span>
                Dicetak:{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span>UPTD Puskesmas Balowerti — Sistem Rekam Medis Digital</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Sub-components ─── */
function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="print-section-title"
        style={{
          fontSize: 12,
          letterSpacing: '0.15em',
          color: 'var(--c-asesmen)',
          borderBottom: '1px solid var(--line-base)',
          paddingBottom: 4,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        className="print-label"
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          marginBottom: 2,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-main)',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
        }}
      >
        {value || '—'}
      </div>
    </div>
  )
}
