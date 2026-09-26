import assert from 'node:assert/strict'
import test from 'node:test'

import { parseDiagnoseRequestBody } from './diagnose-parser'

test('parseDiagnoseRequestBody maps structured_signs object into structured_signs_text for CDSS engine context', () => {
  const parsed = parseDiagnoseRequestBody({
    keluhan_utama: 'Sesak napas',
    usia: 44,
    jenis_kelamin: 'L',
    structured_signs: {
      respiratoryDistress: {
        accessoryMuscleUse: true,
        cyanosis: true,
      },
      hmod: {
        chest_pain: true,
      },
      dkaHhs: {
        severe_dehydration: true,
      },
      perfusionShock: {
        coldExtremities: true,
        capillaryRefillSec: 4,
      },
    },
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) {
    assert.fail('expected parser success')
  }

  assert.match(parsed.input.structured_signs_text ?? '', /Distress pernapasan/i)
  assert.match(parsed.input.structured_signs_text ?? '', /accessoryMuscleUse=true/i)
  assert.match(parsed.input.structured_signs_text ?? '', /cyanosis=true/i)
  assert.match(parsed.input.structured_signs_text ?? '', /HMOD: chest_pain=true/i)
  assert.match(parsed.input.structured_signs_text ?? '', /DKA\/HHS: severe_dehydration=true/i)
  assert.match(parsed.input.structured_signs_text ?? '', /Syok\/Perfusi/i)
  assert.match(parsed.input.structured_signs_text ?? '', /capillaryRefillSec=4/i)
})

test('parseDiagnoseRequestBody still accepts explicit structured_signs_text passthrough', () => {
  const parsed = parseDiagnoseRequestBody({
    keluhan_utama: 'Demam',
    usia: 29,
    jenis_kelamin: 'P',
    structured_signs_text: 'Distress pernapasan: accessoryMuscleUse=true',
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) {
    assert.fail('expected parser success')
  }

  assert.equal(
    parsed.input.structured_signs_text,
    'Distress pernapasan: accessoryMuscleUse=true'
  )
})

test('parseDiagnoseRequestBody maps composite_deterioration object into deterioration_summary_text', () => {
  const parsed = parseDiagnoseRequestBody({
    keluhan_utama: 'Sesak progresif',
    usia: 58,
    jenis_kelamin: 'P',
    composite_deterioration: {
      derived: {
        map: 64,
        pulsePressure: 28,
        shockIndex: 1.08,
      },
      compositeAlerts: [
        {
          title: 'SUSPECTED SEPSIS / SHOCK',
          severity: 'critical',
          confidence: 'high',
          summary: 'Kombinasi SI tinggi, demam, dan takipnea',
          evidence: ['Shock Index 1.08 >0.9', 'MAP 64 mmHg <65'],
        },
      ],
      watchers: [
        {
          title: 'RESPIRATORY DETERIORATION WATCH',
          severity: 'warning',
          confidence: 'low',
          summary: 'Baseline 2 jam belum cukup',
          evidence: ['RR 26/menit >24'],
        },
      ],
    },
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) {
    assert.fail('expected parser success')
  }

  assert.match(parsed.input.deterioration_summary_text ?? '', /Derived metrics/i)
  assert.match(parsed.input.deterioration_summary_text ?? '', /MAP=64/i)
  assert.match(parsed.input.deterioration_summary_text ?? '', /Composite alerts/i)
  assert.match(parsed.input.deterioration_summary_text ?? '', /SUSPECTED SEPSIS \/ SHOCK/i)
  assert.match(parsed.input.deterioration_summary_text ?? '', /Composite watchers/i)
})
