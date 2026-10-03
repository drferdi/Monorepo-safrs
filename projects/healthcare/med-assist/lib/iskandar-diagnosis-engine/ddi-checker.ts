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
let spellingIndex: Map<string, string> | null = null; // spelling key -> database name

/**
 * The key an Indonesian and an English generic name share: "Amlodipin" and "amlodipine",
 * "Siprofloksasin" and "ciprofloxacin", "Klorfeniramin" and "chlorpheniramine".
 */
function spellingKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch/g, 'k')
    .replace(/qu/g, 'kw')
    .replace(/x/g, 'ks')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/y/g, 'i')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/e$/, '');
}

/** Two database names on one key keep the first (only isotope and interferon variants do). */
function buildSpellingIndex(db: DDIDatabase): Map<string, string> {
  const index = new Map<string, string>();
  for (const name of db.drugNames) {
    const key = spellingKey(name);
    if (!index.has(key)) index.set(key, name);
  }
  return index;
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
    spellingIndex = buildSpellingIndex(ddiDatabase);

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
// DRUG NAME MATCHING
// =============================================================================

/**
 * Names the spelling key cannot reach: Indonesian names, abbreviations, brand names and products
 * of two drugs. Matched on the plain lowercase letters and digits ("vitamin c" and "vitamin k"
 * share a spelling key). Every target is a DDInter name.
 */
export const DDI_DRUG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  paracetamol: ['acetaminophen'],
  parasetamol: ['acetaminophen'],
  pct: ['acetaminophen'],
  aspirin: ['acetylsalicylicacid'],
  asetosal: ['acetylsalicylicacid'],
  asa: ['acetylsalicylicacid'],
  glibenklamid: ['glyburide'],
  glibenclamide: ['glyburide'],
  ctm: ['chlorpheniramine'],
  kotrimoksazol: ['sulfamethoxazole', 'trimethoprim'],
  cotrimoxazole: ['sulfamethoxazole', 'trimethoprim'],
  antasida: ['aluminumhydroxide', 'magnesiumhydroxide'],
  petidin: ['meperidine'],
  pethidine: ['meperidine'],
  albuterol: ['salbutamol'],
  adrenalin: ['epinephrine'],
  ferrosulfat: ['ferroussulfateanhydrous'],
  sulfasferosus: ['ferroussulfateanhydrous'],
  ferroussulfate: ['ferroussulfateanhydrous'],
  vitaminb6: ['pyridoxine'],
  vitaminb12: ['cyanocobalamin'],
  vitaminc: ['ascorbicacid'],
  zink: ['zincsulfate'],
  zinc: ['zincsulfate'],
  isosorbiddinitrat: ['isosorbidedinitrate'],
  isosorbidmononitrat: ['isosorbidemononitrate'],
  proris: ['ibuprofen'],
  brufen: ['ibuprofen'],
  advil: ['ibuprofen'],
  mobic: ['meloxicam'],
  voltaren: ['diclofenac'],
  cataflam: ['diclofenac'],
  norvasc: ['amlodipine'],
  capoten: ['captopril'],
  zestril: ['lisinopril'],
  cozaar: ['losartan'],
  zocor: ['simvastatin'],
  lipitor: ['atorvastatin'],
  glucophage: ['metformin'],
  glumin: ['metformin'],
  daonil: ['glyburide'],
  amaryl: ['glimepiride'],
  amoxil: ['amoxicillin'],
  ciproxin: ['ciprofloxacin'],
  cipro: ['ciprofloxacin'],
  flagyl: ['metronidazole'],
  losec: ['omeprazole'],
  prilosec: ['omeprazole'],
  zantac: ['ranitidine'],
  valium: ['diazepam'],
  xanax: ['alprazolam'],
  elavil: ['amitriptyline'],
  zoloft: ['sertraline'],
  prozac: ['fluoxetine'],
  coumadin: ['warfarin'],
  simarc: ['warfarin'],
  plavix: ['clopidogrel'],
  deltasone: ['prednisone'],
  prelone: ['prednisolone'],
  decadron: ['dexamethasone'],
};

/** Strengths such as "500 mg", "4 mg", "125 mg/5 ml" or "2%". */
const DOSE_PATTERN =
  /\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|iu|ui|%)(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:ml|g))?/g;

/** Dosage forms and release words a stock name carries beside the drug. */
const FORM_WORDS = new Set([
  'tablet',
  'tab',
  'tablets',
  'kaplet',
  'kapsul',
  'kap',
  'caps',
  'capsule',
  'sirup',
  'syrup',
  'sir',
  'suspensi',
  'suspension',
  'drop',
  'drops',
  'tetes',
  'injeksi',
  'inj',
  'injection',
  'infus',
  'salep',
  'krim',
  'cream',
  'gel',
  'ovula',
  'supositoria',
  'suppositoria',
  'ampul',
  'vial',
  'botol',
  'sachet',
  'puyer',
  'serbuk',
  'powder',
  'larutan',
  'solution',
  'fc',
  'salut',
  'selaput',
  'film',
  'coated',
  'lepas',
  'lambat',
  'sr',
  'xr',
  'oral',
  'forte',
  'generik',
  'generic',
  'dispersible',
  'dispersibel',
  'kunyah',
  'chewable',
  'mata',
  'telinga',
]);

/** Salt and hydrate words; the table lists the drug without them. */
const SALT_WORDS = new Set([
  'natrium',
  'kalium',
  'sodium',
  'potassium',
  'hcl',
  'hidroklorid',
  'hydrochloride',
  'hidrobromid',
  'hydrobromide',
  'maleat',
  'maleate',
  'besilat',
  'besylate',
  'mesilat',
  'mesylate',
  'sulfat',
  'sulfate',
  'sulphate',
  'fosfat',
  'phosphate',
  'suksinat',
  'succinate',
  'tartrat',
  'tartrate',
  'pamoat',
  'pamoate',
  'propionat',
  'propionate',
  'dihidrat',
  'monohidrat',
  'trihidrat',
  'anhidrat',
]);

const ALIAS_INDEX = new Map(Object.entries(DDI_DRUG_ALIASES));

/** The words of one drug in a stock name, Indonesian "-ida" and "-osa" read as "-ide", "-ose". */
function drugNameWords(part: string): string[] {
  return part
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word && !FORM_WORDS.has(word))
    .map((word) => word.replace(/ida$/, 'id').replace(/osa$/, 'os'));
}

function lookupWords(words: readonly string[]): readonly string[] {
  if (words.length === 0 || !spellingIndex) return [];
  const alias = ALIAS_INDEX.get(words.join(''));
  if (alias) return alias;
  // "Asam mefenamat" is mefenamic acid, "asam asetilsalisilat" acetylsalicylic acid.
  const acid =
    words.length === 2 && words[0] === 'asam' && words[1].endsWith('at')
      ? `${words[1].slice(0, -2)}icacid`
      : null;
  const name = spellingIndex.get(spellingKey(acid ?? words.join('')));
  return name ? [name] : [];
}

function resolveDrugPart(part: string): readonly string[] {
  const words = drugNameWords(part);
  const english = words.map((word) =>
    word === 'natrium' ? 'sodium' : word === 'kalium' ? 'potassium' : word
  );
  const withoutSalts = words.filter((word) => !SALT_WORDS.has(word));
  for (const candidate of [words, english, withoutSalts]) {
    const found = lookupWords(candidate);
    if (found.length > 0) return found;
  }
  // "Natrium valproat": the salt of an acid the table lists as valproic acid.
  if (withoutSalts.length === 1 && withoutSalts[0].endsWith('at')) {
    const found = lookupWords(['asam', withoutSalts[0]]);
    if (found.length > 0) return found;
  }
  // One word the table knows exactly, as "Amlodipin" in "Amlodipin Hexpharm". Never "vitamin"
  // alone: it is the table's vitamin E.
  return withoutSalts
    .filter((word) => word.length >= 5 && word !== 'vitamin')
    .flatMap((word) => lookupWords([word]));
}

/**
 * The DDInter names a prescribed or stock name stands for: none when it is unknown, two for a
 * product of two drugs ("Kotrimoksazol", "Amoksisilin + Asam klavulanat"). Exact keys only; a
 * name is never matched by a substring, so "Prednisolon" is not methylprednisolone.
 */
function resolveDrugNames(name: string): string[] {
  const text = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(DOSE_PATTERN, ' ');
  const names = text.split(/[+/&]/).flatMap((part) => resolveDrugPart(part));
  return [...new Set(names)];
}

/** The DDInter names a drug name stands for, with the table loaded. */
export async function resolveDDIDrugNames(name: string): Promise<string[]> {
  await loadDDIDatabase();
  return resolveDrugNames(name);
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
  // An unreadable table is an error, never "no interactions", so a caller can fail closed.
  if (!(await loadDDIDatabase())) {
    throw new Error('DDI database unavailable');
  }

  const result: DDICheckResult = {
    interactions: [],
    hasBlocking: false,
    stats: { major: 0, moderate: 0, total: 0 },
  };

  if (!interactionIndex || drugs.length < 2) {
    return result;
  }

  // Every database name each drug stands for; `source` is its place in `drugs`.
  const matchedDrugs: { original: string; matched: string; source: number }[] = [];
  drugs.forEach((drug, source) => {
    for (const matched of resolveDrugNames(drug)) {
      matchedDrugs.push({ original: drug, matched, source });
    }
  });

  // Check all pairs
  const checkedPairs = new Set<string>();

  for (let i = 0; i < matchedDrugs.length; i++) {
    for (let j = i + 1; j < matchedDrugs.length; j++) {
      const drugA = matchedDrugs[i];
      const drugB = matchedDrugs[j];
      // The two drugs of one product are prescribed together on purpose.
      if (drugA.source === drugB.source) continue;

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
