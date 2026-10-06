// Copied from sentraverse app/sentrapedia/page.tsx (sentrahai.com/sentrapedia), Chief 2026-10-06.
'use client'

import { ChevronRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  CATEGORIES,
  DISEASES,
  type Disease,
  internationalSources,
  methodologySteps,
  nationalSources,
  professionalSources,
  stats,
} from '@/lib/sentrapedia/data'
import { cx } from '@/components/ui/cx'

import styles from './sentrapedia.module.css'

export default function SentrapediaPage() {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filtered = useMemo(() => {
    let r: Disease[] = DISEASES
    if (activeCat) r = r.filter((d) => d.kategori === activeCat)
    if (search.trim()) {
      const s = search.toLowerCase()
      r = r.filter(
        (d) =>
          d.nama.toLowerCase().includes(s) ||
          d.kode.toLowerCase().includes(s) ||
          d.definisi.toLowerCase().includes(s)
      )
    }
    return r
  }, [search, activeCat])

  const catCount = (catId: string) => DISEASES.filter((d: Disease) => d.kategori === catId).length

  const openSidebar = (d: Disease) => {
    setSelectedDisease(d)
    setSidebarOpen(true)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setTimeout(() => setSelectedDisease(null), 400)
  }

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Referensi Klinis Puskesmas Indonesia</p>
          <h1 className={styles.title}>Sentrapedia</h1>

          <div className={styles.divider} aria-hidden="true">
            <span className={styles.dividerLine} />
            <span className={styles.dividerDot} />
            <span className={styles.dividerLine} />
          </div>

          <p className={styles.body}>
            Intisari diagnostik dan terapi 144 penyakit puskesmas. Kami menyuling ribuan halaman
            Permenkes No. 5/2014 menjadi panduan yang langsung bisa Anda pakai di depan pasien.
          </p>
          <p className={cx(styles.bodySm, styles.curator)}>
            Dikurasi oleh dr. Ferdi Iskandar. Tidak ada teks bertele-tele, hanya referensi taktis
            dan cepat untuk layanan primer yang sibuk.
          </p>
          <div className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <span className={styles.statValue}>{s.val}</span>
                <span className={styles.meta}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search */}
      <section className={cx(styles.container, styles.searchSection)}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari penyakit, kode ICD-10, atau gejala..."
            aria-label="Cari penyakit, kode ICD-10, atau gejala"
            autoComplete="off"
            className={styles.searchInput}
          />
        </div>

        {/* Filter pills */}
        <div className={styles.pills}>
          <button
            type="button"
            className="ui-chip"
            aria-pressed={activeCat === null}
            onClick={() => setActiveCat(null)}
          >
            Semua
            <span className={styles.pillCount}>{DISEASES.length}</span>
          </button>
          {CATEGORIES.map((c) => {
            const n = catCount(c.id)
            if (n === 0) return null
            return (
              <button
                key={c.id}
                type="button"
                className="ui-chip"
                aria-pressed={activeCat === c.id}
                onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
              >
                {c.id}
                <span className={styles.pillCount}>{n}</span>
              </button>
            )
          })}
          {search && <span className={cx(styles.meta, styles.resultCount)}>{filtered.length} hasil</span>}
        </div>
      </section>

      {/* Category grid */}
      <section className={cx(styles.container, styles.section)}>
        <div className={styles.sectionHead}>
          <span className={styles.meta}>Kategori Penyakit</span>
          <span className={styles.meta}>{CATEGORIES.length} kategori</span>
        </div>
        <div className={styles.grid}>
          {(activeCat ? CATEGORIES.filter((c) => c.id === activeCat) : CATEGORIES).map((c) => {
            const n = catCount(c.id)
            if (n === 0) return null
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
                className={cx(styles.card, activeCat === c.id && styles.cardActive)}
              >
                <span className={styles.cardBar} />
                <div className={styles.meta}>{c.kode}</div>
                <div className={styles.cardName}>{c.name}</div>
                <p className={cx(styles.bodySm, styles.cardDesc)}>{c.desc}</p>
                <div className={cx(styles.meta, styles.cardCount)}>{n} penyakit terarsip</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Disease list */}
      <section className={cx(styles.container, styles.section)}>
        <div className={cx(styles.sectionHead, styles.listHead)}>
          <span className={styles.meta}>
            {activeCat ? CATEGORIES.find((c) => c.id === activeCat)?.name : 'Daftar Penyakit'}
          </span>
          <span className={styles.meta}>{filtered.length} penyakit</span>
        </div>
        <div className={styles.list}>
          {filtered.map((d) => (
            <button key={d.id} type="button" onClick={() => openSidebar(d)} className={styles.row}>
              <div className={styles.rowDot} />
              <div className={styles.rowBody}>
                <div className={styles.rowText}>
                  <div className={styles.rowName}>{d.nama}</div>
                  <div className={cx(styles.bodySm, styles.rowDefinition)}>{d.definisi}</div>
                </div>
                <div className={styles.rowTags}>
                  <span className={styles.meta}>{d.kode}</span>
                  <span className={styles.meta}>{d.kategori}</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Tidak ditemukan hasil</div>
              <div className={cx(styles.bodySm, styles.emptyHint)}>Coba kata kunci lain atau reset filter</div>
            </div>
          )}
        </div>
      </section>

      {/* Sources and methodology */}
      <section className={cx(styles.container, styles.section)}>
        <div className={styles.sources}>
          <div>
            <div className={cx(styles.meta, styles.sourceHead)}>Sumber Nasional</div>
            <ul className={styles.sourceList}>
              {nationalSources.map((s) => (
                <li key={s} className={styles.bodySm}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className={cx(styles.meta, styles.sourceHead)}>Organisasi Profesi</div>
            <ul className={styles.sourceList}>
              {professionalSources.map((s) => (
                <li key={s} className={styles.bodySm}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className={cx(styles.meta, styles.sourceHead)}>Pedoman Internasional</div>
            <ul className={styles.sourceList}>
              {internationalSources.map((s) => (
                <li key={s} className={styles.bodySm}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.method}>
          {methodologySteps.map((m) => (
            <div key={m.step} className={styles.methodCard}>
              <div className={cx(styles.meta, styles.methodStep)}>{m.step}</div>
              <div className={styles.methodTitle}>{m.title}</div>
              <p className={cx(styles.bodySm, styles.methodDesc)}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detail drawer */}
      <div className={cx(styles.overlay, sidebarOpen && styles.overlayOpen)} onClick={closeSidebar} />
      <aside className={cx(styles.drawer, sidebarOpen && styles.drawerOpen)} aria-hidden={!sidebarOpen}>
        {selectedDisease && (
          <>
            <div className={styles.drawerHead}>
              <div>
                <div className={cx(styles.meta, styles.drawerMeta)}>
                  {selectedDisease.kode} —{' '}
                  {CATEGORIES.find((c) => c.id === selectedDisease.kategori)?.name || selectedDisease.kategori}
                </div>
                <div className={styles.drawerTitle}>{selectedDisease.nama}</div>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Tutup"
                className={cx('ui-btn ui-btn--ghost ui-btn--sm', styles.close)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.drawerBody}>
              <div>
                <div className={cx(styles.meta, styles.fieldHead)}>Definisi</div>
                <p className={styles.bodySm}>{selectedDisease.definisi}</p>
              </div>
              {selectedDisease.gejala && selectedDisease.gejala.length > 0 && (
                <div>
                  <div className={cx(styles.meta, styles.fieldHead)}>Gejala Klinis</div>
                  <ul className={styles.symptoms}>
                    {selectedDisease.gejala.map((g, i) => (
                      <li key={i} className={cx(styles.bodySm, styles.symptom)}>
                        <ChevronRight size={14} className={styles.symptomMark} aria-hidden="true" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className={cx(styles.meta, styles.fieldHead)}>Diagnosis</div>
                <p className={styles.bodySm}>{selectedDisease.diagnosis}</p>
              </div>
              <div>
                <div className={cx(styles.meta, styles.fieldHead)}>Terapi</div>
                <p className={styles.bodySm}>{selectedDisease.terapi}</p>
              </div>
              <div>
                <div className={cx(styles.meta, styles.fieldHead)}>Kriteria Rujukan</div>
                <p className={styles.bodySm}>{selectedDisease.rujukan}</p>
              </div>
              <div className={styles.refs}>
                <div className={cx(styles.meta, styles.refHead)}>Referensi</div>
                <div className={styles.refList}>
                  {['Permenkes 5/2014', 'SK Menkes 1186/2022', 'WHO 2026', 'ICD-10'].map((ref) => (
                    <span key={ref} className={styles.refTag}>
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
