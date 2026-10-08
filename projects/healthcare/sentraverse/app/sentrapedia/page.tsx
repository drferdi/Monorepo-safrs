// Architected and built by Drferdi.
// Sentrapedia — Kompendium Klinis & Basis Pengetahuan Layanan Primer Indonesia
'use client'

import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  CATEGORIES,
  DISEASES,
  type Disease,
  internationalSources,
  methodologySteps,
  nationalSources,
  professionalSources,
  stats,
} from '@/lib/data'
import SentraAgentNodeGraph from '@/components/sentra-agent-node-graph'
import IntroMotionSplash from '@/components/intro-motion-splash'
import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'
import {
  Code2,
  ExternalLink,
  Check,
  Copy,
  X,
  ShieldCheck,
  FileText,
  Activity,
  Layers,
  Search,
  BookOpen,
  Stethoscope,
  ChevronRight,
  Database,
  ArrowRight,
} from 'lucide-react'

export default function SentrapediaPage() {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showApiModal, setShowApiModal] = useState(false)
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  const [apiTab, setApiTab] = useState<'curl' | 'python' | 'typescript'>('curl')

  const filtered = useMemo(() => {
    let r: Disease[] = DISEASES
    if (activeCat) r = r.filter((d) => d.kategori === activeCat)
    if (search.trim()) {
      const s = search.toLowerCase()
      r = r.filter(
        (d) =>
          d.nama.toLowerCase().includes(s) ||
          d.kode.toLowerCase().includes(s) ||
          d.definisi.toLowerCase().includes(s) ||
          d.gejala.some((g) => g.toLowerCase().includes(s)) ||
          d.terapi.toLowerCase().includes(s) ||
          d.diagnosis.toLowerCase().includes(s)
      )
    }
    return r
  }, [search, activeCat])

  const catCount = (catId: string) =>
    DISEASES.filter((d: Disease) => d.kategori === catId).length

  const openSidebar = (d: Disease) => {
    setSelectedDisease(d)
    setSidebarOpen(true)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setTimeout(() => setSelectedDisease(null), 400)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(key)
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  useEffect(() => {
    document.body.style.overflow = sidebarOpen || showApiModal ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen, showApiModal])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-accent selection:text-white">
      {/* Cinematic Motion Intro Splash on Opening */}
      <IntroMotionSplash />

      <Navbar onOpenApiModal={() => setShowApiModal(true)} />

      <main className="flex-1 bg-background text-foreground">
        {/* ═══ 1. Hero Section: Public Professional ═══ */}
        <section className="relative overflow-hidden border-b border-muted/20 pt-32 pb-20 md:pt-36 md:pb-24">
          <div
            className={cn(
              'relative z-10',
              layoutGovernance.container.wide,
              layoutGovernance.sectionX
            )}
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 xl:gap-14 items-center">
              {/* Left Column: Title & Editorial Brief */}
              <div>
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <p className={typeGovernance.eyebrow}>
                    Basis Pengetahuan Klinis Layanan Primer Indonesia
                  </p>
                </div>

                <h1
                  className={cn(
                    typeGovernance.editorialDisplay,
                    'mt-2 text-[56px] leading-[0.95] md:text-[96px] text-white'
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

                <div className="mt-8 space-y-4">
                  <p className={cn(typeGovernance.body, 'text-foreground/90 font-normal leading-relaxed')}>
                    Sentrapedia adalah kompendium digital dan basis pengetahuan klinis terbuka yang 
                    menyajikan standardisasi diagnostik, manifestasi gejala, protokol tatalaksana farmakologis, 
                    dan kriteria rujukan medis untuk <strong>144 penyakit layanan tingkat pertama</strong> di Indonesia.
                  </p>
                  <p className={cn(typeGovernance.bodySm, 'text-muted/80 leading-relaxed')}>
                    Disusun berlandaskan <strong>Standar Kompetensi Dokter Indonesia (SKDI Tingkat Kemampuan 4A)</strong>, 
                    Permenkes No. 5/2014, dan KMK No. HK.01.07/MENKES/1186/2022. Basis data ini dirancang sebagai 
                    <strong> Universal Clinical Grounding Engine</strong> yang dapat diakses langsung oleh tenaga medis 
                    maupun dihubungkan via API/RAG ke berbagai model kecerdasan buatan terdepan seperti 
                    <strong> Claude (Anthropic), Gemini (Google), ChatGPT (OpenAI), Audrey</strong>, serta sistem agen klinis kustom.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-muted/70 font-mono">
                    <span className="inline-flex items-center gap-1.5 text-accent">
                      <ShieldCheck className="w-4 h-4" />
                      Kurasi Medis: dr. Ferdi Iskandar
                    </span>
                    <span>•</span>
                    <span className="text-white/80 font-medium">Ready for: Claude · Gemini · ChatGPT · Audrey</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Realistic Agent Orchestration Node Graph (sentrahai.com/story) */}
              <div className="w-full flex items-center justify-center lg:justify-end overflow-visible py-4">
                <SentraAgentNodeGraph />
              </div>
            </div>

            {/* Matrix Statistik */}
            <div className="mt-12 flex flex-wrap gap-10 md:gap-14 pt-8 border-t border-muted/15">
              <div className="flex flex-col gap-1">
                <span className={cn(typeGovernance.editorialDisplay, 'text-4xl md:text-5xl text-accent')}>
                  144
                </span>
                <span className={typeGovernance.monoMeta}>Kondisi Klinis Mandiri (SKDI 4A)</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={cn(typeGovernance.editorialDisplay, 'text-4xl md:text-5xl text-accent')}>
                  14
                </span>
                <span className={typeGovernance.monoMeta}>Domain Spesialisasi Organ</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={cn(typeGovernance.editorialDisplay, 'text-4xl md:text-5xl text-accent')}>
                  5
                </span>
                <span className={typeGovernance.monoMeta}>Dimensi Parameter Klinis</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={cn(typeGovernance.editorialDisplay, 'text-4xl md:text-5xl text-accent')}>
                  &lt; 20ms
                </span>
                <span className={typeGovernance.monoMeta}>Latensi Akses API Terbuka</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 2. Institutional Explainer: "Apa itu Sentrapedia?" ═══ */}
        <section
          className={cn(
            'py-16 border-b border-muted/20 bg-foreground/[0.01]',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-muted/20 pb-4">
            <div>
              <div className={typeGovernance.monoMeta}>Arsitektur Pengetahuan & Regulasi</div>
              <h2 className={cn(typeGovernance.editorialDisplay, 'text-2xl md:text-3xl text-white mt-1')}>
                Mengenal Basis Data Sentrapedia
              </h2>
            </div>
            <p className={cn(typeGovernance.bodySm, 'max-w-md text-muted/70')}>
              Menjembatani regulasi ribuan lembar panduan praktik klinis nasional ke dalam format digital terstruktur yang siap dikonsumsi dokter maupun agen AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 */}
            <div className="border border-muted/20 p-6 bg-background hover:border-muted/40 transition-colors">
              <div className="w-8 h-8 rounded-none border border-accent/40 bg-accent/10 flex items-center justify-center text-accent mb-4">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className={typeGovernance.monoMeta}>Pilar 01 · Kompendium Terbuka</div>
              <h3 className={cn(typeGovernance.editorialDisplay, 'text-lg text-white mt-2 mb-2')}>
                Standardisasi Diagnosis Primer
              </h3>
              <p className={cn(typeGovernance.bodySm, 'text-muted/80 text-xs leading-relaxed')}>
                Menyediakan rangkuman berbasis bukti (*evidence-based*) yang memuat definisi etiologis, kriteria diagnosis, pemeriksaan penunjang esensial, serta tatalaksana lini pertama tanpa multitafsir.
              </p>
            </div>

            {/* Box 2 */}
            <div className="border border-muted/20 p-6 bg-background hover:border-muted/40 transition-colors">
              <div className="w-8 h-8 rounded-none border border-accent/40 bg-accent/10 flex items-center justify-center text-accent mb-4">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className={typeGovernance.monoMeta}>Pilar 02 · Tingkat Kemampuan 4A</div>
              <h3 className={cn(typeGovernance.editorialDisplay, 'text-lg text-white mt-2 mb-2')}>
                Kompetensi Mandiri Tuntas
              </h3>
              <p className={cn(typeGovernance.bodySm, 'text-muted/80 text-xs leading-relaxed')}>
                Kondisi 4A mewajibkan dokter di FKTP (Puskesmas/Klinik Mandiri) untuk menegakkan diagnosis dan mengelola pasien secara tuntas, serta secara presisi mengenali tanda bahaya (*red flags*) saat rujukan diperlukan.
              </p>
            </div>

            {/* Box 3 */}
            <div className="border border-muted/20 p-6 bg-background hover:border-muted/40 transition-colors">
              <div className="w-8 h-8 rounded-none border border-accent/40 bg-accent/10 flex items-center justify-center text-accent mb-4">
                <Database className="w-4 h-4" />
              </div>
              <div className={typeGovernance.monoMeta}>Pilar 03 · Multi-Agent & RAG Engine</div>
              <h3 className={cn(typeGovernance.editorialDisplay, 'text-lg text-white mt-2 mb-2')}>
                Interoperabilitas Claude, Gemini & GPT
              </h3>
              <p className={cn(typeGovernance.bodySm, 'text-muted/80 text-xs leading-relaxed')}>
                Bukan hanya untuk dokter manusia: pangkalan data ini terstruktur khusus untuk RAG (*Retrieval-Augmented Generation*) dan tool-calling oleh LLM terdepan (Claude, Gemini, ChatGPT) guna mencegah halusinasi medis dan memandu CDSS secara akurat.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 3. Search & Filter Bar ═══ */}
        <section
          className={cn('py-10', layoutGovernance.container.wide, layoutGovernance.sectionX)}
        >
          <div className="flex items-center gap-3 border border-muted/25 bg-foreground/[0.02] px-5 py-4 focus-within:border-accent transition-colors">
            <Search className="w-5 h-5 text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pencarian kondisi klinis, kode ICD-10, manifestasi gejala (mis: batuk, demam), atau terapi..."
              autoComplete="off"
              className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted/60 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted hover:text-foreground text-xs font-mono uppercase tracking-wider px-2 py-1 border border-muted/30"
              >
                Reset
              </button>
            )}
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
              Semua Domain
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
              <span className={cn(typeGovernance.monoMeta, 'ml-3')}>
                {filtered.length} kondisi ditemukan
              </span>
            )}
          </div>
        </section>

        {/* ═══ 4. Category Grid (14 Specialty Domains) ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-8 flex items-center justify-between border-b border-muted/20 pb-3">
            <div>
              <span className={typeGovernance.monoMeta}>Klasifikasi Sistem Organ & Spesialisasi</span>
              <h2 className={cn(typeGovernance.editorialDisplay, 'text-xl text-white mt-1')}>
                Domain Klinis Terstandardisasi
              </h2>
            </div>
            <span className={typeGovernance.monoMeta}>{CATEGORIES.length} domain spesialis</span>
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
                  <div className={typeGovernance.monoMeta}>Klasifikasi ICD-10: {c.kode}</div>
                  <div className={cn(typeGovernance.editorialDisplay, 'mt-3 text-lg text-white')}>
                    {c.name}
                  </div>
                  <p className={cn(typeGovernance.bodySm, 'mt-2 text-xs leading-relaxed text-muted/80')}>
                    {c.desc}
                  </p>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted/60 flex items-center justify-between">
                    <span>{n} entitas terstandardisasi</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ═══ 5. Disease List ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-6 flex items-center justify-between border-b border-muted/20 pb-3">
            <div>
              <span className={typeGovernance.monoMeta}>Kompendium Lengkap</span>
              <h2 className={cn(typeGovernance.editorialDisplay, 'text-xl text-white mt-1')}>
                {activeCat ? CATEGORIES.find((c) => c.id === activeCat)?.name : 'Daftar Entitas Klinis Layanan Primer'}
              </h2>
            </div>
            <span className={typeGovernance.monoMeta}>{filtered.length} dari 144 entitas</span>
          </div>
          <div className="flex flex-col">
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => openSidebar(d)}
                className="group flex items-start gap-4 border-b border-muted/15 py-4 text-left transition-colors hover:bg-foreground/[0.02]"
              >
                <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted/30 transition-colors group-hover:bg-accent" />
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[640px]">
                    <div className="font-jakarta text-[15px] font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-2">
                      <span>{d.nama}</span>
                    </div>
                    <div className={cn(typeGovernance.bodySm, 'mt-1 line-clamp-1 text-xs text-muted/80')}>
                      {d.definisi}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 items-center">
                    <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border border-muted/25 text-muted/80 bg-foreground/[0.01]">
                      ICD-10: {d.kode}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60 hidden sm:inline">
                      {d.kategori}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-20 text-center border border-dashed border-muted/20 my-4">
                <div className="font-jakarta text-lg font-semibold text-white">
                  Kondisi Klinis Tidak Ditemukan
                </div>
                <div className={cn(typeGovernance.bodySm, 'mt-1 text-sm text-muted/70')}>
                  Silakan periksa kembali ejaan kata kunci atau reset pilihan kategori.
                </div>
                <button
                  onClick={() => {
                    setSearch('')
                    setActiveCat(null)
                  }}
                  className="mt-4 px-4 py-1.5 border border-accent bg-accent/10 text-accent text-xs font-mono font-bold uppercase tracking-wider"
                >
                  Tampilkan Semua Penyakit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═══ 6. Sources & Methodology ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-10 border-b border-muted/20 pb-4">
            <span className={typeGovernance.monoMeta}>Tata Kelola & Validitas Ilmiah</span>
            <h2 className={cn(typeGovernance.editorialDisplay, 'text-2xl text-white mt-1')}>
              Dasar Regulasi & Metodologi Kurasi
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="border border-muted/15 p-6 bg-foreground/[0.01]">
              <div className={cn(typeGovernance.monoMeta, 'mb-4 text-accent font-bold')}>
                Regulasi Nasional (Kemenkes RI)
              </div>
              <ul className="flex flex-col gap-3">
                {nationalSources.map((s) => (
                  <li key={s} className={cn(typeGovernance.bodySm, 'text-xs text-muted/90 leading-relaxed')}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-muted/15 p-6 bg-foreground/[0.01]">
              <div className={cn(typeGovernance.monoMeta, 'mb-4 text-accent font-bold')}>
                Konsensus Organisasi Profesi Spesialis
              </div>
              <ul className="flex flex-col gap-3">
                {professionalSources.map((s) => (
                  <li key={s} className={cn(typeGovernance.bodySm, 'text-xs text-muted/90 leading-relaxed')}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-muted/15 p-6 bg-foreground/[0.01]">
              <div className={cn(typeGovernance.monoMeta, 'mb-4 text-accent font-bold')}>
                Pedoman Terpilih Internasional
              </div>
              <ul className="flex flex-col gap-3">
                {internationalSources.map((s) => (
                  <li key={s} className={cn(typeGovernance.bodySm, 'text-xs text-muted/90 leading-relaxed')}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {methodologySteps.map((m) => (
              <div key={m.step} className="border border-muted/20 p-6 bg-background">
                <div className={cn(typeGovernance.monoMeta, 'text-accent font-bold')}>
                  Fase {m.step}
                </div>
                <div className={cn(typeGovernance.editorialDisplay, 'mt-2 text-base text-white')}>
                  {m.title}
                </div>
                <p className={cn(typeGovernance.bodySm, 'mt-2 text-xs leading-relaxed text-muted/70')}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 7. Multi-AI Interoperability Engine (Claude, Gemini, ChatGPT, Custom Agents) ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-16 bg-[#0a0a0d]',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-muted/20 pb-4">
            <div>
              <div className={typeGovernance.monoMeta}>Arsitektur Interoperabilitas Model AI</div>
              <h2 className={cn(typeGovernance.editorialDisplay, 'text-2xl md:text-3xl text-white mt-1')}>
                Kompatibilitas Multi-AI & Agen Klinis
              </h2>
            </div>
            <p className={cn(typeGovernance.bodySm, 'max-w-md text-muted/70')}>
              Sentrapedia bukan pangkalan data tertutup. Dirancang sebagai universal ground-truth database yang dapat dihubungkan ke berbagai model kecerdasan buatan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Claude */}
            <div className="border border-muted/20 p-5 bg-background/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-accent">ANTHROPIC</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-accent/10 text-accent border border-accent/20">Tool Use</span>
                </div>
                <h3 className="font-jakarta text-base font-bold text-white mb-1.5">Claude 3.7 / 3.5 Sonnet</h3>
                <p className="text-xs text-muted/80 leading-relaxed">
                  Digunakan untuk penalaran diagnostik diferensial kompleks (*long-chain reasoning*) dengan ground-truth dosis obat dan kontraindikasi SKDI 4A.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-muted/15 font-mono text-[10px] text-muted/60">
                Protocols: Tool-Calling · JSON Schema
              </div>
            </div>

            {/* Gemini */}
            <div className="border border-muted/20 p-5 bg-background/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#4285F4]">GOOGLE</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20">Function Call</span>
                </div>
                <h3 className="font-jakarta text-base font-bold text-white mb-1.5">Gemini 2.5 / 2.0 Pro & Flash</h3>
                <p className="text-xs text-muted/80 leading-relaxed">
                  Ekstraksi rekam medis berlatensi ultra-rendah dan pembacaan multimodal dokumen penunjang (lab/EKG) berpandukan korpus Sentrapedia.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-muted/15 font-mono text-[10px] text-muted/60">
                Protocols: OpenAPI · GenAI SDK · Google Cloud
              </div>
            </div>

            {/* ChatGPT */}
            <div className="border border-muted/20 p-5 bg-background/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#10A37F]">OPENAI</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#10A37F]/10 text-[#10A37F] border border-[#10A37F]/20">RAG Actions</span>
                </div>
                <h3 className="font-jakarta text-base font-bold text-white mb-1.5">ChatGPT (GPT-4o / o3-mini)</h3>
                <p className="text-xs text-muted/80 leading-relaxed">
                  Koneksi Custom GPTs atau API Assistants via endpoint `/api/agent-query` untuk triase cepat keluhan pasien dan panduan obat lini pertama.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-muted/15 font-mono text-[10px] text-muted/60">
                Protocols: Custom Actions · Vector RAG
              </div>
            </div>

            {/* Audrey & Custom Voice */}
            <div className="border border-accent/30 p-5 bg-accent/[0.03] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-accent">SENTRA CORE</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-accent/20 text-accent border border-accent/40 font-bold">Voice Native</span>
                </div>
                <h3 className="font-jakarta text-base font-bold text-white mb-1.5">Audrey & Voice Agents</h3>
                <p className="text-xs text-muted/80 leading-relaxed">
                  Agen suara klinis *real-time* yang melakukan verifikasi verbal kriteria rujukan medis di ruang pemeriksaan tanpa mengalihkan pandangan dokter.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-accent/20 font-mono text-[10px] text-accent/80 font-bold">
                Protocols: WebSocket 24kHz · Local-First
              </div>
            </div>
          </div>

          {/* Integration Banner */}
          <div className="mt-8 p-5 border border-muted/20 bg-background/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Code2 className="w-5 h-5 text-accent shrink-0" />
              <div className="text-xs text-foreground/90">
                <strong>Ingin menghubungkan AI Anda dengan Sentrapedia?</strong> Gunakan REST API gratis kami di <code className="text-accent font-mono">/api/agent-query</code> atau pasang endpoint OpenAPI langsung ke Custom GPT / Claude Toolset.
              </div>
            </div>
            <button
              onClick={() => setShowApiModal(true)}
              className="shrink-0 px-4 py-2 border border-accent bg-accent/10 hover:bg-accent hover:text-white text-accent font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              Lihat Contoh Kode Integrasi
            </button>
          </div>
        </section>
      </main>

      <Footer />

      {/* ═══ Detail Sidebar: Deep Clinical Drawer ═══ */}
      <div
        className={cn(
          'fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeSidebar}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[100] h-screen w-full max-w-[520px] overflow-y-auto border-l border-muted/20 bg-[#1c1b1a] p-8 transition-transform duration-500',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {selectedDisease && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-muted/20 pb-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                  ICD-10: {selectedDisease.kode} —{' '}
                  {CATEGORIES.find((c) => c.id === selectedDisease.kategori)?.name ||
                    selectedDisease.kategori}
                </div>
                <div className={cn(typeGovernance.editorialDisplay, 'mt-2 text-2xl text-white')}>
                  {selectedDisease.nama}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 border border-accent/40 bg-accent/10 text-accent font-mono text-[10px] uppercase tracking-wider font-bold">
                  SKDI 4A: Penatalaksanaan Mandiri Tuntas di FKTP
                </div>
              </div>
              <button
                onClick={closeSidebar}
                aria-label="Tutup"
                className="shrink-0 rounded-none border border-muted/20 p-2 text-muted transition-colors hover:border-accent hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              {/* Definisi */}
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2 text-accent font-bold')}>
                  01 · Definisi & Gambaran Etiologi
                </div>
                <p className={cn(typeGovernance.bodySm, 'text-xs text-foreground/90 leading-relaxed')}>
                  {selectedDisease.definisi}
                </p>
              </div>

              {/* Gejala Klinis */}
              {selectedDisease.gejala && selectedDisease.gejala.length > 0 && (
                <div>
                  <div className={cn(typeGovernance.monoMeta, 'mb-2 text-accent font-bold')}>
                    02 · Manifestasi Klinis & Gejala
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {selectedDisease.gejala.map((g, i) => (
                      <li key={i} className={cn(typeGovernance.bodySm, 'flex items-start gap-2 text-xs')}>
                        <span className="text-accent shrink-0 mt-0.5">▸</span>
                        <span className="text-foreground/90">{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Diagnosis */}
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2 text-accent font-bold')}>
                  03 · Kriteria Diagnosis & Pemeriksaan Penunjang
                </div>
                <div className={cn(typeGovernance.bodySm, 'text-xs text-foreground/90 leading-relaxed bg-[#141311] p-3.5 border border-muted/15')}>
                  {selectedDisease.diagnosis}
                </div>
              </div>

              {/* Terapi */}
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2 text-accent font-bold')}>
                  04 · Protokol Tatalaksana & Farmakoterapi Lini Pertama
                </div>
                <div className={cn(typeGovernance.bodySm, 'font-mono text-xs text-foreground/95 bg-[#111110] p-3.5 border border-muted/20 leading-relaxed')}>
                  {selectedDisease.terapi}
                </div>
              </div>

              {/* Kriteria Rujukan */}
              <div>
                <div className={cn(typeGovernance.monoMeta, 'mb-2 text-[#e65a4c] font-bold')}>
                  05 · Indikasi Rujukan ke Faskes Lanjutan (Red Flags)
                </div>
                <div className={cn(typeGovernance.bodySm, 'text-xs text-[#e65a4c]/95 bg-[#e65a4c]/5 p-3.5 border border-[#e65a4c]/20 leading-relaxed')}>
                  {selectedDisease.rujukan}
                </div>
              </div>

              {/* Referensi */}
              <div className="border-t border-muted/20 pt-5">
                <div className={cn(typeGovernance.monoMeta, 'mb-3')}>
                  Dasar Regulasi & Konsensus
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Permenkes 5/2014', 'KMK 1186/2022', 'WHO Guidelines', 'ICD-10 (WHO)'].map((ref) => (
                    <span
                      key={ref}
                      className="border border-muted/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted/70"
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

      {/* ═══ Agent API Hub Modal: Professional Public Documentation ═══ */}
      {showApiModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            onClick={() => setShowApiModal(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative bg-[#1c1b1a] border border-muted/25 max-w-2xl w-full p-6 sm:p-8 shadow-2xl z-10 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-muted/20 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Sentrapedia Open Clinical API
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-accent text-white font-bold">
                    EDGE RUNTIME
                  </span>
                </div>
                <p className="text-xs font-mono text-muted/70 mt-0.5">
                  Antarmuka Pemrograman Aplikasi (API) Terbuka untuk Integrasi AI Agent & RME
                </p>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="p-1.5 border border-muted/30 hover:border-accent hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-muted/20 pb-3 mb-4">
              {(['curl', 'python', 'typescript'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setApiTab(tab)}
                  className={cn(
                    'px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors',
                    apiTab === tab
                      ? 'border-accent bg-accent text-white font-bold'
                      : 'border-muted/20 text-muted hover:border-muted/50'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* POST /api/agent-query */}
            <div className="border border-muted/20 p-4 bg-[#111110] mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-accent text-white font-mono text-[11px] font-bold">
                    POST
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    /api/agent-query
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      apiTab === 'curl'
                        ? `curl -X POST https://your-domain.vercel.app/api/agent-query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "pasien demam 3 hari nyeri menelan faring eritema", "limit": 3}'`
                        : apiTab === 'python'
                        ? `import requests
res = requests.post("https://your-domain.vercel.app/api/agent-query", json={
    "query": "pasien demam 3 hari nyeri menelan faring eritema",
    "limit": 3
})
print(res.json())`
                        : `const res = await fetch("https://your-domain.vercel.app/api/agent-query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "pasien demam 3 hari nyeri menelan faring eritema", limit: 3 })
});
const data = await res.json();`,
                      'query'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-muted/30 hover:border-accent text-[11px] font-mono text-foreground transition-colors"
                >
                  {copiedEndpoint === 'query' ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEndpoint === 'query' ? 'COPIED' : 'COPY CODE'}</span>
                </button>
              </div>

              <p className="text-xs text-muted/80 mb-3">
                Triase Gejala & CDSS: Input narasi keluhan/gejala pasien, sistem mencocokkan kandidat diagnosis terakreditasi beserta dosis terapi dan indikasi rujukan.
              </p>

              <pre className="p-3 bg-black/40 border border-muted/20 text-foreground font-mono text-[11px] overflow-x-auto leading-relaxed">
{apiTab === 'curl' && `curl -X POST https://your-domain.vercel.app/api/agent-query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "pasien demam 3 hari nyeri menelan faring eritema", "limit": 3}'`}

{apiTab === 'python' && `import requests

res = requests.post("https://your-domain.vercel.app/api/agent-query", json={
    "query": "pasien demam 3 hari nyeri menelan faring eritema",
    "limit": 3
})
data = res.json()
for match in data["matches"]:
    print(f"{match['disease_name']} ({match['icd10']}) - Skor: {match['confidence_score']}")`}

{apiTab === 'typescript' && `const res = await fetch("https://your-domain.vercel.app/api/agent-query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "pasien demam 3 hari nyeri menelan faring eritema",
    limit: 3
  })
});
const data = await res.json();`}
              </pre>
            </div>

            {/* GET /api/diseases */}
            <div className="border border-muted/20 p-3.5 bg-[#111110] mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-muted/20 text-white font-mono text-[11px] font-bold">
                  GET
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  /api/diseases?q=demam&category=ISPA
                </span>
              </div>
              <p className="text-xs text-muted/80">
                Pencarian deterministik dan pemfilteran pada 144 entitas klinis primer.
              </p>
            </div>

            {/* GET /api/categories */}
            <div className="border border-muted/20 p-3.5 bg-[#111110]">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-muted/20 text-white font-mono text-[11px] font-bold">
                  GET
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  /api/categories
                </span>
              </div>
              <p className="text-xs text-muted/80">
                Daftar 14 domain spesialisasi organ klinis beserta kalkulasi jumlah entitas.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-muted/20 flex justify-end">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 bg-accent text-white text-xs font-bold font-jakarta uppercase tracking-wider hover:bg-accent/90 transition-colors"
              >
                Tutup Spesifikasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
