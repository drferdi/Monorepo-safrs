import { normalizeVisitTherapySummary } from './visit-history-format';

import type { MedicationRecommendation } from '@/types/api';

export interface ParsedHistoryMedication {
  displayName: string;
  frequencyPerDay: number;
  amountPerTake: number;
  strengthValue: number;
  strengthUnit: 'mg' | 'g' | 'mcg' | 'ml' | '';
  aturanPakai: MedicationRecommendation['aturan_pakai'];
  raw: string;
  doseLabel: string;
  normalizedDrugKey: string;
}

export interface ParsedChronicTherapies {
  medications: ParsedHistoryMedication[];
  procedures: string[];
  educations: string[];
}

const EMPTY_RESULT: ParsedChronicTherapies = {
  medications: [],
  procedures: [],
  educations: [],
};

const MEDICATION_FORM_OR_UNIT_PATTERN =
  /\b(tab|tablet|kap|kapsul|sirup|syr|drop|tetes|salep|krim|gel|inj|injeksi|supp|suppositoria|mg|g|mcg|ml|iu)\b/i;
const NARRATIVE_THERAPY_PATTERN =
  /\b(pemberian terapi farmakologi|instruksi medis tertulis|rekam medis terintegrasi|riwayat \d+ kunjungan|obat adjuvan\/tambahan|dipilih melalui|berbasis reasoning|kontraindikasi|ddi\b|tidak ada kontraindikasi|tidak ada ddi)\b/i;
const PROCEDURE_PATTERN =
  /\b(rawat\s*luka|perawatan\s*luka|tindakan|hecting|heating|jahit|nebulisasi|injeksi|irigasi|ganti\s*balut)\b/i;
// Labels of the ePuskesmas visit form that reach the terapi text on their own (Chief, 2026-09-30:
// chronic cards named "Obat", "Dr Dokter", ":"). A line that is only a label is not a therapy.
const FORM_LABEL_PATTERN =
  /^(obat|resep|terapi|terapi obat|signa|aturan pakai|jumlah|keterangan|dr|dokter|dr dokter|perawat|bidan|tenaga medis)\s*:?$/i;
const EDUCATION_PATTERN =
  /\b(edukasi|anjuran|advis|kontrol|rujuk|konsul|disarankan|anjurkan|kembali bila|penanggung jawab)\b/i;

function normalizeWhitespace(value: string | undefined): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDrugKey(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferAturanPakai(value: string): MedicationRecommendation['aturan_pakai'] {
  if (/\bsebelum makan\b|\bac\b/i.test(value)) return 'Sebelum makan';
  if (/\bsaat makan\b|\bdc\b/i.test(value)) return 'Saat makan';
  if (/\bpemakaian luar\b|\boles\b/i.test(value)) return 'Pemakaian luar';
  if (/\bjika diperlukan\b|\bprn\b/i.test(value)) return 'Jika diperlukan';
  return 'Sesudah makan';
}

function normalizeMedicationDisplayName(rawName: string): string {
  return rawName
    .replace(/[_.,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function shouldTreatAsFallbackMedication(line: string): boolean {
  const normalized = normalizeWhitespace(line);
  if (!normalized || NARRATIVE_THERAPY_PATTERN.test(normalized)) return false;

  const tokenCount = normalized.split(/\s+/).length;
  if (tokenCount <= 3) return true;

  return (
    /\b\d+\s*x\s*\d+/i.test(normalized) ||
    /\b\d+(?:[.,]\d+)?\s*(mg|g|mcg|ml|iu)\b/i.test(normalized) ||
    MEDICATION_FORM_OR_UNIT_PATTERN.test(normalized)
  );
}

function isProcedureLine(value: string): boolean {
  return PROCEDURE_PATTERN.test(value);
}

function isEducationLine(value: string): boolean {
  return EDUCATION_PATTERN.test(value);
}

function parseMedicationLine(line: string): ParsedHistoryMedication | null {
  const normalized = normalizeWhitespace(line);
  if (!normalized) return null;

  const match = normalized.match(
    /^(?<name>.+?)\s+(?<freq>\d+)\s*x\s*(?<amount>\d+)(?:\s*x\s*(?<strength>\d+(?:[.,]\d+)?))?\s*(?<unit>mg|g|mcg|ml)?(?:\s+(?<suffix>.*))?$/i
  );

  if (!match?.groups?.name || !match.groups.freq) {
    return null;
  }

  const rawName = normalizeWhitespace(match.groups.name);
  if (NARRATIVE_THERAPY_PATTERN.test(rawName)) {
    return null;
  }
  const frequencyPerDay = Number.parseInt(match.groups.freq, 10) || 1;
  const amountPerTake = Number.parseInt(match.groups.amount || '1', 10) || 1;
  const strengthValue = Number.parseFloat((match.groups.strength || '0').replace(',', '.')) || 0;
  const strengthUnit =
    ((match.groups.unit || '').toLowerCase() as ParsedHistoryMedication['strengthUnit']) || '';
  const suffix = normalizeWhitespace(match.groups.suffix);

  return {
    displayName: normalizeMedicationDisplayName(rawName),
    frequencyPerDay,
    amountPerTake,
    strengthValue,
    strengthUnit,
    aturanPakai: inferAturanPakai(suffix),
    raw: normalized,
    doseLabel:
      `${frequencyPerDay}x${strengthValue > 0 ? strengthValue : amountPerTake}${strengthUnit}`.replace(
        /\.0(?=[a-z])/i,
        ''
      ),
    normalizedDrugKey: normalizeDrugKey(rawName),
  };
}

function compareMedicationStrength(
  left: ParsedHistoryMedication,
  right: ParsedHistoryMedication
): number {
  const leftStrength = left.frequencyPerDay * left.amountPerTake * Math.max(left.strengthValue, 1);
  const rightStrength =
    right.frequencyPerDay * right.amountPerTake * Math.max(right.strengthValue, 1);
  if (leftStrength !== rightStrength) return leftStrength - rightStrength;
  if (left.strengthValue !== right.strengthValue) return left.strengthValue - right.strengthValue;
  return left.frequencyPerDay - right.frequencyPerDay;
}

export function parseTherapyHistoryText(input: string | undefined): ParsedChronicTherapies {
  const value = normalizeWhitespace(input);
  if (!value) return EMPTY_RESULT;

  const medications: ParsedHistoryMedication[] = [];
  const procedures: string[] = [];
  const educations: string[] = [];

  const lines = value
    .replace(/^(?:farmakoterapi|terapi obat|rencana penatalaksanaan|terapi|tx|resep)[\s:]*/i, '')
    .split(/[\n;,]+/)
    .map((line) => normalizeWhitespace(line.replace(/^\d+[\.\)\-]?\s*/, '')))
    .filter(Boolean);

  for (const line of lines) {
    const lowered = line.toLowerCase();
    if (/^(tidak ada|belum ada|kosong|-)$/i.test(lowered)) continue;
    // No letters (":") or a bare form label names no therapy.
    if (!/[a-z]/.test(lowered) || FORM_LABEL_PATTERN.test(line.replace(/\./g, ''))) continue;

    if (isEducationLine(lowered)) {
      educations.push(line);
      continue;
    }

    if (isProcedureLine(lowered)) {
      procedures.push(line);
      continue;
    }

    // "Sesuai advis(e) dokter" is a placeholder, not a medication.
    if (!normalizeVisitTherapySummary(line)) continue;

    const medication = parseMedicationLine(line);
    if (medication) {
      medications.push(medication);
      continue;
    }

    // A name without a signa keeps its name and no dose: an invented 1x1 reached the resep
    // (Chief, 2026-10-02: "Pengisian dosis salah").
    if (shouldTreatAsFallbackMedication(line)) {
      medications.push({
        displayName: normalizeMedicationDisplayName(line),
        frequencyPerDay: 0,
        amountPerTake: 0,
        strengthValue: 0,
        strengthUnit: '',
        aturanPakai: 'Sesudah makan',
        raw: line,
        doseLabel: '',
        normalizedDrugKey: normalizeDrugKey(line),
      });
    }
  }

  return { medications, procedures, educations };
}

export function extractChronicTherapiesFromHistory(
  visits: Array<{ timestamp?: string; terapi_obat?: string }> | undefined
): ParsedChronicTherapies {
  if (!visits?.length) return EMPTY_RESULT;

  const bestByDrug = new Map<string, ParsedHistoryMedication>();
  const procedures: string[] = [];
  const educations: string[] = [];

  for (const visit of visits.slice(0, 5)) {
    const parsed = parseTherapyHistoryText(visit.terapi_obat);

    for (const medication of parsed.medications) {
      const existing = bestByDrug.get(medication.normalizedDrugKey);
      if (!existing || compareMedicationStrength(medication, existing) > 0) {
        bestByDrug.set(medication.normalizedDrugKey, medication);
      }
    }

    for (const item of parsed.procedures) {
      if (!procedures.includes(item)) procedures.push(item);
    }

    for (const item of parsed.educations) {
      if (!educations.includes(item)) educations.push(item);
    }
  }

  return {
    medications: Array.from(bestByDrug.values()),
    procedures,
    educations,
  };
}
