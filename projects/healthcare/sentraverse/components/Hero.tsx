// Architected and built by Drferdi.
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { SketchLines } from '@/components/ui/sketch-lines'
import { getPilotLoginHref, layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

// Phase durations (ms) — each phase shows then transitions
const PHASE_TIMES = [9500, 16500, 24000] // P1→P2, P2→P3, P3→P4

// Header config per phase
const PHASE_HEADERS: Record<number, { label: string; color: string; tag: string }> = {
  1: { label: 'Audrey · Puskesmas', color: 'var(--sentra-audrey)', tag: 'live' },
  2: { label: 'Audrey · Konsul Sp.JP', color: 'var(--sentra-audrey-teal)', tag: 'Sp.JP' },
  3: { label: 'Audrey · Konfirmasi EKG', color: 'var(--sentra-audrey)', tag: 'dr. Rian' },
  4: { label: 'Audrey · Rujukan RS', color: 'var(--sentra-accent)', tag: 'IGD' },
}

// Shared bubble styles — tuned for dark bg #0d0d0d
const audreyBubble =
  'px-4 py-3 rounded-xl rounded-bl-sm border border-[rgb(var(--sentra-audrey-rgb)/0.20)] bg-[rgb(var(--sentra-audrey-rgb)/0.10)]'
const dokterBubble =
  'px-4 py-2.5 rounded-xl rounded-br-sm border border-foreground/12 bg-foreground/[0.06]'
const tealBubble =
  'px-4 py-3 rounded-xl rounded-br-sm border border-[rgb(var(--sentra-audrey-teal-rgb)/0.22)] bg-[rgb(var(--sentra-audrey-teal-rgb)/0.10)]'

// Reusable animated message
function Msg({
  delay,
  align = 'left',
  className = '',
  children,
}: {
  delay: number
  align?: 'left' | 'right'
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className={align === 'right' ? 'flex justify-end' : ''}
    >
      <div className={`max-w-[90%] ${className}`}>{children}</div>
    </motion.div>
  )
}

function AudreyLabel({ text = 'Audrey' }: { text?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--sentra-audrey)]" />
      <span className="text-xs font-bold uppercase tracking-widest text-[var(--sentra-audrey-muted)]">
        {text}
      </span>
    </div>
  )
}

function LoadingDots({ delay, text }: { delay: number; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-2 px-1 pt-1"
    >
      <div className="flex gap-1">
        {[0, 200, 400].map((d) => (
          <div
            key={d}
            className="w-1.5 h-1.5 rounded-full bg-[var(--sentra-audrey)]/50 animate-pulse"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted/40 font-jakarta">{text}</span>
    </motion.div>
  )
}

function Divider({ text, color = 'var(--sentra-audrey-teal)' }: { text: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="flex-1 h-px"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      />
      <span
        className="text-xs font-jakarta whitespace-nowrap"
        style={{ color: `color-mix(in srgb, ${color} 50%, transparent)` }}
      >
        {text}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      />
    </div>
  )
}

// --- Kata kunci judul yang berganti ---
// Rotasi dijalankan oleh GSAP dari master timeline hero (bukan React state):
// span di-query segar dari DOM tiap tick, sehingga aman terhadap SplitText revert.
const TITLE_WORDS = ['Cepat', 'Presisi', 'Terstruktur', 'Aman']

// --- Metrik count-up (GSAP, dipicu saat masuk viewport) ---
const METRICS: { label: string; value: number; suffix?: string }[] = [
  { label: 'Rekam Medis', value: 45030 },
  { label: 'Entitas Penyakit', value: 159 },
  { label: 'Pemetaan ICD-10', value: 1930 },
  { label: 'Safety Gate', value: 8 },
]

// Format ribuan deterministik (titik) — hindari mismatch locale SSR/klien.
function formatCount(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Count-up dijalankan dari master timeline hero (bukan IntersectionObserver —
// hero selalu terlihat saat load). SSR merender nilai final agar tetap benar tanpa JS.

// --- Scan-line ambient (GSAP): hairline menyapu pelan di latar hero ---
function HeroScanLine() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tween = gsap.fromTo(
      el,
      { left: '-2%' },
      { left: '102%', duration: 8, ease: 'none', repeat: -1, repeatDelay: 1.6 }
    )
    return () => {
      tween.kill()
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 bottom-0 left-0 z-0 w-px bg-accent/15"
    />
  )
}

// --- Konsultasi Card: 4-phase clinical flow ---
function KonsultasiCard() {
  const [phase, setPhase] = useState(1)

  useEffect(() => {
    const timers = PHASE_TIMES.map((ms, i) => setTimeout(() => setPhase(i + 2), ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  const h = PHASE_HEADERS[phase]

  return (
    <div className="relative w-full rounded-2xl border border-[var(--sentra-audrey-accent-border)] bg-gradient-to-b from-[var(--sentra-canvas)] to-[var(--sentra-bg)] overflow-hidden">
      <SketchLines />
      {/* Header — mac window chrome */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--sentra-audrey-feature-divider)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="h-3.5 w-px bg-[var(--sentra-audrey-feature-divider)]" />
        <span
          className="text-sm font-bold uppercase tracking-widest font-jakarta transition-colors duration-700"
          style={{ color: h.color }}
        >
          {h.label}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block w-6 h-px bg-[var(--sentra-audrey-feature-divider)]" />
          <span className="text-xs text-muted/30 font-jakarta">{h.tag}</span>
        </div>
      </div>
      {/* Double rule accent */}
      <div className="mt-[3px] h-px bg-[var(--sentra-audrey-feature-divider)]" />

      {/* Chat area */}
      <div className="p-5 min-h-[420px]">
        <AnimatePresence mode="wait">
          {/* ── PHASE 1: Konsultasi PKM ── */}
          {phase === 1 && (
            <motion.div
              key="p1"
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-3"
            >
              <Msg delay={1.2} align="right" className={dokterBubble}>
                <p className="text-sm text-foreground/80 leading-relaxed font-jakarta m-0">
                  Pasien laki-laki, 52 thn, nyeri dada kiri seperti ditekan, menjalar ke lengan kiri
                  dan rahang sejak 1 jam
                </p>
              </Msg>
              <Msg delay={2.8} className={audreyBubble}>
                <AudreyLabel text="Analisis" />
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Suspek{' '}
                  <span className="text-[var(--sentra-critical)] font-semibold">
                    Angina Pektoris Tidak Stabil
                  </span>
                  . Triase: EMERGENCY. Rekomendasi: EKG 12-lead, Troponin I, Aspirin 320mg loading.
                </p>
              </Msg>
              <Msg delay={4.4} className={audreyBubble}>
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Dok ijin,{' '}
                  <span className="text-[var(--sentra-audrey)] font-semibold">
                    anda yang konsul ke dokter spesialis atau saya?
                  </span>
                </p>
              </Msg>
              <Msg delay={5.8} align="right" className={`${dokterBubble} !max-w-[60%]`}>
                <p className="text-sm text-foreground/80 leading-relaxed font-jakarta m-0">
                  Kamu aja Audrey
                </p>
              </Msg>
              <Msg delay={7.0} className={audreyBubble}>
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Baik dok, saya konsulkan ke{' '}
                  <span className="text-[var(--sentra-audrey)] font-semibold">Sp.JP</span> sekarang.
                </p>
              </Msg>
              <LoadingDots delay={8.2} text="Menghubungi Sp. Jantung..." />
            </motion.div>
          )}

          {/* ── PHASE 2: Konsul Sp.JP ── */}
          {phase === 2 && (
            <motion.div
              key="p2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <Divider text="Terhubung dengan dr. Sp.JP" />
              <Msg delay={0.8} className={audreyBubble}>
                <AudreyLabel />
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Selamat malam dokter, saya{' '}
                  <span className="text-[var(--sentra-audrey)] font-semibold">Audrey</span>, atas
                  persetujuan <span className="text-foreground/80 font-semibold">dr. Rian</span>{' '}
                  dari Puskesmas, ijin konsul mengenai pasien Tn. Ahmad, 52 thn.{' '}
                  <span className="text-[var(--sentra-critical)] font-semibold">Dx kerja: UAP</span>
                  . Sudah loading Aspirin 320mg. Mohon advis tatalaksana lanjutan, apakah dokter
                  berkenan?
                </p>
              </Msg>
              <Msg delay={2.6} align="right" className={tealBubble}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--sentra-audrey-teal)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--sentra-audrey-teal)]/60">
                    dr. Sp.JP
                  </span>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Baik Audrey, lanjutkan DAPT — tambahkan Clopidogrel 300mg loading. Pasang monitor,{' '}
                  <span className="text-[var(--sentra-critical)] font-semibold">
                    siapkan rujuk ke RS jika EKG ada ST elevasi
                  </span>
                  . Saya standby.
                </p>
              </Msg>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4.0, duration: 0.5 }}
                className="flex gap-2"
              >
                <div className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--sentra-audrey-teal-faint)] bg-[var(--sentra-audrey-teal-faint)]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--sentra-audrey-teal)] block mb-0.5">
                    Status
                  </span>
                  <div className="flex items-center gap-1.5">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-[var(--sentra-audrey-teal)]"
                    >
                      <path
                        d="M13.3 4.3L6 11.6 2.7 8.3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-[var(--sentra-audrey-teal)] font-jakarta">
                      Advis Diterima
                    </span>
                  </div>
                </div>
                <div className="flex-1 px-3 py-2.5 rounded-lg border border-accent/15 bg-accent/[0.03]">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent/60 block mb-0.5">
                    Tindakan
                  </span>
                  <span className="text-sm font-semibold text-accent/80 font-jakarta">
                    + Clopidogrel 300mg
                  </span>
                </div>
              </motion.div>
              <LoadingDots delay={5.5} text="Kembali ke dr. Rian..." />
            </motion.div>
          )}

          {/* ── PHASE 3: Konfirmasi EKG dengan dr. Rian ── */}
          {phase === 3 && (
            <motion.div
              key="p3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <Divider text="Kembali ke dr. Rian" color="var(--sentra-audrey)" />
              <Msg delay={0.8} className={audreyBubble}>
                <AudreyLabel />
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Dok Rian, advis dari Sp.JP sudah diterima. Clopidogrel 300mg sudah diberikan.
                  Sp.JP juga pesan:{' '}
                  <span className="text-[var(--sentra-critical)] font-semibold">
                    rujuk ke RS jika EKG ada ST elevasi
                  </span>
                  . Bagaimana hasil EKG nya, dok? Ijin saya bantu analisa.
                </p>
              </Msg>
              <Msg delay={2.4} align="right" className={dokterBubble}>
                <p className="text-sm text-foreground/80 leading-relaxed font-jakarta m-0">
                  EKG sudah keluar. ST elevasi di lead II, III, aVF.
                </p>
              </Msg>
              <Msg delay={3.8} className={audreyBubble}>
                <AudreyLabel text="Analisis EKG" />
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Konfirmasi: tampak{' '}
                  <span className="text-[var(--sentra-critical)] font-semibold">
                    ST Elevasi di lead II, III, aVF
                  </span>
                  . Kesan:{' '}
                  <span className="text-[var(--sentra-critical)] font-bold">STEMI Inferior</span>.
                  Sesuai advis Sp.JP — pasien harus segera dirujuk ke RS. Ijin saya hubungi RS, dok?
                </p>
              </Msg>
              <Msg delay={5.4} align="right" className={dokterBubble}>
                <p className="text-sm text-foreground/80 leading-relaxed font-jakarta m-0">
                  Sepakat, segera rujuk. Hubungi RS sekarang Audrey.
                </p>
              </Msg>
              <LoadingDots delay={6.4} text="Menghubungi IGD Rumah Sakit..." />
            </motion.div>
          )}

          {/* ── PHASE 4: Audrey contact RS ── */}
          {phase === 4 && (
            <motion.div
              key="p4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <Divider text="Terhubung dengan IGD RS" color="var(--sentra-accent)" />
              <Msg delay={0.8} className={audreyBubble}>
                <AudreyLabel text="Audrey → IGD RS" />
                <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                  Selamat malam, saya{' '}
                  <span className="text-[var(--sentra-audrey)] font-semibold">Audrey</span>, atas
                  persetujuan <span className="text-foreground/80 font-semibold">dr. Rian</span>{' '}
                  dari Puskesmas. Ijin mengirim pasien Tn. Ahmad, 52 thn, dengan diagnosis{' '}
                  <span className="text-[var(--sentra-critical)] font-bold">STEMI Inferior</span>.
                  Sudah diberikan DAPT (Aspirin 320mg + Clopidogrel 300mg). Mohon penerimaan untuk
                  tatalaksana lanjutan.
                </p>
              </Msg>
              <Msg delay={2.8} align="right">
                <div className={`${tealBubble} !border-accent/15 !bg-accent/[0.03]`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-xs font-bold uppercase tracking-widest text-accent/60">
                      IGD RS
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed font-jakarta m-0">
                    Baik Audrey, pasien kami terima. Tim Cath Lab sudah standby. Silakan kirim
                    segera.
                  </p>
                </div>
              </Msg>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 4.2, duration: 0.5 }}
                className="flex gap-2"
              >
                <div className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--sentra-audrey-teal-faint)] bg-[var(--sentra-audrey-teal-faint)]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--sentra-audrey-teal)] block mb-0.5">
                    Rujukan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-[var(--sentra-audrey-teal)]"
                    >
                      <path
                        d="M13.3 4.3L6 11.6 2.7 8.3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-[var(--sentra-audrey-teal)] font-jakarta">
                      Diterima
                    </span>
                  </div>
                </div>
                <div className="flex-1 px-3 py-2.5 rounded-lg border border-accent/15 bg-accent/[0.03]">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent/60 block mb-0.5">
                    Cath Lab
                  </span>
                  <span className="text-sm font-semibold text-accent/80 font-jakarta">Standby</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer strip — progres fase */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--sentra-audrey-feature-divider)]">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted/40">
          Live Session
        </span>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((p) => (
            <span
              key={p}
              className={`h-px w-5 transition-colors duration-500 ${
                p <= phase ? 'bg-accent/60' : 'bg-[var(--sentra-audrey-feature-divider)]'
              }`}
            />
          ))}
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted/40">
            Fase {phase}/4
          </span>
        </div>
      </div>

      {/* Line accents — corner ticks + side rails */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t border-l border-[var(--sentra-audrey-corner-border)] rounded-tl" />
        <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t border-r border-[var(--sentra-audrey-corner-border)] rounded-tr" />
        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b border-l border-[var(--sentra-audrey-corner-border)] rounded-bl" />
        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b border-r border-[var(--sentra-audrey-corner-border)] rounded-br" />
        <div className="absolute top-8 bottom-8 left-2.5 w-px bg-[var(--sentra-audrey-corner-border)] opacity-50" />
        <div className="absolute top-8 bottom-8 right-2.5 w-px bg-[var(--sentra-audrey-corner-border)] opacity-50" />
      </div>
    </div>
  )
}

// --- Main Hero Component ---
export default function Hero() {
  const pilotLogin = getPilotLoginHref(process.env.NEXT_PUBLIC_PILOT_LOGIN_URL)
  const sectionRef = useRef<HTMLElement>(null)

  // "Blueprint Draw": garis sketsa menggambar dulu, teks mengikuti — satu master timeline.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    gsap.registerPlugin(SplitText)
    const q = gsap.utils.selector(section)
    let splitCleanup: (() => void) | null = null

    // Entrance always-on tanpa cek prefers-reduced-motion — keputusan produk
    // Chief (preseden marquee & BlueprintStory scrub 2026-07: mesin dengan
    // Windows animation-effects off tetap harus melihat animasi brand).
    const ctx = gsap.context(() => {
      {
        const headline = q('[data-hero-headline]')[0] as HTMLElement | undefined
        let split: SplitText | null = null
        let headlineTargets: Element[] = headline ? [headline] : []
        try {
          if (headline) {
            split = SplitText.create(headline, { type: 'lines', mask: 'lines' })
            headlineTargets = split.lines
          }
        } catch {
          split = null // fallback: h1 naik utuh tanpa split per baris
        }

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        // Beat 1 — garis vertikal menggambar dari atas ke bawah
        tl.set(q('[data-hero-line-v]'), { autoAlpha: 1 }, 0)
        tl.fromTo(
          q('[data-hero-line-v]'),
          { scaleY: 0 },
          { scaleY: 1, duration: 0.7, ease: 'power2.inOut' },
          0
        )

        // Beat 2 — garis horizontal menggambar kiri ke kanan
        tl.set(q('[data-hero-line-h]'), { autoAlpha: 1 }, 0.3)
        tl.fromTo(
          q('[data-hero-line-h]'),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: 'power2.inOut' },
          0.3
        )

        // Beat 3 — poin 01/02/03 muncul seperti stempel mengikuti arah garis
        tl.fromTo(
          q('[data-hero-point]'),
          { autoAlpha: 0, scale: 0.96, y: 8 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.1 },
          0.45
        )

        // Beat 4 — baris headline naik dari balik mask
        tl.set(q('[data-hero-headline]'), { autoAlpha: 1 }, 0.7)
        tl.from(
          headlineTargets,
          { yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: 0.12 },
          0.7
        )
        // Kembalikan DOM headline ke bentuk asli SEBELUM RotatingWord berganti
        // (tick pertama di 2.6s) agar React tidak menyentuh DOM hasil split.
        tl.call(() => split?.revert(), [], '>')

        // Beat 5 — subcopy
        tl.fromTo(
          q('[data-hero-subcopy]'),
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6 },
          1.2
        )

        // Beat 6 — baris metrik naik + count-up
        tl.fromTo(
          q('[data-hero-metrics]'),
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.6 },
          1.4
        )
        q('[data-hero-count]').forEach((node, i) => {
          const el = node as HTMLElement
          const value = Number(el.dataset.countValue ?? '0')
          const suffix = el.dataset.countSuffix ?? ''
          const proxy = { n: 0 }
          el.textContent = `0${suffix}`
          tl.to(
            proxy,
            {
              n: value,
              duration: 1.6,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = formatCount(proxy.n) + suffix
              },
            },
            1.4 + i * 0.06
          )
        })

        // Beat 7 — CTA
        tl.fromTo(
          q('[data-hero-cta]'),
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 },
          1.5
        )

        // Beat 8 — KonsultasiCard container (paralel dengan metrik)
        tl.fromTo(
          q('[data-hero-card]'),
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.8 },
          1.4
        )

        // Rotasi kata judul — query span segar tiap tick agar aman pasca-revert.
        let wordIdx = 0
        const rotator: gsap.core.Tween = gsap.delayedCall(2.6, () => {
          const el = q('[data-hero-rotating]')[0] as HTMLElement | undefined
          if (el) {
            wordIdx = (wordIdx + 1) % TITLE_WORDS.length
            el.textContent = TITLE_WORDS[wordIdx]
            // Crossfade-rise (tanpa overflow clip agar ekor huruf tidak terpotong).
            gsap.fromTo(
              el,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }
            )
          }
          rotator.restart(true)
        })

        splitCleanup = () => split?.revert()
      }
    }, section)

    return () => {
      splitCleanup?.()
      ctx.revert()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative overflow-hidden border-b border-muted/20',
        layoutGovernance.sectionY.hero
      )}
    >
      {/* Jaring pengaman tanpa JS: entrance GSAP tidak jalan, konten tetap tampil */}
      <noscript>
        <style>{`.sentra-hero-prep{visibility:visible}`}</style>
      </noscript>
      <HeroScanLine />
      <div className={cn('relative', layoutGovernance.container.wide, layoutGovernance.sectionX)}>
        <div className="grid lg:grid-cols-[1fr_480px] gap-12 items-start">
          {/* Left Side — Text */}
          <div className="relative flex flex-col gap-12">
            {/* Garis sketsa: vertikal di batas kiri teks hero — beat 1 Blueprint Draw */}
            <div
              data-hero-line-v
              className="sentra-hero-prep hidden md:block absolute -left-6 top-0 bottom-0 w-px bg-foreground/15 origin-top"
              aria-hidden
            />

            {/* 01, 02, 03 Points */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                {[
                  { id: '01', text: 'Program Indonesia Sehat' },
                  { id: '02', text: '6 Pilar Transformasi Kesehatan' },
                  { id: '03', text: 'Hak Asasi Manusia' },
                ].map((point) => (
                  <div
                    key={point.id}
                    data-hero-point
                    className="sentra-hero-prep flex flex-col gap-2"
                  >
                    <span className={cn(typeGovernance.eyebrow, 'text-xs md:text-xs')}>
                      {point.id}
                    </span>
                    <p className="max-w-[180px] font-jakarta text-xs font-medium uppercase tracking-[0.14em] text-muted">
                      {point.text}
                    </p>
                  </div>
                ))}
              </div>
              {/* Garis sketsa: horizontal di bawah susunan poin — beat 2 Blueprint Draw */}
              <div
                data-hero-line-h
                className="sentra-hero-prep h-px bg-foreground/15 origin-left"
                aria-hidden
              />
            </div>

            {/* Main Title — entrance via GSAP SplitText (Blueprint Draw beat 4);
                DOM dikembalikan (revert) setelah entrance agar RotatingWord aman */}
            <div className="flex flex-col gap-7">
              {/* Ukuran font dikalibrasi agar judul stabil maksimal 2 baris di md+
                  bahkan dengan kata rotasi terpanjang; lebar kata rotasi dipesan
                  selebar "Terstruktur" (sizer invisible) supaya jumlah baris tidak
                  pernah berubah saat kata berganti — halaman tidak bergeser sendiri. */}
              <h1
                data-hero-headline
                className={cn(
                  typeGovernance.editorialDisplay,
                  'sentra-hero-prep max-w-[980px] text-[34px] sm:text-[42px] md:text-[48px] lg:text-[40px] xl:text-[46px] min-[1400px]:text-[56px] leading-[1.02]'
                )}
              >
                Bantu Dokter Ambil Keputusan Klinis{' '}
                <span className="whitespace-nowrap">
                  Lebih{' '}
                  <span className="relative inline-block align-baseline">
                    <span aria-hidden className="invisible">
                      {TITLE_WORDS.reduce((a, b) => (a.length >= b.length ? a : b))}
                    </span>
                    <span data-hero-rotating className="absolute left-0 top-0 text-accent">
                      {TITLE_WORDS[0]}
                    </span>
                  </span>
                </span>
              </h1>
              <p
                data-hero-subcopy
                className={cn(
                  typeGovernance.editorialBody,
                  'sentra-hero-prep max-w-[720px] text-base md:text-xl'
                )}
              >
                Sentra membaca keluhan pasien, menghitung kemungkinan diagnosis, dan menyiapkan
                rekomendasi — dalam hitungan detik. Dokter tetap yang memutuskan, Sentra yang
                mempercepat prosesnya. Hadir 2026 untuk fasilitas kesehatan Indonesia.
              </p>
            </div>

            {/* Ticker metrik — count-up dari master timeline (beat 6) */}
            <div data-hero-metrics className="sentra-hero-prep border-t border-muted/15 pt-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                {METRICS.map((m) => (
                  <div key={m.label} className="flex flex-col gap-1.5">
                    <span className="font-jakarta text-[26px] font-bold leading-none text-foreground tabular-nums md:text-[32px]">
                      <span
                        data-hero-count
                        data-count-value={m.value}
                        data-count-suffix={m.suffix ?? ''}
                      >
                        {formatCount(m.value)}
                        {m.suffix ?? ''}
                      </span>
                    </span>
                    <span className="font-jakarta text-[10px] font-bold uppercase tracking-[0.14em] text-muted/70">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA — Baca Cerita Kami + Tes Pilot Login (beat 7) */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
              <Link
                href="/story"
                data-hero-cta
                className="sentra-hero-prep group inline-flex items-center justify-center gap-3 border border-muted/30 rounded-full px-8 py-4 hover:border-accent/50 hover:bg-accent/5 transition-all"
              >
                <span className="text-sm font-bold uppercase tracking-widest text-muted group-hover:text-accent transition-colors">
                  Baca Cerita Kami
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-muted group-hover:text-accent transition-colors"
                />
              </Link>
              <Link
                href={pilotLogin.href}
                {...(pilotLogin.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                data-hero-cta
                className="sentra-hero-prep group inline-flex items-center justify-center gap-3 border border-accent/30 rounded-full px-8 py-4 hover:border-accent/60 hover:bg-accent/10 transition-all"
              >
                <span className="text-sm font-bold uppercase tracking-widest text-accent/90 group-hover:text-accent transition-colors">
                  Tes Pilot Login
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-accent/70 group-hover:text-accent transition-colors"
                />
              </Link>
            </div>
          </div>

          {/* Right Side — Konsultasi Card (beat 8; isi chat tetap Framer Motion) */}
          <div data-hero-card className="sentra-hero-prep w-full lg:sticky lg:top-32">
            <KonsultasiCard />
          </div>
        </div>
      </div>
    </section>
  )
}
