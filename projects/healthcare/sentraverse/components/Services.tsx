// Architected and built by Drferdi.
'use client'

import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { typeGovernance } from '@/lib/design-governance'
import { siteLinks } from '@/lib/site-links'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin)
}

const services = [
  {
    id: '01',
    title: 'Synthesia Engine',
    formula: 'P(yᵢ | x) = softmax(Wh + b)ᵢ',
    desc: 'Mesin NLP klinis real-time yang mentransformasi narasi pasien tidak terstruktur — keluhan, riwayat penyakit, catatan dokter — menjadi entitas medis terstruktur. Melakukan ekstraksi entitas, normalisasi terminologi medis, dan menyintesis input mentah menjadi bahasa klinis standar yang siap diproses oleh modul diagnostik selanjutnya.',
  },
  {
    id: '02',
    title: 'Bayesian Algorithm',
    formula: 'P(D|S) = P(S|D) · P(D) / P(S)',
    desc: 'Mesin probabilitas posterior yang menghitung diagnosis diferensial berdasarkan rasio likelihood gejala, prevalensi klinis, dan faktor risiko spesifik pasien. Menghasilkan hipotesis diagnostik terurut dengan interval kepercayaan untuk validasi dokter.',
  },
  {
    id: '03',
    title: 'Clinical Trajectory',
    formula: 'dx/dt = f(x, t, θ) + ε,  x(t₀) = x₀',
    desc: 'Pemetaan trajectory pasien longitudinal yang memvisualisasikan progresi penyakit lintas kunjungan. Mendeteksi anomali tren, memprediksi jendela deteriorasi, dan memungkinkan intervensi klinis dengan presisi waktu yang tepat.',
  },
  {
    id: '04',
    title: 'Optical Character Recognition',
    formula: 'WER = (S + D + I) / N',
    desc: 'Kecerdasan dokumen tingkat medis yang mengekstrak data terstruktur dari rekam fisik — hasil laboratorium, radiograf, resep — dengan skor kepercayaan per field. Menghilangkan transkripsi manual sambil mempertahankan akurasi tingkat forensik.',
  },
  {
    id: '05',
    title: 'Artificial Intelligence Powered Pharmaceutical',
    formula: 'v = Vmax · [S] / (Km + [S])',
    desc: 'Lapisan farmakovigilans otomatis yang mencocok-silangkan profil medikasi pasien terhadap basis data interaksi obat-obat, rekam alergi, dan kontraindikasi komorbiditas. Menghasilkan peringatan keamanan real-time sebelum finalisasi resep.',
  },
  {
    id: '06',
    title: 'Smart Referral & Auto Documentation',
    formula: 'η = 1 − T_auto / T_manual',
    desc: 'Mesin sintesis rujukan cerdas dan dokumentasi klinis otomatis. Menghasilkan ringkasan pemulangan terstandarisasi, surat rujukan, dan catatan kunjungan — mengurangi beban administratif dokter hingga 40%.',
  },
  {
    id: '07',
    title: 'Clinical Prognosis',
    formula: 'h(t|x) = h₀(t) · exp(β₁x₁ + β₂x₂ + ··· + βₙxₙ)',
    desc: 'Pemodelan prediktif outcome yang menyintesis data trajectory pasien, profil komorbiditas, dan pola respons terapi untuk menghasilkan asesmen prognostik berbasis evidens. Mendukung pengambilan keputusan klinis dengan timeline terstratifikasi risiko dan proyeksi dampak intervensi.',
  },
]

// Karakter scramble bernuansa komputasi-klinis untuk formula protokol.
const SCRAMBLE_CHARS = '01∑∫∆βθπλ×/=+·'

const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-')

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Horizontal pinned scroll ala section Ekosistem: track 7 kartu protokol
  // bergeser mengikuti scroll (scrub), garis progres di bawah. Formula tiap
  // kartu menyusun diri (ScrambleText) saat kartunya masuk viewport.
  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const mm = gsap.matchMedia()

    const scrambleFormula = (formula: HTMLElement, scrollTrigger: ScrollTrigger.Vars) => {
      const finalText = formula.textContent ?? ''
      gsap.to(formula, {
        duration: 1.1,
        scrambleText: { text: finalText, chars: SCRAMBLE_CHARS, speed: 0.5 },
        scrollTrigger,
      })
    }

    // ≥768px: pin + geser horizontal. Scrub mengikuti tangan user sendiri.
    mm.add('(min-width: 768px)', () => {
      const distance = () => track.scrollWidth - window.innerWidth

      const slide = gsap.to(track, {
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
          // Section ini ada SETELAH pin Ecosystem DAN pin BlueprintStory.
          // Tanpa refreshPriority lebih rendah, start/end dihitung sebelum
          // pin-spacer keduanya masuk layout (preseden BlueprintStory: -1).
          refreshPriority: -2,
          onUpdate: (self) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${self.progress})`
            }
          },
        },
      })

      // Scramble per kartu saat masuk dari kanan (trigger horizontal via
      // containerAnimation pada tween geser di atas).
      track.querySelectorAll<HTMLElement>('[data-proto-formula]').forEach((formula) => {
        scrambleFormula(formula, {
          trigger: formula.closest('[data-proto-card]') as Element,
          containerAnimation: slide,
          start: 'left 85%',
          toggleActions: 'play none none none',
        })
      })
    })

    // <768px: track vertikal tanpa pin — scramble via trigger vertikal biasa.
    mm.add('(max-width: 767px)', () => {
      track.querySelectorAll<HTMLElement>('[data-proto-formula]').forEach((formula) => {
        scrambleFormula(formula, {
          trigger: formula.closest('[data-proto-card]') as Element,
          start: 'top 85%',
          toggleActions: 'play none none none',
        })
      })
    })

    // Refresh ulang setelah layout settle (pola yang sama dengan Ekosistem).
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
      id="services"
      className="relative border-b border-muted/20 overflow-hidden"
    >
      <div className="flex flex-col py-20 md:h-screen md:justify-center md:py-0">
        {/* Header */}
        <div className="mb-12 w-full md:mb-14 max-w-[1440px] mx-auto px-6 md:px-12">
          <p className={typeGovernance.eyebrow}>Our Service</p>
          <h2 className={typeGovernance.sectionTitle}>Introducing the Protocols 7</h2>
          <p className={cn(typeGovernance.bodySm, 'mt-3 max-w-[680px]')}>
            Arsitektur Artificial Intelligence modular untuk alur kerja klinis — tujuh lapisan
            komputasi independen yang mengaugmentasi keputusan dokter tanpa mengganggu standar
            klinis yang berlaku.
          </p>
        </div>

        {/* Track — bergeser ke kanan mengikuti scroll */}
        <div
          ref={trackRef}
          className="flex flex-col md:flex-row gap-6 md:gap-8 px-6 md:px-12 md:w-max will-change-transform"
        >
          {services.map((service) => (
            <article
              key={service.id}
              data-proto-card
              className="group relative w-full md:w-[600px] shrink-0 rounded-2xl border border-muted/20 bg-background overflow-hidden transition-colors hover:border-accent/40"
            >
              {/* Header — mac window chrome */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-muted/20">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="h-3.5 w-px bg-muted/20" />
                <span className="min-w-0 truncate text-xs font-bold uppercase tracking-widest text-muted font-jakarta">
                  protocol / {slugify(service.title)}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  <div className="hidden sm:block w-6 h-px bg-muted/20" />
                  <span className="whitespace-nowrap text-[10px] font-mono uppercase tracking-widest text-muted/50">
                    P-{service.id}
                  </span>
                </div>
              </div>
              {/* Double rule accent */}
              <div className="mt-[3px] h-px bg-muted/10" />

              {/* Body */}
              <div className="px-6 md:px-8 py-10 md:py-12 min-h-[280px] md:min-h-[340px] flex flex-col justify-between gap-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold tracking-widest text-accent font-jakarta">
                    {service.id}
                  </span>
                  <code
                    data-proto-formula
                    className="text-[11px] font-mono tracking-wide text-accent/70 text-right"
                  >
                    {service.formula}
                  </code>
                </div>
                <div>
                  <h3 className={cn(typeGovernance.editorialDisplay, 'text-3xl md:text-[40px]')}>
                    {service.title}
                  </h3>
                  <p
                    className={cn(typeGovernance.body, 'mt-4 max-w-[480px] text-sm md:text-[15px]')}
                  >
                    {service.desc}
                  </p>
                </div>
                <Link
                  href={siteLinks.contact}
                  className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted/60 transition-colors hover:text-accent font-jakarta"
                >
                  Aktifkan Protokol
                  <ArrowUpRight size={12} />
                </Link>
              </div>

              {/* Corner ticks */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t border-l border-muted/30 rounded-tl" />
                <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t border-r border-muted/30 rounded-tr" />
                <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b border-l border-muted/30 rounded-bl" />
                <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b border-r border-muted/30 rounded-br" />
              </div>
            </article>
          ))}
        </div>

        {/* Garis progres perjalanan horizontal */}
        <div className="hidden md:block w-full max-w-[1440px] mx-auto px-6 md:px-12 mt-14">
          <div className="relative h-px bg-muted/20">
            <div ref={progressRef} className="absolute inset-0 origin-left scale-x-0 bg-accent" />
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-mono uppercase tracking-widest text-muted/50">
            {services.map((service) => (
              <span key={service.id}>{service.id}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
