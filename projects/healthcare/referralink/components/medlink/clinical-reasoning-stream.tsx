import { useEffect, useState } from 'react'

import type { ICD10Result } from '../../types'

import {
  CLINICAL_REASONING_STAGES,
  buildClinicalReasoningStages,
  type ClinicalReasoningPhase,
  type ClinicalReasoningStageStatus,
  getClinicalReasoningStageStatus,
  getNextClinicalReasoningStage,
  getVisibleResultStageCount,
} from './clinical-reasoning-stream-state'

const NEUTRAL_STAGE_INTERVAL_MS = 600
const RESULT_STAGE_INTERVAL_MS = 420

interface ClinicalReasoningStreamProps {
  phase: ClinicalReasoningPhase
  result: ICD10Result | null
}

function statusLabel(status: ClinicalReasoningStageStatus) {
  if (status === 'completed') return 'Selesai'
  if (status === 'active') return 'Berlangsung'
  if (status === 'interrupted') return 'Terhenti'
  return 'Menunggu'
}

export function ClinicalReasoningStream({ phase, result }: ClinicalReasoningStreamProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleResultStages, setVisibleResultStages] = useState(0)
  const stages = buildClinicalReasoningStages(phase, result)
  const neutralStages = stages.filter((stage) => stage.kind === 'neutral')
  const resultStages = stages.filter((stage) => stage.kind === 'result')
  const summaryStage = stages.find((stage) => stage.kind === 'summary')
  const revealStageCount = resultStages.length + (summaryStage ? 1 : 0)
  const visibleStages = [...neutralStages, ...resultStages.slice(0, visibleResultStages)]
  const isSummaryVisible = Boolean(summaryStage && visibleResultStages > resultStages.length)

  useEffect(() => {
    if (phase === 'loading') {
      setActiveIndex(0)
      setVisibleResultStages(0)
      return
    }

    if (phase === 'idle') {
      setActiveIndex(0)
      setVisibleResultStages(0)
      return
    }

    if (phase === 'success') {
      setActiveIndex(CLINICAL_REASONING_STAGES.length - 1)
      setVisibleResultStages(0)
      return
    }

    setVisibleResultStages(0)
  }, [phase, result])

  useEffect(() => {
    if (phase !== 'loading' || activeIndex === CLINICAL_REASONING_STAGES.length - 1) {
      return
    }

    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => getNextClinicalReasoningStage(current))
    }, NEUTRAL_STAGE_INTERVAL_MS)

    return () => window.clearTimeout(timeout)
  }, [activeIndex, phase])

  useEffect(() => {
    if (phase !== 'success' || visibleResultStages >= revealStageCount) return

    const timeout = window.setTimeout(() => {
      setVisibleResultStages((current) => getVisibleResultStageCount(current, revealStageCount))
    }, RESULT_STAGE_INTERVAL_MS)

    return () => window.clearTimeout(timeout)
  }, [phase, revealStageCount, visibleResultStages])

  const liveLabel =
    phase === 'success'
      ? visibleResultStages === revealStageCount
        ? 'Analisis klinis selesai'
        : 'Hasil klinis tervalidasi sedang disiapkan'
      : phase === 'loading'
        ? `Permintaan diagnosis sedang diproses: ${neutralStages[activeIndex]?.title}`
        : phase === 'error'
          ? 'Analisis klinis terhenti'
          : 'Siap dianalisis'

  return (
    <div className={`medlink-reasoning-stream medlink-reasoning-stream--${phase}`}>
      <span className="cds--visually-hidden" role="status" aria-live="polite">
        {liveLabel}
      </span>
      <p className="medlink-reasoning-stream__eyebrow">Alur analisis klinis</p>
      <ol
        className="medlink-reasoning-stream__stages"
        aria-label="Tahapan analisis klinis"
        tabIndex={0}
      >
        {visibleStages.map((stage, index) => {
          const resultIndex = index - neutralStages.length
          const resultRevealComplete = visibleResultStages === resultStages.length
          const stageStatus: ClinicalReasoningStageStatus =
            stage.kind === 'neutral'
              ? getClinicalReasoningStageStatus(index, activeIndex, phase)
              : resultRevealComplete || resultIndex < visibleResultStages - 1
                ? 'completed'
                : 'active'
          const showDescription =
            stage.kind === 'result' || stageStatus === 'active' || stageStatus === 'interrupted'

          return (
            <li
              key={stage.id}
              className={`medlink-reasoning-stage medlink-reasoning-stage--${stage.kind} medlink-reasoning-stage--${stageStatus}`}
            >
              <span className="medlink-reasoning-stage__rail" aria-hidden="true">
                <span className="medlink-reasoning-stage__node">
                  {stageStatus === 'completed' ? '✓' : stageStatus === 'interrupted' ? '!' : ''}
                </span>
              </span>
              <span className="medlink-reasoning-stage__content">
                <strong>{stage.title}</strong>
                {showDescription ? <span>{stage.description}</span> : null}
              </span>
              <span className="cds--visually-hidden">{statusLabel(stageStatus)}</span>
            </li>
          )
        })}
      </ol>
      {isSummaryVisible && summaryStage ? (
        <section
          className="medlink-reasoning-summary"
          aria-labelledby="medlink-reasoning-summary-title"
        >
          <h3 id="medlink-reasoning-summary-title">{summaryStage.title}</h3>
          <p>{summaryStage.description}</p>
        </section>
      ) : null}
    </div>
  )
}
