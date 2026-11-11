'use client'

import { motion } from 'framer-motion'

import type { SimulationBranch } from '@/components/sentrasim/types'

type TrajectoryPanelProps = {
  activeBranch: SimulationBranch
  isOpen: boolean
  isRunning: boolean
  onClose: () => void
}

export function TrajectoryPanel({
  activeBranch,
  isOpen,
  isRunning,
  onClose,
}: TrajectoryPanelProps) {
  return (
    <motion.div
      initial={false}
      animate={
        isOpen ? { height: 'auto', opacity: 1, marginBottom: 24 } : { height: 0, opacity: 0 }
      }
      className="overflow-hidden border-l-2 pl-6"
      style={{
        borderColor: 'var(--sentra-warning)',
        background: 'transparent',
      }}
    >
      <div
        className="mb-6 flex items-start justify-between gap-4 text-[10px] font-bold tracking-widest uppercase"
        style={{ color: 'var(--sentra-warning)' }}
      >
        <span>Trajektori Respons Awal // Oksigenasi dan Demam dalam 2 Jam Pertama</span>
        <button
          type="button"
          onClick={onClose}
          disabled={isRunning}
          className={`hover:text-foreground ${isRunning ? 'cursor-not-allowed opacity-60' : ''}`}
          aria-label="Tutup panel trajektori pasien"
        >
          [X] CLOSE
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-10">
        <div className="flex-1 h-[180px] relative">
          <svg width="100%" height="100%" viewBox="0 0 500 160" preserveAspectRatio="none">
            <line
              x1="0"
              y1="30"
              x2="500"
              y2="30"
              stroke="var(--sdx-line-base)"
              strokeDasharray="4"
            />
            <line
              x1="0"
              y1="80"
              x2="500"
              y2="80"
              stroke="var(--sdx-line-base)"
              strokeDasharray="4"
            />
            <line
              x1="0"
              y1="130"
              x2="500"
              y2="130"
              stroke="var(--sdx-line-base)"
              strokeDasharray="4"
            />
            <polyline
              points={activeBranch.trajectoryOxygenPolyline}
              fill="none"
              stroke="var(--sentra-warning)"
              strokeWidth="2"
              strokeDasharray="1000"
              strokeDashoffset={isOpen ? 0 : 1000}
              className="transition-all duration-[1500ms]"
            />
            <polyline
              points={activeBranch.trajectoryTemperaturePolyline}
              fill="none"
              stroke="var(--sentra-warning-soft)"
              strokeWidth="2"
              strokeDasharray="1000"
              strokeDashoffset={isOpen ? 0 : 1000}
              className="transition-all duration-[1500ms] delay-200"
            />
            <circle
              cx={activeBranch.trajectoryFinalPoint.x}
              cy={activeBranch.trajectoryFinalPoint.y}
              r="4"
              fill="var(--sentra-warning)"
              stroke="var(--sentra-bg)"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="w-full md:w-72 border-l border-dashed border-muted/20 pl-6 flex flex-col gap-4">
          <p
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'var(--sentra-warning)' }}
          >
            Intervensi & Respons
          </p>
          <div className="flex flex-col gap-3 mb-2">
            {activeBranch.trajectoryPoints.map((point) => (
              <div
                key={point.label}
                className="flex items-start justify-between gap-3 text-sm text-foreground"
              >
                <span className="text-muted">{point.label}</span>
                <span className="text-right">{point.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {activeBranch.trajectoryMedications.map((medication) => (
              <div
                key={medication.name}
                className="flex items-center justify-between text-sm text-foreground"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ background: 'var(--sentra-warning)' }}
                  />
                  {medication.name}
                </div>
                <span
                  className="rounded border border-muted/20 px-1 text-[10px]"
                  style={{ color: 'var(--sentra-warning)' }}
                >
                  {medication.dosage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
