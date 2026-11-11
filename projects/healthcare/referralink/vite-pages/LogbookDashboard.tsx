import { TrashCan } from '@carbon/icons-react'
import { useMemo, useState } from 'react'

import { useLogbookRecords } from '../hooks/useLogbookRecords'
import { logbookRepository } from '../services/logbookRepository'
import { filterLogbookRecords, type LogbookFilters } from '../services/logbookSelectors'
import { SYNTHETIC_DATA_GUARDRAIL } from '../services/uiCopy'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDuration(durationMs: number) {
  if (!durationMs) return '—'
  return durationMs < 1000 ? durationMs + ' ms' : (durationMs / 1000).toFixed(1) + ' s'
}

export default function LogbookDashboard() {
  const { records, loading, storageStatus, privacyMigrationApplied } = useLogbookRecords()
  const [status, setStatus] = useState<LogbookFilters['status']>('all')
  const [urgency, setUrgency] = useState<LogbookFilters['urgency']>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  const filteredRecords = useMemo(
    () => filterLogbookRecords(records, { status, urgency, from, to }),
    [records, status, urgency, from, to]
  )

  const clearRecords = async () => {
    try {
      await logbookRepository.clear()
      setConfirmClear(false)
      setActionStatus('Semua catatan operasional berhasil dihapus.')
    } catch {
      setActionStatus('Catatan belum dapat dihapus. Coba lagi.')
    }
  }

  const deleteRecord = async () => {
    if (!pendingDeleteId) return
    try {
      await logbookRepository.delete(pendingDeleteId)
      setPendingDeleteId(null)
      setActionStatus('Catatan operasional berhasil dihapus.')
    } catch {
      setActionStatus('Catatan belum dapat dihapus. Coba lagi.')
    }
  }

  return (
    <main id="main-content" className="db01-operational-page">
      <header className="db01-operational-topbar">
        <span className="db01-operational-topbar__mark" aria-hidden="true">
          ◷
        </span>
        <span>Logbook · Riwayat analisis</span>
      </header>
      <div className="db01-operational-content">
        <section className="db01-operational-hero">
          <div>
            <p className="db01-operational-eyebrow">Arsip operasional tersensor</p>
            <h1>Logbook</h1>
            <p>Tinjau status, urgensi, durasi, dan jumlah rujukan tanpa narasi klinis.</p>
          </div>
          <button
            type="button"
            className="db01-operational-button db01-operational-button--secondary"
            onClick={() => setConfirmClear(true)}
            disabled={records.length === 0}
          >
            <TrashCan size={18} aria-hidden="true" />
            Hapus semua catatan
          </button>
        </section>

        <p className="db01-operational-note">{SYNTHETIC_DATA_GUARDRAIL}</p>
        {privacyMigrationApplied ? (
          <p className="db01-operational-warning" role="status">
            Riwayat lama dihapus saat kebijakan retensi tanpa narasi diterapkan.
          </p>
        ) : null}
        {storageStatus === 'unavailable' ? (
          <p className="db01-operational-warning" role="status">
            Persistent local storage is unavailable; session activity remains available.
          </p>
        ) : null}

        {actionStatus ? (
          <p role="status" aria-live="polite">
            {actionStatus}
          </p>
        ) : null}
        <section className="db01-operational-panel" aria-label="Filter Logbook">
          <div className="db01-operational-filter-row">
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as LogbookFilters['status'])}
              >
                <option value="all">Semua status</option>
                <option value="completed">Selesai</option>
                <option value="failed">Gagal</option>
              </select>
            </label>
            <label>
              Urgensi
              <select
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as LogbookFilters['urgency'])}
              >
                <option value="all">Semua urgensi</option>
                <option value="routine">Rutin</option>
                <option value="urgent">Mendesak</option>
                <option value="emergency">Darurat</option>
              </select>
            </label>
            <label>
              Dari
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              Hingga
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <span className="db01-operational-count">
              {filteredRecords.length} dari {records.length} catatan
            </span>
          </div>
        </section>

        <section className="db01-operational-records" aria-live="polite">
          {loading ? (
            <p className="db01-operational-empty" role="status">
              Memuat Logbook…
            </p>
          ) : null}
          {!loading && records.length === 0 ? (
            <p className="db01-operational-empty">Belum ada analisis yang dicatat.</p>
          ) : null}
          {!loading && records.length > 0 && filteredRecords.length === 0 ? (
            <p className="db01-operational-empty">Tidak ada catatan yang cocok dengan filter.</p>
          ) : null}
          {filteredRecords.map((record) => (
            <article className="db01-operational-record" key={record.id}>
              <div className="db01-operational-record__open">
                <span className="db01-operational-record__status">{record.status}</span>
                <span className="db01-operational-record__main">
                  <strong>
                    {record.status === 'completed' ? 'Analisis selesai' : 'Analisis gagal'}
                  </strong>
                  <small>{record.referralCount} kandidat rujukan · wajib tinjauan manusia</small>
                </span>
                <span className="db01-operational-record__meta">
                  {record.urgency ?? '—'} · {formatDuration(record.durationMs)}
                  <br />
                  {formatDate(record.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="db01-icon-button db01-operational-record__delete"
                onClick={() => setPendingDeleteId(record.id)}
                aria-label="Hapus catatan operasional"
              >
                <TrashCan size={18} aria-hidden="true" />
              </button>
            </article>
          ))}
        </section>
      </div>

      {confirmClear ? (
        <>
          <div className="db01-operational-overlay" aria-hidden="true" />
          <div
            className="db01-operational-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-logbook-title"
          >
            <p className="db01-operational-eyebrow">Tindakan destruktif</p>
            <h2 id="clear-logbook-title">Hapus semua catatan?</h2>
            <p>Semua catatan operasional tersensor yang disimpan lokal akan dihapus.</p>
            <div className="db01-operational-confirm__actions">
              <button
                type="button"
                className="db01-operational-button db01-operational-button--secondary"
                onClick={() => setConfirmClear(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="db01-operational-button db01-operational-button--danger"
                onClick={() => void clearRecords()}
              >
                Hapus catatan
              </button>
            </div>
          </div>
        </>
      ) : null}
      {pendingDeleteId ? (
        <>
          <div className="db01-operational-overlay" aria-hidden="true" />
          <div
            className="db01-operational-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-logbook-title"
          >
            <p className="db01-operational-eyebrow">Tindakan destruktif</p>
            <h2 id="delete-logbook-title">Hapus catatan ini?</h2>
            <p>Catatan operasional tersensor ini tidak dapat dipulihkan.</p>
            <div className="db01-operational-confirm__actions">
              <button
                type="button"
                className="db01-operational-button db01-operational-button--secondary"
                onClick={() => setPendingDeleteId(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="db01-operational-button db01-operational-button--danger"
                onClick={() => void deleteRecord()}
              >
                Hapus catatan
              </button>
            </div>
          </div>
        </>
      ) : null}
    </main>
  )
}
