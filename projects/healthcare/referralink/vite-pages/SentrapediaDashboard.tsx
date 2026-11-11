import { Close, Search } from '@carbon/icons-react'
import { useMemo, useState } from 'react'

import {
  SENTRAPEDIA_CATEGORIES,
  searchSentrapedia,
  type SentrapediaDisease,
} from '../services/sentrapediaCatalog'

function DetailDrawer({ disease, onClose }: { disease: SentrapediaDisease; onClose: () => void }) {
  return (
    <>
      <div className="db01-operational-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="db01-operational-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sentrapedia-detail-title"
      >
        <div className="db01-operational-drawer__header">
          <div>
            <p className="db01-operational-eyebrow">
              {disease.code} · {disease.category}
            </p>
            <h2 id="sentrapedia-detail-title">{disease.name}</h2>
          </div>
          <button
            type="button"
            className="db01-icon-button"
            onClick={onClose}
            aria-label="Tutup detail penyakit"
          >
            <Close size={20} aria-hidden="true" />
          </button>
        </div>
        <section className="db01-operational-detail-section">
          <h3>Definisi</h3>
          <p>{disease.definition}</p>
        </section>
        <section className="db01-operational-detail-section">
          <h3>Gejala klinis</h3>
          <ul>
            {disease.symptoms.map((symptom) => (
              <li key={symptom}>{symptom}</li>
            ))}
          </ul>
        </section>
        <section className="db01-operational-detail-section">
          <h3>Diagnosis</h3>
          <p>{disease.diagnosis}</p>
        </section>
        <section className="db01-operational-detail-section">
          <h3>Terapi</h3>
          <p>{disease.therapy}</p>
        </section>
        <section className="db01-operational-detail-section">
          <h3>Kriteria rujukan</h3>
          <p>{disease.referralCriteria}</p>
        </section>
      </aside>
    </>
  )
}

export default function SentrapediaDashboard() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedDisease, setSelectedDisease] = useState<SentrapediaDisease | null>(null)
  const results = useMemo(() => searchSentrapedia(search, category), [search, category])

  return (
    <main id="main-content" className="db01-operational-page">
      <header className="db01-operational-topbar">
        <span className="db01-operational-topbar__mark" aria-hidden="true">
          ⌕
        </span>
        <span>Sentrapedia · Referensi klinis</span>
      </header>
      <div className="db01-operational-content">
        <section className="db01-operational-hero">
          <div>
            <p className="db01-operational-eyebrow">Snapshot referensi klinis lokal</p>
            <h1>Sentrapedia</h1>
            <p>Cari 144 entri referensi klinis sintetis yang diadaptasi dari sumber Sentra.</p>
          </div>
          <div className="db01-operational-stat">
            <strong>{results.length}</strong>
            <span>entri cocok</span>
          </div>
        </section>

        <p className="db01-operational-note">
          Hanya untuk referensi; snapshot lokal ini bukan sumber ICD-10 otoritatif.
        </p>

        <section className="db01-operational-panel" aria-label="Pencarian Sentrapedia">
          <div className="db01-operational-search">
            <Search size={20} aria-hidden="true" />
            <input
              aria-label="Cari Sentrapedia"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari penyakit, kode ICD-10, definisi, atau gejala"
            />
          </div>
          <div className="db01-operational-category-heading">Filter kategori</div>
          <label className="db01-sentrapedia-category-select">
            Kategori
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">Semua kategori</option>
              {SENTRAPEDIA_CATEGORIES.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.id}
                </option>
              ))}
            </select>
          </label>
          <div className="db01-operational-filter-row db01-operational-filter-row--wrap">
            <button
              type="button"
              className={category === 'all' ? 'is-active' : ''}
              onClick={() => setCategory('all')}
            >
              Semua <span>144</span>
            </button>
            {SENTRAPEDIA_CATEGORIES.map((item) => {
              const count = searchSentrapedia('', item.id).length
              return (
                <button
                  type="button"
                  className={category === item.id ? 'is-active' : ''}
                  onClick={() => setCategory(item.id)}
                  key={item.id}
                >
                  {item.id} <span>{count}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="db01-operational-records" aria-live="polite">
          <div className="db01-operational-list-header">
            <span>{category === 'all' ? 'Semua entri klinis' : category}</span>
            <span>{results.length} entri</span>
          </div>
          {results.length === 0 ? (
            <p className="db01-operational-empty">Tidak ada entri Sentrapedia yang cocok.</p>
          ) : (
            results.map((disease) => (
              <button
                type="button"
                className="db01-sentrapedia-record"
                key={disease.id}
                onClick={() => setSelectedDisease(disease)}
              >
                <strong>{disease.name}</strong>
              </button>
            ))
          )}
        </section>
      </div>
      {selectedDisease ? (
        <DetailDrawer disease={selectedDisease} onClose={() => setSelectedDisease(null)} />
      ) : null}
    </main>
  )
}
