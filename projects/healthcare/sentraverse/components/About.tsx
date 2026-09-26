// Architected and built by Drferdi.
'use client'

import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Clock3, Crosshair, Globe2, Puzzle } from 'lucide-react'
import { Caveat } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { Reveal } from '@/components/ui/reveal'
import { SketchLines } from '@/components/ui/sketch-lines'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Tanda tangan handwriting — scoped ke section ini saja.
const caveat = Caveat({ subsets: ['latin'], weight: ['600'] })

const INK = '#002147'
const ACCENT = '#eb5939'

const MANIFESTO = [
  {
    id: '01',
    title: 'Keyakinan Inti',
    body: 'Temukan akar lebih awal.\nPangkas kebisingan.\nBerikan pasien waktu sebelum keadaan berubah menjadi terlambat.',
    icon: Crosshair,
  },
  {
    id: '02',
    title: 'Posisi',
    body: 'Saya tidak membangun teknologi untuk menggantikan dokter.\nSaya membangun kecerdasan klinis untuk mempercepat keputusan yang benar.',
    icon: Globe2,
  },
  {
    id: '03',
    title: 'Memandang Pasien',
    body: 'Pasien bukan data.\nPasien adalah manusia dengan pola, risiko, dan cerita klinis yang harus dibaca dengan jernih.',
    icon: Puzzle,
  },
  {
    id: '04',
    title: 'Janji',
    body: 'Bukan kompleksitas — kejelasan.\nBukan kebisingan — prioritas.\nBukan ego — keselamatan pasien.',
    icon: Clock3,
  },
]

const VALUES = ['Kecerdasan Klinis', 'Waktu Lebih Dulu', 'Kesederhanaan sebagai Disiplin']

const TICK_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5)

// Mark poster: tongkat Asclepius di dalam lingkaran jam, jarum accent.
function AsclepiusClock() {
  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-24 w-24 md:h-28 md:w-28" aria-hidden>
      {TICK_ANGLES.map((deg) => (
        <line
          key={deg}
          x1="50"
          y1="5"
          x2="50"
          y2={deg % 90 === 0 ? '12' : '10'}
          stroke={deg === 0 ? ACCENT : INK}
          strokeWidth={deg === 0 ? 3 : 2}
          strokeLinecap="round"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      {/* Jarum jam */}
      <polygon points="51,48.5 84,19 77,30" fill={ACCENT} />
      {/* Tongkat */}
      <circle cx="50" cy="18" r="4.2" fill={INK} />
      <line x1="50" y1="21" x2="50" y2="88" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
      {/* Ular */}
      <path
        d="M62 28 C 67 30, 65 35, 59 34 C 42 32, 39 40, 50 44 C 62 48, 62 56, 50 60 C 38 64, 38 72, 50 76 C 58 79, 57 85, 49 86"
        fill="none"
        stroke={INK}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="62.5" cy="27.5" r="3" fill={INK} />
      {/* Titik pusat */}
      <circle cx="50" cy="49" r="2.4" fill={ACCENT} />
    </svg>
  )
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<SVGSVGElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tesisRef = useRef<HTMLParagraphElement>(null)
  const pillarsRef = useRef<HTMLDivElement>(null)
  const quoteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const content = contentRef.current
    if (!section || !content) return

    // Transisi dari "Tentang Sentra" — Manifesto masuk dengan draw-in bertahap
    // (skala BlueprintStory): bingkai poster ter-gambar duluan (stroke-dashoffset),
    // baru disusul konten fade+slide ke kanan bertahap. Satu timeline GSAP
    // memegang seluruh entrance — menggantikan Reveal (framer) yang tadinya
    // ikut memicu animasi sendiri di blok yang sama dan membuat transisi
    // terasa flat/generik ("cuma slide").
    const ctx = gsap.context(() => {
      const frameStrokes = frameRef.current?.querySelectorAll('[data-frame-draw]') ?? []
      if (frameStrokes.length > 0) gsap.set(frameStrokes, { strokeDashoffset: 1 })

      // Konten jalan PARALEL dengan gambar bingkai (mulai detik 0) dan tanpa
      // reverse saat scroll balik — sebelumnya konten menunggu bingkai selesai
      // (±0,8–1,5 dtk) sehingga isi section terasa muncul terlambat.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
      })

      if (frameStrokes.length > 0) {
        tl.to(
          frameStrokes,
          {
            strokeDashoffset: 0,
            duration: 0.9,
            ease: 'power2.out',
            stagger: 0.08,
          },
          0
        )
      }

      tl.fromTo(
        content,
        { x: -96, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
        0
      )
      ;[tesisRef.current, pillarsRef.current, quoteRef.current].forEach((el, i) => {
        if (!el) return
        tl.fromTo(
          el,
          { x: -48, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
          0.12 + i * 0.12
        )
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative border-b border-muted/20 bg-white py-16 md:py-0 md:min-h-screen md:flex md:items-center overflow-hidden"
    >
      {/* Garis konstruksi — layer sketsa khas */}
      <SketchLines seed={19940217} count={10} colorClass="bg-[#002147]/25" persist />

      {/* Bingkai poster + corner ticks — ter-gambar (stroke-dashoffset) saat
          section masuk viewport, bukan lagi border CSS statis. */}
      <div className="pointer-events-none absolute inset-3 md:inset-5" aria-hidden>
        <svg
          ref={frameRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <rect
            data-frame-draw=""
            x="0.5"
            y="0.5"
            width="99"
            height="99"
            fill="none"
            stroke={INK}
            strokeOpacity={0.12}
            strokeWidth={0.15}
            pathLength={1}
            style={{ strokeDasharray: 1 }}
          />
          <path
            data-frame-draw=""
            d="M2,6 V2 H6"
            fill="none"
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth={0.3}
            pathLength={1}
            style={{ strokeDasharray: 1 }}
          />
          <path
            data-frame-draw=""
            d="M94,2 H98 V6"
            fill="none"
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth={0.3}
            pathLength={1}
            style={{ strokeDasharray: 1 }}
          />
          <path
            data-frame-draw=""
            d="M2,94 V98 H6"
            fill="none"
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth={0.3}
            pathLength={1}
            style={{ strokeDasharray: 1 }}
          />
          <path
            data-frame-draw=""
            d="M98,94 V98 H94"
            fill="none"
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth={0.3}
            pathLength={1}
            style={{ strokeDasharray: 1 }}
          />
        </svg>
      </div>

      <div
        ref={contentRef}
        className="relative w-full max-w-[1140px] mx-auto px-6 md:px-12 md:py-16 text-center"
      >
        {/* Potret — kanan atas, sejajar tesis; melebur lewat fade mask */}
        <div className="pointer-events-none absolute top-[236px] xl:top-[212px] -right-6 xl:-right-12 hidden lg:block w-[240px] xl:w-[280px]">
          <div className="relative bg-white">
            {/* Bingkai — ter-draw searah jarum jam membentuk segi empat, lalu stay */}
            <div className="absolute inset-0" aria-hidden>
              <motion.span
                className="absolute top-0 left-0 h-px w-full bg-[#002147]/30 origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute top-0 right-0 w-px h-full bg-[#002147]/30 origin-top"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9, duration: 0.4, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute bottom-0 left-0 h-px w-full bg-[#002147]/30 origin-right"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.3, duration: 0.4, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute bottom-0 left-0 w-px h-full bg-[#002147]/30 origin-bottom"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.7, duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Header mac ala card Sentra — muncul setelah kotak terbentuk */}
            <motion.div
              className="flex items-center gap-2 px-3 py-2 border-b border-[#002147]/15"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 2.2, duration: 0.5 }}
            >
              <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
              <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
              <span className="w-2 h-2 rounded-full bg-[#28c840]" />
              <span className="h-3 w-px bg-[#002147]/15" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-[#3a4d63]/70">
                sentra / dr-ferdi-iskandar
              </span>
            </motion.div>

            <Reveal delay={0.2} y={32}>
              {/* PNG punya 8,6% ruang transparan di bawah lengan (piksel opaque
                  terakhir = baris 456/500) — dipangkas via negative margin +
                  overflow-hidden agar lengan menempel tepat di garis bawah
                  bingkai (permintaan Chief). */}
              <div className="overflow-hidden">
                <Image
                  src="/drferdi.png"
                  alt="dr Ferdi Iskandar"
                  width={800}
                  height={800}
                  className="block w-full h-auto -mb-[9%]"
                />
              </div>
            </Reveal>

            {/* Corner ticks — penutup gaya card Sentra */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 2.5, duration: 0.5 }}
              aria-hidden
            >
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t border-l border-[#002147]/50" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t border-r border-[#002147]/50" />
              <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b border-l border-[#002147]/50" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b border-r border-[#002147]/50" />
            </motion.div>
          </div>
        </div>
        <div>
          <AsclepiusClock />

          {/* Garis penghubung mark → judul */}
          <div className="mx-auto mt-2 h-6 w-px bg-[#002147]/20" aria-hidden />

          <h2 className="mt-2 text-[48px] md:text-[64px] leading-[0.95] font-medium uppercase tracking-[0.1em] [font-family:Georgia,serif] text-[#002147]">
            Manifesto
          </h2>

          {/* Garis — titik — garis */}
          <div className="mx-auto mt-4 flex w-full max-w-[440px] items-center gap-4">
            <span className="h-px flex-1 bg-[#eb5939]/60" />
            <span className="h-2 w-2 rounded-full bg-[#eb5939]" />
            <span className="h-px flex-1 bg-[#eb5939]/60" />
          </div>

          <div className="mt-4">
            <Link
              href="https://ferdiiskandar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${caveat.className} text-3xl md:text-4xl text-[#002147] hover:text-accent transition-colors`}
            >
              dr Ferdi Iskandar
            </Link>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[#3a4d63]/70">
              Sentra Artificial Intelligence
            </p>
          </div>
        </div>

        {/* Tesis pembuka */}
        <p
          ref={tesisRef}
          className="mx-auto mt-8 border-l-2 border-[#eb5939] pl-5 text-left text-base md:text-lg leading-relaxed text-[#3a4d63] max-w-[680px]"
        >
          Kedokteran bukan sekadar tindakan. Ia adalah perlombaan melawan waktu. Kecerdasan klinis
          harus membantu menemukan akar masalah lebih awal, memangkas kebisingan, dan memberi pasien
          hal yang paling menentukan hasil: waktu yang tepat untuk diselamatkan.
        </p>

        {/* Empat pilar */}
        <div
          ref={pillarsRef}
          className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 border-y border-[#002147]/15"
        >
          {MANIFESTO.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className={`px-6 py-7 flex flex-col gap-2 text-left ${
                  index > 0 ? 'border-t sm:border-t-0 sm:border-l border-[#002147]/15' : ''
                } ${index === 2 ? 'sm:border-t lg:border-t-0 sm:border-l-0 lg:border-l' : ''} ${
                  index === 3 ? 'sm:border-t lg:border-t-0' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest text-accent font-jakarta">
                    {item.id}
                  </span>
                  <Icon className="h-5 w-5 text-[#002147]/60" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg md:text-xl font-medium [font-family:Georgia,serif] text-[#002147]">
                  {item.title}
                </h3>
                <div className="w-10 h-px bg-[#002147]/25" />
                <p className="text-sm leading-relaxed text-[#3a4d63] whitespace-pre-line">
                  {item.body}
                </p>
              </div>
            )
          })}
        </div>

        {/* Kutipan penutup + nilai */}
        <div ref={quoteRef}>
          <blockquote className="mx-auto mt-10 [font-family:Georgia,serif] text-2xl md:text-4xl leading-tight text-[#002147] max-w-[680px]">
            <span className="text-accent">&ldquo;</span>
            Yang saya bangun bukan sekadar sistem.
            <br />
            Yang saya perjuangkan adalah kesempatan kedua sebelum waktu habis.
            <span className="text-accent">&rdquo;</span>
          </blockquote>

          <div className="mx-auto mt-8 flex w-full max-w-[560px] items-center gap-4">
            <span className="h-px flex-1 bg-[#eb5939]/60" />
            <span className="h-2 w-2 rounded-full bg-[#eb5939]" />
            <span className="h-px flex-1 bg-[#eb5939]/60" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm tracking-[0.12em] text-[#002147]/80 [font-family:Georgia,serif]">
            {VALUES.map((value, index) => (
              <span key={value} className="flex items-center gap-4">
                {index > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                <span>{value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
