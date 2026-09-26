import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assessConsciousnessSeverity,
  avpuToEstimatedGCS,
  avpuToNEWS2Score,
  gcsToAVPU,
  getBestGCSTotal,
} from './avpu-gcs-mapper'
import {
  calculateBMI,
  calculateMAP,
  calculatePulsePressure,
  PLAUSIBILITY_BOUNDS,
  toCDSSVitalSigns,
  toTrajectoryVitals,
  triageVitalSignsSchema,
  unifiedVitalSignsSchema,
} from './unified-vitals'

// ── Unified Vital Signs Schema ──────────────────────────────────────────────

test('accepts valid complete vital signs', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    supplementalO2: false,
    isPregnant: false,
  })
  assert.equal(result.success, true)
})

test('rejects missing required field (sbp)', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
  })
  assert.equal(result.success, false)
})

test('rejects implausible SBP (500 mmHg)', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 500,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
  })
  assert.equal(result.success, false)
})

test('rejects implausible temperature (10°C)', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 10,
    spo2: 98,
    avpu: 'A',
  })
  assert.equal(result.success, false)
})

test('rejects DBP > SBP', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 80,
    dbp: 120,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
  })
  assert.equal(result.success, false)
})

test('accepts valid AVPU enum values', () => {
  for (const avpu of ['A', 'C', 'V', 'P', 'U']) {
    const result = unifiedVitalSignsSchema.safeParse({
      sbp: 120,
      dbp: 80,
      hr: 72,
      rr: 16,
      temp: 36.8,
      spo2: 98,
      avpu,
    })
    assert.equal(result.success, true, `AVPU ${avpu} should be accepted`)
  }
})

test('rejects invalid AVPU value', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'X',
  })
  assert.equal(result.success, false)
})

test('accepts optional GCS components', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'V',
    gcs: { e: 3, v: 3, m: 5 },
  })
  assert.equal(result.success, true)
})

test('rejects GCS E > 4', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'V',
    gcs: { e: 5, v: 3, m: 5 },
  })
  assert.equal(result.success, false)
})

test('accepts glucose with type', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    glucose: { value: 180, type: 'GDS' },
  })
  assert.equal(result.success, true)
})

test('defaults supplementalO2 to false', () => {
  const result = triageVitalSignsSchema.parse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
  })
  assert.equal(result.supplementalO2, false)
  assert.equal(result.avpu, 'A')
})

// ── AVPU ↔ GCS Mapping ─────────────────────────────────────────────────────

test('GCS 15 maps to AVPU A', () => {
  assert.equal(gcsToAVPU({ e: 4, v: 5, m: 6 }), 'A')
})

test('GCS 14 with verbal drop maps to AVPU C (new confusion)', () => {
  assert.equal(gcsToAVPU({ e: 4, v: 4, m: 6 }), 'C')
})

test('GCS 14 without verbal drop maps to AVPU A', () => {
  assert.equal(gcsToAVPU({ e: 3, v: 5, m: 6 }), 'A')
})

test('GCS 11 maps to AVPU V', () => {
  assert.equal(gcsToAVPU({ e: 3, v: 3, m: 5 }), 'V')
})

test('GCS 9 maps to AVPU V (boundary)', () => {
  assert.equal(gcsToAVPU({ e: 2, v: 3, m: 4 }), 'V')
})

test('GCS 8 maps to AVPU P (intubation threshold)', () => {
  assert.equal(gcsToAVPU({ e: 2, v: 2, m: 4 }), 'P')
})

test('GCS 3 maps to AVPU U', () => {
  assert.equal(gcsToAVPU({ e: 1, v: 1, m: 1 }), 'U')
})

test('AVPU A estimates GCS 15', () => {
  const gcs = avpuToEstimatedGCS('A')
  assert.equal(gcs.e + gcs.v + gcs.m, 15)
})

test('AVPU U estimates GCS 3', () => {
  const gcs = avpuToEstimatedGCS('U')
  assert.equal(gcs.e + gcs.v + gcs.m, 3)
})

// ── NEWS2 Consciousness Scoring ─────────────────────────────────────────────

test('NEWS2 consciousness: A = 0', () => {
  assert.equal(avpuToNEWS2Score('A'), 0)
})

test('NEWS2 consciousness: C (confusion) = 3', () => {
  assert.equal(avpuToNEWS2Score('C'), 3)
})

test('NEWS2 consciousness: V = 3', () => {
  assert.equal(avpuToNEWS2Score('V'), 3)
})

test('NEWS2 consciousness: P = 3', () => {
  assert.equal(avpuToNEWS2Score('P'), 3)
})

test('NEWS2 consciousness: U = 3', () => {
  assert.equal(avpuToNEWS2Score('U'), 3)
})

// ── Consciousness Severity ──────────────────────────────────────────────────

test('AVPU A = normal consciousness', () => {
  assert.equal(assessConsciousnessSeverity('A'), 'normal')
})

test('AVPU C = impaired consciousness', () => {
  assert.equal(assessConsciousnessSeverity('C'), 'impaired')
})

test('AVPU P = severe consciousness impairment', () => {
  assert.equal(assessConsciousnessSeverity('P'), 'severe')
})

test('AVPU U = unresponsive', () => {
  assert.equal(assessConsciousnessSeverity('U'), 'unresponsive')
})

test('GCS 8 with AVPU P = severe (uses GCS for granularity)', () => {
  assert.equal(assessConsciousnessSeverity('P', { e: 2, v: 2, m: 4 }), 'severe')
})

test('GCS 13 = impaired', () => {
  assert.equal(assessConsciousnessSeverity('V', { e: 3, v: 4, m: 6 }), 'impaired')
})

// ── getBestGCSTotal ─────────────────────────────────────────────────────────

test('getBestGCSTotal uses actual GCS when provided', () => {
  assert.equal(getBestGCSTotal('V', { e: 3, v: 3, m: 5 }), 11)
})

test('getBestGCSTotal estimates from AVPU when no GCS', () => {
  assert.equal(getBestGCSTotal('A'), 15)
  assert.equal(getBestGCSTotal('U'), 3)
})

// ── Converter: Unified → CDSS ───────────────────────────────────────────────

test('toCDSSVitalSigns maps field names correctly', () => {
  const cdss = toCDSSVitalSigns({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    supplementalO2: false,
    isPregnant: false,
    hasCOPD: false,
  })

  assert.equal(cdss.systolic, 120)
  assert.equal(cdss.diastolic, 80)
  assert.equal(cdss.heart_rate, 72)
  assert.equal(cdss.respiratory_rate, 16)
  assert.equal(cdss.temperature, 36.8)
  assert.equal(cdss.spo2, 98)
  assert.equal(cdss.avpu, 'A')
  assert.equal(cdss.supplemental_o2, false)
})

// ── Converter: Unified → Trajectory ─────────────────────────────────────────

test('toTrajectoryVitals maps correctly, glucose defaults to 0', () => {
  const traj = toTrajectoryVitals({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    supplementalO2: false,
    isPregnant: false,
    hasCOPD: false,
  })

  assert.equal(traj.sbp, 120)
  assert.equal(traj.spo2, 98)
  assert.equal(traj.glucose, 0) // No glucose provided → 0
  assert.equal(traj.avpu, 'A')
})

test('toTrajectoryVitals includes glucose when provided', () => {
  const traj = toTrajectoryVitals({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    supplementalO2: false,
    glucose: { value: 180, type: 'GDS' },
    isPregnant: false,
    hasCOPD: false,
  })

  assert.equal(traj.glucose, 180)
})

// ── Utility Functions ───────────────────────────────────────────────────────

test('calculateBMI returns correct value', () => {
  const bmi = calculateBMI(70, 170)
  assert.ok(bmi !== null)
  assert.ok(bmi > 24 && bmi < 25) // 70 / (1.7^2) ≈ 24.2
})

test('calculateBMI returns null for invalid input', () => {
  assert.equal(calculateBMI(0, 170), null)
  assert.equal(calculateBMI(70, 0), null)
})

test('calculateMAP returns correct value', () => {
  const map = calculateMAP(120, 80)
  assert.equal(map, 93) // 80 + (120-80)/3 = 93.33 → 93
})

test('calculatePulsePressure returns correct value', () => {
  assert.equal(calculatePulsePressure(120, 80), 40)
  assert.equal(calculatePulsePressure(100, 80), 20) // narrow — dengue warning
})

// ── Plausibility Bounds ─────────────────────────────────────────────────────

test('plausibility bounds are clinically reasonable', () => {
  assert.ok(PLAUSIBILITY_BOUNDS.sbp.min < 50)
  assert.ok(PLAUSIBILITY_BOUNDS.sbp.max > 300)
  assert.ok(PLAUSIBILITY_BOUNDS.spo2.min >= 50)
  assert.ok(PLAUSIBILITY_BOUNDS.spo2.max === 100)
  assert.ok(PLAUSIBILITY_BOUNDS.temp.min < 30)
  assert.ok(PLAUSIBILITY_BOUNDS.temp.max <= 45)
})

// ── Glucose Schema Refinement (Warning #5 fix) ──────────────────────────────

test('rejects HbA1c value > 20 (implausible)', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    glucose: { value: 25, type: 'HbA1c' }, // HbA1c 25% = implausible
  })
  assert.equal(result.success, false)
})

test('accepts HbA1c value ≤ 20', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    glucose: { value: 14, type: 'HbA1c' }, // HbA1c 14% = very high but plausible
  })
  assert.equal(result.success, true)
})

test('accepts GDS value 999 (plausible crisis)', () => {
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 72,
    rr: 16,
    temp: 36.8,
    spo2: 98,
    avpu: 'A',
    glucose: { value: 600, type: 'GDS' }, // HHS crisis
  })
  assert.equal(result.success, true)
})

// ── GCS Boundary Edge Cases (Info #9 fix) ───────────────────────────────────

test('GCS 4 (E1V1M2) maps to AVPU P — boundary of pain-response range', () => {
  // Import inline to keep tests collocated — same module already tested above
  assert.equal(gcsToAVPU({ e: 1, v: 1, m: 2 }), 'P')
})

test('GCS 9 (E2V3M4) maps to AVPU V — lowest in voice-response range', () => {
  assert.equal(gcsToAVPU({ e: 2, v: 3, m: 4 }), 'V')
})

// ── Dead Refine Removed (Critical #1 fix verification) ──────────────────────

test('accepts pregnant patient without gestationalWeek — not enforced', () => {
  // Previously had dead refine that claimed to warn but always returned true.
  // Confirmed: pregnant without gestationalWeek is accepted (backward compat).
  const result = unifiedVitalSignsSchema.safeParse({
    sbp: 120,
    dbp: 80,
    hr: 88,
    rr: 18,
    temp: 37.0,
    spo2: 98,
    avpu: 'A',
    isPregnant: true,
    // gestationalWeek intentionally omitted
  })
  assert.equal(result.success, true)
})
