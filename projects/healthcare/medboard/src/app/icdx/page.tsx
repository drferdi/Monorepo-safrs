'use client'

import { Check, Sparkles, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { cx } from '@/components/ui/cx'

import type { ReferralAdvice } from '@/lib/icd/referral'

import { IcdReferral } from './IcdReferral'
import { IcdTimeline } from './IcdTimeline'
import styles from './icdx.module.css'

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
  correctedQuery?: string
  error?: string
}

interface AiPick {
  code: string
  name: string
  reason: string
}

interface CodeDetail {
  code: string
  name: string
  category: string
  in2010: boolean
  parent: { code: string; name: string } | null
  children: Array<{ code: string; name: string }>
  worldwideCode: string | null
  referral: ReferralAdvice
}

type AiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; picks: AiPick[] }
  | { status: 'unavailable'; reason: string }

const chapter = (category: string): string => category.replace(/^CHAPTER\s+/i, 'Bab ')

function highlight(text: string, query: string) {
  const idx = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.mark}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function ICDXPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<IcdSearchItem | null>(null)
  const [results, setResults] = useState<IcdSearchItem[]>([])
  const [conversionRows, setConversionRows] = useState<IcdConversionItem[]>([])
  const [normalizedPrimary, setNormalizedPrimary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [correctedQuery, setCorrectedQuery] = useState('')
  const [ai, setAi] = useState<AiState>({ status: 'idle' })
  const [detail, setDetail] = useState<CodeDetail | null>(null)
  const [detailMissing, setDetailMissing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setAi({ status: 'idle' })
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
        setCorrectedQuery(payload.correctedQuery ?? '')
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

  // The chosen code with its parent and subcodes, from the 2010 catalogue.
  useEffect(() => {
    setDetail(null)
    setDetailMissing(false)
    if (!selected) return undefined
    const controller = new AbortController()
    fetch(`/api/icdx/code?code=${encodeURIComponent(selected.code)}`, { signal: controller.signal })
      .then(async response => {
        const data = (await response.json()) as { ok: true; detail: CodeDetail } | { ok: false; error: string }
        if (data.ok) setDetail(data.detail)
        else setDetailMissing(true)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setDetailMissing(true)
      })
    return () => controller.abort()
  }, [selected])

  const pick = (code: string, name: string, category = '') => setSelected({ code, name, category })

  // AI picks the best codes among the results; only the typed text and the codes are sent.
  async function askAi() {
    setAi({ status: 'loading' })
    try {
      const response = await fetch('/api/icdx/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, codes: results.slice(0, 30).map(item => item.code) }),
      })
      if (response.status === 401) {
        setAi({ status: 'unavailable', reason: 'Masuk sebagai kru untuk memakai saran AI.' })
        return
      }
      const data = (await response.json()) as
        | { ok: true; available: true; picks: AiPick[] }
        | { ok: true; available: false; reason: string }
        | { ok: false; error: string }
      if (!data.ok) setAi({ status: 'unavailable', reason: data.error })
      else if (data.available) setAi({ status: 'done', picks: data.picks })
      else setAi({ status: 'unavailable', reason: data.reason })
    } catch {
      setAi({ status: 'unavailable', reason: 'Saran AI tidak dapat dihubungi.' })
    }
  }

  const showNormalizedHint = useMemo(() => {
    const input = query.trim().toUpperCase()
    return Boolean(input && normalizedPrimary && normalizedPrimary !== input)
  }, [query, normalizedPrimary])

  const matchedRow = selected
    ? conversionRows.find(
        row => row.modern === selected.code || row.modernResolvedCode === selected.code || row.legacy === selected.code
      )
    : undefined
  const canAskAi = query.trim() !== '' && conversionRows.length === 0 && results.length >= 2

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ICD Coding</h1>
        <p className={styles.subtitle}>Pencarian kode diagnosis dan konversi ICD lintas versi</p>
      </header>

      {/* Search */}
      <div className={styles.search}>
        <input
          type="text"
          className="ui-input"
          aria-label="Kode atau diagnosis"
          placeholder="Ketik diagnosis atau kode, misalnya pneumonia, J18.9, J16..20"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {showNormalizedHint && (
          <p className={styles.hint}>
            Normalisasi ICD-10 2010: {query.trim().toUpperCase()} → {normalizedPrimary}
          </p>
        )}
        {correctedQuery && (
          <p className={styles.hint}>
            Menampilkan hasil untuk <strong className={styles.strong}>{correctedQuery}</strong>
          </p>
        )}
      </div>

      {error && (
        <div className="ui-alert ui-alert--critical" role="alert">
          {error}
        </div>
      )}

      {/* Conversion: a typed code and the 2010 code PCare accepts */}
      {conversionRows.length > 0 && (
        <section className={styles.convert} aria-label="Konversi kode">
          {conversionRows.map(row => (
            <div key={`${row.modern}-${row.legacy}`} className={styles.convertRow}>
              <span className={styles.code}>{row.modern}</span>
              <span className={styles.convertArrow} aria-hidden="true">
                →
              </span>
              <span className={cx(styles.code, !row.knownIn2010 && styles.codeBad)}>{row.legacy}</span>
              <span className={cx(styles.status, row.knownIn2010 ? styles.statusOk : styles.statusBad)}>
                {row.knownIn2010 ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                {row.knownIn2010 ? 'Bisa dipakai di PCare' : 'Tidak ada di ICD-10 2010'}
              </span>
              <span className={styles.convertName}>{row.legacyName || row.modernName}</span>
            </div>
          ))}
        </section>
      )}

      <div className={styles.layout}>
        {/* Results */}
        <section className={styles.results} aria-label="Hasil pencarian">
          <div className={styles.resultsHead}>
            <span className={styles.count}>
              {loading ? 'Mencari…' : query.trim() ? `${results.length} kode` : 'Contoh kode'}
            </span>
            {canAskAi && (
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--sm"
                onClick={askAi}
                disabled={ai.status === 'loading'}
              >
                <Sparkles size={14} aria-hidden="true" />
                {ai.status === 'loading' ? 'Sentra Algorithme memilih…' : 'Sentra Algorithme'}
              </button>
            )}
          </div>

          {ai.status === 'done' && (
            <div className={styles.ai}>
              <ol className={styles.aiList}>
                {ai.picks.map((pick, i) => (
                  <li key={pick.code} className={styles.aiItem}>
                    <span className={styles.aiRank}>{i + 1}</span>
                    <span className={styles.aiText}>
                      <span className={styles.code}>{pick.code}</span> {pick.name}
                      {pick.reason && <span className={styles.aiReason}>{pick.reason}</span>}
                    </span>
                    <button
                      type="button"
                      className="ui-btn ui-btn--secondary ui-btn--sm"
                      onClick={() =>
                        setSelected(
                          results.find(item => item.code === pick.code) ?? {
                            code: pick.code,
                            name: pick.name,
                            category: '',
                          }
                        )
                      }
                    >
                      Buka
                    </button>
                  </li>
                ))}
              </ol>
              <p className={styles.aiNote}>Saran AI. Keputusan kode tetap pada dokter.</p>
            </div>
          )}
          {ai.status === 'unavailable' && <p className={styles.hint}>{ai.reason}</p>}

          {results.length > 0 ? (
            <ul className={styles.list}>
              {results.map(item => (
                <li key={item.code}>
                  <button
                    type="button"
                    className={styles.row}
                    aria-pressed={selected?.code === item.code}
                    onClick={() => setSelected(item.code === selected?.code ? null : item)}
                  >
                    <span className={styles.code}>{item.code}</span>
                    <span className={styles.rowName}>{highlight(item.name, query.trim())}</span>
                    <span className={styles.rowChapter}>{chapter(item.category)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <p className={styles.empty}>Tidak ada hasil untuk &ldquo;{query}&rdquo;.</p>
          )}
        </section>

        {/* Detail of the chosen code, then where Indonesia uses which ICD version */}
        <aside className={styles.detail} aria-label="Detail kode">
          {selected ? (
            <>
              <span className={styles.detailCode}>{selected.code}</span>
              <p className={styles.detailName}>{detail?.name ?? selected.name}</p>
              {(detail?.category || selected.category) && (
                <span className={styles.rowChapter}>{chapter(detail?.category || selected.category)}</span>
              )}

              {matchedRow && matchedRow.legacy !== selected.code && (
                <div className={cx(styles.verdict, matchedRow.knownIn2010 ? styles.verdictOk : styles.verdictBad)}>
                  {matchedRow.knownIn2010 ? (
                    <>
                      <span className={styles.verdictHead}>
                        <Check size={14} aria-hidden="true" /> Gunakan kode ini di PCare / ePuskesmas
                      </span>
                      <span className={styles.code}>{matchedRow.legacy}</span> {matchedRow.legacyName}
                    </>
                  ) : (
                    <>
                      <span className={styles.verdictHead}>
                        <TriangleAlert size={14} aria-hidden="true" /> Kode tidak tersedia
                      </span>
                      Kode ini tidak ada di ICD-10 2010, jadi tidak dapat diinput ke PCare / ePuskesmas.
                    </>
                  )}
                </div>
              )}

              {detail?.parent && (
                <p className={styles.detailLine}>
                  Kategori{' '}
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => detail.parent && pick(detail.parent.code, detail.parent.name, detail.category)}
                  >
                    {detail.parent.code}
                  </button>{' '}
                  {detail.parent.name}
                </p>
              )}

              {detail && detail.children.length > 0 && (
                <div className={styles.subcodes}>
                  <span className={styles.detailLabel}>Subkode</span>
                  <ul className={styles.subcodeList}>
                    {detail.children.map(child => (
                      <li key={child.code}>
                        <button
                          type="button"
                          className={styles.subcode}
                          onClick={() => pick(child.code, child.name, detail.category)}
                        >
                          <span className={styles.code}>{child.code}</span>
                          <span>{child.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.usage}>
                <span className={styles.detailLabel}>Versi ICD</span>
                <IcdTimeline
                  key={selected.code}
                  code={selected.code}
                  inCatalog={detail ? true : detailMissing ? false : null}
                  worldwideCode={detail?.worldwideCode ?? null}
                />
              </div>

              {detail && (
                <IcdReferral key={selected.code} advice={detail.referral} onPick={(code, name) => pick(code, name)} />
              )}
            </>
          ) : (
            <p className={styles.empty}>
              Pilih kode untuk melihat detail, subkode, dan versi ICD yang dipakai di Indonesia.
            </p>
          )}
        </aside>
      </div>

    </div>
  )
}
