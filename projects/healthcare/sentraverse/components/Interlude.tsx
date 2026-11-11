// Architected and built by Drferdi.
// Section "napas" statis (tanpa pin/scrub) di antara dua section pinned
// (SentraSim → BlueprintStory) agar ritme scroll tidak melelahkan.
// Sengaja pendek (<50vh) dan tenang: satu kalimat editorial + tanda tangan
// garis-titik-garis. Reveal ringan via IntersectionObserver, hormat
// prefers-reduced-motion.
'use client'

import { useEffect, useRef, useState } from 'react'

import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

export default function Interlude() {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Reduced-motion ditangani via CSS (motion-reduce: di className) — bukan
    // setState sinkron di badan effect (react-hooks/set-state-in-effect).
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      aria-label="Interlude"
      className={cn(layoutGovernance.sectionY.spacious, 'border-b border-muted/20')}
    >
      <div
        className={cn(
          layoutGovernance.container.wide,
          layoutGovernance.sectionX,
          'flex flex-col items-center text-center transition-all duration-700 ease-out',
          shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          // Pengguna reduce-motion: langsung terlihat penuh, tanpa transisi.
          'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none'
        )}
      >
        <p className={typeGovernance.eyebrow}>Dari Simulasi ke Cetak Biru</p>
        <p
          className={cn(
            typeGovernance.editorialDisplay,
            'mt-5 max-w-[720px] text-2xl leading-snug md:text-4xl'
          )}
        >
          Setiap keputusan klinis yang lebih cepat berawal dari arsitektur yang disiplin.
        </p>

        {/* Garis — titik — garis, andalan Sentra */}
        <div className="mt-8 flex w-full max-w-[280px] items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-accent/60" />
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="h-px flex-1 bg-accent/60" />
        </div>
      </div>
    </section>
  )
}
