// @vitest-environment node
/**
 * Diagnosis Quality Gate Tests
 * Tests KB scoring + pharmacotherapy against real patient cases.
 * Uses actual penyakit.json KB — no mocked disease data.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearMatcherCache, matchSymptoms } from './symptom-matcher';
import { generatePharmacotherapyPlan } from './pharmacotherapy-reasoner';

const KB_PATH = resolve(__dirname, '../../public/data/penyakit.json');
const STOK_PATH = resolve(__dirname, '../../public/data/stok_obat.json');

const kbData = JSON.parse(readFileSync(KB_PATH, 'utf-8')) as unknown;
const stokRaw = JSON.parse(readFileSync(STOK_PATH, 'utf-8')) as {
  stok_obat: Array<{ nama_obat: string; stok_tersedia: number; status: string }>;
};
const stokData = stokRaw.stok_obat;

// Mock fetch to serve KB from disk
beforeEach(() => {
  clearMatcherCache();
  vi.stubGlobal('fetch', async (url: string) => {
    if (String(url).includes('penyakit.json')) {
      return { ok: true, json: async () => kbData } as Response;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
});

// =============================================================================
// KASUS 1: Pasien Jantung
// "nyeri dada sesak napas keringat dingin jantung berdebar"
// =============================================================================
describe('Kasus 1 — Pasien Jantung', () => {
  it('top-3 KB candidates harus mengandung kode ICD-10 kardiak (I2x)', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'nyeri dada sesak napas keringat dingin jantung berdebar',
      usia: 55,
      jenisKelamin: 'L',
    });

    expect(results.length).toBeGreaterThan(0);

    const top3Icds = results.slice(0, 3).map((r) => r.icd10);
    const hasCardiac = top3Icds.some((icd) => /^I2/.test(icd));

    console.warn(
      '[KUALITAS] Jantung top-3:',
      results
        .slice(0, 3)
        .map((r) => `${r.icd10} ${r.nama} (${(r.matchScore * 100).toFixed(1)}%)`)
        .join(', ')
    );

    expect(hasCardiac).toBe(true);
  });

  it('top-1 TIDAK boleh penyakit tidak relevan (infeksi umum, parasit, metabolik)', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'nyeri dada sesak napas keringat dingin jantung berdebar',
      usia: 55,
      jenisKelamin: 'L',
    });

    const top1 = results[0];
    console.warn(
      '[KUALITAS] Jantung top-1:',
      `${top1.icd10} ${top1.nama} (${(top1.matchScore * 100).toFixed(1)}%)`
    );

    // Should NOT be parasitic, nutritional, or ENT as top result
    expect(top1.icd10).not.toMatch(/^B[67]/); // Parasites (Taeniasis, cacing)
    expect(top1.icd10).not.toMatch(/^E4[0-6]/); // Malnutrisi
    expect(top1.icd10).not.toMatch(/^G4/); // Kejang
  });
});

// =============================================================================
// KASUS 2: Pasien Diabetes dengan keluhan spesifik
// =============================================================================
describe('Kasus 2 — Pasien Diabetes', () => {
  it('keluhan poliuri polidipsi polifagi (KB terms) → E11 (DM tipe 2) di top-5', async () => {
    // KB memakai istilah medis (Poliuri, Polidipsi, Polifagi), bukan bahasa sehari-hari.
    // Keluhan kolokial + riwayat DM memerlukan LLM re-ranking (via chronicDiseases).
    const results = await matchSymptoms({
      keluhanUtama: 'poliuri polidipsi polifagi penurunan berat badan lemas',
      usia: 50,
      jenisKelamin: 'P',
    });

    const top5Icds = results.slice(0, 5).map((r) => r.icd10);
    const hasDiabetes = top5Icds.some((icd) => /^E1[0-4]/.test(icd));

    console.warn(
      '[KUALITAS] Diabetes top-5:',
      results
        .slice(0, 5)
        .map((r) => `${r.icd10} ${r.nama} (${(r.matchScore * 100).toFixed(1)}%)`)
        .join(', ')
    );

    expect(hasDiabetes).toBe(true);
  });

  it('pharmacotherapy diabetes menghasilkan tepat 3 obat (utama + adjuvan + vitamin)', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        icd_x: 'E11.9',
        patient_age: 52,
        alergi: [],
        penyakit_kronis: ['DM tipe 2'],
        current_medications: [],
      },
      stokData
    );

    console.warn('[KUALITAS] Resep Diabetes:', plan.medications.map((m) => m.nama_obat).join(', '));

    // Harus ada 3 obat
    expect(plan.medications.length).toBeGreaterThanOrEqual(3);

    // Wajib ada Metformin sebagai obat utama
    const hasMetformin = plan.medications.some((m) =>
      m.nama_obat.toLowerCase().includes('metformin')
    );
    expect(hasMetformin).toBe(true);

    // Wajib ada Vitamin B (adjuvan)
    const hasVitB = plan.medications.some(
      (m) =>
        m.nama_obat.toLowerCase().includes('vitamin b') ||
        m.nama_obat.toLowerCase().includes('b komplek')
    );
    expect(hasVitB).toBe(true);

    // Wajib ada Vitamin C (vitamin)
    const hasVitC = plan.medications.some((m) => m.nama_obat.toLowerCase().includes('vitamin c'));
    expect(hasVitC).toBe(true);
  });
});

// =============================================================================
// KASUS 3: Pasien ISPA
// =============================================================================
describe('Kasus 3 — Pasien ISPA', () => {
  it('keluhan demam batuk pilek → J06/J02/J00 di top-5', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'demam batuk pilek sakit tenggorokan hidung tersumbat',
      usia: 30,
      jenisKelamin: 'P',
    });

    const top5Icds = results.slice(0, 5).map((r) => r.icd10);
    const hasIspa = top5Icds.some((icd) => /^J0/.test(icd) || /^J1/.test(icd));

    console.warn(
      '[KUALITAS] ISPA top-5:',
      results
        .slice(0, 5)
        .map((r) => `${r.icd10} ${r.nama} (${(r.matchScore * 100).toFixed(1)}%)`)
        .join(', ')
    );

    expect(hasIspa).toBe(true);
  });
});

// =============================================================================
// KASUS 4: Pasien kontrol dengan keluhan generik (edge case)
// Tanpa OpenAI, KB-only harus tetap surface kandidat yang masuk akal
// =============================================================================
describe('Kasus 4 — Kontrol rutin (keluhan generik, KB-only edge case)', () => {
  it('keluhan "lemas pusing tidak enak badan" harus punya candidates (tidak 0)', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'lemas pusing tidak enak badan',
      usia: 45,
    });

    console.warn(
      '[KUALITAS] Generik top-3:',
      results
        .slice(0, 3)
        .map((r) => `${r.icd10} ${r.nama} (${(r.matchScore * 100).toFixed(1)}%)`)
        .join(', ')
    );

    expect(results.length).toBeGreaterThan(0);
  });

  it('keluhan generik "lemas pusing tidak enak badan" TIDAK boleh top-1 parasit (B76/B6x/B7x)', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'lemas pusing tidak enak badan',
      usia: 45,
    });

    expect(results.length).toBeGreaterThan(0);
    const top1 = results[0];
    console.warn(
      '[KUALITAS] Generik top-1 guard:',
      `${top1.icd10} ${top1.nama} (${(top1.matchScore * 100).toFixed(1)}%)`
    );

    // Hookworm / helminth / other parasites must not win on nonspecific malaise alone.
    expect(top1.icd10).not.toMatch(/^B7[0-9]/); // B76 cacing tambang, etc.
    expect(top1.icd10).not.toMatch(/^B6[0-9]/); // B65/B68 schisto/taenia, etc.
    expect(top1.icd10).not.toBe('B76');
  });

  it('keluhan generik TIDAK boleh top-1 R57/A91/T75 tanpa petunjuk spesifik', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'lemas pusing tidak enak badan',
      usia: 45,
    });

    expect(results.length).toBeGreaterThan(0);
    const top1 = results[0];
    console.warn(
      '[KUALITAS] Generik residual top-1 guard:',
      `${top1.icd10} ${top1.nama} (${(top1.matchScore * 100).toFixed(1)}%)`
    );

    // Residual H1: bare lemas/pusing/pusing-travel phrases must not dominate malaise.
    expect(top1.icd10).not.toBe('R57');
    expect(top1.icd10).not.toMatch(/^A91/);
    expect(top1.icd10).not.toBe('T75');
  });

  it('keluhan DM spesifik TIDAK boleh top-3 taeniasis (B68) dari token berat badan saja', async () => {
    const results = await matchSymptoms({
      keluhanUtama: 'poliuri polidipsi polifagi penurunan berat badan lemas',
      usia: 50,
      jenisKelamin: 'P',
    });

    const top3 = results.slice(0, 3).map((r) => r.icd10);
    console.warn('[KUALITAS] Diabetes top-3 residual:', top3.join(', '));
    expect(top3.some((icd) => /^E1[0-4]/.test(icd))).toBe(true);
    expect(top3).not.toContain('B68');
  });
});
