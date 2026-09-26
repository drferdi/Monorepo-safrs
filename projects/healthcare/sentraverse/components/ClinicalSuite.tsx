// Architected and built by Drferdi.
'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Sparkles, Activity, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import Audrey from '@/components/Audrey'
import ClinicalPrognosis from '@/components/ClinicalPrognosis'
import ClinicalTrajectory from '@/components/ClinicalTrajectory'
import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

const tabs = [
  {
    id: 0,
    label: 'TRIAGE & KO-PILOT',
    sub: 'Dukungan keputusan Audrey AI',
    icon: Sparkles,
  },
  {
    id: 1,
    label: 'TRAJEKTORI',
    sub: 'Pemantauan deteriorasi klinis',
    icon: Activity,
  },
  {
    id: 2,
    label: 'PROGNOSIS',
    sub: 'Pemodelan risiko prediktif',
    icon: TrendingUp,
  },
]

export default function ClinicalSuite() {
  const [activeTab, setActiveTab] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  // Ledger Draw (scroll): header rise, workspace naik, tab cascade dari kiri,
  // double-rule accent menyapu. Sekali jalan; always-on (keputusan produk Chief).
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    gsap.registerPlugin(ScrollTrigger)
    const q = gsap.utils.selector(section)

    const ctx = gsap.context(() => {
      // Semua entrance pakai fromTo dengan endpoint eksplisit — `gsap.from()`
      // merekam end-state dari DOM saat build; di dev StrictMode (double effect)
      // rekaman itu bisa tercemar inline-hidden milik tween effect pertama,
      // membuat elemen "selesai" dalam keadaan tetap tersembunyi.
      const header = q('[data-suite-header]')[0]
      if (header) {
        gsap.fromTo(
          q('[data-suite-header] > *'),
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
            // refreshPriority: section ini di bawah 3 pin (Ecosystem, BlueprintStory,
            // Services) — tanpa prioritas lebih rendah, start dihitung sebelum
            // pin-spacer di atasnya masuk layout.
            scrollTrigger: {
              trigger: header,
              start: 'top 82%',
              toggleActions: 'play none none none',
              refreshPriority: -3,
            },
          }
        )
      }

      const frame = q('[data-suite-frame]')[0]
      if (frame) {
        const enter = () => ({
          trigger: frame,
          start: 'top 80%',
          toggleActions: 'play none none none',
          refreshPriority: -3,
        })
        gsap.fromTo(
          frame,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: enter() }
        )
        gsap.fromTo(
          q('[data-suite-tab]'),
          { autoAlpha: 0, x: -16 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.5,
            ease: 'power3.out',
            stagger: 0.09,
            delay: 0.35,
            scrollTrigger: enter(),
          }
        )
        gsap.fromTo(
          q('[data-suite-rule]'),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.9, ease: 'power2.inOut', delay: 0.5, scrollTrigger: enter() }
        )
      }
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="clinical-suite"
      className={cn('bg-background border-b border-muted/20', layoutGovernance.sectionY.standard)}
    >
      <div className={cn(layoutGovernance.container.wide, layoutGovernance.sectionX)}>
        {/* === Header Area === */}
        <div className="mb-10" data-suite-header>
          <span className={cn(typeGovernance.eyebrow, 'mb-3 block')}>• RUANG KERJA KLINIS</span>
          <h2 className={cn(typeGovernance.sectionTitle, 'mb-3 max-w-[800px] uppercase')}>
            Ruang kerja klinis yang berjalan otonom
          </h2>
          <p className={cn(typeGovernance.bodySm, 'mb-8 max-w-[680px]')}>
            Sentra AI mengotomatiskan alur kerja klinis, memantau trajektori risiko, dan
            memproyeksikan prognosis pasien secara real-time.
          </p>
        </div>

        {/* === Workspace — border tipis + aksen double-rule ala Sentra === */}
        <div className="rounded-xl border border-muted/15 overflow-hidden" data-suite-frame>
          <div className="grid md:grid-cols-[260px_1fr]">
            {/* Left Sidebar Tabs */}
            <div className="border-r border-muted/15 flex flex-col bg-foreground/[0.015]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    data-suite-tab
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative p-5 text-left flex items-start gap-4 border-b border-muted/15 transition-all duration-300 cursor-pointer hover:bg-muted/5 ${
                      isActive ? 'bg-foreground/[0.03]' : ''
                    }`}
                  >
                    {/* Left Active Accent Line */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
                    )}

                    <Icon
                      size={16}
                      className={`mt-0.5 transition-colors ${
                        isActive ? 'text-accent' : 'text-muted'
                      }`}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-[11px] font-bold tracking-wider font-jakarta transition-colors ${
                          isActive ? 'text-foreground' : 'text-muted'
                        }`}
                      >
                        {tab.label}
                      </span>
                      <span className="text-[9px] text-muted/60 font-jakarta">{tab.sub}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right Content Panel — tinggi mengikuti konten, tidak lagi fixed 820px */}
            <div className="p-4 md:p-6 flex flex-col justify-start bg-foreground/[0.01] w-full min-w-0">
              {activeTab === 0 && <Audrey hideHeader />}
              {activeTab === 1 && <ClinicalTrajectory hideHeader trajectoryOnly />}
              {activeTab === 2 && <ClinicalPrognosis />}
            </div>
          </div>

          {/* Aksen double-rule penutup ala kartu Sentra favorit */}
          <div data-suite-rule className="h-[2px] origin-left bg-accent" />
          <div className="h-px bg-muted/15" />
        </div>
      </div>
    </section>
  )
}
