'use client'

import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  AI_VERDICT_LABELS,
  CONTRIBUTION_FIELDS,
  CONTRIBUTION_FIELD_LABELS,
  CONTRIBUTION_STATUS_LABELS,
  CONTRIBUTION_STATUS_TONES,
  currentSectionText,
  findDisease,
  PROPOSED_TEXT_LIMITS,
  type Contribution,
  type ContributionField,
} from '@/lib/sentrapedia/contribution'
import { CATEGORIES, DISEASES } from '@/lib/sentrapedia/data'

import styles from './kontribusi.module.css'

type Outcome = { tone: 'success' | 'warning' | 'critical'; title: string; body: string }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SentrapediaContributionPage() {
  const [diseaseId, setDiseaseId] = useState('')
  const [field, setField] = useState<ContributionField | ''>('')
  const [proposedText, setProposedText] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [mine, setMine] = useState<Contribution[]>([])

  const disease = diseaseId ? findDisease(Number(diseaseId)) : undefined
  const currentText = disease && field ? currentSectionText(disease, field) : ''

  const groups = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        diseases: DISEASES.filter((item) => item.kategori === category.id),
      })).filter((group) => group.diseases.length > 0),
    []
  )

  const loadMine = useCallback(async () => {
    try {
      const response = await fetch('/api/sentrapedia/contributions')
      const json = (await response.json()) as { contributions?: Contribution[] }
      setMine(json.contributions ?? [])
    } catch {
      setMine([])
    }
  }, [])

  useEffect(() => {
    void loadMine()
    const preset = new URLSearchParams(window.location.search).get('penyakit')
    if (preset && findDisease(Number(preset))) setDiseaseId(preset)
  }, [loadMine])

  // Start the proposal from the current text, so the contributor edits rather than retypes.
  useEffect(() => {
    setProposedText(currentText)
  }, [currentText])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true)
    setOutcome(null)
    try {
      const response = await fetch('/api/sentrapedia/contributions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ diseaseId: Number(diseaseId), field, proposedText, reference, note }),
      })
      const json = (await response.json()) as { contribution?: Contribution; error?: string }
      if (!response.ok || !json.contribution) {
        setOutcome({ tone: 'critical', title: 'Belum terkirim', body: json.error ?? 'Coba kirim ulang.' })
        return
      }
      const review = json.contribution.aiReview
      setOutcome(
        review?.available
          ? {
              tone: 'success',
              title: `Terkirim · tinjauan AI: ${AI_VERDICT_LABELS[review.verdict]}`,
              body: `${review.summary} Kontribusi menunggu persetujuan dr. Ferdi Iskandar.`,
            }
          : {
              tone: 'warning',
              title: 'Terkirim · menunggu tinjauan AI',
              body: 'Kontribusi tersimpan dan akan ditinjau AI sebelum diajukan ke dr. Ferdi Iskandar.',
            }
      )
      setField('')
      setReference('')
      setNote('')
      void loadMine()
    } catch {
      setOutcome({ tone: 'critical', title: 'Belum terkirim', body: 'Koneksi terputus. Coba kirim ulang.' })
    } finally {
      setSending(false)
    }
  }

  const unchanged = proposedText.trim() === currentText.trim()
  const ready = Boolean(disease && field && proposedText.trim().length >= PROPOSED_TEXT_LIMITS.min && reference.trim() && !unchanged)

  return (
    <div className={styles.page}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className={styles.titleRow}>
            <Link href="/sentrapedia" className={styles.back} aria-label="Kembali ke Sentrapedia">
              <ArrowLeft size={16} />
            </Link>
            <h1 className={styles.title}>Kontribusi Sentrapedia</h1>
          </div>
          <p className="ui-page-header__description">
            Lengkapi atau perbarui isi Sentrapedia sesuai pedoman klinis dan bukti ilmiah terkini. Setiap usulan
            ditinjau AI, lalu diputuskan oleh dr. Ferdi Iskandar sebelum tampil.
          </p>
        </div>
      </div>

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.grid}>
          <label className="ui-field">
            <span className="ui-field__label">Penyakit</span>
            <select className="ui-input" value={diseaseId} onChange={(e) => setDiseaseId(e.target.value)} required>
              <option value="">Pilih penyakit</option>
              {groups.map(({ category, diseases }) => (
                <optgroup key={category.id} label={category.name}>
                  {diseases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} · {item.kode}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Bagian</span>
            <select
              className="ui-input"
              value={field}
              onChange={(e) => setField(CONTRIBUTION_FIELDS.find((name) => name === e.target.value) ?? '')}
              required
            >
              <option value="">Pilih bagian</option>
              {CONTRIBUTION_FIELDS.map((name) => (
                <option key={name} value={name}>
                  {CONTRIBUTION_FIELD_LABELS[name]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {disease && field && (
          <div className={styles.current}>
            <span className="ui-field__label">Teks saat ini</span>
            <p className={styles.currentText}>{currentText}</p>
          </div>
        )}

        <label className="ui-field">
          <span className="ui-field__label">Usulan teks</span>
          <textarea
            className={`ui-input ${styles.textarea}`}
            value={proposedText}
            onChange={(e) => setProposedText(e.target.value)}
            maxLength={PROPOSED_TEXT_LIMITS.max}
            rows={8}
            required
          />
          <span className="ui-field__hint">
            {field === 'gejala' ? 'Satu gejala per baris. ' : ''}Jangan menuliskan data pasien.
          </span>
        </label>

        <label className="ui-field">
          <span className="ui-field__label">Sumber referensi</span>
          <input
            className="ui-input"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Contoh: PNPK Kemenkes 2020, PAPDI 2023, WHO 2024"
            required
          />
        </label>

        <label className="ui-field">
          <span className="ui-field__label">Catatan untuk peninjau (opsional)</span>
          <textarea
            className={`ui-input ${styles.textareaSmall}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </label>

        {outcome && (
          <div className={`ui-alert ui-alert--${outcome.tone}`} role="status">
            <div className="ui-alert__title">{outcome.title}</div>
            <div className="ui-alert__body">{outcome.body}</div>
          </div>
        )}

        <div className={styles.actions}>
          <button type="submit" className="ui-btn ui-btn--primary" disabled={!ready || sending}>
            <Send size={14} /> {sending ? 'Mengirim dan meninjau...' : 'Kirim kontribusi'}
          </button>
        </div>
      </form>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Kiriman saya</h2>
        {mine.length === 0 ? (
          <p className={styles.muted}>Belum ada kontribusi.</p>
        ) : (
          <ul className={styles.list}>
            {mine.map((item) => (
              <li key={item.id} className={styles.row}>
                <div className={styles.rowText}>
                  <span className={styles.rowName}>{item.diseaseName}</span>
                  <span className={styles.muted}>
                    {CONTRIBUTION_FIELD_LABELS[item.field]} · {formatDate(item.createdAt)}
                    {item.aiReview?.available ? ` · AI: ${AI_VERDICT_LABELS[item.aiReview.verdict]}` : ''}
                  </span>
                </div>
                <span className={`ui-badge ui-badge--${CONTRIBUTION_STATUS_TONES[item.status]}`}>
                  {CONTRIBUTION_STATUS_LABELS[item.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
