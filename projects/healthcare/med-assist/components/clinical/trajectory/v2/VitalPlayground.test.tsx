import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { worseningTrajectoryVisualizationFixture } from '../trajectory-visualization.fixtures';

import { chartGeometry, VitalPlayground, vitalStats } from './VitalPlayground';

import type {
  TrajectoryVisualizationViewModel,
  TrajectoryVitalTrendPoint,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';

const points: TrajectoryVitalTrendPoint[] = [
  { visitLabel: 'Kunjungan 1', date: '2026-08-01', systolic: 128, diastolic: 82, pulse: 76, spo2: 98 },
  { visitLabel: 'Kunjungan 2', date: '2026-09-01', systolic: 142, diastolic: 88, pulse: 94 },
  { visitLabel: 'Kunjungan 3', date: '2026-10-01', systolic: 156, diastolic: 96, pulse: 112, spo2: 93 },
];

function viewModel(primaryVitalDrivers: string[]): TrajectoryVisualizationViewModel {
  return {
    ...worseningTrajectoryVisualizationFixture,
    vitalTrends: points,
    vitalTrendMeta: { primaryVitalDrivers, missingVitalWarnings: [] },
  };
}

function cell(label: string): string | null {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null;
}

// Chief, 2026-10-03: "bagian clinical trajectory gunakan design berikut" (lab spring-playground).
describe('VitalPlayground', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers one pill per recorded vital, the first driver chosen', () => {
    render(<VitalPlayground viewModel={viewModel(['Nadi'])} />);

    const pills = within(screen.getByRole('radiogroup', { name: 'Tanda vital' })).getAllByRole('radio');
    expect(pills.map((pill) => pill.textContent)).toEqual(['Tensi', 'Nadi', 'SpO2']);
    expect(screen.getByRole('radio', { name: 'Nadi' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByTestId(/vital-series-/)).toHaveLength(3);
  });

  it('shows the last visit of the chosen vital against the engine limit', () => {
    render(<VitalPlayground viewModel={viewModel(['Nadi'])} />);

    expect(cell('Nilai')).toBe('112 x/mnt');
    expect(cell('Selisih')).toBe('+18 x/mnt');
    expect(cell('Batas')).toBe('60–100 x/mnt');
    expect(cell('Perilaku')).toBe('Di atas batas');
  });

  it('moves to the visit picked on the slider', () => {
    render(<VitalPlayground viewModel={viewModel(['Nadi'])} />);

    fireEvent.change(screen.getByRole('slider', { name: 'Kunjungan' }), { target: { value: '1' } });

    expect(cell('Nilai')).toBe('76 x/mnt');
    expect(cell('Selisih')).toBe('–');
    expect(cell('Perilaku')).toBe('Dalam batas');
    expect(screen.getByText('K1', { selector: 'output' })).toBeTruthy();
    expect(screen.getByText('01 Agu 2026')).toBeTruthy();
  });

  it('says SpO2 has no limit', () => {
    render(<VitalPlayground viewModel={viewModel([])} />);

    fireEvent.click(screen.getByRole('radio', { name: 'SpO2' }));

    expect(cell('Nilai')).toBe('93%');
    expect(cell('Batas')).toBe('tidak tersedia');
    expect(cell('Perilaku')).toBe('Tanpa batas');
  });

  it('switches Tensi between systolic and diastolic', () => {
    render(<VitalPlayground viewModel={viewModel(['Tekanan darah diastolik'])} />);

    expect(screen.getByRole('radio', { name: 'Tensi' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Diastolik' })).toHaveAttribute('aria-checked', 'true');
    expect(cell('Nilai')).toBe('96 mmHg');
    expect(cell('Batas')).toBe('60–89 mmHg');

    fireEvent.click(screen.getByRole('radio', { name: 'Sistolik' }));

    expect(cell('Nilai')).toBe('156 mmHg');
    expect(cell('Batas')).toBe('90–139 mmHg');
  });

  it('plays the visits from the first to the last, then stops', () => {
    vi.useFakeTimers();
    render(<VitalPlayground viewModel={viewModel(['Nadi'])} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(cell('Nilai')).toBe('76 x/mnt');
    expect(screen.getByRole('button', { name: 'Jeda' })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(cell('Nilai')).toBe('94 x/mnt');

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(cell('Nilai')).toBe('112 x/mnt');
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('classifies a value against its limit', () => {
    expect(vitalStats(points, 'pulse', 2).behaviour).toBe('Di atas batas');
    expect(vitalStats([{ visitLabel: 'K', pulse: 52 }], 'pulse', 0).behaviour).toBe('Di bawah batas');
    expect(vitalStats(points, 'pulse', 0).behaviour).toBe('Dalam batas');
    expect(vitalStats(points, 'spo2', 2).behaviour).toBe('Tanpa batas');
    expect(vitalStats(points, 'spo2', 1).value).toBeUndefined();
  });

  it('spaces the visits across the chart and keeps the limits in its scale', () => {
    const geometry = chartGeometry(points, 'pulse', { min: 60, max: 100 });

    expect(geometry.xs).toEqual([12, 227, 442]);
    for (const value of [60, 100, 76, 112]) {
      expect(geometry.y(value)).toBeGreaterThanOrEqual(12);
      expect(geometry.y(value)).toBeLessThanOrEqual(110);
    }
    expect(geometry.y(112)).toBeLessThan(geometry.y(76));
  });
});
