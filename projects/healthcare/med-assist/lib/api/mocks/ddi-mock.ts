// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Mock Drug-Drug Interaction Database
 * Common interactions for Puskesmas formulary drugs
 *
 * @module lib/api/mocks/ddi-mock
 */

import type { DDISeverity, DrugInteraction } from '@/types/api';

// =============================================================================
// DDI DATABASE
// =============================================================================

interface DDIEntry {
  drugs: [string, string];
  severity: DDISeverity;
  description: string;
  recommendation: string;
}

/**
 * Local DDI database with common Puskesmas drug interactions
 * Based on Lexicomp / Micromedex references
 */
const DDI_DATABASE: DDIEntry[] = [
  // CONTRAINDICATED
  {
    drugs: ['warfarin', 'aspirin'],
    severity: 'contraindicated',
    description: 'Meningkatkan risiko perdarahan secara signifikan',
    recommendation: 'Hindari kombinasi ini. Konsultasikan dengan dokter spesialis.',
  },
  {
    drugs: ['methotrexate', 'nsaid'],
    severity: 'contraindicated',
    description: 'NSAID mengurangi eliminasi methotrexate, meningkatkan toksisitas',
    recommendation: 'Kontraindikasi mutlak. Gunakan analgesik alternatif.',
  },
  {
    drugs: ['mao inhibitor', 'ssri'],
    severity: 'contraindicated',
    description: 'Risiko serotonin syndrome yang mengancam jiwa',
    recommendation: 'Jangan kombinasikan. Berikan washout period 14 hari.',
  },

  // MAJOR
  {
    drugs: ['ace inhibitor', 'kalium'],
    severity: 'major',
    description: 'ACE-I meningkatkan kadar kalium, risiko hiperkalemia',
    recommendation: 'Monitor kadar kalium serum secara berkala.',
  },
  {
    drugs: ['captopril', 'spironolactone'],
    severity: 'major',
    description: 'Kombinasi meningkatkan risiko hiperkalemia berat',
    recommendation: 'Monitor elektrolit ketat. Pertimbangkan alternatif.',
  },
  {
    drugs: ['digoxin', 'amiodarone'],
    severity: 'major',
    description: 'Amiodarone meningkatkan kadar digoxin hingga 70%',
    recommendation: 'Kurangi dosis digoxin 50%. Monitor kadar serum.',
  },
  {
    drugs: ['simvastatin', 'gemfibrozil'],
    severity: 'major',
    description: 'Meningkatkan risiko rhabdomyolysis',
    recommendation: 'Hindari kombinasi. Gunakan statin alternatif jika diperlukan.',
  },
  {
    drugs: ['ciprofloxacin', 'tizanidine'],
    severity: 'major',
    description: 'Ciprofloxacin meningkatkan kadar tizanidine secara dramatis',
    recommendation: 'Kontraindikasi. Gunakan fluoroquinolone alternatif.',
  },
  {
    drugs: ['metformin', 'kontras iodium'],
    severity: 'major',
    description: 'Risiko asidosis laktat saat prosedur kontras',
    recommendation: 'Hentikan metformin 48 jam sebelum dan sesudah prosedur.',
  },

  // MODERATE
  {
    drugs: ['amlodipine', 'simvastatin'],
    severity: 'moderate',
    description: 'Amlodipine meningkatkan kadar simvastatin',
    recommendation: 'Batasi dosis simvastatin maksimal 20mg/hari.',
  },
  {
    drugs: ['omeprazole', 'clopidogrel'],
    severity: 'moderate',
    description: 'PPI mengurangi efektivitas clopidogrel',
    recommendation: 'Pertimbangkan pantoprazole sebagai alternatif PPI.',
  },
  {
    drugs: ['ciprofloxacin', 'antasida'],
    severity: 'moderate',
    description: 'Antasida mengurangi absorpsi ciprofloxacin',
    recommendation: 'Berikan ciprofloxacin 2 jam sebelum atau 6 jam setelah antasida.',
  },
  {
    drugs: ['levothyroxine', 'kalsium'],
    severity: 'moderate',
    description: 'Kalsium mengurangi absorpsi levothyroxine',
    recommendation: 'Berikan levothyroxine 4 jam terpisah dari kalsium.',
  },
  {
    drugs: ['metformin', 'alkohol'],
    severity: 'moderate',
    description: 'Alkohol meningkatkan risiko asidosis laktat',
    recommendation: 'Edukasi pasien untuk membatasi konsumsi alkohol.',
  },
  {
    drugs: ['aspirin', 'ibuprofen'],
    severity: 'moderate',
    description: 'Ibuprofen mengurangi efek antiplatelet aspirin',
    recommendation: 'Berikan aspirin 30 menit sebelum ibuprofen.',
  },
  {
    drugs: ['ssri', 'nsaid'],
    severity: 'moderate',
    description: 'Kombinasi meningkatkan risiko perdarahan GI',
    recommendation: 'Pertimbangkan gastroproteksi dengan PPI.',
  },
  {
    drugs: ['diuretik', 'nsaid'],
    severity: 'moderate',
    description: 'NSAID mengurangi efektivitas diuretik dan meningkatkan risiko gagal ginjal',
    recommendation: 'Monitor fungsi ginjal dan tekanan darah.',
  },

  // MINOR
  {
    drugs: ['paracetamol', 'ondansetron'],
    severity: 'minor',
    description: 'Interaksi minimal, dapat dikombinasikan dengan aman',
    recommendation: 'Tidak perlu penyesuaian dosis.',
  },
  {
    drugs: ['ambroxol', 'vitamin c'],
    severity: 'minor',
    description: 'Tidak ada interaksi klinis signifikan',
    recommendation: 'Kombinasi aman.',
  },
  {
    drugs: ['antasida', 'ranitidine'],
    severity: 'minor',
    description: 'Efek aditif untuk netralisasi asam lambung',
    recommendation: 'Berikan dengan jarak waktu untuk efek optimal.',
  },
];

// =============================================================================
// DDI CHECKER FUNCTIONS
// =============================================================================

/**
 * Normalize drug name for comparison
 */
function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+\s*(mg|ml|mcg|g|iu)/gi, '')
    .replace(/tablet|kapsul|sirup|injeksi|cream|salep/gi, '')
    .trim();
}

/**
 * Check if two drug names match (fuzzy matching)
 */
function drugsMatch(drug1: string, drug2: string): boolean {
  const norm1 = normalizeDrugName(drug1);
  const norm2 = normalizeDrugName(drug2);

  // Exact match
  if (norm1 === norm2) return true;

  // Partial match (one contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Drug class matching
  const drugClasses: Record<string, string[]> = {
    'ace inhibitor': ['captopril', 'lisinopril', 'ramipril', 'enalapril'],
    nsaid: ['ibuprofen', 'meloxicam', 'piroxicam', 'natrium diklofenak', 'ketorolac', 'aspirin'],
    statin: ['simvastatin', 'atorvastatin', 'rosuvastatin', 'pravastatin'],
    ppi: ['omeprazole', 'lansoprazole', 'pantoprazole', 'esomeprazole'],
    ssri: ['sertraline', 'fluoxetine', 'paroxetine', 'escitalopram'],
    diuretik: ['furosemide', 'hydrochlorothiazide', 'spironolactone'],
  };

  for (const [className, drugs] of Object.entries(drugClasses)) {
    const drug1InClass = drugs.some((d) => norm1.includes(d)) || norm1.includes(className);
    const drug2InClass = drugs.some((d) => norm2.includes(d)) || norm2.includes(className);

    if (drug1InClass && drug2InClass && norm1 !== norm2) {
      return false; // Same class but different drugs
    }

    if ((drug1InClass && norm2 === className) || (drug2InClass && norm1 === className)) {
      return true;
    }
  }

  return false;
}

/**
 * Check drug interactions for a list of drugs
 */
export function checkMockDDI(drugs: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];

  // Check all pairs
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const drug1 = drugs[i];
      const drug2 = drugs[j];

      // Search in DDI database
      for (const entry of DDI_DATABASE) {
        const [entryDrug1, entryDrug2] = entry.drugs;

        const match1 =
          (drugsMatch(drug1, entryDrug1) && drugsMatch(drug2, entryDrug2)) ||
          (drugsMatch(drug1, entryDrug2) && drugsMatch(drug2, entryDrug1));

        if (match1) {
          interactions.push({
            drug_a: drug1,
            drug_b: drug2,
            severity: entry.severity,
            description: entry.description,
            recommendation: entry.recommendation,
            source: 'Sentra DDI Database v1.0',
          });
          break; // Found interaction for this pair
        }
      }
    }
  }

  // Sort by severity (contraindicated first)
  const severityOrder: Record<DDISeverity, number> = {
    contraindicated: 0,
    major: 1,
    moderate: 2,
    minor: 3,
  };

  return interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Check if any interactions are blocking (contraindicated or major)
 */
export function hasBlockingInteractions(interactions: DrugInteraction[]): boolean {
  return interactions.some((i) => i.severity === 'contraindicated' || i.severity === 'major');
}

/**
 * Get human-readable severity label
 */
export function getSeverityLabel(severity: DDISeverity): string {
  const labels: Record<DDISeverity, string> = {
    contraindicated: 'KONTRAINDIKASI',
    major: 'MAYOR',
    moderate: 'MODERAT',
    minor: 'MINOR',
  };
  return labels[severity];
}
