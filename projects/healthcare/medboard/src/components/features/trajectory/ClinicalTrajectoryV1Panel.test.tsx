import assert from 'node:assert/strict'
import test from 'node:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ClinicalTrajectoryV1Panel } from './ClinicalTrajectoryV1Panel'

import {
  mockImprovingTrajectory,
  mockSparseDataTrajectory,
  mockWorseningRespiratoryTrajectory,
} from '@/types/abyss/clinical-trajectory'

test('ClinicalTrajectoryV1Panel renders improving trajectory state', () => {
  const html = renderToStaticMarkup(
    <ClinicalTrajectoryV1Panel trajectory={mockImprovingTrajectory} />
  )

  assert.match(html, /ClinicalTrajectory v1/)
  assert.match(html, /improving/)
  assert.match(html, /Momentum/)
  assert.match(html, /Evidence Trail/)
})

test('ClinicalTrajectoryV1Panel renders respiratory escalation context', () => {
  const html = renderToStaticMarkup(
    <ClinicalTrajectoryV1Panel trajectory={mockWorseningRespiratoryTrajectory} />
  )

  assert.match(html, /worsening/)
  assert.match(html, /respiratory/)
  assert.match(html, /Clinician review recommended/)
})

test('ClinicalTrajectoryV1Panel renders sparse data warning', () => {
  const html = renderToStaticMarkup(
    <ClinicalTrajectoryV1Panel trajectory={mockSparseDataTrajectory} />
  )

  assert.match(html, /insufficient_data/)
  assert.match(html, /Limited data available/)
})
