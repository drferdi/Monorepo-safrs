import { analyzeHybridTrajectory } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import {
  buildTrajectoryVisualizationViewModel,
  type TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-PREVIEW-001',
    encounter_id: `preview-enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

function buildFixture(
  visits: VisitRecord[],
  currentEncounter: {
    keluhanUtama: string;
    keluhanTambahan?: string;
    spo2?: number;
  }
): TrajectoryVisualizationViewModel {
  return buildTrajectoryVisualizationViewModel(
    analyzeHybridTrajectory({
      visits,
      currentEncounter,
    })
  );
}

export const stableTrajectoryVisualizationFixture = buildFixture(
  [
    makeVisit(1, { sbp: 124, dbp: 80, hr: 78, rr: 18, temp: 36.7, glucose: 116 }),
    makeVisit(2, { sbp: 126, dbp: 82, hr: 80, rr: 18, temp: 36.8, glucose: 118 }),
    makeVisit(3, { sbp: 125, dbp: 81, hr: 79, rr: 18, temp: 36.8, glucose: 117 }),
  ],
  {
    keluhanUtama: 'Kontrol rutin',
    spo2: 98,
  }
);

export const worseningTrajectoryVisualizationFixture = buildFixture(
  [
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
  {
    keluhanUtama: 'Nyeri dada menjalar dan sesak',
    keluhanTambahan: 'Mual, demam',
    spo2: 91,
  }
);

export const partialTrajectoryVisualizationFixture = buildFixture(
  [makeVisit(1, { sbp: 148, dbp: 92, hr: 0, rr: 0, temp: 0, glucose: 0 })],
  {
    keluhanUtama: '',
    spo2: undefined,
  }
);

export const trajectoryVisualizationPreviewCases: Array<{
  id: 'stable' | 'worsening' | 'partial';
  label: string;
  summary: string;
  viewModel: TrajectoryVisualizationViewModel;
}> = [
  {
    id: 'stable',
    label: 'Stabil',
    summary: 'Kontrol rutin dengan baseline personal yang cukup dan perubahan ringan antar kunjungan.',
    viewModel: stableTrajectoryVisualizationFixture,
  },
  {
    id: 'worsening',
    label: 'Memburuk',
    summary: 'Vital memburuk dengan konteks keluhan, diagnosis, dan terapi yang meningkatkan prioritas review.',
    viewModel: worseningTrajectoryVisualizationFixture,
  },
  {
    id: 'partial',
    label: 'Data terbatas',
    summary: 'Data vital dan riwayat tidak lengkap, sehingga chart harus menonjolkan uncertainty dan missing data.',
    viewModel: partialTrajectoryVisualizationFixture,
  },
];
