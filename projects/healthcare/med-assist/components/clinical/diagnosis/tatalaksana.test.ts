import { describe, expect, it } from 'vitest';

import {
  buildChronicMedications,
  buildFollowUp,
  buildSafetyNet,
  explainInteraction,
  formatDose,
  interactionsFor,
  nameBesideDose,
  reviewSafety,
  roleOf,
  searchStock,
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

describe('formatDose', () => {
  // Chief, 2026-09-29: "Penulisan dosis yang saya suka : 1x10mg".
  it('writes frequency x strength per take, taking the strength from the name when the dose has none', () => {
    expect(formatDose('Amlodipin 10 mg', '1x1')).toBe('1x10mg');
    expect(formatDose('Amoksisilin 500 mg', '3x1')).toBe('3x500mg');
    expect(formatDose('Paracetamol 500mg', '3x2')).toBe('3x1000mg');
    expect(formatDose('Amoksisilin', '2x500 mg')).toBe('2x500mg');
    expect(formatDose('Salbutamol 0,5 mg', '3 x 1')).toBe('3x0.5mg');
  });

  it('leaves a dose it cannot read, or a name without strength, as written', () => {
    expect(formatDose('Vitamin B kompleks', '1x1')).toBe('1x1');
    expect(formatDose('Amlodipin 10 mg', 'bila perlu')).toBe('bila perlu');
  });
});

describe('nameBesideDose', () => {
  it('drops the strength from the name only when the dose line already says it', () => {
    expect(nameBesideDose('Amlodipin 10 mg', '1x10mg · Sesudah makan')).toBe('Amlodipin');
    expect(nameBesideDose('Amlodipin 10 mg', '1x1 · Sesudah makan')).toBe('Amlodipin 10 mg');
    expect(nameBesideDose('Vitamin B', '1x1')).toBe('Vitamin B');
  });
});

describe('explainInteraction', () => {
  const pair = (drug_a: string, drug_b: string): DrugInteraction => ({ drug_a, drug_b, severity: 'major', description: 'Interaksi signifikan.', recommendation: 'Evaluasi kebutuhan terapi.' });

  it('takes the mechanism and advice from the curated pair table, whatever the spelling and strength', () => {
    expect(explainInteraction(pair('Simvastatin 20 mg', 'Amlodipin 10 mg'))).toEqual({
      reason: 'Amlodipine meningkatkan kadar simvastatin',
      advice: 'Batasi dosis simvastatin maksimal 20mg/hari.',
    });
  });

  it('names no mechanism the sources do not give, and keeps DDInter\'s advice', () => {
    expect(explainInteraction(pair('Amlodipin 10 mg', 'Kandesartan 8 mg'))).toEqual({ reason: null, advice: 'Evaluasi kebutuhan terapi.' });
  });
});

// Chief, 2026-09-29: "ketik Am... keluar lodipin", the name field searches the Puskesmas stock.
describe('searchStock', () => {
  it('offers the Puskesmas medicines a typed beginning names, from two letters on', () => {
    const names = searchStock('Am').map((match) => match.name);
    expect(names).toContain('Amlodipin tablet 10 mg');
    expect(names.length).toBeLessThanOrEqual(6);
    expect(names.every((name) => name.toLowerCase().startsWith('am'))).toBe(true);
    expect(searchStock('A')).toEqual([]);
  });

  it('matches every typed word, and carries the stock', () => {
    expect(searchStock('amlo 5')).toEqual([
      { name: 'Amlodipin tablet 5 mg', stock: expect.any(Number), unit: 'Tablet', available: true },
      { name: 'BLUD Amlodipn tablet 5 mg', stock: expect.any(Number), unit: 'Tablet', available: true },
    ]);
  });

  it('leaves out BMHP, and lists what is out of stock after what is in', () => {
    expect(searchStock('alat suntik')).toEqual([]);
    const amoksisilin = searchStock('amoksisilin');
    expect(amoksisilin.at(-1)).toMatchObject({ name: 'BLUD Amoksisilin tablet 500 mg', available: false });
    expect(amoksisilin.slice(0, -1).every((match) => match.available)).toBe(true);
  });
});
