import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatChartDate } from '../charts/chart-shared';

import { ClinicalReasoningDifferentialPanel } from './ClinicalReasoningDifferentialPanel';

import { analyzeHybridTrajectory } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import { buildTrajectoryVisualizationViewModel } from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const STABLE_VITALS = { sbp: 120, dbp: 80, hr: 78, rr: 16, temp: 36.6, glucose: 100 };

function makeVisit(index: number, keluhan: string): VisitRecord {
  const base = new Date('2026-03-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-NARR-001',
    encounter_id: `narr-enc-${index}`,
    timestamp: new Date(base + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
    vitals: STABLE_VITALS,
    keluhan_utama: keluhan,
    source: 'scrape',
  };
}

function renderNarrative(visits: VisitRecord[], keluhanUtama: string) {
  const hybridResult = analyzeHybridTrajectory({ visits, currentEncounter: { keluhanUtama } });
  render(
    <ClinicalReasoningDifferentialPanel
      hybridResult={hybridResult}
      viewModel={buildTrajectoryVisualizationViewModel(hybridResult)}
    />
  );
  return { hybridResult, narrative: screen.getByTestId('clinical-review-narrative').textContent };
}

describe('ClinicalReasoningDifferentialPanel review narrative', () => {
  it('explains the complaint, the visit it started at, and advises the ABCD primary survey', () => {
    const visits = [
      makeVisit(1, 'Kontrol rutin'),
      makeVisit(2, 'Kontrol rutin'),
      makeVisit(3, 'Nyeri dada kiri'),
      makeVisit(4, 'Nyeri dada dan sesak'),
    ];

    const { narrative } = renderNarrative(visits, 'Nyeri dada dan sesak');

    expect(narrative).toContain('Pada pasien ditemukan adanya keluhan kardiopulmoner iskemik.');
    expect(narrative).toContain(
      `Keluhan ini muncul sejak kunjungan ke-3 (${formatChartDate(visits[2].timestamp)}).`
    );
    expect(narrative).toContain(
      'Keluhan nyeri dada/sesak perlu membentuk prioritas review walau fisiologi belum ekstrem.'
    );
    expect(narrative).toContain(
      'Sentra menyarankan survei primer A-B-C-D (Airway, Breathing, Circulation, Disability).'
    );
  });

  it('says the complaint appears only on the current visit when no earlier visit recorded it', () => {
    const { narrative } = renderNarrative(
      [makeVisit(1, 'Kontrol rutin'), makeVisit(2, 'Kontrol rutin')],
      'Nyeri dada sejak pagi'
    );

    expect(narrative).toContain('Keluhan ini tercatat pada kunjungan saat ini.');
    expect(narrative).toContain('survei primer A-B-C-D');
  });

  it('leaves out the ABCD advice when there is no complaint signal and the trajectory is not worsening', () => {
    const { hybridResult, narrative } = renderNarrative(
      [makeVisit(1, 'Kontrol rutin'), makeVisit(2, 'Kontrol rutin'), makeVisit(3, 'Kontrol rutin')],
      'Kontrol rutin'
    );

    expect(hybridResult.clinicalContext.complaintSignals).toHaveLength(0);
    expect(hybridResult.integratedAssessment.finalState).toMatch(/stable|improving/);
    expect(narrative).not.toContain('A-B-C-D');
    expect(narrative).toContain('Belum ada sinyal keluhan yang menonjol');
  });
});
