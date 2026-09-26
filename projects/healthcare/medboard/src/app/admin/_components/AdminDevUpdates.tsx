'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DevUpdateCategory, DevUpdateRecord } from '@/lib/dev-updates'
import { formatDateTimeFull } from '@/lib/format'
import styles from './AdminDevUpdates.module.css'

function categoryLabel(category: DevUpdateCategory): string {
  switch (category) {
    case 'release':
      return 'RELEASE'
    case 'maintenance':
      return 'MAINTENANCE'
    default:
      return 'IMPROVEMENT'
  }
}

function categoryBadgeClassName(category: DevUpdateCategory): string {
  switch (category) {
    case 'release':
      return `${styles.badge} ${styles.badgeRelease}`
    case 'maintenance':
      return `${styles.badge} ${styles.badgeMaintenance}`
    default:
      return `${styles.badge} ${styles.badgeDefault}`
  }
}


function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) <= new Date()
}

export default function AdminDevUpdates() {
  const [updates, setUpdates] = useState<DevUpdateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<DevUpdateCategory>('improvement')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dev-updates', { cache: 'no-store' })
      if (!res.ok) {
        setError('Gagal memuat data update dev.')
        return
      }
      const data = (await res.json()) as {
        ok: boolean
        updates: DevUpdateRecord[]
      }
      if (data.ok) {
        setUpdates(data.updates)
      }
    } catch {
      setError('Gagal memuat data update dev.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUpdates()
  }, [fetchUpdates])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/dev-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      })

      const data = (await res.json()) as {
        ok: boolean
        error?: string
        message?: string
      }
      if (!data.ok) {
        setError(data.error || 'Gagal membuat update dev.')
        return
      }

      setSuccess(data.message || 'Update dev berhasil dibuat.')
      setTitle('')
      setBody('')
      setCategory('improvement')
      setExpiresAt('')
      void fetchUpdates()
    } catch {
      setError('Gagal membuat update dev.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(id: string) {
    setError('')
    setSuccess('')
    setDeactivatingId(id)

    try {
      const res = await fetch(`/api/admin/dev-updates/${id}`, {
        method: 'DELETE',
      })
      const data = (await res.json()) as {
        ok: boolean
        error?: string
        message?: string
      }
      if (!data.ok) {
        setError(data.error || 'Gagal menonaktifkan update dev.')
        return
      }

      setSuccess(data.message || 'Update dev dinonaktifkan.')
      void fetchUpdates()
    } catch {
      setError('Gagal menonaktifkan update dev.')
    } finally {
      setDeactivatingId(null)
    }
  }

  const orderedUpdates = [...updates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const activeUpdates = orderedUpdates.filter(
    update => update.active && !isExpired(update.expiresAt)
  )
  const inactiveUpdates = orderedUpdates.filter(
    update => !update.active || isExpired(update.expiresAt)
  )

  if (loading) {
    return (
      <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>Memuat update dev...</div>
    )
  }

  const errorClassName = `${styles.feedback} ${styles.feedbackError}`
  const successClassName = `${styles.feedback} ${styles.feedbackSuccess}`

  return (
    <div className={styles.root}>
      {error && <div className={errorClassName}>{error}</div>}
      {success && <div className={successClassName}>{success}</div>}

      <div className={styles.panel}>
        <p className={styles.sectionKick}>TULIS UPDATE DEV</p>

        <form onSubmit={handleCreate} className={styles.formStack}>
          <div>
            <label className={styles.label}>Judul</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Patch SOAP editor sudah live"
              required
              maxLength={200}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Rincian</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Tulis ringkasan perubahan, scope, atau catatan operasional..."
              required
              maxLength={2000}
              rows={4}
              className={`${styles.input} ${styles.textarea}`}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.label}>Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DevUpdateCategory)}
                title="Kategori update dev"
                aria-label="Kategori update dev"
                className={styles.input}
              >
                <option value="improvement">Improvement</option>
                <option value="release">Release</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Kedaluwarsa (opsional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                title="Kedaluwarsa update dev"
                aria-label="Kedaluwarsa update dev"
                className={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className={styles.primaryButton}
          >
            {submitting ? 'Mengirim...' : 'Terbitkan Update'}
          </button>
        </form>
      </div>

      <div>
        <p className={styles.sectionKick}>UPDATE AKTIF ({activeUpdates.length})</p>

        {activeUpdates.length === 0 ? (
          <div className={styles.emptyState}>Belum ada update dev aktif saat ini.</div>
        ) : (
          <div className={styles.cardList}>
            {activeUpdates.map(update => (
              <div key={update.id} className={styles.panel}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <span className={categoryBadgeClassName(update.category)}>
                        {categoryLabel(update.category)}
                      </span>
                      <span className={styles.cardTitle}>{update.title}</span>
                    </div>
                    <p className={styles.cardText}>{update.body}</p>
                    <div className={styles.metaRow}>
                      <span>Oleh: {update.createdByName}</span>
                      <span>{formatDateTimeFull(update.createdAt)}</span>
                      {update.expiresAt && (
                        <span>Kedaluwarsa: {formatDateTimeFull(update.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(update.id)}
                    disabled={deactivatingId === update.id}
                    className={styles.dangerButton}
                  >
                    {deactivatingId === update.id ? 'MEMPROSES...' : 'NONAKTIFKAN'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {inactiveUpdates.length > 0 && (
        <div>
          <p className={`${styles.sectionKick} ${styles.sectionKickMuted}`}>
            RIWAYAT ({inactiveUpdates.length})
          </p>
          <div className={styles.historyList}>
            {inactiveUpdates.map(update => (
              <div key={update.id} className={`${styles.panel} ${styles.historyPanel}`}>
                <div className={styles.historyTitleRow}>
                  <span className={categoryBadgeClassName(update.category)}>
                    {categoryLabel(update.category)}
                  </span>
                  <span className={styles.historyTitle}>{update.title}</span>
                  <span className={styles.historyBadge}>
                    {!update.active ? 'NONAKTIF' : 'KEDALUWARSA'}
                  </span>
                </div>
                <p className={styles.historyText}>{update.body}</p>
                <div className={styles.historyMetaRow}>
                  <span>Oleh: {update.createdByName}</span>
                  <span>{formatDateTimeFull(update.createdAt)}</span>
                  {update.expiresAt && <span>Kedaluwarsa: {formatDateTimeFull(update.expiresAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
