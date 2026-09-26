import assert from 'node:assert/strict'
import test from 'node:test'

import { buildEmergencyOverrideFlags, deriveEmergencyOverrideState } from './emergency-override'

const emergencyFlag = {
  severity: 'emergency',
  condition: 'Pulmonary embolism suspect',
  action: 'Stabilize airway and prepare urgent referral',
}

test('keeps normal phase focus when no emergency is present', () => {
  const state = deriveEmergencyOverrideState({
    activeViewPhase: 'row2',
    emergencyAcknowledged: false,
    emergencyFlags: [],
  })

  assert.equal(state.overrideActive, false)
  assert.equal(state.requiresEmergencyAck, false)
  assert.equal(state.forcedActiveViewPhase, 'row2')
  assert.equal(state.phaseClassNames.row1, 'emr-phase is-dimmed')
  assert.equal(state.phaseClassNames.row2, 'emr-phase is-active')
  assert.equal(state.phaseClassNames.row3, 'emr-phase is-dimmed')
  assert.equal(state.requiredWorkflowTab, null)
})

test('forces row1 and ACK gate while emergency flags are unacknowledged', () => {
  const state = deriveEmergencyOverrideState({
    activeViewPhase: 'row3',
    emergencyAcknowledged: false,
    emergencyFlags: [emergencyFlag],
  })

  assert.equal(state.overrideActive, true)
  assert.equal(state.requiresEmergencyAck, true)
  assert.equal(state.canClearEmergencyOverride, false)
  assert.equal(state.forcedActiveViewPhase, 'row1')
  assert.equal(state.requiredWorkflowTab, 'triage')
  assert.equal(state.phaseClassNames.row1, 'emr-phase is-active is-emergency-active')
  assert.equal(state.phaseClassNames.row2, 'emr-phase is-emergency-dimmed')
  assert.equal(state.phaseClassNames.row3, 'emr-phase is-emergency-dimmed')
})

test('allows override to clear after clinician acknowledgement', () => {
  const state = deriveEmergencyOverrideState({
    activeViewPhase: 'row3',
    emergencyAcknowledged: true,
    emergencyFlags: [emergencyFlag],
  })

  assert.equal(state.emergencyActive, true)
  assert.equal(state.overrideActive, false)
  assert.equal(state.requiresEmergencyAck, false)
  assert.equal(state.canClearEmergencyOverride, true)
  assert.equal(state.forcedActiveViewPhase, 'row3')
  assert.equal(state.phaseClassNames.row1, 'emr-phase is-dimmed')
  assert.equal(state.phaseClassNames.row3, 'emr-phase is-active')
})

test('deduplicates emergency labels for the override banner', () => {
  const state = deriveEmergencyOverrideState({
    activeViewPhase: null,
    emergencyAcknowledged: false,
    emergencyFlags: [
      emergencyFlag,
      emergencyFlag,
      {
        severity: 'emergency',
        condition: 'Anaphylaxis',
        action: 'Administer epinephrine per protocol',
      },
    ],
  })

  assert.deepEqual(state.emergencyReasonLabels, ['Pulmonary embolism suspect', 'Anaphylaxis'])
  assert.equal(state.phaseClassNames.row1, 'emr-phase is-active is-emergency-active')
})

test('builds override flags from CDSS, hard-stop screening, and composite critical alerts', () => {
  const flags = buildEmergencyOverrideFlags({
    cdssRedFlags: [emergencyFlag],
    screeningAlerts: [
      {
        severity: 'critical',
        title: 'SpO2 rendah dengan oksigen tambahan',
        recommendations: ['Stabilisasi ABC'],
      },
      {
        severity: 'warning',
        title: 'Pantau ulang',
        recommendations: ['Observasi'],
      },
    ],
    compositeDeterioration: {
      compositeAlerts: [
        {
          severity: 'critical',
          title: 'Composite sepsis shock pathway',
          summary: 'Perfusi memburuk',
          recommendedActions: ['Aktifkan eskalasi sepsis'],
        },
      ],
    },
  })

  assert.deepEqual(
    flags.map((flag) => flag.condition),
    [
      'Pulmonary embolism suspect',
      'SpO2 rendah dengan oksigen tambahan',
      'Composite sepsis shock pathway',
    ]
  )
  assert.equal(flags[1]?.action, 'Stabilisasi ABC')
  assert.equal(flags[2]?.action, 'Aktifkan eskalasi sepsis')
})
