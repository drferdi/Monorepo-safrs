import { describe, expect, it } from 'vitest';

import {
  buildVisitSummaryModel,
  FERDI_VERIFIERS,
  type VisitSummaryInput,
} from './visit-summary-model';
import { syntheticVisit, syntheticVisitSummaryInput as input } from './visit-summary.fixtures';

import { DOKTER_NAMA } from '@/lib/clinical/tenaga-medis';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

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

  // Chief, 2026-10-04 ("tambahkan kolom di isinya saja, struktur prinsipnya dipertahankan"): Tren
  // Tanda Vital takes up to four earlier visits as dated columns before HARI INI, the diagnosis
  // and GDS as rows; TREND still compares the latest earlier visit with today.
  describe('trend', () => {
    const trendOf = (visitHistory: VisitRecord[]) =>
      buildVisitSummaryModel({ ...input, context: { ...input.context!, visitHistory } }).trend;

    it('dates up to four earlier visits, oldest first', () => {
      expect(buildVisitSummaryModel(input).trend.visits).toEqual([
        '12-06-26',
        '10-07-26',
        '14-08-26',
        '11-09-26',
      ]);
    });

    it('sets each visit’s diagnosis and vitals in its column, the direction against the latest', () => {
      const { rows } = buildVisitSummaryModel(input).trend;
      expect(rows.map((row) => row.label)).toEqual([
        'Diagnosis',
        'Sistolik',
        'Diastolik',
        'Nadi',
        'Napas',
        'Suhu',
        'GDS',
      ]);
      expect(rows[0]).toEqual({
        label: 'Diagnosis',
        values: ['I10', 'I10', 'R51', 'I10'],
        today: 'I10',
        direction: null,
        series: null,
      });
      expect(rows[1]).toEqual({
        label: 'Sistolik',
        values: ['148', '156', '150', '158'],
        today: '152',
        direction: 'down',
        series: [148, 156, 150, 158, 152],
      });
      expect(rows[4]).toMatchObject({ label: 'Napas', today: '20', direction: 'flat' });
      expect(rows[5]).toMatchObject({
        label: 'Suhu',
        values: ['36,8', '37', '36,9', '37,1'],
        today: '37,2',
        direction: 'up',
      });
      expect(rows[6]).toMatchObject({
        label: 'GDS',
        values: ['130', '150', '138', '160'],
        today: '142',
        direction: 'down',
      });
    });

    it('keeps the latest four, and leaves out a visit on the day of printing (today’s own record)', () => {
      const older = syntheticVisit('2026-05-08', { ...input.vitals, sbp: 140 });
      const sameDay = syntheticVisit('2026-10-03', { ...input.vitals, sbp: 170 });
      const trend = trendOf([older, ...input.context!.visitHistory, sameDay]);
      expect(trend.visits).toEqual(['12-06-26', '10-07-26', '14-08-26', '11-09-26']);
      expect(trend.rows[1].values).toEqual(['148', '156', '150', '158']);
    });

    it('reads this patient’s visits only, and only those with a readable date', () => {
      const other = {
        ...syntheticVisit('2026-09-30', { ...input.vitals, sbp: 200 }),
        patient_id: 'RM-LAIN',
      };
      const bad = {
        ...syntheticVisit('2026-09-29', { ...input.vitals, sbp: 190 }),
        timestamp: 'bukan tanggal',
      };
      const trend = trendOf([...input.context!.visitHistory, other, bad]);
      expect(trend.rows[1]).toMatchObject({
        values: ['148', '156', '150', '158'],
        direction: 'down',
      });
    });

    it('writes a missing value as - and gives no direction without an earlier value', () => {
      const lonely = trendOf([]);
      expect(lonely.visits).toEqual([]);
      expect(lonely.rows.map((row) => [row.values, row.direction])).toEqual(
        Array(7).fill([[], null])
      );
      const noPulse = trendOf([syntheticVisit('2026-09-11', { ...input.vitals, hr: 0 })]);
      expect(noPulse.rows[3]).toEqual({
        label: 'Nadi',
        values: ['-'],
        today: '88',
        direction: null,
        series: [null, 88],
      });
      expect(buildVisitSummaryModel({ ...input, context: undefined }).trend.rows).toHaveLength(7);
    });
  });

  // Chief, 2026-10-04: Tatalaksana takes STATUS (a continued chronic medication or a new one) and
  // INTERAKSI (the local DDInter pairs within this resep, and a matched allergy), in the resep's order.
  describe('medications', () => {
    it('marks a continued chronic medication Lanjutan and a new one Baru, in the resep’s order', () => {
      expect(
        buildVisitSummaryModel(input).medications.map((med) => [med.name, med.status])
      ).toEqual([
        ['Amlodipin', 'Lanjutan'],
        ['Parasetamol', 'Baru'],
        ['Simvastatin', 'Baru'],
      ]);
    });

    it('names each medication’s partners with the severity in Indonesian, and a matched allergy', () => {
      const allergic = { ...input.medications[1], allergies: ['Parasetamol'] };
      const model = buildVisitSummaryModel({
        ...input,
        medications: [input.medications[0], allergic, input.medications[2]],
      });
      expect(model.medications.map((med) => [med.safety, med.alert])).toEqual([
        ['Simvastatin (mayor)', true],
        ['Alergi: Parasetamol', true],
        ['Amlodipin (mayor)', true],
      ]);
      const moderate = {
        ...input.drugSafety,
        pairs: [{ ...input.drugSafety.pairs[0], severity: 'moderate' as const }],
      };
      expect(
        buildVisitSummaryModel({ ...input, drugSafety: moderate }).medications.map((med) => [
          med.safety,
          med.alert,
        ])
      ).toEqual([
        ['Simvastatin (moderat)', false],
        ['-', false],
        ['Amlodipin (moderat)', false],
      ]);
    });

    it('says when the check found nothing, did not finish or could not run', () => {
      const summary = (drugSafety: VisitSummaryInput['drugSafety']) =>
        buildVisitSummaryModel({ ...input, drugSafety }).drugSafety;
      expect(buildVisitSummaryModel(input).drugSafety).toEqual({
        summary: 'Cek interaksi (DDInter): 1 interaksi antar obat resep ini, 1 serius.',
        notes: ['Amlodipin + Simvastatin (mayor): Batasi dosis simvastatin maksimal 20mg/hari.'],
      });
      expect(summary({ state: 'done', pairs: [] })).toEqual({
        summary: 'Cek interaksi (DDInter): tidak ada interaksi antar obat resep ini.',
        notes: [],
      });
      expect(summary({ state: 'checking', pairs: [] }).summary).toBe(
        'Cek interaksi (DDInter) belum selesai saat dicetak.'
      );
      expect(summary({ state: 'unavailable', pairs: [] }).summary).toBe(
        'Cek interaksi (DDInter) tidak dapat dilakukan.'
      );
      const unchecked = buildVisitSummaryModel({
        ...input,
        drugSafety: { state: 'unavailable', pairs: [] },
      });
      expect(unchecked.medications.map((med) => med.safety)).toEqual(Array(3).fill('belum dicek'));
      expect(buildVisitSummaryModel({ ...input, medications: [] }).drugSafety).toEqual({
        summary: '',
        notes: [],
      });
    });
  });
});
