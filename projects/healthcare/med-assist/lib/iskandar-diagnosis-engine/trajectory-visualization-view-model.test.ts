import { describe, expect, it } from 'vitest';

import { analyzeHybridTrajectory } from './hybrid-trajectory';
import { findForbiddenPhysicianTrajectoryTerms } from './presentation-safety';
import {
  buildTrajectoryVisualizationViewModel,
  type TrajectoryVisualizationViewModel,
} from './trajectory-visualization-view-model';
import type { VisitRecord } from './visit-history-store';

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-VM-001',
    encounter_id: `enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

function serializeViewModel(viewModel: TrajectoryVisualizationViewModel): string {
  return JSON.stringify(viewModel);
}

describe('trajectory-visualization-view-model', () => {
  it('builds chart-ready stable trajectory output without forbidden physician-facing terms', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 124, dbp: 80, hr: 78, rr: 18, temp: 36.7, glucose: 116 }),
        makeVisit(2, { sbp: 126, dbp: 82, hr: 80, rr: 18, temp: 36.8, glucose: 118 }),
        makeVisit(3, { sbp: 125, dbp: 81, hr: 79, rr: 18, temp: 36.8, glucose: 117 }),
      ],
      currentEncounter: {
        keluhanUtama: 'Kontrol rutin',
        spo2: 98,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);
    const serialized = serializeViewModel(viewModel);

    expect(viewModel.trajectoryTimeline).toHaveLength(3);
    expect(viewModel.trajectoryTimeline.at(-1)?.state).toBe('stable');
    expect(viewModel.vitalTrends).toHaveLength(3);
    expect(viewModel.baselineAvailability.available).toBe(true);
    expect(
      viewModel.baselineDeviation.some((item) => item.deviationLabel === 'within_baseline')
    ).toBe(true);
    expect(findForbiddenPhysicianTrajectoryTerms(serialized)).toEqual([]);
  });

  it('builds worsening trajectory output with high-concern timeline and driver contributions', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 },
          {
            keluhan_utama: 'Batuk ringan',
            diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
            terapi_obat: 'Metformin 500mg',
          }
        ),
        makeVisit(
          2,
          { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 },
          {
            keluhan_utama: 'Demam dan sesak',
            diagnosa: { icd_x: 'I20', nama: 'Angina pektoris' },
            terapi_obat: 'Clopidogrel, Metformin',
          }
        ),
        makeVisit(
          3,
          { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 },
          {
            keluhan_utama: 'Nyeri dada berat',
            diagnosa: { icd_x: 'I21.9', nama: 'Acute myocardial infarction' },
            terapi_obat: 'Clopidogrel, Nitrat, Furosemide, Metformin',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Mual, demam',
        spo2: 91,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);

    expect(['high_concern', 'critical_concern']).toContain(
      viewModel.trajectoryTimeline.at(-1)?.state
    );
    expect(viewModel.keyDriverContributions.length).toBeGreaterThan(0);
    expect(viewModel.keyDriverContributions[0]?.severity).toBe('high');
    expect(viewModel.mortalityProxy.score).toBeGreaterThan(0);
    expect(['low', 'moderate', 'high', 'very_high']).toContain(viewModel.mortalityProxy.tier);
    expect(['low', 'moderate', 'high', 'immediate']).toContain(
      viewModel.mortalityProxy.clinicalUrgencyTier
    );
    expect(viewModel.timeToCritical.length).toBeGreaterThan(0);
    expect(viewModel.timeToCritical[0]?.hoursBestEstimate).toBeGreaterThan(0);
    expect(
      viewModel.vitalTrendMeta.primaryVitalDrivers.some((item) =>
        ['Tekanan darah sistolik', 'Nadi', 'Laju napas', 'SpO2', 'Glukosa'].includes(item)
      )
    ).toBe(true);
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('surfaces clinical intelligence red flags as chart drivers without adding empty labels', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 132, dbp: 84, hr: 88, rr: 18, temp: 36.9, glucose: 144 }),
        makeVisit(2, { sbp: 118, dbp: 76, hr: 104, rr: 22, temp: 38.1, glucose: 178 }),
        makeVisit(3, { sbp: 96, dbp: 62, hr: 124, rr: 29, temp: 38.7, glucose: 224 }),
      ],
      currentEncounter: {
        keluhanUtama: 'Demam dan sesak memberat',
        keluhanTambahan: 'Batuk dan tampak lemas',
        spo2: 90,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);
    const driverLabels = viewModel.keyDriverContributions.map((item) => item.driver);

    expect(driverLabels).toEqual(expect.arrayContaining(['Hemodynamic instability concern']));
    expect(driverLabels.some((label) => /respirasi/i.test(label))).toBe(true);
    expect(viewModel.keyDriverContributions.some((item) => /CP-013/.test(item.explanation))).toBe(
      true
    );
    expect(
      viewModel.keyDriverContributions.every(
        (item) => item.driver.trim() && item.explanation.trim()
      )
    ).toBe(true);
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('preserves acute trajectory signal ids in UI-facing evidence after red flag mapping', () => {
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

    const viewModel = buildTrajectoryVisualizationViewModel(result);
    const driverEvidence = viewModel.keyDriverContributions
      .map((item) => item.explanation)
      .join('\n');

    expect(result.clinicalIntelligence.trajectorySignals.map((item) => item.id)).toEqual(
      expect.arrayContaining(['T-45', 'T-46', 'T-50', 'T-54', 'T-16'])
    );
    expect(driverEvidence).toMatch(/T-45/);
    expect(driverEvidence).toMatch(/T-46/);
    expect(viewModel.priorityTrajectoryCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'T-50',
          status: 'active',
          evidence: expect.arrayContaining([expect.stringMatching(/T-50|NEWS2/)]),
        }),
        expect.objectContaining({
          id: 'T-54',
          status: 'active',
          evidence: expect.arrayContaining([expect.stringMatching(/T-54|Suhu|CP-003/)]),
        }),
        expect.objectContaining({
          id: 'T-16',
          status: 'active',
          evidence: expect.arrayContaining([expect.stringMatching(/T-16|CP-002|sepsis/i)]),
        }),
      ])
    );
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('preserves selected CP expansion evidence in UI-facing coverage', () => {
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

    const viewModel = buildTrajectoryVisualizationViewModel(result);

    expect(result.clinicalIntelligence.selectedPatterns.map((item) => item.id)).toEqual(
      expect.arrayContaining(['CP-014', 'CP-063', 'CP-064', 'CP-066'])
    );
    expect(viewModel.priorityTrajectoryCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'T-13',
          status: 'active',
          evidence: expect.arrayContaining([expect.stringMatching(/CP-014|CP-063/)]),
        }),
        expect.objectContaining({
          id: 'T-58',
          status: 'active',
          evidence: expect.arrayContaining([expect.stringMatching(/CP-064/)]),
        }),
        expect.objectContaining({
          id: 'T-25',
          status: 'supported',
          evidence: expect.arrayContaining([expect.stringMatching(/CP-066/)]),
        }),
      ])
    );
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('surfaces treatment response good evidence as a driver without turning it into a red flag', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 132, dbp: 84, hr: 80, rr: 18, temp: 36.9, glucose: 144 }),
        makeVisit(2, { sbp: 136, dbp: 86, hr: 120, rr: 21, temp: 37.9, glucose: 188 }),
        makeVisit(3, { sbp: 134, dbp: 84, hr: 122, rr: 21, temp: 37.6, glucose: 176 }),
        makeVisit(4, { sbp: 132, dbp: 82, hr: 123, rr: 20, temp: 37.2, glucose: 164 }),
      ],
      currentEncounter: {
        keluhanUtama: 'Kontrol ulang setelah terapi',
        keluhanTambahan: 'Keluhan membaik',
        spo2: 97,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);

    expect(result.clinicalIntelligence.trajectorySignals.map((item) => item.id)).toContain('T-51');
    expect(result.clinicalIntelligence.trajectorySignals.map((item) => item.id)).not.toContain(
      'T-52'
    );
    expect(result.redFlags.map((flag) => flag.id)).not.toContain('clinical-trajectory-t51');
    expect(
      viewModel.keyDriverContributions.some(
        (item) => item.driver === 'Respons terapi baik' && /T-51/.test(item.explanation)
      )
    ).toBe(true);
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('keeps treatment response good separate from acute deterioration drivers', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(1, { sbp: 132, dbp: 84, hr: 80, rr: 18, temp: 36.9, glucose: 144 }),
        makeVisit(2, { sbp: 136, dbp: 86, hr: 120, rr: 21, temp: 37.9, glucose: 188 }),
        makeVisit(
          3,
          { sbp: 94, dbp: 60, hr: 122, rr: 28, temp: 38.6, glucose: 176 },
          {
            keluhan_utama: 'Demam, sesak, lemas',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
        makeVisit(
          4,
          { sbp: 90, dbp: 58, hr: 123, rr: 30, temp: 38.9, glucose: 164 },
          {
            keluhan_utama: 'Sesak memberat dan demam',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak memberat, demam, dan lemas',
        keluhanTambahan: 'Napas cepat',
        spo2: 91,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);
    const signalIds = result.clinicalIntelligence.trajectorySignals.map((item) => item.id);
    const driverEvidence = viewModel.keyDriverContributions
      .map((item) => `${item.driver}: ${item.explanation}`)
      .join('\n');

    expect(result.physiologicalResult.treatmentResponse.interpretation).toMatch(
      /effective|partially_effective/
    );
    expect(signalIds).toContain('T-51');
    expect(signalIds).not.toContain('T-52');
    expect(signalIds).toEqual(expect.arrayContaining(['T-45', 'T-46']));
    expect(driverEvidence).toMatch(/T-45|T-46|T-50|T-54|T-16/);
    expect(viewModel.priorityTrajectoryCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'T-51',
          status: 'supported',
          evidence: expect.arrayContaining([expect.stringMatching(/T-51|Respons terapi baik/)]),
        }),
      ])
    );
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('summarizes the 12 priority trajectory coverage without empty labels', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 132, dbp: 84, hr: 88, rr: 18, temp: 36.9, glucose: 188 },
          {
            diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
            terapi_obat: 'Metformin 500mg',
          }
        ),
        makeVisit(
          2,
          { sbp: 118, dbp: 76, hr: 104, rr: 22, temp: 38.1, glucose: 224 },
          {
            diagnosa: { icd_x: 'N18.9', nama: 'Penyakit ginjal kronik' },
            terapi_obat: 'Metformin, Captopril',
          }
        ),
        makeVisit(
          3,
          { sbp: 96, dbp: 62, hr: 124, rr: 29, temp: 38.7, glucose: 276 },
          {
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral',
          }
        ),
        makeVisit(
          4,
          { sbp: 90, dbp: 58, hr: 132, rr: 31, temp: 39.0, glucose: 334 },
          {
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak memberat dan lemas',
        keluhanTambahan: 'Demam masih tinggi',
        spo2: 89,
        ageYears: 74,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);

    expect(viewModel.priorityTrajectoryCoverage).toHaveLength(12);
    expect(viewModel.priorityTrajectoryCoverage.map((item) => item.id)).toEqual([
      'T-45',
      'T-46',
      'T-54',
      'T-50',
      'T-16',
      'T-59',
      'T-13',
      'T-52',
      'T-51',
      'T-25',
      'T-38',
      'T-58',
    ]);
    expect(
      viewModel.priorityTrajectoryCoverage.every(
        (item) =>
          item.label.trim() &&
          ['active', 'supported', 'inactive'].includes(item.status) &&
          item.evidence.length <= 3 &&
          new Set(item.evidence).size === item.evidence.length
      )
    ).toBe(true);
    expect(
      viewModel.priorityTrajectoryCoverage.filter((item) => item.status === 'active').length
    ).toBeGreaterThanOrEqual(6);
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('derives clinical timeline, risk trajectory, red-flag timeline, visit delta, and diagnostic evolution sections', () => {
    const result = analyzeHybridTrajectory({
      visits: [
        makeVisit(
          1,
          { sbp: 138, dbp: 86, hr: 88, rr: 18, temp: 36.9, glucose: 212 },
          {
            keluhan_utama: 'Kontrol diabetes',
            diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
            terapi_obat: 'Metformin 500mg',
          }
        ),
        makeVisit(
          2,
          { sbp: 148, dbp: 90, hr: 98, rr: 20, temp: 37.6, glucose: 238 },
          {
            keluhan_utama: 'Batuk dan demam',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral, Metformin',
          }
        ),
        makeVisit(
          3,
          { sbp: 160, dbp: 96, hr: 112, rr: 24, temp: 38.4, glucose: 286 },
          {
            keluhan_utama: 'Sesak, nyeri dada, dan bingung',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
            terapi_obat: 'Antibiotik oral, bronkodilator, Metformin',
          }
        ),
      ],
      currentEncounter: {
        keluhanUtama: 'Sesak, nyeri dada, bingung',
        keluhanTambahan: 'Batuk dan lemah',
        spo2: 91,
        consciousness: 'voice',
        ageYears: 72,
      },
    });

    result.longitudinalFrames[0] = {
      ...result.longitudinalFrames[0],
      complaint: '  Kontrol    diabetes  ',
      diagnosisLabel: '  Diabetes   melitus tipe 2  ',
      therapySummary: '  Metformin   500mg  ',
      trajectorySummary: {
        ...result.longitudinalFrames[0].trajectorySummary,
        overallTrend: 'insufficient_data',
        physiologyState: 'deteriorating',
      },
      hypothesisLabels: ['  Diabetes   melitus tipe 2  ', 'Pneumonia', 'Pneumonia'],
    };
    result.longitudinalFrames[1] = {
      ...result.longitudinalFrames[1],
      trajectorySummary: {
        ...result.longitudinalFrames[1].trajectorySummary,
        overallTrend: 'declining',
        physiologyState: 'deteriorating',
      },
    };
    result.longitudinalFrames[2] = {
      ...result.longitudinalFrames[2],
      hypothesisLabels: ['  Pneumonia  ', 'Pneumonia', 'Respiratory worsening concern'],
    };

    const viewModel = buildTrajectoryVisualizationViewModel(result);
    expect(viewModel.clinicalTimeline).toBeDefined();
    expect(viewModel.riskTrajectory).toBeDefined();
    expect(viewModel.redFlagTimeline).toBeDefined();
    expect(viewModel.visitToVisitDelta).toBeDefined();
    expect(viewModel.diagnosticHypothesisEvolution).toBeDefined();
    const clinicalTimeline = viewModel.clinicalTimeline!;
    const riskTrajectory = viewModel.riskTrajectory!;
    const redFlagTimeline = viewModel.redFlagTimeline!;
    const visitToVisitDelta = viewModel.visitToVisitDelta!;
    const diagnosticHypothesisEvolution = viewModel.diagnosticHypothesisEvolution!;

    expect(clinicalTimeline).toHaveLength(3);
    expect(clinicalTimeline.map((item) => item.visitLabel)).toEqual([
      'Kunjungan 1',
      'Kunjungan 2',
      'Kunjungan 3',
    ]);
    expect(clinicalTimeline.map((item) => item.date)).toEqual([
      '2026-02-02',
      '2026-02-03',
      '2026-02-04',
    ]);
    expect(clinicalTimeline.map((item) => item.source)).toEqual([
      'scrape',
      'scrape',
      'scrape',
    ]);
    expect(clinicalTimeline[0]).toEqual(
      expect.objectContaining({
        visitLabel: 'Kunjungan 1',
        date: '2026-02-02',
        complaint: 'Kontrol diabetes',
        diagnosisLabel: 'Diabetes melitus tipe 2',
        therapySummary: 'Metformin 500mg',
        source: 'scrape',
      })
    );

    expect(riskTrajectory).toHaveLength(3);
    expect(riskTrajectory.map((item) => item.visitLabel)).toEqual([
      'Kunjungan 1',
      'Kunjungan 2',
      'Kunjungan 3',
    ]);
    expect(riskTrajectory[0]).toEqual(
      expect.objectContaining({
        date: '2026-02-02',
        overallTrend: 'Data belum cukup',
        physiologyState: 'Memburuk',
        momentumLabel: 'Titik awal trajectory',
      })
    );
    expect(riskTrajectory.at(-1)).toEqual(
      expect.objectContaining({
        visitLabel: 'Kunjungan 3',
        date: '2026-02-04',
        riskLevel: expect.stringMatching(/moderate|high|critical/i),
      })
    );

    expect(redFlagTimeline).toHaveLength(3);
    expect(redFlagTimeline.map((item) => item.visitLabel)).toEqual([
      'Kunjungan 1',
      'Kunjungan 2',
      'Kunjungan 3',
    ]);
    expect(redFlagTimeline.at(-1)?.redFlagLabels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/sesak|respira|shock|sepsis|pneumonia|hipoksia/i),
      ])
    );

    expect(visitToVisitDelta).toHaveLength(2);
    expect(visitToVisitDelta[0]?.vitalChanges).toEqual({
      spo2Delta: undefined,
      heartRateDelta: 10,
      respiratoryRateDelta: 2,
      temperatureDelta: 0.7,
      systolicBpDelta: 10,
      diastolicBpDelta: 4,
      glucoseDelta: 26,
    });
    expect(visitToVisitDelta[0]).toEqual(
      expect.objectContaining({
        fromVisitLabel: 'Kunjungan 1',
        toVisitLabel: 'Kunjungan 2',
        fromDate: '2026-02-02',
        toDate: '2026-02-03',
        summary: expect.stringMatching(/memburuk|naik|demam|respir/i),
      })
    );

    expect(diagnosticHypothesisEvolution).toHaveLength(3);
    expect(diagnosticHypothesisEvolution.map((item) => item.visitLabel)).toEqual([
      'Kunjungan 1',
      'Kunjungan 2',
      'Kunjungan 3',
    ]);
    expect(diagnosticHypothesisEvolution[0]).toEqual(
      expect.objectContaining({
        date: '2026-02-02',
        labels: ['Diabetes melitus tipe 2', 'Pneumonia'],
      })
    );
    expect(diagnosticHypothesisEvolution.at(-1)).toEqual(
      expect.objectContaining({
        visitLabel: 'Kunjungan 3',
        labels: ['Pneumonia', 'Respiratory worsening concern'],
      })
    );

    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });

  it('marks partial data as uncertainty and does not fabricate baseline when unavailable', () => {
    const result = analyzeHybridTrajectory({
      visits: [makeVisit(1, { sbp: 148, dbp: 92, hr: 0, rr: 0, temp: 0, glucose: 0 })],
      currentEncounter: {
        keluhanUtama: '',
        spo2: undefined,
      },
    });

    const viewModel = buildTrajectoryVisualizationViewModel(result);

    expect(viewModel.baselineAvailability.available).toBe(false);
    expect(viewModel.baselineAvailability.message).toContain('Baseline personal belum cukup');
    expect(viewModel.dataQualityWarnings.length).toBeGreaterThan(0);
    expect(viewModel.uncertaintyNotes.length).toBeGreaterThan(0);
    expect(viewModel.vitalTrendMeta.missingVitalWarnings.length).toBeGreaterThan(0);
    expect(viewModel.timeToCritical).toEqual([]);
    expect(
      viewModel.baselineDeviation.every(
        (item) => item.deviationLabel === 'unknown' && item.baseline === undefined
      )
    ).toBe(true);
    expect(findForbiddenPhysicianTrajectoryTerms(serializeViewModel(viewModel))).toEqual([]);
  });
});
