import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel, FERDI_VERIFIERS } from './visit-summary-model';
import { syntheticVisit, syntheticVisitSummaryInput as input } from './visit-summary.fixtures';

import { DOKTER_NAMA } from '@/lib/clinical/tenaga-medis';

describe('buildVisitSummaryModel', () => {
  // The approved template (Chief, 2026-10-04): RM, USIA "[__] tahun", JENIS KELAMIN "[L/P]",
  // TANGGAL & WAKTU; no facility line.
  it('heads the summary with identity-free fields only, as the template asks', () => {
    expect(buildVisitSummaryModel(input).head).toEqual({
      rm: 'RM-00-12-34',
      age: '54 tahun',
      sex: 'P',
      day: '03-10-2026',
      time: '14:20',
      printedAt: '03-10-2026 14:20',
      date: '2026-10-03',
    });
  });

  it('never carries the history’s clinicians or therapy text', () => {
    const text = JSON.stringify(buildVisitSummaryModel(input));
    expect(text).not.toContain('Rahasia');
  });

  it('writes each vital as a figure and its unit, a missing one as -, SpO2 from the context', () => {
    const model = buildVisitSummaryModel({ ...input, vitals: { ...input.vitals, glucose: 0 } });
    expect(model.vitals).toEqual([
      { label: 'TD', value: '152/96', unit: 'mmHg' },
      { label: 'NADI', value: '88', unit: 'x/menit' },
      { label: 'NAPAS', value: '20', unit: 'x/menit' },
      { label: 'SUHU', value: '37,2', unit: '°C' },
      { label: 'SpO2', value: '98', unit: '%' },
      { label: 'GDS', value: '-', unit: 'mg/dL' },
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

  // Chief, 2026-10-04 ("Pada output pdf"): the DPJP follows the login (a nakes login gives
  // dr. Ferdi, as the RME does); the verifier is always dr. Ferdi, and when dr. Ferdi is the
  // DPJP, dr. Dibya Arfianda or dr. Boyong Baskoro, Sp.OG, in turn.
  describe('signers', () => {
    const signers = (dokter: string, rm = input.rm, printedAt = input.printedAt) =>
      buildVisitSummaryModel({
        ...input,
        rm,
        printedAt,
        staff: { dokter_nama: dokter, perawat_nama: 'Ns. Perawat Sintetis' },
      }).signers;

    it('verifies another doctor’s visit by dr. Ferdi', () => {
      expect(signers('dr. Klinisi Sintetis')).toEqual({ dpjp: 'dr. Klinisi Sintetis', verifier: DOKTER_NAMA });
    });

    it('verifies dr. Ferdi’s visit by one of the two Sp.OG, never by himself', () => {
      for (const dpjp of [DOKTER_NAMA, 'dr. Ferdi Iskandar']) {
        const { verifier } = signers(dpjp);
        expect(FERDI_VERIFIERS).toContain(verifier);
      }
    });

    it('takes turns between the two Sp.OG, the same one again for the same visit', () => {
      const rms = ['RM-1', 'RM-2', 'RM-3', 'RM-4', 'RM-5', 'RM-6'];
      const chosen = rms.map((rm) => signers(DOKTER_NAMA, rm).verifier);
      expect(new Set(chosen)).toEqual(new Set(FERDI_VERIFIERS));
      expect(rms.map((rm) => signers(DOKTER_NAMA, rm).verifier)).toEqual(chosen);
    });

    it('never prints the nurse of the RME', () => {
      expect(JSON.stringify(signers('dr. Klinisi Sintetis'))).not.toContain('Perawat');
    });
  });

  it('marks the first diagnosis PRIMER and the others SEKUNDER', () => {
    expect(buildVisitSummaryModel(input).diagnoses.map((d) => d.role)).toEqual(['PRIMER', 'SEKUNDER']);
  });

  it('flags emergency and high alerts as urgent and drops a repeated alert', () => {
    const repeated = [...input.alerts, input.alerts[0]];
    expect(buildVisitSummaryModel({ ...input, alerts: repeated }).alerts.map((a) => a.urgent)).toEqual([true, false]);
  });

  // The template's Tren Tanda Vital: PARAMETER, SEBELUM (the latest earlier visit), HARI INI, TREND.
  it('sets each vital of the latest earlier visit beside today’s, with the direction', () => {
    expect(buildVisitSummaryModel(input).trend).toEqual([
      { label: 'Sistolik', before: '158', today: '152', direction: 'down' },
      { label: 'Diastolik', before: '100', today: '96', direction: 'down' },
      { label: 'Nadi', before: '92', today: '88', direction: 'down' },
      { label: 'Napas', before: '20', today: '20', direction: 'flat' },
      { label: 'Suhu', before: '37,1', today: '37,2', direction: 'up' },
    ]);
  });

  it('compares with this patient’s visits only, and only those with a readable date', () => {
    const other = { ...syntheticVisit('2026-09-30', { ...input.vitals, sbp: 200 }), patient_id: 'RM-LAIN' };
    const bad = { ...syntheticVisit('2026-09-29', { ...input.vitals, sbp: 190 }), timestamp: 'bukan tanggal' };
    const trend = buildVisitSummaryModel({
      ...input,
      context: { ...input.context!, visitHistory: [...input.context!.visitHistory, other, bad] },
    }).trend;
    expect(trend[0]).toEqual({ label: 'Sistolik', before: '158', today: '152', direction: 'down' });
  });

  it('leaves SEBELUM as - and no direction without an earlier visit or value', () => {
    const lonely = buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory: [] } }).trend;
    expect(lonely.map((row) => [row.before, row.direction])).toEqual(Array(5).fill(['-', null]));
    const noPulse = [syntheticVisit('2026-09-11', { ...input.vitals, hr: 0 })];
    const trend = buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory: noPulse } }).trend;
    expect(trend[2]).toEqual({ label: 'Nadi', before: '-', today: '88', direction: null });
    expect(buildVisitSummaryModel({ ...input, context: undefined }).trend).toHaveLength(5);
  });
});
