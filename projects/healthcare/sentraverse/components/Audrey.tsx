// Architected and built by Drferdi.
// [APPROVED]
'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

type MessageBadge = {
  label: string
  accent?: boolean
  confidence?: string
  value?: string
}

type ConversationMessage = {
  id: string
  role: 'user' | 'audrey'
  text: string
  delay: number
  isThinking?: boolean
  badges?: MessageBadge[]
}

type FeatureItem = {
  id: string
  title: string
  desc: string
}

const AUD = {
  amber: 'var(--sentra-audrey)',
  amberMuted: 'var(--sentra-audrey-muted)',
  amberFaint: 'var(--sentra-audrey-faint)',
  amberGlow: 'var(--sentra-audrey-glow)',
  teal: 'var(--sentra-audrey-teal)',
  tealFaint: 'var(--sentra-audrey-teal-faint)',
  bubbleBackground: 'var(--sentra-audrey-bubble)',
  bubbleText: 'var(--sentra-audrey-bubble-text)',
  cardShadow: 'var(--sentra-shadow-card)',
  elevatedShadow: 'var(--sentra-shadow-elevated)',
  subtleShadow: 'var(--sentra-shadow-subtle)',
  ringBorder: 'var(--sentra-audrey-ring-border)',
  accentBorder: 'var(--sentra-audrey-accent-border)',
  accentBubble: 'var(--sentra-audrey-accent-bubble)',
  accentBubbleBorder: 'var(--sentra-audrey-accent-bubble-border)',
  featureDivider: 'var(--sentra-audrey-feature-divider)',
  gridLine: 'var(--sentra-grid-line-strong)',
  neutralSoft: 'var(--sentra-neutral-soft)',
  neutralBorder: 'var(--sentra-neutral-border)',
  neutralText: 'var(--sentra-neutral-text)',
  cornerBorder: 'var(--sentra-audrey-corner-border)',
} as const

const SPARKLE_PATH =
  'M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z'

const conversation: ConversationMessage[] = [
  {
    id: 'case-intake',
    role: 'user',
    text: 'Pasien perempuan 32 tahun, nyeri perut kanan bawah sejak 12 jam, mual, demam 38.2°C',
    delay: 0.3,
  },
  {
    id: 'thinking',
    role: 'audrey',
    text: 'Menganalisis presentasi klinis...',
    delay: 1.2,
    isThinking: true,
  },
  {
    id: 'analysis',
    role: 'audrey',
    text: 'Berdasarkan analisis Bayesian: Suspek Apendisitis Akut (LR+ 8.4). Alvarado Score: 7/10 — probabilitas tinggi. Rekomendasi: USG abdomen STAT, CBC + CRP, konsultasi bedah.',
    delay: 2,
    badges: [
      { label: 'Apendisitis Akut', confidence: '87.3%' },
      { label: 'Alvarado', value: '7/10' },
      { label: 'Triase', value: 'URGENT', accent: true },
    ],
  },
  {
    id: 'lab-input',
    role: 'user',
    text: 'Hasil lab: WBC 14.200, CRP 48, USG: aperistaltik tubular structure 8mm',
    delay: 4.5,
  },
  {
    id: 'confirmation',
    role: 'audrey',
    text: 'Konfirmasi diagnostik: Apendisitis Akut Non-Komplikata. Posterior probability meningkat ke 96.1%. Protokol pre-operatif diaktifkan. Dokumentasi rujukan bedah auto-generated.',
    delay: 5.5,
    badges: [
      { label: 'Confirmed', confidence: '96.1%' },
      { label: 'Pre-Op', value: 'ACTIVE', accent: true },
    ],
  },
]

const features: FeatureItem[] = [
  {
    id: '01',
    title: 'Analisis Bayesian Real-Time',
    desc: 'Posterior probability dihitung instan dari gejala, prevalensi, dan faktor risiko pasien.',
  },
  {
    id: '02',
    title: 'Auto-Dokumentasi Klinis',
    desc: 'Catatan kunjungan, surat rujukan, dan ringkasan pemulangan di-generate otomatis.',
  },
  {
    id: '03',
    title: 'Safety Gate Terintegrasi',
    desc: 'Setiap output melewati validasi klinis multi-layer sebelum disajikan ke dokter.',
  },
  {
    id: '04',
    title: 'Bahasa Natural Klinis',
    desc: 'Mengerti narasi dokter Indonesia — slang medis, singkatan, dan terminologi lokal.',
  },
  {
    id: '05',
    title: 'Respons < 2 Detik',
    desc: 'Latency ultra-rendah untuk keputusan klinis yang time-critical di IGD.',
  },
]

const audreyStats = [
  { number: '< 2s', label: 'Rata-rata Respons' },
  { number: '144+', label: 'Penyakit KKI Tercakup' },
  { number: '99.7%', label: 'Uptime Tersedia' },
  { number: '0', label: 'PHI Data Tersimpan' },
] as const

function useTypingEffect(text: string, isActive: boolean, speed = 18) {
  const [displayed, setDisplayed] = useState('')
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    if (!isActive) {
      return
    }

    let characterIndex = 0
    const interval = window.setInterval(() => {
      if (characterIndex < text.length) {
        setDisplayed(text.slice(0, characterIndex + 1))
        characterIndex += 1
        return
      }

      setIsDone(true)
      window.clearInterval(interval)
    }, speed)

    return () => window.clearInterval(interval)
  }, [text, isActive, speed])

  return {
    displayed: isActive ? displayed : '',
    isDone: isActive ? isDone : false,
  }
}

function PulseRing({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{ borderColor: AUD.ringBorder, inset: `-${20 + delay * 40}px` }}
      animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.05, 0.15] }}
      transition={{ duration: 4, delay: delay * 0.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function ChatBubble({ msg, isVisible }: { msg: ConversationMessage; isVisible: boolean }) {
  const isUser = msg.role === 'user'
  const { displayed, isDone } = useTypingEffect(
    msg.text,
    isVisible && !msg.isThinking,
    isUser ? 12 : 20
  )

  if (!isVisible) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}
    >
      {!isUser && (
        <div
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: AUD.amberFaint, border: `1px solid ${AUD.accentBorder}` }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 65 65"
            fill="currentColor"
            style={{ color: AUD.amber }}
          >
            <path d={SPARKLE_PATH} />
          </svg>
        </div>
      )}

      <div className={`flex max-w-[85%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <span
          className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isUser ? 'text-muted/50' : ''}`}
          style={!isUser ? { color: AUD.amber } : undefined}
        >
          {isUser ? 'Dokter' : 'Audrey'}
        </span>

        <div
          className={`rounded-xl px-3.5 py-2 text-[11px] leading-relaxed font-jakarta ${
            isUser ? 'rounded-br-sm' : 'rounded-bl-sm text-foreground/70'
          }`}
          style={
            isUser
              ? {
                  background: AUD.bubbleBackground,
                  color: AUD.bubbleText,
                  boxShadow: AUD.subtleShadow,
                }
              : { background: AUD.accentBubble, border: `1px solid ${AUD.accentBubbleBorder}` }
          }
        >
          {msg.isThinking ? (
            <span className="flex items-center gap-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((dotIndex) => (
                  <motion.span
                    key={dotIndex}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: AUD.amberMuted }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, delay: dotIndex * 0.2, repeat: Infinity }}
                  />
                ))}
              </span>
              <span className="text-[11px]" style={{ color: AUD.amberMuted }}>
                {msg.text}
              </span>
            </span>
          ) : (
            <>
              {displayed}
              {!isDone && (
                <motion.span
                  className="ml-0.5 inline-block h-[14px] w-[2px] align-middle"
                  style={{ background: AUD.amberMuted }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
            </>
          )}
        </div>

        {msg.badges && isDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-1 flex flex-wrap gap-1.5"
          >
            {msg.badges.map((badge) => (
              <span
                key={`${msg.id}-${badge.label}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-jakarta ${
                  badge.accent ? 'border-accent/20 bg-accent/15 text-accent' : ''
                }`}
                style={
                  badge.accent
                    ? undefined
                    : {
                        background: badge.confidence ? AUD.tealFaint : AUD.neutralSoft,
                        borderColor: badge.confidence
                          ? 'rgb(var(--sentra-audrey-teal-rgb) / 0.15)'
                          : AUD.neutralBorder,
                        color: badge.confidence ? AUD.teal : AUD.neutralText,
                      }
                }
              >
                {badge.label}
                {badge.confidence ? (
                  <span style={{ color: AUD.teal }}>{badge.confidence}</span>
                ) : null}
                {badge.value ? (
                  <span className={badge.accent ? 'text-accent' : 'text-foreground/80'}>
                    {badge.value}
                  </span>
                ) : null}
              </span>
            ))}
          </motion.div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-muted/15 bg-foreground/[0.06]">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-foreground/50"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </motion.div>
  )
}

function FeatureTypingList() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!inView) {
      return
    }

    const timers = features.map((_, index) =>
      window.setTimeout(
        () => {
          setVisibleCount((previous) => Math.max(previous, index + 1))
        },
        400 + index * 700
      )
    )

    return () => timers.forEach(window.clearTimeout)
  }, [inView])

  return (
    <div ref={ref} className="flex flex-col gap-4 pt-2">
      {features.map((feature, index) => {
        const isActive = index < visibleCount

        return (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, x: 12 }}
            animate={isActive ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={isActive ? '' : 'opacity-0'}
          >
            <div className="mb-1 flex items-baseline gap-2">
              <span
                className="text-[10px] font-bold tracking-[0.2em] font-jakarta"
                style={{ color: AUD.amberMuted }}
              >
                {feature.id}
              </span>
              <h4 className="text-sm font-bold tracking-tight text-foreground font-jakarta md:text-base">
                {feature.title}
              </h4>
            </div>
            <p className="pl-6 text-xs leading-relaxed text-muted/60 font-jakarta">
              {feature.desc}
            </p>
            {index < features.length - 1 ? (
              <div
                className="ml-6 mt-3 h-px"
                style={{
                  background: `linear-gradient(to right, ${AUD.featureDivider}, transparent)`,
                }}
              />
            ) : null}
          </motion.div>
        )
      })}
    </div>
  )
}

export default function Audrey({ hideHeader = false }: { hideHeader?: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [visibleMessages, setVisibleMessages] = useState(0)

  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isInView) {
      return
    }

    const timers = conversation.map((message, index) =>
      window.setTimeout(() => {
        setVisibleMessages((previous) => Math.max(previous, index + 1))
      }, message.delay * 1000)
    )

    return () => timers.forEach(window.clearTimeout)
  }, [isInView])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [visibleMessages])

  const renderContent = () => (
    <div
      className={
        hideHeader ? 'relative z-10 w-full' : 'relative z-10 mx-auto max-w-[1440px] px-6 md:px-12'
      }
    >
      {!hideHeader && (
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-2 inline-flex items-center gap-2"
          >
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: AUD.amber }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.25em] font-jakarta"
              style={{ color: AUD.amber }}
            >
              Audrey AI Assistant
            </span>
            <div className="h-px w-12" style={{ background: 'var(--sentra-audrey-line)' }} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mx-auto max-w-[900px] text-lg font-bold leading-[1.15] tracking-tight text-foreground font-jakarta md:text-xl"
          >
            Your Clinical Co-Pilot,{' '}
            <span className="relative inline-block">
              <span style={{ color: AUD.amber }}>Always On</span>
              <motion.div
                className="absolute -bottom-0.5 left-0 h-[1.5px] w-full"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
                style={{
                  transformOrigin: 'left',
                  background: 'var(--sentra-audrey-gradient-line)',
                }}
              />
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-2 max-w-[580px] text-xs leading-relaxed text-muted/80 font-jakarta"
          >
            Audrey memproses narasi klinis, menghitung probabilitas diagnostik, dan menghasilkan
            rekomendasi evidence-based — dalam hitungan detik.
          </motion.p>
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div
            className="relative overflow-hidden rounded-2xl border border-muted/10 bg-background"
            style={{ boxShadow: AUD.cardShadow }}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <PulseRing delay={0} />
              <PulseRing delay={1} />
              <PulseRing delay={2} />
            </div>

            <div className="relative flex items-center justify-between border-b border-muted/8 px-4 py-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      background: AUD.amberFaint,
                      border: `1px solid ${AUD.accentBorder}`,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 65 65"
                      fill="currentColor"
                      style={{ color: AUD.amber }}
                    >
                      <path d={SPARKLE_PATH} />
                    </svg>
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background"
                    style={{ background: AUD.amber }}
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-foreground font-jakarta">
                    Audrey
                  </h3>
                  <span
                    className="text-[9px] font-medium font-jakarta"
                    style={{ color: AUD.amberMuted }}
                  >
                    Online — Ready
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted/30 font-jakarta">
                  Sentra Engine v3.5
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((dot) => (
                    <div key={dot} className="h-1 w-1 rounded-full bg-muted/15" />
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={chatContainerRef}
              className="relative flex h-[480px] flex-col gap-3 p-4 overflow-y-auto scrollbar-thin scroll-smooth"
            >
              {conversation.map((message, index) => (
                <ChatBubble key={message.id} msg={message} isVisible={index < visibleMessages} />
              ))}
            </div>

            <div className="relative border-t border-muted/8 px-4 py-3">
              <div className="flex items-center gap-3 rounded-xl border border-muted/8 bg-foreground/[0.02] px-3.5 py-2">
                <span className="flex-1 text-[11px] text-muted/30 font-jakarta">
                  Ketik gejala klinis atau pertanyaan...
                </span>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: AUD.amberFaint }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 2L11 13" style={{ color: AUD.amberMuted }} />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" style={{ color: AUD.amberMuted }} />
                  </svg>
                </div>
              </div>
            </div>

            <div
              className="pointer-events-none absolute left-2 top-2 h-4 w-4 rounded-tl-md border-l border-t"
              style={{ borderColor: AUD.cornerBorder }}
            />
            <div
              className="pointer-events-none absolute right-2 top-2 h-4 w-4 rounded-tr-md border-r border-t"
              style={{ borderColor: AUD.cornerBorder }}
            />
            <div
              className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 rounded-bl-md border-b border-l"
              style={{ borderColor: AUD.cornerBorder }}
            />
            <div
              className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 rounded-br-md border-b border-r"
              style={{ borderColor: AUD.cornerBorder }}
            />
          </div>
        </motion.div>

        <FeatureTypingList />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-muted/8 bg-muted/5 md:grid-cols-4"
        style={{ boxShadow: AUD.elevatedShadow }}
      >
        {audreyStats.map((stat) => (
          <div key={stat.label} className="bg-background px-4 py-4 text-center">
            <span
              className="block text-lg font-bold tracking-tight font-jakarta md:text-xl"
              style={{ color: AUD.amber }}
            >
              {stat.number}
            </span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.15em] text-muted/50 font-jakarta">
              {stat.label}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  )

  if (hideHeader) {
    return (
      <div ref={sectionRef} className="relative w-full">
        {renderContent()}
      </div>
    )
  }

  return (
    <section
      id="audrey"
      ref={sectionRef}
      className="relative overflow-hidden border-b border-muted/20 py-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: AUD.amberGlow }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: 'var(--sentra-audrey-ambient)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(${AUD.gridLine} 1px, transparent 1px),
              linear-gradient(90deg, ${AUD.gridLine} 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>
      {renderContent()}
    </section>
  )
}
