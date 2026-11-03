// Architected and built by the one and only Drferdi.

import { Activity, CalendarClock, ClipboardCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type StoryStep = {
  id: string
  label: string
  icon: typeof CalendarClock
  targetId: string
}

const StoryScroll = () => {
  const steps = useMemo<StoryStep[]>(
    () => [
      {
        id: 'reservasi',
        label: 'Reservasi',
        icon: CalendarClock,
        targetId: 'hero',
      },
      {
        id: 'pemeriksaan',
        label: 'Pemeriksaan',
        icon: Activity,
        targetId: 'services',
      },
      {
        id: 'tindak-lanjut',
        label: 'Tindak Lanjut',
        icon: ClipboardCheck,
        targetId: 'reservation',
      },
    ],
    []
  )

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const targets = steps
      .map(step => document.getElementById(step.targetId))
      .filter((target): target is HTMLElement => target instanceof HTMLElement)

    if (targets.length !== steps.length) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        const visibleEntries = entries
          .filter(entry => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)

        if (visibleEntries.length === 0) {
          return
        }

        const nextIndex = steps.findIndex(
          step => step.targetId === (visibleEntries[0].target as HTMLElement).id
        )

        if (nextIndex >= 0) {
          setActiveIndex(nextIndex)
        }
      },
      {
        threshold: [0.25, 0.45, 0.7],
        rootMargin: '-20% 0px -45% 0px',
      }
    )

    targets.forEach(target => observer.observe(target))

    return () => observer.disconnect()
  }, [steps])

  const progress = steps.length > 1 ? activeIndex / (steps.length - 1) : 0

  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <div className="w-[148px] rounded-2xl p-3 neo-card opacity-90">
        <div className="mb-2 flex items-center gap-1.5 text-[#8B7D6F]">
          <Sparkles className="h-3 w-3 text-[#C9A87C]" />
          <p className="text-[9px] uppercase tracking-[0.16em]">Story</p>
        </div>

        <div
          className="relative pl-3"
          role="progressbar"
          aria-label="Progress alur layanan"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="absolute bottom-1 left-[4px] top-1 w-px bg-[#E9DDD0]" />
          <div
            className="absolute left-[4px] top-1 w-px rounded-full bg-gradient-to-b from-[#C9A87C] to-[#A98352] transition-all duration-300"
            style={{ height: `${progress * 100}%` }}
          />

          <div className="space-y-2.5">
            {steps.map((step, index) => {
              const isActive = index <= activeIndex
              const Icon = step.icon

              return (
                <div key={step.id} className="relative">
                  <span
                    className={`absolute -left-[9px] top-1 h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                      isActive
                        ? 'border-[#C9A87C] bg-[#C9A87C] shadow-[0_0_0_2px_rgba(201,168,124,0.12)]'
                        : 'border-[#D7C8B5] bg-white'
                    }`}
                  />
                  <div
                    className={`rounded-lg px-2 py-1 transition-all duration-300 ${
                      isActive ? 'neo-control' : 'bg-white/35'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={`h-3 w-3 ${isActive ? 'text-[#A98352]' : 'text-[#B8A48D]'}`}
                      />
                      <p
                        className={`text-[10px] font-medium ${isActive ? 'text-[#2D2420]' : 'text-[#8B7D6F]'}`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StoryScroll
