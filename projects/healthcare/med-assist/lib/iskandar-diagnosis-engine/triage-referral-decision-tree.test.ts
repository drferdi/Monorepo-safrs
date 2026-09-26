import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { PenyakitRawData } from '../rag/types';

import {
  evaluateTriageReferralTree,
  type TriageDecisionInput,
} from './triage-referral-decision-tree';

const KB_PATH = path.resolve(__dirname, '../../public/data/penyakit.json');
const kb = JSON.parse(readFileSync(KB_PATH, 'utf-8')) as { penyakit: PenyakitRawData[] };

function findDisease(predicate: (entry: PenyakitRawData) => boolean): PenyakitRawData {
  const found = kb.penyakit.find(predicate);
  if (!found) throw new Error('Fixture disease not found in KB');
  return found;
}

const localDisease: Pick<
  PenyakitRawData,
  | 'id'
  | 'nama'
  | 'icd10'
  | 'kompetensi'
  | 'red_flags'
  | 'kriteria_rujukan'
  | 'gejala_klinis'
  | 'diagnosis_banding'
> = {
  id: 'DIS-TEST-4A',
  nama: 'Common cold',
  icd10: 'J00',
  kompetensi: '4A',
  red_flags: ['Nyeri dada', 'Sesak berat'],
  kriteria_rujukan: '',
  gejala_klinis: ['batuk', 'pilek', 'demam'],
  diagnosis_banding: [],
};

function baseInput(overrides: Partial<TriageDecisionInput> = {}): TriageDecisionInput {
  return {
    complaintSignals: ['batuk', 'pilek'],
    complaintText: 'batuk pilek dan demam ringan',
    vitals: { sbp: 120, dbp: 80, hr: 82, rr: 18, temp: 36.8, glucose: 0 },
    disease: localDisease,
    confidenceBand: 'high',
    ...overrides,
  };
}

describe('evaluateTriageReferralTree — branches', () => {
  it('Node 1 → emergency when structured red flags fire (qSOFA sepsis)', () => {
    const result = evaluateTriageReferralTree(
      baseInput({
        complaintText: 'lemas berat dan demam tinggi',
        vitals: { sbp: 95, dbp: 60, hr: 118, rr: 26, temp: 39, glucose: 0 },
      })
    );

    expect(result.outcome).toBe('emergency');
    expect(result.firedCriteria.length).toBeGreaterThan(0);
    expect(result.auditTrail.some((entry) => entry.node === 1 && entry.fired)).toBe(true);
  });

  it('Node 2 → urgent_review when a KB red flag phrase matches the complaint text', () => {
    const result = evaluateTriageReferralTree(
      baseInput({ complaintText: 'batuk disertai nyeri dada sejak tadi malam' })
    );

    expect(result.outcome).toBe('urgent_review');
    expect(result.firedCriteria.join(' ').toLowerCase()).toContain('nyeri dada');
  });

  it('Node 3 → refer when SKDI competence level is below GP-complete (3A)', () => {
    const referDisease = findDisease(
      (entry) => entry.kompetensi === '3A' && entry.kriteria_rujukan.trim().length > 0
    );

    const result = evaluateTriageReferralTree(
      baseInput({
        disease: referDisease,
        complaintText: 'keluhan sesuai kompetensi rujukan',
        complaintSignals: ['keluhan', 'berat'],
        confidenceBand: 'moderate',
      })
    );

    expect(result.outcome).toBe('refer');
    expect(result.referralGuidance).toBe(referDisease.kriteria_rujukan);
    expect(result.icd10).toBe(referDisease.icd10);
  });

  it('Node 4 → insufficient when signals are sparse and confidence is low', () => {
    const result = evaluateTriageReferralTree(
      baseInput({ complaintSignals: [], complaintText: '', confidenceBand: 'low' })
    );

    expect(result.outcome).toBe('insufficient');
    expect(result.confidenceTier).toBe('insufficient');
  });

  it('Node 5 → treat_locally by default for a 4A disease with strong confidence', () => {
    const result = evaluateTriageReferralTree(baseInput({ confidenceBand: 'very_high' }));

    expect(result.outcome).toBe('treat_locally');
    expect(result.confidenceTier).toBe('high');
  });
});

describe('evaluateTriageReferralTree — safety priority ordering', () => {
  it('emergency wins over refer even when competence would otherwise refer', () => {
    const referDisease = findDisease((entry) => entry.kompetensi === '3A');

    const result = evaluateTriageReferralTree(
      baseInput({
        disease: referDisease,
        vitals: { sbp: 92, dbp: 58, hr: 122, rr: 28, temp: 39.2, glucose: 0 },
      })
    );

    expect(result.outcome).toBe('emergency');
  });
});

describe('evaluateTriageReferralTree — edge cases', () => {
  it('handles empty red_flags and empty kriteria_rujukan without firing safety nodes', () => {
    const result = evaluateTriageReferralTree(
      baseInput({
        disease: { ...localDisease, red_flags: [], kriteria_rujukan: '' },
      })
    );

    expect(result.outcome).toBe('treat_locally');
    expect(result.referralGuidance).toBeNull();
  });

  it('treats all-zero vitals as missing (does not crash, no false emergency)', () => {
    const result = evaluateTriageReferralTree(
      baseInput({
        vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 },
        complaintSignals: ['batuk', 'pilek'],
        confidenceBand: 'high',
      })
    );

    expect(['treat_locally', 'insufficient']).toContain(result.outcome);
  });

  it('surfaces referral guidance text on a 4A disease without forcing a refer outcome', () => {
    const result = evaluateTriageReferralTree(
      baseInput({
        disease: { ...localDisease, kriteria_rujukan: 'Rujuk bila tidak membaik 3 hari.' },
      })
    );

    expect(result.outcome).toBe('treat_locally');
    expect(result.referralGuidance).toBe('Rujuk bila tidak membaik 3 hari.');
  });
});

describe('evaluateTriageReferralTree — invalid input handling', () => {
  it('flags out-of-range vitals in invalidInputs without throwing', () => {
    const result = evaluateTriageReferralTree(
      baseInput({ vitals: { sbp: -5, dbp: 999, hr: 82, rr: 18, temp: 36.8, glucose: 0 } })
    );

    expect(result.invalidInputs.length).toBeGreaterThan(0);
    expect(result.outcome).toBeTruthy();
  });

  it('fail-closed: invalid vitals never silently downgrade to a less safe outcome', () => {
    const result = evaluateTriageReferralTree(
      baseInput({ vitals: { sbp: 400, dbp: 300, hr: -1, rr: 999, temp: 60, glucose: 0 } })
    );

    // extreme/invalid vitals must not resolve to a routine local-treat pathway
    expect(result.outcome).not.toBe('treat_locally');
  });
});

describe('evaluateTriageReferralTree — determinism & audit', () => {
  it('is deterministic for identical input', () => {
    const input = baseInput();
    expect(evaluateTriageReferralTree(input)).toEqual(evaluateTriageReferralTree(input));
  });

  it('produces an ordered audit trail with a fired terminal node', () => {
    const result = evaluateTriageReferralTree(baseInput());
    const nodes = result.auditTrail.map((entry) => entry.node);

    expect(nodes).toEqual([...nodes].sort((a, b) => a - b));
    expect(result.auditTrail.some((entry) => entry.fired)).toBe(true);
    expect(result.auditTrail.every((entry) => entry.sourceRef.length > 0)).toBe(true);
  });
});

describe('evaluateTriageReferralTree — reference case from real KB', () => {
  it('evaluates Hipertensi esensial (I10) end to end', () => {
    const htn = findDisease((entry) => entry.icd10.toUpperCase() === 'I10');

    const result = evaluateTriageReferralTree({
      complaintSignals: ['nyeri kepala', 'pusing'],
      complaintText: 'nyeri kepala pagi hari disertai pusing',
      vitals: { sbp: 150, dbp: 95, hr: 84, rr: 18, temp: 36.7, glucose: 0 },
      disease: htn,
      confidenceBand: 'high',
    });

    expect(result.icd10).toBe('I10');
    expect(['treat_locally', 'urgent_review']).toContain(result.outcome);
    expect(result.auditTrail.length).toBeGreaterThanOrEqual(3);
  });
});
