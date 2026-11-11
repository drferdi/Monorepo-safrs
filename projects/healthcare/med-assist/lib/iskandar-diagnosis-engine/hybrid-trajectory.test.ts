import { describe, expect, it } from 'vitest';

import {
  adaptVisitRecordsToSymphonyVitals,
  analyzeHybridTrajectory,
  avpuToConsciousness,
  compareTrajectoryEngines,
  mapHybridTrajectoryToLegacyAnalysis,
} from './hybrid-trajectory';
import type { VisitRecord } from './visit-history-store';

const certaintyPhrase = ['diagnosis', 'pasti'].join(' ');

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-HYB-001',
    encounter_id: `enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

describe('hybrid-trajectory', () => {
  it('adapts visit records into Symphony input and injects latest encounter SpO2', () => {
    const visits: VisitRecord[] = [
      makeVisit(2, { sbp: 128, dbp: 82, hr: 80, rr: 18, temp: 36.8, glucose: 130 }),
      makeVisit(1, { sbp: 126, dbp: 80, hr: 78, rr: 18, temp: 36.7, glucose: 128 }),
    ];

    const adapted = adaptVisitRecordsToSymphonyVitals(visits, {
      keluhanUtama: 'Sesak ringan',
      spo2: 92,
    });

    expect(adapted).toHaveLength(2);
    expect(adapted[0]?.observedAt < adapted[1]?.observedAt).toBe(true);
    expect(adapted[1]?.spo2).toBe(92);
    expect(adapted[1]?.systolicBp).toBe(128);
  });

  it('raises final review severity when complaint and diagnosis history increase clinical concern', () => {
    const visits: VisitRecord[] = [
      makeVisit(
        1,
        { sbp: 122, dbp: 78, hr: 78, rr: 18, temp: 36.7, glucose: 155 },
        {
          keluhan_utama: 'Kontrol diabetes',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 124, dbp: 80, hr: 82, rr: 18, temp: 36.8, glucose: 162 },
        {
          keluhan_utama: 'Kontrol rutin',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
    ];

    const result = analyzeHybridTrajectory({
      visits,
      currentEncounter: {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        spo2: 97,
      },
    });

    expect(result.integratedAssessment.physiologicalSeverity).toBe('low');
    expect(result.integratedAssessment.contextReviewFloor).toBe('high');
    expect(result.integratedAssessment.calibratedSeverity).toBe('high');
    expect(result.uncertaintyNotes).toContain('contextual_escalation_applied');
    expect(result.redFlags.some((flag) => flag.id === 'complaint-acs-review')).toBe(true);
  });

  it('maps hybrid result back into the legacy trajectory contract for the existing UI', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 150, dbp: 94, hr: 96, rr: 20, temp: 37.4, glucose: 210 }),
      makeVisit(2, { sbp: 158, dbp: 98, hr: 102, rr: 22, temp: 37.8, glucose: 248 }),
      makeVisit(3, { sbp: 166, dbp: 104, hr: 110, rr: 24, temp: 38.2, glucose: 286 }),
    ];

    const hybrid = analyzeHybridTrajectory({
      visits,
      currentEncounter: {
        keluhanUtama: 'Demam dan sesak',
        keluhanTambahan: 'Batuk',
        spo2: 93,
      },
    });
    const legacy = mapHybridTrajectoryToLegacyAnalysis(hybrid);

    expect(legacy.visitCount).toBe(3);
    expect(legacy.recommendations.length).toBeGreaterThan(0);
    expect(legacy.clinical_safe_output.risk_tier).toBe(
      hybrid.integratedAssessment.calibratedSeverity
    );
    expect(legacy.confirmed_chronic_diagnoses).toEqual(
      hybrid.clinicalContext.confirmedChronicDiagnoses
    );
  });

  it('adds NEWS2 and early-warning intelligence as review red flags without autonomous diagnosis', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 132, dbp: 84, hr: 88, rr: 18, temp: 36.9, glucose: 144 }),
      makeVisit(2, { sbp: 118, dbp: 76, hr: 104, rr: 22, temp: 38.1, glucose: 178 }),
      makeVisit(3, { sbp: 96, dbp: 62, hr: 124, rr: 29, temp: 38.7, glucose: 224 }),
    ];

    const result = analyzeHybridTrajectory({
      visits,
      currentEncounter: {
        keluhanUtama: 'Demam dan sesak memberat',
        keluhanTambahan: 'Batuk dan tampak lemas',
        spo2: 90,
      },
    });

    expect(result.clinicalIntelligence).toBeDefined();
    const intelligence = result.clinicalIntelligence;
    if (!intelligence) return;

    expect(intelligence.news2.aggregateScore).toBeGreaterThanOrEqual(7);
    expect(intelligence.news2.riskLevel).toBe('high');
    expect(intelligence.shockIndex?.value).toBeGreaterThanOrEqual(1);
    expect(intelligence.earlyWarnings.map((item) => item.patternId)).toEqual(
      expect.arrayContaining(['SEPSIS_SIRS', 'RESP_FAILURE_IMMINENT'])
    );
    expect(intelligence.selectedPatterns.map((item) => item.id)).toEqual(
      expect.arrayContaining(['CP-002', 'CP-010', 'CP-011', 'CP-013'])
    );
    expect(result.redFlags.map((flag) => flag.id)).toEqual(
      expect.arrayContaining([
        'clinical-news2-high',
        'clinical-pattern-resp-failure-imminent',
        'clinical-shock-index-high',
      ])
    );
    expect(JSON.stringify(result.redFlags).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds selected CP expansion for severe respiratory distress, ACS risk, geriatric delirium, and diabetic infection risk', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 146, dbp: 90, hr: 98, rr: 20, temp: 37.2, glucose: 210 },
          {
            keluhan_utama: 'Kontrol diabetes',
            diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
            terapi_obat: 'Metformin',
          }
        ),
        makeVisit(
          2,
          { sbp: 158, dbp: 96, hr: 108, rr: 24, temp: 38.2, glucose: 260 },
          {
            keluhan_utama: 'Demam batuk dan nyeri dada',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral',
          }
        ),
        makeVisit(
          3,
          { sbp: 170, dbp: 104, hr: 126, rr: 28, temp: 38.8, glucose: 318 },
          {
            keluhan_utama: 'Sesak, bingung, nyeri dada',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak berat, nyeri dada, bingung, luka kaki diabetes tampak infeksi',
        keluhanTambahan: 'Sulit bicara dan napas berat',
        spo2: 91,
        consciousness: 'voice',
        ageYears: 72,
      },
    });

    expect(result.clinicalIntelligence.selectedPatterns.map((item) => item.id)).toEqual(
      expect.arrayContaining(['CP-014', 'CP-063', 'CP-064', 'CP-066'])
    );
    expect(
      JSON.stringify(result.clinicalIntelligence.selectedPatterns).toLowerCase()
    ).not.toContain(certaintyPhrase);
  });

  it('builds longitudinal clinical frames for timeline, red-flag, delta, and hypothesis visuals', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          3,
          { sbp: 170, dbp: 104, hr: 126, rr: 28, temp: 38.8, glucose: 318 },
          {
            keluhan_utama: 'Sesak, bingung, nyeri dada',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral',
          }
        ),
        makeVisit(
          1,
          { sbp: 146, dbp: 90, hr: 98, rr: 20, temp: 37.2, glucose: 210 },
          {
            keluhan_utama: 'Kontrol diabetes',
            diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
            terapi_obat: 'Metformin',
          }
        ),
        makeVisit(
          2,
          { sbp: 158, dbp: 96, hr: 108, rr: 24, temp: 38.2, glucose: 260 },
          {
            keluhan_utama: 'Demam batuk dan nyeri dada',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak berat, nyeri dada, bingung, luka kaki diabetes tampak infeksi',
        keluhanTambahan: 'Sulit bicara dan napas berat',
        spo2: 91,
        consciousness: 'voice',
        ageYears: 72,
      },
    });

    expect(result.longitudinalFrames).toHaveLength(3);
    expect(result.longitudinalFrames.map((frame) => frame.visitLabel)).toEqual([
      'Kunjungan 1',
      'Kunjungan 2',
      'Kunjungan 3',
    ]);
    expect(result.longitudinalFrames.map((frame) => frame.observedAt)).toEqual([
      makeVisit(1, { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }).timestamp,
      makeVisit(2, { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }).timestamp,
      makeVisit(3, { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }).timestamp,
    ]);
    expect(result.longitudinalFrames[0]).toEqual(
      expect.objectContaining({
        visitLabel: 'Kunjungan 1',
        complaint: 'Kontrol diabetes',
        diagnosisLabel: 'Diabetes melitus tipe 2',
        therapySummary: 'Metformin',
        vitalsSnapshot: expect.objectContaining({
          systolicBp: 146,
        }),
        trajectorySummary: expect.objectContaining({
          overallTrend: expect.any(String),
          news2AggregateScore: expect.any(Number),
        }),
      })
    );
    expect(result.longitudinalFrames.at(-1)).toEqual(
      expect.objectContaining({
        diagnosisLabel: 'Pneumonia',
        redFlagTitles: expect.arrayContaining(['Respiratory worsening concern']),
        hypothesisLabels: expect.arrayContaining(['Pneumonia']),
      })
    );
    expect(result.longitudinalFrames.at(-1)?.redFlagTitles).not.toContain(
      'Hemodynamic instability concern'
    );

    const nonCriticalShockResult = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 128, dbp: 82, hr: 88, rr: 18, temp: 36.9, glucose: 138 },
          {
            keluhan_utama: 'Batuk ringan',
            diagnosa: { icd_x: 'J06.9', nama: 'Infeksi saluran napas atas' },
          }
        ),
        makeVisit(
          2,
          { sbp: 122, dbp: 78, hr: 104, rr: 24, temp: 38.1, glucose: 166 },
          {
            keluhan_utama: 'Demam dan sesak',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Demam dan sesak memberat',
        keluhanTambahan: 'Batuk dan lemas',
        spo2: 91,
      },
    });

    expect(nonCriticalShockResult.clinicalIntelligence.shockIndex?.severity).not.toBe('high');
    expect(nonCriticalShockResult.clinicalIntelligence.shockIndex?.severity).not.toBe('critical');
    expect(nonCriticalShockResult.longitudinalFrames.at(-1)?.redFlagTitles).not.toContain(
      'Hemodynamic instability concern'
    );
  });

  it('adds T-45 respiratory worsening signal and red flag from respiratory deterioration evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 124, dbp: 78, hr: 86, rr: 18, temp: 36.8, glucose: 132 }),
        makeVisit(2, { sbp: 126, dbp: 80, hr: 94, rr: 21, temp: 37.1, glucose: 148 }),
        makeVisit(
          3,
          { sbp: 118, dbp: 76, hr: 118, rr: 29, temp: 37.8, glucose: 166 },
          {
            keluhan_utama: 'Sesak memberat dan batuk',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak memberat, napas cepat, sulit bicara',
        keluhanTambahan: 'Batuk dan lemas',
        spo2: 90,
      },
    });

    const t45Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-45'
    );

    expect(t45Signal).toMatchObject({
      label: 'Respiratory worsening concern',
      severity: 'critical',
    });
    expect(t45Signal?.evidence).toEqual(
      expect.arrayContaining(['RR 29/menit', 'SpO2 90%', 'HR 118 bpm'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t45',
          source: 'physiological',
          title: 'Respiratory worsening concern',
        }),
      ])
    );
    expect(JSON.stringify(t45Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-46 hemodynamic instability signal and red flag from Shock Index evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 122, dbp: 78, hr: 82, rr: 18, temp: 36.8, glucose: 132 }),
        makeVisit(2, { sbp: 106, dbp: 70, hr: 112, rr: 22, temp: 37.2, glucose: 148 }),
        makeVisit(
          3,
          { sbp: 92, dbp: 58, hr: 126, rr: 24, temp: 37.8, glucose: 166 },
          {
            keluhan_utama: 'Lemas, pusing, keringat dingin',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Lemas berat dan keringat dingin',
        keluhanTambahan: 'Pusing saat berdiri',
        spo2: 96,
      },
    });

    const t46Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-46'
    );

    expect(t46Signal).toMatchObject({
      label: 'Hemodynamic instability concern',
      severity: 'critical',
    });
    expect(t46Signal?.evidence).toEqual(
      expect.arrayContaining(['Shock Index 1.37 = HR 126 / SBP 92'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t46',
          source: 'physiological',
          title: 'Hemodynamic instability concern',
        }),
      ])
    );
    expect(JSON.stringify(t46Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-59 cardiovascular shock trajectory signal and red flag from selected shock CP evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 122, dbp: 78, hr: 82, rr: 18, temp: 36.8, glucose: 132 }),
        makeVisit(2, { sbp: 106, dbp: 70, hr: 112, rr: 22, temp: 37.2, glucose: 148 }),
        makeVisit(
          3,
          { sbp: 92, dbp: 58, hr: 126, rr: 24, temp: 37.8, glucose: 166 },
          {
            keluhan_utama: 'Lemas, pusing, keringat dingin',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Lemas berat dan keringat dingin',
        keluhanTambahan: 'Pusing saat berdiri',
        spo2: 96,
      },
    });

    const t59Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-59'
    );

    expect(result.clinicalIntelligence.selectedPatterns.map((item) => item.id)).toEqual(
      expect.arrayContaining(['CP-010'])
    );
    expect(t59Signal).toMatchObject({
      label: 'Cardiovascular shock trajectory concern',
      severity: 'critical',
    });
    expect(t59Signal?.evidence).toEqual(
      expect.arrayContaining(['Selected CP CP-010', 'Shock Index 1.37 = HR 126 / SBP 92'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t59',
          source: 'physiological',
          title: 'Cardiovascular shock trajectory concern',
        }),
      ])
    );
    expect(JSON.stringify(t59Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-13 imminent cardiac arrest proxy signal and red flag from critical collapse-risk CP evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 122, dbp: 78, hr: 82, rr: 18, temp: 36.8, glucose: 132 }),
        makeVisit(2, { sbp: 106, dbp: 70, hr: 112, rr: 22, temp: 37.2, glucose: 148 }),
        makeVisit(
          3,
          { sbp: 92, dbp: 58, hr: 126, rr: 24, temp: 37.8, glucose: 166 },
          {
            keluhan_utama: 'Lemas, pusing, keringat dingin',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Lemas berat dan keringat dingin',
        keluhanTambahan: 'Pusing saat berdiri',
        spo2: 96,
      },
    });

    const t13Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-13'
    );

    expect(result.clinicalIntelligence.selectedPatterns.map((item) => item.id)).toEqual(
      expect.arrayContaining(['CP-010'])
    );
    expect(t13Signal).toMatchObject({
      label: 'Imminent cardiac arrest proxy concern',
      severity: 'critical',
    });
    expect(t13Signal?.evidence).toEqual(
      expect.arrayContaining(['Selected CP CP-010', 'Shock Index 1.37 = HR 126 / SBP 92'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t13',
          source: 'physiological',
          title: 'Imminent cardiac arrest proxy concern',
        }),
      ])
    );
    expect(JSON.stringify(t13Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-13 imminent cardiac arrest proxy signal from critical respiratory collapse-risk CP evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 128, dbp: 82, hr: 92, rr: 20, temp: 37.1, glucose: 142 },
          {
            keluhan_utama: 'Batuk dan sesak ringan',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
        makeVisit(
          2,
          { sbp: 122, dbp: 78, hr: 106, rr: 24, temp: 37.8, glucose: 166 },
          {
            keluhan_utama: 'Sesak memberat',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
        makeVisit(
          3,
          { sbp: 116, dbp: 74, hr: 118, rr: 28, temp: 38.2, glucose: 188 },
          {
            keluhan_utama: 'Napas berat dan sulit bicara',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak berat, napas cepat, sulit bicara',
        keluhanTambahan: 'Tampak lemas',
        spo2: 91,
      },
    });

    const selectedPatternIds = result.clinicalIntelligence.selectedPatterns.map((item) => item.id);
    const t13Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-13'
    );

    expect(selectedPatternIds).toEqual(expect.arrayContaining(['CP-014']));
    expect(t13Signal).toMatchObject({
      label: 'Imminent cardiac arrest proxy concern',
      severity: 'critical',
    });
    expect(t13Signal?.evidence).toEqual(
      expect.arrayContaining(['Selected CP CP-014', 'RR 28 >=25', 'SpO2 91 <92'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t13',
          source: 'physiological',
          title: 'Imminent cardiac arrest proxy concern',
        }),
      ])
    );
    expect(JSON.stringify(t13Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-54 fever burden signal and red flag from repeated high temperature evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 124, dbp: 78, hr: 94, rr: 20, temp: 37.4, glucose: 132 }),
        makeVisit(
          2,
          { sbp: 120, dbp: 76, hr: 108, rr: 22, temp: 38.7, glucose: 148 },
          {
            keluhan_utama: 'Demam dan menggigil',
          }
        ),
        makeVisit(
          3,
          { sbp: 116, dbp: 74, hr: 116, rr: 23, temp: 39.2, glucose: 166 },
          {
            keluhan_utama: 'Demam masih tinggi',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Demam berulang dan menggigil',
        keluhanTambahan: 'Badan lemas',
        spo2: 97,
      },
    });

    const t54Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-54'
    );

    expect(t54Signal).toMatchObject({
      label: 'Fever burden concern',
      severity: 'high',
    });
    expect(t54Signal?.evidence).toEqual(
      expect.arrayContaining(['Suhu >=38.5C pada 2 titik', 'Suhu terbaru 39.2C'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t54',
          source: 'physiological',
          title: 'Fever burden concern',
        }),
      ])
    );
    expect(JSON.stringify(t54Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-50 NEWS2 aggregate signal and red flag from multi-parameter NEWS2 elevation', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 124, dbp: 78, hr: 88, rr: 18, temp: 36.8, glucose: 132 }),
        makeVisit(2, { sbp: 110, dbp: 70, hr: 116, rr: 24, temp: 38.2, glucose: 188 }),
        makeVisit(
          3,
          { sbp: 94, dbp: 60, hr: 128, rr: 28, temp: 38.6, glucose: 224 },
          {
            keluhan_utama: 'Demam, sesak, lemas',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Demam dan sesak memberat',
        keluhanTambahan: 'Lemas dan tampak sakit',
        spo2: 91,
      },
    });

    const t50Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-50'
    );

    expect(result.clinicalIntelligence.news2.riskLevel).toBe('high');
    expect(t50Signal).toMatchObject({
      label: 'NEWS2 aggregate proxy concern',
      severity: 'high',
    });
    expect(t50Signal?.evidence).toEqual(
      expect.arrayContaining(['NEWS2 aggregate 11', 'Risk level high'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t50',
          source: 'physiological',
          title: 'NEWS2 aggregate proxy concern',
        }),
      ])
    );
    expect(JSON.stringify(t50Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('adds T-16 sepsis no-return proxy signal and red flag from selected sepsis CP evidence', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 126, dbp: 80, hr: 88, rr: 18, temp: 36.9, glucose: 138 }),
        makeVisit(
          2,
          { sbp: 112, dbp: 72, hr: 108, rr: 23, temp: 38.2, glucose: 172 },
          {
            keluhan_utama: 'Demam dan batuk',
          }
        ),
        makeVisit(
          3,
          { sbp: 94, dbp: 60, hr: 126, rr: 28, temp: 38.9, glucose: 226 },
          {
            keluhan_utama: 'Demam, batuk, lemas',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Demam, batuk, lemas, napas cepat',
        keluhanTambahan: 'Tampak sakit dan sulit makan',
        spo2: 92,
      },
    });

    const t16Signal = result.clinicalIntelligence.trajectorySignals.find(
      (item) => item.id === 'T-16'
    );

    expect(result.clinicalIntelligence.selectedPatterns.map((item) => item.id)).toEqual(
      expect.arrayContaining(['CP-002'])
    );
    expect(t16Signal).toMatchObject({
      label: 'Sepsis no-return proxy concern',
      severity: 'critical',
    });
    expect(t16Signal?.evidence).toEqual(
      expect.arrayContaining(['Selected CP CP-002', 'NEWS2 aggregate 10'])
    );
    expect(result.redFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t16',
          source: 'physiological',
          title: 'Sepsis no-return proxy concern',
        }),
      ])
    );
    expect(JSON.stringify(t16Signal).toLowerCase()).not.toContain(certaintyPhrase);
  });

  it('keeps selected CP expansion boundaries narrow for SpO2, dizziness, and diabetes context', () => {
    const respiratoryBoundary = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 132, dbp: 84, hr: 106, rr: 28, temp: 37.4, glucose: 160 },
          {
            keluhan_utama: 'Sesak dan batuk',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak dan napas berat',
        spo2: 92,
        consciousness: 'alert',
      },
    });
    expect(
      respiratoryBoundary.clinicalIntelligence.selectedPatterns.map((item) => item.id)
    ).not.toContain('CP-014');

    const dizzinessOnly = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 170, dbp: 102, hr: 112, rr: 20, temp: 37.1, glucose: 145 },
          {
            keluhan_utama: 'Pusing',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Pusing dan tekanan darah tinggi',
        spo2: 97,
      },
    });
    expect(
      dizzinessOnly.clinicalIntelligence.selectedPatterns.map((item) => item.id)
    ).not.toContain('CP-063');

    const woundWithoutLongitudinalDiabetes = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 136, dbp: 86, hr: 104, rr: 22, temp: 38.4, glucose: 286 },
          {
            keluhan_utama: 'Demam luka kaki',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Luka kaki tampak infeksi',
        keluhanTambahan: 'Demam',
        spo2: 97,
      },
    });
    expect(
      woundWithoutLongitudinalDiabetes.clinicalIntelligence.selectedPatterns.map((item) => item.id)
    ).not.toContain('CP-066');

    const alteredConsciousnessWithoutElderlyAge = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 134, dbp: 84, hr: 102, rr: 22, temp: 37.9, glucose: 168 },
          {
            keluhan_utama: 'Bingung dan demam',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Bingung sejak pagi',
        keluhanTambahan: 'Demam ringan',
        spo2: 97,
        consciousness: 'voice',
        ageYears: 64,
      },
    });
    expect(
      alteredConsciousnessWithoutElderlyAge.clinicalIntelligence.selectedPatterns.map(
        (item) => item.id
      )
    ).not.toContain('CP-064');
  });

  it('adds longitudinal trajectory signals for poor response, elderly risk, readmission, and DM renal baseline', () => {
    const visits: VisitRecord[] = [
      makeVisit(
        1,
        { sbp: 132, dbp: 84, hr: 80, rr: 18, temp: 36.9, glucose: 188 },
        {
          keluhan_utama: 'Kontrol DM',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 138, dbp: 86, hr: 96, rr: 20, temp: 37.4, glucose: 224 },
        {
          keluhan_utama: 'Kontrol ginjal dan gula',
          diagnosa: { icd_x: 'N18.9', nama: 'Penyakit ginjal kronik' },
          terapi_obat: 'Metformin, Captopril',
        }
      ),
      makeVisit(
        3,
        { sbp: 146, dbp: 92, hr: 118, rr: 24, temp: 38.1, glucose: 276 },
        {
          keluhan_utama: 'Demam batuk',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
      makeVisit(
        4,
        { sbp: 154, dbp: 96, hr: 150, rr: 30, temp: 38.9, glucose: 334 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
    ];

    const result = analyzeHybridTrajectory({
      visits,
      currentEncounter: {
        keluhanUtama: 'Sesak memberat dan lemas',
        keluhanTambahan: 'Demam masih tinggi',
        spo2: 91,
        ageYears: 74,
      },
    });

    expect(result.clinicalIntelligence.trajectorySignals.map((item) => item.id)).toEqual(
      expect.arrayContaining(['T-52', 'T-58', 'T-38', 'T-25'])
    );
    expect(result.clinicalIntelligence.trajectorySignals.map((item) => item.id)).not.toContain(
      'T-51'
    );
    expect(result.clinicalIntelligence.trajectorySignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'T-25',
          label: 'DM-to-renal baseline proxy',
          evidence: expect.arrayContaining([
            'Riwayat diabetes terdeteksi',
            'Riwayat CKD terdeteksi',
          ]),
        }),
        expect.objectContaining({
          id: 'T-38',
          label: '30-day readmission risk proxy',
          evidence: expect.arrayContaining([
            '4 kunjungan dalam 3 hari',
            'Diagnosis berulang 1 kali',
          ]),
        }),
        expect.objectContaining({
          id: 'T-58',
          label: 'Mortality risk usia lanjut proxy',
          evidence: expect.arrayContaining(['Usia 74 tahun']),
        }),
      ])
    );
    expect(result.redFlags.map((flag) => flag.id)).toEqual(
      expect.arrayContaining([
        'clinical-trajectory-t52',
        'clinical-trajectory-t58',
        'clinical-trajectory-t38',
        'clinical-trajectory-t25',
      ])
    );
    expect(
      result.redFlags
        .filter((flag) =>
          [
            'clinical-trajectory-t58',
            'clinical-trajectory-t38',
            'clinical-trajectory-t25',
          ].includes(flag.id)
        )
        .map((flag) => ({ id: flag.id, source: flag.source, severity: flag.severity }))
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clinical-trajectory-t58',
          source: 'history',
          severity: expect.not.stringMatching(/^critical$/),
        }),
        expect.objectContaining({
          id: 'clinical-trajectory-t38',
          source: 'history',
          severity: expect.not.stringMatching(/^critical$/),
        }),
        expect.objectContaining({
          id: 'clinical-trajectory-t25',
          source: 'history',
          severity: expect.not.stringMatching(/^critical$/),
        }),
      ])
    );
    expect(
      JSON.stringify(result.clinicalIntelligence.trajectorySignals).toLowerCase()
    ).not.toContain(certaintyPhrase);
  });

  it('produces compare-mode evaluation notes when data quality limits confidence', () => {
    const visits: VisitRecord[] = [
      makeVisit(
        1,
        { sbp: 148, dbp: 92, hr: 0, rr: 0, temp: 0, glucose: 0 },
        {
          keluhan_utama: '',
          diagnosa: undefined,
          terapi_obat: undefined,
        }
      ),
    ];

    const comparison = compareTrajectoryEngines({
      visits,
      currentEncounter: {
        keluhanUtama: '',
      },
    });

    expect(comparison.evaluationReport.some((line) => line.startsWith('Old engine:'))).toBe(true);
    expect(comparison.evaluationReport.some((line) => line.startsWith('Jewel physiology:'))).toBe(
      true
    );
    expect(comparison.evaluationReport.some((line) => line.startsWith('Hybrid final:'))).toBe(true);
    expect(comparison.confidenceLimits.length).toBeGreaterThan(0);
    expect(comparison.evaluationReport.some((line) => line.startsWith('LIMIT: '))).toBe(true);
  });

  it('labels stable compare-mode cases as AGREE when engines stay aligned', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 124, dbp: 80, hr: 78, rr: 18, temp: 36.7, glucose: 118 }),
      makeVisit(2, { sbp: 126, dbp: 82, hr: 80, rr: 18, temp: 36.8, glucose: 120 }),
      makeVisit(3, { sbp: 125, dbp: 81, hr: 79, rr: 18, temp: 36.8, glucose: 119 }),
    ];

    const comparison = compareTrajectoryEngines({
      visits,
      currentEncounter: {
        keluhanUtama: 'Kontrol rutin',
        spo2: 98,
      },
    });

    expect(comparison.agreement.length).toBeGreaterThan(0);
    expect(comparison.evaluationReport.some((line) => line.startsWith('AGREE: '))).toBe(true);
  });

  it('labels worsening physiology/context cases as UPGRADE when hybrid adds concern', () => {
    const visits: VisitRecord[] = [
      makeVisit(
        1,
        { sbp: 138, dbp: 88, hr: 92, rr: 20, temp: 37.2, glucose: 178 },
        {
          keluhan_utama: 'Batuk ringan',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 154, dbp: 96, hr: 104, rr: 23, temp: 38.1, glucose: 246 },
        {
          keluhan_utama: 'Demam dan sesak',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        3,
        { sbp: 168, dbp: 106, hr: 116, rr: 28, temp: 38.9, glucose: 318 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
    ];

    const comparison = compareTrajectoryEngines({
      visits,
      currentEncounter: {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Demam',
        spo2: 91,
      },
    });

    expect(comparison.upgrades.length).toBeGreaterThan(0);
    expect(comparison.evaluationReport.some((line) => line.startsWith('UPGRADE: '))).toBe(true);
  });
});

describe('hybrid-trajectory current-encounter NEWS2 inputs', () => {
  it('maps the observed ACVPU letter to the Symphony consciousness level', () => {
    expect(avpuToConsciousness('A')).toBe('alert');
    expect(avpuToConsciousness('C')).toBe('confusion');
    expect(avpuToConsciousness('V')).toBe('voice');
    expect(avpuToConsciousness('P')).toBe('pain');
    expect(avpuToConsciousness('U')).toBe('unresponsive');
  });

  it('carries consciousness and supplemental oxygen into the latest visit only', () => {
    const visits: VisitRecord[] = [
      makeVisit(1, { sbp: 126, dbp: 80, hr: 78, rr: 18, temp: 36.7, glucose: 128 }),
      makeVisit(2, { sbp: 128, dbp: 82, hr: 80, rr: 18, temp: 36.8, glucose: 130 }),
    ];

    const adapted = adaptVisitRecordsToSymphonyVitals(visits, {
      consciousness: 'confusion',
      supplementalO2: true,
    });

    expect(adapted[0].supplementalO2).toBeUndefined();
    expect(adapted[1].consciousness).toBe('confusion');
    expect(adapted[1].supplementalO2).toBe(true);
  });
});
