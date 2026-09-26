// Architected and built by the one and only Drferdi.

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Step = {
  id: string
  no: number
  title: string
  desc: string
  meta?: string
  icon: React.ReactNode
}

const DotIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/70 text-black/65 shadow-sm">
    {children}
  </span>
)

const IconDoc = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3h7l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M15 3v5h5" />
    <path d="M9 13h6M9 17h6M9 9h3" />
  </svg>
)
const IconTicket = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V8z" />
    <path d="M9 6v12" strokeDasharray="2 2" />
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
const IconChair = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 13V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v6" />
    <path d="M6 13h12" />
    <path d="M6 13v4a2 2 0 0 0 2 2h1v2" />
    <path d="M18 13v4a2 2 0 0 1-2 2h-1v2" />
  </svg>
)
const IconStetho = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 3v6a4 4 0 0 0 8 0V3" />
    <path d="M12 3v6a4 4 0 0 0 8 0V3" />
    <path d="M8 13v2a6 6 0 0 0 12 0v-2" />
    <path d="M20 17a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
  </svg>
)
const IconReferral = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 7h8M8 11h6M8 15h8" />
    <path d="M6 3h12a2 2 0 0 1 2 2v16l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2z" />
  </svg>
)
const IconPill = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 14 14 10" />
    <path d="M7 17a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-3 3a5 5 0 0 1-7 0z" />
  </svg>
)
const IconHome = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 10v11h14V10" />
    <path d="M9 21v-6h6v6" />
  </svg>
)

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 170, damping: 26 },
  },
}

const PatientFlow = () => {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [active, setActive] = useState(0)

  // Auto-sequence saat section visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setActive(1)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    let current = 1
    const interval = setInterval(() => {
      current++
      setActive(current)
      if (current >= 8) clearInterval(interval)
    }, 1200)
    return () => clearInterval(interval)
  }, [isVisible])

  const steps: Step[] = useMemo(
    () => [
      {
        id: 'docs',
        no: 1,
        title: 'Siapkan Dokumen',
        desc: 'Bawa kartu BPJS (fisik/Mobile JKN) dan KTP sebelum berangkat.',
        meta: 'Persiapan',
        icon: (
          <DotIcon>
            <IconDoc />
          </DotIcon>
        ),
      },
      {
        id: 'counter',
        no: 2,
        title: 'Pendaftaran Loket',
        desc: 'Serahkan kartu BPJS + KTP ke petugas loket — dapatkan nomor antrean.',
        meta: 'Administrasi',
        icon: (
          <DotIcon>
            <IconTicket />
          </DotIcon>
        ),
      },
      {
        id: 'verify',
        no: 3,
        title: 'Verifikasi BPJS',
        desc: 'Petugas cek status kepesertaan & masa aktif kartu di sistem.',
        meta: 'Validasi',
        icon: (
          <DotIcon>
            <IconCheck />
          </DotIcon>
        ),
      },
      {
        id: 'wait',
        no: 4,
        title: 'Menunggu Poli',
        desc: 'Tunggu panggilan nama di ruang tunggu poli yang dituju.',
        meta: 'Antrian',
        icon: (
          <DotIcon>
            <IconChair />
          </DotIcon>
        ),
      },
      {
        id: 'exam',
        no: 5,
        title: 'Pemeriksaan Dokter',
        desc: 'Dokter memeriksa, diagnosis, dan menerbitkan resep obat.',
        meta: 'Klinis',
        icon: (
          <DotIcon>
            <IconStetho />
          </DotIcon>
        ),
      },
      {
        id: 'referral',
        no: 6,
        title: 'Rujukan (jika perlu)',
        desc: 'Jika perlu tindakan lanjut, dokter terbitkan surat rujukan ke RS.',
        meta: 'Lanjutan',
        icon: (
          <DotIcon>
            <IconReferral />
          </DotIcon>
        ),
      },
      {
        id: 'meds',
        no: 7,
        title: 'Ambil Obat',
        desc: 'Serahkan resep di apotek — obat BPJS diberikan gratis.',
        meta: 'Farmasi',
        icon: (
          <DotIcon>
            <IconPill />
          </DotIcon>
        ),
      },
      {
        id: 'done',
        no: 8,
        title: 'Selesai & Pulang',
        desc: 'Rekam medis tersimpan otomatis. Kembali sesuai jadwal follow-up.',
        meta: 'Penutup',
        icon: (
          <DotIcon>
            <IconHome />
          </DotIcon>
        ),
      },
    ],
    []
  )

  const activeIdx = Math.max(0, Math.min(steps.length - 1, active - 1))
  const a = steps[activeIdx]

  return (
    <section
      ref={sectionRef}
      id="patient-flow"
      className="relative w-full py-16 lg:py-24 overflow-hidden neo-section text-black/80"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(201,168,124,0.12),transparent_46%),radial-gradient(circle_at_82%_74%,rgba(121,95,74,0.1),transparent_52%),linear-gradient(180deg,#f9f6f2_0%,#f6f1ea_100%)]" />
      {/* background rings */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-36 -top-24 h-[500px] w-[500px] rounded-full border border-[#C9A87C]/18" />
        <div className="absolute -right-14 -top-8 h-[320px] w-[320px] rounded-full border border-[#C9A87C]/14" />
        <div className="absolute -left-36 -bottom-24 h-[500px] w-[500px] rounded-full border border-[#B59066]/12" />
      </div>

      <div className="relative px-6 lg:px-[7vw]">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 28 }}
          className="flex flex-col gap-4 mb-10"
        >
          <div className="w-fit rounded-full border border-[#E8D9C4] bg-white/70 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[#8B7D6F] font-medium shadow-sm">
            Alur Pelayanan BPJS
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Berobat dengan{' '}
            <span className="bg-gradient-to-r from-[#B48754] via-[#C9A87C] to-[#8C6A47] bg-clip-text text-transparent">
              BPJS
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-black/55">
            <span className="rounded-full border border-[#E3D2BC] bg-white/70 px-3 py-1 backdrop-blur">
              🪪 Kartu BPJS (fisik / Mobile JKN)
            </span>
            <span className="rounded-full border border-[#E3D2BC] bg-white/70 px-3 py-1 backdrop-blur">
              🆔 KTP
            </span>
            <span className="ml-auto hidden text-xs text-black/40 md:block">
              Klik step di timeline untuk fokus
            </span>
          </div>
        </motion.div>

        {/* Layout */}
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[340px_1fr]">
          {/* Timeline */}
          <div className="relative">
            <div className="sticky top-20">
              <div className="relative pl-10">
                {/* rail */}
                <div className="absolute left-4 top-2 h-[calc(100%-8px)] w-px bg-[#D8C4A8]/75" />

                {/* progress */}
                <motion.div
                  className="absolute left-4 top-2 w-px bg-[#C9A87C]/90"
                  animate={
                    reduce ? undefined : { height: `${(activeIdx / (steps.length - 1)) * 100}%` }
                  }
                  transition={{ type: 'spring', stiffness: 145, damping: 30 }}
                  style={{ height: `${(activeIdx / (steps.length - 1)) * 100}%` }}
                />

                {/* traveling pulse */}
                <AnimatePresence>
                  {!reduce && (
                    <motion.div
                      key={activeIdx}
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: activeIdx * 68 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 165, damping: 28 }}
                      className="absolute left-4 top-2 -translate-x-1/2"
                    >
                      <motion.span
                        className="block h-3 w-3 rounded-full bg-[#B48754]/80"
                        animate={{ scale: [1, 1.8, 1], opacity: [0.9, 0.35, 0.9] }}
                        transition={{
                          duration: 2.4,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'easeInOut',
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {steps.map((s, idx) => {
                    const isActive = idx === activeIdx
                    const isDone = idx < activeIdx
                    return (
                      <motion.button
                        key={s.id}
                        onClick={() => setActive(s.no)}
                        whileHover={reduce ? undefined : { x: 2 }}
                        whileTap={reduce ? undefined : { scale: 0.99 }}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 text-left transition-colors hover:border-[#E6D8C4]/80 hover:bg-white/40"
                      >
                        <div className="relative">
                          <div
                            className={[
                              'grid h-10 w-10 place-items-center rounded-full border',
                              isActive
                                ? 'border-[#C9A87C]/50 bg-[#F5EBDD] text-[#8E6841]'
                                : isDone
                                  ? 'border-[#C9A87C]/30 bg-[#F8F0E4]/75 text-[#9A7450]'
                                  : 'border-black/10 bg-white/60 text-black/60',
                            ].join(' ')}
                          >
                            {React.isValidElement(s.icon)
                              ? (s.icon as React.ReactElement<{ children: React.ReactNode }>).props
                                  .children
                              : s.icon}
                          </div>
                          <div
                            className={[
                              'absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold',
                              isActive ? 'bg-[#B48754] text-white' : 'bg-black/5 text-black/55',
                            ].join(' ')}
                          >
                            {s.no}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={[
                                'truncate text-sm font-semibold',
                                isActive ? 'text-black/85' : 'text-black/65',
                              ].join(' ')}
                            >
                              {s.title}
                            </div>
                            {isActive && (
                              <span className="rounded-full border border-[#C9A87C]/35 bg-[#F7EEDF] px-2 py-0.5 text-[10px] font-medium text-[#8E6841]">
                                FOCUS
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-black/40">{s.meta}</div>
                        </div>
                        <div className="text-xs text-black/35 group-hover:text-black/55">→</div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Controls */}
                <div className="mt-6 flex items-center gap-2 pl-2">
                  <button
                    className="rounded-full border border-[#DCC8AE] bg-white/70 px-4 py-2 text-sm backdrop-blur transition-colors hover:bg-white"
                    onClick={() => setActive(v => Math.max(1, v - 1))}
                  >
                    Prev
                  </button>
                  <button
                    className="rounded-full border border-[#DCC8AE] bg-white/70 px-4 py-2 text-sm backdrop-blur transition-colors hover:bg-white"
                    onClick={() => setActive(v => Math.min(steps.length, v + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content panel */}
          <div>
            <div className="relative overflow-hidden rounded-[30px] border border-[#E6D8C4] bg-white/70 p-8 shadow-[0_22px_56px_rgba(121,95,74,0.12)] backdrop-blur-xl">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(900px circle at 15% 0%, rgba(201,168,124,0.22), transparent 55%), radial-gradient(900px circle at 80% 70%, rgba(133,103,79,0.12), transparent 55%)',
                }}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-xs font-semibold tracking-widest text-black/45">
                      STEP {String(a.no).padStart(2, '0')}
                    </div>
                    <h3
                      className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-[#2D2420]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {a.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5E5248]">
                      {a.desc}
                    </p>
                  </div>

                  <div className="hidden md:block">
                    <motion.div
                      key={a.id}
                      initial={reduce ? false : { opacity: 0, rotate: -6, scale: 0.98 }}
                      animate={reduce ? undefined : { opacity: 1, rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 150, damping: 24 }}
                      className="grid h-14 w-14 place-items-center rounded-2xl border border-[#DFCBB2] bg-[#F8F1E6] text-[#8E6841]"
                    >
                      {React.isValidElement(a.icon)
                        ? (a.icon as React.ReactElement<{ children: React.ReactNode }>).props
                            .children
                        : a.icon}
                    </motion.div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    <div className="text-xs font-semibold tracking-widest text-black/45">INFO</div>
                    <div className="text-sm leading-relaxed text-[#5E5248]">
                      Mitra resmi BPJS Kesehatan — melayani peserta Rawat Jalan & Rawat Inap.
                      Siapkan dokumen sebelum datang.
                    </div>
                  </motion.div>

                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    <div className="text-xs font-semibold tracking-widest text-black/45">
                      STATUS
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#DCC8AE] bg-white/75 px-3 py-1 text-xs text-[#5E5248]">
                        Progress: {activeIdx + 1}/{steps.length}
                      </span>
                      <span className="rounded-full border border-[#C9A87C]/40 bg-[#F7EEDF] px-3 py-1 text-xs text-[#8E6841]">
                        {a.meta}
                      </span>
                    </div>
                  </motion.div>
                </div>

                <div className="mt-8">
                  <div className="text-xs font-semibold tracking-widest text-black/45">
                    SELANJUTNYA
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={steps[Math.min(steps.length - 1, activeIdx + 1)]?.id}
                      initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                      transition={{ type: 'spring', stiffness: 160, damping: 26 }}
                      className="mt-2 flex items-center justify-between rounded-2xl border border-[#DECAB0] bg-white/75 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-black/75">
                          {steps[Math.min(steps.length - 1, activeIdx + 1)]?.title}
                        </div>
                        <div className="text-xs text-black/45">
                          {steps[Math.min(steps.length - 1, activeIdx + 1)]?.meta}
                        </div>
                      </div>
                      <div className="text-xs text-black/40">→</div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Darurat note */}
                <div
                  className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.15)',
                  }}
                >
                  <span className="text-base flex-shrink-0">🚨</span>
                  <p className="text-xs text-black/50 leading-relaxed">
                    <span className="font-semibold text-red-500">Kondisi Darurat:</span> Langsung ke
                    IGD — tidak perlu surat rujukan. Tunjukkan kartu BPJS ke petugas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PatientFlow
