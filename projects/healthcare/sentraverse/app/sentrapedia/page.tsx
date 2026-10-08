// Architected and built by Drferdi.
// Adapted from (legacy) code-prototype\assist-site\app\sentrapedia\page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import {
  CATEGORIES,
  DISEASES,
  type Disease,
  internationalSources,
  methodologySteps,
  nationalSources,
  professionalSources,
  stats,
} from '@/components/sentrapedia/data'
import SentraAgentNodeGraph from '@/components/sentra-agent-node-graph'
import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

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
    <div>
      <Navbar />
      <main className="bg-background text-foreground">
        {/* ═══ Hero ═══ */}
        <section className="relative overflow-hidden border-b border-muted/20 pt-32 pb-20">
          <div
            className={cn(
              'relative z-10',
              layoutGovernance.container.wide,
              layoutGovernance.sectionX
            )}
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 xl:gap-14 items-center">
              <div>
                <p className={typeGovernance.eyebrow}>Referensi Klinis Puskesmas Indonesia</p>
                <h1
                  className={cn(
                    typeGovernance.editorialDisplay,
                    'mt-3 text-[56px] leading-[0.95] md:text-[96px]'
                  )}
                >
                  Sentrapedia
                </h1>

                {/* Garis — titik — garis, andalan Sentra */}
                <div className="mt-6 flex max-w-[280px] items-center gap-4" aria-hidden="true">
                  <span className="h-px flex-1 bg-accent/60" />
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="h-px flex-1 bg-accent/60" />
                </div>

                <p className={cn(typeGovernance.body, 'mt-6 max-w-[640px]')}>
                  Intisari diagnostik dan terapi 144 penyakit puskesmas. Kami menyuling ribuan halaman
                  Permenkes No. 5/2014 menjadi panduan yang langsung bisa Anda pakai di depan pasien.
                </p>
                <p className={cn(typeGovernance.bodySm, 'mt-3 max-w-[640px] italic')}>
                  Dikurasi oleh dr. Ferdi Iskandar. Tidak ada teks bertele-tele, hanya referensi taktis
                  dan cepat untuk layanan primer yang sibuk.
                </p>
                <div className="mt-10 flex flex-wrap gap-10">
                  {stats.map((s) => (
                    <div key={s.label} className="flex flex-col gap-1">
                      <span
                        className={cn(
                          typeGovernance.editorialDisplay,
                          'text-4xl md:text-5xl text-accent'
                        )}
                      >
                        {s.val}
                      </span>
                      <span className={typeGovernance.monoMeta}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Realistic Agent Orchestration Node Graph */}
              <div className="w-full flex items-center justify-center lg:justify-end overflow-visible py-4">
                <SentraAgentNodeGraph />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Search ═══ */}
        <section
          className={cn('py-10', layoutGovernance.container.wide, layoutGovernance.sectionX)}
        >
          <div className="flex items-center gap-3 border border-muted/25 bg-foreground/[0.02] px-5 py-3.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="shrink-0 text-muted"
            >
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="11.5" y1="11.5" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari penyakit, kode ICD-10, atau gejala..."
              autoComplete="off"
              className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted/60 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCat(null)}
              className={cn(
                'inline-flex items-center gap-2 border px-3.5 py-1.5 font-jakarta text-[10px] font-bold uppercase tracking-widest transition-colors',
                activeCat === null
                  ? 'border-accent bg-accent text-white'
                  : 'border-muted/25 text-muted hover:border-muted/50 hover:text-foreground'
              )}
            >
              Semua
              <span className="opacity-70">{DISEASES.length}</span>
            </button>
            {CATEGORIES.map((c) => {
              const n = catCount(c.id)
              if (n === 0) return null
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
                  className={cn(
                    'inline-flex items-center gap-2 border px-3.5 py-1.5 font-jakarta text-[10px] font-bold uppercase tracking-widest transition-colors',
                    activeCat === c.id
                      ? 'border-accent bg-accent text-white'
                      : 'border-muted/25 text-muted hover:border-muted/50 hover:text-foreground'
                  )}
                >
                  {c.id}
                  <span className="opacity-70">{n}</span>
                </button>
              )
            })}
            {search && (
              <span className={cn(typeGovernance.monoMeta, 'ml-2')}>{filtered.length} hasil</span>
            )}
          </div>
        </section>

        {/* ═══ Category Grid ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-8 flex items-center justify-between border-b border-muted/20 pb-3">
            <span className={typeGovernance.monoMeta}>Kategori Penyakit</span>
            <span className={typeGovernance.monoMeta}>{CATEGORIES.length} kategori</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(activeCat ? CATEGORIES.filter((c) => c.id === activeCat) : CATEGORIES).map((c) => {
              const n = catCount(c.id)
              if (n === 0) return null
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
                  className={cn(
                    'group relative overflow-hidden border p-6 text-left transition-all duration-300',
                    activeCat === c.id
                      ? 'border-accent bg-accent/[0.04]'
                      : 'border-muted/20 hover:border-muted/40 hover:bg-foreground/[0.02]'
                  )}
                >
                  <span className="absolute left-0 top-0 h-full w-[3px] origin-bottom scale-y-0 bg-accent transition-transform duration-300 group-hover:scale-y-100" />
                  <div className={typeGovernance.monoMeta}>{c.kode}</div>
                  <div className={cn(typeGovernance.editorialDisplay, 'mt-3 text-lg')}>
                    {c.name}
                  </div>
                  <p className={cn(typeGovernance.bodySm, 'mt-2')}>{c.desc}</p>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted/60">
                    {n} penyakit terarsip
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ═══ Disease List ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-6 flex items-center justify-between border-b border-muted/20 pb-3">
            <span className={typeGovernance.monoMeta}>
              {activeCat ? CATEGORIES.find((c) => c.id === activeCat)?.name : 'Daftar Penyakit'}
            </span>
            <span className={typeGovernance.monoMeta}>{filtered.length} penyakit</span>
          </div>
          <div className="flex flex-col">
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => openSidebar(d)}
                className="group flex items-start gap-4 border-b border-muted/15 py-4 text-left transition-colors hover:bg-foreground/[0.02]"
              >
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted/30 transition-colors group-hover:bg-accent" />
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[560px]">
                    <div className="font-jakarta text-[15px] font-semibold text-foreground">
                      {d.nama}
                    </div>
                    <div className={cn(typeGovernance.bodySm, 'mt-1 line-clamp-1')}>
                      {d.definisi}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
                      {d.kode}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
                      {d.kategori}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <div className="font-jakarta text-lg font-semibold">Tidak ditemukan hasil</div>
                <div className={cn(typeGovernance.bodySm, 'mt-1')}>
                  Coba kata kunci lain atau reset filter
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══ Sources & Methodology ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className={cn(typeGovernance.monoMeta, 'mb-5')}>Sumber Nasional</div>
              <ul className="flex flex-col gap-3">
                {nationalSources.map((s) => (
                  <li key={s} className={typeGovernance.bodySm}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className={cn(typeGovernance.monoMeta, 'mb-5')}>Organisasi Profesi</div>
              <ul className="flex flex-col gap-3">
                {professionalSources.map((s) => (
                  <li key={s} className={typeGovernance.bodySm}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className={cn(typeGovernance.monoMeta, 'mb-5')}>Pedoman Internasional</div>
              <ul className="flex flex-col gap-3">
                {internationalSources.map((s) => (
                  <li key={s} className={typeGovernance.bodySm}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {methodologySteps.map((m) => (
              <div key={m.step} className="border border-muted/20 p-6">
                <div className={cn(typeGovernance.monoMeta, 'text-accent')}>{m.step}</div>
                <div className={cn(typeGovernance.editorialDisplay, 'mt-3 text-base')}>
                  {m.title}
                </div>
                <p className={cn(typeGovernance.bodySm, 'mt-2')}>{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />

      {/* ═══ Detail Sidebar ═══ */}
      <div
        className={cn(
          'fixed inset-0 z-[99] bg-black/40 transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeSidebar}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[100] h-screen w-full max-w-[480px] overflow-y-auto border-l border-muted/20 bg-background p-8 transition-transform duration-500',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {selectedDisease && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-muted/20 pb-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  {selectedDisease.kode} —{' '}
                  {CATEGORIES.find((c) => c.id === selectedDisease.kategori)?.name ||
                    selectedDisease.kategori}
                </div>
                <div className={cn(typeGovernance.editorialDisplay, 'mt-2 text-2xl')}>
                  {selectedDisease.nama}
                </div>
              </div>
              <button
                onClick={closeSidebar}
                aria-label="Tutup"
                className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2')}>Definisi</div>
                <p className={typeGovernance.bodySm}>{selectedDisease.definisi}</p>
              </div>
              {selectedDisease.gejala && selectedDisease.gejala.length > 0 && (
                <div>
                  <div className={cn(typeGovernance.monoMeta, 'mb-2')}>Gejala Klinis</div>
                  <ul className="flex flex-col gap-1.5">
                    {selectedDisease.gejala.map((g, i) => (
                      <li key={i} className={cn(typeGovernance.bodySm, 'flex gap-2')}>
                        <span className="text-accent">▸</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2')}>Diagnosis</div>
                <p className={typeGovernance.bodySm}>{selectedDisease.diagnosis}</p>
              </div>
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2')}>Terapi</div>
                <p className={typeGovernance.bodySm}>{selectedDisease.terapi}</p>
              </div>
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2')}>Kriteria Rujukan</div>
                <p className={typeGovernance.bodySm}>{selectedDisease.rujukan}</p>
              </div>
              <div className="border-t border-muted/20 pt-5">
                <div className={cn(typeGovernance.monoMeta, 'mb-3')}>Referensi</div>
                <div className="flex flex-wrap gap-2">
                  {['Permenkes 5/2014', 'SK Menkes 1186/2022', 'WHO 2026', 'ICD-10'].map((ref) => (
                    <span
                      key={ref}
                      className="border border-muted/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted"
                    >
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
