import { describe, expect, it } from 'vitest';

import {
  buildChronicMedications,
  buildFollowUp,
  buildSafetyNet,
  interactionsFor,
  reviewSafety,
  roleOf,
} from './tatalaksana';
import type { DiseaseNote } from './useDiseaseNotes';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import type { DrugInteraction } from '@/types/api';

const visit = (timestamp: string, terapi: string, diagnosis: string): VisitRecord => ({
  patient_id: 'RM-TEST',
  encounter_id: timestamp,
  timestamp,
  vitals: { sbp: 130, dbp: 80, hr: 80, rr: 18, temp: 36.8, glucose: 0 },
  keluhan_utama: 'kontrol',
  diagnosa: { icd_x: diagnosis === 'Hipertensi esensial' ? 'I10' : 'E11', nama: diagnosis },
  terapi_obat: terapi,
  source: 'scrape',
});

const note = (over: Partial<DiseaseNote>): DiseaseNote => ({ definition: 'x', complications: [], exam: [], referral: '', ...over });

describe('buildChronicMedications', () => {
  const visits = [
    visit('2026-09-10T08:00:00Z', 'Amlodipin 1x10mg sesudah makan; Metformin 2x500mg sesudah makan', 'Hipertensi esensial'),
    visit('2026-08-10T08:00:00Z', 'Amlodipin 1x5mg sesudah makan', 'Hipertensi esensial'),
    visit('2026-07-10T08:00:00Z', 'Metformin 2x500mg sesudah makan', 'Diabetes melitus tipe 2'),
    visit('2026-06-10T08:00:00Z', 'Metformin 2x500mg sesudah makan', 'Diabetes melitus tipe 2'),
  ];

  it('takes the latest dose and the diagnosis the prescribing visits recorded most', () => {
    const [amlodipin, metformin] = buildChronicMedications(['Amlodipin', 'Metformin'], visits);
    expect(amlodipin.doseLine).toBe('1x10mg · Sesudah makan');
    expect(amlodipin.indication).toBe('Hipertensi esensial');
    expect(amlodipin.visits).toHaveLength(2);
    expect(metformin.indication).toBe('Diabetes melitus tipe 2');
    expect(metformin.visits.map((entry) => entry.date)).toEqual([
      '2026-09-10T08:00:00Z',
      '2026-07-10T08:00:00Z',
      '2026-06-10T08:00:00Z',
    ]);
  });

  it('keeps a name the history text does not show, without dose or indication', () => {
    expect(buildChronicMedications(['Simvastatin'], visits)).toEqual([
      { key: 'simvastatin', name: 'Simvastatin', doseLine: '', indication: '', visits: [] },
    ]);
  });
});

describe('roleOf', () => {
  it('keeps the engine role and otherwise uses the RME keyword rule', () => {
    expect(roleOf('Paracetamol 500 mg', 'utama')).toBe('utama');
    expect(roleOf('Ambroxol 30 mg')).toBe('adjuvant');
    expect(roleOf('Vitamin B Complex')).toBe('vitamin');
    expect(roleOf('Amoksisilin 500 mg')).toBe('utama');
  });
});

describe('reviewSafety', () => {
  const major: DrugInteraction = { drug_a: 'Amlodipin', drug_b: 'Simvastatin 20 mg', severity: 'major', description: 'x' };
  const moderate: DrugInteraction = { drug_a: 'Metformin', drug_b: 'Ibuprofen 400 mg', severity: 'moderate', description: 'x' };

  it('finds the same drug twice, a major interaction between chosen drugs and a detected allergy', () => {
    const review = reviewSafety({
      chronic: ['Amlodipin', 'Metformin'],
      visit: [
        { name: 'Simvastatin 20 mg', contraindications: [] },
        { name: 'Amlodipin 5 mg', contraindications: [] },
        { name: 'Amoxicillin 500 mg', contraindications: ['Hamil trimester 1'] },
      ],
      interactions: [major, moderate],
      allergies: ['Amoxicillin', 'Tidak ada'],
    });
    expect(review.duplicates).toEqual(['Amlodipin + Amlodipin 5 mg']);
    expect(review.interactions).toEqual([major]);
    expect(review.contraindications).toEqual([
      { drug: 'Amoxicillin 500 mg', reason: 'Alergi Amoxicillin' },
      { drug: 'Amoxicillin 500 mg', reason: 'Hamil trimester 1' },
    ]);
  });

  it('ignores an interaction with a drug that is not in the plan', () => {
    const review = reviewSafety({ chronic: ['Amlodipin'], visit: [], interactions: [major], allergies: [] });
    expect(review).toEqual({ duplicates: [], interactions: [], contraindications: [] });
  });

  it('lists the interactions one medication takes part in', () => {
    expect(interactionsFor('Metformin', [major, moderate])).toEqual([moderate]);
  });
});

describe('buildFollowUp and buildSafetyNet', () => {
  const notes = new Map<string, DiseaseNote>([
    ['J06', note({ followUp: 'Kontrol bila tidak membaik 7-10 hari.', redFlags: ['Sesak nafas berat', 'Stridor'] })],
    ['J02', note({ followUp: 'Kontrol bila tidak membaik 7-10 hari.', redFlags: ['Stridor', 'Trismus'] })],
    ['I10', note({ followUp: 'Kontrol 2-4 minggu, lalu tiap 3 bulan.' })],
    ['E11', note({})],
  ]);

  it('gives the chosen diagnosis\'s follow-up once and routine control for chronic conditions not chosen', () => {
    expect(
      buildFollowUp(
        ['J06.9', 'J02'],
        [
          { code: 'I10', name: 'Hipertensi esensial' },
          { code: 'E11', name: 'Diabetes melitus tipe 2' },
          { code: 'J06', name: 'ISPA' },
        ],
        notes
      )
    ).toEqual({
      visit: ['Kontrol bila tidak membaik 7-10 hari.'],
      routine: [{ name: 'Hipertensi esensial', text: 'Kontrol 2-4 minggu, lalu tiap 3 bulan.' }],
    });
  });

  it('lists the chosen diagnoses\' red flags verbatim, each once, and nothing for a code without them', () => {
    expect(buildSafetyNet(['J06.9', 'J02'], notes)).toEqual(['Sesak nafas berat', 'Stridor', 'Trismus']);
    expect(buildSafetyNet(['K65.0'], notes)).toEqual([]);
  });
});
