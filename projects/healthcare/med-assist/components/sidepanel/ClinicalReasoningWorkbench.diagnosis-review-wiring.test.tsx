import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ClinicalReasoningWorkbench } from './ClinicalReasoningWorkbench';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

/**
 * End-to-end wiring regression for Temuan #3 (audit E2E 2026-07-05).
 *
 * Renders the REAL ClinicalReasoningWorkbench -> ClinicalTrajectory ->
 * ClinicalTrajectoryV2 -> ClinicalReasoningDifferentialPanel subtree (no
 * component stubbed) so that the "Open diagnosis review" button is exercised
 * through the same prop chain the physician uses at runtime.
 *
 * The button is only enabled when the workbench forwards a differential
 * callback down to <ClinicalTrajectory onNextDifferential>. Because that prop
 * is optional, a missing wiring compiles cleanly and typecheck stays green —
 * exactly how the regression slipped in. This test fails closed on that gap.
 */

// Keep the optional canonical engine off the network; its output is optional
// and the V2 surface renders from the local hybrid trajectory result.
vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalClinicalEngine: vi.fn(async () => ({
    request_id: 'req-wiring-test',
    processed_at: '2026-07-05T08:00:00.000Z',
    source: {
      engine: 'dashboard-clinical-engine' as const,
      engine_version: 'test',
      mode: 'canonical' as const,
    },
    scoring: {},
    alerts: [],
    recommendations: {
      immediate_actions: [],
      monitoring_actions: [],
      referral_actions: [],
      next_best_questions: [],
    },
    governance: {
      disclaimer: 'support only',
      review_required: true,
      authoritative_engine: 'dashboard' as const,
    },
    trajectory: { available: false, visit_count: 3 },
  })),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: vi.fn(),
}));

vi.mock('@/components/ui/AssistShell', () => ({
  AssistShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );

  for (const prop of ['clientWidth', 'offsetWidth'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => 960 });
  }
  for (const prop of ['clientHeight', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => 320 });
  }

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
      finished: Promise.resolve(),
      finish() {},
      pause() {},
      play() {},
      playState: 'finished',
      currentTime: 0,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
    }) as unknown as Animation) as Element['animate'];
});

function makeVisit(index: number, vitals: VisitRecord['vitals']): VisitRecord {
  const base = new Date('2026-06-18T08:00:00.000Z').getTime();
  return {
    patient_id: 'RM-WB-001',
    encounter_id: `wb-enc-${index}`,
    timestamp: new Date(base + index * 24 * 60 * 60 * 1000).toISOString(),
    vitals,
    keluhan_utama: 'Kontrol rutin',
    source: 'scrape',
  };
}

const PREFETCHED_VISITS: VisitRecord[] = [
  makeVisit(1, { sbp: 148, dbp: 92, hr: 94, rr: 20, temp: 37.4, glucose: 188 }),
  makeVisit(2, { sbp: 162, dbp: 100, hr: 106, rr: 23, temp: 38.1, glucose: 246 }),
  makeVisit(3, { sbp: 176, dbp: 110, hr: 118, rr: 28, temp: 38.8, glucose: 320 }),
];

function renderWorkbench(onOpenDifferential?: () => void) {
  return render(
    <ClinicalReasoningWorkbench
      vitals={{
        sbp: '182',
        dbp: '116',
        hr: '124',
        rr: '30',
        temp: '39.1',
        spo2: '91',
        glucose: '344',
      }}
      symptomText="Nyeri dada menjalar dan sesak berat"
      allergies={[]}
      pregnancyStatus={null}
      disabilityType=""
      obesityConfirmation=""
      autosenPreset=""
      patient={{
        name: 'Tn. Sentra',
        gender: 'L',
        age: 57,
        rm: 'RM-WB-001',
        dob: '1969-03-10',
        bpjsStatus: 'aktif',
        kelurahan: 'Cempaka Putih',
      }}
      clinicalContext={{
        facilityName: 'Puskesmas Sentra',
        payerLabel: 'BPJS aktif',
        specialConditions: [],
        pregnancyRisk: '',
      }}
      chronicHistorySummary=""
      anamnesaDraft={null}
      emergencyAlerts={[]}
      prefetchedVisitHistory={{
        visits: PREFETCHED_VISITS,
        diagnostics: ['OK'],
        status: 'ready',
      }}
      onOpenDifferential={onOpenDifferential}
    />
  );
}

describe('ClinicalReasoningWorkbench diagnosis-review wiring', () => {
  it('enables "Open diagnosis review" end-to-end and invokes the workbench handler on click', async () => {
    const onOpenDifferential = vi.fn();

    renderWorkbench(onOpenDifferential);

    const panel = await screen.findByTestId('clinical-reasoning-differential-panel');
    const actionButton = within(panel).getByRole('button', { name: 'Open diagnosis review' });

    expect(actionButton).toBeEnabled();

    fireEvent.click(actionButton);
    expect(onOpenDifferential).toHaveBeenCalledTimes(1);
  });
});
