'use client'

import { Bot, Check, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  AI_VERDICT_LABELS,
  CONTRIBUTION_FIELD_LABELS,
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_STATUS_TONES,
  currentSectionText,
  findDisease,
  type AiVerdict,
  type Contribution,
  type ContributionStatus,
} from '@/lib/sentrapedia/contribution'

import styles from './AdminSentrapediaReview.module.css'

const FILTERS: Array<{ key: ContributionStatus | 'all'; label: string }> = [
  { key: 'awaiting_approval', label: 'Menunggu persetujuan' },
  { key: 'ai_review', label: 'Ditinjau AI' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'all', label: 'Semua' },
]

const VERDICT_TONES: Record<AiVerdict, string> = {
  layak: 'success',
  perlu_perbaikan: 'warning',
  tidak_layak: 'critical',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSentrapediaReview() {
  const [items, setItems] = useState<Contribution[]>([])
  const [filter, setFilter] = useState<ContributionStatus | 'all'>('awaiting_approval')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/sentrapedia/contributions')
      const json = (await response.json()) as { contributions?: Contribution[]; error?: string }
      if (!response.ok) throw new Error(json.error ?? 'Gagal memuat kontribusi.')
      setItems(json.contributions ?? [])
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat kontribusi.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'approve' | 'reject' | 'review') {
    setBusy(`${id}:${action}`)
    try {
      const response = await fetch(`/api/sentrapedia/contributions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note: notes[id] ?? '' }),
      })
      const json = (await response.json()) as { error?: string }
      setError(response.ok ? '' : (json.error ?? 'Aksi gagal.'))
      await load()
    } finally {
      setBusy(null)
    }
  }

  const shown = filter === 'all' ? items : items.filter((item) => item.status === filter)
  const count = (key: ContributionStatus | 'all') => (key === 'all' ? items.length : items.filter((item) => item.status === key).length)

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} type="button" className="ui-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <span className={styles.count}>{count(key)}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="ui-alert ui-alert--critical" role="alert">
          {error}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="ui-empty">
          <div className="ui-empty__title">Tidak ada kontribusi di sini</div>
        </div>
      ) : (
        shown.map((item) => {
          const disease = findDisease(item.diseaseId)
          const review = item.aiReview
          const decidable = item.status === 'awaiting_approval'
          return (
            <article key={item.id} className={styles.card}>
              <header className={styles.head}>
                <div>
                  <h3 className={styles.title}>
                    {item.diseaseName} · {CONTRIBUTION_FIELD_LABELS[item.field]}
                  </h3>
                  <p className={styles.meta}>
                    {item.contributor.displayName} ({item.contributor.profession}) · {formatDate(item.createdAt)}
                  </p>
                </div>
                <span className={`ui-badge ui-badge--${CONTRIBUTION_STATUS_TONES[item.status]}`}>
                  {CONTRIBUTION_STATUS_LABELS[item.status]}
                </span>
              </header>

              <div className={styles.review}>
                <div className={styles.reviewHead}>
                  <Bot size={16} />
                  <span className={styles.reviewLabel}>Tinjauan AI</span>
                  {review?.available && (
                    <span className={`ui-badge ui-badge--${VERDICT_TONES[review.verdict]}`}>
                      {AI_VERDICT_LABELS[review.verdict]}
                    </span>
                  )}
                </div>
                {review?.available ? (
                  <>
                    <p className={styles.text}>{review.summary}</p>
                    {review.concerns.length > 0 && (
                      <ul className={styles.concerns}>
                        {review.concerns.map((concern) => (
                          <li key={concern}>{concern}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className={styles.text}>{review ? review.reason : 'Belum ditinjau.'}</p>
                )}
              </div>

              <div className={styles.compare}>
                <div>
                  <div className={styles.label}>Teks saat ini</div>
                  <p className={styles.textMuted}>{disease ? currentSectionText(disease, item.field) : '—'}</p>
                </div>
                <div>
                  <div className={styles.label}>Usulan</div>
                  <p className={styles.text}>{item.proposedText}</p>
                </div>
              </div>

              <p className={styles.meta}>
                Sumber: {item.reference}
                {item.note ? ` · Catatan: ${item.note}` : ''}
              </p>

              {item.decision && (
                <p className={styles.meta}>
                  Diputuskan {item.decision.by} · {formatDate(item.decision.at)}
                  {item.decision.note ? ` · ${item.decision.note}` : ''}
                </p>
              )}

              {(decidable || item.status === 'ai_review') && (
                <div className={styles.actions}>
                  <input
                    className={`ui-input ${styles.note}`}
                    placeholder="Catatan keputusan (opsional)"
                    aria-label="Catatan keputusan"
                    value={notes[item.id] ?? ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary ui-btn--sm"
                    disabled={busy !== null}
                    onClick={() => void act(item.id, 'review')}
                  >
                    <RefreshCw size={14} /> {busy === `${item.id}:review` ? 'Meninjau...' : 'Tinjau ulang AI'}
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary ui-btn--sm"
                    disabled={!decidable || busy !== null}
                    onClick={() => void act(item.id, 'reject')}
                  >
                    <X size={14} /> Tolak
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--sm"
                    disabled={!decidable || busy !== null}
                    onClick={() => void act(item.id, 'approve')}
                  >
                    <Check size={14} /> Setujui
                  </button>
                </div>
              )}
            </article>
          )
        })
      )}
    </div>
  )
}
