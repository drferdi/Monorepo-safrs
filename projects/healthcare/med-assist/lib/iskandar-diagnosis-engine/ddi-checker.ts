// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Drug-Drug Interaction Checker
 * Uses DDInter 2.0 database (173,071 clinical interactions)
 *
 * @module lib/iskandar-diagnosis-engine/ddi-checker
 */

import type { DDISeverity, DrugInteraction } from '@/types/api';

// =============================================================================
// TYPES
// =============================================================================

interface DDIDatabase {
  version: string;
  source: string;
  stats: {
    drugs: number;
    interactions: number;
    byLevel: {
      major: number;
      moderate: number;
    };
  };
  severityCodes: Record<string, number>;
  drugs: Record<string, number>; // normalized name -> index
  drugNames: string[]; // index -> normalized name
  interactions: [number, number, number][]; // [drugA_idx, drugB_idx, severity_code]
}

interface DDICheckResult {
  interactions: DrugInteraction[];
  hasBlocking: boolean; // Has contraindicated or major
  stats: {
    major: number;
    moderate: number;
    total: number;
  };
}

// =============================================================================
// DATABASE LOADER
// =============================================================================

let ddiDatabase: DDIDatabase | null = null;
let interactionIndex: Map<string, Map<string, number>> | null = null; // drugA -> (drugB -> severity)

/**
 * Normalize drug name for matching
 * - Lowercase
 * - Remove parenthetical info (topical), (ophthalmic)
 * - Remove non-alphanumeric characters
 */
function normalizeDrugName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove (topical), etc.
    .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
}

/**
 * Build efficient lookup index from database
 */
function buildInteractionIndex(db: DDIDatabase): Map<string, Map<string, number>> {
  const index = new Map<string, Map<string, number>>();

  for (const [idxA, idxB, severity] of db.interactions) {
    const drugA = db.drugNames[idxA];
    const drugB = db.drugNames[idxB];

    if (!drugA || !drugB) continue;

    // Add both directions for symmetric lookup
    if (!index.has(drugA)) index.set(drugA, new Map());
    if (!index.has(drugB)) index.set(drugB, new Map());

    index.get(drugA)!.set(drugB, severity);
    index.get(drugB)!.set(drugA, severity);
  }

  return index;
}

/**
 * Load DDI database
 * @returns Promise<boolean> - true if loaded successfully
 */
export async function loadDDIDatabase(): Promise<boolean> {
  if (ddiDatabase && interactionIndex) {
    return true; // Already loaded
  }

  try {
    // Dynamic import of JSON database
    const dbModule = await import('@/data/ddi-clinical.json');
    ddiDatabase = dbModule.default as unknown as DDIDatabase;

    // Build efficient lookup index
    interactionIndex = buildInteractionIndex(ddiDatabase);

    console.warn(
      `[DDI] Database loaded: ${ddiDatabase.stats.drugs} drugs, ${ddiDatabase.stats.interactions} interactions`
    );
    return true;
  } catch (error) {
    console.error('[DDI] Failed to load database:', error);
    return false;
  }
}

/**
 * Get database status
 */
export function getDDIStatus(): {
  loaded: boolean;
  drugs: number;
  interactions: number;
  version: string;
} {
  if (!ddiDatabase) {
    return { loaded: false, drugs: 0, interactions: 0, version: 'not loaded' };
  }

  return {
    loaded: true,
    drugs: ddiDatabase.stats.drugs,
    interactions: ddiDatabase.stats.interactions,
    version: ddiDatabase.version,
  };
}

// =============================================================================
// SEVERITY MAPPING
// =============================================================================

const SEVERITY_CODE_TO_NAME: Record<number, DDISeverity> = {
  2: 'moderate',
  3: 'major',
};

// Generic descriptions for interactions (DDInter doesn't provide specific descriptions)
const SEVERITY_DESCRIPTIONS: Record<DDISeverity, string> = {
  contraindicated: 'Kombinasi ini kontraindikasi dan harus dihindari.',
  major:
    'Interaksi signifikan yang dapat menyebabkan efek samping serius. Monitor ketat diperlukan.',
  moderate: 'Interaksi yang memerlukan perhatian. Pertimbangkan penyesuaian dosis atau monitoring.',
  minor: 'Interaksi ringan. Umumnya tidak memerlukan perubahan terapi.',
};

const SEVERITY_RECOMMENDATIONS: Record<DDISeverity, string> = {
  contraindicated: 'Hindari kombinasi ini. Konsultasikan dengan dokter spesialis.',
  major: 'Evaluasi kebutuhan terapi. Monitor efek samping dan pertimbangkan alternatif.',
  moderate: 'Monitor pasien untuk efek samping. Sesuaikan dosis jika diperlukan.',
  minor: 'Lanjutkan terapi dengan monitoring standar.',
};

// =============================================================================
// DRUG NAME ALIASES (Common Indonesian brand/generic mappings)
// =============================================================================

const DRUG_ALIASES: Record<string, string[]> = {
  // Pain/Anti-inflammatory
  aspirin: ['asam asetilsalisilat', 'acetylsalicylic acid', 'asa'],
  paracetamol: ['acetaminophen', 'parasetamol'],
  ibuprofen: ['proris', 'brufen', 'advil'],
  meloxicam: ['mobic'],
  diclofenac: ['voltaren', 'cataflam', 'natrium diklofenak'],

  // Cardiovascular
  amlodipine: ['norvasc', 'amlodipin'],
  captopril: ['capoten'],
  lisinopril: ['zestril'],
  losartan: ['cozaar'],
  simvastatin: ['zocor'],
  atorvastatin: ['lipitor'],

  // Diabetes
  metformin: ['glucophage', 'glumin'],
  glibenclamide: ['daonil', 'glyburide'],
  glimepiride: ['amaryl'],

  // Antibiotics
  amoxicillin: ['amoxil', 'amoksisilin'],
  ciprofloxacin: ['ciproxin', 'cipro'],
  metronidazole: ['flagyl'],

  // GI
  omeprazole: ['losec', 'prilosec'],
  ranitidine: ['zantac', 'ranitidin'],

  // CNS
  diazepam: ['valium'],
  alprazolam: ['xanax'],
  amitriptyline: ['elavil'],
  sertraline: ['zoloft'],
  fluoxetine: ['prozac'],

  // Blood thinners
  warfarin: ['coumadin', 'simarc'],
  clopidogrel: ['plavix'],

  // Others
  prednisone: ['deltasone'],
  prednisolone: ['prelone'],
  dexamethasone: ['decadron'],
};

/**
 * Find best matching drug name in database
 */
function findDrugMatch(drugName: string): string | null {
  if (!interactionIndex) return null;

  const normalized = normalizeDrugName(drugName);
  if (!normalized) return null;

  // Direct match
  if (interactionIndex.has(normalized)) {
    return normalized;
  }

  // Check aliases
  for (const [canonical, aliases] of Object.entries(DRUG_ALIASES)) {
    const canonicalNorm = normalizeDrugName(canonical);
    if (normalized === canonicalNorm || aliases.some((a) => normalizeDrugName(a) === normalized)) {
      if (interactionIndex.has(canonicalNorm)) {
        return canonicalNorm;
      }
    }
  }

  // Partial match (drug name contains or is contained)
  for (const dbDrug of interactionIndex.keys()) {
    if (dbDrug.includes(normalized) || normalized.includes(dbDrug)) {
      return dbDrug;
    }
  }

  return null;
}

// =============================================================================
// MAIN CHECKER FUNCTION
// =============================================================================

/**
 * Check for drug-drug interactions among a list of drugs
 *
 * @param drugs - Array of drug names to check
 * @returns DDICheckResult with all found interactions
 */
export async function checkDrugInteractions(drugs: string[]): Promise<DDICheckResult> {
  // Ensure database is loaded
  await loadDDIDatabase();

  const result: DDICheckResult = {
    interactions: [],
    hasBlocking: false,
    stats: { major: 0, moderate: 0, total: 0 },
  };

  if (!interactionIndex || drugs.length < 2) {
    return result;
  }

  // Normalize and find matches for all drugs
  const matchedDrugs: { original: string; matched: string }[] = [];
  for (const drug of drugs) {
    const matched = findDrugMatch(drug);
    if (matched) {
      matchedDrugs.push({ original: drug, matched });
    }
  }

  // Check all pairs
  const checkedPairs = new Set<string>();

  for (let i = 0; i < matchedDrugs.length; i++) {
    for (let j = i + 1; j < matchedDrugs.length; j++) {
      const drugA = matchedDrugs[i];
      const drugB = matchedDrugs[j];

      // Avoid duplicate checks
      const pairKey = [drugA.matched, drugB.matched].sort().join('|');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      // Look up interaction
      const severityCode = interactionIndex.get(drugA.matched)?.get(drugB.matched);

      if (severityCode !== undefined) {
        const severity = SEVERITY_CODE_TO_NAME[severityCode] || 'moderate';

        const interaction: DrugInteraction = {
          drug_a: drugA.original,
          drug_b: drugB.original,
          severity,
          description: SEVERITY_DESCRIPTIONS[severity],
          recommendation: SEVERITY_RECOMMENDATIONS[severity],
          source: 'DDInter 2.0',
        };

        result.interactions.push(interaction);

        // Update stats
        if (severity === 'major' || severity === 'contraindicated') {
          result.stats.major++;
          result.hasBlocking = true;
        } else if (severity === 'moderate') {
          result.stats.moderate++;
        }
        result.stats.total++;
      }
    }
  }

  // Sort by severity (most severe first)
  const severityOrder: Record<DDISeverity, number> = {
    contraindicated: 0,
    major: 1,
    moderate: 2,
    minor: 3,
  };

  result.interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return result;
}

/**
 * Quick check if any blocking interactions exist
 * More efficient than full check when you just need yes/no
 */
export async function hasBlockingInteractions(drugs: string[]): Promise<boolean> {
  const result = await checkDrugInteractions(drugs);
  return result.hasBlocking;
}

/**
 * Get severity label in Indonesian
 */
export function getSeverityLabel(severity: DDISeverity): string {
  const labels: Record<DDISeverity, string> = {
    contraindicated: 'KONTRAINDIKASI',
    major: 'MAYOR',
    moderate: 'MODERAT',
    minor: 'MINOR',
  };
  return labels[severity] || severity.toUpperCase();
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: DDISeverity): string {
  const colors: Record<DDISeverity, string> = {
    contraindicated: '#DC2626', // red-600
    major: '#EA580C', // orange-600
    moderate: '#CA8A04', // yellow-600
    minor: '#16A34A', // green-600
  };
  return colors[severity] || '#6B7280'; // gray-500
}
