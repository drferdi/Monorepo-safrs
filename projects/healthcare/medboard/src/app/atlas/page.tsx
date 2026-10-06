// Atlas Anatomi (Chief 2026-10-07): the Human Atlas 3D explorer inside MedBoard, names in Latin
// with their Indonesian names, text in Indonesian, MedBoard tokens and controls.
'use client'

import {
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  Info,
  Layers3,
  LoaderCircle,
  Pause,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'

import { useReducedMotion } from '@/components/shell/use-reduced-motion'
import { cx } from '@/components/ui/cx'
import { registerAtlasTools } from '@/lib/atlas/agent-tools'
import {
  EDITIONS,
  ORGAN_SYSTEMS,
  SYSTEMS,
  defaultVisible,
  described,
  edition,
  explanation,
  searchConcepts,
  systemName,
  termFor,
  type Atlas,
  type Concept,
  type Part,
  type SceneState,
  type Sex,
  type SystemId,
  type TermTable,
  type View,
} from '@/lib/atlas/anatomy'

import styles from './atlas.module.css'

const AtlasScene = dynamic(() => import('./AtlasScene'), { ssr: false })

const VIEWS: Array<{ id: View; label: string; title: string }> = [
  { id: 'three-quarter', label: '3/4', title: 'Tampak tiga perempat' },
  { id: 'front', label: 'Depan', title: 'Tampak depan' },
  { id: 'side', label: 'Samping', title: 'Tampak samping' },
  { id: 'back', label: 'Belakang', title: 'Tampak belakang' },
]

const initial = (sex: Sex): SceneState => ({
  explode: 0,
  visible: defaultVisible(sex),
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: false,
  reset: 0,
})

const count = (value: number) => value.toLocaleString('id-ID')

export default function AtlasPage() {
  const reducedMotion = useReducedMotion()
  const [sex, setSex] = useState<Sex>('male')
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [terms, setTerms] = useState<TermTable | null>(null)
  const [state, setState] = useState(() => initial('male'))
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [panel, setPanel] = useState<'layers' | 'search' | null>(null)
  const [details, setDetails] = useState(false)
  const [about, setAbout] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [chosen, setChosen] = useState<Concept | null>(null)
  const source = edition(sex)

  useEffect(() => {
    const abort = new AbortController()
    fetch('/atlas/terms.json', { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Daftar nama anatomi tidak bisa dimuat.')
        return response.json()
      })
      .then((table: TermTable) => setTerms(table))
      .catch((failure: unknown) => {
        if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'Daftar nama anatomi tidak bisa dimuat.')
      })
    return () => abort.abort()
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    setProgress(0)
    setError('')
    setAtlas(null)
    setChosen(null)
    setDetails(false)
    setPanel(null)
    setQuery('')
    setState(initial(sex))
    fetch(edition(sex).manifest, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Katalog anatomi tidak bisa dimuat.')
        return response.json()
      })
      .then((data: Atlas) => setAtlas(data))
      .catch((failure: unknown) => {
        if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'Katalog anatomi tidak bisa dimuat.')
      })
    return () => abort.abort()
  }, [sex])

  const openSearch = useCallback(() => {
    setDetails(false)
    setPanel('search')
  }, [])

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      if (event.key === '/' && !typing) {
        event.preventDefault()
        openSearch()
      }
      if (event.key === 'Escape') {
        setPanel(null)
        setAbout(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSearch])

  const name = useCallback((english: string) => (terms ? termFor(terms, english).la : english), [terms])
  const nameOf = useCallback((part: Part) => name(part.name), [name])
  const parts = useMemo(() => new Map(atlas?.parts.map((part) => [part.id, part])), [atlas])
  const counts = useMemo(
    () => new Map(SYSTEMS.map((system) => [system.id, atlas?.parts.filter((part) => part.system === system.id).length ?? 0])),
    [atlas]
  )
  const activeSystems = SYSTEMS.filter((system) => (counts.get(system.id) ?? 0) > 0)
  const selectedParts = state.selected.map((id) => parts.get(id)).filter((part): part is Part => part !== undefined)
  const selected = selectedParts[0]
  const system = SYSTEMS.find((entry) => entry.id === selected?.system)
  const visibleCount =
    atlas?.parts.filter((part) =>
      state.isolate ? state.selected.includes(part.id) : state.visible.includes(part.system) || state.selected.includes(part.id)
    ).length ?? 0
  const results = useMemo(
    () => (atlas && terms ? searchConcepts(atlas.concepts, terms, query, edition(atlas.sex ?? 'male').suggestions) : []),
    [atlas, terms, query]
  )
  const term = chosen && terms ? termFor(terms, chosen.name) : null
  const ready = atlas !== null && terms !== null

  const choose = useCallback((concept: Concept) => {
    setChosen(concept)
    setState((current) => ({ ...current, selected: concept.elements, isolate: false, rotate: false }))
    setDetails(true)
    setPanel(null)
  }, [])

  useEffect(() => {
    if (!atlas) return undefined
    return registerAtlasTools(atlas, (concept) => flushSync(() => choose(concept)))
  }, [atlas, choose])

  const choosePart = useCallback(
    (id: string) => {
      const part = parts.get(id)
      if (!part) return
      setChosen({ id: part.conceptId, name: part.name, elements: [id] })
      setState((current) => ({ ...current, selected: [id], isolate: false, rotate: false }))
      setDetails(true)
      setPanel(null)
    },
    [parts]
  )

  const showSystems = (visible: SystemId[]) => setState((current) => ({ ...current, selected: [], isolate: false, visible }))
  const toggle = (id: SystemId) => {
    setDetails(false)
    showSystems(state.visible.includes(id) ? state.visible.filter((entry) => entry !== id) : [...state.visible, id])
  }
  const reset = () => {
    setState((current) => ({ ...initial(sex), reset: current.reset + 1 }))
    setChosen(null)
    setDetails(false)
    setPanel(null)
  }
  const clearSelection = () => {
    setState((current) => ({ ...current, selected: [], isolate: false }))
    setDetails(false)
  }
  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(results.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault()
      choose(results[active])
    }
  }

  const allShown = activeSystems.every((entry) => state.visible.includes(entry.id))
  const skeletonOnly = state.visible.length === 1 && state.visible[0] === 'skeletal'
  const organsOnly = state.visible.length === ORGAN_SYSTEMS.length && ORGAN_SYSTEMS.every((id) => state.visible.includes(id))
  const captionText = state.isolate
    ? chosen
      ? name(chosen.name)
      : 'Struktur terpilih'
    : state.explode > 0.95
      ? 'Inventaris anatomi'
      : state.explode > 0.05
        ? 'Struktur terurai'
        : source.caption
  const detailOpen = details && selectedParts.length > 0

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Atlas Anatomi</h1>
          <p className={styles.subtitle}>
            {atlas ? count(atlas.parts.length) : '—'} bagian 3D · {source.dataset}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.bodies} role="group" aria-label="Tubuh referensi">
            {EDITIONS.map((entry) => (
              <button
                key={entry.sex}
                type="button"
                className="ui-chip"
                aria-pressed={sex === entry.sex}
                onClick={() => setSex(entry.sex)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={openSearch} disabled={!ready}>
            <Search size={16} aria-hidden />
            Cari struktur
            <kbd className={styles.kbd}>/</kbd>
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--ghost"
            aria-label="Tentang atlas ini"
            title="Tentang atlas ini"
            onClick={() => {
              setDetails(false)
              setPanel(null)
              setAbout(true)
            }}
          >
            <Info size={16} aria-hidden />
            Sumber
          </button>
        </div>
      </header>

      <section className={styles.stage} aria-label="Atlas 3D" data-detail={detailOpen ? 'open' : undefined}>
        {atlas && terms && (
          <AtlasScene
            atlas={atlas}
            state={{ ...state, inspectorOpen: detailOpen }}
            reducedMotion={reducedMotion}
            nameOf={nameOf}
            hoverClassName={styles.hover}
            className={styles.canvas}
            onSelect={choosePart}
            onProgress={(percent) => {
              setProgress(percent)
              if (percent === 100) setError('')
            }}
            onError={setError}
          />
        )}

        <section className={cx(styles.layers, panel === 'layers' && styles.layersOpen)} aria-label="Sistem anatomi">
          <div className={styles.panelHead}>
            <span>Sistem</span>
            <span className={styles.panelCount}>{activeSystems.length}</span>
            <button type="button" className={cx('ui-btn ui-btn--ghost ui-btn--sm', styles.mobileOnly)} aria-label="Tutup sistem" onClick={() => setPanel(null)}>
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className={styles.presets}>
            <button type="button" className="ui-chip" aria-pressed={allShown} onClick={() => showSystems(activeSystems.map((entry) => entry.id))}>
              Semua
            </button>
            <button type="button" className="ui-chip" aria-pressed={skeletonOnly} onClick={() => showSystems(['skeletal'])}>
              Rangka
            </button>
            <button type="button" className="ui-chip" aria-pressed={organsOnly} onClick={() => showSystems(ORGAN_SYSTEMS)}>
              Organ
            </button>
          </div>
          <ul className={styles.systemList}>
            {activeSystems.map((entry) => {
              const on = state.visible.includes(entry.id)
              return (
                <li key={entry.id} className={cx(styles.systemRow, on && styles.systemOn)}>
                  <button
                    type="button"
                    className={styles.systemName}
                    title={`Tampilkan hanya ${entry.name.toLowerCase()}`}
                    onClick={() => showSystems([entry.id])}
                  >
                    <span className={styles.systemDot} style={{ background: entry.color }} />
                    <span className={styles.systemLabel}>{entry.name}</span>
                    <span className={styles.systemCount}>{count(counts.get(entry.id) ?? 0)}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.systemToggle}
                    aria-pressed={on}
                    aria-label={`${on ? 'Sembunyikan' : 'Tampilkan'} ${entry.name.toLowerCase()}`}
                    onClick={() => toggle(entry.id)}
                  >
                    {on ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className={styles.panelFoot}>
            <span>{count(visibleCount)} bagian tampil</span>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => showSystems([])}>
              Sembunyikan semua
            </button>
          </div>
        </section>

        {panel === 'search' && (
          <section className={styles.search} aria-label="Cari struktur anatomi">
            <div className={styles.panelHead}>
              <span>Cari struktur</span>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Tutup pencarian" onClick={() => setPanel(null)}>
                <X size={16} aria-hidden />
              </button>
            </div>
            <label className="ui-search">
              <Search size={16} className="ui-search__icon" aria-hidden />
              <input
                className="ui-input ui-search__input"
                autoFocus
                value={query}
                placeholder="Cor, jantung, femur, nervus cranialis…"
                aria-label="Cari nama struktur anatomi"
                aria-controls="atlas-results"
                aria-activedescendant={results[active] ? `atlas-result-${active}` : undefined}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                onKeyDown={onSearchKey}
              />
            </label>
            {results.length === 0 ? (
              <p className={styles.searchNote}>Tidak ada struktur yang cocok.</p>
            ) : (
              <ul id="atlas-results" role="listbox" className={styles.results} aria-label="Hasil pencarian">
                {results.map((concept, index) => {
                  const entry = terms ? termFor(terms, concept.name) : null
                  return (
                    <li key={concept.id} id={`atlas-result-${index}`} role="option" aria-selected={index === active}>
                      <button
                        type="button"
                        className={cx(styles.result, index === active && styles.resultActive)}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(concept)}
                      >
                        <span className={styles.resultNames}>
                          <span className={styles.resultLatin}>{entry?.la ?? concept.name}</span>
                          <span className={styles.resultIndonesian}>{entry?.id}</span>
                        </span>
                        <span className={styles.resultCount}>{count(concept.elements.length)} bagian</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className={styles.searchNote}>
              {query ? 'Paling banyak 80 hasil. Perjelas kata kunci untuk struktur yang lebih kecil.' : 'Mulai dari organ utama, atau cari nama Latin, Indonesia, atau Inggris.'}
            </p>
          </section>
        )}

        <nav className={styles.views} aria-label="Kendali kamera">
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="ui-chip"
              aria-pressed={state.view === entry.id}
              title={entry.title}
              disabled={state.explode > 0.8 && entry.id !== 'front'}
              onClick={() => setState((current) => ({ ...current, view: entry.id, reset: current.reset + 1, rotate: false }))}
            >
              {entry.label}
            </button>
          ))}
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            disabled={state.explode >= 0.4}
            aria-pressed={state.rotate}
            aria-label={state.rotate ? 'Hentikan putaran' : 'Putar tubuh'}
            title="Putar otomatis"
            onClick={() => setState((current) => ({ ...current, rotate: !current.rotate }))}
          >
            {state.rotate ? <Pause size={16} aria-hidden /> : <RotateCw size={16} aria-hidden />}
          </button>
        </nav>

        <div className={styles.caption} aria-live="polite">
          {captionText}
        </div>

        <div className={styles.dock}>
          <button type="button" className={cx('ui-btn ui-btn--ghost ui-btn--sm', styles.mobileOnly)} onClick={() => setPanel(panel === 'layers' ? null : 'layers')}>
            <Layers3 size={16} aria-hidden />
            Sistem
          </button>
          <div className={styles.explode}>
            <div className={styles.explodeHead}>
              <label htmlFor="atlas-explode">Urai anatomi</label>
              <output htmlFor="atlas-explode">{Math.round(state.explode * 100)}%</output>
            </div>
            <input
              id="atlas-explode"
              className={styles.range}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(state.explode * 100)}
              onChange={(event) => {
                const value = Number(event.target.value)
                setState((current) => ({ ...current, explode: value / 100, view: value > 80 ? 'front' : current.view, rotate: false }))
              }}
            />
            <div className={styles.explodeEnds}>
              <span>Utuh</span>
              <span>Semua bagian</span>
            </div>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Rakit ulang dan atur ulang tampilan" onClick={reset}>
            <RotateCcw size={16} aria-hidden />
            Atur ulang
          </button>
        </div>

        <p className={styles.hint}>
          {state.explode > 0.8 ? 'Seret untuk menggeser' : 'Seret untuk memutar'} · Cubit atau gulir untuk zoom · Ketuk struktur untuk detail
        </p>

        {progress < 100 && !error && (
          <div className={styles.loading} role="status">
            <LoaderCircle size={18} className={styles.spin} aria-hidden />
            <div>
              <strong>Menyiapkan anatomi</strong>
              <span>
                {progress}% · memuat anatomi referensi {source.label.toLowerCase()}
              </span>
              <div className={styles.track}>
                <i style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className={cx(styles.loading, styles.error)} role="alert">
            <p>{error}</p>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => location.reload()}>
              Muat ulang atlas
            </button>
          </div>
        )}

        {detailOpen && chosen && (
          <aside className={cx(styles.detail, state.isolate && styles.detailIsolated)} data-atlas-detail aria-label="Detail struktur">
            <div className={styles.detailHead}>
              <span className={styles.detailAccent} style={{ background: system?.color }} />
              <div className={styles.detailTitles}>
                <span className={styles.eyebrow}>{system ? systemName(system.id) : 'Anatomi'}</span>
                <h2 className={styles.detailTitle}>{term?.la ?? chosen.name}</h2>
                {term && <p className={styles.detailIndonesian}>{term.id}</p>}
                {term && !term.verified && <span className="ui-badge ui-badge--neutral">Latin belum diverifikasi</span>}
              </div>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Tutup detail" onClick={() => setDetails(false)}>
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className={styles.detailBody} key={`${chosen.id}-${state.isolate}`}>
              <p className={styles.description}>{selected ? explanation(chosen.name, selected.system, sex) : ''}</p>
              {!described(chosen.name) && <span className={styles.contextNote}>Penjelasan umum sistem</span>}
              <dl className={styles.meta}>
                <div>
                  <dt>Nama sumber</dt>
                  <dd>{chosen.name}</dd>
                </div>
                <div>
                  <dt>Referensi atlas</dt>
                  <dd>{chosen.id}</dd>
                </div>
                <div>
                  <dt>Bagian terpilih</dt>
                  <dd>{count(state.selected.length)}</dd>
                </div>
              </dl>
              {selectedParts.length > 1 && (
                <div className={styles.members}>
                  <h3 className={styles.membersTitle}>Struktur yang termasuk</h3>
                  {selectedParts.slice(0, 50).map((part) => (
                    <button key={part.id} type="button" className={styles.member} onClick={() => choosePart(part.id)}>
                      <span>{name(part.name)}</span>
                      <ChevronRight size={14} aria-hidden />
                    </button>
                  ))}
                  {selectedParts.length > 50 && <p className={styles.contextNote}>Dan {count(selectedParts.length - 50)} bagian lainnya.</p>}
                </div>
              )}
              <a className={styles.sourceLink} href={source.download} target="_blank" rel="noreferrer">
                Lihat sumber anatomi
                <ArrowUpRight size={14} aria-hidden />
              </a>
            </div>
            <div className={styles.detailActions}>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                aria-pressed={state.isolate}
                onClick={() => setState((current) => ({ ...current, isolate: !current.isolate, explode: 0 }))}
              >
                <Focus size={16} aria-hidden />
                {state.isolate ? 'Tampilkan sekitarnya' : 'Isolasi struktur'}
              </button>
              <button type="button" className="ui-btn ui-btn--ghost" onClick={clearSelection}>
                Hapus pilihan
              </button>
            </div>
          </aside>
        )}
      </section>

      {about && (
        <div className="ui-dialog-backdrop" role="presentation" onClick={() => setAbout(false)}>
          <div
            className={cx('ui-dialog', styles.about)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="atlas-about-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ui-dialog__header">
              <h2 id="atlas-about-title" className="ui-dialog__title">
                Tentang atlas ini
              </h2>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" aria-label="Tutup" onClick={() => setAbout(false)}>
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className={cx('ui-dialog__body', styles.aboutBody)}>
              <p>
                <strong>
                  {source.label} · {source.dataset}
                </strong>
                <br />
                {source.summary}
              </p>
              <p>{source.limits}</p>
              <p>
                Kedua tubuh referensi berasal dari proyek yang berbeda, sehingga cakupan dan tingkat detailnya berbeda. Tidak satu pun memuat
                setiap struktur atau variasi tubuh manusia. Satu konsep bernama dapat terdiri atas beberapa bagian.
              </p>
              <p>
                Warna dan pengelompokan sistem dibuat untuk eksplorasi, dan geometrinya disederhanakan untuk web. Atlas ini adalah rujukan
                anatomi untuk pendidikan, bukan alat diagnosis atau pembedahan.
              </p>
              <p>
                Nama ditampilkan dalam bahasa Latin (Terminologia Anatomica) beserta nama Indonesianya; nama sumber dalam bahasa Inggris tetap
                tercantum di detail. Nama Latin bertanda &ldquo;belum diverifikasi&rdquo; diterjemahkan mesin dan belum dicocokkan dengan label
                Latin yang terbit.
              </p>
              <h3 className={styles.aboutHeading}>Sumber</h3>
              <p>{source.credit}</p>
              <div className={styles.aboutLinks}>
                <a href={source.licence} target="_blank" rel="noreferrer">
                  Lisensi data <ArrowUpRight size={14} aria-hidden />
                </a>
                <a href={source.download} target="_blank" rel="noreferrer">
                  Geometri dan metadata asli <ArrowUpRight size={14} aria-hidden />
                </a>
                <a href={source.publication} target="_blank" rel="noreferrer">
                  Publikasi sumber <ArrowUpRight size={14} aria-hidden />
                </a>
                <a href="/atlas/ATTRIBUTION.md" target="_blank" rel="noreferrer">
                  Atribusi lengkap <ArrowUpRight size={14} aria-hidden />
                </a>
                <a href="https://github.com/slorksmo/Human-Atlas" target="_blank" rel="noreferrer">
                  Kode Human Atlas (MIT) <ArrowUpRight size={14} aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
