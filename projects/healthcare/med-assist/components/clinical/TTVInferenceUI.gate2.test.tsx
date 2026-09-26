import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: '2.1.0' }),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
}));

vi.mock('@/utils/sound', () => ({
  playSound: vi.fn(),
}));

vi.mock('@/lib/api/bridge-client', () => ({
  BRIDGE_AUTH_REQUIRED_HINT: 'Bridge memerlukan login',
  extractClinicalAnamnesis: vi.fn(),
  evaluateCanonicalClinicalEngine: vi.fn(),
  getOnlineDoctors: vi.fn(),
  sendConsultToDoctor: vi.fn(),
}));

import { TTVInferenceUI } from './TTVInferenceUI';

type TtvState = NonNullable<ComponentProps<typeof TTVInferenceUI>['ttvState']>;

const makeTtvState = (overrides: Partial<TtvState> = {}): TtvState => ({
  gcs: '15',
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

describe('TTVInferenceUI Gate 2 action workflow', () => {
  it('surfaces a respiratory failure finding through the current clinical alert preview', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Synthetic"
        patientGender="L"
        patientAge={45}
        patientRM="RM-G2"
        ttvState={makeTtvState({
          sbp: '100',
          dbp: '65',
          hr: '118',
          rr: '32',
          spo2: '88',
          symptomText: 'sesak berat tidak bisa bicara demam batuk produktif',
        })}
        onTTVStateChange={vi.fn()}
      />
    );

    expect(screen.getByText('TEMUAN KLINIS')).toBeInTheDocument();
    expect(screen.getAllByText(/Akses Darurat/i).length).toBeGreaterThan(0);
  });

  it('does not expose the manual clinical concern toggle in the TTV form', () => {
    render(
      <TTVInferenceUI
        patientName="Ny. Synthetic"
        patientGender="P"
        patientAge={37}
        patientRM="RM-G2-CONCERN"
        ttvState={makeTtvState()}
        onTTVStateChange={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('checkbox', { name: 'Concern klinis aktif' })
    ).not.toBeInTheDocument();
  });
});
