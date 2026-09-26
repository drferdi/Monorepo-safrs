'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDateTimeFull } from '@/lib/format'
import styles from './AdminNotam.module.css'

/* ── Types ── */

interface NOTAMRecord {
  id: string
  title: string
  body: string
  priority: 'info' | 'warning' | 'urgent'
  createdBy: string
  createdByName: string
  createdAt: string
  expiresAt: string | null
  active: boolean
}

/* ── Priority helpers ── */

function priorityLabel(p: string): string {
  switch (p) {
    case 'urgent':
      return 'URGENT'
    case 'warning':
      return 'WARNING'
    default:
      return 'INFO'
  }
}

function priorityBadgeClassName(p: string): string {
  switch (p) {
    case 'urgent':
      return `${styles.badge} ${styles.badgeUrgent}`
    case 'warning':
      return `${styles.badge} ${styles.badgeWarning}`
    default:
      return `${styles.badge} ${styles.badgeInfo}`
  }
}


function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) <= new Date()
}

/* ── Component ── */

export default function AdminNotam() {
  const [notams, setNotams] = useState<NOTAMRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  /* Create form state */
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<'info' | 'warning' | 'urgent'>('info')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* ── Fetch ── */

  const fetchNotams = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notam', { cache: 'no-store' })
      if (!res.ok) {
        setError('Gagal memuat data NOTAM.')
        return
      }
      const data = (await res.json()) as { ok: boolean; notams: NOTAMRecord[] }
      if (data.ok) {
        setNotams(data.notams)
      }
    } catch {
      setError('Gagal memuat data NOTAM.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotams()
  }, [fetchNotams])

  /* ── Create ── */

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/notam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          priority,
          expiresAt: expiresAt || null,
        }),
      })
      const data = (await res.json()) as {
        ok: boolean
        error?: string
        message?: string
      }
      if (!data.ok) {
        setError(data.error || 'Gagal membuat NOTAM.')
        return
      }

      setSuccess(data.message || 'NOTAM berhasil dibuat.')
      setTitle('')
      setBody('')
      setPriority('info')
      setExpiresAt('')
      void fetchNotams()
    } catch {
      setError('Gagal membuat NOTAM.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Deactivate ── */

  async function handleDeactivate(id: string) {
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/notam/${id}`, { method: 'DELETE' })
      const data = (await res.json()) as {
        ok: boolean
        error?: string
        message?: string
      }
      if (!data.ok) {
        setError(data.error || 'Gagal menonaktifkan NOTAM.')
        return
      }

      setSuccess(data.message || 'NOTAM dinonaktifkan.')
      void fetchNotams()
    } catch {
      setError('Gagal menonaktifkan NOTAM.')
    }
  }

  /* ── Derived lists ── */

  const activeNotams = notams.filter(n => n.active && !isExpired(n.expiresAt))
  const inactiveNotams = notams.filter(n => !n.active || isExpired(n.expiresAt))

  /* ── Render ── */

  if (loading) {
    return <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>Memuat NOTAM...</div>
  }

  const errorClassName = `${styles.feedback} ${styles.feedbackError}`
  const successClassName = `${styles.feedback} ${styles.feedbackSuccess}`

  return (
    <div className={styles.root}>
      {/* ── Feedback ── */}
      {error && <div className={errorClassName}>{error}</div>}
      {success && <div className={successClassName}>{success}</div>}

      {/* ── Create Form ── */}
      <div className={styles.panel}>
        <p className={styles.sectionKick}>BUAT NOTAM BARU</p>

        <form onSubmit={handleCreate} className={styles.formStack}>
          {/* Title */}
          <div>
            <label className={styles.label}>Judul</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Judul pengumuman..."
              required
              maxLength={200}
              className={styles.input}
            />
          </div>

          {/* Body */}
          <div>
            <label className={styles.label}>Isi</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Isi pengumuman untuk seluruh crew..."
              required
              maxLength={2000}
              rows={4}
              className={`${styles.input} ${styles.textarea}`}
            />
          </div>

          {/* Priority + Expiry row */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.label}>Prioritas</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'info' | 'warning' | 'urgent')}
                title="Prioritas notam"
                aria-label="Prioritas notam"
                className={styles.input}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Kedaluwarsa (opsional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                title="Kedaluwarsa notam"
                aria-label="Kedaluwarsa notam"
                className={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className={styles.primaryButton}
          >
            {submitting ? 'Mengirim...' : 'Terbitkan NOTAM'}
          </button>
        </form>
      </div>

      {/* ── Active NOTAMs ── */}
      <div>
        <p className={styles.sectionKick}>NOTAM AKTIF ({activeNotams.length})</p>

        {activeNotams.length === 0 ? (
          <div className={styles.emptyState}>Tidak ada NOTAM aktif saat ini.</div>
        ) : (
          <div className={styles.cardList}>
            {activeNotams.map(n => (
              <div key={n.id} className={styles.activeCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <span className={priorityBadgeClassName(n.priority)}>
                        {priorityLabel(n.priority)}
                      </span>
                      <span className={styles.cardTitle}>{n.title}</span>
                    </div>
                    <p className={styles.cardText}>{n.body}</p>
                    <div className={styles.metaRow}>
                      <span>Oleh: {n.createdByName}</span>
                      <span>{formatDateTimeFull(n.createdAt)}</span>
                      {n.expiresAt && <span>Kedaluwarsa: {formatDateTimeFull(n.expiresAt)}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeactivate(n.id)} className={styles.dangerButton}>
                    NONAKTIFKAN
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── History (inactive/expired) ── */}
      {inactiveNotams.length > 0 && (
        <div>
          <p className={`${styles.sectionKick} ${styles.sectionKickMuted}`}>
            RIWAYAT ({inactiveNotams.length})
          </p>
          <div className={styles.historyList}>
            {inactiveNotams.map(n => (
              <div key={n.id} className={`${styles.historyCard} ${styles.historyCardMuted}`}>
                <div className={styles.historyTitleRow}>
                  <span className={priorityBadgeClassName(n.priority)}>
                    {priorityLabel(n.priority)}
                  </span>
                  <span className={styles.historyTitle}>{n.title}</span>
                  <span className={styles.historyBadge}>
                    {!n.active ? 'NONAKTIF' : 'KEDALUWARSA'}
                  </span>
                </div>
                <p className={styles.historyText}>{n.body}</p>
                <div className={styles.historyMetaRow}>
                  <span>Oleh: {n.createdByName}</span>
                  <span>{formatDateTimeFull(n.createdAt)}</span>
                  {n.expiresAt && <span>Kedaluwarsa: {formatDateTimeFull(n.expiresAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
