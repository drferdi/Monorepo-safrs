// Designed and constructed by Drferdi.
/**
 * Weight-Based Dosage Database
 *
 * References:
 * - IDAI (Ikatan Dokter Anak Indonesia) Guidelines 2024
 * - PAPDI (Perhimpunan Ahli Penyakit Dalam Indonesia) Geriatric Guidelines
 * - PIONAS (Pusat Informasi Obat Nasional) BPOM
 * - BNF (British National Formulary) for Children 2024
 *
 * DISCLAIMER: For reference only. Always verify dosing with current guidelines.
 */

export type DrugCategory =
  | 'antibiotic'
  | 'antipyretic'
  | 'antihistamine'
  | 'cardiovascular'
  | 'respiratory'
  | 'analgesic';
/**
 * AgeGroup type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type AgeGroup = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
/**
 * RouteOfAdmin type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type RouteOfAdmin = 'oral' | 'iv' | 'im' | 'topical' | 'rectal';

/**
 * DosageRule interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface DosageRule {
  ageGroup: AgeGroup;
  dosePerKg: number; // mg/kg
  minDose?: number; // mg
  maxDose?: number; // mg (per dose)
  maxDailyDose?: number; // mg (total per day)
  frequency: string; // e.g., "q6h", "q8h", "q12h", "daily"
  route: RouteOfAdmin;
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  contraindications?: string[];
}

/**
 * Drug interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  category: DrugCategory;
  indication: string;
  rules: DosageRule[];
  warnings: string[];
  notes?: string;
}

export const DOSAGE_DATABASE: Drug[] = [
  // ANTIBIOTICS
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    category: 'antibiotic',
    indication: 'Infeksi bakteri ringan-sedang (ISPA, OMA, ISK)',
    rules: [
      {
        ageGroup: 'infant',
        dosePerKg: 25,
        maxDailyDose: 1500,
        frequency: 'q8h',
        route: 'oral',
        contraindications: ['Alergi penisilin'],
      },
      {
        ageGroup: 'child',
        dosePerKg: 25,
        maxDose: 500,
        maxDailyDose: 1500,
        frequency: 'q8h',
        route: 'oral',
        contraindications: ['Alergi penisilin'],
      },
      {
        ageGroup: 'adolescent',
        dosePerKg: 20,
        maxDose: 500,
        maxDailyDose: 1500,
        frequency: 'q8h',
        route: 'oral',
      },
      {
        ageGroup: 'elderly',
        dosePerKg: 15,
        maxDose: 500,
        maxDailyDose: 1500,
        frequency: 'q8h',
        route: 'oral',
        renalAdjustment: 'Reduce dose if CrCl <30 mL/min',
      },
    ],
    warnings: [
      'Monitor for allergic reactions',
      'Complete full course of therapy',
      'Take with or without food',
    ],
    notes: 'For severe infections, dose may be doubled (up to 50 mg/kg/dose)',
  },
  {
    id: 'cefadroxil',
    name: 'Cefadroxil',
    genericName: 'Cefadroxil',
    category: 'antibiotic',
    indication: 'Infeksi bakteri (kulit, saluran napas, ISK)',
    rules: [
      {
        ageGroup: 'child',
        dosePerKg: 30,
        maxDose: 1000,
        maxDailyDose: 2000,
        frequency: 'q12h',
        route: 'oral',
      },
      {
        ageGroup: 'adolescent',
        dosePerKg: 25,
        maxDose: 1000,
        maxDailyDose: 2000,
        frequency: 'q12h',
        route: 'oral',
      },
      {
        ageGroup: 'elderly',
        dosePerKg: 20,
        maxDose: 1000,
        maxDailyDose: 2000,
        frequency: 'q12h',
        route: 'oral',
        renalAdjustment: 'Adjust based on CrCl',
      },
    ],
    warnings: ['Risk of C. difficile colitis', 'Cross-sensitivity with penicillin allergy'],
  },

  // ANTIPYRETICS
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    genericName: 'Acetaminophen',
    category: 'antipyretic',
    indication: 'Demam, nyeri ringan-sedang',
    rules: [
      {
        ageGroup: 'neonate',
        dosePerKg: 10,
        maxDose: 15,
        maxDailyDose: 60,
        frequency: 'q6h',
        route: 'oral',
      },
      {
        ageGroup: 'infant',
        dosePerKg: 15,
        maxDose: 500,
        maxDailyDose: 60,
        frequency: 'q6h',
        route: 'oral',
      },
      {
        ageGroup: 'child',
        dosePerKg: 15,
        maxDose: 500,
        maxDailyDose: 75,
        frequency: 'q6h',
        route: 'oral',
      },
      {
        ageGroup: 'adolescent',
        dosePerKg: 15,
        maxDose: 1000,
        maxDailyDose: 4000,
        frequency: 'q6h',
        route: 'oral',
      },
      {
        ageGroup: 'elderly',
        dosePerKg: 10,
        maxDose: 650,
        maxDailyDose: 3000,
        frequency: 'q6h',
        route: 'oral',
        hepaticAdjustment: 'Reduce dose, avoid in severe hepatic impairment',
      },
    ],
    warnings: [
      'HEPATOTOXIC: Never exceed max daily dose',
      'Avoid alcohol consumption',
      'Risk of medication error with multiple paracetamol products',
    ],
    notes:
      'Most common cause of acute liver failure in overdose. Verify all sources of acetaminophen.',
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    category: 'antipyretic',
    indication: 'Demam, nyeri, inflamasi',
    rules: [
      {
        ageGroup: 'infant',
        dosePerKg: 10,
        maxDose: 200,
        maxDailyDose: 40,
        frequency: 'q6-8h',
        route: 'oral',
        contraindications: ['Age <6 months', 'Dehydration', 'Active GI bleeding'],
      },
      {
        ageGroup: 'child',
        dosePerKg: 10,
        maxDose: 400,
        maxDailyDose: 40,
        frequency: 'q6-8h',
        route: 'oral',
      },
      {
        ageGroup: 'adolescent',
        dosePerKg: 10,
        maxDose: 400,
        maxDailyDose: 2400,
        frequency: 'q6-8h',
        route: 'oral',
      },
      {
        ageGroup: 'elderly',
        dosePerKg: 5,
        maxDose: 200,
        maxDailyDose: 1200,
        frequency: 'q8h',
        route: 'oral',
        renalAdjustment: 'Avoid if CrCl <30 mL/min',
      },
    ],
    warnings: [
      'AVOID in dehydration (risk of AKI)',
      'Take with food to reduce GI irritation',
      'Increased cardiovascular risk in elderly',
    ],
  },

  // ANTIHISTAMINES
  {
    id: 'cetirizine',
    name: 'Cetirizine',
    genericName: 'Cetirizine HCl',
    category: 'antihistamine',
    indication: 'Rhinitis alergi, urtikaria',
    rules: [
      {
        ageGroup: 'child',
        dosePerKg: 0.25,
        maxDose: 10,
        maxDailyDose: 10,
        frequency: 'daily',
        route: 'oral',
      },
      {
        ageGroup: 'adolescent',
        dosePerKg: 0,
        minDose: 10,
        maxDose: 10,
        frequency: 'daily',
        route: 'oral',
      },
      {
        ageGroup: 'elderly',
        dosePerKg: 0,
        minDose: 5,
        maxDose: 5,
        frequency: 'daily',
        route: 'oral',
        renalAdjustment: 'Reduce to 5 mg daily if CrCl <30',
      },
    ],
    warnings: ['May cause drowsiness', 'Avoid alcohol'],
  },

  // RESPIRATORY
  {
    id: 'salbutamol',
    name: 'Salbutamol',
    genericName: 'Salbutamol (Albuterol)',
    category: 'respiratory',
    indication: 'Bronkospasme akut (asma, PPOK eksaserbasi)',
    rules: [
      {
        ageGroup: 'child',
        dosePerKg: 0.15,
        maxDose: 5,
        frequency: 'q4-6h PRN',
        route: 'oral',
      },
      {
        ageGroup: 'adolescent',
        dosePerKg: 0,
        minDose: 2,
        maxDose: 4,
        frequency: 'q4-6h PRN',
        route: 'oral',
      },
      {
        ageGroup: 'elderly',
        dosePerKg: 0,
        minDose: 2,
        maxDose: 2,
        frequency: 'q6h PRN',
        route: 'oral',
      },
    ],
    warnings: ['Monitor HR and tremor', 'Reduce dose if tachycardia occurs'],
    notes: 'Inhaled form preferred. Oral form shown for reference.',
  },
];

/**
 * Calculate dosage based on weight and drug rules
 */
export function calculateDosage(
  drugId: string,
  weightKg: number,
  ageGroup: AgeGroup
): {
  dose: number;
  unit: string;
  frequency: string;
  route: string;
  warnings: string[];
  isOverMax: boolean;
  isUnderMin: boolean;
  dailyTotal: number;
} | null {
  const drug = DOSAGE_DATABASE.find((d) => d.id === drugId);
  if (!drug) return null;

  const rule = drug.rules.find((r) => r.ageGroup === ageGroup);
  if (!rule) return null;

  let calculatedDose = rule.dosePerKg * weightKg;

  // Apply min/max constraints
  let isOverMax = false;
  let isUnderMin = false;

  if (rule.minDose && calculatedDose < rule.minDose) {
    calculatedDose = rule.minDose;
    isUnderMin = true;
  }

  if (rule.maxDose && calculatedDose > rule.maxDose) {
    calculatedDose = rule.maxDose;
    isOverMax = true;
  }

  // Calculate daily total
  const freqMatch = rule.frequency.match(/q(\d+)h/);
  const dosesPerDay = freqMatch ? 24 / Number.parseInt(freqMatch[1]) : 1;
  const dailyTotal = calculatedDose * dosesPerDay;

  // Warnings
  const warnings = [...drug.warnings];
  if (rule.contraindications) {
    warnings.push(...rule.contraindications.map((c) => `KONTRAINDIKASI: ${c}`));
  }
  if (rule.renalAdjustment) {
    warnings.push(`⚠️ ${rule.renalAdjustment}`);
  }
  if (rule.hepaticAdjustment) {
    warnings.push(`⚠️ ${rule.hepaticAdjustment}`);
  }
  if (isOverMax) {
    warnings.push('⚠️ PERINGATAN: Dosis melebihi maksimum, dibatasi ke dosis max');
  }
  if (rule.maxDailyDose && dailyTotal > rule.maxDailyDose) {
    warnings.push(
      `⚠️ BAHAYA: Total harian (${dailyTotal.toFixed(0)} mg) melebihi batas (${rule.maxDailyDose} mg)`
    );
  }

  return {
    dose: Math.round(calculatedDose * 10) / 10, // Round to 1 decimal
    unit: 'mg',
    frequency: rule.frequency,
    route: rule.route,
    warnings,
    isOverMax,
    isUnderMin,
    dailyTotal: Math.round(dailyTotal * 10) / 10,
  };
}

/**
 * Get age group from age in years
 */
export function getAgeGroup(ageYears: number): AgeGroup {
  if (ageYears < 0.08) return 'neonate'; // <1 month
  if (ageYears < 2) return 'infant';
  if (ageYears < 12) return 'child';
  if (ageYears < 18) return 'adolescent';
  if (ageYears < 65) return 'adult';
  return 'elderly';
}
