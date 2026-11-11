'use client'

import { motion } from 'framer-motion'

import { getManagementToneStyles, getReasoningToneStyles } from '@/components/sentrasim/helpers'
import type { SeverityKey, SimulationBranch } from '@/components/sentrasim/types'
import { TextScramble } from '@/components/ui/text-scramble'

type AssessmentSectionProps = {
  activeBranch: SimulationBranch
  diagnosisCount: number
  isMobile: boolean
  selectedSeverity: SeverityKey
  showDiagnosis: boolean
  showManagement: boolean
  timelineMarkerClassName: string
  visibleMedicationCount: number
  visibleTherapyCount: number
}

export function AssessmentSection({
  activeBranch,
  diagnosisCount,
  isMobile,
  selectedSeverity,
  showDiagnosis,
  showManagement,
  timelineMarkerClassName,
  visibleMedicationCount,
  visibleTherapyCount,
}: AssessmentSectionProps) {
  if (!showDiagnosis && !showManagement) {
    return null
  }

  return (
    <div className={`flex flex-col gap-6 ${isMobile ? 'relative mt-14' : ''}`}>
      {isMobile ? <div className={timelineMarkerClassName} /> : null}
      {showDiagnosis ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col"
        >
          <TextScramble
            key={`${isMobile ? 'mobile' : 'desktop'}-section-five-${selectedSeverity}`}
            as="div"
            duration={0.65}
            speed={0.022}
            className="text-accent text-sm uppercase tracking-widest mb-6"
          >
            05. Asesmen Klinis & Tatalaksana Awal
          </TextScramble>
          <div className="border border-muted/20 p-5 mb-5">
            <TextScramble
              key={`${isMobile ? 'mobile' : 'desktop'}-route-title-${selectedSeverity}`}
              as="p"
              duration={0.7}
              speed={0.024}
              className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent"
            >
              {activeBranch.routeTitle}
            </TextScramble>
            <TextScramble
              key={`${isMobile ? 'mobile' : 'desktop'}-route-detail-${selectedSeverity}`}
              as="p"
              duration={0.8}
              speed={0.022}
              className="text-foreground text-base leading-relaxed mb-2"
            >
              {activeBranch.routeDetail}
            </TextScramble>
            <p className="text-sm text-muted">{activeBranch.routeReason}</p>
          </div>
          <div className="text-accent text-[10px] font-bold tracking-widest uppercase border-b border-muted/20 pb-3 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            CLINICAL REASONING OUTPUT
          </div>
          <div className="flex flex-col gap-3">
            {activeBranch.clinicalReasoning.map((item, index) => (
              <motion.div
                key={`${isMobile ? 'mobile' : 'desktop'}-${item.title}`}
                initial={{ opacity: 0, x: 10 }}
                animate={index < diagnosisCount ? { opacity: 1, x: 0 } : { opacity: 0 }}
                className={`border p-4 ${getReasoningToneStyles(item.tone)}`}
              >
                <p className="mb-1 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                  {item.type}
                </p>
                <p className="text-sm leading-relaxed text-muted">{item.summary}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {showManagement ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col"
        >
          <div
            className="text-[10px] font-bold tracking-widest uppercase border-b border-muted/20 pb-3 mb-4 flex items-center gap-2"
            style={{ color: 'var(--sentra-warning)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--sentra-warning)' }}
            />
            OBAT & TERAPI
          </div>
          <div className="flex flex-col gap-3 mb-5">
            {activeBranch.medications.map((item, index) => (
              <motion.div
                key={`${isMobile ? 'mobile' : 'desktop'}-${item.name}`}
                initial={{ opacity: 0, x: 10 }}
                animate={index < visibleMedicationCount ? { opacity: 1, x: 0 } : { opacity: 0 }}
                className={`border p-4 ${getManagementToneStyles(item.tone)}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Obat
                  </span>
                </div>
                <p className="text-sm text-foreground mb-1">{item.regimen}</p>
                <p className="text-sm leading-relaxed text-muted">{item.note}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase border-b border-muted/20 pb-3 mb-4 text-muted">
            TERAPI SUPPORTIF & DISPOSITION
          </div>
          <div className="flex flex-col gap-3">
            {activeBranch.therapies.map((step, index) => (
              <motion.div
                key={`${isMobile ? 'mobile' : 'desktop'}-${step.title}`}
                initial={{ opacity: 0, x: 10 }}
                animate={index < visibleTherapyCount ? { opacity: 1, x: 0 } : { opacity: 0 }}
                className={`border p-4 ${getManagementToneStyles(step.tone)}`}
              >
                <p className="mb-2 text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted">{step.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
