import { delay, STATUS_TEXT } from '@/components/sentrasim/helpers'
import type { SimulationBranch, SimulationState } from '@/components/sentrasim/types'

type PatchSimulation = (patch: Partial<SimulationState>) => void

async function revealAnamnesaText(
  finalAnamnesaText: string,
  patchSimulation: PatchSimulation
): Promise<void> {
  let currentText = ''

  for (const word of finalAnamnesaText.split(' ')) {
    currentText = currentText ? `${currentText} ${word}` : word
    patchSimulation({ anamnesaText: currentText })
    await delay(150)
  }
}

async function revealCount(
  total: number,
  patchCount: (count: number) => void,
  milliseconds: number
): Promise<void> {
  for (let count = 1; count <= total; count += 1) {
    patchCount(count)
    await delay(milliseconds)
  }
}

export async function runSimulationSequence(
  branch: SimulationBranch,
  patchSimulation: PatchSimulation
): Promise<void> {
  patchSimulation({
    status: STATUS_TEXT.synthesizing,
    headerTone: 'accent',
    anamnesaText: '',
  })

  await revealAnamnesaText(branch.finalAnamnesaText, patchSimulation)
  await delay(500)

  await revealCount(
    branch.anamnesaTags.length,
    (count) => {
      patchSimulation({ anamnesaTagCount: count })
    },
    300
  )

  patchSimulation({
    status: STATUS_TEXT.emr,
    historyPhase: 'loading',
  })
  await delay(1500)

  patchSimulation({
    historyPhase: 'ready',
    status: STATUS_TEXT.synced,
  })
  await delay(800)

  patchSimulation({ showVitalsAnomaly: true })
  await delay(200)

  await revealCount(
    branch.anomalyTags.length,
    (count) => {
      patchSimulation({ vitalsTagCount: count })
    },
    200
  )
  await delay(500)

  patchSimulation({
    status: STATUS_TEXT.lab,
    labOpen: true,
  })
  await delay(700)

  await revealCount(
    branch.labRecommendations.length,
    (count) => {
      patchSimulation({ selectedLabCount: count })
    },
    360
  )
  await delay(420)

  patchSimulation({
    status: STATUS_TEXT.evidence,
    showLabResults: true,
  })
  await delay(420)

  await revealCount(
    branch.labResults.length,
    (count) => {
      patchSimulation({ labResultCount: count })
    },
    320
  )
  await delay(420)

  patchSimulation({
    status: STATUS_TEXT.trajectory,
    trajectoryOpen: true,
  })
  await delay(800)

  patchSimulation({ showTrajectoryInsight: true })
  await delay(700)

  patchSimulation({
    status: STATUS_TEXT.diagnosis,
    showDiagnosis: true,
  })
  await delay(420)

  await revealCount(
    branch.clinicalReasoning.length,
    (count) => {
      patchSimulation({ diagnosisCount: count })
    },
    320
  )
  await delay(500)

  patchSimulation({
    status: STATUS_TEXT.management,
    showManagement: true,
  })
  await delay(420)

  await revealCount(
    branch.medications.length + branch.therapies.length,
    (count) => {
      patchSimulation({ managementCount: count })
    },
    320
  )
  await delay(800)

  patchSimulation({
    status: STATUS_TEXT.complete,
    isComplete: true,
  })
}
