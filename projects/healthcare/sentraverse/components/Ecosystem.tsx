// Architected and built by Drferdi.
'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Github } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { siteLinks } from '@/lib/site-links'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const SUBTITLE = 'Teknologi yang Bekerja Dalam Diam'

// Subtitle editorial dengan efek mengetik ringan saat masuk viewport.
function TypingSubtitle() {
  const ref = useRef<HTMLParagraphElement>(null)
  const [started, setStarted] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= SUBTITLE.length) {
          clearInterval(timer)
          return c
        }
        return c + 1
      })
    }, 55)
    return () => clearInterval(timer)
  }, [started])

  return (
    <p
      ref={ref}
      aria-label={SUBTITLE}
      className={cn(
        typeGovernance.editorialBody,
        'mt-3 min-h-[1.4em] text-xl md:text-2xl text-foreground/80'
      )}
    >
      <span aria-hidden>{SUBTITLE.slice(0, count)}</span>
      <span
        aria-hidden
        className="inline-block w-[2px] h-[0.85em] ml-1 align-[-0.08em] bg-accent/70 animate-pulse"
      />
    </p>
  )
}

const PRODUCTS = [
  {
    id: '01',
    name: 'Sentrapedia',
    tag: 'Knowledge Base',
    description:
      'Ensiklopedia medis Sentra — pengetahuan klinis terstruktur yang menjadi fondasi penalaran AI di seluruh ekosistem.',
    href: siteLinks.sentrapedia,
  },
  {
    id: '02',
    name: 'SentraWiki',
    tag: 'Dokumentasi',
    description:
      'Wiki ekosistem Sentra — dokumentasi protokol, alur kerja, dan standar klinis yang hidup bersama tim kesehatan.',
    href: siteLinks.sentrawiki,
  },
  {
    id: '03',
    name: 'Asisten Medis',
    tag: 'Browser Extension',
    description:
      'Pendamping klinisi di browser — ekstraksi data pasien, ringkasan kasus, dan dukungan keputusan tepat di sisi rekam medis.',
  },
  {
    id: '04',
    name: 'Medboard',
    tag: 'Dashboard',
    description:
      'Dashboard cerdas medis — pemantauan pasien, skor risiko, dan rekomendasi klinis dalam satu papan kendali.',
  },
  {
    id: '05',
    name: 'Sidelab Terminal',
    tag: 'CDSS · Terminal',
    description:
      'CDSS dalam wujud terminal — clinical decision support yang sama dengan lini utama, dikemas ringkas untuk power user di command line.',
  },
]

export default function Ecosystem() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const mm = gsap.matchMedia()

    // Horizontal pin di semua layar lebar — scrub mengikuti tangan user sendiri,
    // jadi tetap aman untuk reduced motion. Di bawah 768px track vertikal tanpa pin.
    mm.add('(min-width: 768px)', () => {
      const distance = () => track.scrollWidth - window.innerWidth

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          anticipatePin: 1,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${self.progress})`
            }
          },
        },
      })
    })

    // Refresh ulang setelah layout benar-benar settle (font/gambar/video di atas
    // section bisa menggeser posisi start dan membuat pin terasa "lepas").
    const settleTimer = setTimeout(() => ScrollTrigger.refresh(), 1200)
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)

    return () => {
      clearTimeout(settleTimer)
      window.removeEventListener('load', onLoad)
      mm.revert()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="ecosystem"
      className="relative border-b border-muted/20 overflow-hidden"
    >
      <div className="flex flex-col py-20 md:h-screen md:justify-center md:py-0">
        {/* Header */}
        <div
          className={cn(
            'mb-12 w-full md:mb-14',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <p className={typeGovernance.eyebrow}>Ekosistem</p>
          <h2 className={typeGovernance.sectionTitle}>
            Sebuah Ekosistem, Lima Permukaan, Satu Teknologi
          </h2>
          <TypingSubtitle />
        </div>

        {/* Track — bergeser ke kanan mengikuti scroll */}
        <div
          ref={trackRef}
          className="flex flex-col md:flex-row gap-6 md:gap-8 px-6 md:px-12 md:w-max will-change-transform"
        >
          {PRODUCTS.map((product) => {
            const cardClassName =
              // 600px = 6 kolom + gutter pada grid 1440 — snap seragam di md & lg.
              'group relative w-full md:w-[600px] shrink-0 rounded-2xl border border-muted/20 bg-background overflow-hidden transition-colors hover:border-accent/40'

            const cardBody = (
              <>
                {/* Logo GitHub — pojok kanan atas, besar */}
                <span
                  role="link"
                  aria-label="GitHub"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    window.open('https://github.com/sentraai', '_blank', 'noopener,noreferrer')
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.stopPropagation()
                    e.preventDefault()
                    window.open('https://github.com/sentraai', '_blank', 'noopener,noreferrer')
                  }}
                  className="absolute top-20 right-6 z-10 cursor-pointer text-muted/50 transition-colors hover:text-muted"
                >
                  <Github size={40} strokeWidth={1.5} />
                </span>

                {/* Header — mac window chrome */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-muted/20">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="h-3.5 w-px bg-muted/20" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted font-jakarta">
                    sentra / {product.name.toLowerCase().replace(/\s+/g, '-')}
                  </span>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="hidden sm:block w-6 h-px bg-muted/20" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted/50">
                      {product.tag}
                    </span>
                  </div>
                </div>
                {/* Double rule accent */}
                <div className="mt-[3px] h-px bg-muted/10" />

                {/* Body */}
                <div className="px-6 md:px-8 py-10 md:py-14 min-h-[280px] md:min-h-[320px] flex flex-col justify-between gap-8">
                  <span className="text-xs font-bold tracking-widest text-accent font-jakarta">
                    {product.id}
                  </span>
                  <div>
                    <h3 className={cn(typeGovernance.editorialDisplay, 'text-3xl md:text-5xl')}>
                      {product.name}
                    </h3>
                    <p className={cn(typeGovernance.body, 'mt-4 max-w-[440px] md:text-base')}>
                      {product.description}
                    </p>
                  </div>
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      window.open('https://github.com/sentraai', '_blank', 'noopener,noreferrer')
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.stopPropagation()
                      e.preventDefault()
                      window.open('https://github.com/sentraai', '_blank', 'noopener,noreferrer')
                    }}
                    className="inline-flex w-fit cursor-pointer items-center text-xs font-bold uppercase tracking-widest text-muted/60 transition-colors hover:text-muted font-jakarta"
                  >
                    Klik di sini
                  </span>
                </div>

                {/* Corner ticks */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t border-l border-muted/30 rounded-tl" />
                  <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t border-r border-muted/30 rounded-tr" />
                  <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b border-l border-muted/30 rounded-bl" />
                  <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b border-r border-muted/30 rounded-br" />
                </div>
              </>
            )

            if (product.href) {
              return (
                <Link key={product.id} href={product.href} className={cardClassName}>
                  {cardBody}
                </Link>
              )
            }

            return (
              <article key={product.id} className={cardClassName}>
                {cardBody}
              </article>
            )
          })}
        </div>

        {/* Garis progres perjalanan horizontal */}
        <div className="hidden md:block w-full max-w-[1440px] mx-auto px-6 md:px-12 mt-14">
          <div className="relative h-px bg-muted/20">
            <div ref={progressRef} className="absolute inset-0 origin-left scale-x-0 bg-accent" />
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-mono uppercase tracking-widest text-muted/50">
            {PRODUCTS.map((product) => (
              <span key={product.id}>
                {product.id} {product.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
