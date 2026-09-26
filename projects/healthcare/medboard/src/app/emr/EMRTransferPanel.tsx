'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { EMRProgressEvent } from '@/lib/emr/types'
import { IcdAutocomplete } from '@/components/features/icd/IcdAutocomplete'

// ============================================================================
// TYPES
// ============================================================================

interface TransferHistoryEntry {
  id: string
  timestamp: string
  transferId: string
  state: string
  totalLatencyMs: number
  reasonCodes: string[]
}

type TransferState = 'idle' | 'running' | 'done' | 'error'

interface ProgressItem {
  step: string
  status: string
  message: string
  timestamp: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EMRTransferPanel() {
  const [pelayananId, setPelayananId] = useState('')
  const [keluhanUtama, setKeluhanUtama] = useState('')
  const [diagnosisIcd, setDiagnosisIcd] = useState('')
  const [diagnosisNama, setDiagnosisNama] = useState('')
  const [transferState, setTransferState] = useState<TransferState>('idle')
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
  const [currentTransferId, setCurrentTransferId] = useState<string | null>(null)
  const [history, setHistory] = useState<TransferHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  // Socket.IO connection
  useEffect(() => {
    let s: Socket | null = null
    let active = true

    import('socket.io-client').then(({ io }) => {
      if (!active) return
      s = io({ path: '/socket.io' })

      s.on('emr:progress', (event: EMRProgressEvent) => {
        setProgressItems(prev => [...prev, event])
        if (event.step === 'done') {
          setTransferState(event.status === 'success' ? 'done' : 'error')
        }
      })

      setSocket(s)
    })

    return () => {
      active = false
      s?.disconnect()
    }
  }, [])

  // Load history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/emr/transfer/history?limit=10')
      if (res.ok) {
        const data = (await res.json()) as { history: TransferHistoryEntry[] }
        setHistory(data.history || [])
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  // Start transfer
  async function startTransfer() {
    if (transferState === 'running') return

    const payload = {
      anamnesa: {
        keluhan_utama: keluhanUtama,
        keluhan_tambahan: keluhanUtama,
        lama_sakit: { thn: 0, bln: 0, hr: 1 },
        alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      },
      ...(diagnosisIcd
        ? {
            diagnosa: {
              icd_x: diagnosisIcd,
              nama: diagnosisNama || diagnosisIcd,
              jenis: 'PRIMER' as const,
              kasus: 'BARU' as const,
              prognosa: 'Bonam (Baik)',
              penyakit_kronis: [],
            },
          }
        : {}),
    }

    setTransferState('running')
    setProgressItems([])

    try {
      const res = await fetch('/api/emr/transfer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          pelayananId: pelayananId || undefined,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        setProgressItems([
          {
            step: 'init',
            status: 'failed',
            message: err.error || 'Transfer gagal',
            timestamp: new Date().toISOString(),
          },
        ])
        setTransferState('error')
        return
      }

      const data = (await res.json()) as { transferId: string }
      setCurrentTransferId(data.transferId)
    } catch (err) {
      setProgressItems([
        {
          step: 'init',
          status: 'failed',
          message: String(err),
          timestamp: new Date().toISOString(),
        },
      ])
      setTransferState('error')
    }
  }

  const stateColors: Record<TransferState, string> = {
    idle: 'var(--text-muted)',
    running: 'var(--c-asesmen)',
    done: '#22c55e',
    error: '#ef4444',
  }

  const stateLabels: Record<TransferState, string> = {
    idle: 'IDLE',
    running: 'RUNNING...',
    done: 'SELESAI',
    error: 'ERROR',
  }

  return (
    <div
      style={{
        fontSize: 12,
        border: '1px solid var(--line-base, #2a2a2a)',
        background: 'var(--bg-panel, #0a0a0a)',
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--line-base, #2a2a2a)',
          color: stateColors[transferState],
        }}
      >
        <span>SENTRA / EMR AUTO-FILL ENGINE</span>
        <span style={{ fontSize: 10 }}>{stateLabels[transferState]}</span>
      </div>

      {/* Form */}
      <div
        style={{
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label
              style={{
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              PELAYANAN ID (opsional)
            </label>
            <input
              type="text"
              value={pelayananId}
              onChange={e => setPelayananId(e.target.value)}
              placeholder="contoh: 12345"
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--line-base, #2a2a2a)',
                color: 'var(--text-base, #ccc)',
                padding: '4px 8px',
                fontSize: 11,
              }}
            />
          </div>
          <div>
            <label
              style={{
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              ICD-10
            </label>
            <IcdAutocomplete
              value={diagnosisIcd}
              onSelect={(code, name) => {
                setDiagnosisIcd(code)
                setDiagnosisNama(name)
              }}
              placeholder="Cari penyakit atau kode ICD-10..."
              fontSize={11}
            />
          </div>
        </div>

        <div>
          <label
            style={{
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 4,
            }}
          >
            KELUHAN UTAMA *
          </label>
          <textarea
            value={keluhanUtama}
            onChange={e => setKeluhanUtama(e.target.value)}
            rows={2}
            placeholder="keluhan pasien..."
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--line-base, #2a2a2a)',
              color: 'var(--text-base, #ccc)',
              padding: '4px 8px',
              fontSize: 11,
              resize: 'vertical',
            }}
          />
        </div>

        {diagnosisIcd && (
          <div>
            <label
              style={{
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              NAMA DIAGNOSA
            </label>
            <input
              type="text"
              value={diagnosisNama}
              onChange={e => setDiagnosisNama(e.target.value)}
              placeholder="nama diagnosa..."
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--line-base, #2a2a2a)',
                color: 'var(--text-base, #ccc)',
                padding: '4px 8px',
                fontSize: 11,
              }}
            />
          </div>
        )}

        <button
          onClick={() => {
            void startTransfer()
          }}
          disabled={transferState === 'running' || !keluhanUtama.trim()}
          style={{
            background: 'transparent',
            border: `1px solid ${keluhanUtama.trim() && transferState !== 'running' ? 'var(--c-asesmen, #a855f7)' : 'var(--line-base, #2a2a2a)'}`,
            color:
              keluhanUtama.trim() && transferState !== 'running'
                ? 'var(--c-asesmen, #a855f7)'
                : 'var(--text-muted)',
            padding: '6px 12px',
            fontSize: 11,
            cursor: keluhanUtama.trim() && transferState !== 'running' ? 'pointer' : 'default',
            letterSpacing: 1,
          }}
        >
          {transferState === 'running' ? '► TRANSFER BERJALAN...' : '► EKSEKUSI EMR TRANSFER'}
        </button>
      </div>

      {/* Progress */}
      {progressItems.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--line-base, #2a2a2a)',
            padding: '8px 12px',
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {progressItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                color:
                  item.status === 'failed'
                    ? '#ef4444'
                    : item.status === 'success'
                      ? '#22c55e'
                      : 'var(--text-muted)',
                marginBottom: 2,
              }}
            >
              <span style={{ minWidth: 80, opacity: 0.5 }}>{item.step.toUpperCase()}</span>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div
        style={{
          borderTop: '1px solid var(--line-base, #2a2a2a)',
          padding: '8px 12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            color: 'var(--text-muted)',
          }}
        >
          <span>RIWAYAT TRANSFER</span>
          <button
            onClick={() => {
              void loadHistory()
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {historyLoading ? '...' : '↺ REFRESH'}
          </button>
        </div>
        {history.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', opacity: 0.4, fontSize: 11 }}>
            Belum ada riwayat.
          </div>
        ) : (
          history.map(entry => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 0',
                borderBottom: '1px solid var(--line-base, #2a2a2a)',
                color:
                  entry.state === 'success'
                    ? '#22c55e'
                    : entry.state === 'partial'
                      ? '#f59e0b'
                      : '#ef4444',
                fontSize: 11,
              }}
            >
              <span>{new Date(entry.timestamp).toLocaleString('id-ID')}</span>
              <span>
                {entry.state.toUpperCase()} · {entry.totalLatencyMs}ms
              </span>
            </div>
          ))
        )}
      </div>
      {socket && !socket.connected && (
        <div
          style={{
            padding: '4px 12px',
            color: '#ef4444',
            fontSize: 10,
            borderTop: '1px solid var(--line-base)',
          }}
        >
          ⚠ Socket.IO tidak terhubung — progress realtime tidak tersedia
        </div>
      )}
    </div>
  )
}
