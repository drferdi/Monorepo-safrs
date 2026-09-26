'use client'

import React from 'react'

type MedicalKnowledgeSearchStatus = 'SUCCESS' | 'EMPTY' | 'ERROR'

interface MedicalKnowledgeHit {
  title: string
  uri: string
  snippet: string
}

interface MedicalKnowledgeSearchResponse {
  status: MedicalKnowledgeSearchStatus
  query: string
  answer: string
  hits: MedicalKnowledgeHit[]
  citations: Array<{ uri: string; title: string }>
  timestamp: string
  error?: string
}

function resolveApiUrl(): string {
  const base = process.env.NEXT_PUBLIC_SENTRA_MAIN_BASE_URL?.trim()
  if (base) return `${base.replace(/\/$/, '')}/api/medical-knowledge`
  return '/api/medical-knowledge'
}

export function MedicalKnowledgeSearch(): React.JSX.Element {
  const [query, setQuery] = React.useState('')
  const [limit, setLimit] = React.useState<5 | 10>(5)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<MedicalKnowledgeSearchResponse | null>(null)

  const apiUrl = React.useMemo(() => resolveApiUrl(), [])

  const runSearch = React.useCallback(async () => {
    const trimmed = query.trim()

    setError(null)
    setData(null)

    if (!trimmed) {
      setError('Query wajib diisi.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query: trimmed, limit }),
      })

      const json = (await res.json()) as MedicalKnowledgeSearchResponse

      if (!res.ok || json.status === 'ERROR') {
        setError(json.error ?? 'Gagal mengambil hasil pencarian.')
        return
      }

      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [apiUrl, limit, query])

  return (
    <section
      className="medical-knowledge-search"
      aria-label="Pencarian Pengetahuan Medis"
      data-metric="medical_knowledge_panel"
    >
      <div className="mk-card" role="region" aria-label="Medical knowledge search panel">
        <header className="mk-header">
          <div>
            <div className="mk-label">Clinical Knowledge</div>
            <h2 className="mk-title">Pencarian Pengetahuan Medis</h2>
          </div>
          <div className="mk-meta">
            <span className="mk-chip" title="Endpoint">
              {apiUrl}
            </span>
          </div>
        </header>

        <div className="mk-controls" role="group" aria-label="Kontrol pencarian">
          <label className="mk-field" aria-label="Query pencarian">
            <span className="mk-label">Query</span>
            <input
              className="mk-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Contoh: "Aspirin"'
              inputMode="search"
              data-metric="medical_knowledge_query"
              data-slo="p95<1500ms"
            />
          </label>

          <div className="mk-field" role="group" aria-label="Batas hasil">
            <span className="mk-label">Limit</span>
            <div className="mk-segment" role="radiogroup" aria-label="Batas hasil">
              <button
                type="button"
                className={limit === 5 ? 'mk-seg-item is-active' : 'mk-seg-item'}
                onClick={() => setLimit(5)}
                aria-checked={limit === 5}
                role="radio"
                data-metric="medical_knowledge_limit_5"
                data-slo="p95<1500ms"
              >
                5
              </button>
              <button
                type="button"
                className={limit === 10 ? 'mk-seg-item is-active' : 'mk-seg-item'}
                onClick={() => setLimit(10)}
                aria-checked={limit === 10}
                role="radio"
                data-metric="medical_knowledge_limit_10"
                data-slo="p95<1500ms"
              >
                10
              </button>
            </div>
          </div>

          <div className="mk-actions">
            <button
              type="button"
              className="mk-cta"
              onClick={runSearch}
              disabled={loading}
              data-metric="medical_knowledge_search_submit"
              data-slo="p95<1500ms"
              aria-label="Jalankan pencarian"
            >
              {loading ? 'Mencari...' : 'Cari'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mk-alert" role="alert" aria-live="polite">
            <div className="mk-label">Error</div>
            <div className="mk-alert-text">{error}</div>
          </div>
        ) : null}

        {data ? (
          <div className="mk-results" role="region" aria-label="Hasil pencarian">
            <div className="mk-results-head">
              <div className="mk-label">Status</div>
              <div className="mk-results-meta">
                <span className="mk-chip">{data.status}</span>
                <span className="mk-chip">{data.hits.length} hits</span>
                <span className="mk-chip">{new Date(data.timestamp).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="mk-answer" aria-label="Jawaban ringkas">
              <div className="mk-label">Snippet Utama</div>
              <div className="mk-answer-body">{data.answer}</div>
            </div>

            <div className="mk-table" role="table" aria-label="Daftar dokumen">
              <div className="mk-thead" role="rowgroup">
                <div className="mk-tr" role="row">
                  <div className="mk-th" role="columnheader">
                    Judul
                  </div>
                  <div className="mk-th" role="columnheader">
                    Snippet
                  </div>
                  <div className="mk-th" role="columnheader">
                    Sumber
                  </div>
                </div>
              </div>
              <div className="mk-tbody" role="rowgroup">
                {data.hits.map((h, idx) => (
                  <div key={`${h.uri}-${idx}`} className="mk-tr" role="row">
                    <div className="mk-td" role="cell">
                      <div className="mk-cell-title">{h.title}</div>
                    </div>
                    <div className="mk-td" role="cell">
                      <div className="mk-cell-snippet">{h.snippet}</div>
                    </div>
                    <div className="mk-td" role="cell">
                      <a
                        className="mk-link"
                        href={h.uri}
                        target="_blank"
                        rel="noreferrer"
                        data-metric="medical_knowledge_open_source"
                        data-slo="p95<1500ms"
                      >
                        Buka
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .medical-knowledge-search {
          background: transparent;
          color: var(--text-main);
        }

        .medical-knowledge-search .mk-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--line-base);
          border-radius: 10px;
          padding: 18px;
          overflow: hidden;
        }

        .medical-knowledge-search .mk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
          pointer-events: none;
        }

        .medical-knowledge-search .mk-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .medical-knowledge-search .mk-label {
          font-size: 10px;
          font-family: var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
          opacity: 0.7;
        }

        .medical-knowledge-search .mk-title {
          margin: 8px 0 0;
          font-size: 17px;
          font-weight: 500;
          color: var(--text-main);
          letter-spacing: 0.01em;
        }

        .medical-knowledge-search .mk-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .medical-knowledge-search .mk-chip {
          font-size: 12px;
          color: var(--text-muted);
          border: 1px solid var(--line-base);
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.02);
          max-width: 46ch;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .medical-knowledge-search .mk-controls {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: end;
          margin-bottom: 14px;
        }

        .medical-knowledge-search .mk-field {
          display: grid;
          gap: 6px;
        }

        .medical-knowledge-search .mk-input {
          background: var(--bg-surface-soft);
          border: 1px solid var(--line-base);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text-main);
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .medical-knowledge-search .mk-input:focus {
          outline: none;
          border-color: var(--c-asesmen);
        }

        .medical-knowledge-search .mk-segment {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 10px;
          border: 1px solid var(--line-base);
          background: rgba(255, 255, 255, 0.01);
          transition: all 0.2s ease;
        }

        .medical-knowledge-search .mk-seg-item {
          appearance: none;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .medical-knowledge-search .mk-seg-item:hover {
          color: var(--text-main);
        }

        .medical-knowledge-search .mk-seg-item.is-active {
          border-color: var(--line-base);
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.04);
        }

        .medical-knowledge-search .mk-actions {
          display: flex;
          justify-content: flex-end;
        }

        .medical-knowledge-search .mk-cta {
          background: var(--c-asesmen);
          color: #121214;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .medical-knowledge-search .mk-cta:hover {
          transform: translateY(-1px);
        }

        .medical-knowledge-search .mk-cta:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .medical-knowledge-search .mk-alert {
          border: 1px solid var(--line-base);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 14px;
        }

        .medical-knowledge-search .mk-alert-text {
          margin-top: 6px;
          color: var(--text-main);
          font-size: 13px;
          line-height: 1.4;
        }

        .medical-knowledge-search .mk-results {
          display: grid;
          gap: 12px;
        }

        .medical-knowledge-search .mk-results-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .medical-knowledge-search .mk-results-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .medical-knowledge-search .mk-answer {
          border: 1px solid var(--line-base);
          background: rgba(255, 255, 255, 0.01);
          border-radius: 10px;
          padding: 12px;
        }

        .medical-knowledge-search .mk-answer-body {
          margin-top: 6px;
          white-space: pre-wrap;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-main);
        }

        .medical-knowledge-search .mk-table {
          border: 1px solid var(--line-base);
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.01);
        }

        .medical-knowledge-search .mk-tr {
          display: grid;
          grid-template-columns: 18ch 1fr 10ch;
          gap: 12px;
          padding: 12px;
          border-top: 1px solid var(--line-base);
        }

        .medical-knowledge-search .mk-thead .mk-tr {
          border-top: none;
          background: rgba(255, 255, 255, 0.02);
        }

        .medical-knowledge-search .mk-th {
          font-size: 10px;
          font-family: var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .medical-knowledge-search .mk-td {
          min-width: 0;
        }

        .medical-knowledge-search .mk-cell-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .medical-knowledge-search .mk-cell-snippet {
          font-size: 13px;
          color: var(--text-main);
          line-height: 1.45;
          white-space: pre-wrap;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
        }

        .medical-knowledge-search .mk-link {
          font-size: 13px;
          color: var(--text-main);
          text-decoration: none;
          border: 1px solid var(--line-base);
          padding: 8px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.2s ease;
        }

        .medical-knowledge-search .mk-link:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.22);
        }

        @media (max-width: 880px) {
          .medical-knowledge-search .mk-controls {
            grid-template-columns: 1fr;
          }

          .medical-knowledge-search .mk-tr {
            grid-template-columns: 1fr;
          }

          .medical-knowledge-search .mk-meta {
            justify-content: flex-start;
          }
        }
      `}</style>
    </section>
  )
}
