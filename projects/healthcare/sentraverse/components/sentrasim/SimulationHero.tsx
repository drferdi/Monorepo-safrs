'use client'

import type { SeverityKey, SimulationBranch } from '@/components/sentrasim/types'
import { TextScramble } from '@/components/ui/text-scramble'

type SimulationHeroProps = {
  activeBranch: SimulationBranch
  branches: Readonly<Record<SeverityKey, SimulationBranch>>
  isComplete: boolean
  isRunning: boolean
  onRunSimulation: () => void
  onSelectSeverity: (severity: SeverityKey) => void
  selectedSeverity: SeverityKey
}

export function SimulationHero({
  activeBranch,
  branches,
  isComplete,
  isRunning,
  onRunSimulation,
  onSelectSeverity,
  selectedSeverity,
}: SimulationHeroProps) {
  return (
    <div className="mx-auto mb-10 max-w-[1440px] text-center md:mb-12">
      <p className="sentra-sim-kicker mb-4 text-accent uppercase">SIMULASI KLINIS LANGSUNG</p>
      <TextScramble
        key={`hero-title-${selectedSeverity}`}
        as="h2"
        duration={0.9}
        speed={0.03}
        className="sentra-sim-title mb-6 font-jakarta font-bold text-foreground"
      >
        Dari Data Pasien ke Keputusan Klinis Terstruktur
      </TextScramble>
      <TextScramble
        key={`hero-copy-${selectedSeverity}`}
        as="p"
        duration={0.9}
        speed={0.025}
        className="sentra-sim-body mx-auto mb-4 max-w-[720px] text-muted"
      >
        Pilih tingkat keparahan kasus untuk melihat bagaimana Sentra Assist memproses tanda vital,
        gejala, pemeriksaan penunjang, probabilitas diagnosis, terapi, dan disposisi secara
        real-time.
      </TextScramble>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        {(Object.entries(branches) as [SeverityKey, SimulationBranch][]).map(([key, branch]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectSeverity(key)}
            disabled={isRunning}
            className={`rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
              key === selectedSeverity
                ? 'border-accent bg-accent text-background'
                : 'border-muted/20 text-muted hover:border-accent hover:text-accent'
            } ${isRunning ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {branch.label}
          </button>
        ))}
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        {activeBranch.caseMetadata.map((item) => (
          <span
            key={item}
            className="rounded-full border border-muted/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted"
          >
            {item}
          </span>
        ))}
      </div>
      <TextScramble
        key={`headline-${selectedSeverity}`}
        as="p"
        duration={0.75}
        speed={0.024}
        className="sentra-sim-kicker mb-8 whitespace-pre-line text-muted uppercase tracking-[0.28em]"
      >
        {activeBranch.headline}
      </TextScramble>
      <button
        type="button"
        onClick={onRunSimulation}
        disabled={isRunning || isComplete}
        className={`group relative inline-flex items-center gap-3 rounded-full border px-10 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-500 ${
          isComplete
            ? 'bg-green-600/20 text-green-400 border-green-500/30 cursor-default'
            : isRunning
              ? 'bg-accent/20 text-accent border-accent/30 cursor-wait'
              : 'bg-accent text-background border-accent hover:shadow-[var(--sentra-shadow-accent-strong)] hover:-translate-y-0.5 hover:scale-[1.02]'
        }`}
      >
        {!isRunning && !isComplete ? (
          <span
            className="absolute inset-0 rounded-full animate-ping bg-accent/20"
            style={{ animationDuration: '2s' }}
          />
        ) : null}

        {isRunning ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}

        {isComplete ? (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}

        {!isRunning && !isComplete ? (
          <svg className="relative w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        ) : null}

        <span className="relative">
          {isComplete
            ? 'SIMULASI SELESAI'
            : isRunning
              ? 'MEMPROSES KASUS...'
              : `JALANKAN SIMULASI ${activeBranch.label}`}
        </span>
      </button>
    </div>
  )
}
