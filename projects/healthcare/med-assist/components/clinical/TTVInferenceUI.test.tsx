import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (assetPath: string) => `chrome-extension://test${assetPath}`,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    },
  },
}));

import {
  buildAlerts,
  buildLastVisitSummaryRows,
  buildSummary,
  buildVisitHistorySections,
  formatVisitSummaryDate,
  TTVInferenceUI,
  type ScreeningAlert,
} from './TTVInferenceUI';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

afterEach(() => {
  vi.useRealTimers();
});

const makeState = (
  overrides: Partial<Parameters<typeof buildAlerts>[0]> = {}
): Parameters<typeof buildAlerts>[0] => ({
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  disabilityType: '',
  obesityConfirmation: '',
  autosenPreset: 'adl',
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
  ...overrides,
});

describe('buildAlerts geriatric screening', () => {
  it('builds CODE RED alerts from symptom phrase and critical vitals', () => {
    const alerts = buildAlerts(
      makeState({ symptomText: 'nyeri dada dan sesak berat', spo2: '89', rr: '32' }),
      { patientAge: 45 }
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'code_red_cue', severity: 'critical' }),
      ])
    );
  });

  it('builds preeclampsia and urgent pain alerts', () => {
    const alerts = buildAlerts(
      makeState({ sbp: '145', dbp: '92', pregnancyStatus: true, pain_score: '8' }),
      { patientAge: 30 }
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'preeclampsia_watch',
          title: 'WASPADA PREEKLAMPSIA',
          actionProtocolId: 'PROTO_PREECLAMPSIA_ECLAMPSIA',
        }),
        expect.objectContaining({ type: 'urgent_pain' }),
      ])
    );
  });

  it('links a hypertensive_crisis alert to PROTO_HTN_EMERGENCY', () => {
    const alerts = buildAlerts(makeState({ sbp: '166', dbp: '102' }), { patientAge: 45 });

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'hypertensive_crisis',
          actionProtocolId: 'PROTO_HTN_EMERGENCY',
        }),
      ])
    );
  });

  it('builds context-note alerts from obesity and disability dropdowns', () => {
    const alerts = buildAlerts(
      makeState({
        sbp: '130',
        dbp: '80',
        obesityConfirmation: 'morbid_obesity',
        disabilityType: 'Daksa',
      }),
      { patientAge: 45, patientGender: 'L' }
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'context_note', title: 'Validasi manset tensi' }),
        expect.objectContaining({ type: 'context_note', title: 'Risiko sleep apnea' }),
        expect.objectContaining({ type: 'context_note', title: 'Catatan antropometri' }),
      ])
    );
  });

  it('adds orthostatic screening prompt for older adults with compatible symptoms', () => {
    const alerts = buildAlerts(
      makeState({
        sbp: '104',
        dbp: '68',
        hr: '88',
        symptomText: 'Pusing saat berdiri, sempat hampir pingsan',
      }),
      { patientAge: 70 }
    );

    expect(alerts.some((alert) => alert.type === 'orthostatic_check')).toBe(true);
  });

  it('flags low-grade fever as geriatric concern when atypical infection cues are present', () => {
    const alerts = buildAlerts(
      makeState({
        temp: '37.5',
        rr: '22',
        spo2: '94',
        symptomText: 'Lemas, bingung, dan intake turun sejak kemarin',
      }),
      { patientAge: 76 }
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'geriatric_low_grade_fever',
          severity: 'high',
        }),
      ])
    );
  });

  it('keeps low-grade fever silent for non-geriatric adults', () => {
    const alerts = buildAlerts(
      makeState({
        temp: '37.5',
        symptomText: 'Lemas dan batuk',
      }),
      { patientAge: 35 }
    );

    expect(alerts.some((alert) => alert.type === 'geriatric_low_grade_fever')).toBe(false);
    expect(alerts.some((alert) => alert.type === 'geriatric_fever')).toBe(false);
  });

  it('resolves actionProtocolId for a legacy hypotension alert via the resolver', () => {
    const alerts = buildAlerts(makeState({ sbp: '85', dbp: '55', hr: '95' }), { patientAge: 45 });

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'hypotension', actionProtocolId: 'PROTO_SHOCK' }),
      ])
    );
  });
});

describe('TTVInferenceUI triage verdict callback', () => {
  it('reports a merah zone with a critical headline alert when a critical vital is controlled in', async () => {
    const onTriageVerdictChange = vi.fn();
    render(
      <TTVInferenceUI
        ttvState={makeState({ sbp: '60', dbp: '40', hr: '130' })}
        onTriageVerdictChange={onTriageVerdictChange}
        patientAge={45}
        patientGender="L"
      />
    );

    await waitFor(() => {
      expect(onTriageVerdictChange).toHaveBeenCalledWith(
        expect.objectContaining({ zone: 'merah' })
      );
    });
  });

  it('keeps triage standby when age is unknown even if adult-normal vitals are filled (failed OCR)', async () => {
    const onTriageVerdictChange = vi.fn();
    const onAlertsChange = vi.fn();
    render(
      <TTVInferenceUI
        ttvState={makeState({
          sbp: '120',
          dbp: '80',
          hr: '80',
          rr: '18',
          temp: '36.5',
          spo2: '98',
        })}
        onTriageVerdictChange={onTriageVerdictChange}
        onAlertsChange={onAlertsChange}
        patientAge={0}
        patientAgeKnown={false}
        patientGender="L"
      />
    );

    await waitFor(() => {
      expect(onTriageVerdictChange).toHaveBeenCalledWith(
        expect.objectContaining({ zone: 'standby', headlineAlert: null, sortedAlerts: [] })
      );
    });
    expect(onAlertsChange).toHaveBeenCalledWith([]);
  });
});

describe('buildSummary headline priority', () => {
  it('uses the headline alert (not array position) for Prioritas and Tindakan awal', () => {
    const criticalSecond: ScreeningAlert = {
      id: 'b',
      type: 'hypoglycemia',
      severity: 'critical',
      title: 'Hipoglikemia Berat',
      gate: 'GATE_3_GLUCOSE',
      reasoning: '-',
      recommendations: ['Berikan glukosa oral/IV segera.'],
    };
    const summary = buildSummary(
      makeState(),
      criticalSecond,
      {},
      { patientName: 'Test', patientGender: 'L', patientAge: 40, patientRM: 'RM-1' }
    );

    expect(summary).toContain('Prioritas: CRITICAL - Hipoglikemia Berat');
    expect(summary).toContain('Tindakan awal: Berikan glukosa oral/IV segera.');
  });

  it('falls back to STABLE messaging when there is no headline alert', () => {
    const summary = buildSummary(
      makeState(),
      null,
      {},
      {
        patientName: 'Test',
        patientGender: 'L',
        patientAge: 40,
        patientRM: 'RM-1',
      }
    );

    expect(summary).toContain('Prioritas: STABLE - belum ada alert prioritas tinggi');
    expect(summary).toContain(
      'Tindakan awal: lanjutkan observasi dan lengkapi data klinis bila perlu'
    );
  });
});

describe('visit summary helpers', () => {
  const makeVisit = (
    overrides: Partial<VisitRecord> = {},
    timestamp = '2026-03-25'
  ): VisitRecord => ({
    patient_id: '0001',
    encounter_id: `enc-${timestamp}`,
    timestamp,
    vitals: {
      sbp: 120,
      dbp: 80,
      hr: 88,
      rr: 18,
      temp: 36.8,
      glucose: 110,
    },
    keluhan_utama: 'Demam',
    source: 'scrape',
    ...overrides,
  });

  it('formats visit summary date for ISO visit history', () => {
    expect(formatVisitSummaryDate('2026-03-25')).toBe('25 Mar 2026');
  });

  it('builds summary rows from the latest previous visit', () => {
    const rows = buildLastVisitSummaryRows([
      makeVisit(
        {
          diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
          terapi_obat: 'Amlodipine 5 mg',
          dokter_penanganan: 'dr. Sentra Satu',
        },
        '2026-03-21'
      ),
      makeVisit(
        {
          diagnosa: { icd_x: 'E11', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500 mg',
          dokter_penanganan: 'dr. Sentra Dua',
        },
        '2026-03-25'
      ),
    ]);

    expect(rows).toEqual([
      { label: 'Kunjungan Sebelumnya', value: '25 Mar 2026' },
      { label: 'Diagnosa Sebelumnya', value: 'E11 — Diabetes melitus tipe 2' },
      { label: 'Obat / Terapi Sebelumnya', value: 'Metformin 500 mg' },
      { label: 'Dokter yang Menangani', value: 'dr. Sentra Dua' },
    ]);
  });

  it('builds up to three previous-visit sections with date, diagnosis, therapy, and doctor', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 17, 12, 0, 0));

    const sections = buildVisitHistorySections([
      makeVisit(
        {
          encounter_id: 'enc-1',
          diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
          terapi_obat: 'Amlodipine 5 mg',
          dokter_penanganan: 'dr. Sentra Satu',
        },
        '2026-03-21'
      ),
      makeVisit(
        {
          encounter_id: 'enc-2',
          diagnosa: { icd_x: 'E11', nama: 'Diabetes melitus tipe 2' },
          terapi_obat: 'Metformin 500 mg',
          dokter_penanganan: 'dr. Sentra Dua',
        },
        '2026-03-25'
      ),
      makeVisit(
        {
          encounter_id: 'enc-3',
          diagnosa: { icd_x: 'J18', nama: 'Pneumonia' },
          terapi_obat: 'Amoxicillin 500 mg',
          dokter_penanganan: 'dr. Sentra Tiga',
        },
        '2026-03-23'
      ),
      makeVisit(
        {
          encounter_id: 'enc-4',
          diagnosa: { icd_x: 'M79', nama: 'Nyeri otot' },
          terapi_obat: 'Ibuprofen 400 mg',
          dokter_penanganan: 'dr. Sentra Empat',
        },
        '2026-03-20'
      ),
    ]);

    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual({
      key: 'enc-2',
      title: 'Kunjungan 1',
      rows: [
        { label: 'Kapan', value: '23 hari lalu' },
        { label: 'Diagnosa', value: 'E11 — Diabetes melitus tipe 2' },
        { label: 'Obat / Terapi', value: 'Metformin 500 mg' },
        { label: 'DPJP', value: 'dr. Sentra Dua' },
      ],
    });
    expect(sections[1]?.key).toBe('enc-3');
    expect(sections[2]?.key).toBe('enc-1');
  });
});
