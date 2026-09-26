import { ClinicalTrajectory } from '@/components/clinical/ClinicalTrajectory';
import ThemeProvider from '@/components/providers/ThemeProvider';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { bootstrapThemeDocument } from '@/lib/theme-store';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../sidepanel/globals.css';
import '../sidepanel/style.css';

type PreviewCaseKey = 'stable' | 'worsening' | 'partial';

type PreviewScenario = {
  label: string;
  summary: string;
  keluhanUtama: string;
  keluhanTambahan?: string;
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    glucose: number;
  };
  visits: VisitRecord[];
};

function makeVisit(
  index: number,
  vitals: VisitRecord['vitals'],
  overrides: Partial<Omit<VisitRecord, 'vitals'>> = {}
): VisitRecord {
  const base = Date.now() - 4 * 24 * 60 * 60 * 1000;
  return {
    patient_id: 'RM-CT-PREVIEW',
    encounter_id: `preview-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
    ...overrides,
  };
}

const PREVIEW_CASES: Record<PreviewCaseKey, PreviewScenario> = {
  stable: {
    label: 'Kasus Stabil',
    summary: 'Riwayat relatif terkontrol untuk membuktikan V2 tetap aman pada pola stabil.',
    keluhanUtama: 'Kontrol hipertensi dan diabetes',
    keluhanTambahan: 'Tidak ada keluhan akut baru',
    vitals: {
      sbp: 138,
      dbp: 86,
      hr: 84,
      rr: 18,
      temp: 36.9,
      spo2: 98,
      glucose: 166,
    },
    visits: [
      makeVisit(1, { sbp: 142, dbp: 88, hr: 88, rr: 18, temp: 37.0, glucose: 172 }),
      makeVisit(
        2,
        { sbp: 140, dbp: 86, hr: 86, rr: 18, temp: 36.9, glucose: 169 },
        {
          diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
          terapi_obat: 'Amlodipine 5mg',
        }
      ),
      makeVisit(
        3,
        { sbp: 139, dbp: 86, hr: 84, rr: 18, temp: 36.9, glucose: 168 },
        {
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
    ],
  },
  worsening: {
    label: 'Kasus Memburuk',
    summary:
      'Riwayat menunjukkan worsening physiology dan context klinis untuk memunculkan panel hybrid.',
    keluhanUtama: 'Nyeri dada menjalar dan sesak',
    keluhanTambahan: 'Demam dan batuk',
    vitals: {
      sbp: 166,
      dbp: 104,
      hr: 112,
      rr: 24,
      temp: 38.2,
      spo2: 92,
      glucose: 286,
    },
    visits: [
      makeVisit(
        1,
        { sbp: 138, dbp: 88, hr: 92, rr: 20, temp: 37.1, glucose: 176 },
        {
          keluhan_utama: 'Kontrol diabetes',
          diagnosa: { icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500mg',
        }
      ),
      makeVisit(
        2,
        { sbp: 152, dbp: 96, hr: 104, rr: 22, temp: 38.0, glucose: 248 },
        {
          keluhan_utama: 'Demam dan sesak',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
      makeVisit(
        3,
        { sbp: 160, dbp: 102, hr: 110, rr: 24, temp: 38.4, glucose: 278 },
        {
          keluhan_utama: 'Sesak memberat',
          diagnosa: { icd_x: 'J18.9', nama: 'Pneumonia' },
          terapi_obat: 'Antibiotik oral',
        }
      ),
    ],
  },
  partial: {
    label: 'Data Parsial',
    summary:
      'Riwayat vital tidak lengkap untuk memastikan visualisasi menampilkan warning, bukan reassurance.',
    keluhanUtama: 'Lemas',
    keluhanTambahan: '',
    vitals: {
      sbp: 156,
      dbp: 100,
      hr: 0,
      rr: 0,
      temp: 0,
      spo2: 0,
      glucose: 0,
    },
    visits: [
      makeVisit(1, { sbp: 150, dbp: 94, hr: 0, rr: 0, temp: 0, glucose: 0 }),
      makeVisit(2, { sbp: 152, dbp: 96, hr: 0, rr: 0, temp: 0, glucose: 0 }),
      makeVisit(3, { sbp: 154, dbp: 98, hr: 0, rr: 0, temp: 0, glucose: 0 }),
    ],
  },
};

function parseBoolParam(value: string | null, fallback = false): boolean {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function readPreviewConfig() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseKey = (searchParams.get('case') || 'stable') as PreviewCaseKey;
  const selectedCase = PREVIEW_CASES[caseKey] || PREVIEW_CASES.stable;
  const hybrid = parseBoolParam(searchParams.get('hybrid'));
  const visualization = parseBoolParam(searchParams.get('visualization'));
  const v2 = parseBoolParam(searchParams.get('v2'));

  return {
    caseKey,
    selectedCase,
    hybrid,
    visualization,
    v2,
  };
}

function installRuntimeFlags(visualization: boolean) {
  (
    globalThis as typeof globalThis & {
      __SENTRA_FEATURE_FLAGS__?: Record<string, boolean>;
    }
  ).__SENTRA_FEATURE_FLAGS__ = {
    USE_HYBRID_TRAJECTORY_ENGINE: true,
    USE_TRAJECTORY_VISUALIZATION_PANEL: visualization,
    USE_CLINICAL_TRAJECTORY_V2: true,
  };
}

function PreviewHarness() {
  const config = readPreviewConfig();
  installRuntimeFlags(config.visualization);

  const currentCase = config.selectedCase;

  return (
    <div
      className={`sidepanel-shell min-h-screen overflow-x-hidden bg-[var(--sentra-bg)] text-[var(--text-main)] ${
        config.v2 ? 'ct-v2-preview-shell' : ''
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,208,145,0.06),transparent_60%)] pointer-events-none" />
      <div className="relative mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6">
        <div
          className={config.v2 ? 'ct-v2-preview-header mb-4 p-4' : 'neu-card-inset mb-4 p-4'}
          data-testid="clinical-trajectory-preview-header"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="ttv-label text-tertiary">Clinical Trajectory Preview Harness</div>
              <h1 className="text-lg font-semibold text-platinum">{currentCase.label}</h1>
              <p className="mt-1 text-small text-muted leading-relaxed">{currentCase.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="ct-neu-chip ct-neu-chip--muted">case={config.caseKey}</span>
              <span className="ct-neu-chip ct-neu-chip--muted">
                hybrid={config.hybrid ? 'on' : 'off'}
              </span>
              <span className="ct-neu-chip ct-neu-chip--muted">
                visualization={config.visualization ? 'on' : 'off'}
              </span>
              <span className="ct-neu-chip ct-neu-chip--muted">v2={config.v2 ? 'on' : 'off'}</span>
            </div>
          </div>
        </div>

        <ClinicalTrajectory
          vitals={currentCase.vitals}
          keluhanUtama={currentCase.keluhanUtama}
          keluhanTambahan={currentCase.keluhanTambahan}
          narrative={{
            keluhan_utama: currentCase.keluhanUtama,
            lama_sakit: config.caseKey === 'stable' ? 'kontrol berkala' : '2 hari',
            is_akut: config.caseKey !== 'stable',
            confidence: config.caseKey === 'partial' ? 0.52 : 0.84,
          }}
          alerts={[]}
          patientAge={57}
          patientGender="L"
          patientName="Tn. Sentra"
          patientRM="RM-CT-PREVIEW"
          prefetchedVisits={currentCase.visits}
          prefetchedDiagnostics={['OK']}
          prefetchedVisitStatus="ready"
          onBack={() => undefined}
        />
      </div>
    </div>
  );
}

bootstrapThemeDocument();

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ThemeProvider>
        <PreviewHarness />
      </ThemeProvider>
    </React.StrictMode>
  );
}
