import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { buildPhysicianTrajectoryHeadline } from './ClinicalTrajectoryHeader';
import { ClinicalTrajectoryV2 } from './ClinicalTrajectoryV2';

import { persistClinicalReasoningWorkflowAudit } from '@/lib/iskandar-diagnosis-engine';
import {
  analyzeHybridTrajectory,
  mapHybridTrajectoryToLegacyAnalysis,
  type HybridTrajectoryResult,
} from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import {
  buildPhysicianSafeTrajectoryPresentation,
  findForbiddenPhysicianTrajectoryTerms,
  type PhysicianSafeTrajectoryPresentation,
} from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import {
  buildTrajectoryVisualizationViewModel,
  type TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

vi.mock('@/lib/iskandar-diagnosis-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/iskandar-diagnosis-engine')>();
  return {
    ...actual,
    persistClinicalReasoningWorkflowAudit: vi.fn(actual.persistClinicalReasoningWorkflowAudit),
  };
});

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 960;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 320;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return 960;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return 320;
    },
  });

  HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      width: 960,
      height: 320,
      top: 0,
      left: 0,
      right: 960,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect;

  Element.prototype.animate = (() =>
    ({
      cancel() {},
      commitStyles() {},
      finished: Promise.resolve(),
      finish() {},
      id: '',
      oncancel: null,
      onfinish: null,
      onremove: null,
      pause() {},
      pending: false,
      play() {},
      playbackRate: 1,
      playState: 'finished',
      ready: Promise.resolve(),
      reverse() {},
      startTime: 0,
      currentTime: 0,
      timeline: null,
      effect: null,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      persist() {},
      replaceState: 'active',
      updatePlaybackRate() {},
    }) as unknown as Animation) as Element['animate'];
});

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = new Date('2026-02-01T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-V2-001',
    encounter_id: `v2-enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

function buildScenario(
  visits: VisitRecord[],
  currentEncounter: {
    keluhanUtama: string;
    keluhanTambahan?: string;
    spo2?: number;
    consciousness?: 'alert' | 'voice' | 'pain' | 'unresponsive' | 'unknown';
    ageYears?: number;
  }
): {
  hybridResult: HybridTrajectoryResult;
  physicianPresentation: PhysicianSafeTrajectoryPresentation;
  viewModel: TrajectoryVisualizationViewModel;
} {
  const hybridResult = analyzeHybridTrajectory({
    visits,
    currentEncounter,
  });
  const physicianPresentation = buildPhysicianSafeTrajectoryPresentation(
    mapHybridTrajectoryToLegacyAnalysis(hybridResult)
  );

  return {
    hybridResult,
    physicianPresentation,
    viewModel: buildTrajectoryVisualizationViewModel(hybridResult),
  };
}

const DEFAULT_PATIENT_CONTEXT = {
  name: 'Siti Rahmawati',
  gender: 'P' as const,
  age: 54,
  rm: 'RM-V2-001',
  dob: '1972-04-11',
  payerLabel: 'BPJS aktif',
  facilityName: 'Puskesmas Sentra',
  kelurahan: 'Cempaka Putih',
  visitCount: 4,
};

function renderTrajectoryV2(
  scenario: {
    hybridResult: HybridTrajectoryResult;
    physicianPresentation: PhysicianSafeTrajectoryPresentation;
    viewModel: TrajectoryVisualizationViewModel;
  },
  options?: {
    visitCount?: number;
    onOpenDifferential?: () => void;
    patientContext?: Partial<typeof DEFAULT_PATIENT_CONTEXT>;
  }
) {
  return render(
    <ClinicalTrajectoryV2
      hybridResult={scenario.hybridResult}
      viewModel={scenario.viewModel}
      physicianPresentation={scenario.physicianPresentation}
      canonicalOutput={null}
      canonicalError=""
      isCanonicalLoading={false}
      visitCount={options?.visitCount ?? scenario.viewModel.trajectoryTimeline.length}
      patientContext={{
        ...DEFAULT_PATIENT_CONTEXT,
        ...(options?.patientContext ?? {}),
      }}
      onOpenDifferential={options?.onOpenDifferential}
    />
  );
}

describe('ClinicalTrajectoryV2', () => {
  it('persists the reasoning audit once when re-rendered with the same props', () => {
    // A re-render with unchanged inputs must not write the audit again: every write fires
    // storage.onChanged, which re-renders the side panel and would loop without end.
    const persistAudit = vi.mocked(persistClinicalReasoningWorkflowAudit);
    const scenario = buildScenario(
      [
        makeVisit(1, { sbp: 130, dbp: 85, hr: 88, rr: 18, temp: 36.8, glucose: 110 }),
        makeVisit(2, { sbp: 150, dbp: 95, hr: 104, rr: 22, temp: 37.2, glucose: 120 }),
      ],
      { keluhanUtama: 'Nyeri dada dan sesak' }
    );
    persistAudit.mockClear();

    const { rerender } = renderTrajectoryV2(scenario);
    const callsAfterMount = persistAudit.mock.calls.length;
    rerender(
      <ClinicalTrajectoryV2
        hybridResult={scenario.hybridResult}
        viewModel={scenario.viewModel}
        physicianPresentation={scenario.physicianPresentation}
        canonicalOutput={null}
        canonicalError=""
        isCanonicalLoading={false}
        visitCount={scenario.viewModel.trajectoryTimeline.length}
        patientContext={DEFAULT_PATIENT_CONTEXT}
      />
    );

    expect(callsAfterMount).toBe(1);
    expect(persistAudit).toHaveBeenCalledTimes(1);
  });

  it('renders a single-flow physician briefing without stacked cards or duplicate patient identity', () => {
    const scenario = buildScenario(
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

    const { container } = renderTrajectoryV2(scenario, { visitCount: 4 });

    const chartSection = screen.getByTestId('trajectory-chart-tabs');
    const statusRow = screen.getByTestId('clinical-trajectory-status-strip');
    const header = screen.getByTestId('clinical-trajectory-v2-header');
    const reasoningPanel = screen.getByTestId('clinical-reasoning-differential-panel');
    const evidenceDrawer = screen.getByTestId('clinical-evidence-drawer');
    const auditTrail = screen.getByTestId('clinical-reasoning-audit-trail');
    const timeline = auditTrail.querySelector('ol.ct-audit-timeline');
    expect(timeline).not.toBeNull();
    const events = Array.from((timeline as HTMLElement).querySelectorAll(':scope > li.ct-audit-timeline__event'));
    expect(events.length).toBeGreaterThan(0);
    expect(events.length).toBe(within(auditTrail).getAllByText(/^Step \d+$/).length);
    events.forEach((event) => expect(event.querySelector('.ct-audit-timeline__node')).not.toBeNull());
    const interpretation = within(header).getByText(
      /Trajektori menunjukkan|Trajektori relatif stabil/i
    );

    expect(screen.getByTestId('clinical-trajectory-v2')).toBeInTheDocument();
    expect(screen.getByTestId('clinical-reasoning-workbench')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Clinical Trajectory' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sentra Assist')).not.toBeInTheDocument();
    expect(screen.queryByText('Patient briefing')).not.toBeInTheDocument();
    expect(screen.queryByText('Siti Rahmawati')).not.toBeInTheDocument();
    expect(screen.queryByText(/54 tahun/i)).not.toBeInTheDocument();
    expect(within(statusRow).getByText(/Perlu perhatian|Stabil|Pantau|Prioritas tinggi/i)).toBeInTheDocument();
    expect(within(statusRow).getByText(/Memburuk|Tetap|Membaik|Eskalasi/i)).toBeInTheDocument();
    expect(
      within(statusRow).getByText(/Mendesak|Rutin|Hari ini|Tinjau sekarang/i)
    ).toBeInTheDocument();
    expect(interpretation).toHaveStyle({ marginBottom: '8px' });
    expect(
      statusRow.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      header.compareDocumentPosition(chartSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(within(chartSection).queryByText(/^Trajectory$/i)).not.toBeInTheDocument();
    expect(
      within(chartSection).queryByRole('button', {
        name: /evidence map|buka review trajectory lengkap/i,
      })
    ).not.toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Linimasa Klinis Pasien' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(chartSection).getByRole('tab', {
        name: 'Kurva Risiko / Perburukan',
      })
    ).toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Tren Tanda Vital' })
    ).toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Linimasa Tanda Bahaya' })
    ).toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Selisih Antar Kunjungan' })
    ).toBeInTheDocument();
    expect(
      within(chartSection).getByRole('tab', { name: 'Evolusi Hipotesis Diagnosis' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-chart-tabpanel-clinical-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-clinical-timeline-panel')).toBeInTheDocument();
    expect(screen.queryByText('Hero trajectory chart')).not.toBeInTheDocument();
    expect(screen.queryByText('Grafik trajectory compact')).not.toBeInTheDocument();
    expect(screen.queryByText('Clinical interpretation')).not.toBeInTheDocument();
    expect(
      interpretation.textContent?.split('.').filter((part) => part.trim().length > 0).length
    ).toBeLessThanOrEqual(2);
    expect(within(reasoningPanel).getByText('Penjelasan')).toBeInTheDocument();
    const narrative = within(reasoningPanel).getByTestId('clinical-review-narrative');
    const { complaintSignals, historicalDiagnosisSignals, therapySignals } =
      scenario.hybridResult.clinicalContext;
    expect(narrative).toHaveTextContent(
      `Pada pasien ditemukan adanya ${complaintSignals[0].label.toLowerCase()}.`
    );
    expect(narrative).toHaveTextContent(/Tren tanda vital/);
    expect(narrative).toHaveTextContent(historicalDiagnosisSignals[0].label);
    expect(narrative).toHaveTextContent(therapySignals[0].label);
    expect(within(reasoningPanel).getByText('Physician action')).toBeInTheDocument();
    expect(
      within(reasoningPanel).getByText('Select a working diagnosis to unlock therapy support.')
    ).toBeInTheDocument();
    expect(
      within(reasoningPanel).getByRole('button', { name: 'Diagnosis review unavailable' })
    ).toBeDisabled();
    expect(evidenceDrawer).not.toHaveAttribute('open');
    expect(auditTrail).not.toHaveAttribute('open');
    expect(
      screen.queryByText(/trajectory_evidence|therapy_reasoning|differential_review/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/therapy plan|probability|percentage/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Catatan Keselamatan')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Pattern' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Vitals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Signals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Risk' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Time window' })).not.toBeInTheDocument();
    expect(screen.queryByText('Vital trend summary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review details' })).toBeInTheDocument();
    expect(
      within(screen.getByTestId('clinical-trajectory-v2')).queryByRole('button', {
        name: /evidence/i,
      })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('clinical-review-details')).toHaveClass('ct-v2-panel--secondary');
    expect(evidenceDrawer).toHaveClass('ct-v2-panel--secondary');
    expect(screen.queryByText(scenario.physicianPresentation.summary)).not.toBeInTheDocument();
    fireEvent.click(within(evidenceDrawer).getByText('Evidence map'));
    expect(evidenceDrawer).toHaveAttribute('open');
    expect(evidenceDrawer.querySelector('.ct-v2-evidence-grid')).not.toBeNull();
    expect(evidenceDrawer.querySelectorAll('.ct-v2-detail-card--wide').length).toBeGreaterThan(0);
    expect(screen.getByText('Diagnosis historis')).toBeInTheDocument();
    expect(reasoningPanel.querySelector('.ct-v2-copy-detail')).not.toBeNull();
    expect(evidenceDrawer.querySelector('.ct-v2-copy-label')).not.toBeNull();
    expect(evidenceDrawer.querySelector('.ct-v2-copy-detail')).not.toBeNull();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('fails closed when rendered directly with fewer than 2 unique longitudinal points', () => {
    const scenario = buildScenario(
      [makeVisit(1, { sbp: 148, dbp: 92, hr: 0, rr: 0, temp: 0, glucose: 0 })],
      {
        keluhanUtama: '',
        spo2: undefined,
      }
    );

    const { container } = renderTrajectoryV2(scenario, { visitCount: 1 });

    expect(screen.getByTestId('clinical-trajectory-v2-guarded')).toBeInTheDocument();
    expect(screen.getByText('Data trajectory belum cukup')).toBeInTheDocument();
    expect(
      screen.getByText(/minimal 2 titik kunjungan unik sebelum review klinis ditampilkan/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('clinical-trajectory-v2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-chart-tabs')).not.toBeInTheDocument();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('surfaces missing age and consciousness as physician-facing data-quality limitations', () => {
    const scenario = buildScenario(
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

    renderTrajectoryV2(scenario, { visitCount: 3 });

    expect(
      screen.getByText('Usia pasien belum tersedia untuk kalibrasi trajectory.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Status kesadaran belum tersedia untuk review klinis.')
    ).toBeInTheDocument();
  });

  it('fails closed before opening evidence when no longitudinal basis exists', () => {
    const scenario = buildScenario(
      [makeVisit(1, { sbp: 124, dbp: 80, hr: 0, rr: 0, temp: 0, glucose: 0 })],
      {
        keluhanUtama: '',
        spo2: undefined,
      }
    );

    renderTrajectoryV2(scenario, { visitCount: 1 });

    expect(screen.getByTestId('clinical-trajectory-v2-guarded')).toBeInTheDocument();
    expect(screen.getByText('Data trajectory belum cukup')).toBeInTheDocument();
    expect(screen.queryByTestId('clinical-evidence-drawer')).not.toBeInTheDocument();
  });

  it('keeps the main interpretation to one decision sentence and moves supporting context outside the header copy', () => {
    const scenario = buildScenario(
      [
        makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
        makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
        makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
      ],
      {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Mual, demam',
        spo2: 91,
      }
    );

    renderTrajectoryV2(scenario, { visitCount: 4 });

    const header = screen.getByTestId('clinical-trajectory-v2-header');
    const headline = buildPhysicianTrajectoryHeadline(
      scenario.hybridResult,
      scenario.physicianPresentation
    );

    expect(header.querySelectorAll('p')).toHaveLength(1);
    expect(
      within(header).getByText(/Trajektori menunjukkan|Trajektori relatif stabil/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(headline.mainConcern)).not.toBeInTheDocument();
    expect(screen.getByText(/kunjungan ditinjau/i)).toBeInTheDocument();
  });

  it('renders T-13 respiratory collapse evidence from CP-014 through the collapsed evidence map', () => {
    const scenario = buildScenario(
      [
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
      {
        keluhanUtama: 'Sesak berat, napas cepat, sulit bicara',
        keluhanTambahan: 'Tampak lemas',
        spo2: 91,
      }
    );

    expect(
      scenario.hybridResult.clinicalIntelligence.selectedPatterns.map((item) => item.id)
    ).toEqual(expect.arrayContaining(['CP-014']));
    expect(
      scenario.hybridResult.clinicalIntelligence.trajectorySignals.map((item) => item.id)
    ).toEqual(expect.arrayContaining(['T-13', 'T-45']));
    expect(
      scenario.viewModel.keyDriverContributions.some(
        (item) =>
          item.driver === 'Imminent cardiac arrest proxy concern' &&
          /T-13/.test(item.explanation) &&
          /Selected CP CP-014/.test(item.explanation)
      )
    ).toBe(true);

    const { container } = renderTrajectoryV2(scenario, { visitCount: 3 });

    const evidenceDrawer = screen.getByTestId('clinical-evidence-drawer');
    fireEvent.click(within(evidenceDrawer).getByText('Evidence map'));

    expect(screen.getByText('Imminent cardiac arrest proxy concern')).toBeInTheDocument();
    expect(screen.getByText(/T-13:.*Selected CP CP-014/i)).toBeInTheDocument();
    expect(screen.getByText('Respiratory worsening concern')).toBeInTheDocument();
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
  });

  it('surfaces CP-linked priority trajectory evidence for CP-014, CP-063, CP-064, and CP-066 in the V2 evidence layer', () => {
    const scenario = buildScenario(
      [
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
      {
        keluhanUtama: 'Sesak berat, nyeri dada, bingung, luka kaki diabetes tampak infeksi',
        keluhanTambahan: 'Sulit bicara dan napas berat',
        spo2: 91,
        consciousness: 'voice',
        ageYears: 72,
      }
    );

    expect(
      scenario.hybridResult.clinicalIntelligence.selectedPatterns.map((item) => item.id)
    ).toEqual(expect.arrayContaining(['CP-014', 'CP-063', 'CP-064', 'CP-066']));

    renderTrajectoryV2(scenario, { visitCount: 3 });

    const evidenceDrawer = screen.getByTestId('clinical-evidence-drawer');
    fireEvent.click(within(evidenceDrawer).getByText('Evidence map'));

    const priorityEvidence = within(evidenceDrawer).getByTestId(
      'priority-clinical-pattern-evidence'
    );
    expect(
      within(priorityEvidence).getByText('Priority clinical pattern evidence')
    ).toBeInTheDocument();
    expect(within(priorityEvidence).getByText(/CP-014/i)).toBeInTheDocument();
    expect(within(priorityEvidence).getByText(/CP-063/i)).toBeInTheDocument();
    expect(within(priorityEvidence).getByText(/CP-064/i)).toBeInTheDocument();
    expect(within(priorityEvidence).getByText(/CP-066/i)).toBeInTheDocument();
  });

  it('exposes NEWS2, early-warning, shock index, and respiratory deterioration primitives in V2 evidence', () => {
    const scenario = buildScenario(
      [
        makeVisit(
          1,
          { sbp: 118, dbp: 76, hr: 96, rr: 22, temp: 37.9, glucose: 176 },
          {
            keluhan_utama: 'Demam dan batuk',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
        makeVisit(
          2,
          { sbp: 102, dbp: 68, hr: 118, rr: 26, temp: 38.7, glucose: 214 },
          {
            keluhan_utama: 'Sesak dan demam memberat',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
        makeVisit(
          3,
          { sbp: 92, dbp: 60, hr: 126, rr: 30, temp: 39.1, glucose: 248 },
          {
            keluhan_utama: 'Sesak berat, sulit bicara',
            diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          }
        ),
      ],
      {
        keluhanUtama: 'Sesak berat, demam tinggi, sulit bicara',
        keluhanTambahan: 'Tampak lemas dan batuk',
        spo2: 91,
      }
    );

    expect(scenario.hybridResult.clinicalIntelligence.news2.riskLevel).not.toBe('low');
    expect(scenario.hybridResult.clinicalIntelligence.earlyWarnings.length).toBeGreaterThan(0);
    expect(scenario.hybridResult.clinicalIntelligence.shockIndex).toBeDefined();
    expect(
      scenario.hybridResult.clinicalIntelligence.trajectorySignals.map((item) => item.id)
    ).toContain('T-45');

    renderTrajectoryV2(scenario, { visitCount: 3 });

    const evidenceDrawer = screen.getByTestId('clinical-evidence-drawer');
    fireEvent.click(within(evidenceDrawer).getByText('Evidence map'));

    const primitives = screen.getByTestId('clinical-trajectory-primitives');
    expect(within(primitives).getByText(/NEWS2 aggregate/i)).toBeInTheDocument();
    expect(within(primitives).getByText(/^Shock Index /i)).toBeInTheDocument();
    expect(within(primitives).getByText('Respiratory deterioration evidence')).toBeInTheDocument();
    expect(within(primitives).getByText('qSOFA positif')).toBeInTheDocument();
  });

  it('keeps physician action safe and only enables diagnosis review when a handler exists', () => {
    const scenario = buildScenario(
      [
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
      {
        keluhanUtama: 'Sesak berat, napas cepat, sulit bicara',
        keluhanTambahan: 'Demam dan batuk produktif',
        spo2: 91,
      }
    );
    const onOpenDifferential = vi.fn();

    renderTrajectoryV2(scenario, { visitCount: 3, onOpenDifferential });

    const panel = screen.getByTestId('clinical-reasoning-differential-panel');
    const actionButton = within(panel).getByRole('button', { name: 'Open diagnosis review' });

    expect(
      within(panel).getByText('Select a working diagnosis to unlock therapy support.')
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('Therapy support locked until physician selection.')
    ).toBeInTheDocument();
    expect(within(panel).getByText('Working diagnosis required')).toBeInTheDocument();
    expect(actionButton).toBeEnabled();
    fireEvent.click(actionButton);
    expect(onOpenDifferential).toHaveBeenCalledTimes(1);
    expect(within(panel).queryByText(/confidence|probability|percentage/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/therapy plan/i)).not.toBeInTheDocument();
  });

  it('keeps only one chart surface in the default view', () => {
    const scenario = buildScenario(
      [
        makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
        makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
        makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
      ],
      {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Mual, demam',
        spo2: 91,
      }
    );

    renderTrajectoryV2(scenario, { visitCount: 4 });

    expect(screen.getByTestId('trajectory-chart-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-chart-tabpanel-clinical-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('trajectory-clinical-timeline-panel')).toBeInTheDocument();
    expect(screen.queryByText('Hero trajectory chart')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review details' })).toBeInTheDocument();
  });

  it('switches non-default trajectory tabs inside the parent composition', () => {
    const scenario = buildScenario(
      [
        makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
        makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
        makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
      ],
      {
        keluhanUtama: 'Nyeri dada menjalar dan sesak',
        keluhanTambahan: 'Mual, demam',
        spo2: 91,
      }
    );

    renderTrajectoryV2(scenario, { visitCount: 4 });

    const defaultTab = screen.getByRole('tab', { name: 'Linimasa Klinis Pasien' });
    const riskTab = screen.getByRole('tab', {
      name: 'Kurva Risiko / Perburukan',
    });
    const diagnosticTab = screen.getByRole('tab', {
      name: 'Evolusi Hipotesis Diagnosis',
    });

    fireEvent.click(riskTab);
    expect(riskTab).toHaveAttribute('aria-selected', 'true');
    expect(defaultTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('trajectory-risk-curve-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-clinical-timeline-panel')).not.toBeInTheDocument();

    fireEvent.click(diagnosticTab);
    expect(diagnosticTab).toHaveAttribute('aria-selected', 'true');
    expect(riskTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('trajectory-diagnostic-evolution-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('trajectory-risk-curve-panel')).not.toBeInTheDocument();
  });

  it('triggers a temporary clinical lens reveal when opening evidence or review details', () => {
    vi.useFakeTimers();
    try {
      const scenario = buildScenario(
        [
          makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
          makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
          makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
        ],
        {
          keluhanUtama: 'Nyeri dada menjalar dan sesak',
          keluhanTambahan: 'Mual, demam',
          spo2: 91,
        }
      );

      renderTrajectoryV2(scenario, { visitCount: 4 });

      const primaryCard = screen.getByTestId('clinical-trajectory-v2');
      const reviewDetails = screen.getByTestId('clinical-review-details');
      const evidenceDrawer = screen.getByTestId('clinical-evidence-drawer');

      expect(primaryCard).toHaveAttribute('data-clinical-lens-active', 'false');
      expect(reviewDetails).toHaveAttribute('data-clinical-lens-active', 'false');
      expect(evidenceDrawer).toHaveAttribute('data-clinical-lens-active', 'false');

      expect(
        within(primaryCard).queryByRole('button', { name: /evidence/i })
      ).not.toBeInTheDocument();
      fireEvent.click(within(evidenceDrawer).getByText('Evidence map'));

      expect(evidenceDrawer).toHaveAttribute('open');
      expect(primaryCard).toHaveAttribute('data-clinical-lens-active', 'false');
      expect(evidenceDrawer).toHaveAttribute('data-clinical-lens-active', 'false');

      fireEvent.click(screen.getByRole('button', { name: 'Review details' }));

      expect(reviewDetails).toHaveAttribute('open');
      expect(primaryCard).toHaveAttribute('data-clinical-lens-active', 'true');
      expect(primaryCard).toHaveAttribute('data-clinical-lens-target', 'details');
      expect(reviewDetails).toHaveAttribute('data-clinical-lens-active', 'true');
    } finally {
      vi.useRealTimers();
    }
  });
});
