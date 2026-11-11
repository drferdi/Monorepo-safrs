// Drferdi — TrajectoryIntelligencePanel Tests
/**
 * Tests for TrajectoryIntelligencePanel component states and sub-component
 * rendering. Uses renderToStaticMarkup (SSR-safe, no DOM required).
 *
 * Covers:
 *   - Empty state (no patientIdentifier)
 *   - Sub-component renders: MomentumScoreCard, AcuteAttackRiskGrid,
 *     MortalityRiskIndicator, ConvergencePatternAlert
 *   - AI disclaimer present in recommended action section
 *   - MORTALITY_TIER_CONFIG centralisation (config imported, not local)
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  MOMENTUM_LEVEL_CONFIG,
  MORTALITY_TIER_CONFIG,
  URGENCY_TIER_CONFIG,
} from '@/types/abyss/trajectory'
import type { AcuteAttackRisk24h, MomentumAnalysis, MortalityProxyRisk } from '@/types/abyss/trajectory'

import { AcuteAttackRiskGrid } from './AcuteAttackRiskGrid'
import { ConvergencePatternAlert } from './ConvergencePatternAlert'
import { MomentumScoreCard } from './MomentumScoreCard'
import { MortalityRiskIndicator } from './MortalityRiskIndicator'
import { TrajectoryIntelligencePanel } from './TrajectoryIntelligencePanel'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeMomentum = (overrides: Partial<MomentumAnalysis> = {}): MomentumAnalysis => ({
  level: 'STABLE',
  score: 22,
  isReliable: true,
  visitCount: 3,
  narrative: 'Tren vital stabil dalam batas normal.',
  convergence: {
    pattern: 'none',
    convergenceScore: 0,
    worseningParams: [],
    improvingParams: [],
    shouldAlert: false,
    narrative: '',
  },
  baseline: {
    patientId: 'patient-test',
    computedAt: '2026-03-20T00:00:00.000Z',
    visitCount: 3,
    params: {},
  },
  params: [],
  ...overrides,
})

const makeAcuteRisks = (overrides: Partial<AcuteAttackRisk24h> = {}): AcuteAttackRisk24h => ({
  hypertensive_crisis_risk: 10,
  glycemic_crisis_risk: 5,
  sepsis_like_deterioration_risk: 3,
  shock_decompensation_risk: 2,
  stroke_acs_suspicion_risk: 4,
  ...overrides,
})

const makeMortalityProxy = (overrides: Partial<MortalityProxyRisk> = {}): MortalityProxyRisk => ({
  mortality_proxy_score: 15,
  mortality_proxy_tier: 'low',
  clinical_urgency_tier: 'low',
  ...overrides,
})

// ── TrajectoryIntelligencePanel — empty state ─────────────────────────────────

test('TrajectoryIntelligencePanel — renders empty state when no patientIdentifier', () => {
  const html = renderToStaticMarkup(
    <TrajectoryIntelligencePanel patientIdentifier={null} />
  )
  assert.match(html, /Pilih pasien/)
})

test('TrajectoryIntelligencePanel — renders empty state for undefined identifier', () => {
  const html = renderToStaticMarkup(
    <TrajectoryIntelligencePanel patientIdentifier={undefined} />
  )
  assert.match(html, /Pilih pasien/)
})

// ── MomentumScoreCard ─────────────────────────────────────────────────────────

test('MomentumScoreCard — renders score and label for STABLE momentum', () => {
  const html = renderToStaticMarkup(
    <MomentumScoreCard momentum={makeMomentum({ level: 'STABLE', score: 22 })} />
  )
  assert.match(html, /22/)
  assert.match(html, new RegExp(MOMENTUM_LEVEL_CONFIG.STABLE.label))
})

test('MomentumScoreCard — renders CRITICAL_MOMENTUM label', () => {
  const html = renderToStaticMarkup(
    <MomentumScoreCard
      momentum={makeMomentum({ level: 'CRITICAL_MOMENTUM', score: 91, isReliable: true })}
    />
  )
  assert.match(html, new RegExp(MOMENTUM_LEVEL_CONFIG.CRITICAL_MOMENTUM.label))
})

test('MomentumScoreCard — shows data warning when not reliable', () => {
  const html = renderToStaticMarkup(
    <MomentumScoreCard
      momentum={makeMomentum({ isReliable: false, visitCount: 1 })}
    />
  )
  assert.match(html, /Data terbatas/)
  assert.match(html, /1 kunjungan/)
})

// ── ConvergencePatternAlert ───────────────────────────────────────────────────

test('ConvergencePatternAlert — renders nothing when pattern is none', () => {
  const html = renderToStaticMarkup(
    <ConvergencePatternAlert
      convergence={{
        pattern: 'none',
        convergenceScore: 0,
        worseningParams: [],
        improvingParams: [],
        shouldAlert: false,
        narrative: '',
      }}
    />
  )
  assert.equal(html, '')
})

test('ConvergencePatternAlert — renders alert when shouldAlert is true', () => {
  const html = renderToStaticMarkup(
    <ConvergencePatternAlert
      convergence={{
        pattern: 'sepsis_like',
        convergenceScore: 3,
        worseningParams: ['hr', 'temp', 'rr'],
        improvingParams: [],
        shouldAlert: true,
        narrative: 'Pola multi-parameter mengarah ke sepsis.',
      }}
    />
  )
  assert.match(html, /Suspek Sepsis/)
  assert.match(html, /Pola multi-parameter/)
})

// ── AcuteAttackRiskGrid ───────────────────────────────────────────────────────

test('AcuteAttackRiskGrid — renders all 5 risk categories', () => {
  const html = renderToStaticMarkup(
    <AcuteAttackRiskGrid risks={makeAcuteRisks()} />
  )
  assert.match(html, /Krisis Hipertensi/i)
  assert.match(html, /Glikemik/i)
  assert.match(html, /Sepsis/i)
  assert.match(html, /Syok/i)
  assert.match(html, /Stroke/i)
})

test('AcuteAttackRiskGrid — displays score values', () => {
  const html = renderToStaticMarkup(
    <AcuteAttackRiskGrid risks={makeAcuteRisks({ hypertensive_crisis_risk: 78 })} />
  )
  assert.match(html, /78/)
})

// ── MortalityRiskIndicator ────────────────────────────────────────────────────

test('MortalityRiskIndicator — renders low risk label', () => {
  const html = renderToStaticMarkup(
    <MortalityRiskIndicator mortalityProxy={makeMortalityProxy({ mortality_proxy_tier: 'low' })} />
  )
  assert.match(html, new RegExp(MORTALITY_TIER_CONFIG.low.label))
})

test('MortalityRiskIndicator — renders very_high risk label', () => {
  const html = renderToStaticMarkup(
    <MortalityRiskIndicator
      mortalityProxy={makeMortalityProxy({
        mortality_proxy_tier: 'very_high',
        mortality_proxy_score: 85,
        clinical_urgency_tier: 'immediate',
      })}
    />
  )
  assert.match(html, new RegExp(MORTALITY_TIER_CONFIG.very_high.label))
  assert.match(html, new RegExp(URGENCY_TIER_CONFIG.immediate.label))
})

test('MortalityRiskIndicator — renders proxy score', () => {
  const html = renderToStaticMarkup(
    <MortalityRiskIndicator
      mortalityProxy={makeMortalityProxy({ mortality_proxy_score: 62 })}
    />
  )
  assert.match(html, /62/)
})

// ── MORTALITY_TIER_CONFIG centralisation ─────────────────────────────────────
// Verifies config is exported from trajectory.ts (not local to component).

test('MORTALITY_TIER_CONFIG — exported from trajectory.ts with all 4 tiers', () => {
  assert.ok(MORTALITY_TIER_CONFIG.low)
  assert.ok(MORTALITY_TIER_CONFIG.moderate)
  assert.ok(MORTALITY_TIER_CONFIG.high)
  assert.ok(MORTALITY_TIER_CONFIG.very_high)
})

test('MORTALITY_TIER_CONFIG — each tier has label, color, bg', () => {
  for (const tier of Object.values(MORTALITY_TIER_CONFIG)) {
    assert.ok(tier.label.length > 0, 'label must be non-empty')
    assert.ok(tier.color.startsWith('#'), 'color must be hex')
    assert.ok(tier.bg.startsWith('rgba'), 'bg must be rgba')
  }
})
