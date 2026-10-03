import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel } from './visit-summary-model';
import { syntheticVisit, syntheticVisitSummaryInput as input } from './visit-summary.fixtures';

describe('buildVisitSummaryModel', () => {
  it('heads the summary with identity-free fields only', () => {
    expect(buildVisitSummaryModel(input).head).toEqual({
      rm: 'RM-00-12-34',
      age: '54 th',
      sex: 'Perempuan',
      facility: 'Puskesmas Sintetis',
      printedAt: '03-10-2026 14:20',
      date: '2026-10-03',
    });
  });

  it('never carries the history’s clinicians or therapy text', () => {
    const text = JSON.stringify(buildVisitSummaryModel(input));
    expect(text).not.toContain('Rahasia');
  });

  it('writes the vitals with units, a missing one as -, SpO2 from the context', () => {
    const model = buildVisitSummaryModel({ ...input, vitals: { ...input.vitals, glucose: 0 } });
    expect(model.vitals).toEqual([
      { label: 'TD', value: '152/96 mmHg' },
      { label: 'Nadi', value: '88 x/mnt' },
      { label: 'Napas', value: '20 x/mnt' },
      { label: 'Suhu', value: '37,2 °C' },
      { label: 'SpO2', value: '98 %' },
      { label: 'GDS', value: '-' },
    ]);
  });

  it('keeps the triage only past standby', () => {
    expect(buildVisitSummaryModel(input).triage).toEqual({ zone: 'kuning', headline: 'Hipertensi derajat 2' });
    const standby = { ...input.context!, triage: { zone: 'standby' as const, headline: null } };
    expect(buildVisitSummaryModel({ ...input, context: standby }).triage).toBeNull();
  });

  it('names the pregnancy status for women only', () => {
    expect(buildVisitSummaryModel(input).pregnancy).toBe('Tidak hamil');
    expect(buildVisitSummaryModel({ ...input, pregnant: null }).pregnancy).toBe('Belum dikonfirmasi');
    expect(buildVisitSummaryModel({ ...input, gender: 'L' }).pregnancy).toBeNull();
  });

  it('carries the chosen education, the follow-up and the safety net', () => {
    const model = buildVisitSummaryModel(input);
    expect(model.education).toEqual(input.education);
    expect(model.followUp).toBe('Kontrol 1 minggu');
    expect(model.safetyNet).toEqual(input.safetyNet);
    expect(buildVisitSummaryModel({ ...input, followUp: '' }).followUp).toBe('');
  });

  it('marks the first diagnosis PRIMER and the others SEKUNDER', () => {
    expect(buildVisitSummaryModel(input).diagnoses.map((d) => d.role)).toEqual(['PRIMER', 'SEKUNDER']);
  });

  it('flags emergency and high alerts as urgent and drops a repeated alert', () => {
    const repeated = [...input.alerts, input.alerts[0]];
    expect(buildVisitSummaryModel({ ...input, alerts: repeated }).alerts.map((a) => a.urgent)).toEqual([true, false]);
  });

  it('trends the past visits then this one, with the normal limits', () => {
    const trend = buildVisitSummaryModel(input).trend;
    expect(trend?.dates).toEqual(['12-06', '10-07', '14-08', '11-09', '03-10']);
    // Review 2026-10-03: one measure per row, so each grey band is that measure's normal range.
    expect(trend?.rows.map((row) => row.label)).toEqual(['Sistolik', 'Diastolik', 'Nadi', 'Napas', 'Suhu']);
    expect(trend?.rows.map((row) => row.lines.length)).toEqual([1, 1, 1, 1, 1]);
    expect(trend?.rows[0].lines[0]).toEqual({ values: [148, 156, 150, 158, 152], range: { min: 90, max: 139 } });
    expect(trend?.rows[1].lines[0]).toEqual({ values: [94, 98, 95, 100, 96], range: { min: 60, max: 89 } });
    expect(trend?.rows.map((row) => row.last).slice(0, 2)).toEqual(['152 mmHg', '96 mmHg']);
  });

  it('keeps the last 8 visits and leaves a gap where a visit lacks a vital', () => {
    // Ten monthly visits in 2025; the latest past one has no pulse.
    const history = Array.from({ length: 10 }, (_, i) =>
      syntheticVisit(`2025-${String(i + 1).padStart(2, '0')}-15`, {
        sbp: 140,
        dbp: 90,
        hr: i === 9 ? 0 : 80,
        rr: 18,
        temp: 36.8,
        glucose: 120,
      })
    );
    const trend = buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory: history } }).trend;
    expect(trend?.dates).toHaveLength(8);
    expect(trend?.dates[0]).toBe('15-04');
    expect(trend?.rows[2].lines[0].values).toEqual([80, 80, 80, 80, 80, 80, null, 88]);
  });

  it('trends only this patient’s visits', () => {
    const other = { ...syntheticVisit('2026-09-20', input.vitals), patient_id: 'RM-LAIN' };
    const trend = buildVisitSummaryModel({
      ...input,
      context: { ...input.context!, visitHistory: [...input.context!.visitHistory, other] },
    }).trend;
    expect(trend?.dates).toEqual(['12-06', '10-07', '14-08', '11-09', '03-10']);
  });

  it('skips visits without a readable date', () => {
    const bad = { ...syntheticVisit('2026-05-01', input.vitals), timestamp: 'bukan tanggal' };
    const trend = buildVisitSummaryModel({
      ...input,
      context: { ...input.context!, visitHistory: [bad, ...input.context!.visitHistory] },
    }).trend;
    expect(trend?.dates).toHaveLength(5);
    expect(JSON.stringify(trend)).not.toContain('NaN');
  });

  it('has no trend with fewer than two visits', () => {
    expect(buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory: [] } }).trend).toBeNull();
    expect(buildVisitSummaryModel({ ...input, context: undefined }).trend).toBeNull();
  });
});
