// Architected and built by Drferdi.
// [APPROVED]
'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { CodeTerminal } from '@/components/sentrasim/CodeTerminal'
import { SIMULATION_BRANCHES } from '@/components/sentrasim/data'
import {
  STATUS_TEXT,
  createInitialSimulationState,
  getDesktopLayoutSnapshot,
  getHeaderColor,
  subscribeDesktopLayout,
} from '@/components/sentrasim/helpers'
import { runSimulationSequence } from '@/components/sentrasim/sequence'
import { SimulationHero } from '@/components/sentrasim/SimulationHero'
import { TimelineColumn } from '@/components/sentrasim/TimelineColumn'
import type { SeverityKey, SimulationState } from '@/components/sentrasim/types'
import { layoutGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

const TIMELINE_MARKER_CLASS_NAME =
  'absolute -left-[68.5px] top-2 h-[7px] w-[7px] rounded-full border border-muted bg-[var(--sentra-canvas)]'

export default function SentraSim() {
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityKey>('sedang')
  const activeBranch = SIMULATION_BRANCHES[selectedSeverity]
  const [simulation, setSimulation] = useState<SimulationState>(() =>
    createInitialSimulationState(SIMULATION_BRANCHES.sedang)
  )
  const isDesktopLayout = useSyncExternalStore(
    subscribeDesktopLayout,
    getDesktopLayoutSnapshot,
    () => false
  )
  const isMountedRef = useRef(true)
  const isRunningRef = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Auto-scroll the iPad internal container to follow the active simulation steps
  useEffect(() => {
    if (!simulation.isRunning) {
      return
    }

    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const scrollToStep = (stepSelector: string) => {
      const element = container.querySelector(stepSelector) as HTMLElement
      if (element) {
        const containerRect = container.getBoundingClientRect()
        const elemRect = element.getBoundingClientRect()
        const relativeTop = elemRect.top - containerRect.top + container.scrollTop
        container.scrollTo({
          top: Math.max(0, relativeTop - 24), // Keep a 24px buffer at the top
          behavior: 'smooth',
        })
      }
    }

    switch (simulation.status) {
      case STATUS_TEXT.synthesizing:
        scrollToStep('[data-sim-step="1"]')
        break
      case STATUS_TEXT.emr:
      case STATUS_TEXT.synced:
        scrollToStep('[data-sim-step="2"]')
        break
      case STATUS_TEXT.lab:
      case STATUS_TEXT.evidence:
        scrollToStep('[data-sim-step="3"]')
        break
      case STATUS_TEXT.trajectory:
        scrollToStep('[data-sim-step="4"]')
        break
      case STATUS_TEXT.diagnosis:
      case STATUS_TEXT.management:
      case STATUS_TEXT.complete:
        scrollToStep('[data-sim-step="assessment"]')
        break
      default:
        break
    }
  }, [simulation.status, simulation.isRunning])

  const patchSimulation = (patch: Partial<SimulationState>): void => {
    if (!isMountedRef.current) {
      return
    }

    setSimulation((previous) => ({ ...previous, ...patch }))
  }

  const handleSelectSeverity = (nextSeverity: SeverityKey): void => {
    if (isRunningRef.current || nextSeverity === selectedSeverity) {
      return
    }

    setSelectedSeverity(nextSeverity)
    setSimulation(createInitialSimulationState(SIMULATION_BRANCHES[nextSeverity]))
  }

  const runSimulation = async (): Promise<void> => {
    if (isRunningRef.current || simulation.isComplete) {
      return
    }

    // Smooth scroll viewport to simulation area with dynamic offset
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    isRunningRef.current = true
    patchSimulation({ isRunning: true })

    try {
      await runSimulationSequence(activeBranch, patchSimulation)
    } finally {
      isRunningRef.current = false
      patchSimulation({ isRunning: false })
    }
  }

  const visibleMedicationCount = Math.min(
    simulation.managementCount,
    activeBranch.medications.length
  )
  const visibleTherapyCount = Math.max(
    simulation.managementCount - activeBranch.medications.length,
    0
  )

  return (
    <section
      ref={sectionRef}
      className={cn(
        'bg-[radial-gradient(circle_at_center,_#e8e8e8_0%,_#d9d9d9_100%)] border-t border-neutral-300 overflow-hidden scroll-mt-24',
        layoutGovernance.sectionY.compact
      )}
    >
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-start gap-8 px-4 md:px-8 lg:grid-cols-[1fr_320px] lg:gap-12 xl:grid-cols-[1fr_360px]">
        {/* iPad Device Frame (Double-Bezel Hardware Architecture) */}
        <div className="relative mx-auto rounded-[2.5rem] bg-neutral-900 p-3 md:p-4 shadow-[0_48px_96px_-24px_rgba(0,33,71,0.18),_0_16px_48px_-12px_rgba(0,33,71,0.08)] border border-neutral-800 ring-1 ring-white/10 dark:ring-white/5 w-full max-w-[1024px] transition-all duration-300">
          {/* Top bezel camera / speaker notch area */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-950 border border-neutral-800" />
            <div className="w-8 h-1 rounded-full bg-neutral-950" />
          </div>

          {/* iPad Inner Screen Core (Hosts the Simulation) */}
          <div
            data-sentra-sim
            data-theme="dark"
            className="sentra-sim-density-compact relative flex flex-col overflow-hidden rounded-[1.8rem] border border-neutral-950 bg-[#1e1e1e] text-foreground shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
          >
            {/* iPad Application Status/Header Bar with "Sentra Remote" */}
            <div className="flex items-center justify-between px-6 py-4 bg-neutral-950/80 border-b border-white/5 backdrop-blur-md sticky top-0 z-20 select-none">
              {/* Left: App Brand & Status */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-neutral-200">
                  SENTRA TABLET
                </span>
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  LIVE
                </span>
              </div>

              {/* Center: Device Mockup Time/System Info */}
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                <span>7 JULI 2026</span>
                <span>•</span>
                <span className="text-[var(--sentra-audrey-teal)]">Clinical Node Active</span>
              </div>

              {/* Right: Mock status icons */}
              <div className="flex items-center gap-3 text-neutral-400 text-xs">
                <div className="flex gap-1.5 items-center">
                  <div className="w-5 h-2.5 border border-neutral-500 rounded-sm p-0.5 flex gap-0.5">
                    <div className="w-full h-full bg-neutral-400 rounded-2xs" />
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400">100%</span>
                </div>
              </div>
            </div>

            {/* Inner Screen Content - The actual Simulation Scroll Area */}
            <div
              ref={scrollContainerRef}
              className="p-6 md:p-10 lg:p-12 overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin max-h-[48vh]"
            >
              <SimulationHero
                activeBranch={activeBranch}
                branches={SIMULATION_BRANCHES}
                isComplete={simulation.isComplete}
                isRunning={simulation.isRunning}
                onRunSimulation={runSimulation}
                onSelectSeverity={handleSelectSeverity}
                selectedSeverity={selectedSeverity}
              />

              <div className="w-full relative pt-8 border-t border-white/5">
                <div
                  className="absolute -top-4 left-0 text-xs font-medium uppercase tracking-widest transition-colors duration-500"
                  style={{ color: getHeaderColor(simulation.headerTone) }}
                >
                  {simulation.status}
                </div>

                <TimelineColumn
                  activeBranch={activeBranch}
                  isDesktopLayout={isDesktopLayout}
                  onPatchSimulation={patchSimulation}
                  selectedSeverity={selectedSeverity}
                  simulation={simulation}
                  timelineMarkerClassName={TIMELINE_MARKER_CLASS_NAME}
                  visibleMedicationCount={visibleMedicationCount}
                  visibleTherapyCount={visibleTherapyCount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: separate slim device bezel hosting the live "safe code" terminal */}
        <div className="relative mx-auto w-full rounded-[1.5rem] border border-neutral-800 bg-neutral-900 p-2 shadow-[0_32px_64px_-16px_rgba(0,33,71,0.15)] ring-1 ring-white/10 transition-all duration-300">
          <CodeTerminal key={selectedSeverity} simulation={simulation} />
        </div>
      </div>
    </section>
  )
}
