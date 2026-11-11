import { describe, expect, it } from 'vitest';

import {
  allergyMatches,
  buildChronicMedications,
  buildSafetyNet,
  chronicContinuation,
  drugKey,
  explainInteraction,
  formatDose,
  interactionsFor,
  nameBesideDose,
  resepDrugSafety,
  reviewSafety,
  roleOf,
  sameDrugIn,
  searchStock,
  strengthOf,
} from './tatalaksana';
import type { DiseaseNote } from './useDiseaseNotes';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { MEDICATION_NAME_SYNONYMS } from '@/lib/rme/payload-mapper';
import stockDatabase from '@/public/data/stok_obat.json';
import type { DrugInteraction } from '@/types/api';

const visit = (timestamp: string, terapi: string, diagnosis: string): VisitRecord => ({
  patient_id: 'RM-TEST',
  encounter_id: timestamp,
  timestamp,
  vitals: { sbp: 130, dbp: 80, hr: 80, rr: 18, temp: 36.8, glucose: 0 },
  keluhan_utama: 'kontrol',
  diagnosa: { icd_x: diagnosis === 'Hipertensi esensial' ? 'I10' : 'E11', nama: diagnosis },
  terapi_obat: terapi,
  source: 'scrape',
});

const note = (over: Partial<DiseaseNote>): DiseaseNote => ({ definition: 'x', complications: [], exam: [], referral: '', ...over });

describe('buildChronicMedications', () => {
  const visits = [
    visit('2026-09-10T08:00:00Z', 'Amlodipin 1x10mg sesudah makan; Metformin 2x500mg sesudah makan', 'Hipertensi esensial'),
    visit('2026-08-10T08:00:00Z', 'Amlodipin 1x5mg sesudah makan', 'Hipertensi esensial'),
    visit('2026-07-10T08:00:00Z', 'Metformin 2x500mg sesudah makan', 'Diabetes melitus tipe 2'),
    visit('2026-06-10T08:00:00Z', 'Metformin 2x500mg sesudah makan', 'Diabetes melitus tipe 2'),
  ];

  it('takes the latest dose and the diagnosis the prescribing visits recorded most', () => {
    const [amlodipin, metformin] = buildChronicMedications(['Amlodipin', 'Metformin'], visits);
    expect(amlodipin.doseLine).toBe('1x10mg · Sesudah makan');
    expect(amlodipin.indication).toBe('Hipertensi esensial');
    expect(amlodipin.visits).toHaveLength(2);
    expect(metformin.indication).toBe('Diabetes melitus tipe 2');
    expect(metformin.visits.map((entry) => entry.date)).toEqual([
      '2026-09-10T08:00:00Z',
      '2026-07-10T08:00:00Z',
      '2026-06-10T08:00:00Z',
    ]);
  });

  // Chief, 2026-10-02 ("usulan 9 macam obat? ... masa 9 macam obat?"): read from the riwayat Resep
  // tables, every medication of the last visits became a chronic card, the ISPA ones included. A
  // medication only acute visits prescribed (no ICD in CHRONIC_ICD_ROOTS) is not chronic therapy.
  it('leaves out a medication only visits with an acute diagnosis prescribed', () => {
    const ispa = (timestamp: string, terapi: string): VisitRecord => ({
      ...visit(timestamp, terapi, 'ISPA'),
      diagnosa: { icd_x: 'J06.9', nama: 'Acute upper respiratory infection, unspecified' },
    });
    const history = [
      ispa('2026-09-20T08:00:00Z', 'N-asetilsistein kapsul 200 mg 2x1 Sesudah Makan; Parasetamol tablet 500 mg 3X1 Sesudah Makan'),
      visit('2026-09-10T08:00:00Z', 'Amlodipin 1x10mg sesudah makan; Parasetamol tablet 500 mg 3X1 Sesudah Makan', 'Hipertensi esensial'),
      ispa('2026-08-10T08:00:00Z', 'N-asetilsistein kapsul 200 mg 3x1 Sesudah Makan'),
    ];

    const chronic = buildChronicMedications(
      ['N-Asetilsistein Kapsul 200 Mg', 'Parasetamol Tablet 500 Mg', 'Amlodipin'],
      history
    );

    // Parasetamol stays: a hypertension visit prescribed it too.
    expect(chronic.map((medication) => medication.name)).toEqual(['Parasetamol Tablet 500 Mg', 'Amlodipin']);
  });

  // Chief, 2026-10-04 ("NAC dan CTM tidak ada dosis", then "Pilih 1"): a medication no visit gave
  // a signa takes the references' standard start for its stock medicine (standardDose.ts), marked
  // as such, and can be continued. Supersedes 2026-10-02 ("Pengisian dosis salah": no dose at all).
  it('takes the standard dose of its stock medicine when no visit wrote a signa', () => {
    const [ctm] = buildChronicMedications(['CTM'], [visit('2026-09-10T08:00:00Z', 'NAC, CTM', 'Rinitis')]);

    expect(ctm.name).toBe('Klorfeniramin Maleat ( CTM ) tablet 4 mg');
    expect(ctm.doseLine).toBe('3x4mg · Sesudah makan · dosis standar');
    expect(ctm.regimen).toEqual({ dosis: '3x1', aturanPakai: 'Sesudah makan' });
    expect(ctm.standard).toBe(true);
    expect(ctm.visits.map((entry) => entry.dose)).toEqual(['']);
    expect(chronicContinuation(ctm)).toMatchObject({
      nama_obat: 'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
      dosis: '3x1',
      durasi: '30 hari',
      rationale: 'Lanjutan terapi kronis; dosis standar, riwayat tanpa signa.',
    });
  });

  it('starts from the lowest standard strength the stock has', () => {
    const [amlodipin] = buildChronicMedications(
      ['Amlodipin'],
      [visit('2026-09-10T08:00:00Z', 'Amlodipin', 'Hipertensi esensial')]
    );

    expect(amlodipin.name).toBe('Amlodipin tablet 5 mg');
    expect(amlodipin.doseLine).toBe('1x5mg · Sesudah makan · dosis standar');
  });

  it('keeps no dose when the references give none for the medication', () => {
    const [haloperidol] = buildChronicMedications(
      ['Haloperidol'],
      [visit('2026-09-10T08:00:00Z', 'Haloperidol', 'Hipertensi esensial')]
    );

    expect(haloperidol.regimen).toBeUndefined();
    expect(haloperidol.doseLine).toBe('');
    expect(haloperidol.standard).toBeUndefined();
    expect(chronicContinuation(haloperidol)).toBeNull();
  });

  // The latest visit wrote no signa: the card read "Signa tidak tercatat" while an older visit's
  // regimen was there to continue.
  it('takes the dose line from the latest visit that wrote a signa', () => {
    const [amlodipin] = buildChronicMedications(
      ['Amlodipin'],
      [
        visit('2026-09-10T08:00:00Z', 'Amlodipin', 'Hipertensi esensial'),
        visit('2026-08-10T08:00:00Z', 'Amlodipin 1x10mg sesudah makan', 'Hipertensi esensial'),
      ]
    );

    expect(amlodipin.doseLine).toBe('1x10mg · Sesudah makan');
    expect(amlodipin.regimen).toEqual({ dosis: '1x1', aturanPakai: 'Sesudah makan' });
  });

  // Chief, 2026-10-04 ("NAC dan CTM tidak ada dosis"): the asthma visit wrote "NAC, CTM" while the
  // ISPA visits wrote "N-asetilsistein kapsul 200 mg 2x1"; the abbreviation was a card of its own.
  it('reads an abbreviation and the full name as one medication, with the dose a visit wrote', () => {
    const asma: VisitRecord = {
      ...visit('2026-09-20T08:00:00Z', 'NAC, CTM', 'Asma'),
      diagnosa: { icd_x: 'J45.9', nama: 'Asthma, unspecified' },
    };
    const ispa: VisitRecord = {
      ...visit('2026-09-01T08:00:00Z', 'N-asetilsistein kapsul 200 mg 2x1 Sesudah Makan', 'ISPA'),
      diagnosa: { icd_x: 'J06.9', nama: 'Acute upper respiratory infection, unspecified' },
    };

    const chronic = buildChronicMedications(
      ['NAC', 'CTM', 'N-Asetilsistein Kapsul 200 Mg'],
      [asma, ispa]
    );

    expect(chronic.map((medication) => medication.name)).toEqual([
      'N-Asetilsistein Kapsul 200 Mg',
      // No visit wrote its signa: the stock medicine its standard dose is for.
      'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
    ]);
    expect(chronic[0].doseLine).toBe('2x200mg · Sesudah makan');
    expect(chronic[0].regimen).toEqual({ dosis: '2x1', aturanPakai: 'Sesudah makan' });
    expect(chronic[0].visits).toHaveLength(2);
  });

  it('tells the strength the visit wrote when the card name has none', () => {
    const [ctm] = buildChronicMedications(
      ['CTM'],
      [
        visit(
          '2026-09-10T08:00:00Z',
          'Klorfeniramin Maleat ( CTM ) tablet 4 mg 3X1 Sesudah Makan',
          'Hipertensi esensial'
        ),
      ]
    );

    expect(ctm.doseLine).toBe('3x4mg · Sesudah makan');
    expect(ctm.regimen).toEqual({ dosis: '3x1', aturanPakai: 'Sesudah makan' });
  });

  it('continues half a tablet as the visit wrote it', () => {
    const [captopril] = buildChronicMedications(
      ['Captopril'],
      [
        visit(
          '2026-09-10T08:00:00Z',
          'Captopril tablet 25 mg 3X1/2 Sesudah Makan',
          'Hipertensi esensial'
        ),
      ]
    );

    expect(captopril.regimen).toEqual({ dosis: '3x1/2', aturanPakai: 'Sesudah makan' });
  });

  // Chief, 2026-09-29: a chronic card can be continued in this visit, so the latest regimen is kept whole.
  it('keeps the latest regimen, which a continuation in this visit carries to the prescription', () => {
    const [amlodipin] = buildChronicMedications(['Amlodipin'], visits);
    // The dose is the signa (times a day x units a take), as the RME resep takes it; the strength stays in the name.
    expect(amlodipin.regimen).toEqual({ dosis: '1x1', aturanPakai: 'Sesudah makan' });
    expect(chronicContinuation(amlodipin)).toEqual({
      nama_obat: 'Amlodipin',
      dosis: '1x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '30 hari',
      rationale: 'Lanjutan terapi kronis.',
      safety_check: 'safe',
      isChronicContinuation: true,
    });
  });

  it('keeps a name the history text does not show, with its standard dose and no indication', () => {
    expect(buildChronicMedications(['Simvastatin'], visits)).toEqual([
      {
        key: 'simvastatin',
        name: 'Simvastatin tablet 20 mg',
        doseLine: '1x20mg · Sesudah makan · dosis standar',
        indication: '',
        visits: [],
        regimen: { dosis: '1x1', aturanPakai: 'Sesudah makan' },
        standard: true,
      },
    ]);
  });
});

describe('roleOf', () => {
  it('keeps the engine role and otherwise uses the RME keyword rule', () => {
    expect(roleOf('Paracetamol 500 mg', 'utama')).toBe('utama');
    expect(roleOf('Ambroxol 30 mg')).toBe('adjuvant');
    expect(roleOf('Vitamin B Complex')).toBe('vitamin');
    expect(roleOf('Amoksisilin 500 mg')).toBe('utama');
  });
});

describe('reviewSafety', () => {
  const major: DrugInteraction = { drug_a: 'Amlodipin', drug_b: 'Simvastatin 20 mg', severity: 'major', description: 'x' };
  const moderate: DrugInteraction = { drug_a: 'Metformin', drug_b: 'Ibuprofen 400 mg', severity: 'moderate', description: 'x' };

  it('finds the same drug twice, a major interaction between chosen drugs and a detected allergy', () => {
    const review = reviewSafety({
      chronic: ['Amlodipin', 'Metformin'],
      visit: [
        { name: 'Simvastatin 20 mg', contraindications: [] },
        { name: 'Amlodipin 5 mg', contraindications: [] },
        { name: 'Amoxicillin 500 mg', contraindications: ['Hamil trimester 1'] },
      ],
      interactions: [major, moderate],
      allergies: ['Amoxicillin', 'Tidak ada'],
    });
    expect(review.duplicates).toEqual(['Amlodipin + Amlodipin 5 mg']);
    expect(review.interactions).toEqual([major]);
    expect(review.contraindications).toEqual([
      { drug: 'Amoxicillin 500 mg', reason: 'Alergi Amoxicillin' },
      { drug: 'Amoxicillin 500 mg', reason: 'Hamil trimester 1' },
    ]);
  });

  // Audit 2026-09-29: the key was the first word, so "Asam mefenamat" and "Asam folat" were one
  // drug and "BLUD Amlodipin" another than "Amlodipin".
  it('tells drugs apart by their generic name, not their first word, and sees one drug across spellings', () => {
    const review = (names: string[]) => reviewSafety({ chronic: [], visit: names.map((name) => ({ name, contraindications: [] })), interactions: [], allergies: [] }).duplicates;
    expect(review(['Asam mefenamat 500 mg', 'Asam folat tablet 1 mg', 'Vitamin C 50 mg', 'Vitamin B6 50mg', 'Tablet Tambah Darah Kombinasi (program)'])).toEqual([]);
    expect(review(['Amlodipin tablet 10 mg', 'BLUD Amlodipin tablet 5 mg'])).toEqual(['Amlodipin tablet 10 mg + BLUD Amlodipin tablet 5 mg']);
    expect(review(['Paracetamol 500 mg', 'Parasetamol tablet 500 mg'])).toEqual(['Paracetamol 500 mg + Parasetamol tablet 500 mg']);
    expect(review(['Amoxicillin 500 mg', 'Amoksisilin kapsul 500 mg'])).toEqual(['Amoxicillin 500 mg + Amoksisilin kapsul 500 mg']);
    expect(review(['NAC', 'N-asetilsistein kapsul 200 mg'])).toEqual([
      'NAC + N-asetilsistein kapsul 200 mg',
    ]);
  });

  // The names the RME resep already reads as one drug (its synonym table) are one drug here too:
  // every abbreviation or English name there meets the Puskesmas stock medicine it stands for.
  it('reads every name of the RME synonym table as the stock medicine it stands for', () => {
    const stockNames = stockDatabase.stok_obat.map((item) => item.nama_obat);
    const met = Object.entries(MEDICATION_NAME_SYNONYMS).flatMap(([alias, canonical]) => {
      const medicine = stockNames.find((name) => drugKey(name) === drugKey(canonical));
      return medicine ? [[alias, medicine]] : [];
    });
    expect(met.length).toBeGreaterThan(30);
    expect(met.filter(([alias, medicine]) => drugKey(alias) !== drugKey(medicine))).toEqual([]);
    expect(drugKey('CTM')).toBe(drugKey('Klorfeniramin Maleat ( CTM ) tablet 4 mg'));
    expect(drugKey('NAC')).toBe(drugKey('N-asetilsistein kapsul 200 mg'));
    expect(drugKey('PCT')).toBe(drugKey('Parasetamol tablet 500 mg'));
  });

  // Audit 2026-09-29: an allergy written the English way missed the Indonesian stock name.
  it('sees an allergy whichever way the drug is spelled', () => {
    expect(allergyMatches('Amoksisilin kapsul 500 mg', ['Amoxicillin'])).toEqual(['Amoxicillin']);
    expect(allergyMatches('Paracetamol 500 mg', ['parasetamol'])).toEqual(['parasetamol']);
    expect(allergyMatches('Amlodipin 10 mg', ['Tidak ada', 'Ibu'])).toEqual([]);
  });

  it('names the other entries of the same drug in the plan, the card itself left out', () => {
    const plan = ['Amlodipin 10 mg', 'Simvastatin 20 mg', 'Amlodipin 10 mg'];
    expect(sameDrugIn('Amlodipin 10 mg', plan, true)).toEqual(['Amlodipin 10 mg']);
    expect(sameDrugIn('BLUD Amlodipin tablet 5 mg', plan, false)).toEqual(['Amlodipin 10 mg', 'Amlodipin 10 mg']);
    expect(sameDrugIn('Simvastatin 20 mg', plan, true)).toEqual([]);
  });

  it('ignores an interaction with a drug that is not in the plan', () => {
    const review = reviewSafety({ chronic: ['Amlodipin'], visit: [], interactions: [major], allergies: [] });
    expect(review).toEqual({ duplicates: [], interactions: [], contraindications: [] });
  });

  it('lists the interactions one medication takes part in', () => {
    expect(interactionsFor('Metformin', [major, moderate])).toEqual([moderate]);
  });
});

describe('buildSafetyNet', () => {
  const notes = new Map<string, DiseaseNote>([
    ['J06', note({ followUp: 'Kontrol bila tidak membaik 7-10 hari.', redFlags: ['Sesak nafas berat', 'Stridor'] })],
    ['J02', note({ followUp: 'Kontrol bila tidak membaik 7-10 hari.', redFlags: ['Stridor', 'Trismus'] })],
    ['I10', note({ followUp: 'Kontrol 2-4 minggu, lalu tiap 3 bulan.' })],
    ['E11', note({})],
  ]);

  it('lists the chosen diagnoses\' red flags verbatim, each once, and nothing for a code without them', () => {
    expect(buildSafetyNet(['J06.9', 'J02'], notes)).toEqual(['Sesak nafas berat', 'Stridor', 'Trismus']);
    expect(buildSafetyNet(['K65.0'], notes)).toEqual([]);
  });
});

describe('formatDose', () => {
  // Chief, 2026-09-29: "Penulisan dosis yang saya suka : 1x10mg".
  it('writes frequency x strength per take, taking the strength from the name when the dose has none', () => {
    expect(formatDose('Amlodipin 10 mg', '1x1')).toBe('1x10mg');
    expect(formatDose('Amoksisilin 500 mg', '3x1')).toBe('3x500mg');
    expect(formatDose('Paracetamol 500mg', '3x2')).toBe('3x1000mg');
    expect(formatDose('Amoksisilin', '2x500 mg')).toBe('2x500mg');
    expect(formatDose('Salbutamol 0,5 mg', '3 x 1')).toBe('3x0.5mg');
  });

  it('leaves a dose it cannot read, or a name without strength, as written', () => {
    expect(formatDose('Vitamin B kompleks', '1x1')).toBe('1x1');
    expect(formatDose('Amlodipin 10 mg', 'bila perlu')).toBe('bila perlu');
  });

  // Audit 2026-09-29: a concentration is not an amount per take ("2x1" of a 0,1 % cream was
  // "2x0.1%"), and "100.000 IU" is a hundred thousand, not 100.
  it('never multiplies a percentage, and reads a thousands dot as thousands', () => {
    expect(formatDose('Betametason krim 0,1 % (sebagai valerat)', '2x1')).toBe('2x1');
    expect(formatDose('Nistatin tablet vaginal 100.000 IU/g', '1x1')).toBe('1x100000iu');
    expect(strengthOf('Nistatin 100.000 ui/ml drop')).toBeNull();
    expect(strengthOf('Nistatin tablet vaginal 100.000 IU/g')).toEqual({ value: 100000, unit: 'iu' });
    expect(strengthOf('Bisoprolol 2.5 mg')).toEqual({ value: 2.5, unit: 'mg' });
  });
});

describe('nameBesideDose', () => {
  it('drops the strength from the name only when the dose line already says it', () => {
    expect(nameBesideDose('Amlodipin 10 mg', '1x10mg · Sesudah makan')).toBe('Amlodipin');
    expect(nameBesideDose('Amlodipin 10 mg', '1x1 · Sesudah makan')).toBe('Amlodipin 10 mg');
    expect(nameBesideDose('Vitamin B', '1x1')).toBe('Vitamin B');
  });
});

describe('explainInteraction', () => {
  const pair = (drug_a: string, drug_b: string): DrugInteraction => ({ drug_a, drug_b, severity: 'major', description: 'Interaksi signifikan.', recommendation: 'Evaluasi kebutuhan terapi.' });

  it('takes the mechanism and advice from the curated pair table, whatever the spelling and strength', () => {
    expect(explainInteraction(pair('Simvastatin 20 mg', 'Amlodipin 10 mg'))).toEqual({
      reason: 'Amlodipine meningkatkan kadar simvastatin',
      advice: 'Batasi dosis simvastatin maksimal 20mg/hari.',
    });
  });

  it('names no mechanism the sources do not give, and keeps DDInter\'s advice', () => {
    expect(explainInteraction(pair('Amlodipin 10 mg', 'Kandesartan 8 mg'))).toEqual({ reason: null, advice: 'Evaluasi kebutuhan terapi.' });
  });
});

// Chief, 2026-10-04: the PDF's INTERAKSI column and check line read the DDInter pairs within the resep.
describe('resepDrugSafety', () => {
  const major = (drug_a: string, drug_b: string): DrugInteraction => ({
    drug_a,
    drug_b,
    severity: 'major',
    description: 'Interaksi signifikan.',
    recommendation: 'Evaluasi kebutuhan terapi.',
  });
  const resep = [
    { key: 'Amlodipin tablet 10 mg', name: 'Amlodipin' },
    { key: 'Simvastatin tablet 20 mg', name: 'Simvastatin' },
  ];

  it('keeps the pairs whose two drugs are in the resep, by printed name, with the curated advice', () => {
    const interactions = [
      major('Amlodipin tablet 10 mg', 'Simvastatin tablet 20 mg'),
      major('Simvastatin tablet 20 mg', 'Klaritromisin 500 mg'),
    ];
    expect(resepDrugSafety(resep, { state: 'done', interactions })).toEqual({
      state: 'done',
      pairs: [
        {
          a: 'Amlodipin',
          b: 'Simvastatin',
          severity: 'major',
          advice: 'Batasi dosis simvastatin maksimal 20mg/hari.',
        },
      ],
    });
  });

  it('passes on a check that has not finished or could not run, without pairs', () => {
    expect(resepDrugSafety(resep, { state: 'checking', interactions: [] })).toEqual({
      state: 'checking',
      pairs: [],
    });
    expect(resepDrugSafety(resep, { state: 'unavailable', interactions: [] })).toEqual({
      state: 'unavailable',
      pairs: [],
    });
  });
});

// Chief, 2026-09-29: "ketik Am... keluar lodipin", the name field searches the Puskesmas stock.
describe('searchStock', () => {
  it('offers the Puskesmas medicines a typed beginning names, from two letters on', () => {
    const names = searchStock('Am').map((match) => match.name);
    expect(names).toContain('Amlodipin tablet 10 mg');
    expect(names.length).toBeLessThanOrEqual(6);
    expect(names.every((name) => name.toLowerCase().startsWith('am'))).toBe(true);
    expect(searchStock('A')).toEqual([]);
  });

  it('matches every typed word, and carries the stock', () => {
    expect(searchStock('amlo 5')).toEqual([
      { name: 'Amlodipin tablet 5 mg', stock: expect.any(Number), unit: 'Tablet', available: true },
      { name: 'BLUD Amlodipn tablet 5 mg', stock: expect.any(Number), unit: 'Tablet', available: true },
    ]);
  });

  it('leaves out BMHP, and lists what is out of stock after what is in', () => {
    expect(searchStock('alat suntik')).toEqual([]);
    const amoksisilin = searchStock('amoksisilin');
    expect(amoksisilin.at(-1)).toMatchObject({ name: 'BLUD Amoksisilin tablet 500 mg', available: false });
    expect(amoksisilin.slice(0, -1).every((match) => match.available)).toBe(true);
  });
});
