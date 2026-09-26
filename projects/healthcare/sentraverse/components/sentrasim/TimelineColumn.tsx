'use client'

import { motion } from 'framer-motion'

import { AssessmentSection } from '@/components/sentrasim/AssessmentSection'
import { TrajectoryPanel } from '@/components/sentrasim/TrajectoryPanel'
import type { SeverityKey, SimulationBranch, SimulationState } from '@/components/sentrasim/types'

type TimelineColumnProps = {
  activeBranch: SimulationBranch
  isDesktopLayout: boolean
  onPatchSimulation: (patch: Partial<SimulationState>) => void
  selectedSeverity: SeverityKey
  simulation: SimulationState
  timelineMarkerClassName: string
  visibleMedicationCount: number
  visibleTherapyCount: number
}

export function TimelineColumn({
  activeBranch,
  isDesktopLayout,
  onPatchSimulation,
  selectedSeverity,
  simulation,
  timelineMarkerClassName,
  visibleMedicationCount,
  visibleTherapyCount,
}: TimelineColumnProps) {
  return (
    <div className="sentra-sim-stack relative flex flex-col border-l border-muted/20 pl-16">
      <div className="relative" data-sim-step="1">
        <div className={timelineMarkerClassName} />
        <h3 className="sentra-sim-kicker mb-6 text-accent uppercase">
          01. Keluhan Utama & Anamnesis Terarah
        </h3>
        <div className="sentra-sim-card relative overflow-hidden border border-muted/10 bg-muted/5">
          <div
            className="absolute inset-0 z-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--sdx-line-base) 1px, transparent 1px), linear-gradient(to bottom, var(--sdx-line-base) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10">
            <span className="text-accent text-xs uppercase tracking-widest mb-2 block">
              Keluhan Utama
            </span>
            <p className="sentra-sim-body mb-6 text-muted">
              Pasien datang dengan keluhan{' '}
              <span className="text-foreground border-b border-dashed border-muted inline-block">
                {simulation.anamnesaText}
              </span>{' '}
              dengan pola yang mengarahkan ke {activeBranch.severityLabel.toLowerCase()}.
            </p>
            <span className="text-accent text-xs uppercase tracking-widest mb-3 block">
              Anamnesis Terarah
            </span>
            <div className="grid gap-3 md:grid-cols-3">
              {activeBranch.directedHistory.map((item) => (
                <div
                  key={item}
                  className="border border-muted/10 bg-background/50 p-4 text-sm leading-relaxed text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative" data-sim-step="2">
        <div className={timelineMarkerClassName} />
        <h3 className="sentra-sim-kicker mb-6 text-accent uppercase">
          02. Riwayat Penyakit, Alergi, dan Red Flag
        </h3>
        {simulation.historyPhase === 'loading' ? (
          <p className="text-accent text-sm animate-pulse mb-4 uppercase tracking-widest">
            [SYSTEM: RETRIEVING EMR, ALLERGY, AND PREVIOUS VISITS...]
          </p>
        ) : null}

        {simulation.historyPhase === 'ready' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-[1.6fr_1fr] gap-8"
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-muted text-xs uppercase font-medium mb-1">
                  Riwayat Penyakit Sekarang
                </p>
                <p className="sentra-sim-body text-foreground">{activeBranch.historyNow}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase font-medium mb-1">
                  Riwayat Penyakit Dahulu
                </p>
                <p className="sentra-sim-body text-foreground">{activeBranch.pastHistory}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-muted/20 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-400">
                    Red Flag Positif
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {activeBranch.positiveFlags}
                  </p>
                </div>
                <div className="border border-muted/20 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                    Red Flag Negatif
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {activeBranch.negativeFlags}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-l border-muted/20 pl-6 flex flex-col gap-3">
              <p className="text-muted text-xs uppercase font-medium mb-2">Alergi & Obat Rutin</p>
              {activeBranch.allergies.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between text-sm border-b border-dashed border-muted/20 pb-1"
                >
                  <span>{row.label}</span>
                  <span className={row.alert ? 'text-red-500 font-medium' : 'text-foreground'}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>

      <div className="relative" data-sim-step="3">
        <div className={timelineMarkerClassName} />
        <h3 className="sentra-sim-kicker mb-6 text-accent uppercase">
          03. Tanda Vital, Lab, dan Bukti Objektif
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {activeBranch.vitals.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="text-muted text-xs uppercase tracking-widest">{item.label}</span>
              <span
                className={`text-2xl font-bold ${item.critical ? 'text-red-500' : 'text-foreground'}`}
                style={item.critical ? { textShadow: '0 0 8px rgba(239, 68, 68, 0.4)' } : undefined}
              >
                {item.value}
                <span className="text-sm font-normal text-muted ml-1">{item.unit}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-muted/20">
          <button
            type="button"
            aria-controls="sentra-sim-lab-panel"
            aria-expanded={simulation.labOpen}
            onClick={() => onPatchSimulation({ labOpen: !simulation.labOpen })}
            disabled={simulation.isRunning}
            className={`flex items-center gap-2 italic font-medium transition-colors ${
              simulation.labOpen ? 'text-accent' : 'text-muted hover:text-accent'
            } ${simulation.isRunning ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            *{' '}
            {simulation.labOpen
              ? 'Pemeriksaan terpilih karena dicurigai pneumonia'
              : 'Buka pemeriksaan penunjang'}
          </button>
          <motion.div
            id="sentra-sim-lab-panel"
            initial={false}
            animate={
              simulation.labOpen
                ? { height: 'auto', opacity: 1, marginTop: 16 }
                : { height: 0, opacity: 0 }
            }
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3">
              {activeBranch.labRecommendations.map((item, index) => {
                const isSelected = index < simulation.selectedLabCount

                return (
                  <div
                    key={item.name}
                    className={`flex justify-between items-center pb-2 border-b border-muted/5 transition-colors ${
                      isSelected ? 'text-foreground' : 'text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isSelected ? 'text-accent' : ''}>
                        [{isSelected ? 'x' : ' '}]
                      </span>
                      <span className="text-lg">{item.name}</span>
                    </div>
                    {isSelected ? (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] font-bold tracking-widest uppercase"
                        style={{ color: 'var(--sentra-warning)' }}
                      >
                        {item.status}
                      </motion.span>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {simulation.showLabResults ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 grid gap-4 md:grid-cols-3"
              >
                {activeBranch.labResults.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      index < simulation.labResultCount ? { opacity: 1, y: 0 } : { opacity: 0 }
                    }
                    className={`border p-4 ${item.alert ? 'border-red-500/20' : 'border-muted/20'}`}
                  >
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                      {item.name}
                    </p>
                    <p className="mb-2 text-lg font-semibold text-foreground">{item.value}</p>
                    <p className="text-sm leading-relaxed text-muted">{item.interpretation}</p>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </motion.div>
        </div>
      </div>

      <TrajectoryPanel
        activeBranch={activeBranch}
        isOpen={simulation.trajectoryOpen}
        isRunning={simulation.isRunning}
        onClose={() => onPatchSimulation({ trajectoryOpen: false })}
      />

      <div className="relative" data-sim-step="4">
        <div className={timelineMarkerClassName} />
        <h3 className="sentra-sim-kicker mb-6 text-accent uppercase">
          04. Pemeriksaan Fisik Head-to-Toe
        </h3>
        <div className="flex flex-col gap-5">
          {activeBranch.physicalExamRows.map((row) => (
            <div
              key={row.organ}
              className="grid md:grid-cols-[160px_1fr] gap-6 border-b border-dashed border-muted/10 pb-3 items-baseline"
            >
              <span className="text-muted text-xs uppercase font-medium">{row.organ}</span>
              <span
                className={`text-lg ${row.alert ? 'text-red-500 font-medium' : 'text-foreground'}`}
              >
                {row.result}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!isDesktopLayout ? (
        <AssessmentSection
          activeBranch={activeBranch}
          diagnosisCount={simulation.diagnosisCount}
          isMobile={true}
          selectedSeverity={selectedSeverity}
          showDiagnosis={simulation.showDiagnosis}
          showManagement={simulation.showManagement}
          timelineMarkerClassName={timelineMarkerClassName}
          visibleMedicationCount={visibleMedicationCount}
          visibleTherapyCount={visibleTherapyCount}
        />
      ) : null}

      <div data-sim-step="assessment" className="mt-8">
        <input
          type="text"
          readOnly
          aria-label="Composer asesmen pratinjau"
          placeholder="Ketik asesmen tambahan atau ketik '/' untuk perintah..."
          className="w-full bg-transparent border-b border-muted/20 pb-4 text-foreground outline-none focus:border-accent transition-colors placeholder:italic placeholder:text-muted/30"
        />
      </div>
    </div>
  )
}
