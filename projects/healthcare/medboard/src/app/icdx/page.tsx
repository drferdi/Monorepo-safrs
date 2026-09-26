'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'

interface IcdSearchItem {
  code: string
  name: string
  category: string
}

interface IcdConversionItem {
  modern: string
  modernResolvedCode: string
  modernName: string
  exactModernMatch: boolean
  legacy: string
  knownIn2010: boolean
  knownIn2019: boolean
  legacyName: string
}

interface LookupPayload {
  ok: boolean
  normalizedPrimary?: string
  results?: IcdSearchItem[]
  rows?: IcdConversionItem[]
  loadedFrom?: {
    '2010': string
    '2016': string
    '2019': string
  }
  extensionSource?: string
  error?: string
}

/* ── Design Tokens ────────────────────────────────────────────────────────── */
function useL() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return {
    bg: isDark ? 'var(--bg-canvas)' : 'var(--bg-canvas)',
    bgPanel: isDark ? 'var(--bg-card, #212121)' : 'var(--bg-card, #EDE4D9)',
    bgHover: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(201,168,124,0.06)',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'var(--line-base)',
    borderAcc: isDark ? 'rgba(230,126,34,0.4)' : 'rgba(201,168,124,0.5)',
    text: isDark ? '#d4d4d4' : 'var(--text-main)',
    muted: isDark ? '#777777' : 'var(--text-muted)',
    accent: isDark ? '#E67E22' : 'var(--c-asesmen)',
    critical: isDark ? '#E74C3C' : '#C0392B',
    mono: 'var(--font-mono)',
    sans: 'var(--font-sans)',
  }
}

type LTokens = ReturnType<typeof useL>

/* ── Helper Components ────────────────────────────────────────────────────── */
function highlight(text: string, query: string) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <em style={{ fontStyle: 'normal', color: 'var(--c-asesmen)' }}>
        {text.slice(idx, idx + query.length)}
      </em>
      {text.slice(idx + query.length)}
    </>
  )
}

/* ── LB1 Types ── */

interface LB1RunResult {
  ok: boolean
  durationMs?: number
  totalKunjungan?: number
  rawatJalan?: number
  rawatInap?: number
  rujukan?: number
  unmappedCount?: number
  rowCount?: number
  error?: string
}

interface LB1HistoryEntry {
  id: string
  timestamp: string
  status: 'success' | 'failed'
  year: number
  month: number
  rawatJalan: number
  rawatInap: number
  validRows: number
  invalidRows: number
}

const BULAN = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export default function ICDXPage() {
  const L = useL()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<IcdSearchItem | null>(null)
  const [results, setResults] = useState<IcdSearchItem[]>([])
  const [conversionRows, setConversionRows] = useState<IcdConversionItem[]>([])
  const [normalizedPrimary, setNormalizedPrimary] = useState('')
  const [dbInfo, setDbInfo] = useState<LookupPayload['loadedFrom']>()
  const [extensionSource, setExtensionSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── LB1 State ── */
  const [lb1Year, setLb1Year] = useState(new Date().getFullYear())
  const [lb1Month, setLb1Month] = useState(new Date().getMonth() + 1)
  const [lb1Running, setLb1Running] = useState(false)
  const [lb1Result, setLb1Result] = useState<LB1RunResult | null>(null)
  const [lb1Error, setLb1Error] = useState('')
  const [lb1History, setLb1History] = useState<LB1HistoryEntry[]>([])

  /* ── LB1: Fetch history on mount ── */
  useEffect(() => {
    fetch('/api/report/automation/history?limit=5')
      .then(r => r.json())
      .then((data: { ok: boolean; history?: LB1HistoryEntry[] }) => {
        if (data.ok && data.history) setLb1History(data.history)
      })
      .catch(() => {
        /* silent */
      })
  }, [])

  async function handleRunLb1() {
    setLb1Running(true)
    setLb1Error('')
    setLb1Result(null)
    try {
      const res = await fetch('/api/report/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: lb1Year,
          month: lb1Month,
          mode: 'full-cycle',
        }),
      })
      const data = (await res.json()) as LB1RunResult
      if (data.ok) {
        setLb1Result(data)
      } else {
        setLb1Error(data.error || 'Gagal menjalankan LB1.')
      }
      // Reload history
      const hRes = await fetch('/api/report/automation/history?limit=5')
      const hData = (await hRes.json()) as {
        ok: boolean
        history?: LB1HistoryEntry[]
      }
      if (hData.ok && hData.history) setLb1History(hData.history)
    } catch {
      setLb1Error('Gagal menghubungi server.')
    } finally {
      setLb1Running(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/icdx/lookup?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const payload = (await response.json()) as LookupPayload
        if (!payload.ok) {
          throw new Error(payload.error || 'Lookup ICD gagal')
        }
        setResults(payload.results ?? [])
        setConversionRows(payload.rows ?? [])
        setNormalizedPrimary(payload.normalizedPrimary ?? '')
        setDbInfo(payload.loadedFrom)
        setExtensionSource(payload.extensionSource ?? '')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Lookup ICD gagal')
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const showNormalizedHint = useMemo(() => {
    const input = query.trim().toUpperCase()
    return Boolean(input && normalizedPrimary && normalizedPrimary !== input)
  }, [query, normalizedPrimary])

  const ICD_VERSIONS = [
    {
      year: '1900',
      label: 'ICD-1',
      note: 'Edisi pertama, diadopsi di Paris. 179 penyebab kematian.',
    },
    {
      year: '1910',
      label: 'ICD-2',
      note: 'Revisi kedua. Mulai dipakai lintas negara.',
    },
    { year: '1920', label: 'ICD-3', note: 'Revisi ketiga.' },
    { year: '1929', label: 'ICD-4', note: 'Revisi keempat.' },
    { year: '1938', label: 'ICD-5', note: 'Revisi kelima.' },
    {
      year: '1948',
      label: 'ICD-6',
      note: 'WHO mengambil alih. Pertama kali mencakup morbiditas.',
    },
    { year: '1955', label: 'ICD-7', note: 'Revisi ketujuh.' },
    { year: '1965', label: 'ICD-8', note: 'Revisi kedelapan.' },
    {
      year: '1975',
      label: 'ICD-9',
      note: 'Dipakai luas termasuk ICD-9-CM di AS.',
    },
    {
      year: '1992',
      label: 'ICD-10',
      note: 'Digunakan WHO & mayoritas negara hingga kini.',
    },
    {
      year: '2010',
      label: 'ICD-10 (2010)',
      note: 'Versi PCare & ePuskesmas Indonesia.',
      active: true,
    },
    {
      year: '2016',
      label: 'ICD-10 (2016)',
      note: 'Update kode & nama diagnosis.',
      active: true,
    },
    {
      year: '2019',
      label: 'ICD-10 (2019)',
      note: 'Versi terbaru ICD-10. Referensi modern WHO.',
      active: true,
    },
    {
      year: '2022',
      label: 'ICD-11',
      note: 'Generasi berikutnya. Belum diimplementasi di Indonesia.',
    },
  ]

  return (
    <div style={{ width: '100%', maxWidth: 1400 }}>
      <div className="page-header" style={{ maxWidth: '100%', marginBottom: 24 }}>
        <div className="page-title">Ascriva ICDX</div>
        <div className="page-subtitle">Pencarian kode diagnosis & konversi ICD lintas versi</div>
        <div className="page-header-divider" />
        <div className="page-header-badges">
          <span
            style={{
              fontSize: 12,
              color: '#fff',
              background: 'var(--c-asesmen)',
              padding: '2px 10px',
              borderRadius: 2,
              letterSpacing: '0.05em',
              fontFamily: L.mono,
            }}
          >
            DYNAMIC DATABASE
          </span>
        </div>
      </div>

      {/* Clinical Stream */}
      <div className="clinical-stream" style={{ paddingLeft: 64, paddingBottom: 40 }}>
        <div className="stream-line" />

        {/* Phase 1: Search */}
        <section className="emr-phase is-active">
          <div className="emr-phase-label">01. Pencarian Kode</div>

          <div className="blueprint-wrapper">
            {/* Search Input */}
            <div className="stream-section" style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: L.mono,
                  fontSize: 13,
                  color: L.accent,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Masukkan Kode atau Diagnosis
              </div>
              <input
                type="text"
                placeholder="Contoh: L02.433, J16..20, pneumonia"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  maxWidth: 480,
                  height: 44,
                  background: 'transparent',
                  border: `1px solid ${L.border}`,
                  borderRadius: 3,
                  color: L.text,
                  fontSize: 15,
                  padding: '0 16px',
                  outline: 'none',
                  fontFamily: L.sans,
                  transition: 'border-color 0.2s',
                }}
              />
              {showNormalizedHint && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    color: L.muted,
                    fontFamily: L.mono,
                  }}
                >
                  Normalisasi ICD-10 2010: {query.trim().toUpperCase()}
                  {' → '}
                  {normalizedPrimary}
                </div>
              )}
              {dbInfo && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: L.muted,
                    fontFamily: L.mono,
                    letterSpacing: '0.04em',
                  }}
                >
                  DB: 2010={dbInfo['2010']} | 2016={dbInfo['2016']} | 2019=
                  {dbInfo['2019']}
                  {extensionSource && ` | EXT: ${extensionSource}`}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  color: L.critical,
                  fontSize: 13,
                  border: `1px solid ${L.critical}`,
                  borderRadius: 3,
                  background: `${L.critical}10`,
                }}
              >
                {error}
              </div>
            )}

            {/* Conversion Results */}
            {conversionRows.length > 0 && (
              <div className="stream-section" style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontFamily: L.mono,
                    fontSize: 13,
                    color: L.accent,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  Konversi Kode
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 0,
                    border: `1px solid ${L.border}`,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: '10px 14px',
                      background: L.bgHover,
                      borderBottom: `1px solid ${L.border}`,
                      fontFamily: L.mono,
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: L.muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    Kode Input (WHO/Modern)
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: L.bgHover,
                      borderBottom: `1px solid ${L.border}`,
                      borderLeft: `1px solid ${L.border}`,
                      fontFamily: L.mono,
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: L.muted,
                      textTransform: 'uppercase',
                    }}
                  >
                    Kode PCare / ePuskesmas
                  </div>

                  {/* Rows */}
                  {conversionRows.map((row, idx) => (
                    <React.Fragment key={`${row.modern}-${row.legacy}`}>
                      <div
                        style={{
                          padding: '12px 14px',
                          fontSize: 14,
                          color: L.text,
                          borderBottom:
                            idx < conversionRows.length - 1 ? `1px solid ${L.border}` : 'none',
                          fontFamily: L.mono,
                        }}
                      >
                        {row.modern}
                        {row.modernName && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 13,
                              color: L.muted,
                              fontFamily: L.sans,
                            }}
                          >
                            {row.exactModernMatch ? '' : `(→ ${row.modernResolvedCode})`}{' '}
                            {row.modernName}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          padding: '12px 14px',
                          fontSize: 14,
                          borderLeft: `1px solid ${L.border}`,
                          borderBottom:
                            idx < conversionRows.length - 1 ? `1px solid ${L.border}` : 'none',
                          fontFamily: L.mono,
                        }}
                      >
                        {row.knownIn2010 ? (
                          <>
                            <span style={{ color: L.accent, fontWeight: 500 }}>{row.legacy}</span>
                            <span
                              style={{
                                marginLeft: 10,
                                fontSize: 11,
                                background: L.accent,
                                color: '#000',
                                padding: '2px 8px',
                                borderRadius: 2,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                              }}
                            >
                              ✓ Valid
                            </span>
                            {row.legacyName && (
                              <span
                                style={{
                                  marginLeft: 10,
                                  fontSize: 13,
                                  color: L.muted,
                                  fontFamily: L.sans,
                                }}
                              >
                                {row.legacyName}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span style={{ color: L.critical }}>{row.legacy}</span>
                            <span
                              style={{
                                marginLeft: 10,
                                fontSize: 11,
                                border: `1px solid ${L.critical}`,
                                color: L.critical,
                                padding: '2px 8px',
                                borderRadius: 2,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                              }}
                            >
                              ✗ Tidak tersedia
                            </span>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: L.critical,
                                fontFamily: L.sans,
                              }}
                            >
                              Kode tidak ada di ICD-10 2010 yang digunakan PCare/ePuskesmas
                            </div>
                          </>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="stream-section">
              <div
                style={{
                  fontFamily: L.mono,
                  fontSize: 13,
                  color: L.accent,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Hasil Pencarian Database
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 4,
                }}
              >
                {results.map(item => (
                  <div
                    key={item.code}
                    onClick={() => setSelected(item.code === selected?.code ? null : item)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 3,
                      cursor: 'pointer',
                      background: selected?.code === item.code ? L.bgHover : 'transparent',
                      border: `1px solid ${selected?.code === item.code ? L.borderAcc : L.border}`,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (selected?.code !== item.code) {
                        e.currentTarget.style.background = L.bgHover
                      }
                    }}
                    onMouseLeave={e => {
                      if (selected?.code !== item.code) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          color: L.accent,
                          fontFamily: L.mono,
                          fontWeight: 500,
                          minWidth: 90,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {item.code}
                      </span>
                      <span style={{ fontSize: 15, color: L.text, flex: 1 }}>
                        {highlight(item.name, query)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: L.muted,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontFamily: L.mono,
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
                {!loading && results.length === 0 && query && (
                  <div
                    style={{
                      fontSize: 15,
                      color: L.muted,
                      padding: '24px 16px',
                      fontStyle: 'italic',
                      border: `1px dashed ${L.border}`,
                      borderRadius: 3,
                      textAlign: 'center',
                    }}
                  >
                    Tidak ada hasil untuk &ldquo;{query}&rdquo;
                  </div>
                )}
                {!loading && results.length === 0 && !query && (
                  <div
                    style={{
                      fontSize: 15,
                      color: L.muted,
                      padding: '24px 16px',
                      fontStyle: 'italic',
                      border: `1px dashed ${L.border}`,
                      borderRadius: 3,
                      textAlign: 'center',
                    }}
                  >
                    Masukkan kode atau nama diagnosis untuk mencari
                  </div>
                )}
                {loading && (
                  <div
                    style={{
                      fontSize: 14,
                      color: L.muted,
                      padding: '20px 16px',
                      fontFamily: L.mono,
                    }}
                  >
                    Memuat database ICD...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Phase 2: Selected Detail */}
        {selected && (
          <section className="emr-phase is-active">
            <div className="emr-phase-label">02. Detail Kode Terpilih</div>

            <div className="blueprint-wrapper">
              {(() => {
                const matchedRow = conversionRows.find(
                  r =>
                    r.modern === selected.code ||
                    r.modernResolvedCode === selected.code ||
                    r.legacy === selected.code
                )
                return (
                  <>
                    <div className="emr-context-bar" style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: L.mono,
                            fontSize: 12,
                            color: L.accent,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Kode
                        </span>
                        <span
                          style={{
                            fontSize: 22,
                            color: L.accent,
                            fontFamily: L.mono,
                            fontWeight: 500,
                            letterSpacing: '0.03em',
                          }}
                        >
                          {selected.code}
                        </span>
                      </div>
                      <div
                        style={{
                          width: 1,
                          height: 20,
                          background: L.border,
                          margin: '0 8px',
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: L.mono,
                            fontSize: 12,
                            color: L.accent,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Kategori
                        </span>
                        <span style={{ fontSize: 15, color: L.text }}>{selected.category}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 400,
                        color: L.text,
                        marginBottom: 20,
                        paddingBottom: 16,
                        borderBottom: `1px solid ${L.border}`,
                      }}
                    >
                      {selected.name}
                    </div>

                    {matchedRow && matchedRow.legacy !== selected.code && (
                      <div
                        style={{
                          padding: '16px 20px',
                          border: matchedRow.knownIn2010
                            ? `1px solid ${L.accent}`
                            : `1px solid ${L.critical}`,
                          borderRadius: 3,
                          background: matchedRow.knownIn2010 ? `${L.accent}08` : `${L.critical}08`,
                          marginBottom: 16,
                        }}
                      >
                        {matchedRow.knownIn2010 ? (
                          <>
                            <div
                              style={{
                                fontFamily: L.mono,
                                fontSize: 11,
                                color: L.accent,
                                marginBottom: 8,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                              }}
                            >
                              ✓ Gunakan kode ini di PCare / ePuskesmas
                            </div>
                            <span
                              style={{
                                fontSize: 20,
                                color: L.accent,
                                fontWeight: 500,
                                fontFamily: L.mono,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {matchedRow.legacy}
                            </span>
                            {matchedRow.legacyName && (
                              <span
                                style={{
                                  marginLeft: 14,
                                  fontSize: 15,
                                  color: L.muted,
                                }}
                              >
                                {matchedRow.legacyName}
                              </span>
                            )}
                          </>
                        ) : (
                          <div>
                            <div
                              style={{
                                fontFamily: L.mono,
                                fontSize: 11,
                                color: L.critical,
                                marginBottom: 8,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                              }}
                            >
                              ⚠ Kode tidak tersedia
                            </div>
                            <div style={{ fontSize: 15, color: L.critical }}>
                              Kode ini tidak ada di ICD-10 2010 — tidak dapat diinput ke
                              PCare/ePuskesmas
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: L.muted,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '4px 12px',
                          border: `1px solid ${L.border}`,
                          borderRadius: 3,
                          fontFamily: L.mono,
                        }}
                      >
                        {selected.category}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: L.accent,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '4px 12px',
                          border: `1px solid ${L.accent}`,
                          borderRadius: 3,
                          fontFamily: L.mono,
                        }}
                      >
                        ICD-10 Database
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>
          </section>
        )}

        {/* Phase 3: Version History */}
        <section className="emr-phase">
          <div className="emr-phase-label">03. Riwayat Versi ICD</div>

          <div className="blueprint-wrapper">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ICD_VERSIONS.map(v => (
                <div
                  key={v.year}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    padding: '12px 16px',
                    border: v.active ? `1px solid ${L.accent}` : `1px solid ${L.border}`,
                    borderRadius: 3,
                    background: v.active ? `${L.accent}08` : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      fontFamily: L.mono,
                      fontSize: 12,
                      color: v.active ? L.accent : L.muted,
                      letterSpacing: '0.08em',
                      minWidth: 50,
                      marginTop: 2,
                    }}
                  >
                    {v.year}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: 15,
                        color: v.active ? L.text : L.muted,
                        fontWeight: v.active ? 500 : 400,
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      {v.label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: L.muted,
                        lineHeight: 1.5,
                      }}
                    >
                      {v.note}
                    </span>
                  </div>
                  {v.active && (
                    <span
                      style={{
                        fontSize: 11,
                        color: L.accent,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        border: `1px solid ${L.accent}`,
                        borderRadius: 3,
                        fontFamily: L.mono,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${L.border}`,
                fontSize: 13,
                color: L.muted,
                fontFamily: L.mono,
                letterSpacing: '0.04em',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  background: L.accent,
                  borderRadius: 2,
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
              = Tersedia di Sentra ICD-X Engine
            </div>
          </div>
        </section>

        {/* Phase 4: LB1 Generator */}
        <section className="emr-phase is-active">
          <div className="emr-phase-label">04. LB1 Generator</div>

          <div className="blueprint-wrapper">
            <div
              style={{
                fontFamily: L.mono,
                fontSize: 13,
                color: L.accent,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Generate Laporan Bulanan 1
            </div>

            {/* Controls Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
                flexWrap: 'wrap',
              }}
            >
              {/* Month Selector */}
              <select
                value={lb1Month}
                onChange={e => setLb1Month(Number(e.target.value))}
                disabled={lb1Running}
                style={{
                  height: 42,
                  padding: '0 12px',
                  background: 'transparent',
                  border: `1px solid ${L.border}`,
                  borderRadius: 3,
                  color: L.text,
                  fontSize: 15,
                  fontFamily: L.sans,
                  cursor: 'pointer',
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                    style={{ background: '#1C1B1A', color: '#d4d4d4' }}
                  >
                    {BULAN[i + 1]}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={lb1Year}
                onChange={e => setLb1Year(Number(e.target.value))}
                disabled={lb1Running}
                style={{
                  height: 42,
                  padding: '0 12px',
                  background: 'transparent',
                  border: `1px solid ${L.border}`,
                  borderRadius: 3,
                  color: L.text,
                  fontSize: 15,
                  fontFamily: L.sans,
                  cursor: 'pointer',
                }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} style={{ background: '#1C1B1A', color: '#d4d4d4' }}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Run Button */}
              <button
                onClick={handleRunLb1}
                disabled={lb1Running}
                style={{
                  height: 42,
                  padding: '0 24px',
                  background: lb1Running ? 'transparent' : L.accent,
                  border: lb1Running ? `1px solid ${L.border}` : 'none',
                  borderRadius: 3,
                  color: lb1Running ? L.muted : '#000',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  cursor: lb1Running ? 'not-allowed' : 'pointer',
                  fontFamily: L.mono,
                  transition: 'all 0.2s',
                }}
              >
                {lb1Running ? '● GENERATING...' : 'RUN LB1'}
              </button>

              <span style={{ fontSize: 13, color: L.muted }}>
                mode: full-cycle (RPA + generate)
              </span>
            </div>

            {/* Result Card */}
            {lb1Result && (
              <div
                style={{
                  padding: '16px 20px',
                  border: `1px solid ${L.accent}`,
                  borderRadius: 3,
                  background: `${L.accent}08`,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: L.mono,
                    fontSize: 11,
                    color: L.accent,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  ✓ Generate selesai — {lb1Result.durationMs?.toLocaleString()}
                  ms
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, color: L.muted }}>Total Kunjungan</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: L.accent }}>
                      {lb1Result.totalKunjungan?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: L.muted }}>Rawat Jalan</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: L.text }}>
                      {lb1Result.rawatJalan?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: L.muted }}>Rawat Inap</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: L.text }}>
                      {lb1Result.rawatInap?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: L.muted }}>Rujukan</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: L.text }}>
                      {lb1Result.rujukan?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {lb1Error && (
              <div
                style={{
                  padding: '12px 16px',
                  color: L.critical,
                  fontSize: 15,
                  border: `1px solid ${L.critical}`,
                  borderRadius: 3,
                  background: `${L.critical}10`,
                  marginBottom: 20,
                }}
              >
                {lb1Error}
              </div>
            )}

            {/* Recent History */}
            <div
              style={{
                fontFamily: L.mono,
                fontSize: 13,
                color: L.accent,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Riwayat Run Terakhir
            </div>

            {lb1History.length > 0 ? (
              <div
                style={{
                  border: `1px solid ${L.border}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 120px 90px 100px 100px',
                    gap: 0,
                    background: L.bgHover,
                    borderBottom: `1px solid ${L.border}`,
                  }}
                >
                  {['Waktu', 'Periode', 'Status', 'Valid', 'Kunjungan'].map(h => (
                    <div
                      key={h}
                      style={{
                        padding: '8px 12px',
                        fontFamily: L.mono,
                        fontSize: 11,
                        letterSpacing: '0.1em',
                        color: L.muted,
                        textTransform: 'uppercase',
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {/* Table Rows */}
                {lb1History.map(entry => {
                  const d = new Date(entry.timestamp)
                  const timeStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '180px 120px 90px 100px 100px',
                        gap: 0,
                        borderBottom: `1px solid ${L.border}`,
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: 14,
                          color: L.text,
                        }}
                      >
                        {timeStr}
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: 14,
                          color: L.text,
                        }}
                      >
                        {BULAN[entry.month]} {entry.year}
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: L.mono,
                            letterSpacing: '0.06em',
                            padding: '2px 8px',
                            borderRadius: 2,
                            background:
                              entry.status === 'success'
                                ? 'rgba(76,175,80,0.15)'
                                : 'rgba(231,76,60,0.15)',
                            color: entry.status === 'success' ? '#4CAF50' : '#E74C3C',
                          }}
                        >
                          {entry.status === 'success' ? 'OK' : 'FAIL'}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: 14,
                          color: L.text,
                        }}
                      >
                        {entry.validRows}
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: 14,
                          color: L.accent,
                          fontWeight: 500,
                        }}
                      >
                        {(entry.rawatJalan + entry.rawatInap).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 15,
                  color: L.muted,
                  padding: '24px 16px',
                  fontStyle: 'italic',
                  border: `1px dashed ${L.border}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                Belum ada riwayat LB1
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
