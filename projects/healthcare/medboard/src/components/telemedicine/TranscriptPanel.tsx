'use client'

import { Check, Copy, FileText, Mic, Pause, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { EpuskesmasSummary, SummarySection, TranscriptLine } from '@/lib/telemedicine/epuskesmas-summary'
import { sectionText } from '@/lib/telemedicine/epuskesmas-summary'

import styles from '@/app/telemedicine/telemedicine.module.css'

const SPEAKER = { dokter: 'Dokter', pasien: 'Pasien' } as const
// The ePuskesmas pages, in the order the doctor fills them.
const SECTIONS: ReadonlyArray<{ id: SummarySection; title: string }> = [
  { id: 'anamnesa', title: 'Anamnesa' },
  { id: 'diagnosa', title: 'Diagnosa' },
  { id: 'resep', title: 'Resep' },
]

/** Beside the video: the live transcript, then the AI summary in the ePuskesmas pages. */
export function TranscriptPanel({
  lines,
  capturing,
  onCapturingChange,
  error,
}: {
  lines: ReadonlyArray<TranscriptLine>
  capturing: boolean
  onCapturingChange: (capturing: boolean) => void
  error: string
}) {
  const [consent, setConsent] = useState(false)
  const [summary, setSummary] = useState<EpuskesmasSummary | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const listRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [lines.length])

  const summarize = async () => {
    setSummarizing(true)
    setSummaryError('')
    try {
      const res = await fetch('/api/telemedicine/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      })
      const data = (await res.json()) as { ok?: boolean; summary?: EpuskesmasSummary; error?: string }
      if (data.ok && data.summary) setSummary(data.summary)
      else setSummaryError(data.error ?? 'Ringkasan gagal.')
    } catch {
      setSummaryError('Ringkasan gagal terkirim.')
    } finally {
      setSummarizing(false)
    }
  }

  const ordered = [...lines].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <aside className={styles.transcript} aria-label="Transkrip konsultasi">
      <div className={styles.transcriptHead}>
        <h2 className={styles.cardTitle}>Transkrip</h2>
        <span className={styles.rowMeta}>
          <span className={capturing ? `${styles.recDot} ${styles.recDotOn}` : styles.recDot} aria-hidden="true" />
          {capturing ? 'Mencatat' : 'Berhenti'}
        </span>
      </div>

      {!capturing && lines.length === 0 && (
        <label className={styles.consent}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          Pasien setuju percakapan dicatat
        </label>
      )}

      <button
        type="button"
        onClick={() => onCapturingChange(!capturing)}
        disabled={!capturing && lines.length === 0 && !consent}
        className="ui-btn ui-btn--secondary ui-btn--sm"
      >
        {capturing ? <Pause size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
        {capturing ? 'Jeda' : lines.length === 0 ? 'Mulai transkrip' : 'Lanjutkan'}
      </button>

      {ordered.length === 0 ? (
        <p className={styles.note}>Belum ada ucapan yang tercatat.</p>
      ) : (
        <ol ref={listRef} className={styles.lines}>
          {ordered.map(line => (
            <li key={`${line.at}-${line.speaker}`} className={styles.line}>
              <span className={line.speaker === 'dokter' ? styles.lineDoctor : styles.linePatient}>
                {SPEAKER[line.speaker]} ·{' '}
                {new Date(line.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={styles.lineText}>{line.text}</span>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className={styles.note} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void summarize()}
        disabled={lines.length === 0 || summarizing}
        className="ui-btn ui-btn--primary ui-btn--sm"
      >
        <FileText size={14} aria-hidden="true" />
        {summarizing ? 'Meringkas…' : 'Ringkas ke ePuskesmas'}
      </button>
      {summaryError && (
        <p className={styles.note} role="alert">
          {summaryError}
        </p>
      )}

      {summary && (
        <div className={styles.summary}>
          {SECTIONS.map(section => {
            const body = sectionText(summary, section.id)
            return (
              <section key={section.id} className={styles.summarySection} aria-label={section.title}>
                <div className={styles.transcriptHead}>
                  <h3 className={styles.summaryTitle}>{section.title}</h3>
                  {body && <CopyText text={body} label={section.title} />}
                </div>
                <p className={body ? styles.summaryText : styles.note}>{body || 'Tidak disebut dalam percakapan.'}</p>
              </section>
            )
          })}
        </div>
      )}

      <p className={styles.note}>Transkrip tidak disimpan dan hilang saat halaman ditutup.</p>
    </aside>
  )
}

/** Copies one page of the summary; the icon turns to a check for a moment. */
function CopyText({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 1500)
    return () => window.clearTimeout(timer)
  }, [state])

  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => setState('copied'),
          () => setState('failed')
        )
      }
      aria-label={`Salin ${label}`}
      className="ui-btn ui-btn--secondary ui-btn--sm"
    >
      {state === 'copied' ? (
        <Check size={12} aria-hidden="true" />
      ) : state === 'failed' ? (
        <X size={12} aria-hidden="true" />
      ) : (
        <Copy size={12} aria-hidden="true" />
      )}
      Copy
    </button>
  )
}
