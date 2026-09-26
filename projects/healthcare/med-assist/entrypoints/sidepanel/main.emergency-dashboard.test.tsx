import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/messaging', () => ({ sendMessage: vi.fn() }));
vi.mock('@/utils/sound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/sidepanel/ClinicalReasoningWorkbench', () => ({
  ClinicalReasoningWorkbench: () => null,
}));
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { getURL: (p: string) => `chrome-extension://test${p}` },
    storage: {
      local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));
vi.mock('@/lib/api/auth-client', () => ({
  getStoredSession: vi.fn(),
  logout: vi.fn(async () => undefined),
}));
vi.mock('framer-motion', async () => {
  const ReactModule = await import('react');
  const motion = new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        ReactModule.forwardRef((props: Record<string, unknown>, ref) => {
          const { children, ...rest } = props;
          return ReactModule.createElement(tag, { ...rest, ref }, children as React.ReactNode);
        }),
    }
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion,
    useReducedMotion: () => true,
  };
});
vi.mock('@/components/clinical/TTVInferenceUI', () => ({
  TTVInferenceUI: () => null,
}));
vi.mock('@/components/clinical/ClinicalDifferential', () => ({
  ClinicalDifferential: () => null,
}));

import { EmergencyDashboard } from './main';

import type { ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import type { TriageVerdict } from '@/lib/emergency-detector/triage-verdict';

const standbyVerdict: TriageVerdict<ScreeningAlert> = {
  zone: 'standby',
  headlineAlert: null,
  sortedAlerts: [],
};

describe('EmergencyDashboard wiring', () => {
  it('accepts a verdict prop without crashing when there is no headline alert', () => {
    render(<EmergencyDashboard alerts={[]} verdict={standbyVerdict} />);

    expect(screen.getByText('— Tidak ada temuan darurat aktif')).toBeInTheDocument();
  });
});

const baseAlert: ScreeningAlert = {
  id: 'x',
  type: 'hypotension',
  severity: 'critical',
  title: 'Syok Hipovolemik',
  gate: 'GATE_1_HEMODYNAMIC',
  reasoning: 'SBP 78 dengan takikardia kompensatorik.',
  recommendations: ['Posisikan supine, tinggikan tungkai.', 'Pasang akses IV bila memungkinkan.'],
  actionProtocolId: 'PROTO_SHOCK',
};

describe('EmergencyDashboard Verdict Card', () => {
  it('renders all 7 sections when the headline alert has a fully-populated protocol', () => {
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'merah',
      headlineAlert: baseAlert,
      sortedAlerts: [baseAlert],
    };
    render(<EmergencyDashboard alerts={[baseAlert]} verdict={verdict} />);

    expect(screen.getByText(/MERAH/i)).toBeInTheDocument();
    expect(screen.getAllByText(baseAlert.reasoning).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reevaluasi dalam 5 menit/i)).toBeInTheDocument();
  });

  it('omits Do not do when the resolved protocol has no contraindications', () => {
    const respFailureAlert: ScreeningAlert = {
      ...baseAlert,
      id: 'y',
      type: 'hypoxia',
      actionProtocolId: 'PROTO_RESP_FAILURE',
    };
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'merah',
      headlineAlert: respFailureAlert,
      sortedAlerts: [respFailureAlert],
    };
    render(<EmergencyDashboard alerts={[respFailureAlert]} verdict={verdict} />);

    expect(screen.queryByText(/Do not do|Jangan lakukan/i)).not.toBeInTheDocument();
  });

  it('falls back to recommendations for Do now when no protocol resolves, and hides Refer/Evidence', () => {
    const unresolvedAlert: ScreeningAlert = {
      id: 'z',
      type: 'context_note',
      severity: 'warning',
      title: 'Validasi manset tensi',
      gate: 'GATE_PATIENT_CONTEXT',
      reasoning: 'Lingkar lengan di luar rentang manset standar.',
      recommendations: ['Gunakan manset ukuran sesuai lingkar lengan.'],
    };
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'kuning',
      headlineAlert: unresolvedAlert,
      sortedAlerts: [unresolvedAlert],
    };
    render(<EmergencyDashboard alerts={[unresolvedAlert]} verdict={verdict} />);

    expect(
      screen.getAllByText('Gunakan manset ukuran sesuai lingkar lengan.').length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Refer trigger|Rujuk bila/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Evidence gate|Sumber:/i)).not.toBeInTheDocument();
  });

  it('shows only the zone message when there is no headline alert', () => {
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'hijau',
      headlineAlert: null,
      sortedAlerts: [],
    };
    render(<EmergencyDashboard alerts={[]} verdict={verdict} />);

    expect(screen.getByText(/HIJAU/i)).toBeInTheDocument();
    expect(screen.queryByText(/Do now|Reevaluasi/i)).not.toBeInTheDocument();
  });
});
