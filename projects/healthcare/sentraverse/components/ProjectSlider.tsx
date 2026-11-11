// Architected and built by Drferdi.

import { layoutGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

export default function ProjectSlider() {
  return (
    <section
      className={cn(
        'relative left-1/2 w-screen -translate-x-1/2 overflow-hidden',
        layoutGovernance.sectionY.compact
      )}
    >
      <div className="absolute inset-x-0 top-1/2 h-[70%] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(235,89,57,0.10),_rgba(0,33,71,0.045)_42%,_transparent_72%)]" />
      <div className="relative w-full">
        <div className="relative min-h-[36dvh] overflow-hidden border-y border-muted/15 bg-background shadow-[0_32px_96px_-56px_rgba(0,33,71,0.45)] sm:min-h-[42dvh] lg:min-h-[48dvh]">
          <video
            className="absolute inset-0 h-full w-full scale-[1.015] object-cover brightness-[0.92] contrast-[0.92] saturate-[0.94]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Sentra clinical intelligence product preview"
          >
            <source src="/vid-korea-er-optimized.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 backdrop-blur-[0.35px]" />
          <div className="pointer-events-none absolute inset-0 bg-[rgba(0,33,71,0.16)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_44%,_rgba(0,33,71,0.18)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_rgba(0,33,71,0.24)_0%,_transparent_18%,_transparent_82%,_rgba(0,33,71,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,_rgba(255,255,255,0.22)_0%,_rgba(255,255,255,0.06)_24%,_transparent_46%,_rgba(235,89,57,0.06)_100%)] mix-blend-soft-light" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.20)_0%,_transparent_24%,_transparent_70%,_rgba(0,33,71,0.18)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/45 via-background/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/65 via-background/16 to-transparent" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </section>
  )
}
